import { NextResponse } from "next/server";
import type { Webhook } from "@payos/node";
import { createPayOSClient, isPayOSConfigured } from "@/lib/payos/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (!isPayOSConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  try {
    const payment = await createPayOSClient().webhooks.verify(
      payload as Webhook,
    );
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("complete_payos_order", {
      p_order_code: String(payment.orderCode),
      p_payment_link_id: payment.paymentLinkId,
      p_reference: payment.reference,
      p_amount: payment.amount,
      p_paid_at: payment.transactionDateTime,
    });
    if (error) {
      return NextResponse.json({ error: "PROCESSING_FAILED" }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }
}
