"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BookOpenText,
  ChevronDown,
  ClipboardList,
  MoreHorizontal,
  PackageSearch,
  Search,
  Settings,
  Users,
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

  const renderMenuItems = (navItems: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => {
        const Icon = nav.icon;
        const isManagement = nav.name === "Διαχείριση Καταστημάτων";

        if (isManagement) {
          return (
            <li key={nav.name}>
              {(isExpanded || isHovered || isMobileOpen) ? (
                <div className="rounded-2xl border border-brand-200 dark:border-brand-800 bg-white/70 dark:bg-white/[0.03] p-4 shadow-sm">
                  <div className="-mx-4 -mt-4 mb-3 rounded-t-2xl border-b border-brand-200/80 bg-brand-100/60 px-4 py-2 dark:border-brand-700/70 dark:bg-brand-900/20">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500/10 dark:bg-brand-500/20">
                        <Icon className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                      </div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-700 dark:text-brand-200">
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
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                          ${isActive(subItem.path)
                              ? "bg-brand-500 text-white"
                              : "hover:bg-brand-100 dark:hover:bg-white/[0.05]"
                            }`}
                        >
                          {SubItemIcon && (
                            <SubItemIcon className="w-4 h-4 shrink-0" />
                          )}
                          {subItem.name}
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
              <button
                onClick={() => handleSubmenuToggle(index)}
                className={`menu-item group ${openSubmenu === index
                    ? "menu-item-active"
                    : "menu-item-inactive"
                  } cursor-pointer ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                  }`}
              >
                <span
                  className={`${openSubmenu === index
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                    }`}
                >
                  <Icon className="h-5 w-5" />
                </span>

                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}

                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDown
                    className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu === index ? "rotate-180 text-white" : ""
                      }`}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`menu-item group ${isActive(nav.path)
                      ? "menu-item-active"
                      : "menu-item-inactive"
                    }`}
                >
                  <span
                    className={`${isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>

                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </Link>
              )
            )}

            {/* keep dropdown ONLY for other items */}
            {nav.subItems &&
              nav.name !== "Διαχείριση Καταστημάτων" &&
              (isExpanded || isHovered || isMobileOpen) && (
                <div
                  ref={(el) => {
                    subMenuRefs.current[String(index)] = el;
                  }}
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    height:
                      openSubmenu === index
                        ? `${subMenuHeight[String(index)]}px`
                        : "0px",
                  }}
                >
                  <ul className="mt-2 space-y-1 ml-9">
                    {nav.subItems.map((subItem) => {
                      const SubItemIcon = subItem.icon;

                      return (
                        <li key={subItem.name}>
                          <Link
                            href={subItem.path}
                            className={`menu-dropdown-item ${isActive(subItem.path)
                                ? "menu-dropdown-item-active"
                                : "menu-dropdown-item-inactive"
                              }`}
                          >
                            {SubItemIcon && (
                              <SubItemIcon className="h-4 w-4 shrink-0" />
                            )}
                            {subItem.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
          </li>
        );
      })}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);
  const isSidebarExpanded = isExpanded || isHovered || isMobileOpen;
  const showExpandedLogo = isSidebarExpanded;

  useEffect(() => {
    let nextOpenSubmenu: number | null = null;
    navItems.forEach((nav, index) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            nextOpenSubmenu = index;
          }
        });
      }
    });

    const timeoutId = window.setTimeout(() => {
      setOpenSubmenu((currentOpenSubmenu) => {
        if (currentOpenSubmenu === nextOpenSubmenu) {
          return currentOpenSubmenu;
        }

        return nextOpenSubmenu;
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = String(openSubmenu);
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (prevOpenSubmenu === index) {
        return null;
      }
      return index;
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-4 px-5 left-4 bg-brand-50 rounded-2xl  dark:border-gray-800 dark:bg-white/[0.03] text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
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
