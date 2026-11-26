"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useAppNotifications } from "@/hooks/useAppNotifications";
import {
  canAccessPath,
  getFirstAllowedPath,
  isPathAvailableForBranch,
} from "@/lib/auth/permissions";
import { useAuthStore } from "@/stores/authStore";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isMobileOpen } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const permissions = useAuthStore((state) => state.permissions);
  const activeBranch = useAuthStore((state) => state.user?.mainBranch ?? null);
  const notifications = useAppNotifications();

  useEffect(() => {
    if (permissions && !canAccessPath(permissions, pathname, activeBranch)) {
      router.replace(getFirstAllowedPath(permissions, activeBranch));
    }
  }, [activeBranch, pathname, permissions, router]);

  const sidebarOffsetClass = isExpanded ? "lg:ml-[306px]" : "lg:ml-[106px]";

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : sidebarOffsetClass;

  return (
    <div className="min-h-screen print:block xl:flex">
      <div className="print:hidden">
        <AppSidebar notificationCounts={notifications.countsByPath} />
      </div>
      <div className="print:hidden">
        <Backdrop />
      </div>
      <div
        className={`min-w-0 flex-1 transition-all duration-300 ease-in-out print:ml-0 print:transition-none ${mainContentMargin}`}
      >
        <div className="print:hidden">
          <AppHeader notifications={notifications.enabled ? notifications : undefined} />
        </div>
        <div className="mx-auto min-w-0 w-full max-w-[1800px] p-4 print:max-w-none print:p-0 md:p-6 xl:max-w-none xl:px-8 2xl:px-10">
          {isPathAvailableForBranch(pathname, activeBranch) ? children : null}
        </div>
      </div>
    </div>
  );
}
