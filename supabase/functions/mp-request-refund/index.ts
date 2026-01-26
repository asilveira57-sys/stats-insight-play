import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RefundRequest {
  payment_id: string;
  reason?: string;
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

    const body: RefundRequest = await req.json();
    const { payment_id, reason } = body;

    // Get payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from("mp_payments")
      .select("*")
      .eq("id", payment_id)
      .eq("user_id", user.id)
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status !== "approved") {
      return new Response(JSON.stringify({ error: "Payment is not approved" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if within refund period (7 days)
    const refundableUntil = new Date(payment.refundable_until);
    if (new Date() > refundableUntil) {
      return new Response(JSON.stringify({ error: "Refund period has expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already refunded
    const { data: existingRefund } = await supabaseClient
      .from("refunds")
      .select("id")
      .eq("payment_id", payment_id)
      .in("status", ["pending", "processed"])
      .single();

    if (existingRefund) {
      return new Response(JSON.stringify({ error: "Refund already requested" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Request refund from Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}/refunds`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mpAccessToken}`,
        },
        body: JSON.stringify({}),
      }
    );

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("Mercado Pago refund error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to process refund" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpRefund = await mpResponse.json();

    // Create refund record
    await supabaseClient
      .from("refunds")
      .insert({
        payment_id: payment_id,
        user_id: user.id,
        mp_refund_id: mpRefund.id?.toString(),
        status: mpRefund.status === "approved" ? "processed" : "pending",
        reason: reason || "user_requested",
        amount_cents: payment.amount_cents,
        days_revoked: payment.days_granted,
        processed_at: mpRefund.status === "approved" ? new Date().toISOString() : null,
        raw_data: mpRefund,
      });

    // If refund is immediately approved, update payment and revoke days
    if (mpRefund.status === "approved") {
      await supabaseClient
        .from("mp_payments")
        .update({
          status: "refunded",
          refunded_at: new Date().toISOString(),
        })
        .eq("id", payment_id);

      // Add negative ledger entry
      await supabaseClient
        .from("entitlement_ledger")
        .insert({
          user_id: user.id,
          days_delta: -payment.days_granted,
          origin: "refund",
          reference_id: payment_id,
          reference_type: "mp_payments",
          description: `Reembolso aprovado - ${payment.days_granted} dias revogados`,
        });

      // Recalculate access
      await supabaseClient.rpc("recalculate_user_access", { p_user_id: user.id });
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund_status: mpRefund.status,
        message: mpRefund.status === "approved" 
          ? "Refund processed successfully" 
          : "Refund request submitted",
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
