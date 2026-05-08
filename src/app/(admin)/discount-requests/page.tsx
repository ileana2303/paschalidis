import type { Metadata } from "next";
import DiscountRequestsClient from "./discount-requests-client";

const title = "Αιτήματα Έκπτωσης";

export const metadata: Metadata = {
  title: `${title} | Paschalidis ERP`,
};

export default function DiscountRequestsPage() {
  return <DiscountRequestsClient />;
}
