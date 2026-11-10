interface QuantitySelectProps {
    id?: string;
    value: number;
    onChange: (nextQuantity: number) => void;
    max?: number;
    disabled?: boolean;
    placeholder?: string;
    ariaLabel?: string;
    title?: string;
    className?: string;
}

const DEFAULT_MAX_QUANTITY = 100;

function getQuantityOptions(value: number, max?: number) {
    const normalizedMax = Math.max(
        0,
        Math.floor(Number.isFinite(max) ? Number(max) : DEFAULT_MAX_QUANTITY)
    );
    const options = Array.from({ length: normalizedMax }, (_, index) => index + 1);
    const normalizedValue = Math.max(0, Math.floor(value));

    if (normalizedValue > 0 && !options.includes(normalizedValue)) {
        return [...options, normalizedValue].sort((left, right) => left - right);
    }

    return options;
}

export default function QuantitySelect({
    id,
    value,
    onChange,
    max,
    disabled = false,
    placeholder,
    ariaLabel = "Ποσότητα",
    title,
    className = "",
}: QuantitySelectProps) {
    const normalizedValue = Math.max(0, Math.floor(value));
    const options = getQuantityOptions(normalizedValue, max);
    const isShowingPlaceholder = placeholder != null && normalizedValue === 0;

    return (
        <select
            id={id}
            value={normalizedValue}
            onChange={(event) => onChange(Number(event.target.value))}
            disabled={disabled}
            aria-label={ariaLabel}
            title={title}
            className={`h-8 min-w-0 rounded-lg border border-gray-200 bg-white px-2 text-sm tabular-nums shadow-xs outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-500/40 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 ${isShowingPlaceholder ? "font-normal text-gray-400 dark:text-gray-400" : "font-semibold text-gray-800 dark:text-white/90"} ${className}`}
        >
            {placeholder != null && <option value={0}>{placeholder}</option>}
            {options.map((quantity) => (
                <option key={quantity} value={quantity}>
                    {quantity}
                </option>
            ))}
        </select>
    );
}
