"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Trash2,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  History,
  Save,
  X,
  Upload,
  Globe,
  GlobeLock,
  UserCheck,
  User,
  Phone,
  Users,
  CheckSquare,
  Square,
  Plus,
  ArrowRight,
  School,
  MapPin,
  BookOpen,
  Download,
  GraduationCap,
  AlertCircle,
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  getCountFromServer,
  writeBatch,
  writeBatch as getWriteBatch,
  addDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firestoreService";
import { toast } from "sonner";
import useAuthStore from "@/lib/authStore";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const normalizeClass = (classValue) => {
  if (!classValue) return "";
  const classStr = String(classValue).toUpperCase().trim();
  const romanMap = {
    I: "1",
    II: "2",
    III: "3",
    IV: "4",
    V: "5",
    VI: "6",
    VII: "7",
    VIII: "8",
    IX: "9",
    X: "10",
    XI: "11",
    XII: "12",
  };
  if (romanMap[classStr]) return romanMap[classStr];
  if (/^\d+$/.test(classStr)) {
    return String(parseInt(classStr, 10));
  }
  return classStr;
};

const GRADE_RULES = [
  { grade: "A+", min: 90, max: 100 },
  { grade: "A", min: 80, max: 89 },
  { grade: "B+", min: 70, max: 79 },
  { grade: "B", min: 60, max: 69 },
  { grade: "C+", min: 50, max: 59 },
  { grade: "C", min: 40, max: 49 },
  { grade: "D+", min: 30, max: 39 },
  { grade: "D", min: 20, max: 29 },
  { grade: "E", min: 0, max: 19 },
  { grade: "Absent", min: -1, max: -1 },
];

