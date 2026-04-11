import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

/**
 * GET /api/auth/me
 *
 * Returns the current user session data (the same claims that were set
 * during login). Mirrors reading User.Claims in the ASP.NET controllers
 * (e.g. HomeController requiring "UserUID" claim).
 */
export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { result: false, message: "Not authenticated" },
            { status: 401 }
        );
    }

    return NextResponse.json({ result: true, user: session });
}
