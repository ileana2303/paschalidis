import type { Metadata } from "next";
import SearchPartsClient from "./search-parts-client";

const title = "Αναζήτηση Ανταλλακτικών";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function SearchPartsPage() {
    return <SearchPartsClient />;
}
