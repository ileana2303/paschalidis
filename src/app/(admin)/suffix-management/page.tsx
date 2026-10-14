import type { Metadata } from "next";
import SuffixManagementClient from "./suffix-management-client";

const title = "Διαχείριση Suffix";

export const metadata: Metadata = {
  title: `${title} | Paschalidis ERP`,
};

export default function SuffixManagementPage() {
  return <SuffixManagementClient />;
}
