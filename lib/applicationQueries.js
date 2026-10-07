import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { COLLECTIONS } from "./firestoreService";

/**
 * Build dynamic Firestore query for applications
 */
export const buildApplicationQuery = (
  filters = {},
  pageSize = 20,
  lastDoc = null,
) => {
  const { status } = filters;

  const applicationsRef = collection(db, COLLECTIONS.ADMISSIONS);
  const constraints = [];

  // Status filter
  if (status && status !== "all") {
    constraints.push(where("status", "==", status));
  } else {
    // Exclude deleted applications when showing 'all'
    constraints.push(
      where("status", "in", ["pending", "approved", "rejected"]),
    );
  }

  // Order and pagination
  constraints.push(orderBy("createdAt", "desc"));
  constraints.push(limit(pageSize));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  return query(applicationsRef, ...constraints);
};

/**
 * Fetch applications with server-side filtering and pagination
 */
export const fetchFilteredApplications = async (
  filters,
  pageSize = 20,
  lastDoc = null,
) => {
  const q = buildApplicationQuery(filters, pageSize, lastDoc);
  const snapshot = await getDocs(q);

  const applications = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const lastVisible =
    snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { applications, lastVisible };
};

/**
 * Search applications by name, email, phone, or admission number
 */
export const searchApplications = async (
  searchTerm,
  filters = {},
  maxResults = 1000,
) => {
  if (!searchTerm || searchTerm.trim() === "") {
    return { applications: [], total: 0 };
  }

  const { status } = filters;
  const applicationsRef = collection(db, COLLECTIONS.ADMISSIONS);
  const constraints = [];

  // Status filter
  if (status && status !== "all") {
    constraints.push(where("status", "==", status));
  } else {
    // Exclude deleted applications
    constraints.push(
      where("status", "in", ["pending", "approved", "rejected"]),
    );
  }

  // Fetch more records for searching
  constraints.push(orderBy("createdAt", "desc"));
  constraints.push(limit(maxResults));

  const q = query(applicationsRef, ...constraints);
  const snapshot = await getDocs(q);

  const allApplications = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Client-side filtering by search term
  const searchLower = searchTerm.toLowerCase();
  const filteredApplications = allApplications.filter(
    (app) =>
      app.fullName?.toLowerCase().includes(searchLower) ||
      app.email?.toLowerCase().includes(searchLower) ||
      app.phone?.includes(searchTerm) ||
      app.admissionNumber?.toLowerCase().includes(searchLower),
  );

  return {
    applications: filteredApplications,
    total: filteredApplications.length,
  };
};

/**
 * Get total count of applications
 */
export const getApplicationsCount = async (filters = {}) => {
  const { status } = filters;
  const applicationsRef = collection(db, COLLECTIONS.ADMISSIONS);
  const constraints = [];

  if (status && status !== "all") {
    constraints.push(where("status", "==", status));
  } else {
    constraints.push(
      where("status", "in", ["pending", "approved", "rejected"]),
    );
  }

  const q = query(applicationsRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.length;
};
