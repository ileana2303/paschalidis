"use client";

import { useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import SearchBar from "@/components/search/search-bar";
import type { IItem } from "@/lib/interface";
import { Check, GitCompareArrows } from "@/lib/icons/lucide";
import { searchItems } from "@/lib/api-client/items";
import { httpClient } from "@/lib/http/client";

type SearchSide = "left" | "right";

type SetSimilarResponse = {
    success: boolean;
    message?: string;
};

function value(value: unknown): string {
    return String(value ?? "").trim();
}

function ItemDetails({ item }: { item: IItem }) {
    return (
        <>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">
                        {value(item.ITEM_CODE) || "—"}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {value(item.ITEM_DESCR) || "Χωρίς περιγραφή"}
                    </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    MTRL {value(item.MTRL) || "—"}
                </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                    <dt className="text-gray-400">CODE1_0</dt>
                    <dd className="mt-0.5 break-all font-medium text-gray-700 dark:text-gray-200">
                        {value(item.CODE1_0) || "—"}
                    </dd>
                </div>
                <div>
                    <dt className="text-gray-400">CODE2</dt>
                    <dd className="mt-0.5 break-all font-medium text-gray-700 dark:text-gray-200">
                        {value(item.ITEM_CODE2) || "—"}
                    </dd>
                </div>
                <div className="col-span-2">
                    <dt className="text-gray-400">Κωδικός ομοίου / APVCODE</dt>
                    <dd className="mt-0.5 break-all font-medium text-gray-700 dark:text-gray-200">
                        {value(item.ITEM_OMOIO) || "—"}
                    </dd>
                </div>
            </dl>
        </>
    );
}

export default function SearchSetSimilarClient() {
    const [leftSearch, setLeftSearch] = useState("");
    const [rightSearch, setRightSearch] = useState("");
    const [leftItems, setLeftItems] = useState<IItem[]>([]);
    const [rightItems, setRightItems] = useState<IItem[]>([]);
    const [selectedLeft, setSelectedLeft] = useState<IItem | null>(null);
    const [loadingSide, setLoadingSide] = useState<SearchSide | null>(null);
    const [updatingMtrl, setUpdatingMtrl] = useState("");
    const [hasSearched, setHasSearched] = useState<Record<SearchSide, boolean>>({
        left: false,
        right: false,
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const runSearch = async (side: SearchSide) => {
        const term = (side === "left" ? leftSearch : rightSearch).trim();
        if (!term || loadingSide) return;

        setLoadingSide(side);
        setError("");
        setSuccess("");
        setHasSearched((current) => ({ ...current, [side]: true }));

        try {
            const result = await searchItems(term);
            const rows = result.success && Array.isArray(result.rows) ? result.rows : [];

            if (side === "left") {
                setLeftItems(rows);
                setSelectedLeft(null);
            } else {
                setRightItems(rows);
            }

            if (!result.success) {
                setError(result.message || "Η αναζήτηση δεν ολοκληρώθηκε.");
            }
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Η αναζήτηση δεν είναι διαθέσιμη προσωρινά."
            );
            if (side === "left") {
                setLeftItems([]);
                setSelectedLeft(null);
            } else {
                setRightItems([]);
            }
        } finally {
            setLoadingSide(null);
        }
    };

    const assignSimilarCode = async (similarItem: IItem) => {
        if (!selectedLeft || updatingMtrl) return;

        const newCode1 = value(similarItem.CODE1_0);
        if (!newCode1) {
            setSuccess("");
            setError("Το επιλεγμένο όμοιο προϊόν δεν διαθέτει CODE1_0.");
            return;
        }

        setUpdatingMtrl(value(similarItem.MTRL));
        setError("");
        setSuccess("");

        try {
            const { data } = await httpClient.post<SetSimilarResponse>(
                "/api/items/set-similar",
                {
                    mtrl: selectedLeft.MTRL,
                    code: selectedLeft.ITEM_CODE,
                    name: selectedLeft.ITEM_DESCR,
                    code1: newCode1,
                    code2: selectedLeft.ITEM_CODE2,
                    apvCode: similarItem.ITEM_OMOIO,
                }
            );

            if (!data.success) {
                throw new Error(data.message || "Η ενημέρωση δεν ολοκληρώθηκε.");
            }

            const updatedLeft = {
                ...selectedLeft,
                CODE1_0: newCode1,
                ITEM_OMOIO: similarItem.ITEM_OMOIO,
            };
            setSelectedLeft(updatedLeft);
            setLeftItems((items) =>
                items.map((item) =>
                    value(item.MTRL) === value(updatedLeft.MTRL) ? updatedLeft : item
                )
            );
            setSuccess(
                `${value(updatedLeft.ITEM_CODE)}: ενημερώθηκαν το CODE1 και ο κωδικός ομοίου.`
            );
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Η ενημέρωση δεν είναι διαθέσιμη προσωρινά."
            );
        } finally {
            setUpdatingMtrl("");
        }
    };

    const emptyMessage = (side: SearchSide, count: number) => {
        if (!hasSearched[side]) {
            return side === "left"
                ? "Αναζητήστε και επιλέξτε το προϊόν που θέλετε να ενημερώσετε."
                : "Αναζητήστε το όμοιο προϊόν που θα δώσει το νέο CODE1.";
        }
        return count === 0 ? "Δεν βρέθηκαν αποτελέσματα." : "";
    };

    return (
        <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">
            <div className="shrink-0">
                <PageBreadcrumb pageTitle="Ορισμός Ομοίων Ανταλλακτικών" />
            </div>

            {(error || success) && (
                <div
                    role="status"
                    className={`mb-4 shrink-0 rounded-xl border px-4 py-3 text-sm ${
                        error
                            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                            : "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300"
                    }`}
                >
                    {error || success}
                </div>
            )}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
                <section className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2 lg:min-h-0">
                    <header className="shrink-0 border-b border-gray-100 p-5 dark:border-gray-800">
                        <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                                1. Προϊόν προς ενημέρωση
                            </p>
                            <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                                Επιλέξτε το βασικό προϊόν
                            </h2>
                        </div>
                        <SearchBar
                            value={leftSearch}
                            onChange={setLeftSearch}
                            onSearch={() => void runSearch("left")}
                            onClear={() => {
                                setLeftSearch("");
                                setLeftItems([]);
                                setSelectedLeft(null);
                                setHasSearched((current) => ({ ...current, left: false }));
                            }}
                            placeholder="Κωδικός, όνομα ή περιγραφή..."
                            loading={loadingSide === "left"}
                            clearOnFocus={false}
                        />
                    </header>

                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                        {emptyMessage("left", leftItems.length) ? (
                            <div className="flex h-full min-h-48 items-center justify-center px-6 text-center text-sm text-gray-500">
                                {emptyMessage("left", leftItems.length)}
                            </div>
                        ) : (
                            <div className="grid gap-3 xl:grid-cols-2">
                                {leftItems.map((item, index) => {
                                    const itemKey = `${value(item.MTRL)}-${index}`;
                                    const selected =
                                        value(selectedLeft?.MTRL) === value(item.MTRL);
                                    return (
                                        <button
                                            key={itemKey}
                                            type="button"
                                            onClick={() => {
                                                setSelectedLeft(item);
                                                setError("");
                                                setSuccess("");
                                            }}
                                            className={`relative rounded-xl border p-4 text-left transition ${
                                                selected
                                                    ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/15 dark:bg-brand-950/20"
                                                    : "border-gray-200 hover:border-brand-300 hover:shadow-sm dark:border-gray-800"
                                            }`}
                                        >
                                            {selected && (
                                                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white">
                                                    <Check className="h-4 w-4" />
                                                </span>
                                            )}
                                            <ItemDetails item={item} />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                <section className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:min-h-0">
                    <header className="shrink-0 border-b border-gray-100 p-5 dark:border-gray-800">
                        <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                                2. Όμοιο προϊόν
                            </p>
                            <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                                Βρείτε το προϊόν αντιστοίχισης
                            </h2>
                        </div>
                        <SearchBar
                            value={rightSearch}
                            onChange={setRightSearch}
                            onSearch={() => void runSearch("right")}
                            onClear={() => {
                                setRightSearch("");
                                setRightItems([]);
                                setHasSearched((current) => ({ ...current, right: false }));
                            }}
                            placeholder="Αναζήτηση ομοίου..."
                            loading={loadingSide === "right"}
                            clearOnFocus={false}
                        />
                        <p className="mt-3 text-xs text-gray-500">
                            {selectedLeft
                                ? `Ενημέρωση: ${value(selectedLeft.ITEM_CODE)}`
                                : "Επιλέξτε πρώτα ένα προϊόν από αριστερά."}
                        </p>
                    </header>

                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                        {emptyMessage("right", rightItems.length) ? (
                            <div className="flex h-full min-h-48 items-center justify-center px-6 text-center text-sm text-gray-500">
                                {emptyMessage("right", rightItems.length)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rightItems.map((item, index) => {
                                    const isUpdating =
                                        updatingMtrl === value(item.MTRL);
                                    const cannotAssign =
                                        !selectedLeft ||
                                        !value(item.CODE1_0) ||
                                        Boolean(updatingMtrl);
                                    return (
                                        <article
                                            key={`${value(item.MTRL)}-${index}`}
                                            className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                                        >
                                            <ItemDetails item={item} />
                                            <button
                                                type="button"
                                                onClick={() => void assignSimilarCode(item)}
                                                disabled={cannotAssign}
                                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
                                            >
                                                {isUpdating ? (
                                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                ) : (
                                                    <GitCompareArrows className="h-4 w-4" />
                                                )}
                                                {isUpdating
                                                    ? "Ενημέρωση..."
                                                    : "Αντιστοίχιση CODE1"}
                                            </button>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
