import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth/session";
import { getTrdBranchByBranchCode } from "@/lib/auth/branches";
import { backend } from "@/lib/http/backend";
import type {
    ExternalLoginResponse,
    LoginRequest,
    ToastMessage,
} from "@/lib/auth/types";

/**
 * POST /api/auth/login
 *
 * Proxies credentials to upstream /Api/Login endpoint, then creates
 * the app session cookie from the returned user account.
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

        const upstreamResponse = await backend.post<ExternalLoginResponse>(
            "/Api/Login",
            {
                username: body.username,
                password: body.password,
                rememberMe: body.rememberMe ?? true,
            }
        );
        const upstreamData = upstreamResponse.data;

        if (
            upstreamResponse.status < 200 ||
            upstreamResponse.status >= 300 ||
            upstreamData.statusCode !== 200 ||
            !upstreamData.userAccount
        ) {
            tmessage = {
                result: false,
                message:
                    upstreamData.message ||
                    upstreamData.detailedMessage ||
                    "Δεν βρέθηκε χρήστης με αυτά τα στοιχεία, προσπαθήστε ξανά",
                type: "error",
            };
            return NextResponse.json(tmessage, { status: 401 });
        }

        await setSessionCookie();

        const userAccount = {
            ...upstreamData.userAccount,
            trdBranch: getTrdBranchByBranchCode(upstreamData.userAccount.s1code),
        };

        tmessage = {
            result: true,
            message: "Επιτυχής σύνδεση",
            type: "success",
            redirectlink: "/",
            userAccount,
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
