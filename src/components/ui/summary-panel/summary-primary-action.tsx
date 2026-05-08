import type { ReactNode } from "react";
import { Loader2 } from "@/lib/icons/lucide";

interface SummaryPrimaryActionProps {
    label: ReactNode;
    loading?: boolean;
    disabled?: boolean;
    icon?: ReactNode;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    fullWidth?: boolean;
    className?: string;
}

export default function SummaryPrimaryAction({
    label,
    loading = false,
    disabled = false,
    icon,
    onClick,
    type = "button",
    fullWidth = true,
    className = "",
}: SummaryPrimaryActionProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            aria-busy={loading}
            className={[
                "flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300",
                fullWidth ? "w-full" : "",
                className,
            ].join(" ")}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
            {label}
        </button>
    );
}
