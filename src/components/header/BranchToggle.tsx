"use client";

import { MapPin } from "@/app/lib/lucide";
import { useAuthStore } from "@/stores/authStore";
import { useMemo } from "react";

type BranchOption = {
  name: string;
  s1Code: string;
};

export default function BranchToggle() {
  const user = useAuthStore((state) => state.user);

  const branchName = useMemo(() => {
    if (!user) return "—";

    const seenBranchCodes = new Set<string>();

    const branchOptions: BranchOption[] = user.listBranches
      .map((branch) => ({
        name: branch.name?.trim() || "",
        s1Code: branch.s1Code?.trim() || "",
      }))
      .filter((branch) => {
        if (!branch.name || !branch.s1Code || seenBranchCodes.has(branch.s1Code)) {
          return false;
        }

        seenBranchCodes.add(branch.s1Code);
        return true;
      });

    const preferredBranchName = branchOptions.find(
      (branch) => branch.s1Code === user.s1code?.trim()
    )?.name;

    return preferredBranchName || branchOptions[0]?.name || "—";
  }, [user]);

  if (!user) return null;

  return (
    <div
      aria-label="User branch"
      className="inline-flex h-11 max-w-[280px] items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
      title={branchName}
    >
      <MapPin className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{branchName}</span>
    </div>
  );
}
