"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authUtils";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  User,
  FileText,
  Calendar,
  Download,
  Bell,
  Assignment,
} from "lucide-react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import useAuthStore from "@/lib/authStore";
import { format, isValid } from "date-fns";

export default function StudentDashboard() {
  const { user, userData } = useAuthStore();
  const [studentData, setStudentData] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Helper function to safely format dates
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (
        typeof timestamp === "string" ||
        typeof timestamp === "number"
      ) {
        date = new Date(timestamp);
      } else {
        return "N/A";
      }

      if (isValid(date)) {
        return format(date, "MMM dd, yyyy");
      } else {
        return "N/A";
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        setError("");

        // console.log(user)

        if (!user?.email) {
          setError("User not logged in");
          return;
        }

        // Get student data - use userData if available, otherwise fetch from students collection
        let currentStudentData = userData;

        if (!currentStudentData.classLevel || !currentStudentData.madarsaId) {
          // console.log("herrr")
          const studentsQuery = query(
            collection(db, "students"),
            where("email", "==", user.email),
          );
          const studentsSnapshot = await getDocs(studentsQuery);

          // console.log(studentsSnapshot)

          if (!studentsSnapshot.empty) {
            currentStudentData = studentsSnapshot.docs[0].data();
          }
        }

        if (!currentStudentData) {
          setError("Student data not found");
          return;
        }

        // console.log(currentStudentData)
        setStudentData(currentStudentData);

        // Fetch recent materials
        if (currentStudentData.madarsaId) {
          // Fetch recent assignments
          const assignmentsQuery = query(
            collection(db, "assignments"),
            where("madarsaId", "==", currentStudentData.madarsaId),
            where("targetType", "==", "students"),
            orderBy("createdAt", "desc"),
            limit(3),
          );

          const assignmentsSnapshot = await getDocs(assignmentsQuery);
          const assignmentsData = assignmentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const filteredAssignments = assignmentsData.filter((assignment) => {
            if (
              assignment.classLevel === userData.classLevel ||
              assignment.classLevel === "all"
            ) {
              return true;
            }
          });

          setAssignments(filteredAssignments);

          // Fetch recent notices
          const noticesQuery = query(
            collection(db, "notices"),
            where("madarsaId", "==", currentStudentData.madarsaId),
            where("targetAudience", "in", ["students", "all"]),
            orderBy("createdAt", "desc"),
            limit(3),
          );

          const noticesSnapshot = await getDocs(noticesQuery);
          const noticesData = noticesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setNotices(noticesData);

          // Fetch recently published results (last 15 days)
          if (currentStudentData.admissionNumber) {
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

            const registrationsQuery = query(
              collection(db, "examRegistrations"),
              where(
                "admissionNumber",
                "==",
                currentStudentData.admissionNumber,
              ),
              where("status", "==", "registered"),
            );

            const registrationsSnapshot = await getDocs(registrationsQuery);
            const registrations = registrationsSnapshot.docs.map((doc) =>
              doc.data(),
            );

            const publishedExams = [];
            await Promise.all(
              registrations.map(async (reg) => {
                const resultDocId = `${reg.examId}_${reg.hallTicketNumber}`;
                const resultDoc = await getDoc(doc(db, "results", resultDocId));
                if (resultDoc.exists()) {
                  const data = resultDoc.data();
                  if (data.isPublished && data.uploadedAt) {
                    const uploadDate = data.uploadedAt.toDate();
                    if (uploadDate >= fifteenDaysAgo) {
                      const examSnap = await getDoc(
                        doc(db, "exams", reg.examId),
                      );
                      publishedExams.push({
                        id: reg.examId,
                        name: examSnap.exists()
                          ? examSnap.data().title
                          : "Exam",
                        date: uploadDate,
                      });
                    }
                  }
                }
              }),
            );
            setRecentResults(publishedExams);
          }
        }
      } catch (err) {
        console.error("Error fetching student data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchStudentData();
    }
  }, [user, userData]);

  if (loading) {
    return (
      <Layout user={user}>
        <div className="p-4 md:p-6">
          <div className="flex justify-center items-center h-48 md:h-64">
            <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-teal-600"></div>
            <div className="ml-4 text-base md:text-lg">
              Loading dashboard...
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout user={user}>
        <div className="p-4 md:p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 md:px-4 py-3 rounded text-sm md:text-base">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Marquee Notice Banner */}
        {(notices.length > 0 || recentResults.length > 0) && (
          <div
            className={`py-2 sm:py-3 px-4 rounded-lg shadow-md overflow-hidden ${recentResults.length > 0 ? "bg-teal-600" : "bg-green-600"} text-white`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 flex-shrink-0 animate-pulse" />
              <span className="text-xs sm:text-sm font-semibold">
                Latest Updates:
              </span>
            </div>
            <div className="relative overflow-hidden">
              <div className="animate-marquee whitespace-nowrap inline-block">
                {(() => {
                  const marqueeItems = [
                    ...recentResults.map((res) => ({
                      id: `res-${res.id}`,
                      title: `Result Published: ${res.name}`,
                      content: `Your performance for ${res.name} is now available for review.`,
                      isResult: true,
                    })),
                    ...notices.map((n) => ({
                      id: n.id,
                      title: n.title,
                      content: n.content,
                      isResult: false,
                    })),
                  ];

                  // Double the items for seamless loop
                  const displayItems = [...marqueeItems, ...marqueeItems];

                  return displayItems.map((item, index) => (
                    <span
                      key={`${item.id}-${index}`}
                      className="inline-flex items-center mr-8 sm:mr-12"
                    >
                      <span
                        className={`text-sm sm:text-base font-bold ${item.isResult ? "text-yellow-300" : "text-white"}`}
                      >
                        {item.isResult && "🎉 "}
                        {item.title}
                      </span>
                      <span className="mx-2 sm:mx-3 text-white/30">•</span>
                      <span className="text-xs sm:text-sm text-white/90">
                        {item.isResult
                          ? item.content
                          : `${item.content?.substring(0, 100)}...`}
                      </span>
                      {index < displayItems.length - 1 && (
                        <span className="mx-3 sm:mx-4 text-white/20">|</span>
                      )}
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg p-4 md:p-6 text-white">
          <h1 className="text-xl md:text-2xl font-bold mb-2">
            Welcome back, {studentData?.fullName || user?.displayName}!
          </h1>
          <p className="text-teal-100 text-sm md:text-base">
            Continue your Islamic education journey with us.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 md:h-6 md:w-6 text-teal-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-gray-600">
                    Admission Number
                  </p>
                  <p className="text-base md:text-lg font-semibold break-all">
                    {studentData?.admissionNumber || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-gray-600">Class</p>
                  <p className="text-base md:text-lg font-semibold">
                    {studentData?.classLevel || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-gray-600">Madrasa</p>
                  <p className="text-base md:text-lg font-semibold break-words">
                    {studentData?.madarsaId || studentData?.madarsa || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 md:h-6 md:w-6 text-yellow-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-gray-600">Status</p>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 text-xs"
                  >
                    {studentData?.status || "Active"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Materials */}
        {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Recent Learning Materials</span>
              </CardTitle>
              <CardDescription>
                Access your latest study materials and assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {materials.length > 0 ? (
                  materials.map((material) => (
                    <div key={material.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{material.title}</h4>
                          <p className="text-sm text-gray-600">
                            {material.subject} • {material.fileType || 'PDF'} • {formatDate(material.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => material.fileUrl && window.open(material.fileUrl, '_blank')}
                        disabled={!material.fileUrl}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No learning materials available</p>
                )}
              </div>
            </CardContent>
          </Card> */}

        {/* Recent Assignments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center space-x-2 text-lg md:text-xl">
                <FileText className="h-4 w-4 md:h-5 md:w-5" />
                <span>Recent Assignments</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-2 md:space-y-3">
                {assignments.length > 0 ? (
                  assignments.map((assignment) => (
                    <div key={assignment.id} className="p-3 border rounded-lg">
                      <h4 className="font-medium text-sm md:text-base break-words">
                        {assignment.title}
                      </h4>
                      <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2 break-words">
                        {assignment.description}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          Due: {formatDate(assignment.dueDate)}
                        </span>
                        <Badge
                          variant={
                            assignment.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs w-fit"
                        >
                          {assignment.status || "Pending"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm md:text-base">
                    No assignments available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center space-x-2 text-lg md:text-xl">
                <Bell className="h-4 w-4 md:h-5 md:w-5" />
                <span>Recent Notices</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-2 md:space-y-3">
                {notices.length > 0 ? (
                  notices.map((notice) => (
                    <div key={notice.id} className="p-3 border rounded-lg">
                      <h4 className="font-medium text-sm md:text-base break-words">
                        {notice.title}
                      </h4>
                      <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2 break-words">
                        {notice.content}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(notice.createdAt)}
                        </span>
                        <Badge variant="outline" className="text-xs w-fit">
                          {notice.priority || "Normal"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm md:text-base">
                    No notices available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
