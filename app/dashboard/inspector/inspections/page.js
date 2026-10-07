"use client";

import { useState, useEffect } from "react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Building,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileEdit,
} from "lucide-react";
import useAuthStore from "@/lib/authStore";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

export default function InspectionsPage() {
  const { user, userData } = useAuthStore();
  const [inspections, setInspections] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [madarsas, setMadarsas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("active");

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
        const inspectionsQuery = query(
          collection(db, "inspections"),
          where("inspectorId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const inspectionsSnapshot = await getDocs(inspectionsQuery);
        const inspectionsData = inspectionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Separate active inspections and drafts
        const activeInspections = inspectionsData.filter(i => i.status !== "draft");
        const draftInspections = inspectionsData.filter(i => i.status === "draft");
        
        setInspections(activeInspections);
        setDrafts(draftInspections);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching inspections:", error);
        setLoading(false);
      }
    };

    if (user && userData) {
      fetchData();
    }
  }, [user, userData]);

  const currentData = activeTab === "active" ? inspections : drafts;

  const filteredData = currentData.filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.madarsaName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.madarsaId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
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
        return <FileEdit className="h-4 w-4" />;
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

  if (loading) {
    return (
      <InspectorLayout>
        <div className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading inspections...</p>
          </div>
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
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              My Inspections
            </h1>
            <p className="text-gray-600 mt-1">
              Manage and track all your inspection reports
            </p>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/dashboard/inspector/inspections/create">
              <Plus className="h-4 w-4 mr-2" />
              New Inspection
            </Link>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Active ({inspections.length})
            </TabsTrigger>
            <TabsTrigger value="drafts" className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              Drafts ({drafts.length})
            </TabsTrigger>
          </TabsList>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search inspections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {activeTab === "active" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="active" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Inspections</CardTitle>
                <CardDescription>
                  All submitted and ongoing inspection reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredData.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {inspections.length === 0 ? "No Inspections Yet" : "No Results Found"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {inspections.length === 0
                        ? "Start your first inspection to see it here."
                        : "Try adjusting your search or filter criteria."}
                    </p>
                    <Button asChild>
                      <Link href="/dashboard/inspector/inspections/create">
                        <Plus className="h-4 w-4 mr-2" />
                        Start New Inspection
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Inspection Details</TableHead>
                        <TableHead>Madrasa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((inspection) => (
                        <TableRow key={inspection.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{inspection.title || "Inspection Report"}</p>
                              <p className="text-sm text-gray-500">ID: {inspection.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{inspection.madarsaName}</p>
                              <p className="text-sm text-gray-500">{inspection.madarsaId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(inspection.status)}>
                              {getStatusIcon(inspection.status)}
                              <span className="ml-1 capitalize">{inspection.status?.replace('_', ' ')}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {inspection.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                          </TableCell>
                          <TableCell>
                            {inspection.updatedAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/inspector/inspections/${inspection.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drafts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Draft Inspections</CardTitle>
                <CardDescription>
                  Incomplete inspections that can be resumed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredData.length === 0 ? (
                  <div className="text-center py-12">
                    <FileEdit className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Draft Inspections
                    </h3>
                    <p className="text-gray-600">
                      All your saved drafts will appear here.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Draft Details</TableHead>
                        <TableHead>Madrasa</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Last Saved</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((draft) => (
                        <TableRow key={draft.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{draft.title || "Untitled Inspection"}</p>
                              <p className="text-sm text-gray-500">Draft ID: {draft.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{draft.madarsaName}</p>
                              <p className="text-sm text-gray-500">{draft.madarsaId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${(draft.currentStep || 1) * 20}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-500">
                                Step {draft.currentStep || 1}/5
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {draft.updatedAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/dashboard/inspector/inspections/create?draft=${draft.id}`}>
                                  <Edit className="h-4 w-4 mr-1" />
                                  Resume
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </InspectorLayout>
  );
}
