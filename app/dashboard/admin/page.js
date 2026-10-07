"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authUtils";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  Settings,
  BarChart3,
  Shield,
  UserCheck,
  Globe,
  Bell,
} from "lucide-react";
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminDashboard() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalMahals: 0,
    totalMarquees: 0,
    activeMarquees: 0,
    totalNotices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    try {
      setLoading(true);

      const [
        studentsCountSnap,
        teachersCountSnap,
        madarsasCountSnap,
        marqueesCountSnap,
        activeMarqueesSnap,
        noticesCountSnap,
      ] = await Promise.all([
        getCountFromServer(collection(db, "students")),
        getCountFromServer(collection(db, "teachers")),
        getCountFromServer(collection(db, "madarsas")),
        getCountFromServer(collection(db, "marqueeTexts")),
        getCountFromServer(
          query(collection(db, "marqueeTexts"), where("isActive", "==", true)),
        ),
        getCountFromServer(collection(db, "notices")),
      ]);

      setStats({
        totalStudents: studentsCountSnap.data().count,
        totalTeachers: teachersCountSnap.data().count,
        totalMahals: madarsasCountSnap.data().count,
        totalMarquees: marqueesCountSnap.data().count,
        activeMarquees: activeMarqueesSnap.data().count,
        totalNotices: noticesCountSnap.data().count,
      });
    } catch (error) {
      console.error("Error loading optimized data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Central Administration Dashboard
          </h1>
          <p className="text-red-100">
            Complete system overview and management controls.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Students</p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stats.totalStudents}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Teachers</p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stats.totalTeachers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Madarsa</p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stats.totalMahals}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Globe className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Marquees</p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stats.totalMarquees}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Globe className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stats.activeMarquees}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <Bell className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Notices</p>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : stats.totalNotices}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Management</CardTitle>
              <CardDescription>
                Essential administrative functions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  (window.location.href = "/dashboard/admin/students")
                }
              >
                <Users className="h-4 w-4 mr-2" />
                Students ({stats.totalStudents})
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  (window.location.href = "/dashboard/admin/teachers")
                }
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Teachers ({stats.totalTeachers})
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  (window.location.href = "/dashboard/admin/madarsas")
                }
              >
                <Settings className="h-4 w-4 mr-2" />
                Madarsa ({stats.totalMahals})
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  (window.location.href = "/dashboard/admin/exam/unpublished")
                }
              >
                <Globe className="h-4 w-4 mr-2" />
                Unpublished Results
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content & Communications</CardTitle>
              <CardDescription>
                Website content and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  (window.location.href = "/dashboard/admin/config")
                }
              >
                <Globe className="h-4 w-4 mr-2" />
                Marquee Texts ({stats.activeMarquees} active)
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  (window.location.href = "/dashboard/admin/notices")
                }
              >
                <Bell className="h-4 w-4 mr-2" />
                Notices ({stats.totalNotices})
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() =>
                  (window.location.href = "/dashboard/admin/analytics")
                }
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics & Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Duplicate Applications Fixer (Central Admin only)
          {role === 'central_admin' && (
            <Card>
              <CardHeader>
                <CardTitle>Duplicate Applications</CardTitle>
                <CardDescription>Find and fix duplicate application IDs per madarsa</CardDescription>
              </CardHeader>
              <CardContent>
                <DuplicateApplications />
              </CardContent>
            </Card>
          )} */}
      </div>
    </Layout>
  );
}
