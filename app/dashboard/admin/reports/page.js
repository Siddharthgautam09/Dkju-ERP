"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Search,
  Eye,
  MoreHorizontal,
  Download,
  Filter,
  Calendar,
  Building,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  FileCheck,
  X,
  Check,
  Users,
  UserCheck,
  Edit,
  Trash2,
} from "lucide-react";
import useAuthStore from "@/lib/authStore";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminReportsPage() {
  const { user, userData } = useAuthStore();
  const [reports, setReports] = useState([]);
  const [madarsas, setMadarsas] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inspectorFilter, setInspectorFilter] = useState("all");
  const [madarsaFilter, setMadarsaFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState("");
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all inspection reports
        const reportsQuery = query(
          collection(db, "inspections"),
          orderBy("createdAt", "desc")
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        const reportsData = reportsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReports(reportsData);

        // Fetch all madarsas
        const madarsasQuery = query(collection(db, "madarsas"));
        const madarsasSnapshot = await getDocs(madarsasQuery);
        const madarsasData = madarsasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMadarsas(madarsasData);

        // Fetch all inspectors
        const inspectorsQuery = query(
          collection(db, "users"),
          where("role", "==", "inspector")
        );
        const inspectorsSnapshot = await getDocs(inspectorsQuery);
        const inspectorsData = inspectorsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setInspectors(inspectorsData);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load reports data");
      } finally {
        setLoading(false);
      }
    };

    if (user && userData?.role === "central_admin") {
      fetchData();
    } else if (user && userData) {
      // If user is logged in but not central admin, still stop loading
      setLoading(false);
    }
  }, [user, userData]);

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.madarsaName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.selectedMadarsaId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.inspectorName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesInspector = inspectorFilter === "all" || report.inspectorId === inspectorFilter;
    const matchesMadarsa = madarsaFilter === "all" || report.selectedMadarsaId === madarsaFilter;

    let matchesDate = true;
    if (dateFilter !== "all") {
      const reportDate = new Date(report.createdAt?.toDate?.() || report.createdAt);
      const today = new Date();
      const daysDiff = Math.floor((today - reportDate) / (1000 * 60 * 60 * 24));

      switch (dateFilter) {
        case "today":
          matchesDate = daysDiff === 0;
          break;
        case "week":
          matchesDate = daysDiff <= 7;
          break;
        case "month":
          matchesDate = daysDiff <= 30;
          break;
        default:
          matchesDate = true;
      }
    }

    return matchesSearch && matchesStatus && matchesInspector && matchesMadarsa && matchesDate;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "submitted":
        return "bg-green-100 text-green-800";
      case "reviewed":
        return "bg-purple-100 text-purple-800";
      case "approved":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "draft":
        return <FileText className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "submitted":
        return <FileCheck className="h-4 w-4" />;
      case "reviewed":
        return <Eye className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleReviewAction = async (report, action) => {
    setSelectedReport(report);
    setReviewAction(action);
    setReviewRemarks("");
    setReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedReport || !reviewAction) return;
    
    if ((reviewAction === "rejected" || reviewAction === "approved") && !reviewRemarks.trim()) {
      toast.error("Please provide remarks for this action");
      return;
    }

    try {
      setActionLoading(true);

      const updateData = {
        status: reviewAction,
        reviewedAt: serverTimestamp(),
        reviewedBy: userData?.name || user.displayName,
        adminRemarks: reviewRemarks.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "inspections", selectedReport.id), updateData);

      // Update local state
      setReports(prev => prev.map(report => 
        report.id === selectedReport.id 
          ? { ...report, ...updateData }
          : report
      ));

      toast.success(`Report ${reviewAction} successfully`);
      setReviewModal(false);
      setSelectedReport(null);
      setReviewAction("");
      setReviewRemarks("");

    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReport = (report) => {
    setReportToDelete(report);
    setDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      setDeleteLoading(true);

      // Delete the report from Firestore
      await deleteDoc(doc(db, "inspections", reportToDelete.id));

      // Update local state to remove the deleted report
      setReports(prev => prev.filter(report => report.id !== reportToDelete.id));

      toast.success("Report deleted successfully");
      setDeleteModal(false);
      setReportToDelete(null);

    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModal(false);
    setReportToDelete(null);
  };

  const exportReports = () => {
    // Create CSV data
    const headers = [
      "Report ID",
      "Title", 
      "Madrasa",
      "Inspector",
      "Status",
      "Created Date",
      "Inspection Date",
      "Type"
    ];

    const csvData = filteredReports.map(report => [
      report.id,
      report.title || `Inspection Report - ${report.selectedMadarsaId}`,
      report.madarsaName || report.selectedMadarsaId,
      report.inspectorName,
      report.status || "draft",
      report.createdAt?.toDate?.()?.toLocaleDateString() || "N/A",
      report.inspectionDate ? new Date(report.inspectionDate).toLocaleDateString() : "N/A",
      report.inspectionType || "routine"
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inspection-reports-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getStatsData = () => {
    const total = reports.length;
    const draft = reports.filter(r => r.status === "draft" || !r.status).length;
    const submitted = reports.filter(r => r.status === "submitted").length;
    const reviewed = reports.filter(r => r.status === "reviewed").length;
    const approved = reports.filter(r => r.status === "approved").length;
    const rejected = reports.filter(r => r.status === "rejected").length;

    return { total, draft, submitted, reviewed, approved, rejected };
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading reports...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Check if user is authorized
  if (!user || userData?.role !== "central_admin") {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don&apos;t have permission to view this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const stats = getStatsData();

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Inspection Reports
            </h1>
            <p className="text-gray-600">
              Manage and review all inspection reports from inspectors
            </p>
          </div>
          <Button onClick={exportReports} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Draft</p>
                <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Submitted</p>
                <p className="text-2xl font-bold text-green-600">{stats.submitted}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Reviewed</p>
                <p className="text-2xl font-bold text-purple-600">{stats.reviewed}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={inspectorFilter} onValueChange={setInspectorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by inspector" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Inspectors (Thaftheesh)</SelectItem>
                  {inspectors.map((inspector) => (
                    <SelectItem key={inspector.id} value={inspector.id}>
                      {inspector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={madarsaFilter} onValueChange={setMadarsaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by madarsa" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Madarsas</SelectItem>
                  {madarsas.map((madarsa) => (
                    <SelectItem key={madarsa.madarsaId} value={madarsa.madarsaId}>
                      {madarsa.name} ({madarsa.madarsaId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Reports ({filteredReports.length})
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {reports.length === 0
                    ? "No inspection reports found"
                    : "No reports match your search criteria"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Details</TableHead>
                      <TableHead>Madrasa</TableHead>
                      <TableHead>Inspector</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dates</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => {
                      const madarsa = madarsas.find(
                        (m) => m.madarsaId === report.selectedMadarsaId
                      );
                      const inspector = inspectors.find(
                        (i) => i.id === report.inspectorId
                      );
                      
                      return (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {report.title || `Inspection Report - ${report.selectedMadarsaId}`}
                              </p>
                              <p className="text-sm text-gray-500">
                                ID: {report.id.substring(0, 8)}...
                              </p>
                              <p className="text-sm text-gray-500">
                                Type: {report.inspectionType || "routine"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="font-medium">
                                  {madarsa?.name || report.madarsaName}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {report.selectedMadarsaId}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="font-medium">
                                  {inspector?.name || report.inspectorName}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {inspector?.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(report.status)}>
                              {getStatusIcon(report.status)}
                              <span className="ml-1 capitalize">
                                {(report.status || "draft").replace('_', ' ')}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-600">Created:</span>
                                <span>
                                  {report.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                                </span>
                              </div>
                              {report.inspectionDate && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-3 w-3 text-gray-400" />
                                  <span className="text-gray-600">Inspection:</span>
                                  <span>
                                    {new Date(report.inspectionDate).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                asChild
                              >
                                <Link href={`/dashboard/admin/reports/${report.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              
                           
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Modal */}
        <Dialog open={reviewModal} onOpenChange={setReviewModal}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {reviewAction === "approved" && "Approve Report"}
                {reviewAction === "rejected" && "Reject Report"}
                {reviewAction === "reviewed" && "Mark as Reviewed"}
              </DialogTitle>
              <DialogDescription>
                {selectedReport && (
                  <>
                    Report: {selectedReport.title || `Inspection Report - ${selectedReport.selectedMadarsaId}`}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="remarks">
                  {reviewAction === "rejected" ? "Rejection Reason *" : "Remarks"}
                </Label>
                <Textarea
                  id="remarks"
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder={
                    reviewAction === "approved" 
                      ? "Add any approval comments (optional)"
                      : reviewAction === "rejected"
                      ? "Please provide reason for rejection"
                      : "Add review comments"
                  }
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setReviewModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={submitReview}
                  disabled={actionLoading}
                  variant={reviewAction === "rejected" ? "destructive" : "default"}
                >
                  {actionLoading ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
          <DialogContent className="sm:max-w-[400px] bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Delete Report
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this inspection report? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {reportToDelete && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm">
                    {reportToDelete.title || `Inspection Report - ${reportToDelete.selectedMadarsaId}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    Madrasa: {reportToDelete.madarsaName || reportToDelete.selectedMadarsaId}
                  </p>
                  <p className="text-sm text-gray-600">
                    Inspector: {reportToDelete.inspectorName}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={cancelDelete}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting..." : "Delete Report"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
