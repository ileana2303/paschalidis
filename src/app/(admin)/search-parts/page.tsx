import type { Metadata } from "next";
import { Suspense } from "react";
import SearchPartsClient from "./search-parts-client";

const title = "Αναζήτηση Ανταλλακτικών";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function SearchPartsPage() {
    return (
        <Suspense fallback={null}>
            <SearchPartsClient />
        </Suspense>
    );
}
