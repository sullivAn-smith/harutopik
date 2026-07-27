"use server";

import { redirect } from "next/navigation";
import { plans } from "@/lib/billing/plans";
import { createPayOSClient, isPayOSConfigured } from "@/lib/payos/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function startProCheckout() {
  if (!isSupabaseConfigured()) redirect("/dang-nhap?next=/nang-cap");
  if (!isPayOSConfigured()) redirect("/nang-cap?status=setup-required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap?next=/nang-cap");

  const plan = plans.proAnnual;
  const orderCode = createOrderCode();
  const { error } = await supabase.from("billing_orders").insert({
    user_id: user.id,
    price_id: plan.priceId,
    provider: "payos",
    provider_order_code: String(orderCode),
    amount: plan.price,
    currency: plan.currency,
    status: "pending",
  });
  if (error) redirect("/nang-cap?status=error");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let checkoutUrl: string;
  try {
    const payment = await createPayOSClient().paymentRequests.create({
      orderCode,
      amount: plan.price,
      description: `HARU ${String(orderCode).slice(-8)}`,
      buyerEmail: user.email,
      items: [{ name: plan.name, quantity: 1, price: plan.price }],
      cancelUrl: `${siteUrl}/nang-cap?status=cancelled`,
      returnUrl: `${siteUrl}/nang-cap?status=processing`,
    });
    await supabase
      .from("billing_orders")
      .update({ provider_payment_id: payment.paymentLinkId })
      .eq("user_id", user.id)
      .eq("provider_order_code", String(orderCode));
    checkoutUrl = payment.checkoutUrl;
  } catch {
    await supabase
      .from("billing_orders")
      .update({ status: "failed" })
      .eq("user_id", user.id)
      .eq("provider_order_code", String(orderCode));
    redirect("/nang-cap?status=error");
  }
  redirect(checkoutUrl);
}

function createOrderCode() {
  return Number(`${Date.now()}${crypto.getRandomValues(new Uint8Array(1))[0] % 100}`.slice(0, 15));
}
