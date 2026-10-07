"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  FileText,
  Settings,
  LogOut,
  X,
  BookOpen,
  UserCheck,
  BarChart3,
  Upload,
  User,
  GraduationCap,
  Bell,
  ClipboardList,
  Search,
  Building,
  ChevronDown,
  ChevronRight,
  Monitor,
  MapPin,
  Plus,
  FileCheck,
  Calendar,
  FilePen,
  Award,
  UserX,
  FileSpreadsheet,
  Palette,
} from "lucide-react";
import useAuthStore from "@/lib/authStore";
import Image from "next/image";

const Sidebar = ({ isOpen, onClose }) => {
  const { user, userData, clearAuth, initializeAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({
    users: false,
    institutions: true,
    reports: true,
    settings: true,
    exams: false,
  });

  const toggleGroup = (groupKey) => {
    setCollapsedGroups((prev) => {
      const isCurrentlyOpen = !prev[groupKey];

      const newGroups = {
        users: true,
        institutions: true,
        reports: true,
        settings: true,
        exams: true,
      };

      if (!isCurrentlyOpen) {
        newGroups[groupKey] = false;
      }

      return newGroups;
    });
  };

  // useEffect(() => {
  //   initializeAuth();
  // }, []);

  // Determine user role based on current path and user data
  const getUserRole = () => {
    // If userData has role (for madarsa_admin, central_admin, inspector, pariksha_board_convener), use it
    if (userData?.role) {
      return userData.role;
    }

    // If no role in userData, determine from current path
    if (pathname.includes("/dashboard/teacher")) {
      return "teacher";
    }
    if (pathname.includes("/dashboard/student")) {
      return "student";
    }
    if (pathname.includes("/dashboard/madarsa")) {
      return "madarsa_admin";
    }
    if (pathname.includes("/dashboard/inspector")) {
      return "inspector";
    }
    if (pathname.includes("/dashboard/central-admin")) {
      return "central_admin";
    }
    if (pathname.includes("/dashboard/pariksha-board-convener")) {
      return "pariksha_board_convener";
    }

    // Fallback to user.role if available
    return user?.role || null;
  };

  const userRole = getUserRole();

  // Update collapsed groups based on current path
  useEffect(() => {
    if (userRole === "central_admin") {
      // Function to determine which group should be open based on current path
      const getActiveGroup = () => {
        // User Management pages
        if (
          pathname.includes("/admin/students") ||
          pathname.includes("/admin/teachers") ||
          pathname.includes("/admin/applications")
        ) {
          return "users";
        }

        // Institution Management pages
        if (
          pathname.includes("/admin/madarsas") ||
          pathname.includes("/admin/inspectors")
        ) {
          return "institutions";
        }

        // Reports & Reviews pages
        if (
          pathname.includes("/admin/reports") ||
          pathname.includes("/admin/sadar-reviews") ||
          pathname.includes("/admin/analytics")
        ) {
          return "reports";
        }

        // Communication & Settings pages
        if (
          pathname.includes("/admin/notices") ||
          pathname.includes("/admin/config") ||
          pathname.includes("/admin/smart-class") ||
          pathname.includes("/admin/style-guide")
        ) {
          return "settings";
        }

        // Default to users group for dashboard or unknown pages
        return "users";
      };

      const activeGroup = getActiveGroup();
      if (activeGroup) {
        setCollapsedGroups({
          users: activeGroup !== "users",
          institutions: activeGroup !== "institutions",
          reports: activeGroup !== "reports",
          settings: activeGroup !== "settings",
        });
      }
    }
  }, [pathname, userRole]);

  // // Don't render sidebar if still loading or no user
  // if (loading || !user) {
  //   return null;
  // }

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await signOut(auth);

      clearAuth();

      localStorage.removeItem("auth-storage");

      if (userData?.uid) {
        localStorage.removeItem(`inspector_session_${userData.uid}`);
        localStorage.removeItem(`inspector_session_start_${userData.uid}`);
        localStorage.removeItem(`inspector_session_end_${userData.uid}`);
        localStorage.removeItem(`inspector_rules_seen_${userData.uid}`);
        localStorage.removeItem(`inspector_refresh_${userData.uid}`);
      }

      Object.keys(localStorage).forEach((key) => {
        if (userData?.uid && key.includes(userData.uid)) {
          localStorage.removeItem(key);
        }
      });

      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  const getNavigationItems = () => {
    const baseItems = [
      {
        name: "Dashboard",
        href: `/dashboard/${userRole}`,
        icon: Home,
        matchExact: true,
      },
    ];

    switch (userRole) {
      case "student":
        return [
          ...baseItems,
          { name: "Profile", href: "/dashboard/student/profile", icon: User },
          {
            name: "Smart Class",
            href: "/dashboard/student/smart-class",
            icon: Monitor,
          },
          {
            name: "Assignments",
            href: "/dashboard/student/assignments",
            icon: BookOpen,
          },

          // Exam Group
          { type: "separator", label: "Exam Portal", groupKey: "exams" },
          {
            name: "Available Exams",
            href: "/dashboard/student/exam",
            icon: FileCheck,
            group: "exams",
          },
          {
            name: "Exam Notices",
            href: "/dashboard/student/exam/notices",
            icon: Bell,
            group: "exams",
          },
          {
            name: "Exam Timetables",
            href: "/dashboard/student/exam/timetables",
            icon: Calendar,
            group: "exams",
          },
          {
            name: "My Registrations",
            href: "/dashboard/student/exam/registrations",
            icon: UserCheck,
            group: "exams",
          },
          {
            name: "Results & Certificates",
            href: "/dashboard/student/results",
            icon: Award,
            group: "exams",
          },

          {
            name: "Notices",
            href: "/dashboard/student/notices",
            icon: Bell,
          },
        ];

      case "teacher":
        return [
          ...baseItems,
          { name: "Profile", href: "/dashboard/teacher/profile", icon: User },
          {
            name: "Smart Class",
            href: "/dashboard/teacher/smart-class",
            icon: Monitor,
          },
          {
            name: "Students",
            href: "/dashboard/teacher/students",
            icon: Users,
          },
          {
            name: "Assignments",
            href: "/dashboard/teacher/materials",
            icon: BookOpen,
          },
          {
            name: "Notices",
            href: "/dashboard/teacher/notices",
            icon: Bell,
          },
        ];

      case "madarsa_admin": // Changed from madarsa-admin to match your authStore
        return [
          { name: "Dashboard", href: "/dashboard/madarsa", icon: Home },
          {
            name: "Applications",
            href: "/dashboard/madarsa/applications",
            icon: ClipboardList,
          },
          {
            name: "Students",
            href: "/dashboard/madarsa/students",
            icon: Users,
          },
          {
            name: "Teachers",
            href: "/dashboard/madarsa/teachers",
            icon: GraduationCap,
          },

          // Exam Management Group
          { type: "separator", label: "Exam Management", groupKey: "exams" },
          {
            name: "Exams",
            href: "/dashboard/madarsa/exam/exams",
            icon: FilePen,
            group: "exams",
          },
          {
            name: "Registered Students",
            href: "/dashboard/madarsa/exam/students",
            icon: Users,
            group: "exams",
          },
          {
            name: "Exam Notices",
            href: "/dashboard/madarsa/exam/notices",
            icon: Bell,
            group: "exams",
          },
          {
            name: "Exam Timetables",
            href: "/dashboard/madarsa/exam/timetables",
            icon: Calendar,
            group: "exams",
          },

          {
            name: "Thafteesh Review/Report",
            href: "/dashboard/madarsa/thafteesh-review",
            icon: Search,
          },
          { name: "Notices", href: "/dashboard/madarsa/notices", icon: Bell },
          {
            name: "Mekhala Notices",
            href: "/dashboard/madarsa/mekhala-notices",
            icon: Bell,
          },
          {
            name: "Assignments",
            href: "/dashboard/madarsa/assignments",
            icon: FileText,
          },
        ];

      case "central_admin": // Changed from admin to match your authStore
        return [
          // Dashboard
          {
            name: "Dashboard",
            href: "/dashboard/admin",
            icon: Home,
            group: "main",
          },

          // User Management Group
          { type: "separator", label: "User Management", groupKey: "users" },
          {
            name: "All Students",
            href: "/dashboard/admin/students",
            icon: Users,
            group: "users",
          },
          {
            name: "All Teachers",
            href: "/dashboard/admin/teachers",
            icon: UserCheck,
            group: "users",
          },
          {
            name: "Applications",
            href: "/dashboard/admin/applications",
            icon: ClipboardList,
            group: "users",
          },

          // Institution Management Group
          {
            type: "separator",
            label: "Institution Management",
            groupKey: "institutions",
          },
          {
            name: "Madarsa Management",
            href: "/dashboard/admin/madarsas",
            icon: Building,
            group: "institutions",
          },
          {
            name: "Inspectors (Thaftheesh)",
            href: "/dashboard/admin/inspectors",
            icon: Search,
            group: "institutions",
          },
          {
            name: "Mekhala Management",
            href: "/dashboard/admin/districts",
            icon: MapPin,
            group: "institutions",
          },
          {
            name: "Districts Management",
            href: "/dashboard/admin/mekhala",
            icon: Building,
            group: "institutions",
          },

          // Reports & Reviews Group
          {
            type: "separator",
            label: "Reports & Reviews",
            groupKey: "reports",
          },
          {
            name: "Inspection Reports",
            href: "/dashboard/admin/reports",
            icon: FileText,
            group: "reports",
          },
          {
            name: "Sadar Reviews",
            href: "/dashboard/admin/sadar-reviews",
            icon: Search,
            group: "reports",
          },
          {
            name: "Analytics",
            href: "/dashboard/admin/analytics",
            icon: BarChart3,
            group: "reports",
          },
          {
            name: "Activity Logs",
            href: "/dashboard/admin/login-logs",
            icon: Monitor,
            group: "reports",
          },

          // Exam Management Group
          { type: "separator", label: "Exam Management", groupKey: "exams" },
          {
            name: "Exam Overview",
            href: "/dashboard/admin/exam",
            icon: FileCheck,
            group: "exams",
          },
          {
            name: "Manage Exams",
            href: "/dashboard/admin/exam/create",
            icon: Plus,
            group: "exams",
          },
          {
            name: "Board Convener Accounts",
            href: "/dashboard/admin/exam/create-admin",
            icon: UserCheck,
            group: "exams",
          },
          {
            name: "All Registrations",
            href: "/dashboard/admin/exam/registrations",
            icon: Users,
            group: "exams",
          },
          {
            name: "Exam Notices",
            href: "/dashboard/admin/exam/notices",
            icon: Bell,
            group: "exams",
          },
          {
            name: "Exam Timetables",
            href: "/dashboard/admin/exam/timetables",
            icon: Calendar,
            group: "exams",
          },
          {
            name: "Data Sheet",
            href: "/dashboard/admin/exam/data-sheet",
            icon: Calendar,
            group: "exams",
          },

          // Communication & Settings Group
          {
            type: "separator",
            label: "Communication & Settings",
            groupKey: "settings",
          },
          {
            name: "Smart Class Admin",
            href: "/dashboard/admin/smart-class",
            icon: Monitor,
            group: "settings",
          },
          {
            name: "Pariksha Board Conveners",
            href: "/dashboard/admin/pariksha-board-convener",
            icon: UserCheck,
            group: "settings",
          },
          {
            name: "Notices",
            href: "/dashboard/admin/notices",
            icon: Bell,
            group: "settings",
          },
          {
            name: "Configuration",
            href: "/dashboard/admin/config",
            icon: Settings,
            group: "settings",
          },
          {
            name: "Brand Style Guide",
            href: "/dashboard/admin/style-guide",
            icon: Palette,
            group: "settings",
          },
        ];

      case "mekhala_admin":
        return [
          { name: "Dashboard", href: "/dashboard/mekhala", icon: Home },
          {
            name: "Districts",
            href: "/dashboard/mekhala/districts",
            icon: MapPin,
          },
          {
            name: "Madrasas",
            href: "/dashboard/mekhala/madarsas",
            icon: Building,
          },
          {
            name: "Notices",
            href: "/dashboard/mekhala/notices",
            icon: Bell,
          },
          {
            name: "Profile",
            href: "/dashboard/mekhala/profile",
            icon: User,
          },
        ];

      case "inspector":
        return [
          { name: "Dashboard", href: "/dashboard/inspector", icon: Home },
          {
            name: "Assigned Madrasas",
            href: "/dashboard/inspector/madarsas",
            icon: Building,
          },
          {
            name: "Inspection Reports",
            href: "/dashboard/inspector/reports",
            icon: FileText,
          },
          {
            name: "Notices",
            href: "/dashboard/inspector/notices",
            icon: Bell,
          },
        ];

      case "pariksha_board_convener":
        return [
          {
            name: "Dashboard",
            href: "/dashboard/pariksha-board-convener",
            icon: Home,
          },

          // Student Management Group
          {
            type: "separator",
            label: "Student Management",
            groupKey: "students",
          },
          {
            name: "Registered Students",
            href: "/dashboard/pariksha-board-convener/students",
            icon: Users,
            group: "students",
          },
          {
            name: "Unregistered Students",
            href: "/dashboard/pariksha-board-convener/exams",
            icon: UserX,
            group: "students",
          },
          {
            name: "Data Sheet",
            href: "/dashboard/pariksha-board-convener/data-sheet",
            icon: FileSpreadsheet,
            group: "students",
          },

          // Examination Management Group
          {
            type: "separator",
            label: "Examination Management",
            groupKey: "exams",
          },
          {
            name: "Active Exams",
            href: "/dashboard/pariksha-board-convener/exams",
            icon: BookOpen,
            group: "exams",
          },
          // {
          //   name: "Marks Entry",
          //   href: "/dashboard/pariksha-board-convener/marks-entry",
          //   icon: FilePen,
          //   group: "exams",
          // },
          {
            name: "Results Management",
            href: "/dashboard/pariksha-board-convener/results",
            icon: BarChart3,
            group: "exams",
          },
          {
            name: "Profile",
            href: "/dashboard/pariksha-board-convener/profile",
            icon: User,
          },
        ];

      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  // Find the best matching item based on path specificity
  const activeNavItem = navigationItems
    .filter((item) => item.href)
    .filter((item) =>
      item.matchExact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-teal-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-teal-700">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Image src={"/logo.png"} alt="Logo" width={32} height={32} />
            </div>
            <span className="text-white font-semibold text-lg">DKJU</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white hover:bg-teal-700"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-teal-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">
                {userData?.madarsaName ||
                  userData?.fullName ||
                  userData?.name ||
                  user?.displayName ||
                  user?.email
                    .toString()
                    .substring(0, user?.email.indexOf("@")) ||
                  "User"}
              </p>
              <p className="text-teal-300 text-xs capitalize">
                {userRole?.replace(/_/g, " ") === "madarssa admin"
                  ? "Office Admin"
                  : userRole?.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto youtube-scrollbar">
          {navigationItems.map((item, index) => {
            // Handle group separators
            if (item.type === "separator") {
              const isExamGroup = item.groupKey === "exams";
              const isAlwaysOpen = userRole === "student" && isExamGroup;

              const isCollapsed = isAlwaysOpen
                ? false
                : collapsedGroups[item.groupKey];
              const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown;

              return (
                <div
                  key={`separator-${index}`}
                  className="pt-4 pb-2 first:pt-0"
                >
                  {isAlwaysOpen ? (
                    <div className="px-3 py-1 flex items-center justify-between text-left">
                      <h3 className="text-xs font-semibold text-teal-300 uppercase tracking-wider">
                        {item.label}
                      </h3>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleGroup(item.groupKey)}
                      className="w-full px-3 py-1 flex items-center justify-between text-left hover:bg-white/5 rounded transition-colors"
                    >
                      <h3 className="text-xs font-semibold text-teal-300 uppercase tracking-wider">
                        {item.label}
                      </h3>
                      <ChevronIcon className="h-3 w-3 text-teal-400 transition-transform duration-200" />
                    </button>
                  )}
                  <div className="mt-1 border-t border-teal-700/50"></div>
                </div>
              );
            }

            // Handle regular navigation items
            const isActive = activeNavItem?.href === item.href;

            // Check if this item belongs to a collapsed group
            const isAlwaysOpen =
              userRole === "student" && item.group === "exams";
            const isInCollapsedGroup =
              item.group && collapsedGroups[item.group] && !isAlwaysOpen;

            // Don't render items in collapsed groups (except main group)
            if (isInCollapsedGroup && item.group !== "main") {
              return null;
            }

            // Determine if this item should be indented (belongs to a group other than "main")
            const isGroupedItem = item.group && item.group !== "main";

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  // Add left margin/padding for grouped items to show they're under a group
                  isGroupedItem ? "px-3 ml-4" : "px-3",
                  isActive
                    ? "bg-white/10 text-white shadow-sm border border-white/20"
                    : "text-teal-100 hover:bg-white/5 hover:text-white",
                )}
                onClick={onClose}
              >
                <item.icon
                  className={cn(
                    "flex-shrink-0",
                    // Make icons slightly smaller for grouped items
                    isGroupedItem ? "h-3.5 w-3.5" : "h-4 w-4",
                  )}
                />
                <span className="truncate">{item.name}</span>
                {item.badge && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-orange-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-4 py-6 border-t border-teal-700">
          <Button
            variant="ghost"
            className="w-full justify-start text-teal-100 hover:bg-teal-700 hover:text-white"
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            <LogOut className="h-5 w-5 mr-3" />
            {logoutLoading ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
