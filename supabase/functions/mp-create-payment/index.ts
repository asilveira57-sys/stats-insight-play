import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatePaymentRequest {
  plan_id: string;
  payer_email?: string;
  payment_method?: "pix" | "credit_card" | "boleto";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;

    // Get user from auth header
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

    const body: CreatePaymentRequest = await req.json();
    const { plan_id, payer_email, payment_method } = body;

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

    if (plan.type !== "one_time_days") {
      return new Response(JSON.stringify({ error: "This endpoint is for one-time payments only" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalReference = `aleball_${user.id}_${plan_id}_${Date.now()}`;

    // Create payment record
    const { data: paymentRecord, error: paymentRecordError } = await supabaseClient
      .from("mp_payments")
      .insert({
        user_id: user.id,
        plan_id: plan_id,
        status: "pending",
        amount_cents: plan.price_cents,
        days_granted: plan.days,
        external_reference: externalReference,
        payer_email: payer_email || user.email,
        refundable_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (paymentRecordError) {
      console.error("Error creating payment record:", paymentRecordError);
      return new Response(JSON.stringify({ error: "Failed to create payment record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Mercado Pago preference
    const preferenceData = {
      items: [
        {
          id: plan_id,
          title: `Aleball Premium - ${plan.name}`,
          description: plan.description || `Acesso premium por ${plan.days} dias`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: plan.price_cents / 100,
        },
      ],
      payer: {
        email: payer_email || user.email,
      },
      external_reference: externalReference,
      back_urls: {
        success: `${req.headers.get("origin") || "https://stats-insight-play.lovable.app"}/pagamento/sucesso`,
        failure: `${req.headers.get("origin") || "https://stats-insight-play.lovable.app"}/pagamento/falha`,
        pending: `${req.headers.get("origin") || "https://stats-insight-play.lovable.app"}/pagamento/pendente`,
      },
      auto_return: "approved",
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      statement_descriptor: "ALEBALL",
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

  // Filter payment methods based on user preference
    if (payment_method === "pix") {
      (preferenceData as any).payment_methods = {
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
          { id: "ticket" },
        ],
      };
    } else if (payment_method === "boleto") {
      (preferenceData as any).payment_methods = {
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
        ],
        default_payment_method_id: "bolbradesco",
      };
    } else if (payment_method === "credit_card") {
      (preferenceData as any).payment_methods = {
        excluded_payment_types: [
          { id: "ticket" },
          { id: "bank_transfer" },
        ],
      };
    }

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("Mercado Pago error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to create payment preference" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpData = await mpResponse.json();

    // Update payment record with preference ID
    await supabaseClient
      .from("mp_payments")
      .update({
        mp_preference_id: mpData.id,
        raw_data: mpData,
      })
      .eq("id", paymentRecord.id);

    return new Response(
      JSON.stringify({
        payment_id: paymentRecord.id,
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
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
