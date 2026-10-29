import type { Metadata } from "next";
import { redirect } from "next/navigation";

const title = "Λίστες Ενδοδιακίνησης";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function EndoListsPage() {
    redirect("/endo/endo-lists-requested");
}
