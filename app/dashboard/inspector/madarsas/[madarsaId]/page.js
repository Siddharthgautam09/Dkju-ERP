"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import InspectorLayout from "@/components/InspectorLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building,
  Users,
  GraduationCap,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Calendar,
  FileText,
  Eye,
  Search,
  Filter,
  SortAsc,
  User,
  BookOpen,
  Clock,
  Home,
  UserCheck,
  Award,
} from "lucide-react";
import useAuthStore from "@/lib/authStore";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { orderBy } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import Link from "next/link";
import Layout from "@/components/Layout";

export default function MadarsaInspectionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userData } = useAuthStore();
  const [madarsa, setMadarsa] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Search and filter states
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
  const [studentSortBy, setStudentSortBy] = useState("name");
  const [teacherSortBy, setTeacherSortBy] = useState("name");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  
  // Modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const madarsaId = params.madarsaId;

  useEffect(() => {
    const fetchMadarsaData = async () => {
      try {
        setLoading(true);

        // Check if user has access to this madarsa
        if (!userData?.assignedMadarsas?.includes(madarsaId)) {
          router.push("/dashboard/inspector/madarsas");
          return;
        }

        // Fetch madarsa details
        const madarsaQuery = query(
          collection(db, "madarsas"),
          where("madarsaId", "==", madarsaId)
        );
        const madarsaSnapshot = await getDocs(madarsaQuery);

        console.log(madarsaSnapshot)
        
        if (madarsaSnapshot.empty) {
          router.push("/dashboard/inspector/madarsas");
          return;
        }

        const madarsaData = {
          id: madarsaSnapshot.docs[0].id,
          ...madarsaSnapshot.docs[0].data(),
        };
        setMadarsa(madarsaData);

        // Fetch students
        const studentsQuery = query(
          collection(db, "students"),
          where("madarsaId", "==", madarsaId)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsData = studentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStudents(studentsData);

        // Fetch teachers from the canonical 'teachers' collection so
        // the inspector view sees the same fields (qualification, degree, training)
        const teachersQuery = query(
          collection(db, "teachers"),
          where("madarsaId", "==", madarsaId)
        );
        const teachersSnapshot = await getDocs(teachersQuery);
        const teachersData = teachersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTeachers(teachersData);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching madarsa data:", error);
        setLoading(false);
      }
    };

    if (user && userData && madarsaId) {
      fetchMadarsaData();
    }
  }, [user, userData, madarsaId, router]);

  // Fetch inspection reports for this madarsa when madarsa is loaded
  useEffect(() => {
    if (!madarsa) return;

    const fetchMadarsaReports = async () => {
      setReportsLoading(true);
      try {
        const q1 = query(collection(db, 'inspections'), where('selectedMadarsaId', '==', madarsa.madarsaId), orderBy('createdAt', 'desc'));
        const snap1 = await getDocs(q1);
        const q2 = query(collection(db, 'inspections'), where('madarsaId', '==', madarsa.madarsaId), orderBy('createdAt', 'desc'));
        const snap2 = await getDocs(q2);

        const map = new Map();
        snap1.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
        snap2.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));

        const combined = Array.from(map.values()).sort((a, b) => {
          const ta = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
          const tb = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
          return tb - ta;
        });

        setReports(combined);
      } catch (error) {
        console.error('Error fetching madarsa reports:', error);
      } finally {
        setReportsLoading(false);
      }
    };

    fetchMadarsaReports();
  }, [madarsa]);

  // Get unique classes and subjects for filters
  const uniqueClasses = [...new Set(students.map(s => s.classLevel).filter(Boolean))].sort();
  const uniqueSubjects = [...new Set(teachers.map(t => t.subject).filter(Boolean))].sort();

  // Filter and sort students
  const filteredAndSortedStudents = students
    .filter(student => {
      const matchesSearch = student.fullName?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                          student.admissionNumber?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                          student.fatherName?.toLowerCase().includes(studentSearchTerm.toLowerCase());
      const matchesClass = selectedClass === "all" || student.classLevel === selectedClass;
      const matchesGender = selectedGender === "all" || student.gender?.toLowerCase() === selectedGender.toLowerCase();
      return matchesSearch && matchesClass && matchesGender;
    })
    .sort((a, b) => {
      switch (studentSortBy) {
        case "name":
          return (a.fullName || "").localeCompare(b.fullName || "");
        case "class":
          return (a.classLevel || "").localeCompare(b.classLevel || "");
        case "admission":
          return (a.admissionNumber || "").localeCompare(b.admissionNumber || "");
        default:
          return 0;
      }
    });

  // Filter and sort teachers
  const filteredAndSortedTeachers = teachers
    .filter(teacher => {
      const matchesSearch = teacher.fullName?.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
                          teacher.teacherId?.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
                          teacher.email?.toLowerCase().includes(teacherSearchTerm.toLowerCase());
      const matchesSubject = selectedSubject === "all" || teacher.subject === selectedSubject;
      return matchesSearch && matchesSubject;
    })
    .sort((a, b) => {
      switch (teacherSortBy) {
        case "name":
          return (a.fullName || "").localeCompare(b.fullName || "");
        case "subject":
          return (a.subject || "").localeCompare(b.subject || "");
        case "experience":
          return (b.experience || 0) - (a.experience || 0);
        default:
          return 0;
      }
    });

  const openStudentModal = (student) => {
    setSelectedStudent(student);
    setStudentModalOpen(true);
  };

  const openTeacherModal = (teacher) => {
    setSelectedTeacher(teacher);
    setTeacherModalOpen(true);
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

  if (!madarsa) {
    return (
      <InspectorLayout>
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">Madarsa not found</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/inspector/madarsas">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Madarsas
              </Link>
            </Button>
          </div>
        </div>
      </InspectorLayout>
    );
  }

  return (
    <InspectorLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/inspector/madarsas">
              <ArrowLeft className="h-4 w-4 " />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{madarsa.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{madarsa.madarsaId}</Badge>
              <Badge
                variant={madarsa.status === "active" ? "default" : "secondary"}
              >
                {madarsa.status}
              </Badge>
            </div>
          </div>
          <Button onClick={() => window.location.href = '/dashboard/inspector/reports'}>
            <FileText className="h-4 w-4 mr-2" />
            Create Report
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
            <TabsTrigger value="teachers">Teachers ({teachers.length})</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-gray-600">{madarsa.address}</p>
                    </div>
                  </div>

                  {madarsa.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-gray-600">{madarsa.phone}</p>
                      </div>
                    </div>
                  )}

                  {madarsa.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-gray-600">{madarsa.email}</p>
                      </div>
                    </div>
                  )}

                  {madarsa.established && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Established</p>
                        <p className="text-gray-600">{madarsa.established}</p>
                      </div>
                    </div>
                  )}

                  {madarsa.capacity && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Capacity</p>
                        <p className="text-gray-600">{madarsa.capacity} students</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Administration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {madarsa.adminName && (
                    <div>
                      <p className="font-medium">Administrator</p>
                      <p className="text-gray-600">{madarsa.adminName}</p>
                    </div>
                  )}

                  {madarsa.adminEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Admin Email</p>
                        <p className="text-gray-600">{madarsa.adminEmail}</p>
                      </div>
                    </div>
                  )}

                  {madarsa.adminPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Admin Phone</p>
                        <p className="text-gray-600">{madarsa.adminPhone}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Students</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {students.length}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Teachers</p>
                      <p className="text-3xl font-bold text-green-600">
                        {teachers.length}
                      </p>
                    </div>
                    <GraduationCap className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Capacity Usage
                      </p>
                      <p className="text-3xl font-bold text-purple-600">
                        {madarsa.capacity
                          ? Math.round((students.length / madarsa.capacity) * 100)
                          : 0}
                        %
                      </p>
                    </div>
                    <Building className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            {madarsa.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{madarsa.description}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Students List
                </CardTitle>
                <CardDescription>
                  All students enrolled in {madarsa.name} ({filteredAndSortedStudents.length} of {students.length})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search students by name, admission number, or father's name..."
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by Class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {uniqueClasses.map((cls) => (
                          <SelectItem key={cls} value={cls}>
                            Class {cls}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedGender} onValueChange={setSelectedGender}>
                      <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={studentSortBy} onValueChange={setStudentSortBy}>
                      <SelectTrigger className="w-[150px]">
                        <SortAsc className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Sort by Name</SelectItem>
                        <SelectItem value="class">Sort by Class</SelectItem>
                        <SelectItem value="admission">Sort by Admission No.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredAndSortedStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {students.length === 0 ? "No Students Enrolled" : "No Students Found"}
                    </h3>
                    <p className="text-gray-600">
                      {students.length === 0
                        ? "No students have been enrolled in this madarsa yet."
                        : "Try adjusting your search or filter criteria."}
                    </p>
                    {(studentSearchTerm || selectedClass !== "all" || selectedGender !== "all") && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => {
                          setStudentSearchTerm("");
                          setSelectedClass("all");
                          setSelectedGender("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Student Details</TableHead>
                          <TableHead className="font-semibold">Admission Info</TableHead>
                          <TableHead className="font-semibold">Class</TableHead>
                          <TableHead className="font-semibold">Contact</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedStudents.map((student) => (
                          <TableRow key={student.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-gray-900">{student.fullName}</p>
                                {student.fatherName && (
                                  <p className="text-sm text-gray-500">
                                    S/O {student.fatherName}
                                  </p>
                                )}
                                {student.dateOfBirth && (
                                  <p className="text-xs text-gray-400">
                                    DOB: {new Date(student.dateOfBirth).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-blue-600">{student.admissionNumber}</p>
                                {student.admissionDate && (
                                  <p className="text-xs text-gray-500">
                                    Admitted: {new Date(student.admissionDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {student.classLevel || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {student.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <p className="text-sm">{student.phone}</p>
                                  </div>
                                )}
                                {student.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3 text-gray-400" />
                                    <p className="text-sm text-gray-500">{student.email}</p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={student.status === "active" ? "default" : "secondary"}
                                className={
                                  student.status === "active" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-gray-100 text-gray-600"
                                }
                              >
                                {student.status || "active"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openStudentModal(student)}
                                className="hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View More
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teachers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Teachers List
                </CardTitle>
                <CardDescription>
                  All teachers working at {madarsa.name} ({filteredAndSortedTeachers.length} of {teachers.length})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search teachers by name, employee ID, or email..."
                        value={teacherSearchTerm}
                        onChange={(e) => setTeacherSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {uniqueSubjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={teacherSortBy} onValueChange={setTeacherSortBy}>
                      <SelectTrigger className="w-[150px]">
                        <SortAsc className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Sort by Name</SelectItem>
                        <SelectItem value="subject">Sort by Subject</SelectItem>
                        <SelectItem value="experience">Sort by Experience</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredAndSortedTeachers.length === 0 ? (
                  <div className="text-center py-12">
                    <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {teachers.length === 0 ? "No Teachers Registered" : "No Teachers Found"}
                    </h3>
                    <p className="text-gray-600">
                      {teachers.length === 0
                        ? "No teachers have been registered for this madarsa yet."
                        : "Try adjusting your search or filter criteria."}
                    </p>
                    {(teacherSearchTerm || selectedSubject !== "all") && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => {
                          setTeacherSearchTerm("");
                          setSelectedSubject("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold">Teacher Details</TableHead>
                          <TableHead className="font-semibold">Msr ID</TableHead>
                          <TableHead className="font-semibold">Subject</TableHead>
                          <TableHead className="font-semibold">Experience</TableHead>
                          <TableHead className="font-semibold">Contact</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedTeachers.map((teacher) => (
                          <TableRow key={teacher.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-gray-900">{teacher.name}</p>
                                {teacher.qualification && (
                                  <p className="text-sm text-gray-500">{teacher.qualification}</p>
                                )}
                                {teacher.specialization && (
                                  <p className="text-xs text-gray-400">{teacher.specialization}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-green-600">{teacher.mhrId || teacher.mhrId}</p>
                                {teacher.joinDate && (
                                  <p className="text-xs text-gray-500">
                                    Joined: {new Date(teacher.joinDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {teacher.subject || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span className="text-sm">
                                  {teacher.experience ? `${teacher.experience} years` : "N/A"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {teacher.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <p className="text-sm">{teacher.phone}</p>
                                  </div>
                                )}
                                {teacher.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3 text-gray-400" />
                                    <p className="text-sm text-gray-500">{teacher.email}</p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={teacher.status === "active" ? "default" : "secondary"}
                                className={
                                  teacher.status === "active" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-gray-100 text-gray-600"
                                }
                              >
                                {teacher.status || "active"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTeacherModal(teacher)}
                                className="hover:bg-green-50 hover:text-green-600"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View More
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inspection Reports</CardTitle>
                <CardDescription>
                  Previous inspection reports for {madarsa.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="text-center py-8">Loading reports...</div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No inspection reports yet</p>
                    <Button className="mt-4" onClick={() => window.location.href = '/dashboard/inspector/reports'}>
                      <FileText className="h-4 w-4 mr-2" />
                      Create First Report
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Report Title</TableHead>
                          <TableHead>Created Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{report.title || `Inspection Report - ${report.selectedMadarsaId || report.madarsaId}`}</p>
                                <p className="text-sm text-gray-500">{report.inspectionDate ? new Date(report.inspectionDate).toLocaleDateString() : 'N/A'}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                {report.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={report.status === 'draft' ? 'secondary' : 'default'}>{report.status || 'draft'}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => window.location.href = `/dashboard/inspector/inspections/${report.id}`} title="View Report">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {(report.status === 'draft' || !report.status) && (
                                  <Button variant="outline" size="sm" onClick={() => window.location.href = `/dashboard/inspector/inspections/create?draft=${report.id}`} title="Edit Report">
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Student Detail Modal */}
        <Dialog open={studentModalOpen} onOpenChange={setStudentModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Details
              </DialogTitle>
              <DialogDescription>
                Complete information for {selectedStudent?.fullName}
              </DialogDescription>
            </DialogHeader>
            
            {selectedStudent && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                        <p className="font-medium">{selectedStudent.fullName}</p>
                      </div>
                      {selectedStudent.fatherName && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Father&apos;s Name</label>
                          <p className="font-medium">{selectedStudent.fatherName}</p>
                        </div>
                      )}
                      {selectedStudent.motherName && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Mother&apos;s Name</label>
                          <p className="font-medium">{selectedStudent.motherName}</p>
                        </div>
                      )}
                      {selectedStudent.dateOfBirth && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                          <p className="font-medium">{new Date(selectedStudent.dateOfBirth).toLocaleDateString()}</p>
                        </div>
                      )}
                      {selectedStudent.gender && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Gender</label>
                          <p className="font-medium capitalize">{selectedStudent.gender}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Academic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Academic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Admission Number</label>
                        <p className="font-medium text-blue-600">{selectedStudent.admissionNumber}</p>
                      </div>
                      {selectedStudent.classLevel && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Current Class</label>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {selectedStudent.classLevel}
                          </Badge>
                        </div>
                      )}
                      {selectedStudent.admissionDate && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Admission Date</label>
                          <p className="font-medium">{new Date(selectedStudent.admissionDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {selectedStudent.previousEducation && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Previous Education</label>
                          <p className="font-medium">{selectedStudent.previousEducation}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <Badge
                          variant={selectedStudent.status === "active" ? "default" : "secondary"}
                          className={
                            selectedStudent.status === "active" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {selectedStudent.status || "active"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedStudent.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone Number</label>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <p className="font-medium">{selectedStudent.phone}</p>
                        </div>
                      </div>
                    )}
                    {selectedStudent.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email Address</label>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <p className="font-medium">{selectedStudent.email}</p>
                        </div>
                      </div>
                    )}
                    {selectedStudent.address && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <p className="font-medium">{selectedStudent.address}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Information */}
                {(selectedStudent.bloodGroup || selectedStudent.medicalConditions || selectedStudent.emergencyContact) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedStudent.bloodGroup && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Blood Group</label>
                          <p className="font-medium">{selectedStudent.bloodGroup}</p>
                        </div>
                      )}
                      {selectedStudent.medicalConditions && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Medical Conditions</label>
                          <p className="font-medium">{selectedStudent.medicalConditions}</p>
                        </div>
                      )}
                      {selectedStudent.emergencyContact && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
                          <p className="font-medium">{selectedStudent.emergencyContact}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Teacher Detail Modal */}
        <Dialog open={teacherModalOpen} onOpenChange={setTeacherModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Teacher Details
              </DialogTitle>
              <DialogDescription>
                Complete information for {selectedTeacher?.fullName}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTeacher && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                        <p className="font-medium">{selectedTeacher.fullName}</p>
                      </div>
                      {selectedTeacher.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="font-medium">{selectedTeacher.email}</p>
                        </div>
                      )}
                      {selectedTeacher.phone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          <p className="font-medium">{selectedTeacher.phone}</p>
                        </div>
                      )}
                      {selectedTeacher.dateOfBirth && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                          <p className="font-medium">{new Date(selectedTeacher.dateOfBirth).toLocaleDateString()}</p>
                        </div>
                      )}
                      {selectedTeacher.gender && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Gender</label>
                          <p className="font-medium capitalize">{selectedTeacher.gender}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Professional Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Professional Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Employee ID</label>
                        <p className="font-medium text-green-600">{selectedTeacher.teacherId || selectedTeacher.mhrId}</p>
                      </div>
                      {selectedTeacher.subject && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Subject</label>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {selectedTeacher.subject}
                          </Badge>
                        </div>
                      )}
                      {selectedTeacher.qualification && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Qualification</label>
                          <p className="font-medium">{selectedTeacher.qualification}</p>
                        </div>
                      )}
                      {selectedTeacher.specialization && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Specialization</label>
                          <p className="font-medium">{selectedTeacher.specialization}</p>
                        </div>
                      )}
                      {selectedTeacher.experience && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Experience</label>
                          <p className="font-medium">{selectedTeacher.experience} years</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <Badge
                          variant={selectedTeacher.status === "active" ? "default" : "secondary"}
                          className={
                            selectedTeacher.status === "active" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-600"
                          }
                        >
                          {selectedTeacher.status || "active"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Employment Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Employment Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedTeacher.joinDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Join Date</label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <p className="font-medium">{new Date(selectedTeacher.joinDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                    {selectedTeacher.employmentType && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Employment Type</label>
                        <p className="font-medium">{selectedTeacher.employmentType}</p>
                      </div>
                    )}
                    {selectedTeacher.salary && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Salary</label>
                        <p className="font-medium">₹{selectedTeacher.salary}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contact Information */}
                {selectedTeacher.address && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <p className="font-medium">{selectedTeacher.address}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </InspectorLayout>
  );
}
