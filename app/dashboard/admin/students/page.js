"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Download,
  Eye,
  Edit,
  UserX,
  Filter,
  FileText,
  User,
  Trash2,
  Grid3X3,
  List,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  limit,
  startAfter,
  updateDoc,
  deleteDoc,
  getCountFromServer,
  or,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import useAuthStore from "@/lib/authStore";
import Layout from "@/components/Layout";
import Image from "next/image";
import StudentFilters from "@/components/StudentFilters";
import { Pagination } from "@/components/ui/pagination";

// Helper to format student name (UI level)
const formatStudentName = (name) => {
  if (!name) return "";
  return name
    .toString()
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
};

export default function CentralAdminStudentsPage() {
  const { user, userData } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // For download functionality - loaded on demand
  const [madarsas, setMahals] = useState([]);
  const [mekhalas, setMekhalas] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterMahal, setFilterMahal] = useState("all");
  const [filterMekhala, setFilterMekhala] = useState("all");
  const [filterDistrict, setFilterDistrict] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const itemsPerPage = 20;

  // Lazy Secondary Data: Maps for O(1) lookup of madarsa and mekhala names
  const [madarsaMap, setMadarsaMap] = useState(new Map());
  const [mekhalaMap, setMekhalaMap] = useState(new Map());

  // Stats counts
  const [statsCounts, setStatsCounts] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Refs to track pending fetches and avoid redundant lookups
  const pendingMadarsaFetches = useRef(new Set());
  const pendingMekhalaFetches = useRef(new Set());

  // Utility function to safely convert Firestore timestamp to Date
  const convertTimestampToDate = (timestamp) => {
    if (!timestamp) return null;
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date(timestamp);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "suspended":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStudentCountByMadrasa = (madrasaId) => {
    return allStudents.filter((student) => student.madarsaId === madrasaId)
      .length;
  };

  // Fetch stats counts for dashboard
  const fetchStatsCounts = async () => {
    setStatsLoading(true);
    try {
      const studentsRef = collection(db, "students");

      // Use getCountFromServer for better performance instead of full fetch
      const [totalSnap, activeSnap, inactiveSnap, suspendedSnap] =
        await Promise.all([
          getCountFromServer(studentsRef),
          getCountFromServer(
            query(studentsRef, where("status", "==", "active")),
          ),
          getCountFromServer(
            query(studentsRef, where("status", "==", "inactive")),
          ),
          getCountFromServer(
            query(studentsRef, where("status", "==", "suspended")),
          ),
        ]);

      setStatsCounts({
        total: totalSnap.data().count,
        active: activeSnap.data().count,
        inactive: inactiveSnap.data().count,
        suspended: suspendedSnap.data().count,
      });
    } catch (error) {
      console.error("Error fetching stats counts:", error);
      // Fallback if index missing for status-based counts
      try {
        const totalSnap = await getCountFromServer(
          query(studentsRef, where("deleted", "==", false)),
        );
        setStatsCounts((prev) => ({ ...prev, total: totalSnap.data().count }));
      } catch (e) {}
    } finally {
      setStatsLoading(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async () => {
    if (!deleteStudentId) return;
    setDeleteSubmitting(true);
    setDeleteSubmitting(true);
    try {
      await deleteDoc(doc(db, "students", deleteStudentId));
      toast.success("Student permanently deleted");
      setDeleteStudentId(null);
      fetchStudents();
      fetchStatsCounts();
    } catch (err) {
      toast.error("Failed to delete student");
    }
    setDeleteSubmitting(false);
  };
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [selectedStudentForAction, setSelectedStudentForAction] =
    useState(null);

  // View mode state
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'card'
  const [showSuspendedOnly, setShowSuspendedOnly] = useState(false); // Toggle for showing only suspended students
  // Open edit dialog with student data
  const handleEditStudent = (student) => {
    setEditForm({ ...student });
    setIsEditDialogOpen(true);
  };

  // Save edited student info
  const handleEditStudentSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      const { id, ...data } = editForm;

      // Sanitize data: remove undefined values as Firebase doesn't permit them
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined),
      );

      // Use the document ID for updating
      await updateDoc(doc(db, "students", id), {
        ...cleanData,
        updatedAt: new Date(),
      });
      toast.success("Student info updated");
      setIsEditDialogOpen(false);
      fetchStudents();
    } catch (err) {
      console.error("Error updating student:", err);
      toast.error("Failed to update student");
    }
    setEditSubmitting(false);
  };

  // Fetch all students for download functionality
  const fetchAllStudentsForDownload = async () => {
    try {
      const studentsQuery = query(
        collection(db, "students"),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(studentsQuery);
      const studentsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
        };
      });
      const fStudents = studentsData.filter((student) => !student.deleted);
      setAllStudents(fStudents);
    } catch (error) {
      console.error("Error fetching all students for download:", error);
    }
  };

  const fetchMahals = async () => {
    try {
      const madarsasQuery = query(collection(db, "madarsas"), orderBy("name"));
      const snapshot = await getDocs(madarsasQuery);
      const madarsasData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
        };
      });

      setMahals(madarsasData);

      // Lazy Secondary Data: Populate Map for O(1) lookup
      const madarsaLookup = new Map();
      madarsasData.forEach((madarsa) => {
        madarsaLookup.set(madarsa.id, madarsa.name);
        if (madarsa.madarsaId) {
          madarsaLookup.set(madarsa.madarsaId, madarsa.name);
        }
      });
      setMadarsaMap(madarsaLookup);
    } catch (error) {
      console.error("Error fetching madarsas:", error);
    }
  };

  const fetchMekhalas = async () => {
    try {
      const mekhalasQuery = query(collection(db, "mekhala"), orderBy("name"));
      const snapshot = await getDocs(mekhalasQuery);
      const mekhalasData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
        };
      });
      setMekhalas(mekhalasData);

      // Lazy Secondary Data: Populate Map for O(1) lookup
      const mekhalaLookup = new Map();
      mekhalasData.forEach((mekhala) => {
        mekhalaLookup.set(mekhala.id, mekhala.name);
      });
      setMekhalaMap(mekhalaLookup);
    } catch (error) {
      console.error("Error fetching mekhalas:", error);
    }
  };

  const lastDocRef = useRef(null);

  const fetchClasses = async () => {
    try {
      // Try to get classes from current students once (up to 1000 for efficiency)
      const studentsRef = collection(db, "students");
      const q = query(studentsRef, limit(1000));
      const snapshot = await getDocs(q);

      const classSet = new Set();
      snapshot.docs.forEach((doc) => {
        const c = doc.data().classLevel;
        if (c) classSet.add(String(c));
      });

      // Add common standard classes as defaults if not present
      const standard = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "LKG",
        "UKG",
      ];
      standard.forEach((s) => classSet.add(s));

      const sortedClasses = Array.from(classSet).sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });

      setClasses(sortedClasses);
    } catch (error) {
      console.error("Error fetching classes:", error);
      // Fallback to standard
      setClasses([
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "LKG",
        "UKG",
      ]);
    }
  };

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);

      const studentsRef = collection(db, "students");
      let filters = [];

      // Server-side filters - Only push if explicitly set and not "all"
      if (filterMahal && filterMahal !== "all") {
        filters.push(where("madarsaId", "==", filterMahal));
      }
      if (filterGender && filterGender !== "all") {
        filters.push(where("gender", "==", filterGender));
      }
      if (filterStatus && filterStatus !== "all") {
        filters.push(where("status", "==", filterStatus));
      }
      if (filterMekhala && filterMekhala !== "all") {
        filters.push(where("mekhalaId", "==", filterMekhala));
      }
      if (filterDistrict && filterDistrict !== "all") {
        filters.push(where("district", "==", filterDistrict));
      }
      if (filterClass && filterClass !== "all") {
        filters.push(where("classLevel", "==", filterClass));
      }

      const isSearching =
        debouncedSearchTerm && debouncedSearchTerm.trim().length > 0;

      // Log the query details for debugging
      console.log("🔍 Fetching Students:", {
        isSearching,
        searchTerm: debouncedSearchTerm,
        appliedFilters: filters.length,
      });

      // Search Logic: Iterative deep search
      if (isSearching) {
        const term = debouncedSearchTerm.trim();
        const termLower = term.toLowerCase();

        let allMatches = [];
        let lastVisible = null;
        let hasMore = true;
        let totalScanned = 0;
        const SCANNED_LIMIT = 50000; // Safety limit for total reads

        while (hasMore && totalScanned < SCANNED_LIMIT) {
          let batchLimit = 10000;
          let q = query(studentsRef, ...filters, limit(batchLimit));
          if (lastVisible) {
            q = query(
              studentsRef,
              ...filters,
              startAfter(lastVisible),
              limit(batchLimit),
            );
          }

          const snapshot = await getDocs(q);
          if (snapshot.empty) {
            hasMore = false;
            break;
          }

          totalScanned += snapshot.docs.length;
          lastVisible = snapshot.docs[snapshot.docs.length - 1];

          const batchMatches = snapshot.docs
            .map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                profilePicture: data.profilePicture || data.profilePictureUrl,
              };
            })
            .filter((student) => {
              // Show deleted students only if explicitly searching for suspended/inactive
              if (student.deleted && filterStatus !== "suspended") return false;

              // Partial matching on multiple fields
              const formattedName = student.fullName
                ? formatStudentName(student.fullName).toLowerCase()
                : "";

              const searchableText = [
                student.fullName,
                student.studentName,
                student.name,
                formattedName,
                student.email,
                student.phone,
                student.admissionNumber,
                student.admissionId,
                student.madarsaId,
                student.uid,
                student.guardianName,
                student.guardianPhone,
                student.aadharNumber,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              return searchableText.includes(termLower);
            });

          allMatches = [...allMatches, ...batchMatches];

          // If we fetched the last batch, stop
          if (snapshot.docs.length < batchLimit) {
            hasMore = false;
          } else {
            console.log(
              `📡 Search scanning deeper... Found ${allMatches.length} matches so far. Total scanned: ${totalScanned}`,
            );
          }
        }

        console.log(
          `✅ Search complete. Total found: ${allMatches.length}, Total scanned across batches: ${totalScanned}`,
        );

        // Set total count based on filtered matches
        setTotalStudents(allMatches.length);
        setTotalPages(Math.ceil(allMatches.length / itemsPerPage));

        // Client-side pagination for search results
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedStudents = allMatches.slice(
          startIndex,
          startIndex + itemsPerPage,
        );
        setStudents(paginatedStudents);

        setLoading(false);
        return;
      }

      // Normal Logic: Server-side pagination and counting
      let q = query(
        studentsRef,
        ...filters,
        orderBy("createdAt", "desc"),
        limit(itemsPerPage),
      );

      // Apply pagination using lastDoc
      if (lastDocRef.current && currentPage > 1) {
        q = query(
          studentsRef,
          ...filters,
          orderBy("createdAt", "desc"),
          startAfter(lastDocRef.current),
          limit(itemsPerPage),
        );
      }

      const snapshot = await getDocs(q);

      if (snapshot.empty && currentPage > 1) {
        setCurrentPage(1);
        lastDocRef.current = null;
        return;
      }

      if (!snapshot.empty) {
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      }

      const studentsArr = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            profilePicture: data.profilePicture || data.profilePictureUrl,
          };
        })
        .filter((s) => {
          // Show deleted students if filterStatus is 'suspended', otherwise hide them
          if (s.deleted && filterStatus !== "suspended") return false;
          return true;
        });

      // Get count using query constraints without orderBy for efficiency
      const countSnap = await getCountFromServer(
        query(studentsRef, ...filters),
      );
      const totalCount = countSnap.data().count;

      setTotalStudents(totalCount);
      setTotalPages(Math.ceil(totalCount / itemsPerPage));
      setStudents(studentsArr);
    } catch (err) {
      console.error("Error fetching students:", err);
      if (err.code === "failed-precondition") {
        toast.error("Indexes are building. Please try again in 1-2 minutes.");
      } else {
        toast.error("Failed to load students list.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedSearchTerm,
    filterMahal,
    filterMekhala,
    filterDistrict,
    filterGender,
    filterClass,
    filterStatus,
    itemsPerPage,
  ]);

  // Reset pagination when search state changes
  useEffect(() => {
    setCurrentPage(1);
    lastDocRef.current = null;
  }, [debouncedSearchTerm]);

  useEffect(() => {
    // Initial data loading - On-Demand Export: Remove fetchAllStudentsForDownload from initial load
    fetchStatsCounts();
    fetchStudents();
    fetchMahals();
    fetchMekhalas();
    fetchClasses();
  }, [fetchStudents]); // Add fetchStudents to dependency array

  // Cascading filters reset
  useEffect(() => {
    setFilterDistrict("all");
    setFilterMahal("all");
  }, [filterMekhala]);

  useEffect(() => {
    setFilterMahal("all");
  }, [filterDistrict]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    filterMahal,
    filterMekhala,
    filterDistrict,
    filterGender,
    filterClass,
    filterStatus,
  ]);

  // Fetch students when page or filters change
  useEffect(() => {
    if (debouncedSearchTerm !== null) {
      // Only fetch after initial load
      fetchStudents();
    }
  }, [
    fetchStudents,
    currentPage,
    debouncedSearchTerm,
    filterMahal,
    filterMekhala,
    filterDistrict,
    filterGender,
    filterClass,
    filterStatus,
  ]);

  // Debounce search input by 2 seconds
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setSearchLoading(true);
    }

    const t = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setSearchLoading(false);
    }, 500);

    return () => clearTimeout(t);
  }, [searchTerm, debouncedSearchTerm]);

  const handleViewStudent = async (student) => {
    setIsViewDialogOpen(true);
    setViewLoading(true);
    setSelectedStudent(null);
    try {
      const ref = doc(db, "students", student.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setSelectedStudent({ id: snap.id, ...snap.data() });
      } else {
        // fallback to passed student object
        setSelectedStudent(student);
      }
    } catch (err) {
      console.error("Error fetching student for view:", err);
      setSelectedStudent(student);
    }
    setViewLoading(false);
  };

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      await updateDoc(doc(db, "students", studentId), {
        status: newStatus,
        updatedAt: new Date(),
      });

      toast.success("Student status updated successfully");
      fetchStudents();
    } catch (error) {
      console.error("Error updating student status:", error);
      toast.error("Failed to update student status");
    }
  };

  const handleSuspendClick = (student) => {
    setSelectedStudentForAction(student);
    setSuspensionReason("");
    setSuspendDialogOpen(true);
  };

  const handleSuspendStudent = async () => {
    if (!suspensionReason.trim()) {
      toast.error("Please provide a reason for suspension");
      return;
    }

    try {
      await updateDoc(doc(db, "students", selectedStudentForAction.id), {
        status: "suspended",
        suspensionReason: suspensionReason.trim(),
        suspendedAt: new Date().toISOString(),
        suspendedBy: userData?.uid || "unknown",
        updatedAt: new Date(),
      });
      toast.success(
        `Student ${selectedStudentForAction.fullName} has been suspended`,
      );
      setSuspendDialogOpen(false);
      setSuspensionReason("");
      setSelectedStudentForAction(null);
      fetchStudents();
    } catch (error) {
      console.error("Error suspending student:", error);
      toast.error("Failed to suspend student");
    }
  };

  const handleActivateClick = (student) => {
    setSelectedStudentForAction(student);
    setActivateDialogOpen(true);
  };

  const handleActivateStudent = async () => {
    try {
      await updateDoc(doc(db, "students", selectedStudentForAction.id), {
        status: "active",
        updatedAt: new Date(),
        reactivatedAt: new Date().toISOString(),
        reactivatedBy: userData?.uid || "unknown",
      });
      toast.success(
        `Student ${selectedStudentForAction.fullName} has been activated`,
      );
      setActivateDialogOpen(false);
      setSelectedStudentForAction(null);
      fetchStudents();
    } catch (error) {
      console.error("Error activating student:", error);
      toast.error("Failed to activate student");
    }
  };

  const clearFilters = () => {
    setFilterMahal("all");
    setFilterMekhala("all");
    setFilterDistrict("all");
    setFilterGender("all");
    setFilterClass("all");
    setFilterStatus("all");
    setSearchTerm("");
    setShowSuspendedOnly(false);
    toast.info("All filters cleared");
  };

  const downloadStudentData = async () => {
    const toastId = toast.loading("Preparing student data for download...");

    try {
      // On-Demand Export: Fetch all students only when export is requested
      const studentsQuery = query(
        collection(db, "students"),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(studentsQuery);

      // Deduplicate students by ID
      const studentMap = new Map();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const studentId = doc.id;

        // Show deleted students if filterStatus is 'suspended', otherwise hide them
        const shouldIncludeDeleted = filterStatus === "suspended";
        if (
          (!data.deleted || shouldIncludeDeleted) &&
          !studentMap.has(studentId)
        ) {
          studentMap.set(studentId, {
            ...data,
            id: studentId,
          });
        }
      });

      const allStudentsData = Array.from(studentMap.values());

      toast.loading(`Filtering ${allStudentsData.length} students...`, {
        id: toastId,
      });

      // Apply current filters to all students for download
      const filteredAllStudents = allStudentsData.filter((student) => {
        const q = (debouncedSearchTerm || "").toLowerCase();
        const matchesSearch =
          (student.fullName || "").toLowerCase().includes(q) ||
          (student.email || "").toLowerCase().includes(q) ||
          (student.phone || "").toLowerCase().includes(q) ||
          (student.madarsaId || "").toLowerCase().includes(q);
        const matchesMahal =
          filterMahal === "all" || student.madarsaId === filterMahal;
        const matchesMekhala =
          filterMekhala === "all" || student.mekhalaId === filterMekhala;
        const matchesGender =
          filterGender === "all" || student.gender === filterGender;
        const matchesStatus =
          filterStatus === "all" || student.status === filterStatus;

        return (
          matchesSearch &&
          matchesMahal &&
          matchesMekhala &&
          matchesGender &&
          matchesStatus
        );
      });

      toast.loading(
        `Generating CSV for ${filteredAllStudents.length} students...`,
        { id: toastId },
      );

      // Helper function to escape CSV fields
      const escapeCSV = (value) => {
        if (value == null) return "";
        const str = String(value);
        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (
          str.includes(",") ||
          str.includes('"') ||
          str.includes("\n") ||
          str.includes("\r")
        ) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvContent = [
        [
          "Full Name",
          "Email",
          "Phone",
          "Date of Birth",
          "Gender",
          "Address",
          "Aadhar Number",
          "Mahal",
          "Class Level",
          "Academic Year",
          "Admission Number",
          "Admission Date",
          "Roll Number",
          "Guardian Name",
          "Mother Name",
          "Guardian Name",
          "Guardian Phone",
          "Guardian Email",
          "Previous Madrasa",
          "Previous Education",
          "Status",
          "Profile Complete",
          "Date Created",
          "Last Updated",
        ].join(","),
        ...filteredAllStudents.map((student) =>
          [
            escapeCSV(formatStudentName(student.fullName)),
            escapeCSV(student.email),
            escapeCSV(student.phone),
            escapeCSV(student.dateOfBirth),
            escapeCSV(student.gender),
            escapeCSV(student.address),
            escapeCSV(
              student.aadharNumber
                ? `XXXX-XXXX-${student.aadharNumber.slice(-4)}`
                : "",
            ),
            escapeCSV(student.madarsaId),
            escapeCSV(student.classLevel || student.class),
            escapeCSV(student.academicYear),
            escapeCSV(student.admissionNumber),
            escapeCSV(
              student.admissionDate
                ? new Date(student.admissionDate).toLocaleDateString()
                : "",
            ),
            escapeCSV(student.rollNumber),
            escapeCSV(student.fatherName || student.parentDetails?.fatherName),
            escapeCSV(student.motherName || student.parentDetails?.motherName),
            escapeCSV(student.guardianName),
            escapeCSV(student.guardianPhone || student.parentDetails?.phone),
            escapeCSV(student.guardianEmail || student.parentDetails?.email),
            escapeCSV(student.previousSchool),
            escapeCSV(student.previousEducation),
            escapeCSV(student.status || "active"),
            escapeCSV(student.profileComplete || false),
            escapeCSV(
              (() => {
                const date = convertTimestampToDate(student.createdAt);
                return date ? date.toLocaleDateString() : "";
              })(),
            ),
            escapeCSV(
              (() => {
                const date = convertTimestampToDate(student.updatedAt);
                return date ? date.toLocaleDateString() : "";
              })(),
            ),
          ].join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all_students_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(
        `Successfully downloaded ${filteredAllStudents.length} students!`,
        { id: toastId },
      );
    } catch (error) {
      console.error("Error downloading student data:", error);
      toast.error("Failed to download student data", { id: toastId });
    }
  };

  const getMahalName = (madarsaId) => {
    // Lazy Secondary Data: O(1) lookup using Map
    if (!madarsaId) return "N/A";
    if (madarsaMap.has(madarsaId)) {
      return madarsaMap.get(madarsaId);
    }

    // Avoid redundant fetches for the same ID
    if (pendingMadarsaFetches.current.has(madarsaId)) {
      return "Loading...";
    }
    pendingMadarsaFetches.current.add(madarsaId);

    // Fallback: try to fetch from Firestore synchronously (best effort) - but avoid blocking UI
    (async () => {
      try {
        // Try by document id
        const docRef = doc(db, "madarsas", madarsaId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setMahals((prev) => {
            if (prev.find((p) => p.id === data.id)) return prev;
            return [...prev, data].sort((a, b) =>
              (a.name || "").localeCompare(b.name || ""),
            );
          });
          // Update the Map as well
          setMadarsaMap((prev) => new Map(prev).set(data.id, data.name));
        } else {
          // Try by madarsaId field
          const q = query(
            collection(db, "madarsas"),
            where("madarsaId", "==", madarsaId),
            limit(1),
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const d = { id: snap.docs[0].id, ...snap.docs[0].data() };
            setMahals((prev) => {
              if (prev.find((p) => p.id === d.id)) return prev;
              return [...prev, d].sort((a, b) =>
                (a.name || "").localeCompare(b.name || ""),
              );
            });
            // Update the Map as well
            setMadarsaMap((prev) => new Map(prev).set(d.id, d.name));
          }
        }
      } catch (err) {
        console.error("Error resolving madarsa name fallback:", err);
      } finally {
        // We don't remove from pending as we rely on the Map now
      }
    })();

    return "Loading...";
  };

  const getMekhalaName = (mekhalaId) => {
    // Lazy Secondary Data: O(1) lookup using Map
    if (!mekhalaId) return "N/A";
    if (mekhalaMap.has(mekhalaId)) {
      return mekhalaMap.get(mekhalaId);
    }

    // Avoid redundant fetches
    if (pendingMekhalaFetches.current.has(mekhalaId)) {
      return "Loading...";
    }
    pendingMekhalaFetches.current.add(mekhalaId);

    // Fallback: try to fetch from Firestore synchronously (best effort) - but avoid blocking UI
    (async () => {
      try {
        const docRef = doc(db, "mekhala", mekhalaId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() };
          setMekhalas((prev) => {
            if (prev.find((p) => p.id === data.id)) return prev;
            return [...prev, data].sort((a, b) =>
              (a.name || "").localeCompare(b.name || ""),
            );
          });
          // Update the Map as well
          setMekhalaMap((prev) => new Map(prev).set(data.id, data.name));
        }
      } catch (err) {
        console.error("Error resolving mekhala name fallback:", err);
      }
    })();

    return "Loading...";
  };

  // Derive districts from selected mekhala
  const availableDistricts = useMemo(() => {
    if (filterMekhala === "all") return [];
    const selectedMekhala = mekhalas.find((m) => m.id === filterMekhala);
    if (!selectedMekhala || !selectedMekhala.districts) return [];

    // User clarification: mekhala collection has a districts array of strings
    // Map to {id, name} objects as expected by StudentFilters
    return selectedMekhala.districts
      .map((d) => ({ id: d, name: d }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filterMekhala, mekhalas]);

  const filteredMadarsas = useMemo(() => {
    let list = madarsas;
    if (filterMekhala !== "all") {
      list = list.filter((m) => m.mekhalaId === filterMekhala);
    }
    if (filterDistrict !== "all") {
      list = list.filter((m) => m.district === filterDistrict);
    }
    return list;
  }, [madarsas, filterMekhala, filterDistrict]);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              All Students
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Manage students across all madarsas
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
            <Button onClick={downloadStudentData} className="w-full lg:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">
                        Total Students
                      </p>
                      <p className="text-lg md:text-2xl font-bold">
                        {statsCounts.total}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <Users className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Active</p>
                      <p className="text-lg md:text-2xl font-bold">
                        {statsCounts.active}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <Users className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">
                        Inactive
                      </p>
                      <p className="text-lg md:text-2xl font-bold">
                        {statsCounts.inactive}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <Users className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" />
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">
                        This Month
                      </p>
                      <p className="text-lg md:text-2xl font-bold">
                        {
                          allStudents.filter((student) => {
                            const studentDate = convertTimestampToDate(
                              student.createdAt,
                            );
                            if (!studentDate) return false;
                            const currentMonth = new Date().getMonth();
                            const studentMonth = studentDate.getMonth();
                            return studentMonth === currentMonth;
                          }).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <StudentFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterMahal={filterMahal}
          setFilterMahal={setFilterMahal}
          filterMekhala={filterMekhala}
          setFilterMekhala={setFilterMekhala}
          filterDistrict={filterDistrict}
          setFilterDistrict={setFilterDistrict}
          filterGender={filterGender}
          setFilterGender={setFilterGender}
          filterClass={filterClass}
          setFilterClass={setFilterClass}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          madarsas={filteredMadarsas}
          mekhalas={mekhalas}
          districts={availableDistricts}
          classes={classes}
          loading={loading}
          searchLoading={searchLoading}
        />

        {/* Suspended Students Toggle */}
        <div className="flex justify-center items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Show Suspended Students
            </span>
          </div>
          <Switch
            checked={showSuspendedOnly}
            onCheckedChange={(checked) => {
              setShowSuspendedOnly(checked);
              setFilterStatus(checked ? "suspended" : "all");
            }}
            className="
    data-[state=unchecked]:bg-gray-300
    data-[state=checked]:bg-red-500
  "
            thumbClassName="
    data-[state=unchecked]:bg-gray-500
    data-[state=checked]:bg-white
  "
          />
        </div>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg md:text-xl">
                Students List ({totalStudents})
              </CardTitle>
              <div className="flex flex-col md:flex-row items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center border rounded-md p-1">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-8 px-3"
                  >
                    <List className="h-4 w-4 mr-1" />
                    Table
                  </Button>
                  <Button
                    variant={viewMode === "card" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("card")}
                    className="h-8 px-3"
                  >
                    <Grid3X3 className="h-4 w-4 mr-1" />
                    Cards
                  </Button>
                </div>
                {/* Top pagination for quick navigation */}
                {!loading && totalPages > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-8 px-3"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-8 px-3"
                    >
                      Next
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
                <p className="text-sm md:text-base text-gray-600 mt-4">
                  Loading students...
                </p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 md:h-16 md:w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-sm md:text-base">
                  No students found matching the current filters.
                </p>
              </div>
            ) : viewMode === "table" ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* <TableHead>Profile</TableHead> */}
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Madrasa</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Date Joined
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading
                      ? Array.from({ length: 6 }).map((_, idx) => (
                          <TableRow key={`skeleton-${idx}`}>
                            <TableCell>
                              <Skeleton className="h-10 w-10 rounded-full" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-40" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-28" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-16" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Skeleton className="h-8 w-8 rounded" />
                                <Skeleton className="h-8 w-8 rounded" />
                                <Skeleton className="h-8 w-20 rounded" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      : students.map((student) => (
                          <TableRow key={student.id}>
                            {/* <TableCell>
                              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200">
                                {student.profilePicture ? (
                                  <Image
                                    src={student.profilePicture}
                                    alt={student.fullName || "Student"}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </TableCell> */}
                            <TableCell className="font-medium">
                              {formatStudentName(student.fullName) || "N/A"}
                            </TableCell>
                            <TableCell>{student.email || "N/A"}</TableCell>
                            <TableCell>
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {student.password || "N/A"}
                              </span>
                            </TableCell>
                            <TableCell>{student.phone || "N/A"}</TableCell>
                            <TableCell>{student.madarsaId}</TableCell>
                            <TableCell>{student.classLevel || "N/A"}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2 min-w-[140px]">
                                <Badge
                                  className={`justify-center font-medium ${
                                    student.status === "active"
                                      ? "bg-green-100 text-green-800 border-green-300"
                                      : student.status === "suspended"
                                        ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                        : "bg-gray-100 text-gray-800 border-gray-300"
                                  }`}
                                >
                                  {student.status === "active"
                                    ? "Active"
                                    : student.status === "suspended"
                                      ? "Suspended"
                                      : student.status || "Active"}
                                </Badge>
                                {student.status === "active" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-yellow-700 border-yellow-400 hover:bg-yellow-50 h-7 text-xs w-full"
                                    onClick={() => handleSuspendClick(student)}
                                  >
                                    Suspend
                                  </Button>
                                )}
                                {student.status === "suspended" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-700 border-green-400 hover:bg-green-50 h-7 text-xs w-full"
                                    onClick={() => handleActivateClick(student)}
                                  >
                                    Activate
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {(() => {
                                const date = convertTimestampToDate(
                                  student.createdAt,
                                );
                                return date ? date.toLocaleDateString() : "N/A";
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="border-[#7f2af2] text-[#7f2af2] hover:bg-[#7f2af2]/10"
                                  onClick={() => handleViewStudent(student)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="border-[#7f2af2] text-[#7f2af2] hover:bg-[#7f2af2]/10"
                                  onClick={() => handleEditStudent(student)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => setDeleteStudentId(student.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              /* Card View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                  <Card
                    key={student.id}
                    className="border-l-4 border-l-blue-500 shadow-sm"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Header Section with Profile Picture */}
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex gap-3 flex-1 min-w-0">
                            {/* Profile Picture */}
                            <div className="shrink-0">
                              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                                {student.profilePicture ? (
                                  <Image
                                    src={student.profilePicture}
                                    alt={
                                      formatStudentName(student.fullName) ||
                                      "Student"
                                    }
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <User className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Name and Email */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
                                {formatStudentName(student.fullName) || "N/A"}
                              </h3>
                              <p className="text-sm text-gray-600 truncate mt-1">
                                {student.email || "N/A"}
                              </p>
                              <p className="text-xs text-gray-500 font-mono mt-1">
                                Pass: {student.password || "N/A"}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              student.status === "active"
                                ? "default"
                                : student.status === "inactive"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="text-xs px-2 py-1 shrink-0"
                          >
                            {student.status || "active"}
                          </Badge>
                        </div>

                        {/* Information Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div className="min-w-0">
                            <p className="text-gray-500 text-xs font-medium mb-1">
                              Phone
                            </p>
                            <p className="font-medium text-gray-900 truncate">
                              {student.phone || "N/A"}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-gray-500 text-xs font-medium mb-1">
                              Class
                            </p>
                            <p className="font-medium text-gray-900 truncate">
                              {student.classLevel || "N/A"}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-gray-500 text-xs font-medium mb-1">
                              Madrasa
                            </p>
                            <p className="font-medium text-gray-900 truncate">
                              {getMahalName(student.madarsaId)}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-gray-500 text-xs font-medium mb-1">
                              Joined
                            </p>
                            <p className="font-medium text-gray-900 text-xs">
                              {(() => {
                                const date = convertTimestampToDate(
                                  student.createdAt,
                                );
                                return date
                                  ? date.toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "N/A";
                              })()}
                            </p>
                          </div>
                        </div>

                        {/* Actions Section */}
                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          {/* Status Display with Buttons */}
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-2 block">
                              Status
                            </label>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={
                                  student.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : student.status === "suspended"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                }
                              >
                                {student.status || "active"}
                              </Badge>
                              {student.status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-yellow-600 border-yellow-600 h-7 text-xs flex-1"
                                  onClick={() => handleSuspendClick(student)}
                                >
                                  Suspend
                                </Button>
                              )}
                              {student.status === "suspended" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-600 h-7 text-xs flex-1"
                                  onClick={() => handleActivateClick(student)}
                                >
                                  Activate
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleViewStudent(student)}
                              className="h-8 text-xs px-2 flex items-center justify-center text-black"
                            >
                              <Eye className="h-3 w-3 mr-1 text-black" />
                              <span className="hidden xs:inline">View</span>
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleEditStudent(student)}
                              className="h-8 text-xs px-2 flex items-center justify-center"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              <span className="hidden xs:inline">Edit</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteStudentId(student.id)}
                              disabled={deleteSubmitting}
                              className="h-8 text-xs px-2 flex items-center justify-center"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              <span className="hidden xs:inline">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && totalStudents > 0 && (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t-2 border-gray-200 px-2 sm:px-0">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalStudents}
                />
                <div className="mt-2 text-xs text-gray-500 text-center">
                  Page {currentPage} of {totalPages} | Total: {totalStudents} |
                  Items per page: {itemsPerPage}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Delete Student Confirmation Dialog */}
        <Dialog
          open={!!deleteStudentId}
          onOpenChange={(v) => {
            if (!v) setDeleteStudentId(null);
          }}
        >
          <DialogContent className="max-w-full sm:max-w-md w-11/12 sm:w-full bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Delete Student
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 text-sm sm:text-base">
              Are you sure you want to delete this student? This action cannot
              be undone.
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteStudentId(null)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteStudent}
                disabled={deleteSubmitting}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {deleteSubmitting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Edit Student Dialog */}
        <div className="bg-white h-full w-full">
          <Dialog
            className="!bg-white"
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
          >
            <DialogContent className="max-w-full sm:max-w-2xl w-11/12 sm:w-full bg-white overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  Edit Student Info
                </DialogTitle>
              </DialogHeader>
              {editForm && (
                <form onSubmit={handleEditStudentSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Full Name
                      </label>
                      <Input
                        value={editForm.fullName || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            fullName: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <Input
                        value={editForm.email || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, email: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Phone
                      </label>
                      <Input
                        value={editForm.phone || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Aadhar Number
                      </label>
                      <Input
                        value={editForm.aadharNumber || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            aadharNumber: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Gender
                      </label>
                      <Select
                        value={editForm.gender || ""}
                        onValueChange={(v) =>
                          setEditForm((f) => ({ ...f, gender: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Academic Year
                      </label>
                      <Input
                        type="number"
                        value={editForm.academicYear || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            academicYear:
                              parseInt(e.target.value) || e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Admission Date
                      </label>
                      <Input
                        type="date"
                        value={(() => {
                          const d = convertTimestampToDate(
                            editForm.admissionDate,
                          );
                          return d ? d.toISOString().split("T")[0] : "";
                        })()}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            admissionDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Admission ID
                      </label>
                      <Input
                        disabled
                        value={editForm.admissionId || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            admissionId: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Admission Number
                      </label>
                      <Input
                        value={editForm.admissionNumber || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            admissionNumber: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Madrasa
                      </label>
                      <Select
                        value={editForm.madarsaId || ""}
                        onValueChange={(v) =>
                          setEditForm((f) => ({ ...f, madarsaId: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Madrasa" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {Array.from(
                            new Map(madarsas.map((m) => [m.id, m])).values(),
                          ).map((m, idx) => (
                            <SelectItem
                              key={`${m.id}-${idx}`}
                              value={m.madarsaId || m.id}
                            >
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Class
                      </label>
                      <Select
                        value={editForm.classLevel || ""}
                        onValueChange={(v) =>
                          setEditForm((f) => ({ ...f, classLevel: v }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {[...new Set(classes)]
                            .sort((a, b) => {
                              const numA = parseInt(a);
                              const numB = parseInt(b);
                              if (!isNaN(numA) && !isNaN(numB))
                                return numA - numB;
                              return String(a).localeCompare(String(b));
                            })
                            .map((c, idx) => (
                              <SelectItem key={`${c}-${idx}`} value={c}>
                                Class {c}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Status
                      </label>
                      <Select
                        value={editForm.status || "active"}
                        onValueChange={(v) =>
                          setEditForm((f) => ({ ...f, status: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Date of Birth
                      </label>
                      <Input
                        type="date"
                        value={(() => {
                          const d = convertTimestampToDate(
                            editForm.dateOfBirth,
                          );
                          return d ? d.toISOString().split("T")[0] : "";
                        })()}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            dateOfBirth: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Address
                      </label>
                      <Input
                        value={editForm.address || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            address: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Guardian Name
                      </label>
                      <Input
                        value={editForm.guardianName || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            guardianName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Guardian Phone
                      </label>
                      <Input
                        value={editForm.guardianPhone || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            guardianPhone: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Previous Education
                      </label>
                      <Input
                        value={editForm.previousEducation || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            previousEducation: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Password
                      </label>
                      <Input
                        value={editForm.password || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            password: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        UID
                      </label>
                      <Input
                        disabled
                        value={editForm.uid || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, uid: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  {/* Parent/Guardian Details (optional, keep if your schema uses it) */}
                  {editForm.parentDetails && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3 text-base sm:text-lg">
                        Parent/Guardian Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Father&apos;s Name
                          </label>
                          <Input
                            value={editForm.parentDetails?.fatherName || ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                parentDetails: {
                                  ...f.parentDetails,
                                  fatherName: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Mother&apos;s Name
                          </label>
                          <Input
                            value={editForm.parentDetails?.motherName || ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                parentDetails: {
                                  ...f.parentDetails,
                                  motherName: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Parent Phone
                          </label>
                          <Input
                            value={editForm.parentDetails?.phone || ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                parentDetails: {
                                  ...f.parentDetails,
                                  phone: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Parent Email
                          </label>
                          <Input
                            value={editForm.parentDetails?.email || ""}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                parentDetails: {
                                  ...f.parentDetails,
                                  email: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-end mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                      className="w-full sm:w-auto order-2 sm:order-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={editSubmitting}
                      className="w-full sm:w-auto order-1 sm:order-2"
                    >
                      {editSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
        <Dialog
          className="!bg-white"
          open={isViewDialogOpen}
          onOpenChange={(v) => {
            setIsViewDialogOpen(v);
            if (!v) {
              setSelectedStudent(null);
              setViewLoading(false);
            }
          }}
        >
          <DialogContent className="max-w-full sm:max-w-2xl w-11/12 sm:w-full bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Student Details
              </DialogTitle>
            </DialogHeader>
            {viewLoading ? (
              <div className="space-y-6">
                {/* Header Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-48" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-12 mb-2" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                  </div>

                  {/* Profile Picture */}
                  <div className="flex items-center justify-center">
                    <Skeleton className="w-40 h-40 rounded-full" />
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...Array(8)].map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>

                {/* Additional Fields */}
                <div className="space-y-4">
                  <Skeleton className="h-4 w-36" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, index) => (
                      <div key={index} className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Parent Details Section */}
                <div className="border-t pt-6">
                  <Skeleton className="h-5 w-48 mb-4" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, index) => (
                      <div key={index} className="space-y-2">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Loading Indicator */}
                <div className="flex justify-center items-center space-x-2 pt-4">
                  <Skeleton className="h-2 w-2 rounded-full animate-pulse" />
                  <Skeleton
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ animationDelay: "150ms" }}
                  />
                  <Skeleton
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            ) : (
              selectedStudent && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Full Name
                      </label>
                      <p className="text-sm font-semibold">
                        {selectedStudent.fullName || "N/A"}
                      </p>
                    </div>

                    {/* Profile picture at top-right - always show */}
                    <div className="flex items-center justify-center">
                      <div className="relative w-[180px] h-[180px] rounded-md overflow-hidden border-2 border-gray-200">
                        {selectedStudent.profilePicture ? (
                          <Image
                            src={selectedStudent.profilePicture}
                            alt="Profile Picture"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                            <User className="h-16 w-16 text-gray-400 mb-2" />
                            <p className="text-xs text-gray-500 text-center px-2">
                              No Profile Picture
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <p className="text-sm">
                        {selectedStudent.email || "N/A"}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Password
                      </label>
                      <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                        {selectedStudent.password || "N/A"}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Phone
                      </label>
                      <p className="text-sm">
                        {selectedStudent.phone || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Madrasa
                      </label>
                      <p className="text-sm">
                        {getMahalName(selectedStudent.madarsaId)}
                      </p>
                      {selectedStudent.madarsaId && (
                        <p className="text-xs text-gray-500 mt-1">
                          MID:{" "}
                          <span className="font-medium text-gray-700">
                            {selectedStudent.madarsaId}
                          </span>
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Class
                      </label>
                      <p className="text-sm">
                        {selectedStudent.classLevel || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Status
                      </label>
                      <Badge className={getStatusColor(selectedStudent.status)}>
                        {selectedStudent.status || "active"}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Date of Birth
                      </label>
                      <p className="text-sm">
                        {selectedStudent.dateOfBirth || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Address
                      </label>
                      <p className="text-sm">
                        {selectedStudent.address || "N/A"}
                      </p>
                    </div>

                    {/* Additional academic/administrative fields */}
                    {selectedStudent.admissionId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Admission ID
                        </label>
                        <p className="text-sm">{selectedStudent.admissionId}</p>
                      </div>
                    )}

                    {selectedStudent.admissionNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Admission Number
                        </label>
                        <p className="text-sm">
                          {selectedStudent.admissionNumber}
                        </p>
                      </div>
                    )}

                    {selectedStudent.admissionDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Admission Date
                        </label>
                        <p className="text-sm">
                          {(() => {
                            const d = convertTimestampToDate(
                              selectedStudent.admissionDate,
                            );
                            return d
                              ? d.toLocaleDateString()
                              : String(selectedStudent.admissionDate);
                          })()}
                        </p>
                      </div>
                    )}

                    {selectedStudent.rollNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Roll Number
                        </label>
                        <p className="text-sm">{selectedStudent.rollNumber}</p>
                      </div>
                    )}

                    {selectedStudent.aadharNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Aadhar (masked)
                        </label>
                        <p className="text-sm">{`XXXX-XXXX-${String(
                          selectedStudent.aadharNumber,
                        ).slice(-4)}`}</p>
                      </div>
                    )}

                    {selectedStudent.academicYear && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Academic Year
                        </label>
                        <p className="text-sm">
                          {selectedStudent.academicYear}
                        </p>
                      </div>
                    )}

                    {/* profile picture rendered at the top-right; no duplicate here */}
                  </div>

                  {/* Parent/Guardian Details */}
                  {(selectedStudent.parentDetails ||
                    selectedStudent.guardianName) && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3 text-base sm:text-lg">
                        Parent/Guardian Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            {selectedStudent.parentDetails?.fatherName
                              ? "Father's Name"
                              : "Guardian Name"}
                          </label>
                          <p className="text-sm">
                            {selectedStudent.parentDetails?.fatherName ||
                              selectedStudent.guardianName ||
                              "N/A"}
                          </p>
                        </div>
                        {selectedStudent.parentDetails?.motherName && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Mother&apos;s Name
                            </label>
                            <p className="text-sm">
                              {selectedStudent.parentDetails.motherName}
                            </p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-gray-500">
                            Guardian Phone
                          </label>
                          <p className="text-sm">
                            {selectedStudent.parentDetails?.phone ||
                              selectedStudent.guardianPhone ||
                              "N/A"}
                          </p>
                        </div>
                        {selectedStudent.parentDetails?.email && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Guardian Email
                            </label>
                            <p className="text-sm">
                              {selectedStudent.parentDetails.email}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suspension History */}
                  {(selectedStudent.status === "suspended" ||
                    selectedStudent.suspensionReason ||
                    selectedStudent.reactivatedAt) && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3 text-base sm:text-lg">
                        Suspension History
                      </h4>
                      <div className="space-y-4">
                        {/* Current/Last Suspension Details */}
                        {selectedStudent.suspensionReason && (
                          <div
                            className={`p-4 rounded-lg border-2 ${
                              selectedStudent.status === "suspended"
                                ? "bg-yellow-50 border-yellow-300"
                                : "bg-gray-50 border-gray-300"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h5 className="font-semibold text-sm text-gray-800">
                                {selectedStudent.status === "suspended"
                                  ? "Currently Suspended"
                                  : "Previous Suspension"}
                              </h5>
                              <Badge
                                className={
                                  selectedStudent.status === "suspended"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {selectedStudent.status === "suspended"
                                  ? "Suspended"
                                  : "Reactivated"}
                              </Badge>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-semibold text-gray-700">
                                  Reason for Suspension:
                                </label>
                                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                                  {selectedStudent.suspensionReason}
                                </p>
                              </div>

                              {selectedStudent.suspendedAt && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">
                                      Suspended On:
                                    </label>
                                    <p className="text-sm text-gray-800">
                                      {(() => {
                                        try {
                                          return new Date(
                                            selectedStudent.suspendedAt,
                                          ).toLocaleString();
                                        } catch {
                                          return selectedStudent.suspendedAt;
                                        }
                                      })()}
                                    </p>
                                  </div>

                                  {selectedStudent.suspendedBy && (
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">
                                        Suspended By:
                                      </label>
                                      <p className="text-sm text-gray-800">
                                        {selectedStudent.suspendedBy}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {selectedStudent.reactivatedAt && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-300">
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">
                                      Reactivated On:
                                    </label>
                                    <p className="text-sm text-green-700 font-medium">
                                      {(() => {
                                        try {
                                          return new Date(
                                            selectedStudent.reactivatedAt,
                                          ).toLocaleString();
                                        } catch {
                                          return selectedStudent.reactivatedAt;
                                        }
                                      })()}
                                    </p>
                                  </div>

                                  {selectedStudent.reactivatedBy && (
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">
                                        Reactivated By:
                                      </label>
                                      <p className="text-sm text-green-700 font-medium">
                                        {selectedStudent.reactivatedBy}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Show message if suspended but no reason found */}
                        {selectedStudent.status === "suspended" &&
                          !selectedStudent.suspensionReason && (
                            <div className="p-4 rounded-lg bg-yellow-50 border-2 border-yellow-300">
                              <p className="text-sm text-yellow-800">
                                This student is currently suspended. No
                                suspension reason is recorded.
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </DialogContent>
        </Dialog>

        {/* Suspend Student Dialog */}
        <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Suspend Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                You are about to suspend{" "}
                <span className="font-semibold">
                  {selectedStudentForAction?.fullName}
                </span>
                . Please provide a reason for this action.
              </p>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Reason for Suspension *
                </label>
                <Textarea
                  placeholder="Enter the reason for suspending this student..."
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  rows={4}
                  className="w-full"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuspendDialogOpen(false);
                    setSuspensionReason("");
                    setSelectedStudentForAction(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSuspendStudent}
                  disabled={!suspensionReason.trim()}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Confirm Suspension
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Activate Student Dialog */}
        <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Activate Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Review the suspension details before reactivating{" "}
                <span className="font-semibold">
                  {selectedStudentForAction?.fullName}
                </span>
                .
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-yellow-800 mb-2">
                  Suspension Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Reason:</span>
                    <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                      {selectedStudentForAction?.suspensionReason ||
                        "No reason provided"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Suspended On:
                    </span>
                    <p className="text-gray-600">
                      {selectedStudentForAction?.suspendedAt
                        ? (() => {
                            try {
                              return new Date(
                                selectedStudentForAction.suspendedAt,
                              ).toLocaleString();
                            } catch {
                              return "Unknown";
                            }
                          })()
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setActivateDialogOpen(false);
                    setSelectedStudentForAction(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleActivateStudent}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirm Activation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
