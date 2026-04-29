"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BookOpenText,
  ClipboardList,
  MoreHorizontal,
  PackageSearch,
  Search,
  Settings,
  Users,
  GitCompareArrows,
  type LucideIcon,
} from "@/app/lib/lucide";
import { useSidebar } from "../context/SidebarContext";

type NavSubItem = {
  name: string;
  path: string;
  icon?: LucideIcon;
  pro?: boolean;
  new?: boolean;
};

type NavItem = {
  name: string;
  icon: LucideIcon;
  path?: string;
  subItems?: NavSubItem[];
};

const navItems: NavItem[] = [
  {
    icon: Search,
    name: "Αναζήτηση Πελατών",
    path: "/search-customer",
  },
  {
    icon: PackageSearch,
    name: "Αναζήτηση Ανταλλακτικών",
    path: "/search-parts",
  },
  {
    icon: GitCompareArrows,
    name: "Ενδοδιακίνηση Ανταλλακτικών",
    path: "/endo-parts",
    subItems: [
      {
        icon: ClipboardList,
        name: "Ενδολίστα Παραλαβών",
        path: "/endo-lists-requested",
      },
      {
        icon: ClipboardList,
        name: "Ενδολίστα Αποστολών",
        path: "/endo-lists-received",
      },
    ],
  },
  {
    icon: Users,
    name: "Καλάθια Πελατών",
    path: "/all-baskets",
  },
  {
    icon: ClipboardList,
    name: "Ανατροφοδοσία Καταστήματος",
    path: "/order-feedback",
  },
  {
    icon: BookOpenText,
    name: "Κατάλογοι",
    path: "/catalogs",
  },
  {
    icon: Settings,
    name: "Διαχείριση Καταστημάτων",
    subItems: [
      {
        name: "Αιτήματα Ανατροφοδοσίας",
        path: "/stock-requests",
        icon: ClipboardList,
      },
      {
        name: "Αιτήματα εκπτώσεων",
        path: "/discount-requests",
        icon: BadgePercent,
      },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const isActive = (path: string) => path === pathname;

  const renderMenuItems = (navItems: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav) => {
        const Icon = nav.icon;
        const isManagement = nav.name === "Διαχείριση Καταστημάτων";
        const hasActiveSubItem =
          nav.subItems?.some((subItem) => isActive(subItem.path)) ?? false;
        const hasActivePath = nav.path ? isActive(nav.path) : false;
        const isGroupActive = hasActivePath || hasActiveSubItem;

        if (isManagement) {
          return (
            <li key={nav.name}>
              {(isExpanded || isHovered || isMobileOpen) ? (
                <div className="rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/60 dark:border-gray-800/60 shadow-sm backdrop-blur-sm p-4">

                  <div className="-mx-4 -mt-4 mb-3 px-4 py-2 rounded-t-2xl border-b border-gray-200/60 dark:border-gray-800/60 bg-brand-100/40 dark:bg-brand-900/20">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500/10 dark:bg-brand-500/20">
                        <Icon className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                      </div>

                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-200">
                        {nav.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    {nav.subItems?.map((subItem) => {
                      const SubItemIcon = subItem.icon;

                      return (
                        <Link
                          key={subItem.name}
                          href={subItem.path}
                          className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-200 active:scale-[0.98]

            ${isActive(subItem.path)
                              ? "bg-white text-brand-700 shadow-sm dark:bg-brand-800/40 dark:text-brand-100"
                              : "text-gray-600 dark:text-gray-400 hover:bg-white/70 hover:text-gray-600 dark:hover:bg-white/[0.05] dark:hover:text-gray-300"}
          `}
                        >
                          {SubItemIcon && (
                            <SubItemIcon className="h-3.5 w-3.5 shrink-0" />
                          )}

                          <span className="font-normal">{subItem.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <Icon className="w-5 h-5 text-gray-500" />
                </div>
              )}
            </li>
          );
        }

        return (
          <li key={nav.name}>
            {nav.subItems ? (
              nav.path ? (
                <Link
                  href={nav.path}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                    ${isGroupActive
                      ? "bg-brand-500 text-white shadow-sm dark:bg-brand-600"
                      : "text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/[0.05] hover:shadow-sm"} hover:translate-x-[2px]`}
                >
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all
                    ${isGroupActive
                        ? "bg-white/20 text-white"
                        : "text-gray-500 group-hover:text-brand-600 group-hover:bg-brand-50"}
                    `}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </Link>
              ) : (
                <div
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                    ${isGroupActive
                      ? "bg-brand-500 text-white shadow-sm dark:bg-brand-600"
                      : "text-gray-600 dark:text-gray-300"}
                    ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                >
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all
                    ${isGroupActive
                        ? "bg-white/20 text-white"
                        : "text-gray-500"}
                    `}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </div>
              )
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 
                    ${isActive(nav.path!)
                      ? "bg-brand-500 text-white shadow-sm dark:bg-brand-600"
                      : "text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/[0.05] hover:shadow-sm"} hover:translate-x-[2px]`}
                >
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all
                  ${isActive(nav.path!)
                      ? "bg-white/20 text-white"
                      : "text-gray-500 group-hover:text-brand-600 group-hover:bg-brand-50"}
                      `}>
                    <Icon className="h-4 w-4" />
                  </span>

                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </Link>
              )
            )}

            {nav.subItems &&
              nav.name !== "Διαχείριση Καταστημάτων" &&
              (isExpanded || isHovered || isMobileOpen) && (
                <ul className="mt-2 ml-10 pl-3 border-l border-brand-200/70 dark:border-brand-800/60 space-y-1">
                  {nav.subItems.map((subItem) => {
                    const SubItemIcon = subItem.icon;

                    return (
                      <li key={subItem.name}>
                        <Link
                          href={subItem.path}
                          className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-200
                            ${isActive(subItem.path)
                              ? "bg-white text-brand-700 shadow-sm dark:bg-brand-800/40 dark:text-brand-100"
                              : "text-gray-600 dark:text-gray-400 hover:bg-white/70 hover:text-gray-600 dark:hover:bg-white/[0.05] dark:hover:text-gray-300"}
                            `}
                        >
                          {SubItemIcon && (
                            <SubItemIcon className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="font-normal">{subItem.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
          </li>
        );
      })}
    </ul>
  );

  const isSidebarExpanded = isExpanded || isHovered || isMobileOpen;
  const showExpandedLogo = isSidebarExpanded;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-2 px-5 left-2 bg-brand-100/40 dark:bg-gray-900/80 rounded-2xl shadow-sm dark:shadow-none dark:border-gray-800/60 backdrop-blur-sm text-gray-900 dark:text-gray-100 h-screen transition-all duration-300 ease-in-out z-50
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${showExpandedLogo ? "justify-start" : "lg:justify-center"
          }`}
      >
        <Link href="/">
          <div
            className={`relative h-10 transition-all duration-300 ${showExpandedLogo ? "w-[150px]" : "w-10"
              }`}
          >
            <Image
              className={`absolute left-0 top-1/2 -translate-y-1/2 dark:hidden transition-opacity duration-200 ${showExpandedLogo ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              src="/images/logo/logo.png"
              alt="Logo"
              width={154}
              height={32}
              style={{ width: "150px", height: "auto" }}
            />
            <Image
              className={`absolute left-0 top-1/2 -translate-y-1/2 hidden dark:block transition-opacity duration-200 ${showExpandedLogo ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              src="/images/logo/logo-dark.png"
              alt="Logo"
              width={154}
              height={32}
              style={{ width: "150px", height: "auto" }}
            />
            <Image
              className={`absolute left-0 top-1/2 -translate-y-1/2 transition-opacity duration-200 ${showExpandedLogo ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              src="/images/logo/logo-icon.png"
              alt="Logo"
              width={40}
              height={40}
            />
          </div>
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <MoreHorizontal className="h-5 w-5" />
                )}
              </h2>
              {renderMenuItems(navItems)}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
