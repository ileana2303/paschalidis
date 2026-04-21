"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";

export default function UserMetaCard() {
  const user = useAuthStore((state) => state.user);

  const primaryBranchName = useMemo(() => {
    if (!user) return "—";

    const currentBranchCode = user.s1code?.trim();
    const currentBranch = user.listBranches.find(
      (branch) => branch.s1Code?.trim() === currentBranchCode
    );

    if (currentBranch?.name?.trim()) {
      return currentBranch.name.trim();
    }

    const firstNamedBranch = user.listBranches.find((branch) =>
      Boolean(branch.name?.trim())
    );

    return firstNamedBranch?.name?.trim() || "—";
  }, [user]);

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 dark:border-gray-800">
            {/* <Image width={64} height={64} src="/images/user/owner.jpg" alt="user" /> */}
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {user?.fullName?.trim() || "—"}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {user?.role?.trim() || "—"}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Branch
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {primaryBranchName}
          </p>
        </div>
      </div>
    </div>
  );
}
