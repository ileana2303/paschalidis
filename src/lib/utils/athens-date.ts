const ATHENS_MONTH_NAMES = [
    "Ιανουάριος",
    "Φεβρουάριος",
    "Μάρτιος",
    "Απρίλιος",
    "Μάιος",
    "Ιούνιος",
    "Ιούλιος",
    "Αύγουστος",
    "Σεπτέμβριος",
    "Οκτώβριος",
    "Νοέμβριος",
    "Δεκέμβριος",
] as const;

/** Nominative month name in Europe/Athens (stable for SSR + client hydration). */
export function getAthensMonthName(date = new Date()): string {
    const monthPart = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Athens",
        month: "numeric",
    })
        .formatToParts(date)
        .find((part) => part.type === "month")?.value;

    const index = Number(monthPart) - 1;

    return ATHENS_MONTH_NAMES[index] ?? "";
}
