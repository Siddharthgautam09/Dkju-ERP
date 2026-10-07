import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function DELETE(req) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    await adminAuth.deleteUser(uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user from Auth:", error);
    return NextResponse.json(
      { error: "Failed to delete user from Auth", details: error.message },
      { status: 500 },
    );
  }
}
