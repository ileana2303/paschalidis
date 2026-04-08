"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const sidebarOffsetClass = isExpanded || isHovered ? "lg:ml-[306px]" : "lg:ml-[106px]";

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : sidebarOffsetClass;

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="mx-auto w-full max-w-[1800px] p-4 md:p-6 xl:max-w-none xl:px-8 2xl:px-10">{children}</div>
      </div>
    </div>
  );
}
