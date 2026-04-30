"use client";

import { Mail, MapPin, Shield, UserRound } from "@/app/lib/lucide";
import { formatBranchLabel, normalizeBranchCode, resolveBranchName } from "@/lib/auth/branches";
import { useAuthStore } from "@/stores/authStore";
import { type ReactNode, useMemo } from "react";

type DetailItemProps = {
  label: string;
  value: string;
  icon: ReactNode;
};

function normalize(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text || "—";
}

function buildInitials(fullName: string, username: string) {
  const source = fullName !== "—" ? fullName : username;
  if (source === "—") return "—";

  return source
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function DetailItem({ label, value, icon }: DetailItemProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="mb-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="break-words text-sm font-medium text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

export default function UserProfileCard() {
  const user = useAuthStore((state) => state.user);

  const profileData = useMemo(() => {
    const username = normalize(user?.username);
    const fullName = normalize(user?.fullName);
    const email = normalize(user?.email);
    const role = normalize(user?.role);
    const uid = normalize(user?.uid);
    const activeBranchCode = normalizeBranchCode(user?.s1code);

    const branchMap = new Map<string, { code: string; name: string }>();

    (user?.listBranches ?? []).forEach((branch) => {
      const code = normalizeBranchCode(branch.s1Code);
      if (!code) return;

      const resolvedName = resolveBranchName(code, branch.name);
      const existing = branchMap.get(code);

      if (!existing || (existing.name === code && resolvedName !== code)) {
        branchMap.set(code, { code, name: resolvedName });
      }
    });

    if (activeBranchCode && !branchMap.has(activeBranchCode)) {
      branchMap.set(activeBranchCode, {
        code: activeBranchCode,
        name: resolveBranchName(activeBranchCode),
      });
    }

    const branches = Array.from(branchMap.values()).sort(
      (a, b) => Number(a.code) - Number(b.code)
    );

    const accessEntries = (user?.listAccess ?? [])
      .map((entry) => ({
        code: normalize(entry.code),
        name: normalize(entry.name),
      }))
      .filter((entry) => entry.code !== "—" || entry.name !== "—");

    const activeBranch = branches.find((branch) => branch.code === activeBranchCode);
    const activeBranchLabel = activeBranchCode
      ? formatBranchLabel(activeBranchCode, activeBranch?.name)
      : "—";

    return {
      username,
      fullName,
      email,
      role,
      uid,
      activeBranchCode: activeBranchCode || "—",
      activeBranchLabel,
      branches,
      accessEntries,
      initials: buildInitials(fullName, username),
      usernameLabel: username === "—" ? "—" : `@${username}`,
    };
  }, [user]);

  const showBranches = profileData.branches.length >= 2;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <header className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            {profileData.initials}
          </div>

          <div className="min-w-0">
            <h4 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
              {profileData.fullName}
            </h4>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <Mail className="h-3.5 w-3.5" />
            {profileData.email}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {profileData.role}
          </span>
        </div>
      </header>

      <div className="mb-6 space-y-3">
        <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3 ring-1 ring-brand-100 dark:border-brand-500/40 dark:bg-brand-500/15 dark:ring-brand-500/20">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            <MapPin className="h-3.5 w-3.5" />
            <span>Active Branch</span>
          </div>
          <p className="break-words text-sm font-semibold text-brand-700 dark:text-brand-200">
            {profileData.activeBranchLabel}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <DetailItem label="Username" value={profileData.usernameLabel} icon={<UserRound className="h-3.5 w-3.5" />} />
          <DetailItem label="UID" value={profileData.uid} icon={<Shield className="h-3.5 w-3.5" />} />
          <DetailItem
            label="Total Branches"
            value={String(profileData.branches.length)}
            icon={<MapPin className="h-3.5 w-3.5" />}
          />
          <DetailItem
            label="Total Access Entries"
            value={String(profileData.accessEntries.length)}
            icon={<UserRound className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${showBranches ? "xl:grid-cols-2" : "xl:grid-cols-1"}`}>
        {showBranches && (
          <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">Branches</h5>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {profileData.branches.length}
              </span>
            </div>

            <ul className="space-y-2">
              {profileData.branches.map((branch) => {
                const isActive = branch.code === profileData.activeBranchCode;
                const label = formatBranchLabel(branch.code, branch.name);

                return (
                  <li
                    key={`${branch.code}-${branch.name}`}
                    className={`rounded-lg px-3 py-2 text-sm ${isActive
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                        : "bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
                      }`}
                  >
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">Access Entries</h5>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {profileData.accessEntries.length}
            </span>
          </div>

          {profileData.accessEntries.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {profileData.accessEntries.map((entry) => {
                const label = entry.name === "—" ? entry.code : `${entry.name} (${entry.code})`;
                return (
                  <li
                    key={`${entry.code}-${entry.name}`}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {label}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No access entries available.</p>
          )}
        </div>
      </div>
    </section>
  );
}