export default function ResultViewPageContent({
  examId,
  uploadPath = null,
  readOnly = false,
}) {
  const router = useRouter();
  const { user, userData } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [exam, setExam] = useState(null);

  // Pagination
  const [docHistory, setDocHistory] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("hallTicketNumber");
  const [filterClass, setFilterClass] = useState("all");
  const [filterMadarsa, setFilterMadarsa] = useState("all");
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [filterPromoted, setFilterPromoted] = useState("all");
  const [classes, setClasses] = useState([]);
  const [classesMap, setClassesMap] = useState({});
  const [madarsas, setMadarsas] = useState([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Editing
  const [editingResult, setEditingResult] = useState(null);
  const [viewingResult, setViewingResult] = useState(null);
  const [hallTicketData, setHallTicketData] = useState(null);
  const [loadingHallTicket, setLoadingHallTicket] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [saving, setSaving] = useState(false);

  // Bulk Actions
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Promotion
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [promoteConfirmText, setPromoteConfirmText] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [studentsToPromote, setStudentsToPromote] = useState([]);
  const [loadingStudentsList, setLoadingStudentsList] = useState(false);
  const [resultSubjectTemp, setResultSubjectTemp] = useState([]);

  // Dynamic Subjects & Pass Marks
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [manualPassMarks, setManualPassMarks] = useState({});

  const fetchExam = useCallback(async () => {
    try {
      if (!examId) return;
      const examDoc = await getDoc(doc(db, COLLECTIONS.EXAMS, examId));
      const examData = examDoc.data();
      setExam({ id: examDoc.id, ...examData });
      if (examData.resultSubjectTemp) {
        // Support both old array of strings and new array of objects
        const normSubjects = examData.resultSubjectTemp.map((s) =>
          typeof s === "string" ? { subject: s, class: "all" } : s,
        );
        setResultSubjectTemp(normSubjects);
      }
    } catch (error) {
      console.error("Error fetching exam:", error);
    }
  }, [examId]);

  useEffect(() => {
    if (exam) {
      const subjects = new Set();
      if (exam.timetableEntries) {
        exam.timetableEntries.forEach((entry) => {
          if (entry.subject) subjects.add(entry.subject);
          else if (entry.title) subjects.add(entry.title);
        });
      }
      // Add extra subjects based on class filter
      resultSubjectTemp.forEach((s) => {
        if (
          filterClass === "all" ||
          s.class === "all" ||
          normalizeClass(s.class) === filterClass
        ) {
          subjects.add(s.subject);
        }
      });
      setAvailableSubjects(Array.from(subjects));
    }
  }, [exam, resultSubjectTemp, filterClass]);

  const gradeRules = GRADE_RULES;

  const getGradeFromMark = useCallback(
    (mark) => {
      if (
        !mark ||
        mark === "" ||
        mark === "AB" ||
        mark === "Absent" ||
        mark === -1
      )
        return "Absent";
      const m = parseFloat(mark);
      if (isNaN(m)) return "";
      const rule = gradeRules.find((r) => m >= r.min && m <= r.max);
      return rule ? rule.grade : "E";
    },
    [gradeRules],
  );

  const hasSecuredAPlus = useCallback(
    (resultsArray) => {
      if (!Array.isArray(resultsArray) || resultsArray.length === 0)
        return false;

      return resultsArray.every((res) => {
        const normalizedGrade = String(
          res?.grade || getGradeFromMark(res?.marks) || "",
        )
          .trim()
          .toUpperCase();

        return normalizedGrade === "A+";
      });
    },
    [getGradeFromMark],
  );

  const calculateResultStatus = (resultsArray, examData) => {
    if (!examData)
      return {
        status: "PENDING",
        totalObtained: 0,
        isFirstClass: false,
        isAllAPlus: false,
      };

    let totalObtained = 0;
    let isPass = true;

    resultsArray.forEach((res) => {
      totalObtained += Number(res.marks) || 0;
      const subjectEntry = examData.timetableEntries?.find(
        (te) => te.subject === res.subject || te.title === res.subject,
      );
      // Find metadata
      const subjectMeta = resultSubjectTemp.find(
        (s) => s.subject === res.subject,
      );

      const effectivePassMark =
        subjectEntry?.passMark ||
        res.passMark ||
        manualPassMarks[res.subject] ||
        subjectMeta?.passMark;

      if (effectivePassMark) {
        if (Number(res.marks) < Number(effectivePassMark)) {
          isPass = false;
        }
      }
    });

    if (
      examData.overallPassMark &&
      totalObtained < Number(examData.overallPassMark)
    ) {
      isPass = false;
    }

    const isFirstClass =
      isPass &&
      examData.firstFirstClassMark &&
      totalObtained >= Number(examData.firstFirstClassMark);

    const isAllAPlus = hasSecuredAPlus(resultsArray);

    return {
      status: isPass ? "PASS" : "FAIL",
      totalObtained,
      isFirstClass,
      isAllAPlus,
    };
  };

  const fetchClasses = useCallback(async () => {
    try {
      let constraints = [where("examID", "==", examId)];
      if (readOnly && userData?.madarsaId) {
        constraints.push(where("mid", "==", userData.madarsaId));
      }
      const q = query(
        collection(db, COLLECTIONS.EXAM_RESULTS || "results"),
        ...constraints,
      );
      const snapshot = await getDocs(q);
      const rawClasses = snapshot.docs
        .map((doc) => doc.data().class)
        .filter(Boolean);

      const mapping = {};
      rawClasses.forEach((c) => {
        const norm = normalizeClass(c);
        if (!mapping[norm]) mapping[norm] = new Set();
        mapping[norm].add(c);
      });

      setClassesMap(mapping);

      const uniqueNormalized = Object.keys(mapping).sort((a, b) => {
        const order = { LKG: -2, UKG: -1 };
        const aVal = order[a] !== undefined ? order[a] : parseInt(a);
        const bVal = order[b] !== undefined ? order[b] : parseInt(b);
        if (isNaN(aVal) || isNaN(bVal)) return a.localeCompare(b);
        return aVal - bVal;
      });

      setClasses(uniqueNormalized);

      // Fetch madarsas for admin filter
      const mSnap = await getDocs(
        query(collection(db, "madarsas"), orderBy("name", "asc")),
      );
      setMadarsas(
        mSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          madarsaId: d.data().madarsaId || d.id,
        })),
      );
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  }, [examId, readOnly, userData?.madarsaId]);

  const fetchResults = useCallback(
    async (direction = "initial", startAfterDoc = null) => {
      setLoading(true);
      setSelectedIds(new Set());
      try {
        const isSecuredAPlusFilter = filterPromoted === "secured-a-plus";
        let constraints = [where("examID", "==", examId)];

        if (filterClass !== "all") {
          const variants = Array.from(classesMap[filterClass] || [filterClass]);
          if (variants.length > 1) {
            constraints.push(where("class", "in", variants));
          } else {
            constraints.push(where("class", "==", variants[0]));
          }
        }

        if (readOnly && userData?.madarsaId) {
          constraints.push(where("mid", "==", userData.madarsaId));
        } else if (filterMadarsa !== "all") {
          constraints.push(where("mid", "==", filterMadarsa));
        }

        if (
          filterPromoted === "promoted" ||
          filterPromoted === "not-promoted"
        ) {
          constraints.push(
            where("promoted", "==", filterPromoted === "promoted"),
          );
        }

        if (searchTerm) {
          if (searchField === "hallTicketNumber") {
            // Always treat as string to preserve leading zeros (e.g. 000006)
            constraints.push(
              where("hallTicketNumber", "==", searchTerm.trim()),
            );
          } else {
            constraints.push(where("studentName", ">=", searchTerm));
            constraints.push(where("studentName", "<=", searchTerm + "\uf8ff"));
          }
        }

        constraints.push(
          orderBy(
            searchField === "studentName" ? "studentName" : "hallTicketNumber",
            "asc",
          ),
        );

        if (isSecuredAPlusFilter) {
          const allQuery = query(
            collection(db, COLLECTIONS.EXAM_RESULTS || "results"),
            ...constraints,
          );
          const allSnapshot = await getDocs(allQuery);
          const allData = allSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const onlyAPlus = allData.filter((r) =>
            hasSecuredAPlus(r.result || []),
          );

          const targetPage = direction === "next" ? page + 1 : 1;
          const start = (targetPage - 1) * pageSize;
          const end = start + pageSize;

          setTotalCount(onlyAPlus.length);
          setResults(onlyAPlus.slice(start, end));
          setPage(targetPage);
          setLastDoc(null);
          setDocHistory([null]);
        } else {
          const countQuery = query(
            collection(db, COLLECTIONS.EXAM_RESULTS || "results"),
            ...constraints,
          );
          const countSnapshot = await getCountFromServer(countQuery);
          setTotalCount(countSnapshot.data().count);

          let q = query(
            collection(db, COLLECTIONS.EXAM_RESULTS || "results"),
            ...constraints,
            limit(pageSize),
          );

          if (direction === "next") {
            const docToStartAfter = startAfterDoc || lastDoc;
            if (docToStartAfter) {
              q = query(q, startAfter(docToStartAfter));
            }
          }

          const snapshot = await getDocs(q);
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          setResults(data);
          const newLastDoc = snapshot.docs[snapshot.docs.length - 1];
          setLastDoc(newLastDoc);

          if (direction === "initial") {
            setPage(1);
            setDocHistory([null]);
          } else if (direction === "next") {
            setDocHistory((prev) => [...prev, newLastDoc]);
          }
        }
      } catch (error) {
        console.error("Error fetching results:", error);
        toast.error("Failed to load results");
      } finally {
        setLoading(false);
      }
    },
    [
      examId,
      filterClass,
      filterMadarsa,
      filterPromoted,
      searchTerm,
      searchField,
      readOnly,
      userData?.madarsaId,
      lastDoc,
      page,
      hasSecuredAPlus,
      classesMap,
    ],
  );

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      let constraints = [where("examID", "==", examId)];

      if (readOnly && userData?.madarsaId) {
        constraints.push(where("mid", "==", userData.madarsaId));
      } else if (filterMadarsa !== "all") {
        constraints.push(where("mid", "==", filterMadarsa));
      }

      const allQ = query(
        collection(db, COLLECTIONS.EXAM_RESULTS || "results"),
        ...constraints,
      );
      const snapshot = await getDocs(allQ);
      const allData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const counts = {};
      allData.forEach((r) => {
        const key = `${r.hallTicketNumber}`;
        counts[key] = (counts[key] || 0) + 1;
      });

      const duplicates = allData.filter(
        (r) => counts[`${r.hallTicketNumber}`] > 1,
      );
      setResults(duplicates);
      setTotalCount(duplicates.length);
      setPage(1);
    } catch (error) {
      console.error("Error finding duplicates:", error);
      toast.error("Failed to find duplicates");
    } finally {
      setLoading(false);
    }
  }, [examId, filterMadarsa, readOnly, userData?.madarsaId]);

  useEffect(() => {
    fetchExam();
    fetchClasses();
  }, [fetchExam, fetchClasses]);

  useEffect(() => {
    if (showDuplicates) {
      fetchDuplicates();
    } else {
      fetchResults("initial");
    }
    // NOTE: Intentionally excluding fetchResults/fetchDuplicates to prevent
    // callback-identity loops from retriggering this effect continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filterClass,
    filterMadarsa,
    searchField,
    searchTerm,
    showDuplicates,
    filterPromoted,
    classesMap,
  ]);

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      setShowDuplicates(false);
      fetchResults("initial");
    }
  };

  const handleNextPage = () => {
    if (filterPromoted === "secured-a-plus") {
      if (page * pageSize < totalCount) {
        fetchResults("next");
      }
      return;
    }

    if (page * pageSize < totalCount && lastDoc) {
      setPage((prev) => prev + 1);
      fetchResults("next", lastDoc);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(1);
      fetchResults("initial");
    }
  };

  const toggleSelection = (id) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    const visibleResults =
      filterPromoted === "secured-a-plus"
        ? results.filter((r) => hasSecuredAPlus(r.result || []))
        : results;

    if (selectedIds.size === visibleResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleResults.map((r) => r.id)));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one record");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to ${action} ${selectedIds.size} records?`,
      )
    )
      return;

    setBulkProcessing(true);
    try {
      const batchSize = 100;
      const idsArray = Array.from(selectedIds);

      for (let i = 0; i < idsArray.length; i += batchSize) {
        const batch = getWriteBatch(db);
        const currentBatchIds = idsArray.slice(i, i + batchSize);

        currentBatchIds.forEach((id) => {
          const docRef = doc(db, COLLECTIONS.EXAM_RESULTS || "results", id);
          if (action === "publish") {
            batch.update(docRef, {
              isPublished: true,
              updatedAt: new Date(),
              updatedBy: user?.email || user?.uid || "unknown",
            });
          } else if (action === "unpublish") {
            batch.update(docRef, {
              isPublished: false,
              updatedAt: new Date(),
              updatedBy: user?.email || user?.uid || "unknown",
            });
          } else if (action === "delete") {
            batch.delete(docRef);
          }
        });

        await batch.commit();
      }

      toast.success(`Successfully ${action}ed ${selectedIds.size} records`);
      setSelectedIds(new Set());
      if (showDuplicates) fetchDuplicates();
      else fetchResults("initial");
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      toast.error(`Failed to ${action} records`);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleEdit = (result) => {
    setEditingResult(result);
    const resultDetails = result.result || [];

    // Local copy to build augmented results immediately
    let currentAvailableSubs = [...availableSubjects];
    const newManualPassMarks = { ...manualPassMarks };

    // Append missing subjects and restore passMarks
    resultDetails.forEach((item) => {
      if (!currentAvailableSubs.includes(item.subject)) {
        currentAvailableSubs.push(item.subject);
      }
      if (item.passMark !== undefined) {
        newManualPassMarks[item.subject] = item.passMark;
      }
    });

    // Update states
    setAvailableSubjects(currentAvailableSubs);
    setManualPassMarks(newManualPassMarks);

    const augmentedResults = currentAvailableSubs.map((sub) => {
      const examPassMark = exam?.timetableEntries?.find(
        (te) => te.subject === sub || te.title === sub,
      )?.passMark;

      return {
        subject: sub,
        marks: subjectMap[sub]?.marks || "",
        grade: subjectMap[sub]?.grade || "",
        passMark:
          examPassMark ||
          subjectMap[sub]?.passMark ||
          newManualPassMarks[sub] ||
          "",
      };
    });

    setEditFormData({
      ...result,
      result: augmentedResults,
    });
  };

  const fetchHallTicketDetails = async (hallTicketNumber) => {
    setLoadingHallTicket(true);
    setHallTicketData(null);
    try {
      const hallTicketQuery = query(
        collection(db, "hallTickets", examId, "students"),
        where("hallTicketNumber", "==", hallTicketNumber.toString().trim()),
      );

      const snapshot = await getDocs(hallTicketQuery);

      if (!snapshot.empty) {
        setHallTicketData(snapshot.docs[0].data());
      } else {
        // Fallback for old numeric data if needed, but primary is now string
        const num = parseInt(hallTicketNumber);
        if (!isNaN(num)) {
          const numQuery = query(
            collection(db, "hallTickets", examId, "students"),
            where("hallTicketNumber", "==", num),
          );
          const numSnapshot = await getDocs(numQuery);
          if (!numSnapshot.empty) {
            setHallTicketData(numSnapshot.docs[0].data());
          } else {
            toast.error("Student registration data not found");
          }
        } else {
          toast.error("Student registration data not found");
        }
      }
    } catch (error) {
      console.error("Error fetching hall ticket details:", error);
      toast.error("Failed to load registration details");
    } finally {
      setLoadingHallTicket(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;
    setSaving(true);
    try {
      // Recalculate status and total marks
      const { status, totalObtained, isFirstClass } = calculateResultStatus(
        editFormData.result || [],
        exam,
      );

      // Clean up result array - filter out empty subjects and ensure passMark is included
      const cleanedResult = (editFormData.result || [])
        .filter((r) => r.subject?.trim())
        .map((r) => {
          const examPassMark = exam?.timetableEntries?.find(
            (te) => te.subject === r.subject || te.title === r.subject,
          )?.passMark;

          return {
            ...r,
            passMark:
              examPassMark || r.passMark || manualPassMarks[r.subject] || 0,
          };
        });

      // Update resultSubjectTemp if any new subjects were added
      const newSubjects = cleanedResult
        .map((r) => r.subject.trim())
        .filter((s) => s && !resultSubjectTemp.includes(s));

      if (newSubjects.length > 0) {
        try {
          const examDocRef = doc(db, COLLECTIONS.EXAMS, examId);
          await updateDoc(examDocRef, {
            resultSubjectTemp: arrayUnion(...newSubjects),
          });
          setResultSubjectTemp((prev) => [...prev, ...newSubjects]);
        } catch (err) {
          console.error("Error updating resultSubjectTemp:", err);
        }
      }

      const finalData = {
        ...editFormData,
        result: cleanedResult,
        status,
        totalObtained,
        isFirstClass,
        updatedAt: new Date(),
        updatedBy: user?.email || user?.uid || "unknown",
      };

      const batch = writeBatch(db);
      const oldDocRef = doc(
        db,
        COLLECTIONS.EXAM_RESULTS || "results",
        editingResult.id,
      );

      const newDocId = `${examId}_${editFormData.hallTicketNumber.toString().trim()}`;

      if (newDocId !== editingResult.id) {
        const newDocRef = doc(
          db,
          COLLECTIONS.EXAM_RESULTS || "results",
          newDocId,
        );
        batch.set(newDocRef, finalData);
        batch.delete(oldDocRef);
        await batch.commit();
      } else {
        await updateDoc(oldDocRef, finalData);
      }

      toast.success("Result updated successfully");

      // Log activity
      try {
        await addDoc(collection(db, "LoginLogs"), {
          email: user?.email || "unknown",
          name: user?.displayName || "Unknown User",
          userId: user?.uid || "unknown",
          role: user?.role || "admin",
          activityType: "result_edit",
          details: `Edited result for Hall Ticket: ${editFormData.hallTicketNumber} (${editFormData.studentName})`,
          examId: examId,
          examTitle: exam?.title || "",
          hallTicketNumber: editFormData.hallTicketNumber,
          studentName: editFormData.studentName,
          loginTimestamp: serverTimestamp(),
          platform:
            typeof window !== "undefined"
              ? window.navigator.userAgent.includes("Mobile")
                ? "mobile"
                : "web"
              : "unknown",
          userAgent:
            typeof window !== "undefined" ? window.navigator.userAgent : "",
        });
      } catch (logError) {
        console.error("Error logging activity:", logError);
      }

      setEditingResult(null);
      if (showDuplicates) fetchDuplicates();
      else fetchResults("initial");
    } catch (error) {
      console.error("Error updating result:", error);
      toast.error("Failed to update result");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this result?")) return;
    try {
      // Get result details before deleting for logging
      const resultToDelete = results.find((r) => r.id === id);

      await deleteDoc(doc(db, COLLECTIONS.EXAM_RESULTS || "results", id));
      toast.success("Result deleted");

      // Log activity
      try {
        await addDoc(collection(db, "LoginLogs"), {
          email: user?.email || "unknown",
          name: user?.displayName || "Unknown User",
          userId: user?.uid || "unknown",
          role: user?.role || "admin",
          activityType: "result_delete",
          details: `Deleted result for Hall Ticket: ${resultToDelete?.hallTicketNumber || id} (${resultToDelete?.studentName || "Unknown"})`,
          examId: examId,
          examTitle: exam?.title || "",
          hallTicketNumber: resultToDelete?.hallTicketNumber,
          studentName: resultToDelete?.studentName,
          loginTimestamp: serverTimestamp(),
          platform:
            typeof window !== "undefined"
              ? window.navigator.userAgent.includes("Mobile")
                ? "mobile"
                : "web"
              : "unknown",
          userAgent:
            typeof window !== "undefined" ? window.navigator.userAgent : "",
        });
      } catch (logError) {
        console.error("Error logging activity:", logError);
      }

      if (showDuplicates) fetchDuplicates();
      else fetchResults("initial");
    } catch (error) {
      console.error("Error deleting result:", error);
      toast.error("Failed to delete result");
    }
  };

  const handlePromoteStudents = async () => {
    if (
      promoteConfirmText !== "I confirm to promote all students who are passed"
    ) {
      toast.error("Please type the confirmation text exactly");
      return;
    }

    setPromoting(true);
    try {
      const constraints = [where("examID", "==", examId)];

      if (readOnly && userData?.madarsaId) {
        constraints.push(where("mid", "==", userData.madarsaId));
      }

      const q = query(
        collection(db, COLLECTIONS.EXAM_RESULTS || "results"),
        ...constraints,
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      let promotedCount = 0;
      let failedCount = 0;

      snapshot.docs.forEach((docSnap) => {
        const resultData = docSnap.data();
        const { status } = calculateResultStatus(resultData.result || [], exam);

        const isPromoted = status === "PASS";
        batch.update(docSnap.ref, {
          promoted: isPromoted,
          promotedAt: serverTimestamp(),
          promotedBy: user?.uid || "unknown",
        });

        if (isPromoted) promotedCount++;
        else failedCount++;
      });

      await batch.commit();

      try {
        await addDoc(collection(db, "LoginLogs"), {
          email: user?.email || "unknown",
          name: user?.displayName || "Unknown User",
          userId: user?.uid || "unknown",
          role: user?.role || "admin",
          activityType: "student_promotion",
          details: `Promoted ${promotedCount} students, ${failedCount} not promoted (failed) for exam: ${exam?.title || examId}`,
          examId: examId,
          examTitle: exam?.title || "",
          promotedCount,
          failedCount,
          loginTimestamp: serverTimestamp(),
          platform:
            typeof window !== "undefined"
              ? window.navigator.userAgent.includes("Mobile")
                ? "mobile"
                : "web"
              : "unknown",
          userAgent:
            typeof window !== "undefined" ? window.navigator.userAgent : "",
        });
      } catch (logError) {
        console.error("Error logging activity:", logError);
      }

      toast.success(
        `Successfully promoted ${promotedCount} students. ${failedCount} students not promoted (failed).`,
      );
      setShowPromoteDialog(false);
      setPromoteConfirmText("");
      fetchResults("initial");
    } catch (error) {
      console.error("Error promoting students:", error);
      toast.error("Failed to promote students");
    } finally {
      setPromoting(false);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const constraints = [where("examID", "==", examId)];

      if (readOnly && userData?.madarsaId) {
        constraints.push(where("mid", "==", userData.madarsaId));
      } else if (filterMadarsa !== "all") {
        constraints.push(where("mid", "==", filterMadarsa));
      }

      if (filterClass !== "all") {
        const variants = Array.from(classesMap[filterClass] || [filterClass]);
        if (variants.length > 1) {
          constraints.push(where("class", "in", variants));
        } else {
          constraints.push(where("class", "==", variants[0]));
        }
      }
      if (searchTerm) {
        if (searchField === "hallTicketNumber")
          constraints.push(where("hallTicketNumber", "==", searchTerm.trim()));
        else {
          constraints.push(where("studentName", ">=", searchTerm));
          constraints.push(where("studentName", "<=", searchTerm + "\uf8ff"));
        }
      }

      const q = query(
        collection(db, COLLECTIONS.EXAM_RESULTS || "results"),
        ...constraints,
        orderBy(
          searchTerm && searchField !== "hallTicketNumber"
            ? "studentName"
            : "madarsaName",
          "asc",
        ),
        orderBy("class", "asc"),
        orderBy("hallTicketNumber", "asc"),
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map((doc) => doc.data());

      if (filterPromoted === "promoted" || filterPromoted === "not-promoted") {
        const want = filterPromoted === "promoted";
        data = data.filter((r) => r.promoted === want);
      } else if (filterPromoted === "secured-a-plus") {
        data = data.filter((r) => hasSecuredAPlus(r.result || []));
      }

      if (data.length === 0) {
        toast.info("No data available to export");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const madarsaGroups = {};
      data.forEach((row) => {
        const mKey = (row.madarsaName || "Unknown Madrasa")
          .substring(0, 31)
          .replace(/[\[\]\*\?\/\\]/g, "");
        if (!madarsaGroups[mKey]) madarsaGroups[mKey] = [];
        madarsaGroups[mKey].push(row);
      });

      for (const [mName, mData] of Object.entries(madarsaGroups)) {
        const sheet = workbook.addWorksheet(mName);

        // Setup styles
        const titleStyle = {
          font: {
            name: "Arial",
            size: 18,
            bold: true,
            color: { argb: "FF0D9488" },
          }, // Teal 600
          alignment: { horizontal: "center", vertical: "middle" },
        };
        const subTitleStyle = {
          font: {
            name: "Arial",
            size: 14,
            bold: true,
            color: { argb: "FF0D9488" },
          }, // Teal 600
          alignment: { horizontal: "center", vertical: "middle" },
        };
        const labelStyle = {
          font: { bold: true, color: { argb: "FF333333" } },
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" }, // Light Gray
          },
          border: {
            top: { style: "thin", color: { argb: "FFCCCCCC" } },
            left: { style: "thin", color: { argb: "FFCCCCCC" } },
            bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
            right: { style: "thin", color: { argb: "FFCCCCCC" } },
          },
          alignment: { horizontal: "left", vertical: "middle" },
        };
        const infoValueStyle = {
          border: {
            top: { style: "thin", color: { argb: "FFCCCCCC" } },
            left: { style: "thin", color: { argb: "FFCCCCCC" } },
            bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
            right: { style: "thin", color: { argb: "FFCCCCCC" } },
          },
          alignment: { horizontal: "left", vertical: "middle" },
        };
        const headerStyle = {
          font: { bold: true, color: { argb: "FF134E4A" } }, // Teal 900
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0F2F1" }, // Teal 50
          },
          border: {
            top: { style: "thin", color: { argb: "FF0D9488" } },
            left: { style: "thin", color: { argb: "FF0D9488" } },
            bottom: { style: "thin", color: { argb: "FF0D9488" } },
            right: { style: "thin", color: { argb: "FF0D9488" } },
          },
          alignment: { horizontal: "center", vertical: "middle" },
        };
        const dataStyle = {
          border: {
            top: { style: "thin", color: { argb: "FFDDDDDD" } },
            left: { style: "thin", color: { argb: "FFDDDDDD" } },
            bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
            right: { style: "thin", color: { argb: "FFDDDDDD" } },
          },
          alignment: { horizontal: "center", vertical: "middle" },
        };
        const passedStyle = {
          font: { bold: true, color: { argb: "FF008000" } },
        }; // Green
        const failedStyle = {
          font: { bold: true, color: { argb: "FFFF0000" } },
        }; // Red
        const yesStyle = {
          font: { bold: true, color: { argb: "FF0F766E" } },
        }; // Teal
        const noStyle = {
          font: { bold: true, color: { argb: "FF6B7280" } },
        }; // Gray

        // Class Groups
        const classGroups = {};
        mData.forEach((row) => {
          if (!classGroups[row.class]) classGroups[row.class] = [];
          classGroups[row.class].push(row);
        });
        const sortedClasses = Object.keys(classGroups).sort();

        // Calculate columns count (2 cols per subject: grade + marks)
        let maxCols = 7;
        sortedClasses.forEach((cls) => {
          const subjects = [
            ...new Set(
              classGroups[cls].flatMap(
                (r) => r.result?.map((s) => s.subject) || [],
              ),
            ),
          ];
          maxCols = Math.max(maxCols, 4 + subjects.length * 2 + 2);
        });

        // Set column widths
        sheet.columns = [
          { width: 8 }, // #
          { width: 12 }, // Class
          { width: 18 }, // Reg No
          { width: 35 }, // Name
          ...Array(maxCols - 4).fill({ width: 15 }), // Subjects and Remarks
        ];

        // Titles
        const r1 = sheet.addRow([
          "DKJU EXAM BOARD ANNUAL EXAM RESULT (2025-2026)",
        ]);
        sheet.mergeCells(1, 1, 1, maxCols);
        r1.getCell(1).style = titleStyle;
        r1.height = 30;

        const r2 = sheet.addRow(["GRADE LIST"]);
        sheet.mergeCells(2, 1, 2, maxCols);
        r2.getCell(1).style = subTitleStyle;
        r2.height = 25;

        sheet.addRow([]); // Blank

        // Header Info
        const infoRow = mData[0];

        const romanToArabic = (str) => {
          if (!str) return str;
          const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
          const s = str.trim().toUpperCase();
          if (/^[IVXLCDM]+$/.test(s)) {
            let result = 0;
            for (let i = 0; i < s.length; i++) {
              const cur = map[s[i]];
              const next = map[s[i + 1]];
              result += next > cur ? -cur : cur;
            }
            return String(result);
          }
          return str;
        };

        const formatClassValue = (val) =>
          val
            .split(",")
            .map((c) => romanToArabic(c.trim()))
            .join(", ");
        const r4 = sheet.addRow([
          "Madrasa Name",
          mName,
          "",
          "",
          "Class",
          filterClass === "all"
            ? formatClassValue(sortedClasses.join(", "))
            : formatClassValue(filterClass),
        ]);
        const r4Num = r4.number;
        sheet.mergeCells(r4Num, 2, r4Num, 4);
        sheet.mergeCells(r4Num, 6, r4Num, maxCols);
        [1, 5].forEach((c) => (r4.getCell(c).style = labelStyle));
        [2, 6].forEach((c) => (r4.getCell(c).style = infoValueStyle));
        r4.height = 20;

        const r5 = sheet.addRow([
          "Place",
          infoRow.place || "N/A",
          "",
          "",
          "Zone",
          infoRow.zone || "N/A",
        ]);
        const r5Num = r5.number;
        sheet.mergeCells(r5Num, 2, r5Num, 4);
        sheet.mergeCells(r5Num, 6, r5Num, maxCols);
        [1, 5].forEach((c) => (r5.getCell(c).style = labelStyle));
        [2, 6].forEach((c) => (r5.getCell(c).style = infoValueStyle));
        r5.height = 20;

        if (infoRow.mid) {
          const r6 = sheet.addRow(["Madarsa ID", infoRow.mid, "", "", "", ""]);
          const r6Num = r6.number;
          sheet.mergeCells(r6Num, 2, r6Num, maxCols);
          r6.getCell(1).style = labelStyle;
          r6.getCell(2).style = infoValueStyle;
          r6.height = 20;
        }

        sheet.addRow([]); // Blank

        sortedClasses.forEach((cls) => {
          const classResults = classGroups[cls];
          const subjects = Array.from(
            new Set(
              classResults.flatMap(
                (r) => r.result?.map((s) => s.subject) || [],
              ),
            ),
          ).sort();
          // 2 cols per subject: col (5 + i*2) = Marks, col (5 + i*2 + 1) = Grade
          const remarksIdx = 5 + subjects.length * 2;
          const securedAPlusIdx = remarksIdx + 1;
          const fixedCols = [1, 2, 3, 4, remarksIdx, securedAPlusIdx];

          // Table Header - Row 1: fixed labels + "Subjects" merged across all subject cols
          const h1Data = [
            "#",
            "Class",
            "Reg No",
            "Name",
            "Subjects",
            ...Array(subjects.length > 0 ? subjects.length * 2 - 1 : 0).fill(
              "",
            ),
            "Remarks",
            "Secured A+",
          ];
          const h1 = sheet.addRow(h1Data);
          const hRow1 = h1.number;
          h1.height = 25;

          // Merge "Subjects" across cols 5..(4 + subjects.length*2), row 1 only
          if (subjects.length > 0)
            sheet.mergeCells(hRow1, 5, hRow1, 4 + subjects.length * 2);

          // Style fixed cols in h1 individually (no vertical merge — each row styles its own cells)
          fixedCols.forEach((c) => {
            h1.getCell(c).style = headerStyle;
          });
          h1.getCell(5).style = headerStyle;

          // Table Header - Row 2: each subject name merged across its 2 cols
          const h2Data = [
            "",
            "",
            "",
            "",
            ...subjects.flatMap((s) => [s, ""]),
            "",
            "",
          ];
          const h2 = sheet.addRow(h2Data);
          h2.height = 25;
          subjects.forEach((_, i) => {
            const col = 5 + i * 2;
            sheet.mergeCells(h2.number, col, h2.number, col + 1);
            h2.getCell(col).style = headerStyle;
            h2.getCell(col + 1).style = headerStyle;
          });
          fixedCols.forEach((c) => {
            h2.getCell(c).style = headerStyle;
          });

          // Table Header - Row 3: "Marks" | "Grade" per subject
          const h3Data = [
            "",
            "",
            "",
            "",
            ...subjects.flatMap(() => ["Marks", "Grade"]),
            "",
            "",
          ];
          const h3 = sheet.addRow(h3Data);
          h3.height = 25;
          subjects.forEach((_, i) => {
            h3.getCell(5 + i * 2).style = headerStyle;
            h3.getCell(5 + i * 2 + 1).style = headerStyle;
          });
          fixedCols.forEach((c) => {
            h3.getCell(c).style = headerStyle;
          });

          // Data Rows
          classResults.forEach((row, idx) => {
            const studentResults = {};
            if (Array.isArray(row.result))
              row.result.forEach((r) => (studentResults[r.subject] = r));

            const isFailed = row.result?.some((r) =>
              ["F", "E", "AB", "Absent", "-1"].includes(
                r.grade?.toString().trim(),
              ),
            );
            const isAllAPlus =
              Array.isArray(row.result) &&
              row.result.length > 0 &&
              row.result.every(
                (r) =>
                  String(r?.grade || "")
                    .trim()
                    .toUpperCase() === "A+",
              );
            const rowData = [
              idx + 1,
              row.class || "",
              row.hallTicketNumber || "",
              row.studentName || "",
              ...subjects.flatMap((s) => [
                studentResults[s]?.marks ?? "",
                studentResults[s]?.grade || "",
              ]),
              isFailed ? "FAILED" : "PASSED",
              isAllAPlus ? "YES" : "NO",
            ];

            const dr = sheet.addRow(rowData);
            dr.height = 20;
            dr.eachCell((cell, colNum) => {
              cell.style = dataStyle;
              if (colNum === remarksIdx) {
                cell.font = isFailed ? failedStyle.font : passedStyle.font;
              }
              if (colNum === securedAPlusIdx) {
                cell.font = isAllAPlus ? yesStyle.font : noStyle.font;
              }
            });
          });

          sheet.addRow([]);
          sheet.addRow([]);
        });
      }

      let filterSuffix = "";
      if (filterClass !== "all") filterSuffix += `_Class_${filterClass}`;
      if (filterMadarsa !== "all") {
        const m = madarsas.find(
          (md) => md.id === filterMadarsa || md.madarsaId === filterMadarsa,
        );
        if (m) filterSuffix += `_${m.name.replace(/\s+/g, "_")}`;
      }
      if (filterPromoted !== "all") {
        if (filterPromoted === "promoted") filterSuffix += "_Promoted";
        else if (filterPromoted === "not-promoted")
          filterSuffix += "_Not_Promoted";
        else if (filterPromoted === "secured-a-plus")
          filterSuffix += "_Secured_A_Plus";
      }
      if (searchTerm)
        filterSuffix += `_Filtered_${searchTerm.replace(/\s+/g, "_")}`;

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Results_${(exam?.title || "Export").replace(/\s+/g, "_")}${filterSuffix}_${new Date().toISOString().split("T")[0]}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
      toast.success(
        `Exported styled workbook for ${Object.keys(madarsaGroups).length} Madrasas`,
      );
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export styled data");
    } finally {
      setExporting(false);
    }
  };

  const visibleResults =
    filterPromoted === "secured-a-plus"
      ? results.filter((r) => hasSecuredAPlus(r.result || []))
      : results;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {exam?.title} - View Results
          </h1>
          <p className="text-gray-600">
            Manage and edit student results for this examination
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Card className="min-w-[200px] border-gray-100">
          <CardContent className="p-4 flex items-center">
            <div className="bg-gray-100 p-2 none-lg text-gray-600 mr-3">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Total Records
              </p>
              <p className="text-xl font-bold text-gray-900 leading-none">
                {totalCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button
          variant={showDuplicates ? "destructive" : "outline"}
          onClick={() => setShowDuplicates(!showDuplicates)}
          className="flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>{showDuplicates ? "Show All" : "Find Duplicates"}</span>
        </Button>

        <Button
          variant="outline"
          onClick={handleExportAll}
          disabled={exporting}
          className="flex items-center gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span>Export Excel</span>
        </Button>

        {uploadPath && !readOnly && (
          <Button
            variant="default"
            onClick={() => router.push(uploadPath)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Results
          </Button>
        )}

        {(userData?.role === "central_admin" ||
          userData?.role === "pariksha_board_convener") && (
          <Button
            variant="default"
            onClick={async () => {
              setShowPromoteDialog(true);
              setLoadingStudentsList(true);
              try {
                const constraints = [where("examID", "==", examId)];
                const q = query(
                  collection(db, COLLECTIONS.EXAM_RESULTS || "results"),
                  ...constraints,
                );
                const snapshot = await getDocs(q);

                const getNextClass = (currentClass) => {
                  if (!currentClass) return null;
                  if (currentClass === "LKG") return "UKG";
                  if (currentClass === "UKG") return "1";
                  const num = parseInt(currentClass);
                  if (!isNaN(num)) return String(num + 1);
                  return null;
                };

                // Helper function to display class
                const displayClass = (classValue) => {
                  if (classValue === "LKG" || classValue === "UKG")
                    return classValue;
                  if (typeof classValue === "number") return classValue;
                  return "N/A";
                };

                const studentsList = snapshot.docs.map((docSnap) => {
                  const resultData = docSnap.data();
                  const { status } = calculateResultStatus(
                    resultData.result || [],
                    exam,
                  );
                  const currentClass = normalizeClass(resultData.class);
                  const nextClass = getNextClass(currentClass);

                  return {
                    id: docSnap.id,
                    hallTicketNumber: resultData.hallTicketNumber,
                    studentName: resultData.studentName,
                    class: currentClass,
                    nextClass: nextClass,
                    status: status,
                    willBePromoted: status === "PASS",
                  };
                });
                setStudentsToPromote(studentsList);
              } catch (error) {
                console.error("Error loading students:", error);
                toast.error("Failed to load student list");
              } finally {
                setLoadingStudentsList(false);
              }
            }}
            disabled={promoting}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {promoting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GraduationCap className="h-4 w-4" />
            )}
            <span>Promote Students</span>
          </Button>
        )}

        {selectedIds.size > 0 && !readOnly && (
          <div className="flex items-center gap-2 p-1.5 bg-teal-50 none-lg border border-teal-100">
            <span className="px-3 text-xs font-bold text-teal-700">
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-teal-700 hover:bg-teal-100 font-bold text-xs"
              onClick={() => handleBulkAction("publish")}
              disabled={bulkProcessing}
            >
              Publish
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-orange-700 hover:bg-orange-50 font-bold text-xs"
              onClick={() => handleBulkAction("unpublish")}
              disabled={bulkProcessing}
            >
              Hide
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-red-700 hover:bg-red-50 font-bold text-xs"
              onClick={() => handleBulkAction("delete")}
              disabled={bulkProcessing}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {availableSubjects.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center p-3 bg-gray-50/50 none-lg border border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-2">
            Examination Subjects:
          </span>
          {availableSubjects.map((sub, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="bg-white border-gray-200 text-gray-600 font-semibold px-3 py-1"
            >
              {sub}
            </Badge>
          ))}
        </div>
      )}

      <div className="pb-3 px-1 sm:px-0">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-white p-3 sm:p-5 none-xl border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center gap-2">
              <Select value={searchField} onValueChange={setSearchField}>
                <SelectTrigger className="w-full sm:w-[150px] h-11 border-gray-200 none-lg font-medium">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent className="bg-white none-lg shadow-md border-gray-100">
                  <SelectItem value="hallTicketNumber">HT #</SelectItem>
                  <SelectItem value="studentName">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10 h-11 border-gray-200 none-lg w-full"
                placeholder={`Search ${searchField === "hallTicketNumber" ? "HT..." : "Name..."}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
            <Button
              className="h-11 px-6 none-lg bg-teal-600 hover:bg-teal-700 font-bold w-full sm:w-auto"
              onClick={() => {
                setShowDuplicates(false);
                fetchResults("initial");
              }}
            >
              Search
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-50">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="p-2 bg-gray-100 none-lg shrink-0">
                <Filter className="h-4 w-4 text-gray-500" />
              </div>
              {(userData?.role === "central_admin" ||
                userData?.role === "pariksha_board_convener") && (
                <SearchableSelect
                  value={filterMadarsa}
                  onValueChange={setFilterMadarsa}
                  placeholder="All Madarsas"
                  options={[
                    { id: "all", name: "All Madarsas", madarsaId: "all" },
                    ...madarsas,
                  ]}
                  getOptionLabel={(m) => m.name}
                  getOptionValue={(m) => m.madarsaId || m.id}
                  getOptionSearchText={(m) =>
                    `${m.name} ${m.madarsaId || m.id}`
                  }
                  triggerClassName="w-full sm:w-[200px] h-11 border-gray-200 none-lg font-medium"
                />
              )}
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full sm:w-[140px] h-11 border-gray-200 none-lg font-medium">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent className="bg-white none-lg shadow-md border-gray-100">
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPromoted} onValueChange={setFilterPromoted}>
                <SelectTrigger className="w-full sm:w-[160px] h-11 border-gray-200 none-lg font-medium">
                  <SelectValue placeholder="Promotion" />
                </SelectTrigger>
                <SelectContent className="bg-white none-lg shadow-md border-gray-100">
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="promoted">Promoted</SelectItem>
                  <SelectItem value="not-promoted">Not Promoted</SelectItem>
                  <SelectItem value="secured-a-plus">Secured A+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-md shadow-gray-100 overflow-hidden none-lg">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-32 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
              <p className="text-gray-400 font-medium animate-pulse">
                Loading examination records...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent border-gray-100">
                    <TableHead className="w-12 px-6">
                      <Checkbox
                        checked={
                          visibleResults.length > 0 &&
                          selectedIds.size === visibleResults.length
                        }
                        onCheckedChange={toggleSelectAll}
                        className="none-md border-gray-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                      />
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 tracking-widest px-4 py-4">
                      Sl.
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 tracking-widest py-4">
                      Hall Ticket
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 tracking-widest py-4">
                      Student Details
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 tracking-widest py-4">
                      Performance
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 tracking-widest py-4">
                      Pub. Status
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-gray-400 tracking-widest text-right py-4 pr-6">
                      Manage
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleResults.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-24 text-gray-400"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <History className="h-12 w-12 text-gray-200" />
                          <p className="text-lg font-medium">
                            {showDuplicates
                              ? "Splendid! No duplicate records found in the database."
                              : "No examination results match your current search criteria."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleResults.map((r, idx) => {
                      const totalMarks =
                        r.result?.reduce(
                          (sum, sub) => sum + (parseFloat(sub.marks) || 0),
                          0,
                        ) || 0;
                      const isAllAPlus = hasSecuredAPlus(r.result || []);
                      const isSelected = selectedIds.has(r.id);
                      return (
                        <TableRow
                          key={r.id}
                          className={`group transition-all border-gray-50 ${isSelected ? "bg-teal-50/30" : "hover:bg-gray-50/50"}`}
                        >
                          <TableCell className="px-6">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(r.id)}
                              className="none-md border-gray-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                            />
                          </TableCell>
                          <TableCell className="text-gray-400 font-bold text-xs px-4">
                            {(page - 1) * pageSize + idx + 1}
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-gray-900 font-mono tracking-tighter bg-gray-100 px-2 py-1 none-lg">
                              {r.hallTicketNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 leading-tight">
                                {r.studentName}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-bold border-gray-200 h-5 px-1.5"
                                >
                                  CLASS {r.class}
                                </Badge>
                                <span
                                  className="text-[10px] text-gray-400 truncate max-w-[120px]"
                                  title={r.madarsaName}
                                >
                                  {r.madarsaName}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                                  AGGREGATE
                                </span>
                                <span className="text-lg font-bold text-teal-600 leading-none">
                                  {totalMarks}
                                </span>
                              </div>
                              <div className="h-8 w-px bg-gray-100"></div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                                  GRADE
                                </span>
                                <span className="text-lg font-bold text-gray-900 leading-none">
                                  {r.result?.[0]?.grade || "N/A"}
                                </span>
                              </div>
                              {r.status && (
                                <>
                                  <div className="h-8 w-px bg-gray-100"></div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                                      RESULT
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] font-black h-5 px-1.5 border-none ${
                                        r.status === "PASS"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {r.status}
                                    </Badge>
                                  </div>
                                </>
                              )}
                              {r.promoted && (
                                <>
                                  <div className="h-8 w-px bg-gray-100"></div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                                      PROMOTED
                                    </span>
                                    <Badge className="text-[10px] font-black h-5 px-1.5 border-none bg-purple-100 text-purple-700">
                                      PROMOTED
                                    </Badge>
                                  </div>
                                </>
                              )}
                              {isAllAPlus && (
                                <>
                                  <div className="h-8 w-px bg-gray-100"></div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                                      ACHIEVEMENT
                                    </span>
                                    <Badge className="text-[10px] font-black h-5 px-1.5 border-none bg-amber-100 text-amber-800">
                                      SECURED A+
                                    </Badge>
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {r.isPublished !== false ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none px-2 py-0.5 font-bold text-[10px] flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  PUBLISHED
                                </Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none px-2 py-0.5 font-bold text-[10px] flex items-center gap-1">
                                  <GlobeLock className="h-3 w-3" />
                                  HIDDEN
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-1 pr-6">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 none-full text-teal-600 hover:bg-teal-50"
                              onClick={() => setViewingResult(r)}
                              title="Detailed Analysis"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!readOnly && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 none-full text-gray-600 hover:bg-gray-100"
                                  onClick={() => handleEdit(r)}
                                  title="Modify Record"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 none-full text-red-500 hover:bg-red-50"
                                  onClick={() => handleDelete(r.id)}
                                  title="Discard Result"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!showDuplicates && totalCount > 0 && (
            <div className="flex items-center justify-between p-6 bg-gray-50/50 border-t border-gray-100">
              <div className="text-sm font-medium text-gray-500">
                Viewing{" "}
                <span className="text-gray-900 font-bold">
                  {(page - 1) * pageSize + 1}-
                  {Math.min(page * pageSize, totalCount)}
                </span>{" "}
                of <span className="text-gray-900 font-bold">{totalCount}</span>{" "}
                examination records
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="none-lg h-9 font-bold px-4 border-gray-200 hover:bg-white"
                  onClick={handlePrevPage}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1.5" />
                  First Page
                </Button>
                <div className="bg-white border border-gray-200 none-lg h-9 px-4 flex items-center justify-center font-bold text-xs text-gray-900 min-w-20">
                  PAGE {page}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="none-lg h-9 font-bold px-4 border-gray-200 hover:bg-white"
                  onClick={handleNextPage}
                  disabled={page * pageSize >= totalCount || loading}
                >
                  Next Page
                  <ChevronRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingResult && (
        <Dialog open={true} onOpenChange={() => setEditingResult(null)}>
          <DialogContent className="max-w-3xl bg-white border-none shadow-2xl none-lg p-8 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Modify Result:{" "}
                <span className="text-teal-600">
                  {editingResult.studentName}
                </span>
              </DialogTitle>
              <p className="text-gray-500 font-medium">
                Updating examination details for Hall Ticket #
                {editingResult.hallTicketNumber}
              </p>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-2">
                <Label className="font-bold text-gray-700 ml-1">
                  Student Full Name
                </Label>
                <Input
                  className="h-12 none-lg border-gray-200 focus:ring-teal-500"
                  value={editFormData.studentName}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      studentName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700 ml-1">
                  Hall Ticket Number
                </Label>
                <Input
                  className="h-12 none-lg border-gray-200 font-mono font-bold"
                  value={editFormData.hallTicketNumber}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      hallTicketNumber: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700 ml-1">
                  Class Level
                </Label>
                <Input
                  className="h-12 none-lg border-gray-200"
                  value={editFormData.class}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, class: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700 ml-1">
                  Madarsa Name
                </Label>
                <Input
                  className="h-12 none-lg border-gray-200"
                  value={editFormData.madarsaName}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      madarsaName: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700 ml-1">
                  Place / City
                </Label>
                <Input
                  className="h-12 none-lg border-gray-200"
                  value={editFormData.place}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, place: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-gray-700 ml-1">
                  Zone / Region
                </Label>
                <Input
                  className="h-12 none-lg border-gray-200"
                  value={editFormData.zone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, zone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wider">
                    Subject-wise Scores
                  </h3>
                  {(() => {
                    const status = calculateResultStatus(
                      editFormData.result || [],
                      exam,
                    );
                    return (
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`font-black tracking-tighter ${status.status === "PASS" ? "bg-green-600" : "bg-red-600"}`}
                        >
                          {status.status} ({status.totalObtained})
                        </Badge>
                        {editingResult.promoted && (
                          <Badge className="bg-purple-600 text-white font-black tracking-tighter border-none">
                            PROMOTED
                          </Badge>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="none-lg border-teal-200 text-teal-700 hover:bg-teal-50 font-bold"
                  onClick={() =>
                    setEditFormData({
                      ...editFormData,
                      result: [
                        ...(editFormData.result || []),
                        { subject: "", marks: "", grade: "", passMark: "30" },
                      ],
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Append New Subject
                </Button>
              </div>

              <div className="space-y-4">
                {editFormData.result?.map((sub, sIdx) => {
                  const passMark =
                    exam?.timetableEntries?.find(
                      (te) =>
                        te.subject === sub.subject || te.title === sub.subject,
                    )?.passMark ||
                    sub.passMark ||
                    manualPassMarks[sub.subject];
                  const isFail =
                    passMark &&
                    sub.marks !== "" &&
                    Number(sub.marks) < Number(passMark);

                  return (
                    <div
                      key={sIdx}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-gray-50/50 p-4 none-lg border border-gray-100 relative group/row"
                    >
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                          Subject Name
                        </Label>
                        <SearchableSelect
                          placeholder="Type or select subject"
                          options={[
                            ...resultSubjectTemp.map((s) => ({
                              label: s.subject,
                              value: s.subject,
                            })),
                            ...(sub.subject &&
                            !resultSubjectTemp.some(
                              (s) => s.subject === sub.subject.trim(),
                            )
                              ? [
                                  {
                                    label: `Add "${sub.subject}"`,
                                    value: sub.subject.trim(),
                                  },
                                ]
                              : []),
                          ]}
                          value={sub.subject}
                          onValueChange={(val) => {
                            const newSubjectName = val;
                            const newR = [...editFormData.result];
                            newR[sIdx].subject = newSubjectName;

                            // Auto-fill passMark from exam timetable if available
                            const examPassMark = exam?.timetableEntries?.find(
                              (te) =>
                                te.subject === newSubjectName ||
                                te.title === newSubjectName,
                            )?.passMark;
                            if (examPassMark) {
                              newR[sIdx].passMark = examPassMark;
                            }

                            setEditFormData({ ...editFormData, result: newR });
                          }}
                          onSearchChange={(val) => {
                            const newR = [...editFormData.result];
                            newR[sIdx].subject = val;
                            setEditFormData({ ...editFormData, result: newR });
                          }}
                          triggerClassName="h-11 bg-white border-gray-200"
                          searchPlaceholder="Search or type new..."
                        />
                      </div>
                      {(() => {
                        const examPassMark = exam?.timetableEntries?.find(
                          (te) =>
                            te.subject === sub.subject ||
                            te.title === sub.subject,
                        )?.passMark;
                        const isFromExam = !!examPassMark;
                        const displayPassMark =
                          examPassMark || sub.passMark || "30";

                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                                Pass Mark
                              </Label>
                              {isFromExam && (
                                <span className="text-[8px] font-bold text-teal-600 uppercase">
                                  From Exam
                                </span>
                              )}
                            </div>
                            <Input
                              className={`h-11 none-lg border-gray-200 ${isFromExam ? "bg-gray-100 text-gray-500" : "bg-white"}`}
                              type="number"
                              disabled={isFromExam}
                              value={displayPassMark}
                              onChange={(e) => {
                                const newR = [...editFormData.result];
                                newR[sIdx].passMark = e.target.value;
                                setEditFormData({
                                  ...editFormData,
                                  result: newR,
                                });
                              }}
                            />
                          </div>
                        );
                      })()}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Marks Obtained
                          </Label>
                        </div>
                        <Input
                          className={`h-11 none-lg bg-white border-gray-200 font-bold ${isFail ? "text-red-500" : "text-teal-600"}`}
                          type="number"
                          value={sub.marks}
                          placeholder="00"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== "" && Number(val) > 100) {
                              toast.error("Marks cannot exceed 100");
                              return;
                            }
                            const newR = [...editFormData.result];
                            newR[sIdx].marks = val;
                            newR[sIdx].grade = getGradeFromMark(val);
                            setEditFormData({ ...editFormData, result: newR });
                          }}
                        />
                      </div>
                      <div className="space-y-2 flex items-center gap-3">
                        <div className="flex-1">
                          <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                            Grade
                          </Label>
                          <Input
                            className="h-11 none-lg bg-white border-gray-200 font-bold text-gray-900"
                            value={sub.grade}
                            placeholder="Grade"
                            onChange={(e) => {
                              const newR = [...editFormData.result];
                              newR[sIdx].grade = e.target.value;
                              setEditFormData({
                                ...editFormData,
                                result: newR,
                              });
                            }}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 none-lg text-red-500 hover:bg-red-50 opacity-0 group-hover/row:opacity-100 transition-opacity"
                          onClick={() => {
                            const newR = editFormData.result.filter(
                              (_, i) => i !== sIdx,
                            );
                            setEditFormData({ ...editFormData, result: newR });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {isFail && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200 shadow-sm animate-pulse">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-600" />
                          <span className="text-[7px] font-black text-red-700 uppercase">
                            Below Pass Mark
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="mt-12 gap-3">
              <Button
                variant="ghost"
                className="h-12 px-8 none-lg font-bold text-gray-500"
                onClick={() => setEditingResult(null)}
              >
                Discard Changes
              </Button>
              <Button
                className="h-12 px-10 none-lg bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-100 font-bold transition-all"
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Save className="h-5 w-5 mr-2" />
                )}
                Finalize Updates
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* View Modal */}
      {viewingResult && (
        <Dialog
          open={true}
          onOpenChange={() => {
            setViewingResult(null);
            setHallTicketData(null);
          }}
        >
          <DialogContent className="max-w-4xl bg-white border-none shadow-xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
            <DialogHeader className="pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    Examination Report Sheet
                  </DialogTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Complete academic performance dossier
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs px-3 py-1 bg-gray-50 text-gray-600 border-gray-200"
                  >
                    ID: {viewingResult.id.split("_").pop()}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="py-6 space-y-8">
                {/* Student Header Section */}
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="h-24 w-24 shrink-0 none-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                    {hallTicketData?.profilePictureUrl ||
                    viewingResult?.profilePictureUrl ? (
                      <img
                        src={
                          hallTicketData?.profilePictureUrl ||
                          viewingResult?.profilePictureUrl
                        }
                        className="h-full w-full object-cover"
                        alt="Profile"
                      />
                    ) : (
                      <User className="h-10 w-10 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-1 flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                      {viewingResult.studentName}
                    </h2>
                    <p className="text-gray-500 text-sm font-medium">
                      Hall Ticket:{" "}
                      <span className="text-gray-900 font-mono font-semibold">
                        {viewingResult.hallTicketNumber}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-100">
                        Class {viewingResult.class}
                      </Badge>
                      <Badge variant="outline" className="text-gray-600">
                        {viewingResult.madarsaName}
                      </Badge>
                      {hasSecuredAPlus(viewingResult.result || []) && (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none font-bold">
                          SECURED A+
                        </Badge>
                      )}
                      {viewingResult.promoted && (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none font-bold">
                          PROMOTED
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Regional Details */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      Regional Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 none-lg border border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Zone</p>
                        <p className="font-medium text-gray-900 text-sm">
                          {viewingResult.zone || "National"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="font-medium text-gray-900 text-sm">
                          {viewingResult.place || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Promotion Status */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-gray-500" />
                      Promotion Status
                    </h3>
                    <div className="bg-gray-50/50 p-4 none-lg border border-gray-100">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Status</p>
                          {viewingResult.promoted ? (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 font-bold">
                              PROMOTED
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-gray-600 font-semibold"
                            >
                              Not Promoted
                            </Badge>
                          )}
                        </div>
                        {viewingResult.promoted && viewingResult.promotedAt && (
                          <div>
                            <p className="text-xs text-gray-500">Promoted On</p>
                            <p className="font-medium text-gray-900 text-sm">
                              {new Date(
                                viewingResult.promotedAt?.seconds
                                  ? viewingResult.promotedAt.seconds * 1000
                                  : viewingResult.promotedAt,
                              ).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        )}
                        {viewingResult.promoted && viewingResult.promotedBy && (
                          <div>
                            <p className="text-xs text-gray-500">Promoted By</p>
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {viewingResult.promotedBy}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visibility Status */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      Public Visibility
                    </h3>
                    <div className="bg-gray-50/50 p-4 none-lg border border-gray-100 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs text-gray-500">Current Status</p>
                        <p
                          className={`text-sm font-semibold ${viewingResult.isPublished !== false ? "text-teal-600" : "text-amber-600"}`}
                        >
                          {viewingResult.isPublished !== false
                            ? "Publicly Available"
                            : "Hidden"}
                        </p>
                      </div>
                      {!readOnly && (
                        <Switch
                          checked={viewingResult.isPublished !== false}
                          onCheckedChange={async (val) => {
                            try {
                              const docRef = doc(
                                db,
                                COLLECTIONS.EXAM_RESULTS || "results",
                                viewingResult.id,
                              );
                              await updateDoc(docRef, {
                                isPublished: val,
                                updatedAt: new Date(),
                                updatedBy:
                                  user?.email || user?.uid || "unknown",
                              });
                              setViewingResult({
                                ...viewingResult,
                                isPublished: val,
                              });
                              setResults(
                                results.map((r) =>
                                  r.id === viewingResult.id
                                    ? { ...r, isPublished: val }
                                    : r,
                                ),
                              );
                              toast.success(
                                val
                                  ? "Result visible to students"
                                  : "Result hidden from students",
                              );
                            } catch (error) {
                              console.error("Error toggling status:", error);
                              toast.error("Status update failed");
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Result Table */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-gray-500" />
                    Academic Results
                  </h3>
                  <div className="border border-gray-200 none-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-[50%]">Subject</TableHead>
                          <TableHead className="text-center">Marks</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingResult.result?.map((sub, sIdx) => (
                          <TableRow key={sIdx}>
                            <TableCell className="font-medium text-gray-700">
                              {sub.subject}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-gray-900">
                              {sub.marks}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="secondary"
                                className="bg-gray-100 text-gray-700 font-bold"
                              >
                                {sub.grade}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(() => {
                          const {
                            status,
                            isFirstClass,
                            totalObtained,
                            isAllAPlus,
                          } = calculateResultStatus(
                            viewingResult.result || [],
                            exam,
                          );
                          return (
                            <TableRow className="bg-gray-50/50 font-bold">
                              <TableCell className="text-gray-900">
                                Total
                              </TableCell>
                              <TableCell className="text-center text-gray-900 text-lg">
                                {totalObtained}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge
                                    className={`${status === "PASS" ? "bg-green-600" : "bg-red-600"} text-white`}
                                  >
                                    {status}
                                  </Badge>
                                  {isFirstClass && (
                                    <Badge className="bg-yellow-500 text-white text-[10px] font-black uppercase px-2 py-0.5 animate-pulse">
                                      ⭐ FIRST CLASS
                                    </Badge>
                                  )}
                                  {isAllAPlus && (
                                    <Badge className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2 py-0.5">
                                      SECURED A+
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Hall Ticket Data Loading/Display */}
                <div>
                  {!hallTicketData && !loadingHallTicket && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        fetchHallTicketDetails(viewingResult.hallTicketNumber)
                      }
                      className="w-full h-15 dashed border-2 bg-teal-500 text-white border-gray-200 hover:bg-teal-700 hover:border-gray-300  gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Load Master Registration Record
                    </Button>
                  )}

                  {loadingHallTicket && (
                    <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-100 none-lg bg-gray-50/30">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                        <p className="text-xs text-gray-400 font-medium">
                          Decrypting secure records...
                        </p>
                      </div>
                    </div>
                  )}

                  {hallTicketData && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-gray-500" />
                          Master Record Details
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-gray-400 hover:text-red-500"
                          onClick={() => setHallTicketData(null)}
                        >
                          Dismiss
                        </Button>
                      </div>
                      <div className="bg-teal-50/50 border border-teal-100 none-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">
                            Admission No
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {hallTicketData.admissionNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">
                            Guardian Contact
                          </p>
                          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {hallTicketData.guardianPhone}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">
                            Institutional Sadr
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {hallTicketData.sadarName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {hallTicketData.sadarAddress}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">
                            Verification
                          </p>
                          <div className="flex gap-2">
                            <Badge className="bg-gray-900 text-white hover:bg-black text-[10px]">
                              {hallTicketData.gender}
                            </Badge>
                            <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-200 text-[10px] border-none">
                              VERIFIED
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Promote Students Dialog */}
      <Dialog
        open={showPromoteDialog}
        onOpenChange={(open) => {
          setShowPromoteDialog(open);
          if (!open) {
            setPromoteConfirmText("");
            setStudentsToPromote([]);
          }
        }}
      >
        <DialogContent className="max-w-4xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="h-6 w-6 text-orange-600" />
              Promote Students - Final Confirmation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-orange-900">
                    Warning: This action is irreversible!
                  </p>
                  <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                    <li>
                      All students who <strong>passed</strong> will be marked as{" "}
                      <strong>promoted = true</strong>
                    </li>
                    <li>
                      All students who <strong>failed</strong> will be marked as{" "}
                      <strong>promoted = false</strong>
                    </li>
                    <li>
                      This action applies to <strong>all results</strong> for
                      this exam
                    </li>
                    <li>
                      Only proceed if this is a <strong>final exam</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="font-semibold text-purple-900">
                    Exam Information
                  </p>
                  <p className="text-sm text-purple-800">
                    <strong>Exam:</strong> {exam?.title || "N/A"}
                  </p>
                  <p className="text-sm text-purple-800">
                    <strong>Type:</strong> {exam?.examType || "N/A"}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                      Will Promote:{" "}
                      {studentsToPromote.filter((s) => s.willBePromoted).length}
                    </Badge>
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
                      Will Not Promote:{" "}
                      {
                        studentsToPromote.filter((s) => !s.willBePromoted)
                          .length
                      }
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Students List */}
            <div className="border rounded-lg">
              <div className="bg-gray-50 p-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Students to be Processed ({studentsToPromote.length} Total)
                </h3>
                <div className="flex gap-2 text-sm">
                  <span className="text-green-600 font-semibold">
                    {studentsToPromote.filter((s) => s.willBePromoted).length}{" "}
                    Promoting
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-red-600 font-semibold">
                    {studentsToPromote.filter((s) => !s.willBePromoted).length}{" "}
                    Not Promoting
                  </span>
                </div>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {loadingStudentsList ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    <span className="ml-2 text-gray-600">
                      Loading students...
                    </span>
                  </div>
                ) : studentsToPromote.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No students found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reg No.</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Current Class</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Promoting To</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsToPromote.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-mono text-sm">
                            {student.hallTicketNumber}
                          </TableCell>
                          <TableCell>{student.studentName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-semibold">
                              {student.class === "LKG" ||
                              student.class === "UKG"
                                ? student.class
                                : `Class ${student.class || "N/A"}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                student.status === "PASS"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }
                            >
                              {student.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {student.willBePromoted && student.nextClass ? (
                              <Badge className="bg-blue-100 text-blue-700">
                                {student.nextClass === "UKG" ||
                                student.nextClass === "LKG"
                                  ? student.nextClass
                                  : `Class ${student.nextClass}`}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.willBePromoted ? (
                              <span className="text-green-600 font-semibold text-sm">
                                ✓ Will Promote
                              </span>
                            ) : (
                              <span className="text-red-600 font-semibold text-sm">
                                ✗ Will Not Promote
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-text" className="text-sm font-semibold">
                Type the following text to confirm:
              </Label>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 font-mono">
                I confirm to promote all students who are passed
              </p>
              <Input
                id="confirm-text"
                value={promoteConfirmText}
                onChange={(e) => setPromoteConfirmText(e.target.value)}
                placeholder="Type confirmation text here..."
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPromoteDialog(false);
                setPromoteConfirmText("");
              }}
              disabled={promoting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handlePromoteStudents}
              disabled={
                promoting ||
                promoteConfirmText !==
                  "I confirm to promote all students who are passed"
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              {promoting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Confirm Promotion
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
