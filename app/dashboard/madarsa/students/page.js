"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/authUtils";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Eye,
  Mail,
  Phone,
  Calendar,
  MapPin,
  User,
  GraduationCap,
  Search,
  Filter,
  Edit,
  Trash2,
  Download,
  UserX,
} from "lucide-react";
import {
  getDocuments,
  updateDocument,
  deleteDocument,
  COLLECTIONS,
} from "@/lib/firestoreService";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import useAuthStore from "@/lib/authStore";
import { isStudentEditEnabled } from "@/lib/settingsService";
import Image from "next/image";

// Helper function to safely format dates
const formatDate = (dateValue) => {
  if (!dateValue) return "Not available";

  try {
    // Handle Firestore timestamp objects
    if (dateValue && typeof dateValue.toDate === "function") {
      return dateValue.toDate().toLocaleDateString();
    }

    // Handle regular date strings/objects
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Date error";
  }
};

export default function StudentsManagement() {
  const { user, role } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [studentEditEnabled, setStudentEditEnabled] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [selectedStudentForAction, setSelectedStudentForAction] =
    useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDocs, setLastDocs] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const [genderFilter, setGenderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const ITEMS_PER_PAGE = 10;
  const searchTimeoutRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const aadharRefs = [useRef(null), useRef(null), useRef(null)];

  const aadharParts = [
    editForm.aadharNumber?.substring(0, 4) || "",
    editForm.aadharNumber?.substring(4, 8) || "",
    editForm.aadharNumber?.substring(8, 12) || "",
  ];

  const handleAadharChange = (index, value) => {
    // Only allow digits and max 4 per box
    const cleaned = value.replace(/\D/g, "").substring(0, 4);

    const newParts = [...aadharParts];
    newParts[index] = cleaned;

    const combined = newParts.join("");
    handleEditFormChange("aadharNumber", combined);

    // Auto focus next box
    if (cleaned.length === 4 && index < 2) {
      aadharRefs[index + 1].current?.focus();
    }
  };

  const handleAadharKeyDown = (index, e) => {
    if (e.key === "Backspace" && !aadharParts[index] && index > 0) {
      aadharRefs[index - 1].current?.focus();
    }
  };

  // Use static class options to avoid fetching all students just for filter
  const CLASS_OPTIONS = [
    "LKG",
    "UKG",
    ...Array.from({ length: 12 }, (_, i) => (i + 1).toString()),
  ];

  const [totalStats, setTotalStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    thisYear: 0,
  });
  const { userData } = useAuthStore();

  // Debounced search and filter effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Reset pagination when filters change
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      setLastDocs({});
      fetchStudents(1);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [
    searchTerm,
    classFilter,
    genderFilter,
    statusFilter,
    userData?.madarsaId,
  ]);

  const fetchStats = async () => {
    if (!userData?.madarsaId) return;

    try {
      const { getCount } = await import("@/lib/firestoreService");
      const { Timestamp } = await import("firebase/firestore"); // Import Timestamp correctly

      // 1. Total Students
      const totalPromise = getCount(COLLECTIONS.STUDENTS, [
        where("madarsaId", "==", userData.madarsaId),
      ]);

      // 2. Active Students
      const activePromise = getCount(COLLECTIONS.STUDENTS, [
        where("madarsaId", "==", userData.madarsaId),
        where("status", "==", "active"),
      ]);

      // 3. This Year Students
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const thisYearPromise = getCount(COLLECTIONS.STUDENTS, [
        where("madarsaId", "==", userData.madarsaId),
        where("admissionDate", ">=", startOfYear),
        // Note: Depending on where "admissionDate" is stored as Timestamp or string, this might need adjustment.
        // Assuming Timestamp as per recent fixes.
      ]);

      // 4. Suspended Students
      const suspendedPromise = getCount(COLLECTIONS.STUDENTS, [
        where("madarsaId", "==", userData.madarsaId),
        where("status", "==", "suspended"),
      ]);

      const [total, active, thisYear, suspended] = await Promise.all([
        totalPromise,
        activePromise,
        thisYearPromise,
        suspendedPromise,
      ]);

      setTotalStats({
        total,
        active,
        suspended,
        thisYear,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    if (userData?.madarsaId) {
      fetchStats();
    }
  }, [userData?.madarsaId]);

  const fetchStudents = async (page = 1) => {
    if (!userData?.madarsaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const constraints = [where("madarsaId", "==", userData.madarsaId)];

      // Handle Class Filter (if not 'all')
      if (classFilter !== "all") {
        // Handle case sensitivity and potential string variations
        const filterValues = [classFilter];
        if (classFilter.toUpperCase() !== classFilter)
          filterValues.push(classFilter.toUpperCase());
        if (classFilter.toLowerCase() !== classFilter)
          filterValues.push(classFilter.toLowerCase());

        // Remove duplicates
        const uniqueValues = [...new Set(filterValues)];

        constraints.push(where("classLevel", "in", uniqueValues));
      }

      // Handle Gender Filter
      if (genderFilter !== "all") {
        constraints.push(where("gender", "==", genderFilter));
      }

      // Handle Status Filter
      if (statusFilter !== "all") {
        constraints.push(where("status", "==", statusFilter));
      }

      // Handle Search and Pagination
      let fetchedDocs = [];
      let lastVisible = lastDocs[page - 1] || null;

      const { getPaginatedDocuments, getDocuments } =
        await import("@/lib/firestoreService");

      if (searchTerm) {
        // Client-side search for simplicity as Firestore full-text search is limited
        // Fetch all matching filters first
        const allDocs = await getDocuments(COLLECTIONS.STUDENTS, constraints);
        const filtered = allDocs.filter(
          (student) =>
            student.fullName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.admissionNumber
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()),
        );

        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        fetchedDocs = filtered.slice(start, end);
        setHasMore(end < filtered.length);
        setTotalFilteredCount(filtered.length);
      } else {
        // Server-side pagination
        const { data, lastDoc } = await getPaginatedDocuments(
          COLLECTIONS.STUDENTS,
          ITEMS_PER_PAGE,
          constraints,
          lastVisible,
        );

        // Fetch total count for the current filters (only on first page or filter change)
        if (page === 1) {
          const { getCount } = await import("@/lib/firestoreService");
          const total = await getCount(COLLECTIONS.STUDENTS, constraints);
          setTotalFilteredCount(total);
        }

        fetchedDocs = data;
        setHasMore(data.length === ITEMS_PER_PAGE);
        if (lastDoc) {
          setLastDocs((prev) => ({ ...prev, [page]: lastDoc }));
        }
      }

      setStudents(fetchedDocs);
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1) return;
    setCurrentPage(newPage);
    fetchStudents(newPage);
  };

  const checkStudentEditSetting = async () => {
    try {
      const editEnabled = await isStudentEditEnabled();
      setStudentEditEnabled(editEnabled);
    } catch (error) {
      console.error("Error checking student edit setting:", error);
      setStudentEditEnabled(false); // Default to disabled
    }
  };

  useEffect(() => {
    // Check student edit setting only once on component mount
    checkStudentEditSetting();
  }, []);
  const generateStudentPDF = (student) => {
    // Mask Aadhar number - show only last 4 digits
    const maskedAadhar = student.aadharNumber
      ? `XXXX-XXXX-${student.aadharNumber.slice(-4)}`
      : "Not provided";

    const currentDate = new Date().toLocaleDateString();
    const formattedAdmissionDate = formatDate(student.admissionDate);
    const formattedDateOfBirth = formatDate(student.dateOfBirth);

    // Create PDF content
    const printWindow = window.open("", "_blank");
    const pdfContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Student Details - ${student.fullName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              background: #f8f9fa;
            }
            
            .container {
              max-width: 800px;
              margin: 20px auto;
              background: white;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            
            .header {
              background: linear-gradient(135deg, #0f766e, #134e4a);
              color: white;
              padding: 30px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            
            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              left: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 50%);
              animation: pulse 4s ease-in-out infinite;
            }
            
            @keyframes pulse {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 0.8; }
            }
            
            .logo {
              display: inline-block;
              width: 60px;
              height: 60px;
              background: #fbbf24;
              border-radius: 15px;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 28px;
              font-weight: bold;
              color: #0f766e;
              position: relative;
              z-index: 1;
            }
            
            .header h1 {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 5px;
              position: relative;
              z-index: 1;
            }
            
            .header p {
              font-size: 14px;
              opacity: 0.9;
              position: relative;
              z-index: 1;
            }
            
            .content {
              padding: 40px;
            }
            
            .student-info {
              text-align: center;
              margin-bottom: 40px;
              padding: 20px;
              background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
              border-radius: 10px;
              border-left: 5px solid #0f766e;
            }
            
            .student-name {
              font-size: 24px;
              font-weight: bold;
              color: #0f766e;
              margin-bottom: 5px;
            }
            
            .student-id {
              color: #666;
              font-size: 14px;
            }
            
            .section {
              margin-bottom: 30px;
            }
            
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #0f766e;
              border-bottom: 2px solid #fbbf24;
              padding-bottom: 5px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
            }
            
            .section-title::before {
              content: '';
              width: 8px;
              height: 8px;
              background: #fbbf24;
              border-radius: 50%;
              margin-right: 10px;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
            }
            
            .info-item {
              background: #f8fafc;
              padding: 15px;
              border-radius: 8px;
              border-left: 3px solid #0f766e;
            }
            
            .info-label {
              font-weight: 600;
              color: #374151;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }
            
            .info-value {
              color: #1f2937;
              font-size: 14px;
              font-weight: 500;
            }
            
            .footer {
              background: #f8fafc;
              padding: 20px 40px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            
            .generated-date {
              margin-top: 10px;
              font-style: italic;
            }
            
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 120px;
              color: rgba(15, 118, 110, 0.05);
              font-weight: bold;
              z-index: 0;
              pointer-events: none;
            }
            
            @media print {
              body { background: white; }
              .container { box-shadow: none; margin: 0; }
              .header::before { animation: none; }
            }
          </style>
        </head>
        <body>
          <div class="watermark">DKJU</div>
          <div class="container">
        
            
            <div class="content">
              <div class="student-info">
                <div class="student-name">${student.fullName}</div>
                <div class="student-id">Admission Number: ${
                  student.admissionNumber
                }</div>
              </div>
              
              <div class="section">
                <div class="section-title">Personal Information</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Full Name</div>
                    <div class="info-value">${student.fullName}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Email</div>
                    <div class="info-value">${student.email}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Phone</div>
                    <div class="info-value">${student.phone}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Date of Birth</div>
                    <div class="info-value">${formattedDateOfBirth}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Aadhar Number</div>
                    <div class="info-value">${maskedAadhar}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Address</div>
                    <div class="info-value">${
                      student.address || "Not provided"
                    }</div>
                  </div>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">Academic Information</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Admission Number</div>
                    <div class="info-value">${student.admissionNumber}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Class Level</div>
                    <div class="info-value">${student.classLevel}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Academic Year</div>
                    <div class="info-value">${student.academicYear}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Admission Date</div>
                    <div class="info-value">${formattedAdmissionDate}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Status</div>
                    <div class="info-value">${student.status}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Previous Education</div>
                    <div class="info-value">${
                      student.previousEducation || "Not provided"
                    }</div>
                  </div>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">Family Information</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-label">Guardian's Name</div>
                    <div class="info-value">${
                      student.guardianName || "Not provided"
                    }</div>
                  </div>
                 
                  <div class="info-item">
                    <div class="info-label">Guardian Phone</div>
                    <div class="info-value">${
                      student.guardianPhone || "Not provided"
                    }</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p>© 2025 DKJU. All rights reserved. | Smart Islamic Education Platform</p>
              <div class="generated-date">Generated on: ${currentDate}</div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(pdfContent);
    printWindow.document.close();
  };

  const handleUpdateStudentStatus = async (studentId, newStatus) => {
    try {
      await updateDocument(COLLECTIONS.STUDENTS, studentId, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      setSuccess(`Student status updated to ${newStatus}`);
      fetchStudents();
    } catch (error) {
      console.error("Error updating student status:", error);
      setError("Failed to update student status");
    }
  };

  const handleSuspendClick = (student) => {
    setSelectedStudentForAction(student);
    setSuspensionReason("");
    setSuspendDialogOpen(true);
  };

  const handleSuspendStudent = async () => {
    if (!suspensionReason.trim()) {
      setError("Please provide a reason for suspension");
      return;
    }

    try {
      await updateDocument(COLLECTIONS.STUDENTS, selectedStudentForAction.id, {
        status: "suspended",
        suspensionReason: suspensionReason.trim(),
        suspendedAt: new Date().toISOString(),
        suspendedBy: userData?.uid || "unknown",
        updatedAt: new Date().toISOString(),
      });
      setSuccess(
        `Student ${selectedStudentForAction.fullName} has been suspended`,
      );
      setSuspendDialogOpen(false);
      setSuspensionReason("");
      setSelectedStudentForAction(null);
      fetchStudents();
    } catch (error) {
      console.error("Error suspending student:", error);
      setError("Failed to suspend student");
    }
  };

  const handleActivateClick = (student) => {
    setSelectedStudentForAction(student);
    setActivateDialogOpen(true);
  };

  const handleActivateStudent = async () => {
    try {
      await updateDocument(COLLECTIONS.STUDENTS, selectedStudentForAction.id, {
        status: "active",
        updatedAt: new Date().toISOString(),
        // Keep suspension history but mark as reactivated
        reactivatedAt: new Date().toISOString(),
        reactivatedBy: userData?.uid || "unknown",
      });
      setSuccess(
        `Student ${selectedStudentForAction.fullName} has been activated`,
      );
      setActivateDialogOpen(false);
      setSelectedStudentForAction(null);
      fetchStudents();
    } catch (error) {
      console.error("Error activating student:", error);
      setError("Failed to activate student");
    }
  };

  const handleDeleteClick = (student) => {
    setSelectedStudentForAction(student);
    setDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudentForAction) return;

    setDeleteLoading(true);
    try {
      // Use permanent delete (deleteDocument) as requested
      await deleteDocument(COLLECTIONS.STUDENTS, selectedStudentForAction.id);

      setSuccess(
        `Student ${selectedStudentForAction.fullName} has been permanently deleted`,
      );
      setDeleteDialogOpen(false);
      setSelectedStudentForAction(null);
      fetchStudents();
      fetchStats();
    } catch (error) {
      console.error("Error deleting student:", error);
      setError("Failed to delete student");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);

    // Helper function to format date for input field
    const formatDateForInput = (dateValue) => {
      if (!dateValue) return "";
      try {
        let date;
        if (dateValue && typeof dateValue.toDate === "function") {
          date = dateValue.toDate();
        } else {
          date = new Date(dateValue);
        }

        if (isNaN(date.getTime())) return "";

        // Format as YYYY-MM-DD for input[type="date"]
        return date.toISOString().split("T")[0];
      } catch (error) {
        console.error("Error formatting date for input:", error);
        return "";
      }
    };

    setEditForm({
      fullName: student.fullName || "",
      email: student.email || "",
      phone: student.phone || "",
      dateOfBirth: formatDateForInput(student.dateOfBirth),
      address: student.address || "",
      aadharNumber: student.aadharNumber || "",
      admissionNumber: student.admissionNumber || "",
      classLevel: student.classLevel || "",
      academicYear: student.academicYear || "",
      fatherName: student.fatherName || "",
      motherName: student.motherName || "",
      guardianPhone: student.guardianPhone || "",
      previousEducation: student.previousEducation || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (
        editForm.aadharNumber &&
        editForm.aadharNumber.length > 0 &&
        editForm.aadharNumber.length !== 12
      ) {
        setError("Aadhar number must be exactly 12 digits");
        return;
      }

      await updateDocument(COLLECTIONS.STUDENTS, editingStudent.id, {
        ...editForm,
        updatedAt: new Date().toISOString(),
      });

      setSuccess("Student information updated successfully");
      setIsEditDialogOpen(false);
      setEditingStudent(null);
      setEditForm({});
      fetchStudents();
    } catch (error) {
      console.error("Error updating student:", error);
      setError("Failed to update student information");
    }
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExportCSV = async () => {
    if (!userData?.madarsaId) return;
    try {
      setExporting(true);

      const constraints = [where("madarsaId", "==", userData.madarsaId)];

      // Apply Class Filter (if not 'all')
      if (classFilter !== "all") {
        const filterValues = [classFilter];
        if (classFilter.toUpperCase() !== classFilter)
          filterValues.push(classFilter.toUpperCase());
        if (classFilter.toLowerCase() !== classFilter)
          filterValues.push(classFilter.toLowerCase());
        const uniqueValues = [...new Set(filterValues)];
        constraints.push(where("classLevel", "in", uniqueValues));
      }

      // Apply Gender Filter
      if (genderFilter !== "all") {
        constraints.push(where("gender", "==", genderFilter));
      }

      // Apply Status Filter
      if (statusFilter !== "all") {
        constraints.push(where("status", "==", statusFilter));
      }

      const q = query(
        collection(db, COLLECTIONS.STUDENTS),
        ...constraints,
        orderBy("admissionNumber", "asc"),
      );

      const snapshot = await getDocs(q);
      let filteredStudents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Client-side search filtering
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredStudents = filteredStudents.filter(
          (student) =>
            student.fullName?.toLowerCase().includes(term) ||
            student.email?.toLowerCase().includes(term) ||
            student.admissionNumber?.toLowerCase().includes(term),
        );
      }

      const headers = [
        "Admission Number",
        "Full Name",
        "Gender",
        "Class",
        "Academic Year",
        "Status",
        "Father Name",
        "Mother Name",
        "Guardian Name",
        "Phone",
        "Guardian Phone",
        "Email",
        "Date of Birth",
        "Address",
        "Aadhar Number",
        "Previous Education",
        "Admission Date",
      ];

      const csvContent = [
        headers.join(","),
        ...filteredStudents.map((s) =>
          [
            s.admissionNumber || "",
            `"${(s.fullName || "").replace(/"/g, '""')}"`,
            s.gender || "",
            s.classLevel || "",
            s.academicYear || "",
            s.status || "",
            `"${(s.fatherName || "").replace(/"/g, '""')}"`,
            `"${(s.motherName || "").replace(/"/g, '""')}"`,
            `"${(s.guardianName || "").replace(/"/g, '""')}"`,
            s.phone || "",
            s.guardianPhone || "",
            s.email || "",
            `"${formatDate(s.dateOfBirth)}"`,
            `"${(s.address || "").replace(/"/g, '""')}"`,
            s.aadharNumber ? `"\t${s.aadharNumber}"` : "",
            `"${(s.previousEducation || "").replace(/"/g, '""')}"`,
            `"${formatDate(s.admissionDate)}"`,
          ].join(","),
        ),
      ].join("\n");

      let filterSuffix = "";
      if (classFilter !== "all") filterSuffix += `_Class_${classFilter}`;
      if (genderFilter !== "all") filterSuffix += `_${genderFilter}`;
      if (statusFilter !== "all") filterSuffix += `_${statusFilter}`;
      if (searchTerm)
        filterSuffix += `_Search_${searchTerm.replace(/\s+/g, "_")}`;

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const madarsaName = (userData.madarsaName || "madarsa").replace(
          /\s+/g,
          "_",
        );
        link.setAttribute(
          "download",
          `Students_${madarsaName}${filterSuffix}_${new Date().toISOString().split("T")[0]}.csv`,
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setSuccess("Students exported successfully");
    } catch (error) {
      console.error("Error exporting students:", error);
      setError("Failed to export students");
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Active
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            Inactive
          </Badge>
        );
      case "suspended":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-600"
          >
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const uniqueClasses = [
    ...new Set(students.map((s) => s.classLevel).filter(Boolean)),
  ];

  return (
    <Layout user={user} role={role}>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 sm:p-6 text-white">
          <h1 className="text-xl sm:text-2xl font-bold mb-2">
            Students Management
          </h1>
          <p className="text-blue-100 text-sm sm:text-base">
            View and manage all students in your madarsa
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription className="text-green-700">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Total Students
                  </p>
                  <p className="text-lg sm:text-2xl font-bold">
                    {totalStats.total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Active Students
                  </p>
                  <p className="text-lg sm:text-2xl font-bold">
                    {totalStats.active}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Suspended Students
                  </p>
                  <p className="text-lg sm:text-2xl font-bold">
                    {totalStats.suspended}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    This Year
                  </p>
                  <p className="text-lg sm:text-2xl font-bold">
                    {totalStats.thisYear}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, email, or Admission Number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Classes</option>
                  {CLASS_OPTIONS.map((className) => (
                    <option key={className} value={className}>
                      Class {className}
                    </option>
                  ))}
                </select>

                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>

                <Button
                  onClick={handleExportCSV}
                  disabled={exporting}
                  variant="outline"
                  className="w-full sm:w-auto ml-auto bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? "Exporting..." : "Export CSV"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>Students ({totalFilteredCount})</CardTitle>
            <CardDescription>
              All students enrolled in your madarsa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No students found
              </div>
            ) : (
              <div className="space-y-4">
                {students.map((student) => (
                  <div key={student.id} className="border rounded-lg p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Profile Picture and Student Info */}
                      <div className="flex items-start gap-4 flex-1">
                        {/* Profile Picture */}

                        {/* Student Details */}
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <h3 className="font-semibold text-base sm:text-lg">
                              {student.fullName}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {getStatusBadge(student.status)}
                              <Badge variant="secondary">
                                Class {student.classLevel}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4 flex-shrink-0" />
                                <span className="break-all text-xs sm:text-sm">
                                  Admission Number : {student.admissionNumber}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 flex-shrink-0" />
                                <span className="break-all text-xs sm:text-sm">
                                  {student.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 flex-shrink-0" />
                                <span className="break-all text-xs sm:text-sm">
                                  {student.phone}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span className="text-xs sm:text-sm">
                                Admitted: {formatDate(student.admissionDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
                            <DialogHeader>
                              <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span>Student Details</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => generateStudentPDF(student)}
                                  className="text-blue-600 border-blue-600 w-full sm:w-auto"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download PDF
                                </Button>
                              </DialogTitle>
                              <DialogDescription>
                                Complete student information
                              </DialogDescription>
                            </DialogHeader>
                            <StudentDetails student={student} />
                          </DialogContent>
                        </Dialog>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`w-full sm:w-auto ${
                                  studentEditEnabled
                                    ? "text-blue-600 border-blue-600 hover:bg-blue-50"
                                    : "text-gray-400 border-gray-300 cursor-not-allowed"
                                }`}
                                onClick={() =>
                                  studentEditEnabled &&
                                  handleEditStudent(student)
                                }
                                disabled={!studentEditEnabled}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </TooltipTrigger>
                            {!studentEditEnabled && (
                              <TooltipContent>
                                <p>
                                  Student edit access disabled by Central Admin
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-600 w-full sm:w-auto"
                          onClick={() => generateStudentPDF(student)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>

                        {student.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-yellow-600 border-yellow-600 w-full sm:w-auto"
                            onClick={() => handleSuspendClick(student)}
                          >
                            Suspend
                          </Button>
                        )}

                        {student.status === "suspended" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-600 w-full sm:w-auto"
                              onClick={() => handleActivateClick(student)}
                            >
                              Activate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-600 w-full sm:w-auto"
                              onClick={() => handleDeleteClick(student)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {students.length > 0 && !searchTerm && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="flex items-center gap-2"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage}
                </span>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasMore || loading}
                  className="flex items-center gap-2"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Student Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle>Edit Student Information</DialogTitle>
              <DialogDescription>Update student details</DialogDescription>
            </DialogHeader>

            {editingStudent && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">
                      Personal Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Full Name *
                        </label>
                        <Input
                          value={editForm.fullName}
                          onChange={(e) =>
                            handleEditFormChange("fullName", e.target.value)
                          }
                          placeholder="Full Name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Email *
                        </label>
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            handleEditFormChange("email", e.target.value)
                          }
                          placeholder="Email"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Phone *
                        </label>
                        <Input
                          value={editForm.phone}
                          onChange={(e) =>
                            handleEditFormChange("phone", e.target.value)
                          }
                          placeholder="Phone Number"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Date of Birth
                        </label>
                        <Input
                          type="date"
                          value={editForm.dateOfBirth}
                          onChange={(e) =>
                            handleEditFormChange("dateOfBirth", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Address
                        </label>
                        <Input
                          value={editForm.address}
                          onChange={(e) =>
                            handleEditFormChange("address", e.target.value)
                          }
                          placeholder="Address"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">
                          Aadhar Number (12 Digits)
                        </label>
                        <div className="flex items-center gap-2">
                          {[0, 1, 2].map((idx) => (
                            <div key={idx} className="flex-1">
                              <Input
                                ref={aadharRefs[idx]}
                                value={aadharParts[idx]}
                                onChange={(e) =>
                                  handleAadharChange(idx, e.target.value)
                                }
                                onKeyDown={(e) => handleAadharKeyDown(idx, e)}
                                placeholder="0000"
                                className="text-center tracking-widest font-mono"
                                maxLength={4}
                              />
                            </div>
                          ))}
                        </div>
                        {editForm.aadharNumber &&
                          editForm.aadharNumber.length > 0 &&
                          editForm.aadharNumber.length < 12 && (
                            <p className="text-[10px] text-red-500 mt-1">
                              Aadhar must be exactly 12 digits (currently{" "}
                              {editForm.aadharNumber.length})
                            </p>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">
                      Academic Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Admission Number *
                        </label>
                        <Input
                          value={editForm.admissionNumber}
                          onChange={(e) =>
                            handleEditFormChange(
                              "admissionNumber",
                              e.target.value,
                            )
                          }
                          placeholder="Admission Number"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Class Level *
                        </label>
                        <Input
                          value={editForm.classLevel}
                          onChange={(e) =>
                            handleEditFormChange("classLevel", e.target.value)
                          }
                          placeholder="Class Level"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Academic Year *
                        </label>
                        <Input
                          value={editForm.academicYear}
                          onChange={(e) =>
                            handleEditFormChange("academicYear", e.target.value)
                          }
                          placeholder="Academic Year"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Previous Education
                        </label>
                        <Input
                          value={editForm.previousEducation}
                          onChange={(e) =>
                            handleEditFormChange(
                              "previousEducation",
                              e.target.value,
                            )
                          }
                          placeholder="Previous Education"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Family Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">
                    Family Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Father&apos;s Name
                      </label>
                      <Input
                        value={editForm.fatherName}
                        onChange={(e) =>
                          handleEditFormChange("fatherName", e.target.value)
                        }
                        placeholder="Father's Name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Mother&apos;s Name
                      </label>
                      <Input
                        value={editForm.motherName}
                        onChange={(e) =>
                          handleEditFormChange("motherName", e.target.value)
                        }
                        placeholder="Mother's Name"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-gray-600">
                        Guardian Phone
                      </label>
                      <Input
                        value={editForm.guardianPhone}
                        onChange={(e) =>
                          handleEditFormChange("guardianPhone", e.target.value)
                        }
                        placeholder="Guardian Phone"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Suspend Student Dialog */}
        <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle>Suspend Student</DialogTitle>
              <DialogDescription>
                You are about to suspend {selectedStudentForAction?.fullName}.
                Please provide a reason for this action.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
              <DialogDescription>
                Review the suspension details before reactivating{" "}
                {selectedStudentForAction?.fullName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-yellow-800 mb-2">
                  Suspension Details
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Reason:</span>
                    <p className="text-gray-600 mt-1">
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
                        ? formatDate(selectedStudentForAction.suspendedAt)
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

        {/* Delete Student Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Student</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-gray-900">
                  {selectedStudentForAction?.fullName}
                </span>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setSelectedStudentForAction(null);
                }}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteStudent}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

// Component to display full student details
function StudentDetails({ student }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Profile Picture at Top */}
      <div className="flex justify-center">
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border-4 border-purple-200">
          {student.profilePicture ? (
            <Image
              src={student.profilePicture}
              alt={student.fullName || "Student"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <User className="h-16 w-16 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">
            Personal Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">
                Full Name
              </label>
              <p className="text-sm break-words">{student.fullName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-sm break-all">{student.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Phone</label>
              <p className="text-sm break-all">{student.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Date of Birth
              </label>
              <p className="text-sm">{formatDate(student.dateOfBirth)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Address
              </label>
              <p className="text-sm break-words">
                {student.address || "Not provided"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Aadhar Number
              </label>
              <p className="text-sm break-all">
                {student.aadharNumber || "Not provided"}
              </p>
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">
            Academic Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">
                Admission Number
              </label>
              <p className="text-sm break-all">{student.admissionNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Class Level
              </label>
              <p className="text-sm">{student.classLevel}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Academic Year
              </label>
              <p className="text-sm">{student.academicYear}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Admission Date
              </label>
              <p className="text-sm">{formatDate(student.admissionDate)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                Status
              </label>
              <p className="text-sm">{student.status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Family Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">
          Family Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">
              Guardian&apos;s Name
            </label>
            <p className="text-sm break-words">
              {student.guardianName || "Not provided"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">
              Guardian Phone
            </label>
            <p className="text-sm break-all">
              {student.guardianPhone || "Not provided"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">
              Previous Education
            </label>
            <p className="text-sm break-words">
              {student.previousEducation || "Not provided"}
            </p>
          </div>
        </div>
      </div>

      {/* Suspension History */}
      {(student.status === "suspended" ||
        student.suspensionReason ||
        student.reactivatedAt) && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">
            Suspension History
          </h3>
          <div className="space-y-4">
            {/* Current/Last Suspension Details */}
            {student.suspensionReason && (
              <div
                className={`p-4 rounded-lg border-2 ${
                  student.status === "suspended"
                    ? "bg-yellow-50 border-yellow-300"
                    : "bg-gray-50 border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-sm text-gray-800">
                    {student.status === "suspended"
                      ? "Currently Suspended"
                      : "Previous Suspension"}
                  </h4>
                  <Badge
                    variant={
                      student.status === "suspended"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {student.status === "suspended"
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
                      {student.suspensionReason}
                    </p>
                  </div>

                  {student.suspendedAt && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Suspended On:
                        </label>
                        <p className="text-sm text-gray-800">
                          {formatDate(student.suspendedAt)}
                        </p>
                      </div>

                      {student.suspendedBy && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            Suspended By:
                          </label>
                          <p className="text-sm text-gray-800">
                            {student.suspendedBy}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {student.reactivatedAt && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-300">
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Reactivated On:
                        </label>
                        <p className="text-sm text-green-700 font-medium">
                          {formatDate(student.reactivatedAt)}
                        </p>
                      </div>

                      {student.reactivatedBy && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">
                            Reactivated By:
                          </label>
                          <p className="text-sm text-green-700 font-medium">
                            {student.reactivatedBy}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show message if suspended but no reason found */}
            {student.status === "suspended" && !student.suspensionReason && (
              <div className="p-4 rounded-lg bg-yellow-50 border-2 border-yellow-300">
                <p className="text-sm text-yellow-800">
                  This student is currently suspended. No suspension reason is
                  recorded.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
