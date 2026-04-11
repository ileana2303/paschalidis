import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { findUserByUsername } from "@/lib/db/users";
import type { ToastMessage, LoginRequest } from "@/lib/auth/types";

/**
 * POST /api/auth/login
 *
 * Mirrors AccountController.cs → LoginUser:
 * 1. Validate input
 * 2. Look up user by username
 * 3. Check IsActive
 * 4. Compare password (plain-text, matching the ASP.NET original)
 * 5. Create JWT session cookie
 * 6. Return ToastMessage JSON
 */
export async function POST(req: NextRequest) {
    let tmessage: ToastMessage;

    try {
        const body: LoginRequest = await req.json();

        if (!body.username || !body.password) {
            tmessage = {
                result: false,
                message: "Εισάγετε όλα τα απαραίτητα πεδία",
                type: "error",
            };
            return NextResponse.json(tmessage, { status: 400 });
        }

        const user = await findUserByUsername(body.username);

        if (!user) {
            tmessage = {
                result: false,
                message:
                    "Δεν βρέθηκε χρήστης με αυτά τα στοιχεία, προσπαθήστε ξανά",
                type: "error",
            };
            return NextResponse.json(tmessage, { status: 401 });
        }

        if (user.IsActive !== 1) {
            tmessage = {
                result: false,
                message: "Μη ενεργός χρήστης",
                type: "error",
            };
            return NextResponse.json(tmessage, { status: 403 });
        }

        // NOTE: The original ASP.NET code compares passwords as plain text.
        // Consider migrating to bcrypt/argon2 for production security.
        if (user.Password !== body.password) {
            tmessage = {
                result: false,
                message: "Λάθος κωδικός",
                type: "error",
            };
            return NextResponse.json(tmessage, { status: 401 });
        }

        const token = await createSessionToken(user);
        await setSessionCookie(token);

        tmessage = {
            result: true,
            message: "Επιτυχής σύνδεση",
            type: "success",
            redirectlink: "/",
        };

        return NextResponse.json(tmessage);
    } catch (error) {
        tmessage = {
            result: false,
            message:
                error instanceof Error ? error.message : "Σφάλμα διακομιστή",
            type: "error",
        };
        return NextResponse.json(tmessage, { status: 500 });
    }
}
