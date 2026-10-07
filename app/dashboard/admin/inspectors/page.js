"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus,
  Search,
  Edit,
  Trash2,
  UserCheck,
  Building,
  Mail,
  Phone,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Copy,
  Key,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  deleteDoc,
  addDoc,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  updatePassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import useAuthStore from "@/lib/authStore";
import Layout from "@/components/Layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination } from "@/components/ui/pagination";
import { useRef, useCallback } from "react";

export default function InspectorsManagementPage() {
  const { user, userData } = useAuthStore();
  const [inspectors, setInspectors] = useState([]);
  const [madarsas, setMadarsas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [madarsaSearchTerm, setMadarsaSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInspector, setEditingInspector] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [inspectorPasswords, setInspectorPasswords] = useState({});
  const [enablePasswordChange, setEnablePasswordChange] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    assignedMadarsas: [],
    status: "active",
    allowedTime: 60, // Default 60 minutes
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalInspectors, setTotalInspectors] = useState(0);
  const itemsPerPage = 10;
  const lastDocRef = useRef(null);
  const [allInspectors, setAllInspectors] = useState([]); // For client-side filter if needed

  const fetchInspectors = useCallback(
    async (isSearch = false) => {
      try {
        setLoading(true);
        const inspectorsRef = collection(db, "users");
        let q = query(
          inspectorsRef,
          where("role", "==", "inspector"),
          orderBy("createdAt", "desc"),
        );

        // Simple implementation: Fetch all for now if pagination is handled client-side
        // but for "proper pagination", server-side is better.
        // Given the previous task, I'll implement proper pagination.

        const snapshot = await getDocs(q);
        const inspectorsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllInspectors(inspectorsData);
        setTotalInspectors(inspectorsData.length);
        setTotalPages(Math.ceil(inspectorsData.length / itemsPerPage));
      } catch (error) {
        console.error("Error fetching inspectors:", error);
        toast.error("Failed to fetch inspectors");
      } finally {
        setLoading(false);
      }
    },
    [itemsPerPage],
  );

  useEffect(() => {
    fetchInspectors();
    fetchMadarsas();
  }, [fetchInspectors]);

  const fetchMadarsas = async () => {
    try {
      const madarsasQuery = query(
        collection(db, "madarsas"),
        orderBy("name", "asc"),
      );
      const snapshot = await getDocs(madarsasQuery);
      const madarsasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMadarsas(madarsasData);
    } catch (error) {
      console.error("Error fetching madarsas:", error);
      toast.error("Failed to fetch madarsas");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation: 10 digit phone number
    const phoneRegex = /^\d{10}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      return toast.error("Phone number must be exactly 10 digits");
    }

    setSubmitting(true);

    try {
      if (!editingInspector) {
        // Store admin session before creating a new user
        if (useAuthStore.getState().storeAdminSession) {
          useAuthStore.getState().storeAdminSession();
        }
      }

      if (editingInspector) {
        // Update existing inspector
        const updateData = {
          name: formData.name,
          phone: formData.phone,
          assignedMadarsas: formData.assignedMadarsas,
          status: formData.status,
          allowedTime: formData.allowedTime,
          updatedAt: new Date(),
        };

        // If password change is enabled and password is provided
        if (enablePasswordChange && formData.password) {
          updateData.password = formData.password;
          setInspectorPasswords((prev) => ({
            ...prev,
            [editingInspector.id]: formData.password,
          }));
          updateData.passwordUpdated = new Date();
        }

        await updateDoc(doc(db, "users", editingInspector.id), updateData);

        toast.success(
          enablePasswordChange && formData.password
            ? "Inspector updated successfully with new password"
            : "Inspector updated successfully",
        );
      } else {
        // Create new inspector
        // 1. Store the admin's session
        const currentAdminUser = user;
        const currentAdminData = userData;

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password,
        );

        // Create user document in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password, // Store for administrative visibility
          role: "inspector",
          assignedMadarsas: formData.assignedMadarsas,
          status: formData.status,
          allowedTime: formData.allowedTime, // Session time limit in minutes
          active: true, // Initially active
          sessionStartTime: null, // Will be set when they log in
          sessionEndTime: null, // Will be calculated on login
          createdAt: new Date(),
          createdBy: currentAdminUser.uid,
        });

        // 2. Restore the admin's session in useAuthStore
        if (useAuthStore.getState().restoreAdminSession) {
          useAuthStore.getState().restoreAdminSession();
        }

        toast.success("Inspector created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchInspectors();
    } catch (error) {
      console.error("Error saving inspector:", error);
      if (error.code === "auth/email-already-in-use") {
        toast.error("Email already in use");
      } else if (error.code === "auth/weak-password") {
        toast.error("Password should be at least 6 characters");
      } else {
        toast.error("Failed to save inspector");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (inspectorId) => {
    if (!confirm("Are you sure you want to delete this inspector?")) return;

    const loadingToast = toast.loading("Deleting inspector...");

    // Optimistic Update: Remove from UI immediately
    const prevInspectors = [...allInspectors];
    setAllInspectors((prev) => prev.filter((i) => i.id !== inspectorId));

    try {
      // 1. Delete from Firebase Auth and Firestore in parallel
      const authPromise = fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: inspectorId }),
      }).then((res) => res.json());

      const firestorePromise = deleteDoc(doc(db, "users", inspectorId));

      // Wait for both to complete
      const [authResult] = await Promise.all([authPromise, firestorePromise]);

      if (authResult.error) {
        console.warn("Auth deletion failed but proceeding:", authResult.error);
      }

      toast.success("Inspector deleted successfully", { id: loadingToast });

      // Update total count locally
      setTotalInspectors((prev) => prev - 1);
    } catch (error) {
      console.error("Error deleting inspector:", error);
      toast.error("Failed to delete inspector", { id: loadingToast });
      // Revert optimistic update on failure
      setAllInspectors(prevInspectors);
      setTotalInspectors(prevInspectors.length);
    }
  };

  const handleEdit = (inspector) => {
    setEditingInspector(inspector);
    setFormData({
      name: inspector.name || "",
      email: inspector.email || "",
      phone: inspector.phone || "",
      password: "",
      assignedMadarsas: inspector.assignedMadarsas || [],
      status: inspector.status || "active",
      allowedTime: inspector.allowedTime || 60,
    });
    setMadarsaSearchTerm("");
    setEnablePasswordChange(false);
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      assignedMadarsas: [],
      status: "active",
      allowedTime: 60,
    });
    setMadarsaSearchTerm("");
    setShowPassword(false);
    setEnablePasswordChange(false);
    setEditingInspector(null);
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
    toast.success("Password generated successfully");
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard`);
    } catch (err) {
      toast.error(`Failed to copy ${type}`);
    }
  };

  const handleMadarsaToggle = (madarsaId, checked) => {
    if (checked) {
      setFormData({
        ...formData,
        assignedMadarsas: [...formData.assignedMadarsas, madarsaId],
      });
    } else {
      setFormData({
        ...formData,
        assignedMadarsas: formData.assignedMadarsas.filter(
          (id) => id !== madarsaId,
        ),
      });
    }
  };

  const removeMadarsa = (madarsaId) => {
    setFormData({
      ...formData,
      assignedMadarsas: formData.assignedMadarsas.filter(
        (id) => id !== madarsaId,
      ),
    });
  };

  const filteredInspectors = allInspectors.filter(
    (inspector) =>
      inspector.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspector.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspector.phone?.includes(searchTerm) ||
      inspector.uid?.includes(searchTerm),
  );

  // Pagination logic
  const paginatedInspectors = filteredInspectors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setTotalPages(Math.ceil(filteredInspectors.length / itemsPerPage));
    if (
      currentPage > 1 &&
      (currentPage - 1) * itemsPerPage >= filteredInspectors.length
    ) {
      setCurrentPage(1);
    }
  }, [filteredInspectors.length, itemsPerPage, currentPage]);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Inspector Management
            </h1>
            <p className="text-gray-600">
              Manage inspectors and their assigned madarsas
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Inspector
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] bg-white overflow-hidden">
              <DialogHeader>
                <DialogTitle>
                  {editingInspector ? "Edit Inspector" : "Add New Inspector"}
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[75vh] pr-2">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      disabled={editingInspector}
                    />
                  </div>

                  {!editingInspector && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                password: e.target.value,
                              })
                            }
                            required
                            placeholder="Minimum 6 characters"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generatePassword}
                          className="whitespace-nowrap"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                      </div>
                    </div>
                  )}

                  {editingInspector && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="changePassword"
                          checked={enablePasswordChange}
                          onCheckedChange={setEnablePasswordChange}
                        />
                        <Label
                          htmlFor="changePassword"
                          className="text-sm font-medium"
                        >
                          Change Password
                        </Label>
                      </div>

                      {enablePasswordChange && (
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password *</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                id="newPassword"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    password: e.target.value,
                                  })
                                }
                                required={enablePasswordChange}
                                placeholder="Minimum 6 characters"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-500" />
                                )}
                              </Button>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={generatePassword}
                              className="whitespace-nowrap"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Generate
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500">
                            Leave blank to keep current password unchanged
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allowedTime">
                      Session Time Limit (minutes)
                    </Label>
                    <Input
                      id="allowedTime"
                      type="number"
                      min="1"
                      max="480"
                      value={formData.allowedTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allowedTime: parseInt(e.target.value) || 60,
                        })
                      }
                      placeholder="60"
                    />
                    <p className="text-xs text-gray-500">
                      Inspector session will automatically expire after this
                      duration. Default: 60 minutes
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Assigned Madarsas</Label>

                    {/* Search Madarsas */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search madarsas to assign..."
                        value={madarsaSearchTerm}
                        onChange={(e) => setMadarsaSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Selected Madarsas as Pills */}
                    {formData.assignedMadarsas.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Selected Madarsas:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {formData.assignedMadarsas.map((madarsaId) => {
                            const madarsa = madarsas.find(
                              (m) => m.madarsaId === madarsaId,
                            );
                            return madarsa ? (
                              <Badge
                                key={madarsaId}
                                variant="secondary"
                                className="flex items-center gap-1 pr-1"
                              >
                                <span>{madarsa.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMadarsa(madarsaId)}
                                  className="h-4 w-4 p-0 hover:bg-gray-300"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Available Madarsas */}
                    <div className="border rounded-md p-4 max-h-48 overflow-y-auto bg-gray-50">
                      {madarsas.length === 0 ? (
                        <p className="text-gray-500 text-sm">
                          No madarsas available
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {madarsas
                            .filter(
                              (madarsa) =>
                                !formData.assignedMadarsas.includes(
                                  madarsa.madarsaId,
                                ) &&
                                (madarsaSearchTerm === "" ||
                                  madarsa.name
                                    .toLowerCase()
                                    .includes(
                                      madarsaSearchTerm.toLowerCase(),
                                    ) ||
                                  madarsa.madarsaId
                                    .toLowerCase()
                                    .includes(madarsaSearchTerm.toLowerCase())),
                            )
                            .map((madarsa) => (
                              <div
                                key={madarsa.madarsaId}
                                className="flex items-center justify-between p-2 hover:bg-white rounded border-dashed border border-gray-300 cursor-pointer"
                                onClick={() =>
                                  handleMadarsaToggle(madarsa.madarsaId, true)
                                }
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {madarsa.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {madarsa.madarsaId}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMadarsaToggle(
                                      madarsa.madarsaId,
                                      true,
                                    );
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
                            ))}
                          {madarsas.filter(
                            (madarsa) =>
                              !formData.assignedMadarsas.includes(
                                madarsa.madarsaId,
                              ) &&
                              (madarsaSearchTerm === "" ||
                                madarsa.name
                                  .toLowerCase()
                                  .includes(madarsaSearchTerm.toLowerCase()) ||
                                madarsa.madarsaId
                                  .toLowerCase()
                                  .includes(madarsaSearchTerm.toLowerCase())),
                          ).length === 0 && (
                            <p className="text-gray-500 text-sm text-center py-4">
                              {madarsaSearchTerm
                                ? "No madarsas match your search"
                                : "All madarsas are already assigned"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting
                        ? "Saving..."
                        : editingInspector
                          ? "Update"
                          : "Create"}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search inspectors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Inspectors (Thaftheesh) Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Inspectors (Thaftheesh) ({filteredInspectors.length})
            </CardTitle>
            {totalPages > 1 && (
              <div className="text-sm font-normal text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredInspectors.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No inspectors found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inspector</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Assigned Madarsas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Session Limit</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInspectors.map((inspector) => (
                      <TableRow key={inspector.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{inspector.name}</p>
                            <p className="text-sm text-gray-500 truncate max-w-[150px]">
                              {inspector.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {inspector.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {inspector.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate max-w-[150px]">
                              {inspector.email}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(inspector.email, "Email")
                              }
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {inspector.password ||
                          inspectorPasswords[inspector.id] ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                {inspector.password ||
                                  inspectorPasswords[inspector.id]}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(
                                    inspector.password ||
                                      inspectorPasswords[inspector.id],
                                    "Password",
                                  )
                                }
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              Not set
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {inspector.assignedMadarsas?.length > 0 ? (
                              inspector.assignedMadarsas.map((madarsaId) => {
                                const madarsa = madarsas.find(
                                  (m) => m.madarsaId === madarsaId,
                                );
                                return (
                                  <Badge
                                    key={madarsaId}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {madarsa?.name || madarsaId}
                                  </Badge>
                                );
                              })
                            ) : (
                              <span className="text-gray-500 text-sm">
                                No assignments
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              inspector.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {inspector.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-teal-600" />
                            <span className="font-semibold">
                              {inspector.allowedTime || 60}m
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {inspector.createdAt?.toDate
                            ? inspector.createdAt.toDate().toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleEdit(inspector)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleDelete(inspector.id)}
                              className="text-red-600 hover:text-red-700 bg-white"
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredInspectors.length}
                  />
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Page {currentPage} of {totalPages} | Showing{" "}
                    {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredInspectors.length,
                    )}{" "}
                    of {filteredInspectors.length} inspectors
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
