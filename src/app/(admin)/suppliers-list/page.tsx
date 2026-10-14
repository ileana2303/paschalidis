import type { Metadata } from "next";
import SuppliersListClient from "./suppliers-list-client";

const title = "Λίστα Προμηθευτών";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function SuppliersListPage() {
    return <SuppliersListClient />;
}
