import { adminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { examId, examTitle, examDate, timetableEntries, examData } =
      await request.json();

    if (!examId) {
      return NextResponse.json(
        { error: "Exam ID is required" },
        { status: 400 }
      );
    }

    console.log(`Starting hall ticket update for exam: ${examId}`);

    // Reference to the students subcollection using Admin SDK
    const studentsRef = adminDb
      .collection("hallTickets")
      .doc(examId)
      .collection("students");

    const snapshot = await studentsRef.get();

    if (snapshot.empty) {
      return NextResponse.json({
        message: "No hall tickets found for this exam",
        updatedCount: 0,
      });
    }

    // Process updates in batches of 500
    const batches = [];
    let currentBatch = adminDb.batch();
    let operationCount = 0;
    const batchSize = 500;

    snapshot.docs.forEach((docSnap) => {
      // In Admin SDK, doc ref is docSnap.ref
      const docRef = docSnap.ref;

      // Prepare update data - only include defined fields
      const updateData = {};

      // Explicit fields
      if (examTitle !== undefined) updateData.examTitle = examTitle;
      if (examDate !== undefined) updateData.examDate = examDate;
      if (timetableEntries !== undefined)
        updateData.timetableEntries = timetableEntries;

      // Dynamic fields from examData (excluding class/classLevel)
      if (examData && typeof examData === "object") {
        Object.keys(examData).forEach((key) => {
          // Skip class/classLevel as requested previously
          if (key === "class" || key === "classLevel") return;
          // Skip explicit fields we already handled
          if (
            key === "title" ||
            key === "examDate" ||
            key === "timetableEntries"
          )
            return;

          // Map specific fields to Hall Ticket schema
          if (key === "fees" && examData[key] !== undefined) {
            updateData.examFees = examData[key];
            return;
          }

          // Pass through other expected fields
          // Title, Fees, Subject, Duration, Total Marks
          if (
            ["subject", "duration", "totalMarks"].includes(key) &&
            examData[key] !== undefined
          ) {
            updateData[key] = examData[key];
            return;
          }
        });
      }

      if (Object.keys(updateData).length > 0) {
        currentBatch.update(docRef, updateData);
        operationCount++;

        if (operationCount >= batchSize) {
          batches.push(currentBatch.commit());
          currentBatch = adminDb.batch();
          operationCount = 0;
        }
      }
    });

    if (operationCount > 0) {
      batches.push(currentBatch.commit());
    }

    await Promise.all(batches);

    console.log(`Updated ${snapshot.size} hall tickets for exam ${examId}`);

    return NextResponse.json({
      message: "Hall tickets updated successfully",
      updatedCount: snapshot.size,
    });
  } catch (error) {
    console.error("Error updating hall tickets:", error);
    return NextResponse.json(
      { error: "Failed to update hall tickets: " + error.message },
      { status: 500 }
    );
  }
}
