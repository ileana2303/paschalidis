import { NextRequest } from "next/server";
import { handlePartInsightsRequest } from "@/app/api/items/part-insights";

export async function POST(req: NextRequest) {
    return handlePartInsightsRequest(req, {
        sqlName: "LIST_ANTAGONISMOS",
        logLabel: "[items/competition]",
    });
}
