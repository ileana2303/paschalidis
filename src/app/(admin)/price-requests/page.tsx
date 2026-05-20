import type { Metadata } from "next";
import PriceRequestsClient from "./price-requests-client";

const title = "Αιτήματα Τιμών";

export const metadata: Metadata = {
  title: `${title} | Paschalidis ERP`,
};

export default function PriceRequestsPage() {
  return <PriceRequestsClient />;
}
