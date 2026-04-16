import type { Metadata } from "next";
import StockRequestsClient from "./stock-requests-client";

const title = "Αιτήματα Ανατροφοδοσίας";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function StockRequestsPage() {
    return <StockRequestsClient />;
}
