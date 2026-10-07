"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Search,
  Users,
  Download,
  Eye,
  Edit,
  UserCheck,
  GraduationCap,
  Check,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import useAuthStore from "@/lib/authStore";
import Layout from "@/components/Layout";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  fetchFilteredTeachers,
  getTeachersCount,
  searchTeachers,
  fetchMadrasasMetadata,
} from "@/lib/teacherQueries";
import { exportTeachersToCSV } from "@/lib/exportUtils";

// Helper to format teacher name
const formatTeacherName = (name) => {
  if (!name) return "";
  return name
    .toString()
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
};

export default function CentralAdminTeachersPage() {
  const { user, userData } = useAuthStore();

  // Optimized state management
  const [currentPageTeachers, setCurrentPageTeachers] = useState([]);
  const [madrasas, setMadrasas] = useState([]);
  const [madrasaMap, setMadrasaMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMahal, setFilterMahal] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(20);
  const lastDocRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteTeacherId, setDeleteTeacherId] = useState(null);

  // Check if MSR ID already exists
  const checkMsrIdExists = async (msrId, excludeTeacherId = null) => {
    try {
      const teachersQuery = query(
        collection(db, "teachers"),
        where("mhrId", "==", msrId)
      );
      const snapshot = await getDocs(teachersQuery);

      if (excludeTeacherId) {
        return snapshot.docs.some((doc) => doc.id !== excludeTeacherId);
      }

      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking MSR ID:", error);
      return false;
    }
  };

  // Open edit dialog with teacher data
  const handleEditTeacher = (teacher) => {
    setEditForm({ ...teacher });
    setIsEditDialogOpen(true);
  };

  // Save edited teacher info
  const handleEditTeacherSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      if (editForm.mhrId && editForm.mhrId.trim()) {
        const msrExists = await checkMsrIdExists(
          editForm.mhrId.trim(),
          editForm.id
        );
        if (msrExists) {
          toast.error("MSR Number already exists. Please contact Admin.");
          setEditSubmitting(false);
          return;
        }
      }

      const { id, ...data } = editForm;
      await updateDoc(doc(db, "teachers", id), data);
      toast.success("Teacher info updated");
      setIsEditDialogOpen(false);
      loadPageData();
    } catch (err) {
      toast.error("Failed to update teacher");
    }
    setEditSubmitting(false);
  };

  // Delete teacher
  const handleDeleteTeacher = async () => {
    if (!deleteTeacherId) return;
    setDeleteSubmitting(true);
    try {
      await updateDoc(doc(db, "teachers", deleteTeacherId), { deleted: true });
      toast.success("Teacher deleted");
      setDeleteTeacherId(null);
      loadPageData();
    } catch (err) {
      toast.error("Failed to delete teacher");
    }
    setDeleteSubmitting(false);
  };

  // Load madrasa metadata once (cached)
  const loadMadrasas = useCallback(async () => {
    try {
      const { madrasas, madrasaMap } = await fetchMadrasasMetadata();
      setMadrasas(madrasas);
      setMadrasaMap(madrasaMap);
    } catch (error) {
      console.error("Error loading madrasas:", error);
      toast.error("Failed to load madrasas");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load current page data with server-side filtering
  const loadPageData = useCallback(async () => {
    setLoadingPage(true);
    try {
      const filters = {
        madarsaId: filterMahal !== "all" ? filterMahal : null,
        status: filterStatus !== "all" ? filterStatus : null,
      };

      // If search term, use search function
      if (searchTerm && searchTerm.trim()) {
        const { teachers, total } = await searchTeachers(searchTerm, filters);
        setTotalCount(total);
        setCurrentPageTeachers(teachers);
      } else {
        // Normal pagination
        const count = await getTeachersCount(filters);
        setTotalCount(count);

        const { teachers, lastVisible } = await fetchFilteredTeachers(
          filters,
          itemsPerPage,
          currentPage > 1 ? lastDocRef.current : null
        );

        lastDocRef.current = lastVisible;
        setCurrentPageTeachers(teachers);
      }
    } catch (error) {
      console.error("Error loading teachers:", error);
      toast.error("Failed to load teachers");
    } finally {
      setLoadingPage(false);
    }
  }, [filterMahal, filterStatus, currentPage, itemsPerPage, searchTerm]);

  // Initial load
  useEffect(() => {
    loadMadrasas();
  }, [loadMadrasas]);

  useEffect(() => {
    if (!loading) {
      loadPageData();
    }
  }, [loading, loadPageData]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    if (searchTerm || filterMahal !== "all" || filterStatus !== "all") {
      setCurrentPage(1);
    }
  }, [searchTerm, filterMahal, filterStatus]);

  const handleViewTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setIsViewDialogOpen(true);
  };

  const handleStatusChange = async (teacherId, newStatus) => {
    try {
      await updateDoc(doc(db, "teachers", teacherId), {
        status: newStatus,
        updatedAt: new Date(),
      });

      toast.success("Teacher status updated successfully");
      loadPageData();
    } catch (error) {
      console.error("Error updating teacher status:", error);
      toast.error("Failed to update teacher status");
    }
  };

  const downloadTeacherData = async () => {
    setExportingCSV(true);
    try {
      const filters = {
        madarsaId: filterMahal !== "all" ? filterMahal : null,
        status: filterStatus !== "all" ? filterStatus : null,
      };

      const totalExported = await exportTeachersToCSV(
        filters,
        madrasaMap,
        (progress) => {
          console.log(`Exported ${progress} teachers...`);
        }
      );

      toast.success(`Successfully exported ${totalExported} teachers`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export teachers");
    } finally {
      setExportingCSV(false);
    }
  };

  const getMahalName = (madarsaId) => {
    const madrasa = madrasaMap.get(madarsaId);
    return madrasa ? madrasa.name : madarsaId || "Unknown Mahal";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "suspended":
        return "bg-yellow-100 text-yellow-800";
      case "on_leave":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              All Teachers
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Manage teachers across all madarsas
            </p>
          </div>
          <Button
            onClick={downloadTeacherData}
            disabled={exportingCSV}
            className="min-h-[44px] touch-manipulation text-sm md:text-base"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportingCSV ? "Exporting..." : "Export CSV"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center space-x-2 md:space-x-3">
                <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-gray-600 truncate">
                    Total Teachers
                  </p>
                  <p className="text-lg md:text-2xl font-bold truncate">
                    {totalCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center space-x-2 md:space-x-3">
                <UserCheck className="h-6 w-6 md:h-8 md:w-8 text-green-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-gray-600 truncate">
                    Active
                  </p>
                  <p className="text-lg md:text-2xl font-bold truncate">
                    {
                      currentPageTeachers.filter((t) => t.status === "active")
                        .length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center space-x-2 md:space-x-3">
                <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-gray-600 truncate">
                    On Leave
                  </p>
                  <p className="text-lg md:text-2xl font-bold truncate">
                    {
                      currentPageTeachers.filter((t) => t.status === "on_leave")
                        .length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center space-x-2 md:space-x-3">
                <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-purple-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-gray-600 truncate">
                    This Month
                  </p>
                  <p className="text-lg md:text-2xl font-bold truncate">
                    {
                      currentPageTeachers.filter((teacher) => {
                        const teacherDate = new Date(
                          teacher.createdAt?.seconds * 1000 || teacher.createdAt
                        );
                        const currentMonth = new Date().getMonth();
                        return teacherDate.getMonth() === currentMonth;
                      }).length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search teachers by name, email, or MSR ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 min-h-[44px] text-sm md:text-base"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="min-h-[44px] text-sm md:text-base justify-between w-full"
                      >
                        {filterMahal === "all"
                          ? "All Madrasas"
                          : madrasas.find(
                              (madarsa) => madarsa.madarsaId === filterMahal
                            )?.name +
                              " (" +
                              (madrasas.find(
                                (madarsa) => madarsa.madarsaId === filterMahal
                              )?.mid ||
                                madrasas.find(
                                  (madarsa) => madarsa.madarsaId === filterMahal
                                )?.madarsaId) +
                              ")" || "Select Madrasa"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput
                          className="bg-white"
                          placeholder="Search Madrasas..."
                        />
                        <CommandList className="bg-white">
                          <CommandEmpty>No Madrasa found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              className="bg-white"
                              onSelect={() => {
                                setFilterMahal("all");
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filterMahal === "all"
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              All Madrasas
                            </CommandItem>
                            {madrasas.map((madarsa, index) => (
                              <CommandItem
                                key={`${madarsa.madarsaId}-${index}`}
                                onSelect={() => {
                                  setFilterMahal(madarsa.madarsaId);
                                  setOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    filterMahal === madarsa.madarsaId
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {madarsa.name} ({madarsa.madarsaId})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="min-h-[44px] text-sm md:text-base">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teachers Table */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">
              Teachers List ({currentPageTeachers.length} of {totalCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {loading || loadingPage ? (
              <div className="text-center py-8 text-sm md:text-base">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-2" />
                Loading teachers...
              </div>
            ) : currentPageTeachers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm md:text-base">
                No teachers found matching the current filters.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Qualification</TableHead>
                        <TableHead>Degree</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Madrasa</TableHead>
                        <TableHead>MSR ID</TableHead>
                        <TableHead>Training</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPageTeachers.map((teacher) => (
                        <TableRow key={teacher.id}>
                          <TableCell className="font-medium">
                            {formatTeacherName(teacher.name) || "N/A"}
                          </TableCell>
                          <TableCell>{teacher.email || "N/A"}</TableCell>
                          <TableCell>
                            {teacher.qualification || "N/A"}
                          </TableCell>
                          <TableCell>{teacher.degree || "N/A"}</TableCell>
                          <TableCell>{teacher.phone || "N/A"}</TableCell>
                          <TableCell>{teacher.madarsaId}</TableCell>
                          <TableCell>{teacher.mhrId || "N/A"}</TableCell>
                          <TableCell>
                            {teacher.moallimTraining ? "Yes" : "No"}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={teacher.status || "active"}
                              onValueChange={(value) =>
                                handleStatusChange(teacher.id, value)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                  Inactive
                                </SelectItem>
                                <SelectItem value="on_leave">
                                  On Leave
                                </SelectItem>
                                <SelectItem value="suspended">
                                  Suspended
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {new Date(
                              teacher.createdAt?.seconds * 1000 ||
                                teacher.createdAt
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleViewTeacher(teacher)}
                              >
                                View{" "}
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleEditTeacher(teacher)}
                              >
                                Edit{" "}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteTeacherId(teacher.id)}
                                disabled={deleteSubmitting}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {currentPageTeachers.map((teacher) => (
                    <Card key={teacher.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate text-sm md:text-base">
                                {formatTeacherName(teacher.name) || "N/A"}
                              </h3>
                              <p className="text-xs md:text-sm text-gray-600 truncate">
                                {teacher.email || "N/A"}
                              </p>
                            </div>
                            <Badge
                              className={`${getStatusColor(
                                teacher.status
                              )} text-xs flex-shrink-0 ml-2`}
                            >
                              {teacher.status || "active"}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
                            <div>
                              <span className="font-medium text-gray-500">
                                Phone:
                              </span>
                              <p className="truncate">
                                {teacher.phone || "N/A"}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">
                                Qualification:
                              </span>
                              <p className="truncate">
                                {teacher.qualification || "N/A"}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">
                                Degree:
                              </span>
                              <p className="truncate">
                                {teacher.degree || "N/A"}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">
                                MSR ID:
                              </span>
                              <p className="truncate">
                                {teacher.mhrId || "N/A"}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-500">
                                Madrasa:
                              </span>
                              <p className="truncate">
                                {teacher.madarsaId || "N/A"}
                              </p>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500">
                            Joined:{" "}
                            {new Date(
                              teacher.createdAt?.seconds * 1000 ||
                                teacher.createdAt
                            ).toLocaleDateString()}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                            <Select
                              value={teacher.status || "active"}
                              onValueChange={(value) =>
                                handleStatusChange(teacher.id, value)
                              }
                            >
                              <SelectTrigger className="min-h-[44px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                  Inactive
                                </SelectItem>
                                <SelectItem value="on_leave">
                                  On Leave
                                </SelectItem>
                                <SelectItem value="suspended">
                                  Suspended
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 min-h-[44px] touch-manipulation text-xs"
                                onClick={() => handleViewTeacher(teacher)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 min-h-[44px] touch-manipulation text-xs"
                                onClick={() => handleEditTeacher(teacher)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="min-h-[44px] touch-manipulation text-xs px-3"
                                onClick={() => setDeleteTeacherId(teacher.id)}
                                disabled={deleteSubmitting}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {!loading &&
              !loadingPage &&
              Math.ceil(totalCount / itemsPerPage) > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t gap-4">
                  <div className="text-sm text-gray-700">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, totalCount)} of{" "}
                    {totalCount} teachers
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1 || loadingPage}
                      className="min-h-[44px] touch-manipulation"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from(
                        {
                          length: Math.min(
                            5,
                            Math.ceil(totalCount / itemsPerPage)
                          ),
                        },
                        (_, i) => {
                          const totalPagesCalc = Math.ceil(
                            totalCount / itemsPerPage
                          );
                          const pageNum =
                            Math.max(
                              1,
                              Math.min(totalPagesCalc - 4, currentPage - 2)
                            ) + i;
                          if (pageNum > totalPagesCalc) return null;

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                currentPage === pageNum ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              disabled={loadingPage}
                              className="w-10 h-10 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(
                            prev + 1,
                            Math.ceil(totalCount / itemsPerPage)
                          )
                        )
                      }
                      disabled={
                        currentPage === Math.ceil(totalCount / itemsPerPage) ||
                        loadingPage
                      }
                      className="min-h-[44px] touch-manipulation"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
        {/* Edit Teacher Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">
                Edit Teacher Info
              </DialogTitle>
            </DialogHeader>
            {editForm && (
              <form onSubmit={handleEditTeacherSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Full Name
                    </label>
                    <Input
                      value={editForm.name || ""}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      required
                      className="min-h-[44px] text-sm md:text-base"
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
                      className="min-h-[44px] text-sm md:text-base"
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
                      className="min-h-[44px] text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Qualification
                    </label>
                    <Input
                      value={editForm.qualification || ""}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          qualification: e.target.value,
                        }))
                      }
                      className="min-h-[44px] text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Degree
                    </label>
                    <Input
                      value={editForm.degree || ""}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, degree: e.target.value }))
                      }
                      className="min-h-[44px] text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Madrasa
                    </label>
                    <Input
                      value={editForm.madarsaId || ""}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          madarsaId: e.target.value,
                        }))
                      }
                      className="min-h-[44px] text-sm md:text-base"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      MSR ID
                    </label>
                    <Input
                      value={editForm.mhrId || ""}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, mhrId: e.target.value }))
                      }
                      className="min-h-[44px] text-sm md:text-base"
                      placeholder="Enter MSR ID (optional)"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Moallim Training
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        type="button"
                        variant={
                          editForm.moallimTraining ? "default" : "outline"
                        }
                        onClick={() =>
                          setEditForm((f) => ({ ...f, moallimTraining: true }))
                        }
                      >
                        Yes
                      </Button>
                      <Button
                        type="button"
                        variant={
                          !editForm.moallimTraining ? "default" : "outline"
                        }
                        onClick={() =>
                          setEditForm((f) => ({
                            ...f,
                            moallimTraining: false,
                            moallimTrainingDetails: "",
                          }))
                        }
                      >
                        No
                      </Button>
                    </div>
                    {editForm.moallimTraining && (
                      <Input
                        value={editForm.moallimTrainingDetails || ""}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            moallimTrainingDetails: e.target.value,
                          }))
                        }
                        className="min-h-[44px] mt-2 text-sm md:text-base"
                        placeholder="Training details"
                      />
                    )}
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
                      <SelectTrigger className="min-h-[44px] text-sm md:text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    className="min-h-[44px] touch-manipulation text-sm md:text-base"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={editSubmitting}
                    className="min-h-[44px] touch-manipulation text-sm md:text-base"
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Teacher Confirmation Dialog */}
        <Dialog
          open={!!deleteTeacherId}
          onOpenChange={(v) => {
            if (!v) setDeleteTeacherId(null);
          }}
        >
          <DialogContent className="max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">
                Delete Teacher
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 text-sm md:text-base">
              Are you sure you want to delete this teacher? This action cannot
              be undone.
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTeacherId(null)}
                className="min-h-[44px] touch-manipulation text-sm md:text-base"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteTeacher}
                disabled={deleteSubmitting}
                className="min-h-[44px] touch-manipulation text-sm md:text-base"
              >
                {deleteSubmitting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Teacher Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">
                Teacher Details
              </DialogTitle>
            </DialogHeader>
            {selectedTeacher && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Full Name
                    </label>
                    <p className="text-sm md:text-base mt-1">
                      {formatTeacherName(selectedTeacher.name) || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Email
                    </label>
                    <p className="text-sm md:text-base mt-1 break-all">
                      {selectedTeacher.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Phone
                    </label>
                    <p className="text-sm md:text-base mt-1">
                      {selectedTeacher.phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Madrasa
                    </label>
                    <p className="text-sm md:text-base mt-1">
                      {selectedTeacher.madarsaId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      MSR ID
                    </label>
                    <p className="text-sm md:text-base mt-1">
                      {selectedTeacher.mhrId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Qualification
                    </label>
                    <p className="text-sm md:text-base mt-1">
                      {selectedTeacher.qualification || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Degree
                    </label>
                    <p className="text-sm md:text-base mt-1">
                      {selectedTeacher.degree || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Moallim Training
                    </label>
                    <p className="text-sm md:text-base mt-1">
                      {selectedTeacher.moallimTraining ? "Yes" : "No"}
                    </p>
                  </div>
                  {selectedTeacher.moallimTraining &&
                    selectedTeacher.moallimTrainingDetails && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Training Details
                        </label>
                        <p className="text-sm md:text-base mt-1">
                          {selectedTeacher.moallimTrainingDetails}
                        </p>
                      </div>
                    )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Status
                    </label>
                    <div className="mt-1">
                      <Badge
                        className={`${getStatusColor(
                          selectedTeacher.status
                        )} text-xs`}
                      >
                        {selectedTeacher.status || "active"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Date Joined
                    </label>
                    <p className="text-sm md:text-base mt-1">
                      {new Date(
                        selectedTeacher.createdAt?.seconds * 1000 ||
                          selectedTeacher.createdAt
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
