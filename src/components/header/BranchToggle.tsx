"use client";

import { MapPin } from "@/lib/icons/lucide";
import { normalizeBranchCode, resolveBranchName } from "@/lib/auth/branches";
import { getBranchColor } from "@/lib/branch-colors";
import { useAuthStore } from "@/stores/authStore";
import { useMemo } from "react";

export default function BranchToggle() {
  const user = useAuthStore((state) => state.user);

  const branchName = useMemo(() => {
    if (!user) return "—";
    const branchCode = normalizeBranchCode(user.s1code);
    if (!branchCode) return "—";

    const preferredBranchName = user.listBranches.find(
      (branch) => normalizeBranchCode(branch.s1Code) === branchCode
    )?.name;

    return resolveBranchName(branchCode, preferredBranchName);
  }, [user]);

  if (!user) return null;

  return (
    <div
      aria-label="User branch"
      className={`inline-flex h-11 max-w-[280px] items-center gap-2 rounded-full  px-3 text-sm font-medium dark:border-gray-800 ${getBranchColor(normalizeBranchCode(user.s1code))}`}
      title={branchName}
    >
      <MapPin className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{branchName}</span>
    </div>
  );
}
