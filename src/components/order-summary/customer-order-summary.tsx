"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
    Loader2,
    MapPin,
    Receipt,
    RefreshCw,
    Send,
    StickyNote,
} from "@/lib/icons/lucide";
import BasketLines from "@/components/ui/basket-list/basket-lines";
import SummaryPanel, {
    SummaryPanelMessage,
} from "@/components/ui/summary-panel/summary-panel";
import SummaryInfoCard from "@/components/ui/summary-panel/summary-info-card";
import SummaryMetricGrid from "@/components/ui/summary-panel/summary-metric-grid";
import SummaryPrimaryAction from "@/components/ui/summary-panel/summary-primary-action";
import {
    getBasketItemId,
    getBasketItemLineTotal,
} from "@/lib/utils/basket-helpers";
import type { IBasket, IBasketItem, ICustomerInfo } from "@/lib/interface";

export type ReceiptType = "receipt" | "invoice";

export interface CustomerOrderSummaryProps {
    customer: ICustomerInfo | null;
    basket: IBasket | null;
    loading: boolean;
    error: string;
    onRefresh: () => void;
    successMessage?: ReactNode;
    selectedItems?: Set<string>;
    selectedCount?: number;
    selectedTotal?: number;
    receiptType?: ReceiptType;
    onReceiptTypeChange?: (type: ReceiptType) => void;
    pickupPoint?: string;
    onPickupPointChange?: (value: string) => void;
    notes?: string;
    onNotesChange?: (value: string) => void;
    onSendOrder?: () => void;
    sendingOrder?: boolean;
    onToggleItem?: (uid: string) => void;
    onRemoveItem?: (uid: string) => void;
    onRemoveSelectedItems?: () => void;
    removingItems?: Set<string>;
    removingSelectedItems?: boolean;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

const receiptOptions = [
    { value: "invoice", label: "Τιμολόγιο" },
    { value: "receipt", label: "Απόδειξη" },
] satisfies Array<{ value: ReceiptType; label: string }>;

const pickupPointOptions = [
    { value: "warehouse", label: "Αποθήκη" },
    { value: "store", label: "Κατάστημα" },
    { value: "delivery", label: "Αποστολή" },
];

const formatPrice = (price: number | null) => {
    if (price == null) return "--";
    return price.toFixed(2) + " €";
};

const getBasketItemsTotal = (items: IBasketItem[]) =>
    items.reduce((sum, item) => sum + getBasketItemLineTotal(item), 0);

function FormField({
    label,
    icon,
    htmlFor,
    className = "",
    children,
}: {
    label: ReactNode;
    icon?: ReactNode;
    htmlFor?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={className}>
            <label
                htmlFor={htmlFor}
                className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
                {icon && <span className="text-gray-400">{icon}</span>}
                {label}
            </label>
            {children}
        </div>
    );
}

function SegmentedControl<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: Array<{ value: T; label: ReactNode }>;
    onChange?: (value: T) => void;
}) {
    return (
        <div className="flex gap-2">
            {options.map((option) => {
                const selected = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange?.(option.value)}
                        aria-pressed={selected}
                        className={[
                            "flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
                            selected
                                ? "border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-400"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
                        ].join(" ")}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

function SelectField<T extends string>({
    id,
    label,
    icon,
    value,
    onChange,
    placeholder,
    options,
    fieldClassName = "",
}: {
    id: string;
    label: ReactNode;
    icon?: ReactNode;
    value: T;
    onChange?: (value: T) => void;
    placeholder?: ReactNode;
    options: Array<{ value: T; label: ReactNode }>;
    fieldClassName?: string;
}) {
    return (
        <FormField label={label} icon={icon} htmlFor={id} className={fieldClassName}>
            <select
                id={id}
                value={value}
                onChange={(event) => onChange?.(event.target.value as T)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </FormField>
    );
}

function TextareaField({
    id,
    label,
    icon,
    value,
    onChange,
    rows,
    placeholder,
    fieldClassName = "",
}: {
    id: string;
    label: ReactNode;
    icon?: ReactNode;
    value: string;
    onChange?: (value: string) => void;
    rows?: number;
    placeholder?: string;
    fieldClassName?: string;
}) {
    return (
        <FormField label={label} icon={icon} htmlFor={id} className={fieldClassName}>
            <textarea
                id={id}
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
                rows={rows}
                placeholder={placeholder}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500"
            />
        </FormField>
    );
}

export default function CustomerOrderSummary({
    customer,
    basket,
    loading,
    error,
    onRefresh,
    successMessage,
    selectedItems,
    selectedCount,
    selectedTotal,
    receiptType = "receipt",
    onReceiptTypeChange,
    pickupPoint = "",
    onPickupPointChange,
    notes = "",
    onNotesChange,
    onSendOrder,
    sendingOrder = false,
    onToggleItem,
    onRemoveItem,
    onRemoveSelectedItems,
    removingItems,
    removingSelectedItems = false,
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
}: CustomerOrderSummaryProps) {
    const pathname = usePathname();
    const isOnBasketPage = pathname === "/basket";
    const basketHref = customer?.TRDR
        ? `/basket?trdr=${customer.TRDR}`
        : "/basket";
    const basketItems = basket?.items ?? [];
    const selectedBasketItems =
        selectedItems != null
            ? basketItems.filter((item) => selectedItems.has(getBasketItemId(item)))
            : basketItems;
    const summaryTotal =
        selectedItems == null && selectedTotal != null
            ? selectedTotal
            : getBasketItemsTotal(selectedBasketItems);

    const sendDisabled =
        sendingOrder ||
        (selectedItems ? selectedItems.size === 0 : (basket?.items.length ?? 0) === 0);

    return (
        <SummaryPanel
            label="Σύνοψη Παραγγελίας"
            title="Καλάθι Πελάτη"
            href={isOnBasketPage ? undefined : basketHref}
            actions={
                customer ? (
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loading}
                        title="Ανανέωση"
                        aria-label="Ανανέωση καλαθιού"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                ) : undefined
            }
            collapsible={collapsible}
            collapsed={collapsed}
            onToggleCollapse={onToggleCollapse}
            collapseTitle="Απόκρυψη καλαθιού"
            footer={
                onSendOrder ? (
                    <SummaryPrimaryAction
                        label="Αποστολή Παραγγελίας"
                        loading={sendingOrder}
                        disabled={sendDisabled}
                        icon={<Send className="h-4 w-4" />}
                        onClick={onSendOrder}
                    />
                ) : undefined
            }
        >
            <SummaryInfoCard
                label="Επιλεγμένος Πελάτης"
                title={customer?.NAME ?? "Δεν έχει επιλεγεί πελάτης"}
                description={
                    customer
                        ? `ΑΦΜ: ${customer.AFM}`
                        : "Επιλέξτε πελάτη για να εμφανιστούν στοιχεία καλαθιού."
                }
            />

            <SummaryMetricGrid
                metrics={[
                    {
                        id: "products",
                        label: "Προϊόντα",
                        value: selectedCount ?? basket?.totalcount ?? 0,
                        trailingValue:
                            selectedCount != null ? ` / ${basket?.items.length ?? 0}` : undefined,
                    },
                    {
                        id: "total",
                        label: "Σύνολο",
                        value: formatPrice(summaryTotal),
                        tone: "brand",
                    },
                ]}
            />

            {error && <SummaryPanelMessage tone="error">{error}</SummaryPanelMessage>}
            {successMessage && (
                <SummaryPanelMessage tone="success">
                    {successMessage}
                </SummaryPanelMessage>
            )}
            {loading && (
                <div className="mt-5 flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                </div>
            )}

            {!loading && customer && !error && (
                <BasketLines
                    items={basketItems}
                    selectedItems={selectedItems}
                    onToggleItem={onToggleItem}
                    onRemoveItem={onRemoveItem}
                    onRemoveSelectedItems={onRemoveSelectedItems}
                    removingItems={removingItems}
                    removingSelectedItems={removingSelectedItems}
                />
            )}

            {!customer && (
                <div className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/40">
                    <p className="text-sm leading-6 text-gray-500">
                        Επιλέξτε πελάτη για να εμφανιστεί η προεπισκόπηση καλαθιού.
                    </p>
                </div>
            )}

            <FormField
                label="Τύπος Παραστατικού"
                icon={<Receipt className="h-4 w-4" />}
                className="mt-5"
            >
                <SegmentedControl
                    value={receiptType}
                    onChange={onReceiptTypeChange}
                    options={receiptOptions}
                />
            </FormField>

            <SelectField
                id="pickup-point"
                label="Σημείο Παραλαβής"
                icon={<MapPin className="h-4 w-4" />}
                value={pickupPoint}
                onChange={(value) => onPickupPointChange?.(value)}
                placeholder="Επιλέξτε σημείο..."
                options={pickupPointOptions}
                fieldClassName="mt-5"
            />

            <TextareaField
                id="order-notes"
                label="Σημειώσεις"
                icon={<StickyNote className="h-4 w-4" />}
                value={notes}
                onChange={(value) => onNotesChange?.(value)}
                rows={3}
                placeholder="Προσθέστε σημειώσεις για την παραγγελία..."
                fieldClassName="mt-5"
            />
        </SummaryPanel>
    );
}
