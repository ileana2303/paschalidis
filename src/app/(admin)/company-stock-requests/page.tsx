import type { Metadata } from "next";
import CompanyStockRequestsClient from "./company-stock-requests-client";

const title = "Καλάθια Ανατροφοδοσίας Εταιρίας";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function CompanyStockRequestsPage() {
    return <CompanyStockRequestsClient />;
}
