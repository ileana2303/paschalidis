import type { Metadata } from "next";
import { Suspense } from "react";
import BasketClient from "./basket-client";

const title = "Παραγγελία Πελάτη";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function BasketPage() {
    return (
        <Suspense fallback={null}>
            <BasketClient />
        </Suspense>
    );
}
