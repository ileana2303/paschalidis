"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
    Loader2,
    Receipt,
    RefreshCw,
    Send,
    StickyNote,
} from "@/lib/icons/lucide";
import BasketLines from "@/components/ui/basket-lines/basket-lines";
import CustomerInfoContainer from "@/components/customer/customer-info-container";
import SummaryPanel, {
    SummaryPanelMessage,
} from "@/components/ui/summary-panel/summary-panel";
import SummaryInfoCard from "@/components/ui/summary-panel/summary-info-card";
import SummaryMetricGrid from "@/components/ui/summary-panel/summary-metric-grid";
import SummaryPrimaryAction from "@/components/ui/summary-panel/summary-primary-action";
import SummaryFormField from "@/components/ui/summary-panel/summary-form-field";
import SummaryTextareaField from "@/components/ui/summary-panel/summary-textarea-field";
import {
    getBasketItemId,
    getBasketItemLineTotal,
} from "@/lib/utils/basket-helpers";
import type { IBasket, IBasketItem, ICustomerInfo } from "@/lib/interface";
import { hasInvoiceAfm } from "@/lib/customers/afm";

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
    notes?: string;
    onNotesChange?: (value: string) => void;
    onSendOrder?: () => void;
    sendingOrder?: boolean;
    onToggleItem?: (uid: string) => void;
    onRemoveItem?: (uid: string) => void;
    onRemoveSelectedItems?: () => void;
    removingItems?: Set<string>;
    removingSelectedItems?: boolean;
    requestedPriceValues?: Record<string, string>;
    onRequestedPriceValueChange?: (uid: string, value: string) => void;
    onRequestPrice?: (uid: string) => void | Promise<void>;
    submittingRequestedPrices?: Set<string>;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    onChangeQuantity?: (uid: string, quantity: number) => void;
    fitContentWhenStacked?: boolean;
    wideLayoutBreakpoint?: "xl" | "2xl";
    onClearCustomer?: () => void;
    onOpenCustomerModal?: () => void;
}

const receiptOptions = [
    { value: "invoice", label: "Τιμολόγιο" },
    { value: "receipt", label: "Απόδειξη" },
] satisfies Array<{ value: ReceiptType; label: string }>;

const formatPrice = (price: number | null) => {
    if (price == null) return "--";
    return price.toFixed(2) + " €";
};

const getBasketItemsTotal = (items: IBasketItem[]) =>
    items.reduce((sum, item) => sum + getBasketItemLineTotal(item), 0);

