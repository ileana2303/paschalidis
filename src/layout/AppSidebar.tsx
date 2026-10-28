"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  ChevronDown,
  ClipboardList,
  MoreHorizontal,
  PackageSearch,
  Pencil,
  Layers2,
  LayoutDashboard,
  ListChevronsDownUp,
  ListChevronsUpDown,
  Settings,
  SlidersHorizontal,
  GitCompareArrows,
  Handshake,
  type LucideIcon,
  Send,
  Truck,
  Upload,
  UserSearch,
  UsersRound,
} from "@/lib/icons/lucide";
import { useSidebar } from "../context/SidebarContext";
import { ListTodo, Receipt, ShoppingBasket, Warehouse } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { canAccessPath } from "@/lib/auth/permissions";
import type { AuthPermissions } from "@/lib/auth/types";

type NavSubItem = {
  name: string;
  path: string;
  icon: LucideIcon;
};

type NavItem = {
  name: string;
  icon: LucideIcon;
  path?: string;
  subItems?: NavSubItem[];
};

const navItems: NavItem[] = [
  {
    icon: UserSearch,
    name: "Αναζήτηση Πελατών",
    path: "/search-customer",
  },
  {
    icon: PackageSearch,
    name: "Αναζήτηση Ανταλλακτικών",
    path: "/search-parts",
  },
  {
    icon: LayoutDashboard,
    name: "Επεξεργασία Αποθήκης",
    subItems: [
      {
        icon: Layers2,
        name: "Ορισμός Ομοίων",
        path: "/search-set-similar",
      },
      {
        icon: Pencil,
        name: "Επεξεργασία Ειδών",
        path: "/edit-items",
      },
      {
        icon: SlidersHorizontal,
        name: "Διαχείριση Suffix",
        path: "/suffix-management",
      },
      {
        icon: UsersRound,
        name: "Διαχείριση Group",
        path: "/group-management",
      },
      {
        icon: Handshake,
        name: "Διαχείριση B2B",
        path: "/b2b-management",
      },
      {
        icon: Truck,
        name: "Λίστα Προμηθευτών",
        path: "/suppliers-list",
      },
    ],
  },
  {
    icon: Warehouse,
    name: "Ανατροφοδοσία",
    subItems: [
      {
        icon: Truck,
        name: "Ανατροφοδοσία Καταστήματος",
        path: "/stock-feedback",
      },
      {
        icon: ClipboardList,
        name: "Λίστα Ανατροφοδοσίας",
        path: "/stock-list",
      },
    ],
  },
  {
    icon: GitCompareArrows,
    name: "Ενδοδιακίνηση",
    subItems: [
      {
        icon: GitCompareArrows,
        name: "Ενδοδιακίνηση Ανταλλακτικών",
        path: "/endo/endo-parts",
      },
      {
        icon: Send,
        name: "Εισερχόμενα Αιτήματα",
        path: "/endo/endo-lists-received",
      },
      {
        icon: ClipboardList,
        name: "Εξερχόμενα Αιτήματα",
        path: "/endo/endo-lists-requested",
      },
    ],
  },
  {
    icon: ShoppingBasket,
    name: "Καλάθια Πελατών",
    path: "/all-baskets",
  },
  {
    icon: Upload,
    name: "Ανέβασμα Τιμοκαταλόγου",
    path: "/supplier-price-catalog-upload",
  },
  {
    icon: ListTodo,
    name: "Picking List",
    path: "/picking-list",
  },
  {
    icon: Settings,
    name: "Διαχείριση Καταστημάτων",
    subItems: [
      {
        name: "Κεντρικός Εφοδιασμός",
        path: "/company-stock",
        icon: Warehouse,
      },
      {
        name: "Καλάθια Εταιρίας",
        path: "/company-stock-requests",
        icon: ShoppingBasket,
      },
      {
        name: "Αιτήματα Ανατροφοδοσίας",
        path: "/stock-requests",
        icon: ClipboardList,
      },
      {
        name: "Αιτήματα Τιμών",
        path: "/price-requests",
        icon: BadgePercent,
      },
      {
        name: "Διαμόρφωση Τιμών",
        path: "/base-price-pur",
        icon: Receipt,
      },
    ],
  },
];

