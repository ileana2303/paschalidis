import type { Metadata } from "next";
import CompanyStockRequestsClient from "./company-stock-requests-client";

const title = "Καλάθια Ανατροφοδοσίας Εταιρίας";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function CompanyStockRequestsPage() {
    return <CompanyStockRequestsClient />;
}
