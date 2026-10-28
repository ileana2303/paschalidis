"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { canAccessPath, getFirstAllowedPath } from "@/lib/auth/permissions";
import { useAuthStore } from "@/stores/authStore";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const permissions = useAuthStore((state) => state.permissions);

  useEffect(() => {
    if (permissions && !canAccessPath(permissions, pathname)) {
      router.replace(getFirstAllowedPath(permissions));
    }
  }, [pathname, permissions, router]);

  const sidebarOffsetClass = isExpanded || isHovered ? "lg:ml-[306px]" : "lg:ml-[106px]";

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : sidebarOffsetClass;

  return (
    <div className="min-h-screen print:block xl:flex">
      <div className="print:hidden">
        <AppSidebar />
      </div>
      <div className="print:hidden">
        <Backdrop />
      </div>
      <div
        className={`min-w-0 flex-1 transition-all duration-300 ease-in-out print:ml-0 print:transition-none ${mainContentMargin}`}
      >
        <div className="print:hidden">
          <AppHeader />
        </div>
        <div className="mx-auto min-w-0 w-full max-w-[1800px] p-4 print:max-w-none print:p-0 md:p-6 xl:max-w-none xl:px-8 2xl:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
