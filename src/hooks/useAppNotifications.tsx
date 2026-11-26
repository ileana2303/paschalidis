"use client";

import Link from "next/link";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useRef, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import NotificationPreview from "@/components/header/NotificationPreview";
import { isPickingListUnauthorized, usePickingListQuery } from "@/hooks/queries/usePickingListQueries";
import { fetchEndoLists } from "@/lib/api-client/endo";
import { fetchRequestedPriceRequests } from "@/lib/api-client/basket";
import { fetchStockRequests } from "@/lib/api-client/items";
import { normalizeBranchCode, resolveBranchName } from "@/lib/auth/branches";
import { canAccessPath } from "@/lib/auth/permissions";
import { getBranchColor } from "@/lib/branch-colors";
import { Bell, X } from "@/lib/icons/lucide";
import { buildEndoComments } from "@/lib/orders/endo/endo-comments";
import {
    ENDO_NOTIFICATIONS_QUERY_KEY,
    ENDO_RECEIVED_PATH,
    NOTIFICATION_POLL_INTERVAL_MS,
    PICKING_LIST_PATH,
    PRICE_REQUEST_NOTIFICATIONS_QUERY_KEY,
    PRICE_REQUESTS_PATH,
    STOCK_REQUEST_NOTIFICATIONS_QUERY_KEY,
    STOCK_REQUESTS_PATH,
    notificationTimestamp,
    type AppNotification,
    type NotificationFeed,
} from "@/lib/notifications";
import { useAuthStore } from "@/stores/authStore";
import {
    formatPickingOrderComments,
    getPickingOrderType,
    getPickingOrderTypeOption,
} from "@/lib/picking-list";
import { STOCK_REQUEST_BRANCH_OPTIONS, canUpdate } from "@/lib/utils/stock-requests";

function subscribeToVisibility(onChange: () => void) {
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
}

function showNotificationPopup(href: string, items: AppNotification[]) {
    const now = Date.now();
    toast((entry) => (
        <div className="flex w-full min-w-0 items-start gap-3">
            <ul className="max-h-[min(50vh,22rem)] min-w-0 flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                {items.map((item) => (
                    <li key={item.id}>
                        <Link href={item.href} prefetch={false} onClick={() => toast.dismiss(entry.id)} className="block py-1.5">
                            <NotificationPreview item={item} now={now} />
                        </Link>
                    </li>
                ))}
            </ul>
            <button type="button" className="shrink-0" aria-label="Κλείσιμο ειδοποίησης" onClick={() => toast.dismiss(entry.id)}>
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    ), {
        id: `notification-feed:${href}`,
        duration: 4000,
        position: "top-right",
        style: { width: "min(32rem, calc(100vw - 2rem))", maxWidth: "none" },
        icon: <Bell className="h-5 w-5 text-red-600" aria-hidden="true" />,
        className: "!border !border-red-300 !bg-white !text-gray-900 dark:!border-red-800 dark:!bg-gray-900 dark:!text-gray-100",
        ariaProps: { role: "status", "aria-live": "polite" },
    });
}

function useNotificationPopups(scope: string, feeds: NotificationFeed[]) {
    const visible = useSyncExternalStore(
        subscribeToVisibility,
        () => document.visibilityState === "visible",
        () => false
    );
    const snapshots = useRef(new Map<string, Set<string>>());

    useEffect(() => {
        const previous = snapshots.current;
        return () => {
            for (const href of previous.keys()) toast.dismiss(`notification-feed:${href}`);
            previous.clear();
        };
    }, [scope]);

    useEffect(() => {
        for (const feed of feeds) {
            if (!feed.items) continue;
            const previousIds = snapshots.current.get(feed.href);
            if (previousIds && !visible) continue;
            snapshots.current.set(feed.href, new Set(feed.items.map(({ id }) => id)));

            if (previousIds) {
                const added = feed.items.filter(({ id }) => !previousIds.has(id));
                if (added.length) showNotificationPopup(feed.href, added);
            }
        }
    }, [feeds, scope, visible]);
}

