function parseDateValue(value: unknown) {
    if (!value) return null;

    const rawValue = String(value).trim();
    const normalizedValue = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(rawValue)
        ? rawValue.replace(" ", "T")
        : rawValue;
    const parsed = new Date(normalizedValue);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTimeEl(value?: string) {
    if (!value) return "—";

    const parsed = parseDateValue(value);

    if (!parsed) {
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

    const parsed = parseDateValue(value);

    if (!parsed) {
        return String(value);
    }

    return parsed.toLocaleDateString("el-GR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export function formatMinutesAgoEl(value: unknown, nowMs: number) {
    const parsed = parseDateValue(value);
    if (!parsed) return null;

    const elapsedMinutes = Math.max(
        0,
        Math.floor((nowMs - parsed.getTime()) / 60_000)
    );

    if (elapsedMinutes >= 60) {
        const elapsedHours = Math.floor(elapsedMinutes / 60);
        const remainingMinutes = elapsedMinutes % 60;

        return remainingMinutes === 0
            ? `${elapsedHours}ω`
            : `${elapsedHours}ω και ${remainingMinutes}λ πριν`;
    }

    return elapsedMinutes === 1
        ? "1 λεπτό πριν"
        : `${elapsedMinutes} λ πριν`;
}
