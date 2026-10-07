export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";

export async function POST(req) {
  try {
    const body = await req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Convert dates to Firestore Timestamps
    const startTimestamp = Timestamp.fromDate(new Date(startDate));
    // Add one day to include the end date
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endTimestamp = Timestamp.fromDate(endDateObj);

    // Query admissions collection
    const admissionsRef = collection(db, "admissions");
    const q = query(
      admissionsRef,
      where("createdAt", ">=", startTimestamp),
      where("createdAt", "<=", endTimestamp)
    );

    const querySnapshot = await getDocs(q);
    const admissions = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      admissions.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        approvedAt: data.approvedAt || null,
        submittedAt: data.submittedAt || null,
        paidAt: data.paidAt || null,
      });
    });

    // Sort by createdAt descending
    admissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({ admissions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch admissions", details: error.message },
      { status: 500 }
    );
  }
}
