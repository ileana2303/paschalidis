import type { Metadata } from "next";
import BasketClient from "./basket-client";

export const metadata: Metadata = {
    title: "Καλάθι | Paschalidis",
};

export default function BasketPage() {
    return <BasketClient />;
}
