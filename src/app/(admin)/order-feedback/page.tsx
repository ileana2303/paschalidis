import type { Metadata } from "next";
import OrderFeedbackClient from "./order-feedback-client";

const title = "Ανατροφοδοσία Καταστήματος";

export const metadata: Metadata = {
  title: `${title} | Paschalidis`,
};

export default function OrderFeedbackPage() {
  return <OrderFeedbackClient />;
}
