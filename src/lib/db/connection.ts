import sql from "mssql";

const config: sql.config = {
    server: process.env.DB_SERVER ?? "",
    port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME ?? "",
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD ?? "",
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
    if (!poolPromise) {
        poolPromise = sql.connect(config).catch((err) => {
            poolPromise = null;
            throw err;
        });
    }
    return poolPromise;
}
