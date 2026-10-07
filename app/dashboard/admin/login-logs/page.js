"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Monitor,
  Search,
  Filter,
  Calendar,
  MapPin,
  User,
  Clock,
  RefreshCw,
  Eye,
  Download,
  Edit,
  Upload,
  Activity,
  LogIn,
  FileUp,
  FileEdit,
  FileX,
  Trash2,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  startAfter,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    email: "",
    role: "all",
    activityType: "all",
    startDate: "",
    endDate: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    email: "",
    role: "all",
    activityType: "all",
    startDate: "",
    endDate: "",
  });

  const roles = [
    "inspector",
    "central_admin",
    "student",
    "teacher",
    "madarsa_admin",
    "mekhala_admin",
  ];
  const activityTypes = [
    "login",
    "result_upload",
    "result_edit",
    "result_delete",
  ];

  const fetchLogs = async (isLoadMore = false, filterParams = null) => {
    const currentFilters = filterParams || appliedFilters;
    try {
      if (!isLoadMore) {
        setLoading(true);
        setLogs([]);
        setLastDoc(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      let q = query(
        collection(db, "LoginLogs"),
        orderBy("loginTimestamp", "desc"),
        limit(20),
      );

      // Apply filters
      if (currentFilters.role && currentFilters.role !== "all") {
        q = query(q, where("role", "==", currentFilters.role));
      }

      if (currentFilters.email) {
        q = query(q, where("email", ">=", currentFilters.email));
        q = query(q, where("email", "<=", currentFilters.email + "\uf8ff"));
      }

      if (currentFilters.startDate && currentFilters.endDate) {
        const startTimestamp = Timestamp.fromDate(
          new Date(currentFilters.startDate),
        );
        const endTimestamp = Timestamp.fromDate(
          new Date(currentFilters.endDate + "T23:59:59"),
        );

        q = query(q, where("loginTimestamp", ">=", startTimestamp));
        q = query(q, where("loginTimestamp", "<=", endTimestamp));
      }

      if (
        currentFilters.activityType &&
        currentFilters.activityType !== "all"
      ) {
        q = query(q, where("activityType", "==", currentFilters.activityType));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newLogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (isLoadMore) {
        setLogs((prev) => [...prev, ...newLogs]);
      } else {
        setLogs(newLogs);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 20);
    } catch (error) {
      console.error("Error fetching login logs:", error);
      toast.error("Failed to fetch login logs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Initial load function to avoid dependency issues
    const initialLoad = async () => {
      try {
        setLoading(true);
        setLogs([]);
        setLastDoc(null);
        setHasMore(true);

        let q = query(
          collection(db, "LoginLogs"),
          orderBy("loginTimestamp", "desc"),
          limit(20),
        );

        const snapshot = await getDocs(q);
        const newLogs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setLogs(newLogs);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 20);
      } catch (error) {
        console.error("Error fetching login logs:", error);
        toast.error("Failed to fetch login logs");
      } finally {
        setLoading(false);
      }
    };

    initialLoad();
  }, []); // Empty dependency array to run only on mount

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    fetchLogs(false, filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      email: "",
      role: "all",
      activityType: "all",
      startDate: "",
      endDate: "",
    };
    setFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
    fetchLogs(false, clearedFilters);
  };

  const loadMoreLogs = () => {
    if (hasMore && !loadingMore) {
      fetchLogs(true);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "central_admin":
        return "bg-red-100 text-red-800";
      case "inspector":
        return "bg-blue-100 text-blue-800";
      case "teacher":
        return "bg-green-100 text-green-800";
      case "student":
        return "bg-purple-100 text-purple-800";
      case "madarsa_admin":
        return "bg-orange-100 text-orange-800";
      case "mekhala_admin":
        return "bg-cyan-100 text-cyan-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityBadgeColor = (activityType) => {
    switch (activityType) {
      case "login":
        return "bg-blue-50 text-blue-700";
      case "result_upload":
        return "bg-green-50 text-green-700";
      case "result_edit":
        return "bg-yellow-50 text-yellow-700";
      case "result_delete":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getActivityIcon = (activityType) => {
    const iconProps = { className: "h-3 w-3" };
    switch (activityType) {
      case "login":
        return <LogIn {...iconProps} />;
      case "result_upload":
        return <FileUp {...iconProps} />;
      case "result_edit":
        return <FileEdit {...iconProps} />;
      case "result_delete":
        return <FileX {...iconProps} />;
      default:
        return <Activity {...iconProps} />;
    }
  };

  const exportLogs = () => {
    const csvContent = [
      [
        "Email",
        "Role",
        "Activity Type",
        "Login Time",
        "Platform",
        "Details",
        "Location",
        "User Agent",
      ].join(","),
      ...logs.map((log) =>
        [
          log.email || "",
          log.role || "",
          log.activityType || "login",
          formatTimestamp(log.loginTimestamp),
          log.platform || "",
          log.details || "",
          log.location
            ? `${log.location.latitude},${log.location.longitude}`
            : "",
          (log.userAgent || "").replace(/,/g, ";"), // Replace commas to avoid CSV issues
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `login-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const viewDetails = (log) => {
    setSelectedLog(log);
    setDetailsModal(true);
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              Activity Logs
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Monitor user activities, logins, and system events
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => fetchLogs(false, appliedFilters)}
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportLogs} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter activity logs by email, role, activity type, or date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="Search by email..."
                  value={filters.email}
                  onChange={(e) => handleFilterChange("email", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  value={filters.role}
                  onValueChange={(value) =>
                    handleFilterChange("role", value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.replace("_", " ").toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="activityType">Activity Type</Label>
                <Select
                  value={filters.activityType}
                  onValueChange={(value) =>
                    handleFilterChange("activityType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Activities</SelectItem>
                    {activityTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace("_", " ").toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
              <Button onClick={applyFilters}>
                <Search className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full sm:w-auto"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              Activity Records ({logs.length})
            </CardTitle>
            <CardDescription className="text-sm">
              Showing up to 20 records per page
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 mt-2 text-sm">
                  Loading activity logs...
                </span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Monitor className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm sm:text-base">No activity logs found</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden border-b border-gray-200 sm:rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Activity Type</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{log.email}</p>
                                  <p className="text-sm text-gray-500">
                                    {log.name}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getRoleBadgeColor(log.role)}>
                                  {log.role?.replace("_", " ").toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getActivityBadgeColor(
                                    log.activityType || "login",
                                  )}
                                >
                                  <div className="flex items-center gap-1">
                                    {getActivityIcon(
                                      log.activityType || "login",
                                    )}
                                    {(log.activityType || "login")
                                      .replace("_", " ")
                                      .toUpperCase()}
                                  </div>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">
                                    {formatTimestamp(log.loginTimestamp)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {log.platform?.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                  {log.details || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => viewDetails(log)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreLogs}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        <Dialog open={detailsModal} onOpenChange={setDetailsModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle>Activity Details</DialogTitle>
              <DialogDescription>
                Complete information about this activity
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Email</Label>
                    <p className="font-medium">{selectedLog.email}</p>
                  </div>
                  {selectedLog.name && selectedLog.name !== "N/A" && (
                    <div>
                      <Label className="text-sm text-gray-500">Name</Label>
                      <p className="font-medium">{selectedLog.name}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-gray-500 mr-3">Role</Label>
                    <Badge className={getRoleBadgeColor(selectedLog.role)}>
                      {selectedLog.role?.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">User ID</Label>
                    <p className="font-mono text-sm">{selectedLog.userId}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500 mr-3">
                      Activity Type
                    </Label>
                    <Badge
                      className={getActivityBadgeColor(
                        selectedLog.activityType || "login",
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {getActivityIcon(selectedLog.activityType || "login")}
                        {(selectedLog.activityType || "login")
                          .replace("_", " ")
                          .toUpperCase()}
                      </div>
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Timestamp</Label>
                    <p className="font-medium">
                      {formatTimestamp(selectedLog.loginTimestamp)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Platform</Label>
                    <p className="font-medium">{selectedLog.platform}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">
                      Login Method
                    </Label>
                    <p className="font-medium">{selectedLog.loginMethod}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">IP Address</Label>
                    <p className="font-medium">{selectedLog.ip || "N/A"}</p>
                  </div>
                </div>

                {/* Activity-specific details */}
                {selectedLog.details && (
                  <div>
                    <Label className="text-sm text-gray-500">Details</Label>
                    <div className="p-3 bg-blue-50 rounded border border-blue-200 mt-1">
                      <p className="text-sm font-medium text-blue-900">
                        {selectedLog.details}
                      </p>
                    </div>
                  </div>
                )}

                {/* Exam-related activity details */}
                {(selectedLog.activityType === "result_upload" ||
                  selectedLog.activityType === "result_edit" ||
                  selectedLog.activityType === "result_delete") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedLog.examTitle && (
                      <div>
                        <Label className="text-sm text-gray-500">Exam</Label>
                        <p className="font-medium">{selectedLog.examTitle}</p>
                      </div>
                    )}
                    {selectedLog.examId && (
                      <div>
                        <Label className="text-sm text-gray-500">Exam ID</Label>
                        <p className="font-mono text-sm">
                          {selectedLog.examId}
                        </p>
                      </div>
                    )}
                    {selectedLog.hallTicketNumber && (
                      <div>
                        <Label className="text-sm text-gray-500">
                          Hall Ticket Number
                        </Label>
                        <p className="font-medium">
                          {selectedLog.hallTicketNumber}
                        </p>
                      </div>
                    )}
                    {selectedLog.studentName && (
                      <div>
                        <Label className="text-sm text-gray-500">
                          Student Name
                        </Label>
                        <p className="font-medium">{selectedLog.studentName}</p>
                      </div>
                    )}
                    {selectedLog.recordCount && (
                      <div>
                        <Label className="text-sm text-gray-500">
                          Records Affected
                        </Label>
                        <p className="font-medium">{selectedLog.recordCount}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedLog.location && (
                  <div>
                    <Label className="text-sm text-gray-500">Location</Label>
                    <div className="p-3 bg-gray-50 rounded border mt-1">
                      <p>
                        <strong>Latitude:</strong>{" "}
                        {selectedLog.location.latitude}
                      </p>
                      <p>
                        <strong>Longitude:</strong>{" "}
                        {selectedLog.location.longitude}
                      </p>
                      {selectedLog.location.accuracy && (
                        <p>
                          <strong>Accuracy:</strong>{" "}
                          {selectedLog.location.accuracy}m
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm text-gray-500">User Agent</Label>
                  <div className="p-3 bg-gray-50 rounded border mt-1">
                    <p className="text-sm break-all">{selectedLog.userAgent}</p>
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
