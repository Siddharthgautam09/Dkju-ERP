import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  or,
  and,
  getAggregateFromServer,
  sum,
  count,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Build dynamic Firestore query based on filters
 */
export const buildRegistrationQuery = (
  filters = {},
  pageSize = 20,
  lastDoc = null,
) => {
  const {
    examId,
    mekhalaId,
    districtName,
    madrasaId,
    classLevel,
    gender,
    paymentStatus = ["completed", "waived"],
  } = filters;

  const regRef = collection(db, "examRegistrations");
  const constraints = [];

  // Payment status filter (always applied)
  constraints.push(
    where(
      "paymentStatus",
      "in",
      Array.isArray(paymentStatus) ? paymentStatus : [paymentStatus],
    ),
  );

  // Exam filter
  if (examId && examId !== "all") {
    constraints.push(where("examId", "==", examId));
  }

  // Class filter - handle both string and number, and field 'class' vs 'classLevel'
  if (classLevel && classLevel !== "all") {
    const classNum = parseInt(classLevel);
    const variants = [classLevel];
    if (!isNaN(classNum)) variants.push(classNum);

    constraints.push(
      or(where("classLevel", "in", variants), where("class", "in", variants)),
    );
  }

  // Madrasa filter
  if (madrasaId && madrasaId !== "all") {
    constraints.push(where("madarsaId", "==", madrasaId));
  }

  // Order and pagination
  constraints.push(orderBy("createdAt", "desc"));
  constraints.push(limit(pageSize));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  return query(regRef, ...constraints);
};

/**
 * Fetch registrations with server-side filtering
 */
export const fetchFilteredRegistrations = async (
  filters,
  pageSize = 20,
  lastDoc = null,
) => {
  const q = buildRegistrationQuery(filters, pageSize, lastDoc);
  const snapshot = await getDocs(q);

  const registrations = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const lastVisible =
    snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { registrations, lastVisible };
};

/**
 * Fetch ALL filtered registrations (without pagination limit) for bulk operations
 */
