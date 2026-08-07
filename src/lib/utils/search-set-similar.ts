export function value(value: unknown): string {
    return String(value ?? "").trim();
}
