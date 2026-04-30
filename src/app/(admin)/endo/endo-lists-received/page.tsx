import type { Metadata } from "next";
import EndoListPageClient from "@/app/(admin)/endo/endo-lists/endo-list-page-client";

const title = "Ενδολίστα Αποστολών";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function EndoListsReceivedPage() {
    return <EndoListPageClient scope="received" />;
}
