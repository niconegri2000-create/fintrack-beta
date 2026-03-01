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

/* ── Safe timestamp utilities ── */

function safeUnixToIso(unix?: number | null): string | null {
  if (typeof unix !== "number") return null;
  if (unix <= 0) return null;
  const d = new Date(unix * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function safeUnixToDate(unix?: number | null): Date | null {
  if (typeof unix !== "number") return null;
  if (unix <= 0) return null;
  const d = new Date(unix * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/* ── Relevant events ── */

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
    console.error("[WEBHOOK] Missing signature or webhook secret");
    return new Response("Missing signature or secret", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("[WEBHOOK] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log(`[WEBHOOK] Received event: ${event.type} (${event.id})`);

  if (!relevantEvents.has(event.type)) {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[WEBHOOK] checkout.session.completed – mode=${session.mode}, subscription=${session.subscription}, customer=${session.customer}`);

      if (session.mode !== "subscription" || !session.subscription) {
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const userId = session.metadata?.user_id;
      if (!userId) {
        console.error("[WEBHOOK] No user_id in checkout session metadata");
        return new Response("Missing user_id", { status: 400 });
      }

      // Retrieve full subscription from Stripe API
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      console.log(`[WEBHOOK] Retrieved subscription ${subscription.id}, status=${subscription.status}`);
      await upsertSubscription(userId, subscription, session.customer as string);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;

      console.log(`[WEBHOOK] ${event.type} – sub=${subscription.id}, status=${subscription.status}, user_id=${userId}`);

      if (!userId) {
        // Try to find user by stripe_customer_id in our DB
        const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
        if (customerId) {
          const { data: existing } = await supabaseAdmin
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (existing?.user_id) {
            console.log(`[WEBHOOK] Found user_id ${existing.user_id} via stripe_customer_id ${customerId}`);
            await upsertSubscription(existing.user_id, subscription, customerId);
          } else {
            console.warn(`[WEBHOOK] No user_id in metadata and no matching customer in DB for ${customerId}`);
          }
        } else {
          console.warn("[WEBHOOK] No user_id in metadata and no customer ID available");
        }
      } else {
        await upsertSubscription(userId, subscription, subscription.customer as string);
      }
    }
  } catch (err) {
    console.error("[WEBHOOK] Error processing event:", err);
    return new Response("Webhook processing error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

/* ── Upsert subscription into public.subscriptions ── */

async function upsertSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  stripeCustomerId: string,
) {
  const status = subscription.status ?? "active";
  const isActive = ["active", "trialing"].includes(status);

  const periodStart = safeUnixToIso(subscription.current_period_start);
  const periodEnd = safeUnixToIso(subscription.current_period_end);

  console.log(`[WEBHOOK] Timestamps – current_period_start raw=${subscription.current_period_start} -> ${periodStart}`);
  console.log(`[WEBHOOK] Timestamps – current_period_end raw=${subscription.current_period_end} -> ${periodEnd}`);

  const payload = {
    plan: "premium",
    is_active: isActive,
    source: "stripe",
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscription.id,
    started_at: periodStart ?? new Date().toISOString(),
    expires_at: periodEnd,
    price: 399,
    currency: "eur",
  };

  console.log(`[WEBHOOK] Upserting subscription for user ${userId}:`, JSON.stringify(payload));

  // Check if a row already exists for this user
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
    if (error) console.error("[WEBHOOK] Update error:", JSON.stringify(error));
    else console.log("[WEBHOOK] Subscription updated successfully");
  } else {
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .insert({ user_id: userId, ...payload });
    if (error) console.error("[WEBHOOK] Insert error:", JSON.stringify(error));
    else console.log("[WEBHOOK] Subscription inserted successfully");
  }
}
