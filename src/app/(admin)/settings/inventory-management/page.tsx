import type { Metadata } from "next";
import AdminPlaceholderPage from "@/components/common/AdminPlaceholderPage";

const title = "Διαχείριση Αποθέματος";

export const metadata: Metadata = {
  title: `${title} | Paschalidis`,
};

export default function InventoryManagementPage() {
  return (
    <AdminPlaceholderPage
      title={title}
      description="Σελίδα ρυθμίσεων για τον έλεγχο και την παρακολούθηση αποθέματος. Μπορεί να επεκταθεί με κανόνες αναπλήρωσης, αποθήκες και όρια διαθεσιμότητας."
    />
  );
}
