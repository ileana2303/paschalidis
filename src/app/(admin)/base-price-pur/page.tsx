import type { Metadata } from "next";
import BasePricePurClient from "./base-price-pur-client";

const title = "Διαμόρφωση Τιμών";

export const metadata: Metadata = {
    title: `${title} | Paschalidis ERP`,
};

export default function BasePricePurPage() {
    return <BasePricePurClient />;
}
