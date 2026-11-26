import type { Metadata } from "next";
import PickingListStatusClient from "./picking-list-status-client";

export const metadata: Metadata = {
  title: "Κατάσταση Picking List | Oval",
};

export default function PickingListStatusPage() {
  return <PickingListStatusClient />;
}
