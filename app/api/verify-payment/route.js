import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = await req.json();

    // ✅ Step 1: Verify signature
    const hmac = crypto
      .createHmac("sha256", "PY1K2uiynV9nM36nJUse7sIF") // <-- hardcoded secret
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (hmac !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // ✅ Step 2: Capture payment (hardcoded creds like curl)
    const key_id = "rzp_live_R6JXwFToEy023W";
    const key_secret = "PY1K2uiynV9nM36nJUse7sIF";

    const res = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " +
            Buffer.from(`${key_id}:${key_secret}`).toString("base64"),
        },
        body: JSON.stringify({
          amount, // paise
          currency: "INR",
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status });
    }

    return NextResponse.json({ success: true, payment: data }, { status: 200 });
  } catch (err) {
    console.error("Verify payment failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
