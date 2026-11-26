"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useRef, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import NotificationPreview from "@/components/header/NotificationPreview";
import { isPickingListUnauthorized, usePickingListQuery } from "@/hooks/queries/usePickingListQueries";
import { fetchEndoLists } from "@/lib/api-client/endo";
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

function isUnauthorized(error: unknown) {
    return isAxiosError(error) && error.response?.status === 401;
}

export function useAppNotifications() {
    const user = useAuthStore((state) => state.user);
    const permissions = useAuthStore((state) => state.permissions);
    const branch = normalizeBranchCode(user?.mainBranch);
    const username = user?.username ?? "";
    const enabled = Boolean(username && branch);
    const endoEnabled = enabled && canAccessPath(permissions, ENDO_RECEIVED_PATH, branch);
    const pickingEnabled = enabled && canAccessPath(permissions, PICKING_LIST_PATH, branch);
    const endoQuery = useQuery({
        queryKey: [...ENDO_NOTIFICATIONS_QUERY_KEY, username, branch],
        enabled: endoEnabled,
        queryFn: ({ signal }) => fetchEndoItems(branch, signal),
        refetchInterval: (query) => isUnauthorized(query.state.error) ? false : NOTIFICATION_POLL_INTERVAL_MS,
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => failureCount < 1 && !isUnauthorized(error),
    });
    const endoItems = endoEnabled && !isUnauthorized(endoQuery.error) ? endoQuery.data : undefined;
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
    ];

    useNotificationPopups(JSON.stringify([username, branch, endoEnabled, pickingEnabled]), feeds);

    return {
        enabled: endoEnabled || pickingEnabled,
        items: feeds.flatMap((feed) => feed.items ?? [])
            .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
        countsByPath: Object.fromEntries(feeds.map(({ href, items }) => [href, items?.length ?? 0])),
        hasLoaded: feeds.some((feed) => feed.items !== undefined),
    };
}
