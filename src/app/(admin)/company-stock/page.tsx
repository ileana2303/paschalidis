import type { Metadata } from "next";
import CompanyStockClient from "./company-stock-client";

const title = "Κεντρική Διαχείριση Αποθέματος";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function CompanyStockPage() {
    return <CompanyStockClient />;
}