function SegmentedControl<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: Array<{ value: T; label: ReactNode; disabled?: boolean }>;
    onChange?: (value: T) => void;
}) {
    return (
        <div className="flex min-w-0 gap-1 rounded-xl border border-gray-200 bg-gray-100/80 p-1 dark:border-gray-700 dark:bg-gray-900/80">
            {options.map((option) => {
                const selected = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange?.(option.value)}
                        disabled={option.disabled}
                        aria-pressed={selected}
                        className={[
                            "min-w-0 flex-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                            selected
                                ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-800 dark:text-brand-300"
                                : "text-gray-500 enabled:hover:bg-white/70 enabled:hover:text-gray-800 dark:text-gray-400 dark:enabled:hover:bg-white/5 dark:enabled:hover:text-gray-200",
                        ].join(" ")}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
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
    receiptType = "invoice",
    onReceiptTypeChange,
    notes = "",
    onNotesChange,
    onSendOrder,
    sendingOrder = false,
    onToggleItem,
    onRemoveItem,
    onRemoveSelectedItems,
    removingItems,
    removingSelectedItems = false,
    requestedPriceValues,
    onRequestedPriceValueChange,
    onRequestPrice,
    submittingRequestedPrices,
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
    onChangeQuantity,
    fitContentWhenStacked = false,
    wideLayoutBreakpoint = "xl",
    onClearCustomer,
    onOpenCustomerModal,
}: CustomerOrderSummaryProps) {
    const pathname = usePathname();
    const router = useRouter();
    const isOnBasketPage = pathname === "/basket";
    const canInvoice = hasInvoiceAfm(customer?.AFM);
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

    const handleOpenBasketLineItem = (item: IBasketItem) => {
        const partSearch = String(
            item.ITEM_CODE ||
            item.CODE ||
            item.CODE2 ||
            item.MTRL ||
            ""
        ).trim();

        if (!partSearch) {
            return;
        }

        const params = new URLSearchParams();
        const trdr = String(customer?.TRDR ?? "").trim();

        if (trdr) {
            params.set("trdr", trdr);
        }

        params.set("part", partSearch);
        router.push(`/search-parts?${params.toString()}`);
    };

    return (
        <SummaryPanel
            label="Σύνοψη Παραγγελίας"
            title={(
                <span className="flex min-w-0 items-baseline gap-2">
                    <span className="shrink-0">Καλάθι Πελάτη</span>
                    {customer?.NAME && (
                        <span
                            title={customer.NAME}
                            className="min-w-0 truncate text-sm font-medium text-gray-500 dark:text-gray-400"
                        >
                            · {customer.NAME}
                        </span>
                    )}
                </span>
            )}
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
            panelClassName="bg-white shadow-theme-xs"
            contentClassName="bg-gray-50/50 dark:bg-transparent"
            fitContentWhenStacked={fitContentWhenStacked}
            wideLayoutBreakpoint={wideLayoutBreakpoint}
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
            {onClearCustomer || onOpenCustomerModal ? (
                <CustomerInfoContainer
                    hasMounted
                    customer={customer}
                    onClearCustomer={onClearCustomer}
                    onOpenCustomerModal={onOpenCustomerModal}
                />
            ) : (
                <SummaryInfoCard
                    label="Επιλεγμένος Πελάτης"
                    title={customer?.NAME ?? "Δεν έχει επιλεγεί πελάτης"}
                    compact
                    description={
                        customer
                            ? `ΑΦΜ: ${customer.AFM}`
                            : "Επιλέξτε πελάτη για να εμφανιστούν στοιχεία καλαθιού."
                    }
                />
            )}

            <SummaryMetricGrid
                compact
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
                    onToggleItem={isOnBasketPage ? undefined : onToggleItem}
                    onRemoveItem={isOnBasketPage ? undefined : onRemoveItem}
                    onRemoveSelectedItems={isOnBasketPage ? undefined : onRemoveSelectedItems}
                    removingItems={removingItems}
                    removingSelectedItems={removingSelectedItems}
                    onOpenItem={handleOpenBasketLineItem}
                    onChangeQuantity={onChangeQuantity}
                    requestedPriceValues={requestedPriceValues}
                    onRequestedPriceValueChange={onRequestedPriceValueChange}
                    onRequestPrice={onRequestPrice}
                    submittingRequestedPrices={submittingRequestedPrices}
                />
            )}

            {!customer && !onOpenCustomerModal && (
                <div className="mt-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/40">
                    <p className="text-sm leading-6 text-gray-500">
                        Επιλέξτε πελάτη για να εμφανιστεί η προεπισκόπηση καλαθιού.
                    </p>
                </div>
            )}

            <SummaryFormField
                label="Τύπος Παραστατικού"
                icon={<Receipt className="h-4 w-4" />}
                className="mt-5"
            >
                <SegmentedControl
                    value={canInvoice ? receiptType : "receipt"}
                    onChange={onReceiptTypeChange}
                    options={receiptOptions.map((option) => ({
                        ...option,
                        disabled: option.value === "invoice" && !canInvoice,
                    }))}
                />
                {customer && !canInvoice && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Για την έκδοση τιμολογίου απαιτείται έγκυρο ΑΦΜ.
                    </p>
                )}
            </SummaryFormField>

            <SummaryTextareaField
                id="order-notes"
                label="Παρατηρήσεις"
                icon={<StickyNote className="h-4 w-4" />}
                value={notes}
                onChange={(value) => onNotesChange?.(value)}
                rows={3}
                placeholder="Προσθέστε παρατηρήσεις για την παραγγελία..."
                fieldClassName="mt-5"
            />
        </SummaryPanel>
    );
}
