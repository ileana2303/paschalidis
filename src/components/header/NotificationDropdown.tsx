"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import type { AppNotification } from "@/lib/notifications";
import { Bell } from "@/lib/icons/lucide";
import { Dropdown } from "../ui/dropdown/Dropdown";
import NotificationPreview from "./NotificationPreview";

export default function NotificationDropdown({ items, hasLoaded }: {
    items: AppNotification[];
    hasLoaded: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [now, setNow] = useState(0);
    const panelId = useId();
    const close = useCallback(() => setIsOpen(false), []);
    const count = items.length;

    useEffect(() => {
        if (!isOpen) return;
        const timer = window.setInterval(() => setNow(Date.now()), 15_000);
        return () => window.clearInterval(timer);
    }, [isOpen]);

    return (
        <div className="relative shrink-0" onKeyDown={(event) => {
            if (event.key === "Escape") close();
        }}>
            <button
                type="button"
                className="dropdown-toggle relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                aria-label={count > 0 ? `Ειδοποιήσεις (${count})` : "Ειδοποιήσεις"}
                aria-expanded={isOpen}
                aria-controls={isOpen ? panelId : undefined}
                onClick={() => {
                    setNow(Date.now());
                    setIsOpen((open) => !open);
                }}
            >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {count > 0 && (
                    <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs font-semibold leading-5 text-white">
                        {count}
                    </span>
                )}
            </button>
            <Dropdown isOpen={isOpen} onClose={close} className="w-[min(28rem,calc(100vw_-_4.5rem))]">
                <div id={panelId}>
                    <p className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
                        Ειδοποιήσεις
                    </p>
                    {count > 0 ? (
                        <ul className="max-h-[min(24rem,65vh)] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                            {items.map((item) => (
                                <li key={item.id}>
                                    <Link
                                        href={item.href}
                                        prefetch={false}
                                        onClick={close}
                                        className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <NotificationPreview item={item} now={now} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {hasLoaded ? "Δεν υπάρχουν ειδοποιήσεις." : "Οι ειδοποιήσεις δεν είναι ακόμη διαθέσιμες."}
                        </p>
                    )}
                </div>
            </Dropdown>
        </div>
    );
}
