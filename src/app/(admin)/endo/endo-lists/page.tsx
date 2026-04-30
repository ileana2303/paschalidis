import type { Metadata } from "next";
import { redirect } from "next/navigation";

const title = "Λίστες Ενδοδιακίνησης";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function EndoListsPage() {
    redirect("/endo-lists-requested");
}
