"use client";

import React from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import InspectorLayout from "@/components/InspectorLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Upload,
  X,
  FileText,
  Save,
  Send,
  Eye,
  Building,
  Users,
  UserCheck,
  ClipboardList,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import useAuthStore from "@/lib/authStore";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import PhotoCapture from "@/components/PhotoCapture";

const STEPS = [
  { id: 1, title: "Basic Information", icon: ClipboardList },
  { id: 2, title: "Madrasa Form", icon: Building },
  { id: 3, title: "Management Form", icon: UserCheck },
  { id: 4, title: "Sadar Info/Form", icon: Users },
  { id: 5, title: "Review & Submit", icon: CheckCircle },
];

export default function CreateInspectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [madarsas, setMadarsas] = useState([]);

  // Form data for all steps
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    selectedMadarsaId: "",
    madarsaName: "",
    inspectionDate: new Date().toISOString().split("T")[0],
    inspectionType: "routine",
    title: "",

    // Step 2: Madarsa Form
    madarsaFormFiles: [],
    madarsaFormRemarks: "",

    // Step 3: Management Form
    managementFormFiles: [],
    managementFormRemarks: "",

    // Step 4: Sadar Info Form
    sadarFormFiles: [],
    sadarFormRemarks: "",
  });

  const [uploadingFiles, setUploadingFiles] = useState({});
  const [previewModal, setPreviewModal] = useState({ open: false, file: null });
  const [draftId, setDraftId] = useState(null);
  const [inspectorSelfieUrl, setInspectorSelfieUrl] = useState(null);

  // Load draft if resuming
  useEffect(() => {
    const loadDraft = async () => {
      const draftIdParam = searchParams.get("draft");
      if (draftIdParam) {
        try {
          const draftDoc = await getDoc(doc(db, "inspections", draftIdParam));
          if (draftDoc.exists()) {
            const draftData = draftDoc.data();
            setFormData((prev) => ({ ...prev, ...draftData }));
            setCurrentStep(draftData.currentStep || 1);
            setDraftId(draftIdParam);
          }
        } catch (error) {
          console.error("Error loading draft:", error);
          toast.error("Failed to load draft");
        }
      }
    };

    loadDraft();
  }, [searchParams]);

  // Load madarsas
  useEffect(() => {
    const fetchMadarsas = async () => {
      try {
        if (
          !userData?.assignedMadarsas ||
          userData.assignedMadarsas.length === 0
        )
          return;

        const madarsasQuery = query(
          collection(db, "madarsas"),
          where("madarsaId", "in", userData.assignedMadarsas),
        );
        const madarsasSnapshot = await getDocs(madarsasQuery);
        const madarsasData = madarsasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMadarsas(madarsasData);
      } catch (error) {
        console.error("Error fetching madarsas:", error);
      }
    };

    if (userData) {
      fetchMadarsas();
    }
  }, [userData]);

  const updateFormData = useCallback((updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleFileUpload = async (files, step) => {
    const fileArray = Array.from(files);
    const stepKey = `${step}FormFiles`;

    setUploadingFiles((prev) => ({ ...prev, [step]: true }));

    try {
      const uploadedFiles = [];

      for (const file of fileArray) {
        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name}: Only JPG, PNG, and PDF files are allowed`);
          continue;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: File size must be less than 10MB`);
          continue;
        }

        // Upload to Firebase Storage
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = `inspections/${step}-forms/${timestamp}_${sanitizedName}`;

        const storageRef = ref(storage, fileName);
        const snapshot = await uploadBytes(storageRef, file, {
          contentDisposition: "attachment",
        });
        const downloadURL = await getDownloadURL(snapshot.ref);

        uploadedFiles.push({
          name: file.name,
          url: downloadURL,
          type: file.type,
          size: file.size,
          uploadedAt: new Date(),
          storagePath: snapshot.ref.fullPath,
        });
      }

      if (uploadedFiles.length > 0) {
        updateFormData({
          [stepKey]: [...formData[stepKey], ...uploadedFiles],
        });
        toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [step]: false }));
    }
  };

  const removeFile = (step, index) => {
    const stepKey = `${step}FormFiles`;
    const updatedFiles = formData[stepKey].filter((_, i) => i !== index);
    updateFormData({ [stepKey]: updatedFiles });
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const draftData = {
        ...formData,
        currentStep,
        status: "draft",
        inspectorId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (draftId) {
        await updateDoc(doc(db, "inspections", draftId), draftData);
        toast.success("Draft updated successfully");
      } else {
        draftData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, "inspections"), draftData);
        setDraftId(docRef.id);
        toast.success("Draft saved successfully");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return (
          formData.selectedMadarsaId &&
          formData.inspectionDate &&
          formData.title
        );
      case 2:
      case 3:
      case 4:
        return true; // Optional steps
      case 5:
        return inspectorSelfieUrl; // Require inspector selfie before submission
      default:
        return false;
    }
  };

  const submitInspection = async () => {
    // Validate inspector selfie before submission
    if (!inspectorSelfieUrl) {
      toast.error("Inspector selfie is required before submission");
      return;
    }

    setSubmitting(true);
    try {
      const inspectionData = {
        ...formData,
        status: "submitted",
        inspectorId: user.uid,
        inspectorName: userData.name || userData.fullName,
        inspectorSelfieUrl: inspectorSelfieUrl, // Include inspector selfie
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (draftId) {
        await updateDoc(doc(db, "inspections", draftId), inspectionData);
      } else {
        inspectionData.createdAt = serverTimestamp();
        await addDoc(collection(db, "inspections"), inspectionData);
      }

      toast.success("Inspection submitted successfully!");
      router.push("/dashboard/inspector/inspections");
    } catch (error) {
      console.error("Error submitting inspection:", error);
      toast.error("Failed to submit inspection");
    } finally {
      setSubmitting(false);
    }
  };

  const previewFile = (file) => {
    setPreviewModal({ open: true, file });
  };

  const renderFileUploadSection = (step, title) => {
    const stepKey = `${step}FormFiles`;
    const remarksKey = `${step}FormRemarks`;
    const files = formData[stepKey] || [];
    const isUploading = uploadingFiles[step];

    return (
      <div className="space-y-6">
        {/* File Upload */}
        <div>
          <Label className="text-base font-semibold">Documents & Images</Label>
          <p className="text-sm text-gray-600 mb-4">
            Upload images (JPG/PNG) or PDF files. Multiple files allowed.
          </p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              id={`files-${step}`}
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => handleFileUpload(e.target.files, step)}
              className="hidden"
              disabled={isUploading}
            />
            <label
              htmlFor={`files-${step}`}
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    Click to upload files
                  </span>
                  <span className="text-xs text-gray-500">
                    Or drag and drop • JPG, PNG, PDF up to 10MB each
                  </span>
                </>
              )}
            </label>
          </div>

          {/* Uploaded Files */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">
                Uploaded Files ({files.length})
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex-shrink-0">
                      {file.type.startsWith("image/") ? (
                        <div className="w-10 h-10 relative">
                          <Image
                            src={file.url}
                            alt={file.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                          <FileText className="h-5 w-5 text-red-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => previewFile(file)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(step, index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Remarks */}
        <div>
          <Label
            htmlFor={`remarks-${step}`}
            className="text-base font-semibold"
          >
            Remarks & Observations
          </Label>
          <p className="text-sm text-gray-600 mb-2">
            Add your detailed observations and remarks for this section.
          </p>
          <Textarea
            id={`remarks-${step}`}
            value={formData[remarksKey] || ""}
            onChange={(e) => updateFormData({ [remarksKey]: e.target.value })}
            placeholder="Enter your detailed remarks and observations here..."
            className="min-h-[120px]"
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <InspectorLayout>
        <div className="p-6">
          <div className="text-center py-8">Loading...</div>
        </div>
      </InspectorLayout>
    );
  }

  return (
    <InspectorLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {draftId ? "Resume Inspection" : "New Inspection"}
            </h1>
            <p className="text-gray-600">
              Complete the multi-step inspection process
            </p>
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            Step {currentStep} of 5
          </Badge>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                const Icon = step.icon;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                          isCompleted
                            ? "bg-green-100 border-green-500 text-green-700"
                            : isActive
                              ? "bg-blue-100 border-blue-500 text-blue-700"
                              : "bg-gray-100 border-gray-300 text-gray-400"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium text-center max-w-20 ${
                          isActive ? "text-blue-700" : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-px mx-4 ${
                          isCompleted ? "bg-green-500" : "bg-gray-300"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(STEPS[currentStep - 1].icon, {
                className: "h-5 w-5",
              })}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 &&
                "Enter basic information about the inspection"}
              {currentStep === 2 &&
                "Upload documents and add remarks for Madrasa evaluation"}
              {currentStep === 3 &&
                "Upload documents and add remarks for Management assessment"}
              {currentStep === 4 &&
                "Upload documents and add remarks for Sadar information"}
              {currentStep === 5 && "Review all information before submitting"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="madarsa">Select Madrasa *</Label>
                    <Select
                      value={formData.selectedMadarsaId}
                      onValueChange={(value) => {
                        const selectedMadarsa = madarsas.find(
                          (m) => m.madarsaId === value,
                        );
                        updateFormData({
                          selectedMadarsaId: value,
                          madarsaName: selectedMadarsa?.name || "",
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a madarsa to inspect" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {madarsas.map((madarsa) => (
                          <SelectItem
                            key={madarsa.madarsaId}
                            value={madarsa.madarsaId}
                          >
                            {madarsa.name} ({madarsa.madarsaId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="inspectionDate">Inspection Date *</Label>
                    <Input
                      id="inspectionDate"
                      type="date"
                      value={formData.inspectionDate}
                      onChange={(e) =>
                        updateFormData({ inspectionDate: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="inspectionType">Inspection Type</Label>
                    <Select
                      value={formData.inspectionType}
                      onValueChange={(value) =>
                        updateFormData({ inspectionType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select inspection type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="routine">
                          Routine Inspection
                        </SelectItem>
                        <SelectItem value="follow_up">
                          Follow-up Inspection
                        </SelectItem>
                        <SelectItem value="complaint">
                          Complaint-based Inspection
                        </SelectItem>
                        <SelectItem value="special">
                          Special Inspection
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="title">Inspection Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        updateFormData({ title: e.target.value })
                      }
                      placeholder="Enter a descriptive title for this inspection"
                    />
                  </div>
                </div>

                {formData.selectedMadarsaId && (
                  <Alert>
                    <Building className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Selected Madrasa:</strong> {formData.madarsaName}{" "}
                      ({formData.selectedMadarsaId})
                      <br />
                      <strong>Inspection Date:</strong>{" "}
                      {new Date(formData.inspectionDate).toLocaleDateString()}
                      <br />
                      <strong>Type:</strong>{" "}
                      {formData.inspectionType?.replace("_", " ").toUpperCase()}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Step 2: Madarsa Form */}
            {currentStep === 2 &&
              renderFileUploadSection("madarsa", "Madarsa Form")}

            {/* Step 3: Management Form */}
            {currentStep === 3 &&
              renderFileUploadSection("management", "Management Form")}

            {/* Step 4: Sadar Info Form */}
            {currentStep === 4 &&
              renderFileUploadSection("sadar", "Sadar Info Form")}

            {/* Step 5: Review & Submit */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please review all information below before submitting your
                    inspection report.
                  </AlertDescription>
                </Alert>

                {/* Basic Information Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-500">Madrasa</Label>
                      <p className="font-medium">{formData.madarsaName}</p>
                      <p className="text-sm text-gray-600">
                        {formData.selectedMadarsaId}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">
                        Inspection Date
                      </Label>
                      <p className="font-medium">
                        {new Date(formData.inspectionDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Type</Label>
                      <p className="font-medium capitalize">
                        {formData.inspectionType?.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Title</Label>
                      <p className="font-medium">{formData.title}</p>
                    </div>
                  </CardContent>
                </Card>

                {[
                  { step: "madarsa", title: "Madrasa Form" },
                  { step: "management", title: "Management Form" },
                  { step: "sadar", title: "Sadar Info Form" },
                ].map(({ step, title }) => {
                  const files = formData[`${step}FormFiles`] || [];
                  const remarks = formData[`${step}FormRemarks`] || "";

                  return (
                    <Card key={step}>
                      <CardHeader>
                        <CardTitle className="text-lg">{title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm text-gray-500">
                            Uploaded Files ({files.length})
                          </Label>
                          {files.length > 0 ? (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {files.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 p-2 border rounded text-sm"
                                >
                                  {file.type.startsWith("image/") ? (
                                    <div className="w-8 h-8 relative">
                                      <Image
                                        src={file.url}
                                        alt={file.name}
                                        fill
                                        className="object-cover rounded"
                                      />
                                    </div>
                                  ) : (
                                    <FileText className="h-4 w-4 text-red-600" />
                                  )}
                                  <span className="truncate">{file.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => previewFile(file)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 mt-2">
                              No files uploaded
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-500">
                            Remarks
                          </Label>
                          {remarks ? (
                            <div className="mt-2 p-3 bg-gray-50 rounded border">
                              <p className="text-sm whitespace-pre-wrap">
                                {remarks}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 mt-2">
                              No remarks added
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Inspector Selfie Requirement */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Camera className="h-5 w-5 text-teal-600" />
                      Inspector Verification *
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Please take a selfie to verify your identity before
                      submitting the inspection report. This is mandatory for
                      all inspection submissions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!inspectorSelfieUrl ? (
                      <div className="space-y-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Required:</strong> Inspector selfie is
                            mandatory before submission. Please take a photo to
                            verify your identity.
                          </AlertDescription>
                        </Alert>
                        <PhotoCapture
                          onCapture={(url) => {
                            setInspectorSelfieUrl(url);
                            console.log("Inspector selfie captured:", url);
                            toast.success(
                              "Inspector selfie captured successfully!",
                            );
                          }}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Inspector selfie verified successfully! You can now
                            submit the inspection.
                          </AlertDescription>
                        </Alert>
                        <div className="flex items-center gap-4 p-4 bg-teal-50 rounded-lg border border-teal-200">
                          <div className="w-16 h-16 relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={inspectorSelfieUrl}
                              alt="Inspector Selfie"
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-teal-800">
                              Selfie Captured
                            </p>
                            <p className="text-sm text-teal-600">
                              Inspector identity verified
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setInspectorSelfieUrl(null);
                              console.log("Inspector selfie reset for retake");
                              toast.info(
                                "Selfie cleared. Please take a new photo.",
                              );
                            }}
                            className="text-teal-600 border-teal-300 hover:bg-teal-50"
                          >
                            Retake
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Draft
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/inspector/inspections")}
            >
              Cancel
            </Button>

            {currentStep < 5 ? (
              <Button
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {currentStep === 4 ? "Review" : "Next"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={submitInspection}
                disabled={submitting || !validateStep(currentStep)}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Inspection
              </Button>
            )}
          </div>
        </div>

        {/* File Preview Modal */}
        <Dialog
          open={previewModal.open}
          onOpenChange={(open) => setPreviewModal({ open, file: null })}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
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
    </InspectorLayout>
  );
}