async function fetchEndoItems(branch: string, signal: AbortSignal) {
    const data = await fetchEndoLists({ branch, scope: "received" }, signal);
    // The single-scope route can report a SoftOne failure in a successful response.
    if (data.message) throw new Error(data.message);

    const items = new Map<string, AppNotification>();
    for (const row of data.received.rows) {
        if ((row.STATUS || row.STATUS_LABEL)?.trim().toUpperCase() !== "ΣΕ ΑΝΑΜΟΝΗ") continue;
        const id = row.BASKETID?.trim() || row.ID?.trim();
        if (!id || items.has(id)) continue;
        const requester = normalizeBranchCode(row.TO_BRANCH);
        const supplyingBranch = Number(row.BRANCH || branch);
        const requestingBranch = Number(requester);
        const comment = row.COMMENTS?.trim() || row.COMMENT?.trim();
        const badges = [{
            label: "Αίτημα Ενδοδιακίνησης",
            tone: `shrink-0 ring-1 ring-inset ${getPickingOrderTypeOption("INTERNAL_TRANSFER").tone}`,
        }];
        if (requester) {
            badges.push({ label: resolveBranchName(requester), tone: getBranchColor(requester) });
        }
        items.set(id, {
            id: `endo:${id}`,
            href: ENDO_RECEIVED_PATH,
            text: comment?.replace(/\s+/g, " ") || (
                supplyingBranch > 0 && requestingBranch > 0
                    ? buildEndoComments({ basketId: id, supplyingBranch, requestingBranch })
                    : `ΕΝΔΟΔΙΑΚΙΝΗΣΗ Νο${id}`
            ),
            badges,
            timestamp: notificationTimestamp(row.INS_DATE),
        });
    }
    return Array.from(items.values());
}

async function fetchStockRequestItems(): Promise<AppNotification[]> {
    const lists = await Promise.all(STOCK_REQUEST_BRANCH_OPTIONS.map(async ({ code }) => ({
        code,
        data: await fetchStockRequests({ branch: code, origin: "STORE" }),
    })));
    const items = new Map<string, AppNotification>();
    for (const { code, data } of lists) {
        for (const row of data.rows ?? []) {
            const id = String(row.BASKETID ?? "").trim();
            if (!id || items.has(id) || !canUpdate(row.STATUS ?? "")) continue;
            items.set(id, {
                id: `stock:${id}`,
                href: `${STOCK_REQUESTS_PATH}?branch=${code}`,
                text: [row.ITEM_CODE, row.ITEM_NAME].filter(Boolean).join(" · ") || `Αίτημα #${id}`,
                badges: [
                    { label: "Αίτημα Ανατροφοδοσίας", tone: getPickingOrderTypeOption("REPLENISHMENT").tone },
                    { label: resolveBranchName(code), tone: getBranchColor(code) },
                ],
                timestamp: notificationTimestamp(row.INS_DATE),
            });
        }
    }
    return Array.from(items.values());
}

