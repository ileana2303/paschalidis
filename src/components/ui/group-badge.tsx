import type { LucideIcon } from "@/lib/icons/lucide";

type GroupBadgeTone = "brand" | "amber";
type GroupBadgeSize = "xs" | "sm";

interface GroupBadgeProps {
    /** Optional group id shown in a leading segment (e.g. TRDPGROUP). */
    id?: string | number | null;
    code?: string | null;
    name?: string | null;
    icon: LucideIcon;
    /** Prefix of the id in the hover title, e.g. "TRDPGROUP". */
    idLabel?: string;
    emptyLabel?: string;
    tone?: GroupBadgeTone;
    size?: GroupBadgeSize;
    /** Hide the " - NAME" part below the sm breakpoint (code stays visible). */
    collapseNameOnMobile?: boolean;
    className?: string;
}

// Neutral white chip; the tone only tints the icon and the id segment so the
// badge sits quietly next to the status badges instead of competing with them.
const TONES: Record<GroupBadgeTone, { icon: string; id: string }> = {
    brand: {
        icon: "text-brand-500 dark:text-brand-400",
        id: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    },
    amber: {
        icon: "text-amber-500 dark:text-amber-400",
        id: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
};

const SIZES: Record<GroupBadgeSize, { text: string; pad: string; icon: string }> = {
    xs: { text: "text-[10px] leading-tight", pad: "py-0.5", icon: "h-3 w-3" },
    sm: { text: "text-[11px]", pad: "py-1", icon: "h-3.5 w-3.5" },
};

const clean = (value: unknown) => String(value ?? "").trim();

/** Chip with an optional "[icon] id" segment followed by a truncating "CODE - NAME". */
export default function GroupBadge({
    id,
    code,
    name,
    icon: Icon,
    idLabel = "",
    emptyLabel,
    tone = "brand",
    size = "sm",
    collapseNameOnMobile = false,
    className = "",
}: GroupBadgeProps) {
    const groupId = clean(id);
    const groupCode = clean(code);
    const groupName = clean(name);
    const sizing = SIZES[size];
    const colors = TONES[tone];

    if (!groupId && !groupCode && !groupName) {
        if (!emptyLabel) return null;

        return (
            <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500 ${sizing.text} ${sizing.pad} ${className}`}
            >
                <Icon className={sizing.icon} aria-hidden="true" />
                {emptyLabel}
            </span>
        );
    }

    const fullLabel = [groupCode, groupName].filter(Boolean).join(" - ");
    const nameHiddenClass = collapseNameOnMobile && groupCode ? "hidden sm:inline" : "";

    return (
        <span
            title={[groupId && `${idLabel} ${groupId}`.trim(), fullLabel].filter(Boolean).join(" · ")}
            className={`inline-flex min-w-0 max-w-full shrink items-stretch overflow-hidden rounded-full border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 ${sizing.text} ${className}`}
        >
            {groupId && (
                <span className={`inline-flex shrink-0 items-center gap-1 border-r border-gray-200 pl-2 pr-1.5 font-semibold tabular-nums dark:border-gray-700 ${colors.id} ${sizing.pad}`}>
                    <Icon className={sizing.icon} aria-hidden="true" />
                    {groupId}
                </span>
            )}
            {fullLabel && (
                <span className={`inline-flex min-w-0 items-center gap-1 pr-2.5 pl-2 ${sizing.pad}`}>
                    {!groupId && <Icon className={`${sizing.icon} shrink-0 ${colors.icon}`} aria-hidden="true" />}
                    <span className="min-w-0 truncate">
                        {groupCode && (
                            <span className="font-semibold text-gray-800 dark:text-white/90">{groupCode}</span>
                        )}
                        {groupCode && groupName && (
                            <span className={`text-gray-300 dark:text-gray-600 ${nameHiddenClass}`}> - </span>
                        )}
                        {groupName && (
                            <span className={`font-medium text-gray-500 dark:text-gray-400 ${groupCode ? nameHiddenClass : ""}`}>
                                {groupName}
                            </span>
                        )}
                    </span>
                </span>
            )}
        </span>
    );
}
