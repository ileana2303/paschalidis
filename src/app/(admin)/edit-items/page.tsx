import type { Metadata } from "next";
import EditItemsClient from "./edit-items-client";

const title = "Επεξεργασία Ειδών";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function EditItemsPage() {
    return <EditItemsClient />;
}
