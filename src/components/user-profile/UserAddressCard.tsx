"use client";

import { useAuthStore } from "@/stores/authStore";

export default function UserAddressCard() {
  const user = useAuthStore((state) => state.user);

  const branches = user?.listBranches ?? [];
  const accessItems = user?.listAccess ?? [];

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
      <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        Access & Branches
      </h4>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Active Branch Code</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {user?.s1code?.trim() || "—"}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Total Branches</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{branches.length}</p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Total Access Entries</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{accessItems.length}</p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Branch Names</p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {branches.length > 0
              ? branches
                  .map((branch) => branch.name?.trim())
                  .filter((name) => Boolean(name))
                  .join(", ") || "—"
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
