import { formatNotificationAge, type AppNotification } from "@/lib/notifications";

export default function NotificationPreview({ item, now }: { item: AppNotification; now: number }) {
    return (
        <div className="min-w-0">
            {(!!item.badges?.length || item.timestamp !== undefined) && (
                <div className={`flex items-start justify-between gap-3 ${item.text ? "mb-1" : ""}`}>
                    <div className="flex min-w-0 flex-wrap items-center gap-1">
                        {item.badges?.map(({ label, tone }) => (
                            <span
                                key={label}
                                title={label}
                                className={`min-w-0 truncate rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                    {item.timestamp !== undefined && (
                        <span className="shrink-0 text-xs leading-5 text-gray-500 dark:text-gray-400">
                            {formatNotificationAge(item.timestamp, now)}
                        </span>
                    )}
                </div>
            )}
            {item.text && (
                <span
                    className="block whitespace-normal break-words text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                    {item.text}
                </span>
            )}
        </div>
    );
}
