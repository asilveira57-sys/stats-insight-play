import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting ranking cache refresh...')

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // Helper: get start of period
    function periodStart(period: string): string {
      const d = new Date(now)
      if (period === 'daily') return todayStr
      if (period === 'weekly') {
        const day = d.getDay()
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)) // Monday
        return d.toISOString().split('T')[0]
      }
      if (period === 'monthly') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      }
      return '2020-01-01' // all_time
    }

    const periods = ['daily', 'weekly', 'monthly', 'all_time']
    let totalUpserted = 0

    for (const period of periods) {
      const start = periodStart(period)
      const end = todayStr

      // Get XP earned in this period
      let query = supabase
        .from('xp_events')
        .select('user_id, xp_delta')

      if (period !== 'all_time') {
        query = query.gte('created_at', `${start}T00:00:00Z`)
      }

      const { data: events, error: evErr } = await query
      if (evErr) {
        console.error(`Error fetching xp_events for ${period}:`, evErr)
        continue
      }

      // Aggregate by user
      const userScores: Record<string, number> = {}
      for (const ev of events || []) {
        userScores[ev.user_id] = (userScores[ev.user_id] || 0) + ev.xp_delta
      }

      // Sort and rank
      const sorted = Object.entries(userScores)
        .sort(([, a], [, b]) => b - a)

      // Delete old cache for this period
      await supabase
        .from('public_rankings_cache')
        .delete()
        .eq('period', period)
        .eq('period_start', start)

      if (sorted.length === 0) continue

      // Insert in batches
      const batchSize = 500
      for (let i = 0; i < sorted.length; i += batchSize) {
        const batch = sorted.slice(i, i + batchSize).map(([userId, score], idx) => ({
          period,
          period_start: start,
          period_end: end,
          user_id: userId,
          score,
          rank_position: i + idx + 1,
          updated_at: now.toISOString(),
        }))

        const { error: insErr } = await supabase
          .from('public_rankings_cache')
          .insert(batch)

        if (insErr) {
          console.error(`Error inserting rankings batch for ${period}:`, insErr)
        } else {
          totalUpserted += batch.length
        }
      }

      console.log(`${period}: ranked ${sorted.length} users`)
    }

    const result = {
      success: true,
      totalUpserted,
      timestamp: now.toISOString(),
    }

    console.log('Ranking refresh complete:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error in refresh-rankings:', error)
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
