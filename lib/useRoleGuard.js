"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import useAuthStore from "@/lib/authStore";

const ROLE_DASHBOARD_MAP = {
  central_admin: "/dashboard/admin",
  admin: "/dashboard/admin",
  madarsa_admin: "/dashboard/madarsa",
  inspector: "/dashboard/inspector",
  mekhala_admin: "/dashboard/mekhala",
  pariksha_board_convener: "/dashboard/pariksha-board-convener",
  teacher: "/dashboard/teacher",
  student: "/dashboard/student",
};

export function useRoleGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { userData, loading } = useAuthStore();

  useEffect(() => {
    if (!pathname.startsWith("/dashboard/")) return;

    // if (!userData) {
    //   const timer = setTimeout(() => {
    //     router.replace("/");
    //   }, 5000);

    //   return () => clearTimeout(timer);
    // }

    if (loading || !userData?.role) return;

    const ownedBasePath = ROLE_DASHBOARD_MAP[userData.role];
    if (!ownedBasePath) return;

    if (!pathname.startsWith(ownedBasePath)) {
      router.replace(ownedBasePath);
    }
  }, [loading, userData, pathname, router]);
}
