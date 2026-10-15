"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

type SidebarContextType = {
  isExpanded: boolean;
  isMobile: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setIsHovered: (isHovered: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let previousViewport: "mobile" | "laptop" | "desktop" | null = null;

    const handleResize = () => {
      const viewportWidth = window.innerWidth;
      const mobile = viewportWidth < 1024;
      const isLaptopDisplay = window.screen.width <= 2056;
      const laptop =
        viewportWidth >= 1024 &&
        (viewportWidth < 1920 || isLaptopDisplay);
      const viewport = mobile ? "mobile" : laptop ? "laptop" : "desktop";

      setIsMobile(mobile);

      if (viewport === "laptop") {
        setIsExpanded(false);
      } else if (viewport === "desktop" && viewport !== previousViewport) {
        setIsExpanded(true);
      }

      if (viewport !== previousViewport) {
        previousViewport = viewport;
      }

      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsExpanded((prev) => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  return (
    <SidebarContext.Provider
      value={{
        isExpanded: isMobile ? false : isExpanded,
        isMobile,
        isMobileOpen,
        isHovered,
        toggleSidebar,
        toggleMobileSidebar,
        setIsHovered,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
