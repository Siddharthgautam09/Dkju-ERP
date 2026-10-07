"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FileText,
  Eye,
  Calendar,
  Building,
  User,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  UserCheck,
  Users,
  X,
  Check,
  Edit,
  History,
} from "lucide-react";
import useAuthStore from "@/lib/authStore";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminReportViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userData } = useAuthStore();
  const [report, setReport] = useState(null);
  const [inspector, setInspector] = useState(null);
  const [madarsa, setMadarsa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewModal, setPreviewModal] = useState({ open: false, file: null });
  const [actionModal, setActionModal] = useState({ open: false, action: "" });
  const [actionRemarks, setActionRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const reportId = params.reportId;

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        
        const reportDoc = await getDoc(doc(db, "inspections", reportId));
        
        if (!reportDoc.exists()) {
          router.push("/dashboard/admin/reports");
          return;
        }

        const reportData = {
          id: reportDoc.id,
          ...reportDoc.data(),
        };
        setReport(reportData);

        // Fetch inspector details
        if (reportData.inspectorId) {
          const inspectorDoc = await getDoc(doc(db, "users", reportData.inspectorId));
          if (inspectorDoc.exists()) {
            setInspector(inspectorDoc.data());
          }
        }

        // Fetch madarsa details
        if (reportData.selectedMadarsaId) {
          const madarsaQuery = query(
            collection(db, "madarsas"),
            where("madarsaId", "==", reportData.selectedMadarsaId)
          );
          const madarsaSnapshot = await getDocs(madarsaQuery);
          if (!madarsaSnapshot.empty) {
            setMadarsa(madarsaSnapshot.docs[0].data());
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching report:", error);
        router.push("/dashboard/admin/reports");
      }
    };

    if (user && userData?.role === "central_admin" && reportId) {
      fetchReportData();
    }
  }, [user, userData, reportId, router]);

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
        return <CheckCircle className="h-4 w-4" />;
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

  const handleAction = (action) => {
    setActionModal({ open: true, action });
    setActionRemarks("");
  };

  const submitAction = async () => {
    if (!actionModal.action) return;
    
    if ((actionModal.action === "rejected" || actionModal.action === "approved") && !actionRemarks.trim()) {
      toast.error("Please provide remarks for this action");
      return;
    }

    try {
      setActionLoading(true);

      const updateData = {
        status: actionModal.action,
        reviewedAt: serverTimestamp(),
        reviewedBy: userData?.name || user.displayName,
        adminRemarks: actionRemarks.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "inspections", reportId), updateData);

      // Update local state
      setReport(prev => ({ ...prev, ...updateData }));

      toast.success(`Report ${actionModal.action} successfully`);
      setActionModal({ open: false, action: "" });
      setActionRemarks("");

    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update report");
    } finally {
      setActionLoading(false);
    }
  };

  const previewFile = (file) => {
    setPreviewModal({ open: true, file });
  };

  const downloadFile = (file) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderFileSection = (files, title) => {
    if (!files || files.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>No files uploaded</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {file.type.startsWith('image/') ? (
                  <div className="w-12 h-12 relative">
                    <Image
                      src={file.url}
                      alt={file.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center">
                    <FileText className="h-6 w-6 text-red-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {file.uploadedAt && (
                  <p className="text-xs text-gray-400">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => previewFile(file)}
                className="flex-1"
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile(file)}
                className="flex-1"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading report...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">Report not found</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/admin/reports">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col  gap-4">
          <Button variant="outline" className="w-32" size="sm" asChild>
            <Link href="/dashboard/admin/reports">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {report.title || "Inspection Report"}
            </h1>
            <p className="text-gray-600 mt-1">
              Report ID: {report.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(report.status)}>
              {getStatusIcon(report.status)}
              <span className="ml-1 capitalize">{(report.status || "draft").replace('_', ' ')}</span>
            </Badge>
            
            {/* Action Buttons */}
            {(report.status === "submitted" || report.status === "reviewed") && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAction("approved")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction("rejected")}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("reviewed")}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Mark Reviewed
                </Button>
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <Label className="text-sm text-gray-500">Madarsa</Label>
                <p className="font-medium">{madarsa?.name || report.madarsaName}</p>
                <p className="text-sm text-gray-600">{report.selectedMadarsaId}</p>
                {madarsa?.location && (
                  <p className="text-sm text-gray-500">{madarsa.location}</p>
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-500">Inspector</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium">{inspector?.name || report.inspectorName}</p>
                    {inspector?.email && (
                      <p className="text-sm text-gray-600">{inspector.email}</p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Inspection Date</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="font-medium">
                    {report.inspectionDate ? new Date(report.inspectionDate).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Type</Label>
                <p className="font-medium capitalize">
                  {(report.inspectionType || "routine").replace('_', ' ')}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
              <div>
                <Label className="text-sm text-gray-500">Created</Label>
                <p className="font-medium">
                  {report.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Last Updated</Label>
                <p className="font-medium">
                  {report.updatedAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                </p>
              </div>
              {report.submittedAt && (
                <div>
                  <Label className="text-sm text-gray-500">Submitted</Label>
                  <p className="font-medium">
                    {report.submittedAt?.toDate?.()?.toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

  {report.inspectorSelfieUrl && (
              <div className="mt-6 pt-6 border-t">
                <Label className="text-sm text-gray-500 mb-3 block">
                  Inspector Verification
                </Label>
                <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="w-16 h-16 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={report.inspectorSelfieUrl}
                      alt="Inspector Verification Selfie"
                      className="w-full h-full object-cover rounded-lg border-2 border-teal-300"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-teal-600" />
                      <p className="font-medium text-teal-800">
                        Inspector Identity Verified
                      </p>
                    </div>
                    <p className="text-sm text-teal-600 mt-1">
                      Selfie captured during inspection submission
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(report.inspectorSelfieUrl, "_blank")
                    }
                    className="text-teal-600 border-teal-300 hover:bg-teal-50"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Full
                  </Button>
                </div>
              </div>
            )}
        
        {[
          { 
            step: "madarsa", 
            title: "Madarsa Form", 
            icon: Building,
            files: report.madarsaFormFiles,
            remarks: report.madarsaFormRemarks
          },
          { 
            step: "management", 
            title: "Management Form", 
            icon: UserCheck,
            files: report.managementFormFiles,
            remarks: report.managementFormRemarks
          },
          { 
            step: "sadar", 
            title: "Sadar Info Form", 
            icon: Users,
            files: report.sadarFormFiles,
            remarks: report.sadarFormRemarks
          },
        ].map(({ step, title, icon: Icon, files, remarks }) => (
          <Card key={step}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>
                Documents and observations for {title.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Files Section */}
              <div>
                <Label className="text-base font-semibold mb-4 block">
                  Uploaded Documents ({files?.length || 0})
                </Label>
                {renderFileSection(files, title)}
              </div>

              {/* Remarks Section */}
              <div>
                <Label className="text-base font-semibold mb-2 block">
                  Inspector Remarks & Observations
                </Label>
                {remarks ? (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {remarks}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 border border-dashed rounded-lg">
                    No remarks added for this section
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Administrative Actions History */}
        {(report.adminRemarks || report.reviewedAt) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Administrative Review History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.reviewedAt && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Reviewed On</Label>
                    <p className="font-medium">
                      {report.reviewedAt?.toDate?.()?.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Reviewed By</Label>
                    <p className="font-medium">{report.reviewedBy || "N/A"}</p>
                  </div>
                </div>
              )}

              {report.adminRemarks && (
                <div>
                  <Label className="text-sm text-gray-500">Admin Remarks</Label>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mt-2">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {report.adminRemarks}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Modal */}
        <Dialog open={actionModal.open} onOpenChange={(open) => setActionModal({ open, action: "" })}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {actionModal.action === "approved" && "Approve Report"}
                {actionModal.action === "rejected" && "Reject Report"}
                {actionModal.action === "reviewed" && "Mark as Reviewed"}
              </DialogTitle>
              <DialogDescription>
                Report: {report.title || `Inspection Report - ${report.selectedMadarsaId}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="actionRemarks">
                  {actionModal.action === "rejected" ? "Rejection Reason *" : "Remarks"}
                </Label>
                <Textarea
                  id="actionRemarks"
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder={
                    actionModal.action === "approved" 
                      ? "Add any approval comments (optional)"
                      : actionModal.action === "rejected"
                      ? "Please provide reason for rejection"
                      : "Add review comments"
                  }
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setActionModal({ open: false, action: "" })}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={submitAction}
                  disabled={actionLoading}
                  variant={actionModal.action === "rejected" ? "destructive" : "default"}
                >
                  {actionLoading ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* File Preview Modal */}
        <Dialog open={previewModal.open} onOpenChange={(open) => setPreviewModal({ open, file: null })}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle>File Preview</DialogTitle>
              <DialogDescription>
                {previewModal.file?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              {previewModal.file?.type.startsWith('image/') ? (
                <div className="relative max-w-full max-h-[70vh]">
                  <Image
                    src={previewModal.file?.url}
                    alt={previewModal.file?.name}
                    width={800}
                    height={600}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4 py-8">
                  <FileText className="h-16 w-16 text-red-600" />
                  <p>PDF files cannot be previewed here</p>
                  <Button asChild>
                    <a href={previewModal.file?.url} target="_blank" rel="noopener noreferrer">
                      Open in New Tab
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
