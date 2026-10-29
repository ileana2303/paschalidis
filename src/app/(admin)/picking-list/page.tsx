import type { Metadata } from "next";
import PickingListClient from "./picking-list-client";

const title = "Picking List";

export const metadata: Metadata = {
  title: `${title} | Oval`,
};

export default function PickingListPage() {
  return <PickingListClient />;
}
