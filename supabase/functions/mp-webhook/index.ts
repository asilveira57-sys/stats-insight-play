import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    const { id, topic, type, action, data } = body;

    // Generate unique event ID
    const eventId = id?.toString() || `${topic}_${data?.id}_${Date.now()}`;

    // Idempotency check
    const { data: existingEvent } = await supabase
      .from("webhook_events")
      .select("id, processing_status")
      .eq("event_id", eventId)
      .eq("topic", topic || type)
      .single();

    if (existingEvent?.processing_status === "processed") {
      console.log("Event already processed:", eventId);
      return new Response(JSON.stringify({ status: "already_processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record webhook event
    const { data: webhookEvent, error: webhookError } = await supabase
      .from("webhook_events")
      .upsert({
        event_id: eventId,
        topic: topic || type,
        action: action,
        resource_id: data?.id?.toString(),
        payload: body,
        processing_status: "processing",
      }, { onConflict: "event_id,topic" })
      .select()
      .single();

    if (webhookError) {
      console.error("Error recording webhook:", webhookError);
    }

    // Process based on topic
    const actualTopic = topic || type;

    if (actualTopic === "payment") {
      await handlePayment(supabase, mpAccessToken, data.id);
    } else if (actualTopic === "subscription_preapproval" || actualTopic === "preapproval") {
      await handleSubscription(supabase, mpAccessToken, data.id);
    } else if (actualTopic === "subscription_authorized_payment") {
      await handleSubscriptionPayment(supabase, mpAccessToken, data.id);
    }

    // Mark as processed
    if (webhookEvent) {
      await supabase
        .from("webhook_events")
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", webhookEvent.id);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handlePayment(supabase: any, mpAccessToken: string, paymentId: string) {
  console.log("Processing payment:", paymentId);

  // Fetch payment details from MP
  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` },
  });

  if (!mpResponse.ok) {
    console.error("Failed to fetch payment:", await mpResponse.text());
    return;
  }

  const payment = await mpResponse.json();
  console.log("Payment data:", JSON.stringify(payment));

  const externalReference = payment.external_reference;
  if (!externalReference?.startsWith("statball_")) {
    console.log("Not a StatBall payment, skipping");
    return;
  }

  // Parse external reference: statball_{user_id}_{plan_id}_{timestamp}
  const parts = externalReference.split("_");
  const userId = parts[1];

  // Map MP status to our status
  const statusMap: Record<string, string> = {
    approved: "approved",
    authorized: "authorized",
    pending: "pending",
    in_process: "in_process",
    in_mediation: "in_mediation",
    rejected: "rejected",
    cancelled: "cancelled",
    refunded: "refunded",
    charged_back: "charged_back",
  };

  const paymentMethodMap: Record<string, string> = {
    credit_card: "credit_card",
    debit_card: "debit_card",
    account_money: "other",
    pix: "pix",
    bank_transfer: "pix",
    ticket: "boleto",
  };

  const ourStatus = statusMap[payment.status] || "pending";
  const ourPaymentMethod = paymentMethodMap[payment.payment_type_id] || "other";

  // Update or create payment record
  const { data: existingPayment } = await supabase
    .from("mp_payments")
    .select("id, status, user_id, plan_id, days_granted")
    .eq("external_reference", externalReference)
    .single();

  if (existingPayment) {
    await supabase
      .from("mp_payments")
      .update({
        mp_payment_id: paymentId.toString(),
        status: ourStatus,
        status_detail: payment.status_detail,
        payment_method: ourPaymentMethod,
        payer_email: payment.payer?.email,
        payer_document: payment.payer?.identification?.number,
        approved_at: payment.status === "approved" ? payment.date_approved : null,
        raw_data: payment,
      })
      .eq("id", existingPayment.id);

    // If payment is approved, grant days
    if (ourStatus === "approved" && existingPayment.status !== "approved") {
      await grantDaysToUser(supabase, existingPayment.user_id, existingPayment.days_granted, existingPayment.id);
    }

    // If payment is refunded/charged_back, revoke days
    if ((ourStatus === "refunded" || ourStatus === "charged_back") && existingPayment.status === "approved") {
      await revokeDaysFromUser(supabase, existingPayment.user_id, existingPayment.days_granted, existingPayment.id, ourStatus);
    }
  } else {
    // Get plan from external reference
    const planId = parts[2];
    const { data: plan } = await supabase
      .from("plans")
      .select("days")
      .eq("id", planId)
      .single();

    const { data: newPayment } = await supabase
      .from("mp_payments")
      .insert({
        user_id: userId,
        plan_id: planId,
        mp_payment_id: paymentId.toString(),
        status: ourStatus,
        status_detail: payment.status_detail,
        payment_method: ourPaymentMethod,
        amount_cents: Math.round(payment.transaction_amount * 100),
        payer_email: payment.payer?.email,
        payer_document: payment.payer?.identification?.number,
        external_reference: externalReference,
        days_granted: plan?.days || 30,
        approved_at: payment.status === "approved" ? payment.date_approved : null,
        refundable_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        raw_data: payment,
      })
      .select()
      .single();

    if (ourStatus === "approved" && newPayment) {
      await grantDaysToUser(supabase, userId, newPayment.days_granted, newPayment.id);
    }
  }
}

async function handleSubscription(supabase: any, mpAccessToken: string, preapprovalId: string) {
  console.log("Processing subscription:", preapprovalId);

  const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` },
  });

  if (!mpResponse.ok) {
    console.error("Failed to fetch subscription:", await mpResponse.text());
    return;
  }

  const subscription = await mpResponse.json();
  console.log("Subscription data:", JSON.stringify(subscription));

  // Find existing subscription record
  const { data: existingSub } = await supabase
    .from("mp_subscriptions")
    .select("id, user_id, status")
    .eq("mp_preapproval_id", preapprovalId)
    .single();

  const userId = existingSub?.user_id;

  if (existingSub) {
    const previousStatus = existingSub.status;

    await supabase
      .from("mp_subscriptions")
      .update({
        status: subscription.status,
        payer_id: subscription.payer_id,
        next_payment_date: subscription.next_payment_date,
        last_payment_date: subscription.last_modified,
        end_date: subscription.status === "cancelled" ? new Date().toISOString() : null,
        cancelled_at: subscription.status === "cancelled" ? new Date().toISOString() : null,
        raw_data: subscription,
      })
      .eq("id", existingSub.id);

    // Handle status changes
    if (subscription.status === "authorized" && previousStatus !== "authorized") {
      // Subscription activated - update assinaturas
      await supabase
        .from("assinaturas")
        .update({
          subscription_status: "active",
          tipo_plano: "premium",
          status: "active",
          current_period_end: subscription.next_payment_date,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else if (subscription.status === "paused") {
      // Payment failed - start grace period
      await supabase.rpc("start_grace_period", { p_user_id: userId });
    } else if (subscription.status === "cancelled") {
      // Subscription cancelled - recalculate access
      await supabase.rpc("recalculate_user_access", { p_user_id: userId });
    }
  }
}

async function handleSubscriptionPayment(supabase: any, mpAccessToken: string, paymentId: string) {
  console.log("Processing subscription payment:", paymentId);

  const mpResponse = await fetch(`https://api.mercadopago.com/authorized_payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` },
  });

  if (!mpResponse.ok) {
    console.error("Failed to fetch subscription payment:", await mpResponse.text());
    return;
  }

  const authorizedPayment = await mpResponse.json();
  console.log("Authorized payment data:", JSON.stringify(authorizedPayment));

  const preapprovalId = authorizedPayment.preapproval_id;

  const { data: subscription } = await supabase
    .from("mp_subscriptions")
    .select("id, user_id")
    .eq("mp_preapproval_id", preapprovalId)
    .single();

  if (!subscription) {
    console.log("Subscription not found for payment");
    return;
  }

  if (authorizedPayment.status === "approved") {
    // Extend subscription period
    await supabase
      .from("mp_subscriptions")
      .update({
        last_payment_date: new Date().toISOString(),
        next_payment_date: authorizedPayment.next_retry_date,
        status: "authorized",
      })
      .eq("id", subscription.id);

    // Update user access
    await supabase
      .from("assinaturas")
      .update({
        subscription_status: "active",
        current_period_end: authorizedPayment.next_retry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        grace_until: null,
        last_payment_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", subscription.user_id);

    // Add to ledger (30 days for monthly)
    await supabase
      .from("entitlement_ledger")
      .insert({
        user_id: subscription.user_id,
        days_delta: 30,
        origin: "subscription",
        reference_id: subscription.id,
        reference_type: "mp_subscriptions",
        description: "Renovação mensal automática",
      });
  } else if (authorizedPayment.status === "rejected") {
    // Start grace period
    await supabase.rpc("start_grace_period", { p_user_id: subscription.user_id });
  }
}

async function grantDaysToUser(supabase: any, userId: string, days: number, paymentId: string) {
  console.log(`Granting ${days} days to user ${userId}`);

  await supabase.rpc("grant_days_to_user", {
    p_user_id: userId,
    p_days: days,
    p_origin: "payment",
    p_reference_id: paymentId,
    p_reference_type: "mp_payments",
    p_description: `Pagamento aprovado - ${days} dias`,
  });
}

async function revokeDaysFromUser(supabase: any, userId: string, days: number, paymentId: string, reason: string) {
  console.log(`Revoking ${days} days from user ${userId} due to ${reason}`);

  // Record refund
  await supabase
    .from("refunds")
    .insert({
      payment_id: paymentId,
      user_id: userId,
      status: "processed",
      reason: reason,
      amount_cents: 0,
      days_revoked: days,
      processed_at: new Date().toISOString(),
    });

  // Add negative ledger entry
  await supabase
    .from("entitlement_ledger")
    .insert({
      user_id: userId,
      days_delta: -days,
      origin: reason === "charged_back" ? "chargeback" : "refund",
      reference_id: paymentId,
      reference_type: "mp_payments",
      description: reason === "charged_back" ? "Chargeback - dias revogados" : "Reembolso - dias revogados",
    });

  // Recalculate access
  await supabase.rpc("recalculate_user_access", { p_user_id: userId });
}
