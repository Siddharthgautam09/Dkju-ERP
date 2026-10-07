export const dynamic = "force-dynamic"; 

import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { admissionNum, amount, purpose, examId, studentId } = body;

    // Validate required fields based on purpose
    if (purpose === "exam_registration") {
      if (!amount || !examId || !studentId) {
        return NextResponse.json(
          { error: "Amount, examId, and studentId are required for exam registration" },
          { status: 400 }
        );
      }
    } else {
      // Default admission flow
      if (!admissionNum) {
        return NextResponse.json(
          { error: "Admission number is required" },
          { status: 400 }
        );
      }
    }

    // Basic Auth (key_id:key_secret → Base64)
    const auth = Buffer.from(
      `${"rzp_live_R6JXwFToEy023W"}:${"PY1K2uiynV9nM36nJUse7sIF"}`
    ).toString("base64");

    // Order details
    const payload = {
      amount: amount || 2000, // in paise, default ₹500 for admission
      currency: "INR",
      receipt: purpose === "exam_registration" 
        ? `exam_${examId}_${studentId}_${Date.now().toString().slice(-6)}`
        : `rcpt_${admissionNum}_${Date.now().toString().slice(-6)}`,
    };

    // POST request to Razorpay Orders API
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Error creating order:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
