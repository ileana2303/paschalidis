import sql from "mssql";
import { getPool } from "./connection";
import type { AppUser } from "../auth/types";

export async function findUserByUsername(
    username: string
): Promise<AppUser | null> {
    if (!username) return null;

    const pool = await getPool();

    const result = await pool
        .request()
        .input("username", sql.NVarChar, username)
        .query<AppUser>(
            `SELECT TOP 1 * FROM AppUsers WHERE Username = @username AND DateDeleted IS NULL`
        );

    return result.recordset[0] ?? null;
}
