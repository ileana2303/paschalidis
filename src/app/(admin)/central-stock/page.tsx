import type { Metadata } from "next";
import CentralStockClient from "./central-stock-client";

const title = "Κεντρική Διαχείριση Αποθέματος";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function CentralStockPage() {
    return <CentralStockClient />;
}
