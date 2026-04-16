import type { Metadata } from "next";
import AdminPlaceholderPage from "@/components/template components/common/AdminPlaceholderPage";

const title = "Αιτήματα εκπτώσεων";

export const metadata: Metadata = {
  title: `${title} | Paschalidis`,
};

export default function DiscountRequestsPage() {
  return (
    <AdminPlaceholderPage
      title={title}
      description="Σελίδα για την προβολή και έγκριση αιτημάτων εκπτώσεων. Είναι έτοιμη να δεχτεί τα πραγματικά δεδομένα και τα σχετικά actions."
    />
  );
}
