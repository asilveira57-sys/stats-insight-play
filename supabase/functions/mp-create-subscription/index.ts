import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSubscriptionRequest {
  plan_id: string;
  payer_email?: string;
  card_token?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CreateSubscriptionRequest = await req.json();
    const { plan_id, payer_email, card_token } = body;

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .eq("active", true)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (plan.type !== "subscription_monthly") {
      return new Response(JSON.stringify({ error: "This endpoint is for subscriptions only" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has active subscription
    const { data: existingSub } = await supabaseClient
      .from("mp_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["authorized", "pending"])
      .single();

    if (existingSub) {
      return new Response(JSON.stringify({ error: "User already has an active subscription" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalReference = `aleball_sub_${user.id}_${plan_id}_${Date.now()}`;

    // If we have a preapproval_plan_id in the plan, use it
    // Otherwise create a subscription directly
    let preapprovalData;

    if (plan.mp_preapproval_plan_id) {
      // Create subscription using existing plan
      const subscriptionBody = {
        preapproval_plan_id: plan.mp_preapproval_plan_id,
        payer_email: payer_email || user.email,
        external_reference: externalReference,
        back_url: `${req.headers.get("origin") || "https://stats-insight-play.lovable.app"}/assinatura/callback`,
      };

      if (card_token) {
        (subscriptionBody as any).card_token_id = card_token;
      }

      const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${mpAccessToken}`,
        },
        body: JSON.stringify(subscriptionBody),
      });

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        console.error("Mercado Pago subscription error:", errorText);
        return new Response(JSON.stringify({ error: "Failed to create subscription" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      preapprovalData = await mpResponse.json();
    } else {
      // Create subscription without a preapproval plan (flexible subscription)
      const subscriptionBody = {
        reason: `Aleball Premium - ${plan.name}`,
        external_reference: externalReference,
        payer_email: payer_email || user.email,
        auto_recurring: {
          frequency: plan.period_months || 1,
          frequency_type: "months",
          transaction_amount: plan.price_cents / 100,
          currency_id: "BRL",
        },
        back_url: `${req.headers.get("origin") || "https://stats-insight-play.lovable.app"}/assinatura/callback`,
        status: "pending",
      };

      if (card_token) {
        (subscriptionBody as any).card_token_id = card_token;
      }

      const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${mpAccessToken}`,
        },
        body: JSON.stringify(subscriptionBody),
      });

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        console.error("Mercado Pago subscription error:", errorText);
        return new Response(JSON.stringify({ error: "Failed to create subscription" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      preapprovalData = await mpResponse.json();
    }

    // Save subscription record
    const { data: subRecord, error: subError } = await supabaseClient
      .from("mp_subscriptions")
      .insert({
        user_id: user.id,
        plan_id: plan_id,
        mp_preapproval_id: preapprovalData.id,
        mp_preapproval_plan_id: plan.mp_preapproval_plan_id,
        status: preapprovalData.status || "pending",
        reason: preapprovalData.reason,
        payer_email: payer_email || user.email,
        payer_id: preapprovalData.payer_id,
        start_date: preapprovalData.date_created,
        next_payment_date: preapprovalData.next_payment_date,
        auto_recurring: preapprovalData.auto_recurring,
        raw_data: preapprovalData,
      })
      .select()
      .single();

    if (subError) {
      console.error("Error saving subscription:", subError);
    }

    // Update user's assinatura with mp_preapproval_id
    await supabaseClient
      .from("assinaturas")
      .update({
        mp_preapproval_id: preapprovalData.id,
        plan_id: plan_id,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        subscription_id: subRecord?.id,
        preapproval_id: preapprovalData.id,
        init_point: preapprovalData.init_point,
        sandbox_init_point: preapprovalData.sandbox_init_point,
        status: preapprovalData.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
