import type { Metadata } from "next";
import AdminPlaceholderPage from "@/components/common/AdminPlaceholderPage";

const title = "Διαχείριση Χρηστών";

export const metadata: Metadata = {
  title: `${title} | Paschalidis`,
};

export default function UserManagementPage() {
  return (
    <AdminPlaceholderPage
      title={title}
      description="Σελίδα ρυθμίσεων για ρόλους, δικαιώματα και βασική διαχείριση χρηστών της πλατφόρμας."
    />
  );
}
