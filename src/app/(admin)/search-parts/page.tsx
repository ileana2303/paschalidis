import type { Metadata } from "next";
import SearchPartsClient from "./search-parts-client";

export const metadata: Metadata = {
    title: "Paschalidis - ERP Platform",
};

export default function SearchPartsPage() {
    return <SearchPartsClient />;
}
