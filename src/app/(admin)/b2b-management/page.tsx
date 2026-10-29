import type { Metadata } from "next";
import ReferenceManagementClient from "@/components/suffix-management/reference-management-client";

const title = "Διαχείριση B2B";

export const metadata: Metadata = {
  title: `${title} | Oval`,
};

export default function B2BManagementPage() {
  return <ReferenceManagementClient kind="b2b" />;
}
