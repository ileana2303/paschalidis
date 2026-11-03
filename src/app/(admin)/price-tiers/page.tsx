import type { Metadata } from "next";
import PriceTiersClient from "./price-tiers-client";

const title = "Βαθμίδες Τιμών";

export const metadata: Metadata = {
  title: `${title} | Oval`,
};

export default function PriceTiersPage() {
  return <PriceTiersClient />;
}
