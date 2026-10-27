"use client";

import { MapPin } from "@/lib/icons/lucide";
import {
  normalizeBranchCode,
  resolveBranchName,
} from "@/lib/auth/branches";
import { getBranchCatalogLabel } from "@/lib/auth/permissions";
import { getBranchColor } from "@/lib/branch-colors";
import { usePermissionChecks } from "@/hooks/usePermissionChecks";
import { useAuthStore } from "@/stores/authStore";
import { useMemo } from "react";

export default function BranchToggle() {
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);
  const setAuth = useAuthStore((state) => state.setAuth);

  const { branchOptions, catalog, permittedBranchCodes } = usePermissionChecks();

  const branchName = useMemo(() => {
    if (!user) return "—";
    const branchCode = normalizeBranchCode(user.mainBranch);
    if (!branchCode) return "—";

    const catalogLabel = getBranchCatalogLabel(branchCode, catalog);
    return resolveBranchName(branchCode, catalogLabel);
  }, [catalog, user]);

  if (!user) return null;

  const branchCode = normalizeBranchCode(user.mainBranch);
  const canSwitchBranch =
    user.isSuperAdmin === 1 || permittedBranchCodes.length > 1;
  const selectedBranchCode = branchOptions.some(
    (branch) => branch.code === branchCode
  )
    ? branchCode
    : "";

  if (canSwitchBranch && permissions) {
    return (
      <label
        className={`inline-flex h-11 max-w-[300px] items-center gap-2 rounded-full px-3 text-sm font-medium dark:border-gray-800 ${getBranchColor(branchCode)}`}
        title={branchName}
      >
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="sr-only">Ενεργό κατάστημα</span>
        <select
          aria-label="Ενεργό κατάστημα"
          value={selectedBranchCode}
          onChange={(event) => {
            setAuth(
              { ...user, mainBranch: event.target.value },
              permissions
            );
          }}
          className="min-w-0 max-w-[235px] cursor-pointer border-0 bg-transparent p-0 pr-7 text-sm font-medium text-current outline-none focus:ring-0 dark:bg-transparent"
        >
          {!selectedBranchCode && (
            <option value="" disabled className="text-gray-900">
              Επιλέξτε κατάστημα
            </option>
          )}
          {branchOptions.map((branch) => (
            <option key={branch.code} value={branch.code} className="text-gray-900">
              {branch.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div
      aria-label="User branch"
      className={`inline-flex h-11 max-w-[280px] items-center gap-2 rounded-full px-3 text-sm font-medium dark:border-gray-800 ${getBranchColor(branchCode)}`}
      title={branchName}
    >
      <MapPin className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate">{branchName}</span>
    </div>
  );
}
