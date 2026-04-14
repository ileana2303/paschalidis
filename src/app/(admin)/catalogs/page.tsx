import type { Metadata } from "next";
import CatalogsClient from "./catalogs-client";

export const metadata: Metadata = {
  title: "Κατάλογοι | Paschalidis",
};

export default function CatalogsPage() {
  return <CatalogsClient />;
}
