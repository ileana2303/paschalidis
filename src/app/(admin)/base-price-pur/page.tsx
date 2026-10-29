import type { Metadata } from "next";
import BasePricePurClient from "./base-price-pur-client";

const title = "Διαμόρφωση Τιμών";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function BasePricePurPage() {
    return <BasePricePurClient />;
}
