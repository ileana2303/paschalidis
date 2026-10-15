import type { Metadata } from "next";
import ReferenceManagementClient from "@/components/suffix-management/reference-management-client";

const title = "Διαχείριση Group";

export const metadata: Metadata = {
  title: `${title} | Paschalidis ERP`,
};

export default function GroupManagementPage() {
  return <ReferenceManagementClient kind="groups" />;
}
