import type { Metadata } from "next";
import SuffixManagementClient from "./suffix-management-client";

const title = "Διαχείριση Suffix";

export const metadata: Metadata = {
  title: `${title} | Oval`,
};

export default function SuffixManagementPage() {
  return <SuffixManagementClient />;
}
