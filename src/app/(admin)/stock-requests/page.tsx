import type { Metadata } from "next";
import StockRequestsClient from "./stock-requests-client";
import { isStockRequestBranchCode } from "@/lib/utils/stock-requests";

const title = "Αιτήματα Ανατροφοδοσίας";

export const metadata: Metadata = {
    title: `${title} | Oval`,
};

export default async function StockRequestsPage({
    searchParams,
}: {
    searchParams: Promise<{ branch?: string | string[] }>;
}) {
    const { branch } = await searchParams;
    const initialBranchCode = typeof branch === "string" && isStockRequestBranchCode(branch)
        ? branch
        : undefined;

    return <StockRequestsClient key={initialBranchCode} initialBranchCode={initialBranchCode} />;
}