async function fetchPriceRequestItems(): Promise<AppNotification[]> {
    const { rows } = await fetchRequestedPriceRequests();
    const items = new Map<string, AppNotification>();
    for (const row of rows ?? []) {
        const id = String(row.BASKETID ?? "").trim();
        if (!id || items.has(id)) continue;
        const branch = normalizeBranchCode(row.KATASTIMA);
        const badges = [{ label: "Αίτημα Τιμής", tone: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" }];
        if (branch) badges.push({ label: resolveBranchName(branch), tone: getBranchColor(branch) });
        items.set(id, {
            id: `price:${id}`,
            href: PRICE_REQUESTS_PATH,
            text: [row.CUSTOMER_NAME, row.ITEM_CODE].filter(Boolean).join(" · ") || `Αίτημα #${id}`,
            badges,
            timestamp: notificationTimestamp(row.INS_DATE),
        });
    }
    return Array.from(items.values());
}

function isAccessDenied(error: unknown) {
    return isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403);
}

function useNotificationFeed(
    queryKey: QueryKey,
    enabled: boolean,
    load: (signal: AbortSignal) => Promise<AppNotification[]>,
) {
    const query = useQuery({
        queryKey,
        enabled,
        queryFn: ({ signal }) => load(signal),
        refetchInterval: (query) => isAccessDenied(query.state.error) ? false : NOTIFICATION_POLL_INTERVAL_MS,
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => failureCount < 1 && !isAccessDenied(error),
    });
    return enabled && !isAccessDenied(query.error) ? query.data : undefined;
}

export function useAppNotifications() {
    const user = useAuthStore((state) => state.user);
    const permissions = useAuthStore((state) => state.permissions);
    const branch = normalizeBranchCode(user?.mainBranch);
    const username = user?.username ?? "";
    const enabled = Boolean(username && branch);
    const endoEnabled = enabled && canAccessPath(permissions, ENDO_RECEIVED_PATH, branch);
    const pickingEnabled = enabled && canAccessPath(permissions, PICKING_LIST_PATH, branch);
    const stockEnabled = enabled && canAccessPath(permissions, STOCK_REQUESTS_PATH, branch);
    const priceEnabled = enabled && canAccessPath(permissions, PRICE_REQUESTS_PATH, branch);
    const endoItems = useNotificationFeed(
        [...ENDO_NOTIFICATIONS_QUERY_KEY, username, branch],
        endoEnabled,
        (signal) => fetchEndoItems(branch, signal),
    );
    const stockItems = useNotificationFeed(
        [...STOCK_REQUEST_NOTIFICATIONS_QUERY_KEY, username],
        stockEnabled,
        fetchStockRequestItems,
    );
    const priceItems = useNotificationFeed(
        [...PRICE_REQUEST_NOTIFICATIONS_QUERY_KEY, username],
        priceEnabled,
        fetchPriceRequestItems,
    );
    const pickingQuery = usePickingListQuery("ALL", { enabled: pickingEnabled, notifications: true });
    const pickingOrders = pickingEnabled && !isPickingListUnauthorized(pickingQuery.error)
        ? pickingQuery.data
        : undefined;

    const pickingItems = pickingOrders
        ?.filter((order) => normalizeBranchCode(order.branch) === branch && order.status !== "PICKED_IT_UP")
        .map((order) => {
            const { label, tone } = getPickingOrderTypeOption(getPickingOrderType(order));
            const comment = formatPickingOrderComments(order.comments).replace(/\s+/g, " ").trim();
            return {
                id: `picking:${order.findoc}`,
                href: PICKING_LIST_PATH,
                text: comment || `Παραγγελία Picking List · ${order.parastatiko || order.fincode || `#${order.findoc}`}`,
                badges: [
                    { label: "Αιτήματα Picking", tone: "shrink-0 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200" },
                    { label, tone: `ring-1 ring-inset ${tone}` },
                ],
                timestamp: notificationTimestamp(order.submittedAt) ?? notificationTimestamp(order.transactionDate),
            };
        });
    const feeds: NotificationFeed[] = [
        {
            href: ENDO_RECEIVED_PATH,
            items: endoItems,
        },
        {
            href: PICKING_LIST_PATH,
            items: pickingItems,
        },
        { href: STOCK_REQUESTS_PATH, items: stockItems },
        { href: PRICE_REQUESTS_PATH, items: priceItems },
    ];

    useNotificationPopups(JSON.stringify([username, branch, endoEnabled, pickingEnabled, stockEnabled, priceEnabled]), feeds);

    return {
        enabled: endoEnabled || pickingEnabled || stockEnabled || priceEnabled,
        items: feeds.flatMap((feed) => feed.items ?? [])
            .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
        countsByPath: Object.fromEntries(feeds.map(({ href, items }) => [href, items?.length ?? 0])),
        hasLoaded: feeds.some((feed) => feed.items !== undefined),
    };
}
