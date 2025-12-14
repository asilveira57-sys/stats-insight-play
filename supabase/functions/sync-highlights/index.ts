import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScoreBatVideo {
  title: string;
  embed: string;
  url: string;
  thumbnail: string;
  date: string;
  competition: {
    name: string;
    id: number;
  };
  matchviewUrl: string;
  side1: { name: string };
  side2: { name: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const scorebatApiKey = Deno.env.get("SCOREBAT_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting ScoreBat highlights sync...");

    // Get ScoreBat source
    const { data: source } = await supabase
      .from("data_sources")
      .select("*")
      .eq("name", "scorebat")
      .single();

    if (!source || source.status !== "active") {
      console.log("ScoreBat source not active, skipping sync");
      return new Response(
        JSON.stringify({ success: false, message: "ScoreBat source not active" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from("sync_logs")
      .insert({
        source_id: source.id,
        entity_type: "highlights",
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error("Error creating sync log:", logError);
    }

    // Fetch from ScoreBat API
    const apiUrl = scorebatApiKey 
      ? `https://www.scorebat.com/video-api/v3/feed/?token=${scorebatApiKey}`
      : "https://www.scorebat.com/video-api/v1/";

    console.log("Fetching from ScoreBat API...");
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`ScoreBat API error: ${response.status}`);
    }

    const data = await response.json();
    const videos: ScoreBatVideo[] = data.response || data;

    console.log(`Found ${videos.length} highlights`);

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const video of videos) {
      try {
        // Try to find matching match by team names and date
        const matchDate = new Date(video.date).toISOString().split("T")[0];
        
        // Search for matching match
        const { data: matches } = await supabase
          .from("partidas")
          .select(`
            id,
            time_casa:times!partidas_time_casa_id_fkey(nome),
            time_fora:times!partidas_time_fora_id_fkey(nome)
          `)
          .eq("data", matchDate)
          .limit(50);

        let matchId: string | null = null;
        
        if (matches) {
          const match = matches.find((m: any) => {
            const homeName = m.time_casa?.nome?.toLowerCase() || "";
            const awayName = m.time_fora?.nome?.toLowerCase() || "";
            const side1 = video.side1?.name?.toLowerCase() || "";
            const side2 = video.side2?.name?.toLowerCase() || "";
            
            return (
              (homeName.includes(side1) || side1.includes(homeName)) &&
              (awayName.includes(side2) || side2.includes(awayName))
            );
          });
          
          if (match) {
            matchId = match.id;
          }
        }

        // Upsert highlight
        const { error: upsertError, data: upsertData } = await supabase
          .from("highlights")
          .upsert(
            {
              video_url: video.url,
              embed_url: video.embed,
              thumbnail_url: video.thumbnail,
              title: video.title,
              provider: "scorebat",
              match_id: matchId,
              source_id: source.id,
              published_at: video.date,
              metadata: {
                competition: video.competition,
                matchviewUrl: video.matchviewUrl,
                side1: video.side1?.name,
                side2: video.side2?.name,
              },
            },
            { onConflict: "video_url" }
          )
          .select();

        if (upsertError) {
          console.error("Error upserting highlight:", upsertError);
          failed++;
        } else {
          // Check if it was created or updated
          created++;
        }
      } catch (err) {
        console.error("Error processing video:", err);
        failed++;
      }
    }

    // Update sync log
    if (syncLog) {
      await supabase
        .from("sync_logs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          items_processed: videos.length,
          items_created: created,
          items_updated: updated,
          items_failed: failed,
          requests_made: 1,
        })
        .eq("id", syncLog.id);
    }

    // Update source requests count
    await supabase
      .from("data_sources")
      .update({
        requests_today: (source.requests_today || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.id);

    console.log(`Sync completed: ${created} created, ${updated} updated, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: videos.length,
        created,
        updated,
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in sync-highlights:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
