import type { Metadata } from "next";
import StockRequestsClient from "@/app/(admin)/stock-requests/stock-requests-client";

const title = "Λίστα Ανατροφοδοσίας";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function StockListPage() {
    return <StockRequestsClient mode="list" />;
}