const mobileNavItems: NavItem[] = [
  {
    icon: ListTodo,
    name: "Picking List",
    path: "/picking-list",
  },
  {
    icon: BadgePercent,
    name: "Αιτήματα Τιμών",
    path: "/price-requests",
  },
];

/** Keeps the pages the user may open and drops groups left without any. */
function filterNavItems(
  items: NavItem[],
  permissions: AuthPermissions | null
): NavItem[] {
  return items.flatMap((item) => {
    if (!item.subItems) {
      return item.path && canAccessPath(permissions, item.path) ? [item] : [];
    }

    const subItems = item.subItems.filter((subItem) =>
      canAccessPath(permissions, subItem.path)
    );
    return subItems.length > 0 ? [{ ...item, subItems }] : [];
  });
}

const collapsibleGroupNames = navItems
  .filter((item) => item.subItems)
  .map((item) => item.name);

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobile, isMobileOpen, isHovered, setIsHovered } =
    useSidebar();
  const pathname = usePathname();
  const permissions = useAuthStore((state) => state.permissions);
  const visibleNavItems = React.useMemo(
    () => filterNavItems(isMobile ? mobileNavItems : navItems, permissions),
    [isMobile, permissions]
  );
  const isActive = (path: string) => path === pathname;
  const isSidebarExpanded = isExpanded || isHovered || isMobileOpen;
  const [expandedGroups, setExpandedGroups] = React.useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      collapsibleGroupNames.map((name) => [name, true])
    )
  );
  const areAllGroupsExpanded = collapsibleGroupNames.every(
    (name) => expandedGroups[name]
  );

  const toggleGroup = (name: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [name]: !current[name],
    }));
  };

  const toggleAllGroups = () => {
    const nextExpandedState = !areAllGroupsExpanded;

    setExpandedGroups(
      Object.fromEntries(
        collapsibleGroupNames.map((name) => [name, nextExpandedState])
      )
    );
  };

  const renderMenuItems = (navItems: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav) => {
        const Icon = nav.icon;
        const isManagement = nav.name === "Διαχείριση Καταστημάτων";
        const visibleSubItems = nav.subItems;
        const hasActiveSubItem =
          visibleSubItems?.some((subItem) => isActive(subItem.path)) ?? false;
        const hasActivePath = nav.path ? isActive(nav.path) : false;
        const isGroupActive = hasActivePath || hasActiveSubItem;
        const isGroupExpanded = expandedGroups[nav.name] ?? true;

        if (isManagement) {
          return (
            <li key={nav.name}>
              {isSidebarExpanded ? (
                <div className="rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200/60 dark:border-gray-800/60 shadow-sm backdrop-blur-sm p-4">
                  <button
                    type="button"
                    onClick={() => toggleGroup(nav.name)}
                    aria-expanded={isGroupExpanded}
                    aria-controls={`sidebar-group-${nav.name}`}
                    className={`-mx-4 -mt-4 flex w-[calc(100%+2rem)] items-center justify-between px-4 py-2 text-left transition-colors hover:bg-brand-100/70 dark:hover:bg-brand-900/30 ${isGroupExpanded
                      ? "mb-3 rounded-t-2xl border-b border-gray-200/60 dark:border-gray-800/60"
                      : "-mb-4 rounded-2xl"
                      } bg-brand-100/40 dark:bg-brand-900/20`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500/10 dark:bg-brand-500/20">
                        <Icon className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                      </div>

                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-200">
                        {nav.name}
                      </h3>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-brand-600 transition-transform duration-200 dark:text-brand-300 ${isGroupExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isGroupExpanded && (
                    <div
                      id={`sidebar-group-${nav.name}`}
                      className="flex flex-col gap-1"
                    >
                      {visibleSubItems?.map((subItem) => {
                        const SubItemIcon = subItem.icon;

                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.path}
                            prefetch={false}
                            className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-200 active:scale-[0.98]

            ${isActive(subItem.path)
                                ? "bg-white text-brand-700 shadow-sm dark:bg-brand-800/40 dark:text-brand-100"
                                : "text-gray-600 dark:text-gray-400 hover:bg-white/70 hover:text-gray-600 dark:hover:bg-white/[0.05] dark:hover:text-gray-300"}
          `}
                          >
                            <SubItemIcon className="h-3.5 w-3.5 shrink-0" />

                            <span className="whitespace-nowrap font-normal">{subItem.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(nav.name)}
                    aria-expanded={isGroupExpanded}
                    aria-controls={`sidebar-group-${nav.name}`}
                    aria-label={`${isGroupExpanded ? "Σύμπτυξη" : "Ανάπτυξη"} ${nav.name}`}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${isGroupActive
                      ? "bg-brand-500 text-white shadow-sm dark:bg-brand-600"
                      : "text-gray-500"
                      }`}
                    title={nav.name}
                  >
                    <Icon className="h-5 w-5" />
                  </button>

                  {isGroupExpanded &&
                    visibleSubItems?.map((subItem) => {
                      const SubItemIcon = subItem.icon;

                      return (
                        <Link
                          key={subItem.name}
                          href={subItem.path}
                          prefetch={false}
                          aria-label={subItem.name}
                          title={subItem.name}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${isActive(subItem.path)
                            ? "bg-brand-500 text-white shadow-sm dark:bg-brand-600"
                            : "text-gray-500 hover:bg-white/70 hover:text-brand-600 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-gray-300"
                          }`}
                        >
                          <SubItemIcon className="h-4 w-4" />
                        </Link>
                      );
                    })}
                </div>
              )}
            </li>
          );
        }

        return (
          <li key={nav.name}>
            {nav.subItems ? (
              nav.path ? (
                <div
                  className={`group flex items-center rounded-xl text-sm transition-all duration-200
                    ${isGroupActive
                      ? "bg-brand-500 text-white shadow-sm dark:bg-brand-600"
                      : "text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/[0.05] hover:shadow-sm"} hover:translate-x-[2px]`}
                >
                  <Link
                    href={nav.path}
                    prefetch={false}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all
                      ${isGroupActive
                          ? "bg-white/20 text-white"
                          : "text-gray-500 group-hover:bg-brand-50 group-hover:text-brand-600"}
                      `}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    {isSidebarExpanded && <span className="whitespace-nowrap">{nav.name}</span>}
                  </Link>
                  {isSidebarExpanded && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(nav.name)}
                      aria-expanded={isGroupExpanded}
                      aria-controls={`sidebar-group-${nav.name}`}
                      aria-label={`${isGroupExpanded ? "Σύμπτυξη" : "Ανάπτυξη"} ${nav.name}`}
                      className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${isGroupExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                </div>
              ) : (
                isSidebarExpanded ? (
                  <div
                    className={`flex w-full items-center gap-2 px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${isGroupActive
                      ? "text-brand-700 dark:text-brand-300"
                      : "text-gray-500 dark:text-gray-400"}`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isGroupActive
                        ? "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                        : "bg-white/60 text-gray-500 dark:bg-white/[0.04] dark:text-gray-400"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 whitespace-nowrap text-left">{nav.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleGroup(nav.name)}
                      aria-expanded={isGroupExpanded}
                      aria-controls={`sidebar-group-${nav.name}`}
                      aria-label={`${isGroupExpanded ? "Σύμπτυξη" : "Ανάπτυξη"} ${nav.name}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/70 hover:text-brand-700 dark:hover:bg-white/[0.07] dark:hover:text-brand-300"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${isGroupExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(nav.name)}
                    aria-expanded={isGroupExpanded}
                    aria-controls={`sidebar-group-${nav.name}`}
                    aria-label={`${isGroupExpanded ? "Σύμπτυξη" : "Ανάπτυξη"} ${nav.name}`}
                    title={nav.name}
                    className="group flex w-full justify-center py-1.5"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${isGroupActive
                        ? "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                        : "bg-white/60 text-gray-500 group-hover:bg-white dark:bg-white/[0.04] dark:text-gray-400 dark:group-hover:bg-white/[0.07]"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  </button>
                )
              )
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  prefetch={false}
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

                  {isSidebarExpanded && (
                    <span className="whitespace-nowrap">{nav.name}</span>
                  )}
                </Link>
              )
            )}

            {nav.subItems && isGroupExpanded && (
              <ul
                id={`sidebar-group-${nav.name}`}
                className={isSidebarExpanded
                  ? "mt-1 ml-3 space-y-1 border-l-2 border-gray-200 pl-2 dark:border-gray-800"
                  : "mt-2 flex flex-col items-center gap-1"}
              >
                {visibleSubItems?.map((subItem) => {
                  const SubItemIcon = subItem.icon;

                  return (
                    <li key={subItem.name}>
                      <Link
                        href={subItem.path}
                        prefetch={false}
                        aria-label={subItem.name}
                        title={subItem.name}
                        className={`group flex items-center rounded-lg text-[13px] transition-all duration-200 ${isSidebarExpanded
                          ? "gap-1.5 whitespace-nowrap px-1.5 py-2"
                          : "h-10 w-10 justify-center"
                          }
                            ${isActive(subItem.path)
                            ? isSidebarExpanded
                              ? "bg-white text-brand-700 shadow-sm dark:bg-brand-800/40 dark:text-brand-100"
                              : "bg-brand-500 text-white shadow-sm dark:bg-brand-600"
                            : "text-gray-600 dark:text-gray-400 hover:bg-white/70 hover:text-gray-600 dark:hover:bg-white/[0.05] dark:hover:text-gray-300"}
                            `}
                      >
                        <SubItemIcon className={`${isSidebarExpanded ? "h-3.5 w-3.5" : "h-4 w-4"} shrink-0`} />
                        {isSidebarExpanded && (
                          <span className="whitespace-nowrap font-normal">{subItem.name}</span>
                        )}
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

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-2 px-5 left-2 border border-gray-200/60 bg-brand-100/40 dark:border-gray-800 dark:bg-white/[0.03] rounded-2xl shadow-sm dark:shadow-none backdrop-blur-sm text-gray-900 dark:text-gray-100 h-screen transition-all duration-300 ease-in-out z-50
        ${isSidebarExpanded ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${isSidebarExpanded ? "justify-start" : "lg:justify-center"
          }`}
      >
        <Link href="/" prefetch={false}>
          <div
            className={`relative h-10 transition-all duration-300 ${isSidebarExpanded ? "w-[150px]" : "w-10"
              }`}
          >
            <Image
              className={`absolute left-0 top-1/2 -translate-y-1/2 dark:hidden transition-opacity duration-200 ${isSidebarExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              src="/images/logo/logo.png"
              alt="Logo"
              width={154}
              height={32}
              loading="eager"
              style={{ width: "150px", height: "auto" }}
            />
            <Image
              className={`absolute left-0 top-1/2 -translate-y-1/2 hidden dark:block transition-opacity duration-200 ${isSidebarExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
              src="/images/logo/logo-dark.png"
              alt="Logo"
              width={154}
              height={32}
              style={{ width: "150px", height: "auto" }}
            />
            <Image
              className={`absolute left-0 top-1/2 -translate-y-1/2 transition-opacity duration-200 ${isSidebarExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
              src="/images/logo/logo-icon.png"
              alt="Logo"
              width={40}
              height={40}
            />
          </div>
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <div
                className={`mb-4 flex min-h-8 items-center ${isSidebarExpanded ? "justify-between" : "justify-center"}`}
              >
                <h2 className="flex text-xs uppercase leading-[20px] text-gray-400">
                  {isSidebarExpanded ? (
                    "Menu"
                  ) : (
                    <MoreHorizontal className="h-5 w-5" />
                  )}
                </h2>
                {isSidebarExpanded && (
                  <button
                    type="button"
                    onClick={toggleAllGroups}
                    aria-label={
                      areAllGroupsExpanded
                        ? "Σύμπτυξη όλων των ομάδων"
                        : "Ανάπτυξη όλων των ομάδων"
                    }
                    title={
                      areAllGroupsExpanded
                        ? "Σύμπτυξη όλων"
                        : "Ανάπτυξη όλων"
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/70 hover:text-brand-600 dark:hover:bg-white/[0.05] dark:hover:text-gray-200"
                  >
                    {areAllGroupsExpanded ? (
                      <ListChevronsDownUp className="h-4 w-4" />
                    ) : (
                      <ListChevronsUpDown className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              {renderMenuItems(visibleNavItems)}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
