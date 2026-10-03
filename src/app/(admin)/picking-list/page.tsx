import type { Metadata } from "next";
import PickingListClient from "./picking-list-client";

const title = "Picking List";

export const metadata: Metadata = {
  title: `${title} | Paschalidis ERP`,
};

export default function PickingListPage() {
  return <PickingListClient />;
}
