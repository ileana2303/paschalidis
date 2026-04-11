import sql from "mssql";
import { getPool } from "./connection";
import type { AppUser } from "../auth/types";

/**
 * Look up a user by their username.
 *
 * Mirrors the ASP.NET EF Core query:
 *   db.AppUsers.AsNoTracking()
 *     .Where(x => x.Username == loginmodel.username)
 *     .FirstOrDefault();
 *
 * The HasQueryFilter(x => x.DateDeleted == null) from MyDbContext
 * is replicated with the WHERE DateDeleted IS NULL clause.
 */
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
