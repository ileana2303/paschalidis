import type { Metadata } from "next";
import StockFeedbackClient from "./stock-feedback-client";

const title = "Ανατροφοδοσία Καταστήματος";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function StockFeedbackPage() {
    return <StockFeedbackClient />;
}
