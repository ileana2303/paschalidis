export function formatDateTimeEl(value?: string) {
    if (!value) return "—";

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString("el-GR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatDateEl(value: unknown) {
    if (!value) return "—";

    const parsed = new Date(String(value));

    if (Number.isNaN(parsed.getTime())) {
        return String(value);
    }

    return parsed.toLocaleDateString("el-GR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}
