// Lightweight Markdown → HTML converter for article content stored as markdown.
// Handles headings, bold/italic, links, lists, tables, hr and paragraphs.

function inlineMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/** Returns true if the text already looks like HTML (has block-level tags). */
export function looksLikeHtml(text: string): boolean {
  return /<(h[1-6]|p|ul|ol|table|div|blockquote|figure)\b/i.test(text);
}

/** Returns true if the text contains markdown structure markers. */
export function looksLikeMarkdown(text: string): boolean {
  return /(^|\n)\s*#{1,6}\s+|\*\*[^*]+\*\*|(^|\n)\s*[-*]\s+|(^|\n)\s*\|.*\|/.test(text);
}

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r/g, "").replace(/<!--ALEBALL_META:[\s\S]*?-->\n?/, "").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] | null = null;
  let table: string[][] | null = null;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inlineMd(para.join(" "))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list && list.length) {
      out.push(`<ul>${list.map((li) => `<li>${inlineMd(li)}</li>`).join("")}</ul>`);
    }
    list = null;
  };
  const flushTable = () => {
    if (table && table.length) {
      const [head, ...rows] = table;
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inlineMd(c)}</th>`).join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inlineMd(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`,
      );
    }
    table = null;
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushTable();
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushAll();
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushAll();
      const lvl = Math.max(2, Math.min(h[1].length, 4));
      out.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushAll();
      out.push("<hr />");
      continue;
    }
    if (line.startsWith("|") && line.endsWith("|")) {
      flushPara();
      flushList();
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length && cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // separator row
      if (!table) table = [];
      table.push(cells);
      continue;
    }
    const li = line.match(/^[-*•]\s+(.*)$/);
    if (li) {
      flushPara();
      flushTable();
      if (!list) list = [];
      list.push(li[1]);
      continue;
    }
    flushList();
    flushTable();
    para.push(line);
  }
  flushAll();
  return out.join("\n");
}

/** Ensure article text is HTML — converts from markdown when needed. */
export function ensureHtml(text: string): string {
  if (!text) return "";
  if (looksLikeHtml(text)) return text;
  if (looksLikeMarkdown(text)) return markdownToHtml(text);
  // plain text: wrap paragraphs
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}
