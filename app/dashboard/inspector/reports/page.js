"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Building,
  Calendar,
} from "lucide-react";
import useAuthStore from "@/lib/authStore";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

export default function InspectorReportsPage() {
  const { user, userData } = useAuthStore();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [madarsas, setMadarsas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMadarsaId, setSelectedMadarsaId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (!userData?.assignedMadarsas || userData.assignedMadarsas.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch assigned madarsas
        const madarsasQuery = query(
          collection(db, "madarsas"),
          where("madarsaId", "in", userData.assignedMadarsas)
        );
        const madarsasSnapshot = await getDocs(madarsasQuery);
        const madarsasData = madarsasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMadarsas(madarsasData);

        // Fetch inspection reports
        const reportsQuery = query(
          collection(db, "inspections"),
          where("inspectorId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const reportsSnapshot = await getDocs(reportsQuery);
        const reportsData = reportsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReports(reportsData);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setLoading(false);
      }
    };

    if (user && userData) {
      fetchData();
    }
  }, [user, userData]);

  const handleCreateReport = async () => {
    if (!selectedMadarsaId) {
      alert("Please select a madarsa");
      return;
    }

    try {
      setIsCreating(true);
      
      const selectedMadarsa = madarsas.find(m => m.madarsaId === selectedMadarsaId);
      
      // Create new inspection document
      const inspectionData = {
        inspectorId: user.uid,
        inspectorName: userData?.name || user.displayName,
        selectedMadarsaId: selectedMadarsaId,
        madarsaName: selectedMadarsa?.name || "",
        inspectionDate: new Date().toISOString().split('T')[0],
        inspectionType: "routine",
        title: `Inspection Report - ${selectedMadarsa?.name || selectedMadarsaId}`,
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        madarsaFormFiles: [],
        managementFormFiles: [],
        sadarFormFiles: [],
        madarsaFormRemarks: "",
        managementFormRemarks: "",
        sadarFormRemarks: "",
      };

      const docRef = await addDoc(collection(db, "inspections"), inspectionData);
      
      // Navigate to the creation page
      router.push(`/dashboard/inspector/inspections/create?draft=${docRef.id}`);
      
    } catch (error) {
      console.error("Error creating inspection:", error);
      alert("Failed to create inspection. Please try again.");
    } finally {
      setIsCreating(false);
      setDialogOpen(false);
      setSelectedMadarsaId("");
    }
  };

  const handleViewReport = (reportId) => {
    router.push(`/dashboard/inspector/inspections/${reportId}`);
  };

  const handleEditReport = (reportId) => {
    router.push(`/dashboard/inspector/inspections/create?draft=${reportId}`);
  };

  const handleCancelDialog = () => {
    setDialogOpen(false);
    setSelectedMadarsaId("");
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.madarsaName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.selectedMadarsaId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "submitted":
        return "default";
      case "reviewed":
        return "outline";
      case "approved":
        return "default";
      default:
        return "secondary";
    }
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Inspection Reports
            </h1>
            <p className="text-gray-600">
              Manage your inspection reports and documentation
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white">
              <DialogHeader>
                <DialogTitle>Create New Inspection Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Madrasa</label>
                  <Select value={selectedMadarsaId} onValueChange={setSelectedMadarsaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a madarsa to inspect" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {madarsas.map((madarsa) => (
                        <SelectItem key={madarsa.madarsaId} value={madarsa.madarsaId}>
                          {madarsa.name} ({madarsa.madarsaId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCancelDialog} disabled={isCreating}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateReport} disabled={isCreating || !selectedMadarsaId}>
                    {isCreating ? "Creating..." : "Create Report"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports ({filteredReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {reports.length === 0
                    ? "No inspection reports created yet"
                    : "No reports match your search criteria"}
                </p>
                {reports.length === 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bg-white">
                      <DialogHeader>
                        <DialogTitle>Create New Inspection Report</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Select Madrasa</label>
                          <Select value={selectedMadarsaId} onValueChange={setSelectedMadarsaId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a madarsa to inspect" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {madarsas.map((madarsa) => (
                                <SelectItem key={madarsa.madarsaId} value={madarsa.madarsaId}>
                                  {madarsa.name} ({madarsa.madarsaId})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={handleCancelDialog} disabled={isCreating}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateReport} disabled={isCreating || !selectedMadarsaId}>
                            {isCreating ? "Creating..." : "Create Report"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Title</TableHead>
                      <TableHead>Madrasa</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => {
                      const madarsa = madarsas.find(
                        (m) => m.madarsaId === report.selectedMadarsaId
                      );
                      
                      return (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {report.title || `Inspection Report - ${report.selectedMadarsaId}`}
                              </p>
                              <p className="text-sm text-gray-500">
                                {report.inspectionDate ? new Date(report.inspectionDate).toLocaleDateString() : "N/A"}
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
                              <Calendar className="h-4 w-4 text-gray-500" />
                              {report.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(report.status)}>
                              {report.status || "draft"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewReport(report.id)}
                                title="View Report"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(report.status === "draft" || !report.status) && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditReport(report.id)}
                                  title="Edit Report"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
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

        {/* Quick Stats */}
        {reports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-3xl font-bold text-blue-600">{reports.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Draft</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {reports.filter((r) => r.status === "draft" || !r.status).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Submitted</p>
                  <p className="text-3xl font-bold text-green-600">
                    {reports.filter((r) => r.status === "submitted").length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {reports.filter((r) => r.status === "approved").length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </InspectorLayout>
  );
}
