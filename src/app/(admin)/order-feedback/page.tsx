import type { Metadata } from "next";
import AdminPlaceholderPage from "@/components/common/AdminPlaceholderPage";

const title = "Ανατροφοδοσία Παραγγελίες";

export const metadata: Metadata = {
  title: `${title} | Paschalidis`,
};

export default function OrderFeedbackPage() {
  return (
    <AdminPlaceholderPage
      title={title}
      description="Σελίδα διαχείρισης για την ανατροφοδοσία παραγγελιών. Μπορεί να επεκταθεί με πίνακες, φίλτρα και ενέργειες μόλις οριστεί η τελική ροή."
    />
  );
}
