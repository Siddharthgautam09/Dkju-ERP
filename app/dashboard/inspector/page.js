"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { Users, FileText, Building, BarChart3, Bell, Search, Eye } from "lucide-react";
import useAuthStore from "@/lib/authStore";
import {
  collection,
  query,
  where,
  getCountFromServer,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function InspectorDashboard() {
  const { user, userData, initializeAuth } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [assignedMadarsas, setAssignedMadarsas] = useState([]);
  const [recentNotices, setRecentNotices] = useState([]);

  useEffect(() => {
    // console.log(user, userData);
    const fetchData = async () => {
      try {
        setLoading(true);

        if (!userData?.assignedMadarsas || userData.assignedMadarsas.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch assigned madarsas details
        const madarsasQuery = query(
          collection(db, "madarsas"),
          where("madarsaId", "in", userData.assignedMadarsas)
        );
        const madarsasSnapshot = await getDocs(madarsasQuery);
        const madarsasData = madarsasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAssignedMadarsas(madarsasData);

        // Fetch counts from assigned madarsas
        let totalStudents = 0;
        let totalTeachers = 0;

        for (const madarsaId of userData.assignedMadarsas) {
          const [studentsCount, teachersCount] = await Promise.all([
            getCountFromServer(
              query(collection(db, "students"), where("madarsaId", "==", madarsaId))
            ),
            getCountFromServer(
              query(collection(db, "teachers"), where("madarsaId", "==", madarsaId))
            ),
          ]);

          totalStudents += studentsCount.data().count;
          totalTeachers += teachersCount.data().count;
        }

        // Fetch inspection reports count (pending)
        // const reportsCount = await getCountFromServer(
        //   query(
        //     collection(db, "inspectionReports"),
        //     where("inspectorId", "==", user.uid),
        //     where("status", "==", "draft")
        //   )
        // );

        // Fetch recent notices
        const noticesQuery = query(
          collection(db, "notices"),
          where("showOnDashboard", "==", true),
          where("targetAudience", "in", ["all", "inspector"]),
          orderBy("createdAt", "desc"),
          limit(5)
        );

        const noticesSnapshot = await getDocs(noticesQuery);
        const notices = noticesSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            content: data.content,
            priority: data.priority,
            targetAudience: data.targetAudience,
            createdAt: data.createdAt?.toDate(),
            createdByName: data.createdByName,
            expiryDate: data.expiryDate?.toDate(),
          };
        });

    

        setRecentNotices(notices);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching inspector dashboard data:", error);
        setLoading(false);
      }
    };

    if (user && userData) {
      fetchData();
    }
  }, [user, userData]);

  if (loading) {
    return (
      <InspectorLayout>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </InspectorLayout>
    );
  }

  return (
    <InspectorLayout>
      <div className="p-6 space-y-6">
        {/* Marquee Notice Banner */}
        {recentNotices.length > 0 && (
          <div className="bg-green-600 text-white py-2 sm:py-3 px-4 rounded-lg shadow-md overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 flex-shrink-0 animate-pulse" />
              <span className="text-xs sm:text-sm font-semibold">Latest Notices:</span>
            </div>
            <div className="relative overflow-hidden">
              <div className="animate-marquee whitespace-nowrap inline-block">
                {[...recentNotices, ...recentNotices].map((notice, index) => (
                  <span key={`${notice.id}-${index}`} className="inline-flex items-center mr-8 sm:mr-12">
                    <span className="text-sm sm:text-base font-medium">{notice.title}</span>
                    <span className="mx-2 sm:mx-3 text-green-200">•</span>
                    <span className="text-xs sm:text-sm text-green-100">{notice.content?.substring(0, 100)}...</span>
                    {index < (recentNotices.length * 2) - 1 && (
                      <span className="mx-3 sm:mx-4 text-green-300">|</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Inspector Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, {userData?.name || user?.email}
            </p>
          </div>
        </div>



        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assigned Madrasas */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Assigned Madrasas
                </CardTitle>
                <CardDescription>
                  Madrasas under your inspection
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assignedMadarsas.length === 0 ? (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No madarsas assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedMadarsas.map((madarsa) => (
                      <div
                        key={madarsa.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <h3 className="font-semibold">{madarsa.name}</h3>
                          <p className="text-sm text-gray-600">
                            {madarsa.address}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              ID: {madarsa.madarsaId}
                            </Badge>
                            <Badge
                              variant={
                                madarsa.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {madarsa.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/inspector/madarsas/${madarsa.madarsaId}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Inspect
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Notices */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Recent Notices
                </CardTitle>
                <CardDescription>Latest announcements</CardDescription>
              </CardHeader>
              <CardContent>
                {recentNotices.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No recent notices</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentNotices.map((notice) => (
                      <div
                        key={notice.id}
                        className="p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-sm">
                            {notice.title}
                          </h4>
                          <Badge
                            variant={
                              notice.priority === "high"
                                ? "destructive"
                                : notice.priority === "medium"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {notice.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notice.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {notice.createdAt?.toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </InspectorLayout>
  );
}