export const fetchAllFilteredRegistrations = async (filters) => {
  const {
    examId,
    classLevel,
    madrasaId,
    paymentStatus = ["completed", "waived"],
  } = filters;

  const regRef = collection(db, "examRegistrations");
  const constraints = [];

  // Payment status filter (always applied)
  constraints.push(
    where(
      "paymentStatus",
      "in",
      Array.isArray(paymentStatus) ? paymentStatus : [paymentStatus],
    ),
  );

  // Exam filter
  if (examId && examId !== "all") {
    constraints.push(where("examId", "==", examId));
  }

  // Class filter - handle both string and number, and field 'class' vs 'classLevel'
  if (classLevel && classLevel !== "all") {
    const classNum = parseInt(classLevel);
    const variants = [classLevel];
    if (!isNaN(classNum)) variants.push(classNum);

    constraints.push(
      or(where("classLevel", "in", variants), where("class", "in", variants)),
    );
  }

  // Madrasa filter
  if (madrasaId && madrasaId !== "all") {
    constraints.push(where("madarsaId", "==", madrasaId));
  }

  // Order by creation time
  constraints.push(orderBy("createdAt", "desc"));

  const q = query(regRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Search registrations by name or email across entire dataset
 * Supports partial matching (contains) for better search results
 * When searching, we fetch more records to search across
 */
export const searchRegistrations = async (searchTerm, filters = {}) => {
  if (!searchTerm || searchTerm.trim() === "") {
    return { registrations: [], total: 0 };
  }

  const {
    examId,
    classLevel,
    madrasaId,
    paymentStatus = ["completed", "waived"],
  } = filters;

  const regRef = collection(db, "examRegistrations");
  const term = searchTerm.trim();
  const termLower = term.toLowerCase();

  // Base constraints for all queries
  const baseConstraints = [
    where(
      "paymentStatus",
      "in",
      Array.isArray(paymentStatus) ? paymentStatus : [paymentStatus],
    ),
  ];

  if (examId && examId !== "all") {
    baseConstraints.push(where("examId", "==", examId));
  }

  const queryConstraints = [...baseConstraints];
  if (madrasaId && madrasaId !== "all")
    queryConstraints.push(where("madarsaId", "==", madrasaId));
  if (classLevel && classLevel !== "all") {
    const classNum = parseInt(classLevel);
    const variants = [classLevel];
    if (!isNaN(classNum)) variants.push(classNum);

    queryConstraints.push(
      or(where("classLevel", "in", variants), where("class", "in", variants)),
    );
  }

  // For partial matching, we need to fetch a larger dataset and filter client-side
  // This is more efficient than multiple prefix queries and supports "contains" matching
  try {
    // Fetch a larger batch for searching (up to 1000 records)
    const q = query(
      regRef,
      ...queryConstraints,
      orderBy("createdAt", "desc"),
      limit(1000),
    );

    const snapshot = await getDocs(q);

    // Client-side filtering for partial matching (case-insensitive contains)
    const results = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((data) => {
        const nameMatch = data.studentName?.toLowerCase().includes(termLower);
        const admissionMatch = data.admissionNumber
          ?.toString()
          .toLowerCase()
          .includes(termLower);
        const emailMatch = data.studentEmail?.toLowerCase().includes(termLower);
        const hallTicketMatch = data.hallTicketNumber
          ?.toLowerCase()
          .includes(termLower);

        return nameMatch || admissionMatch || emailMatch || hallTicketMatch;
      });

    return {
      registrations: results,
      total: results.length,
    };
  } catch (error) {
    console.warn("Search failed, falling back to limited fetch:", error);
    // Fallback: Fetch latest 500 and filter client-side if server search fails
    return await fallbackClientSideSearch(regRef, queryConstraints, term);
  }
};

const fallbackClientSideSearch = async (collectionRef, constraints, term) => {
  const q = query(
    collectionRef,
    ...constraints,
    orderBy("createdAt", "desc"),
    limit(500),
  );
  const snap = await getDocs(q);
  const termLower = term.toLowerCase();

  const results = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter(
      (data) =>
        data.studentName?.toLowerCase().includes(termLower) ||
        data.admissionNumber?.toString().includes(termLower) ||
        data.studentEmail?.toLowerCase().includes(termLower) ||
        data.hallTicketNumber?.toLowerCase().includes(termLower),
    );

  return { registrations: results, total: results.length };
};

/**
 * Search students collection by name, admission number, etc.
 */
export const searchStudents = async (searchTerm, filters = {}) => {
  if (!searchTerm || searchTerm.trim() === "") return [];

  const { madarsaId, classLevel, gender } = filters;
  const studentsRef = collection(db, "students");
  const term = searchTerm.trim();
  const termLower = term.toLowerCase();

  const baseConstraints = [where("status", "==", "active")];
  // Add filters if they exist
  if (madarsaId && madarsaId !== "all")
    baseConstraints.push(where("madarsaId", "==", madarsaId));
  if (classLevel && classLevel !== "all")
    baseConstraints.push(where("classLevel", "==", classLevel));
  // Gender often requires composite index with range, so maybe apply post-fetch or separate query?
  // We'll keep it in base constraints if possible, else remove.
  if (gender && gender !== "all")
    baseConstraints.push(where("gender", "==", gender));

  try {
    const queries = [];

    // 1. Name Prefix
    queries.push(
      getDocs(
        query(
          studentsRef,
          ...baseConstraints,
          where("fullName", ">=", term),
          where("fullName", "<=", term + "\uf8ff"),
          limit(50),
        ),
      ),
    );

    // 2. Admission Number Prefix
    queries.push(
      getDocs(
        query(
          studentsRef,
          ...baseConstraints,
          where("admissionNumber", ">=", term),
          where("admissionNumber", "<=", term + "\uf8ff"),
          limit(50),
        ),
      ),
    );

    // 3. Email Exact
    // Note: If email search is vital, add it.
    queries.push(
      getDocs(
        query(
          studentsRef,
          ...baseConstraints,
          where("email", "==", termLower),
          limit(20),
        ),
      ),
    );

    const snapshots = await Promise.all(queries);
    const resultsMap = new Map();
    snapshots.forEach((snap) => {
      snap.docs.forEach((doc) => {
        resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
    });

    return Array.from(resultsMap.values());
  } catch (error) {
    console.warn("Student search failed, using fallback:", error);
    // Fallback
    const q = query(studentsRef, ...baseConstraints, limit(500));
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(
        (s) =>
          s.fullName?.toLowerCase().includes(termLower) ||
          s.admissionNumber?.toString().includes(termLower) ||
          s.email?.toLowerCase().includes(termLower),
      );
  }
};

/**
 * Get total count using server-side aggregation
 */
export const getRegistrationsCount = async (filters = {}) => {
  const {
    examId,
    classLevel,
    madarsaId,
    paymentStatus = ["completed", "waived"],
  } = filters;
  const regRef = collection(db, "examRegistrations");
  const constraints = [
    where(
      "paymentStatus",
      "in",
      Array.isArray(paymentStatus) ? paymentStatus : [paymentStatus],
    ),
  ];

  if (examId && examId !== "all") {
    constraints.push(where("examId", "==", examId));
  }

  if (classLevel && classLevel !== "all") {
    const classNum = parseInt(classLevel);
    const variants = [classLevel];
    if (!isNaN(classNum)) variants.push(classNum);

    constraints.push(
      or(where("classLevel", "in", variants), where("class", "in", variants)),
    );
  }

  if (madarsaId && madarsaId !== "all") {
    constraints.push(where("madarsaId", "==", madarsaId));
  }

  const q = query(regRef, ...constraints);
  const countSnap = await getCountFromServer(q);
  return countSnap.data().count;
};

/**
 * Fetch students by IDs (for current page only)
 */
export const fetchStudentsByIds = async (studentIds) => {
  if (!studentIds || studentIds.length === 0) return [];

  const studentsRef = collection(db, "students");
  const batchSize = 10; // Firestore 'in' query limit
  const students = [];

  for (let i = 0; i < studentIds.length; i += batchSize) {
    const batchIds = studentIds.slice(i, i + batchSize);
    const q = query(studentsRef, where("__name__", "in", batchIds));
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
  }

  return students;
};

/**
 * Fetch metadata (madrasas & mekhalas) - cache these
 */
export const fetchMetadata = async () => {
  const [madrasasSnap, mekhalasSnap] = await Promise.all([
    getDocs(query(collection(db, "madarsas"), orderBy("name", "asc"))),
    getDocs(query(collection(db, "mekhala"), orderBy("name", "asc"))),
  ]);

  const madrasas = madrasasSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  const mekhalas = mekhalasSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Create Maps for O(1) lookup
  // IMPORTANT: Use madarsaId as key since that's what students reference (e.g., "mid-656")
  const madrasaMap = new Map(madrasas.map((m) => [m.madarsaId, m]));
  const mekhalaMap = new Map(mekhalas.map((mk) => [mk.id, mk]));

  return { madrasas, mekhalas, madrasaMap, mekhalaMap };
};

/**
 * Get aggregated dashboard stats for convener
 */
export const getConvenerDashboardStats = async () => {
  const regRef = collection(db, "examRegistrations");

  // Base query: Include all valid registrations (completed, waived, paid)
  // Also check 'status' field as a fallback for some records
  const baseQ = query(
    regRef,
    or(
      where("paymentStatus", "in", [
        "completed",
        "waived",
        "paid",
        "Completed",
        "Waived",
        "Paid",
      ]),
      where("status", "in", [
        "registered",
        "Registered",
        "completed",
        "Completed",
      ]),
    ),
  );

  // Revenue query: ONLY completed or paid (exclude waived)
  const revenueQ = query(
    regRef,
    or(
      where("paymentStatus", "in", ["completed", "paid", "Completed", "Paid"]),
      where("status", "in", ["completed", "Completed"]),
    ),
  );

  // Aggregate stats
  const [baseSnap, revenueSnap] = await Promise.all([
    getAggregateFromServer(baseQ, { totalCount: count() }),
    getAggregateFromServer(revenueQ, { totalRevenue: sum("examFees") }),
  ]);

  const totalCount = baseSnap.data().totalCount || 0;
  const totalRevenue = revenueSnap.data().totalRevenue || 0;

  // Get gender counts as subset of baseQ
  const maleQ = query(
    regRef,
    and(
      or(
        where("paymentStatus", "in", [
          "completed",
          "waived",
          "paid",
          "Completed",
          "Waived",
          "Paid",
        ]),
        where("status", "in", [
          "registered",
          "Registered",
          "completed",
          "Completed",
        ]),
      ),
      or(
        where("gender", "==", "male"),
        where("hallTicket.gender", "==", "male"),
      ),
    ),
  );

  const femaleQ = query(
    regRef,
    and(
      or(
        where("paymentStatus", "in", [
          "completed",
          "waived",
          "paid",
          "Completed",
          "Waived",
          "Paid",
        ]),
        where("status", "in", [
          "registered",
          "Registered",
          "completed",
          "Completed",
        ]),
      ),
      or(
        where("gender", "==", "female"),
        where("hallTicket.gender", "==", "female"),
      ),
    ),
  );

  const [maleSnap, femaleSnap] = await Promise.all([
    getCountFromServer(maleQ),
    getCountFromServer(femaleQ),
  ]);

  return {
    totalRegistrations: totalCount,
    totalRevenue: totalRevenue,
    maleStudents: maleSnap.data().count || 0,
    femaleStudents: femaleSnap.data().count || 0,
  };
};
