"use client";

import { useState } from "react";
import {
    Check,
    Circle,
    Loader2,
    PanelRightClose,
    PanelRightOpen,
    Send,
    ShoppingCart,
    Trash2,
} from "@/app/lib/lucide";

export interface EndoBasketUiItem {
    uid: string;
    basketIds: string[];
    mtrl: number;
    qty: number;
    fromBranch: string;
    toBranch: string;
    itemCode: string;
    itemDescr: string;
    manufacturer?: string;
}

interface EndoOrderSummaryProps {
    currentBranchCode: string;
    currentBranchName: string;
    basketItems: EndoBasketUiItem[];
    selectedItems: Set<string>;
    loading: boolean;
    error: string;
    successMessage: string;
    sendingOrder: boolean;
    onToggleItem: (uid: string) => void;
    onRemoveItem: (uid: string) => void;
    onSendOrder: () => void;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function EndoOrderSummary({
    currentBranchCode,
    currentBranchName,
    basketItems,
    selectedItems,
    loading,
    error,
    successMessage,
    sendingOrder,
    onToggleItem,
    onRemoveItem,
    onSendOrder,
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
}: EndoOrderSummaryProps) {
    const selectedLines = basketItems.filter((item) => selectedItems.has(item.uid));
    const selectedQty = selectedLines.reduce((sum, item) => sum + item.qty, 0);

    if (collapsible && collapsed) {
        return (
            <aside className="hidden xl:flex shrink-0">
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label="Εμφάνιση σύνοψης"
                    className="mt-6 flex h-8 w-8 items-center justify-center self-start rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                    <PanelRightOpen className="h-4 w-4" />
                </button>
            </aside>
        );
    }

    return (
        <aside className="min-h-[280px] w-full xl:min-h-0 xl:basis-1/3 xl:min-w-[320px]">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="shrink-0 border-b border-gray-100 px-5 py-5 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">
                                Σύνοψη Ενδοδιακίνησης
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-gray-800 dark:text-white/90">
                                Καλάθι Ενδοπαραγγελίας
                            </h3>
                        </div>

                        {collapsible && onToggleCollapse && (
                            <button
                                type="button"
                                onClick={onToggleCollapse}
                                title="Απόκρυψη καλαθιού"
                                aria-label="Απόκρυψη σύνοψης"
                                className="hidden xl:flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                            >
                                <PanelRightClose className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                    <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-500/20 dark:bg-brand-500/5">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
                            Κατάστημα Παραλαβής
                        </p>
                        <p className="mt-2 font-semibold text-gray-800 dark:text-white/90">
                            {currentBranchName || "—"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            Κωδικός: {currentBranchCode || "—"}
                        </p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                Γραμμές
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                                {selectedLines.length}
                                <span className="text-sm font-normal text-gray-400">
                                    {" "}/ {basketItems.length}
                                </span>
                            </p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                Τεμάχια
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                                {selectedQty}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-500/30 dark:bg-green-500/10">
                            <p className="text-sm text-green-700 dark:text-green-400">
                                {successMessage}
                            </p>
                        </div>
                    )}

                    {loading && (
                        <div className="mt-5 flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                        </div>
                    )}

                    {!loading && (
                        <div className="mt-5">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                    Γραμμές Καλαθιού
                                </p>
                                {basketItems.length > 0 && (
                                    <span className="text-xs text-gray-400">
                                        {basketItems.length} {basketItems.length === 1 ? "γραμμή" : "γραμμές"}
                                    </span>
                                )}
                            </div>

                            {basketItems.length === 0 ? (
                                <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                                    <ShoppingCart className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                                    <p className="mt-3 text-sm text-gray-400">Το καλάθι είναι κενό</p>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {basketItems.map((item) => (
                                        <EndoBasketLineItem
                                            key={item.uid}
                                            item={item}
                                            isSelected={selectedItems.has(item.uid)}
                                            onToggle={onToggleItem}
                                            onRemove={onRemoveItem}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-gray-100 px-5 py-5 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={onSendOrder}
                        disabled={sendingOrder || selectedItems.size === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                    >
                        {sendingOrder ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        Αποστολή Ενδοπαραγγελίας
                    </button>
                </div>
            </div>
        </aside>
    );
}

function EndoBasketLineItem({
    item,
    isSelected,
    onToggle,
    onRemove,
}: {
    item: EndoBasketUiItem;
    isSelected: boolean;
    onToggle: (uid: string) => void;
    onRemove: (uid: string) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`group rounded-xl border p-3 transition-all ${isSelected
            ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
            : "border-gray-200 bg-gray-50/50 opacity-60 dark:border-gray-800 dark:bg-gray-900/40"
            }`}>
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    onClick={() => onToggle(item.uid)}
                    aria-label={isSelected ? "Αποεπιλογή" : "Επιλογή"}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${isSelected
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-gray-300 text-transparent hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                        }`}
                >
                    {isSelected ? (
                        <Check className="h-3 w-3" />
                    ) : (
                        <Circle className="h-3 w-3" />
                    )}
                </button>

                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-white/90">
                        {item.itemCode || String(item.mtrl)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{item.itemDescr || "—"}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>
                            ΠΟΣΟΤΗΤΑ:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {item.qty}
                            </span>
                        </span>
                        <span>
                            MTRL:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {item.mtrl}
                            </span>
                        </span>
                        <span>
                            ΑΠΟ:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {item.fromBranch}
                            </span>
                        </span>
                        <span>
                            ΠΡΟΣ:{" "}
                            <span className="font-medium text-gray-700 dark:text-white/90">
                                {item.toBranch}
                            </span>
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsExpanded((prev) => !prev)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                        {isExpanded ? "Απόκρυψη στοιχείων" : "Περισσότερα στοιχεία"}
                    </button>

                    {isExpanded && (
                        <div className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-white/70 p-3 dark:border-gray-800 dark:bg-gray-900/60">
                            <p className="text-xs text-gray-700 dark:text-gray-200">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                    BASKET IDS:
                                </span>{" "}
                                {item.basketIds.join(", ") || "-"}
                            </p>
                            {item.manufacturer && (
                                <p className="text-xs text-gray-700 dark:text-gray-200">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                                        Μάρκα:
                                    </span>{" "}
                                    {item.manufacturer}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => onRemove(item.uid)}
                    aria-label="Αφαίρεση"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
}
