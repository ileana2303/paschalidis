import { NextResponse } from "next/server";
import { deleteSessionCookie } from "@/lib/auth/session";

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Mirrors the logout action in the ASP.NET app
 * (HttpContext.SignOutAsync).
 */
export async function POST() {
    await deleteSessionCookie();
    return NextResponse.json({ result: true, message: "Αποσύνδεση επιτυχής" });
}
