import type { Metadata } from "next";
import EndoListPageClient from "@/app/(admin)/endo/endo-lists/endo-list-page-client";

const title = "Εκκρεμή Αιτήματα Ενδοδιακίνησης";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function EndoListsRequestedPage() {
    return <EndoListPageClient scope="requested" />;
}
