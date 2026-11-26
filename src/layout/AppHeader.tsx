"use client";
import { ThemeToggleButton } from "@/components/template-components/common/ThemeToggleButton";
import UserDropdown from "@/components/header/UserDropdown";
import BranchToggle from "@/components/header/BranchToggle";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import { useSidebar } from "@/context/SidebarContext";
import { Ellipsis, Menu, X } from "@/lib/icons/lucide";
import type { AppNotification } from "@/lib/notifications";
import React, { useState } from "react";

const AppHeader: React.FC<{ notifications?: { items: AppNotification[]; hasLoaded: boolean } }> = ({
  notifications,
}) => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  return (
    <header className="sticky top-0 flex w-full bg-white border-b border-gray-200/40 dark:border-gray-800 dark:bg-gray-900 z-99999">
      <div className="flex w-full flex-wrap items-center gap-x-2 px-3 py-3 sm:gap-x-4 lg:flex-nowrap lg:px-6 lg:py-4">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
          onClick={handleToggle}
          aria-label="Toggle Sidebar"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-4 w-4" />}
        </button>

        <div
          className={`${isApplicationMenuOpen ? "flex" : "hidden"} order-last basis-full items-center justify-between gap-4 border-t border-gray-200 pt-3 mt-3 dark:border-gray-800 lg:order-none lg:ml-auto lg:mt-0 lg:flex lg:basis-auto lg:border-0 lg:pt-0`}
        >
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            {notifications && <NotificationDropdown {...notifications} />}
            <button
              type="button"
              onClick={toggleApplicationMenu}
              aria-label="Μενού εφαρμογής"
              aria-expanded={isApplicationMenuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
            >
              <Ellipsis className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-2 2xsm:gap-3">
            <ThemeToggleButton />
          </div>
          <BranchToggle />
          <UserDropdown />

        </div>
      </div>
    </header>
  );
};

export default AppHeader;
