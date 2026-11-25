import type { Metadata } from "next";
import BasketHistoryClient from "./basket-history-client";

export const metadata: Metadata = {
  title: "Ιστορικό Καλαθιών | Oval",
};

export default function BasketHistoryPage() {
  return <BasketHistoryClient />;
}
