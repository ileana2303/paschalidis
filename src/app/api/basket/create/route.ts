import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json(
        {
            success: false,
            message: "Basket creation is not implemented yet.",
        },
        { status: 501 }
    );
}
