import type { Metadata } from "next";
import EndoListPageClient from "@/components/endo/endo-list-page-client";

const title = "Ενδολίστα Παραλαβών";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function EndoListsRequestedPage() {
    return <EndoListPageClient scope="requested" />;
}
