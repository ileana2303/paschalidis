import type { Metadata } from "next";
import AllBasketsClient from "./all-baskets-client";

const title = "Καλάθια Όλων των Πελατών";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function AllBasketsPage() {
    return <AllBasketsClient />;
}
