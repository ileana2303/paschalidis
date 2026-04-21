"use client";

import { useAuthStore } from "@/stores/authStore";

function Value({ text }: { text: string | undefined | null }) {
  return (
    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
      {text?.trim() || "—"}
    </p>
  );
}

export default function UserInfoCard() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
      <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        Personal Information
      </h4>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Username</p>
          <Value text={user?.username} />
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Full Name</p>
          <Value text={user?.fullName} />
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Email</p>
          <Value text={user?.email} />
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Role</p>
          <Value text={user?.role} />
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">UID</p>
          <Value text={user?.uid} />
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">S1 Code</p>
          <Value text={user?.s1code} />
        </div>
      </div>
    </div>
  );
}
