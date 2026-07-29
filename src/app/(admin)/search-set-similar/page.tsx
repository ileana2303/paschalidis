import type { Metadata } from "next";
import SearchSetSimilarClient from "./search-set-similar-client";

const title = "Ορισμός Ομοίων Ανταλλακτικών";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function SearchSetSimilarPage() {
    return <SearchSetSimilarClient />;
}
