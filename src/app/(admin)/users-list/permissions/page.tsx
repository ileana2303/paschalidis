import type { Metadata } from "next";
import PermissionCatalogClient from "@/components/users/permission-catalog-client";

const title = "Κατάλογος Δικαιωμάτων";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function PermissionCatalogPage() {
    return <PermissionCatalogClient />;
}
