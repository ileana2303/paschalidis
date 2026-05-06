import type { Metadata } from "next";
import StockFeedbackClient from "./stock-feedback-client";

const title = "Ανατροφοδοσία Καταστήματος";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function StockFeedbackPage() {
    return <StockFeedbackClient />;
}
