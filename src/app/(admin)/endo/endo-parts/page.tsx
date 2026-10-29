import type { Metadata } from "next";
import { Suspense } from "react";
import EndoPartsClient from "./endo-parts-client";

const title = "Ενδοδιακίνηση Ανταλλακτικών";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default function EndoPartsPage() {
    return (
        <Suspense fallback={null}>
            <EndoPartsClient />
        </Suspense>
    );
}
