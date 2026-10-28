import type { Metadata } from "next";
import PermissionCatalogClient from "@/components/users/permission-catalog-client";

const title = "Κατάλογος Δικαιωμάτων";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function PermissionCatalogPage() {
    return <PermissionCatalogClient />;
}
