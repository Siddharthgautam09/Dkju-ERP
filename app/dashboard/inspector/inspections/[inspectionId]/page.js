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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import useAuthStore from "@/lib/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

export default function InspectionViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewModal, setPreviewModal] = useState({ open: false, file: null });

  const inspectionId = params.inspectionId;

  useEffect(() => {
    const fetchInspection = async () => {
      try {
        setLoading(true);

        const inspectionDoc = await getDoc(
          doc(db, "inspections", inspectionId)
        );

        if (!inspectionDoc.exists()) {
          router.push("/dashboard/inspector/inspections");
          return;
        }

        const inspectionData = {
          id: inspectionDoc.id,
          ...inspectionDoc.data(),
        };

        // Check if user has access to this inspection
        if (inspectionData.inspectorId !== user.uid) {
          router.push("/dashboard/inspector/inspections");
          return;
        }

        setInspection(inspectionData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching inspection:", error);
        router.push("/dashboard/inspector/inspections");
      }
    };

    if (user && inspectionId) {
      fetchInspection();
    }
  }, [user, inspectionId, router]);

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

  const previewFile = (file) => {
    setPreviewModal({ open: true, file });
  };

  const downloadFile = (file) => {
    const link = document.createElement("a");
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
                {file.type.startsWith("image/") ? (
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
            <p className="text-gray-500">Loading inspection...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!inspection) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">Inspection not found</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/inspector/inspections">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inspections
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
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/inspector/inspections">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {inspection.title || "Inspection Report"}
            </h1>
            <p className="text-gray-600 mt-1">Inspection ID: {inspection.id}</p>
          </div>
          <Badge className={getStatusColor(inspection.status)}>
            {getStatusIcon(inspection.status)}
            <span className="ml-1 capitalize">
              {inspection.status?.replace("_", " ")}
            </span>
          </Badge>
        </div>

        {/* Basic Information */}
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
                <p className="font-medium">{inspection.madarsaName}</p>
                <p className="text-sm text-gray-600">
                  {inspection.selectedMadarsaId}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Inspection Date</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="font-medium">
                    {new Date(inspection.inspectionDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Type</Label>
                <p className="font-medium capitalize">
                  {inspection.inspectionType?.replace("_", " ")}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Inspector</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <p className="font-medium">{inspection.inspectorName}</p>
                </div>
              </div>
            </div>

            {/* Inspector Selfie Section */}
            {inspection.inspectorSelfieUrl && (
              <div className="mt-6 pt-6 border-t">
                <Label className="text-sm text-gray-500 mb-3 block">
                  Inspector Verification
                </Label>
                <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="w-16 h-16 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={inspection.inspectorSelfieUrl}
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
                      window.open(inspection.inspectorSelfieUrl, "_blank")
                    }
                    className="text-teal-600 border-teal-300 hover:bg-teal-50"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Full
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
              <div>
                <Label className="text-sm text-gray-500">Created</Label>
                <p className="font-medium">
                  {inspection.createdAt?.toDate?.()?.toLocaleDateString() ||
                    "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Last Updated</Label>
                <p className="font-medium">
                  {inspection.updatedAt?.toDate?.()?.toLocaleDateString() ||
                    "N/A"}
                </p>
              </div>
              {inspection.submittedAt && (
                <div>
                  <Label className="text-sm text-gray-500">Submitted</Label>
                  <p className="font-medium">
                    {inspection.submittedAt?.toDate?.()?.toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Forms Sections */}
        {[
          {
            step: "madarsa",
            title: "Madarsa Form",
            icon: Building,
            files: inspection.madarsaFormFiles,
            remarks: inspection.madarsaFormRemarks,
          },
          {
            step: "management",
            title: "Management Form",
            icon: UserCheck,
            files: inspection.managementFormFiles,
            remarks: inspection.managementFormRemarks,
          },
          {
            step: "sadar",
            title: "Sadar Info Form",
            icon: Users,
            files: inspection.sadarFormFiles,
            remarks: inspection.sadarFormRemarks,
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
                  Remarks & Observations
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

        {/* Admin Actions (if reviewed/approved/rejected) */}
        {(inspection.adminRemarks || inspection.reviewedAt) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Administrative Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {inspection.reviewedAt && (
                <div>
                  <Label className="text-sm text-gray-500">Reviewed On</Label>
                  <p className="font-medium">
                    {inspection.reviewedAt?.toDate?.()?.toLocaleDateString()}
                  </p>
                </div>
              )}

              {inspection.reviewedBy && (
                <div>
                  <Label className="text-sm text-gray-500">Reviewed By</Label>
                  <p className="font-medium">{inspection.reviewedBy}</p>
                </div>
              )}

              {inspection.adminRemarks && (
                <div>
                  <Label className="text-sm text-gray-500">Admin Remarks</Label>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {inspection.adminRemarks}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {inspection.status === "draft" && (
            <Button asChild>
              <Link
                href={`/dashboard/inspector/inspections/create?draft=${inspection.id}`}
              >
                Continue Editing
              </Link>
            </Button>
          )}

          <Button variant="outline" asChild>
            <Link href="/dashboard/inspector/inspections">
              Back to Inspections
            </Link>
          </Button>
        </div>

        {/* File Preview Modal */}
        <Dialog
          open={previewModal.open}
          onOpenChange={(open) => setPreviewModal({ open, file: null })}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>File Preview</DialogTitle>
              <DialogDescription>{previewModal.file?.name}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              {previewModal.file?.type.startsWith("image/") ? (
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
                    <a
                      href={previewModal.file?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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
