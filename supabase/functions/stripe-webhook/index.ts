import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or secret", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") {
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const userId = session.metadata?.user_id;
      if (!userId) {
        console.error("No user_id in session metadata");
        return new Response("Missing user_id", { status: 400 });
      }

      // Fetch the subscription to get details
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

      await upsertSubscription(userId, subscription, session.customer as string);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;

      if (!userId) {
        console.error("No user_id in subscription metadata");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      await upsertSubscription(userId, subscription, subscription.customer as string);
    }
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response("Webhook processing error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

async function upsertSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  stripeCustomerId: string,
) {
  const isActive = ["active", "trialing"].includes(subscription.status);

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : new Date().toISOString();

  const payload = {
    plan: "premium",
    is_active: isActive,
    source: "stripe",
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscription.id,
    started_at: periodStart,
    expires_at: periodEnd,
    price: 399,
    currency: "eur",
  };

  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update(payload)
      .eq("user_id", userId);
    if (error) console.error("Update error:", error);
  } else {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .insert({ user_id: userId, ...payload });
    if (error) console.error("Insert error:", error);
  }

  console.log(`Subscription upserted for user ${userId}: active=${isActive}, periodEnd=${periodEnd}`);
}
