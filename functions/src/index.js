import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp(); // ✅ NO serviceAccountKey

const db = getFirestore();

export const syncStudentToHallTickets = onDocumentUpdated(
  "students/{studentId}",
  async (event) => {
    const studentId = event.params.studentId;
    const student = event.data?.after.data();

    if (!student) return;

    const updatedFields = {
      fullName: student.fullName ?? null,
      gender: student.gender ?? null,
      guardianPhone: student.guardianPhone ?? null,
      classLevel: student.classLevel ?? null,
      admissionNumber: student.admissionNumber ?? null,
      madarsaId: student.madarsaId ?? null,
      profilePictureUrl: student.profilePicture ?? null,
      updatedAt: FieldValue.serverTimestamp()
    };

    const snap = await db
      .collectionGroup("students")
      .where("studentId", "==", studentId)
      .get();

    if (snap.empty) return;

    let batch = db.batch();
    let count = 0;

    for (const doc of snap.docs) {
      batch.update(doc.ref, updatedFields);
      count++;

      if (count === 450) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    console.log(`Synced ${snap.size} hall tickets for student ${studentId}`);
  }
);
