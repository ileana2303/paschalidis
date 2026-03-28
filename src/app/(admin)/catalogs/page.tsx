import type { Metadata } from "next";
import AdminPlaceholderPage from "@/components/common/AdminPlaceholderPage";

const title = "Κατάλογοι";

export const metadata: Metadata = {
  title: `${title} | Paschalidis`,
};

export default function CatalogsPage() {
  return (
    <AdminPlaceholderPage
      title={title}
      description="Σελίδα καταλόγων για οργάνωση και προβολή διαθέσιμου περιεχομένου. Μπορεί να συνδεθεί με κατηγορίες, αρχεία ή εξωτερικές πηγές δεδομένων."
    />
  );
}
