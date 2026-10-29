import type { Metadata } from "next";
import { ShieldAlert } from "@/lib/icons/lucide";

export const metadata: Metadata = {
  title: "Χωρίς πρόσβαση | Oval",
};

export default function NoAccessPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
        Δεν έχετε πρόσβαση
      </h1>
      <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
        Ο λογαριασμός σας δεν έχει δικαίωμα σε καμία σελίδα. Επικοινωνήστε με
        τον διαχειριστή για να σας αποδοθούν δικαιώματα.
      </p>
    </div>
  );
}
