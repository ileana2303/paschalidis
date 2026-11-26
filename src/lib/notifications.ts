import { parseDateValue } from "@/lib/utils/date";

export const NOTIFICATION_POLL_INTERVAL_MS = 10_000;
export const ENDO_RECEIVED_PATH = "/endo/endo-lists-received";
export const ENDO_NOTIFICATIONS_QUERY_KEY = ["endo", "notifications"] as const;
export const PICKING_LIST_PATH = "/picking-list";

export type AppNotification = {
    id: string;
    href: string;
    text: string;
    badges?: { label: string; tone: string }[];
    timestamp?: number;
};

export type NotificationFeed = {
    href: string;
    items: AppNotification[] | undefined;
};

export function notificationTimestamp(value?: string) {
    return parseDateValue(value)?.getTime();
}

export function formatNotificationAge(timestamp: number | undefined, now: number) {
    if (timestamp === undefined) return "";
    const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
    if (minutes < 1) return "τώρα";
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
}
