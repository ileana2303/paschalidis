import GridShape from "@/components/template components/common/GridShape";
import ThemeTogglerTwo from "@/components/template components/common/ThemeTogglerTwo";
import Image from "next/image";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900 sm:p-0">
        {children}
        <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
          <div className="relative items-center justify-center flex z-1">
            
            <div className="flex flex-col items-center max-w-xs gap-5 px-6">
              <Image
                src="/images/logo/logo-dark.png"
                alt="Paschalidis ERP"
                width={300}
                height={86}
                priority
                className="h-auto w-64"
              />
              <p className="text-center text-sm leading-6 text-white/70 dark:text-gray-300">
                Πλατφόρμα διαχείρισης ανταλλακτικών και παραγγελιών
              </p>
            </div>
          </div>
        </div>
        <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
