import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RepoFile {
  path: string;
  name: string;
  type: "file" | "dir";
  size: number;
  download_url: string | null;
}

interface RepoTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, owner, repo, path, branch } = await req.json();

    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Statball-Importer",
    };

    // Optional: use GitHub token for higher rate limits
    const ghToken = Deno.env.get("GITHUB_TOKEN");
    if (ghToken) {
      headers["Authorization"] = `Bearer ${ghToken}`;
    }

    if (action === "tree") {
      // Get full recursive tree of the repo
      const defaultBranch = branch || "main";
      
      // First try to get the branch SHA
      const branchRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/branches/${defaultBranch}`,
        { headers }
      );
      
      if (!branchRes.ok) {
        // Try 'master' as fallback
        const masterRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/branches/master`,
          { headers }
        );
        if (!masterRes.ok) {
          return new Response(
            JSON.stringify({ error: "Could not find default branch" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const masterData = await masterRes.json();
        const treeSha = masterData.commit.sha;
        const treeRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
          { headers }
        );
        const treeData = await treeRes.json();
        return new Response(
          JSON.stringify({ branch: "master", tree: treeData.tree || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const branchData = await branchRes.json();
      const treeSha = branchData.commit.sha;
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
        { headers }
      );
      const treeData = await treeRes.json();
      
      return new Response(
        JSON.stringify({ branch: defaultBranch, tree: treeData.tree || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "contents") {
      // Get contents of a specific directory
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path || ""}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `GitHub API error: ${res.status}` }),
          { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const data = await res.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "file") {
      // Download raw file content
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch || "main"}/${path}`;
      const res = await fetch(rawUrl);
      if (!res.ok) {
        // Try master branch
        const masterUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${path}`;
        const masterRes = await fetch(masterUrl);
        if (!masterRes.ok) {
          return new Response(
            JSON.stringify({ error: `File not found: ${path}` }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const content = await masterRes.text();
        return new Response(
          JSON.stringify({ content, path }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const content = await res.text();
      return new Response(
        JSON.stringify({ content, path }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "multi_files") {
      // Download multiple files at once
      const paths: string[] = path; // path is actually an array here
      const defaultBranch = branch || "main";
      const results: { path: string; content: string | null; error?: string }[] = [];
      
      for (const filePath of paths) {
        try {
          let rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${filePath}`;
          let res = await fetch(rawUrl);
          if (!res.ok) {
            rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${filePath}`;
            res = await fetch(rawUrl);
          }
          if (res.ok) {
            const content = await res.text();
            results.push({ path: filePath, content });
          } else {
            results.push({ path: filePath, content: null, error: `HTTP ${res.status}` });
          }
        } catch (e) {
          results.push({ path: filePath, content: null, error: e.message });
        }
      }
      
      return new Response(
        JSON.stringify({ files: results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: tree, contents, file, multi_files" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
