import type { Metadata } from "next";
import SearchPartsClient from "./SearchPartsClient";

export const metadata: Metadata = {
    title: "Paschalidis - Web Platform",
};

export default function SearchPartsPage() {
    return <SearchPartsClient />;
}
