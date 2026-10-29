import type { Metadata } from "next";
import SearchCustomerClient from "./search-customer-client";

const title = "Αναζήτηση Πελατών";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function SearchCustomerPage() {
    return <SearchCustomerClient />;
}
