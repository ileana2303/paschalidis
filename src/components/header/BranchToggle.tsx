"use client";

import { MapPin } from "@/lib/icons/lucide";
import {
  formatBranchLabel,
  getKnownBranchOptions,
  normalizeBranchCode,
  resolveBranchName,
} from "@/lib/auth/branches";
import { getBranchColor } from "@/lib/branch-colors";
import { useAuthStore } from "@/stores/authStore";
import { useMemo } from "react";

export default function BranchToggle() {
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);
  const setAuth = useAuthStore((state) => state.setAuth);

  const branchOptions = useMemo(() => {
    if (!user) return [];

    const activeBranchCode = normalizeBranchCode(user.mainBranch);
    const permittedCodes = (permissions?.branches ?? [])
      .map(normalizeBranchCode)
      .filter(Boolean);
    const uniqueCodes = Array.from(
      new Set(
        user.isSuperAdmin === 1
          ? [
              ...getKnownBranchOptions().map((branch) => branch.code),
              ...permittedCodes,
              ...(activeBranchCode ? [activeBranchCode] : []),
            ]
          : permittedCodes
      )
    );

    return uniqueCodes.map((code) => ({
      code,
      label: formatBranchLabel(code),
    }));
  }, [permissions?.branches, user]);

  const branchName = useMemo(() => {
    if (!user) return "—";
    const branchCode = normalizeBranchCode(user.mainBranch);
    if (!branchCode) return "—";

    return resolveBranchName(branchCode);
  }, [user]);

  if (!user) return null;

  const branchCode = normalizeBranchCode(user.mainBranch);
  const canSwitchBranch =
    user.isSuperAdmin === 1 || (permissions?.branches.length ?? 0) > 1;
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
