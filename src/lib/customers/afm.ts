export function hasInvoiceAfm(afm: unknown): boolean {
    const value = String(afm ?? "").trim();
    return /^[0-9]{9}$/.test(value) && value !== "000000000";
}
