"use client";

import { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import SearchBar from "@/components/search/search-bar";
import ResultsFilterInput from "@/components/search/results-filter-input";
import type { IItem } from "@/lib/interface";
import { Check, GitCompareArrows } from "@/lib/icons/lucide";
import {
    useSearchItemsMutation,
    useSetSimilarItemMutation,
} from "@/hooks/queries/useApiMutations";
import { useSearchSetSimilarStore } from "@/stores/searchSetSimilarStore";
import toast from "react-hot-toast";
import { value } from "@/lib/utils/search-set-similar";

type SearchSide = "left" | "right";

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
    const leftSearch = useSearchSetSimilarStore((state) => state.leftSearch);
    const setLeftSearch = useSearchSetSimilarStore((state) => state.setLeftSearch);
    const rightSearch = useSearchSetSimilarStore((state) => state.rightSearch);
    const setRightSearch = useSearchSetSimilarStore((state) => state.setRightSearch);
    const leftItems = useSearchSetSimilarStore((state) => state.leftItems);
    const setLeftItems = useSearchSetSimilarStore((state) => state.setLeftItems);
    const rightItems = useSearchSetSimilarStore((state) => state.rightItems);
    const setRightItems = useSearchSetSimilarStore((state) => state.setRightItems);
    const selectedLeft = useSearchSetSimilarStore((state) => state.selectedLeft);
    const setSelectedLeft = useSearchSetSimilarStore((state) => state.setSelectedLeft);
    const hasSearched = useSearchSetSimilarStore((state) => state.hasSearched);
    const setHasSearchedSide = useSearchSetSimilarStore(
        (state) => state.setHasSearchedSide
    );
    const [updatingMtrl, setUpdatingMtrl] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [textFilter, setTextFilter] = useState("");
    const [rightTextFilter, setRightTextFilter] = useState("");
    const { mutateAsync: searchLeftItems, isPending: isSearchingLeft } =
        useSearchItemsMutation();
    const { mutateAsync: searchRightItems, isPending: isSearchingRight } =
        useSearchItemsMutation();
    const { mutateAsync: setSimilarItem } = useSetSimilarItemMutation();

    const normalizedTextFilter = textFilter.trim().toLocaleLowerCase("el-GR");
    const filteredLeftItems = useMemo(() => {
        if (!normalizedTextFilter) {
            return leftItems;
        }

        return leftItems.filter((item) =>
            [item.ITEM_CODE, item.ITEM_DESCR, item.MNF_DESCR].some((field) =>
                value(field).toLocaleLowerCase("el-GR").includes(normalizedTextFilter)
            )
        );
    }, [leftItems, normalizedTextFilter]);

    const normalizedRightTextFilter = rightTextFilter
        .trim()
        .toLocaleLowerCase("el-GR");
    const filteredRightItems = useMemo(() => {
        if (!normalizedRightTextFilter) {
            return rightItems;
        }

        return rightItems.filter((item) =>
            [item.ITEM_CODE, item.ITEM_DESCR, item.MNF_DESCR].some((field) =>
                value(field)
                    .toLocaleLowerCase("el-GR")
                    .includes(normalizedRightTextFilter)
            )
        );
    }, [rightItems, normalizedRightTextFilter]);

    const runSearch = async (side: SearchSide) => {
        const term = (side === "left" ? leftSearch : rightSearch).trim();
        if (!term || isSearchingLeft || isSearchingRight) return;

        setError("");
        setSuccess("");
        setHasSearchedSide(side, true);

        try {
            const result = await (
                side === "left" ? searchLeftItems(term) : searchRightItems(term)
            );
            const rows = result.success && Array.isArray(result.rows) ? result.rows : [];

            if (side === "left") {
                setLeftItems(rows);
                setSelectedLeft(null);
                setTextFilter("");
            } else {
                setRightItems(rows);
                setRightTextFilter("");
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
                setRightTextFilter("");
            }
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
            await setSimilarItem({
                mtrl: selectedLeft.MTRL,
                code: selectedLeft.ITEM_CODE,
                name: selectedLeft.ITEM_DESCR,
                code1: newCode1,
                code2: selectedLeft.ITEM_CODE2,
                apvCode: similarItem.ITEM_OMOIO,
            });

            const updatedLeft = {
                ...selectedLeft,
                CODE1_0: newCode1,
                ITEM_OMOIO: similarItem.ITEM_OMOIO,
            };
            setSelectedLeft(updatedLeft);
            setLeftItems(
                leftItems.map((item) =>
                    value(item.MTRL) === value(updatedLeft.MTRL) ? updatedLeft : item
                )
            );
            const message =
                `${value(updatedLeft.ITEM_CODE)}: ενημερώθηκαν το CODE1 και ο κωδικός ομοίου.`;
            setSuccess(message);
            toast.success(message);
        } catch (requestError) {
            const message =
                requestError instanceof Error
                    ? requestError.message
                    : "Η ενημέρωση δεν είναι διαθέσιμη προσωρινά.";
            setError(message);
            toast.error(message);
        } finally {
            setUpdatingMtrl("");
        }
    };

    const emptyMessage = (side: SearchSide, count: number) => {
        if (!hasSearched[side]) {
            return side === "left"
                ? "Αναζητήστε και επιλέξτε το προϊόν που θέλετε να ενημερώσετε."
                : "Αναζητήστε το όμοιο προϊόν που θα δώσει το νέο κωδικό προϊόντος.";
        }
        return count === 0 ? "Δεν βρέθηκαν αποτελέσματα." : "";
    };

    const loadingSide = isSearchingLeft
        ? "left"
        : isSearchingRight
          ? "right"
          : null;

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
                <section className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 lg:col-span-2 lg:min-h-0">
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
                                setTextFilter("");
                                setHasSearchedSide("left", false);
                            }}
                            placeholder="Κωδικός, όνομα ή περιγραφή..."
                            loading={loadingSide === "left"}
                            clearOnFocus={false}
                        />
                    </header>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {emptyMessage("left", leftItems.length) ? (
                            <div className="flex h-full min-h-48 items-center justify-center px-6 text-center text-sm text-gray-500">
                                {emptyMessage("left", leftItems.length)}
                            </div>
                        ) : (
                            <>
                                <div className="z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 bg-white px-4 py-2 dark:border-gray-800 dark:bg-[#0f172a]">
                                    <p className="truncate text-sm text-gray-500">
                                        {normalizedTextFilter
                                            ? `Βρέθηκαν ${filteredLeftItems.length} αποτελέσματα`
                                            : `Βρέθηκαν ${leftItems.length} αποτελέσματα`}
                                    </p>

                                    <ResultsFilterInput
                                        value={textFilter}
                                        onChange={setTextFilter}
                                        ariaLabel="Φιλτράρισμα πρώτων αποτελεσμάτων"
                                    />
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
                                    {filteredLeftItems.length === 0 ? (
                                        <div className="flex min-h-48 items-center justify-center px-6 text-center text-sm text-gray-500">
                                            Δεν βρέθηκαν ανταλλακτικά με το επιλεγμένο φίλτρο.
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 xl:grid-cols-2">
                                            {filteredLeftItems.map((item, index) => {
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
                            </>
                        )}
                    </div>
                </section>

                <section className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 lg:min-h-0">
                    <header className="shrink-0 border-b border-gray-100 p-5 dark:border-gray-800">
                        <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                                2. Όμοιο προϊόν
                            </p>
                            <div className="mt-1 flex min-w-0 items-center justify-between gap-3">
                                <h2 className="min-w-0 truncate text-base font-semibold text-gray-900 dark:text-white xl:text-lg">
                                    Βρείτε το προϊόν αντιστοίχισης
                                </h2>
                                <span
                                    title={
                                        selectedLeft
                                            ? `Ενημέρωση: ${value(selectedLeft.ITEM_CODE)}`
                                            : "Επιλέξτε πρώτα ένα προϊόν από αριστερά."
                                    }
                                    className={`inline-flex max-w-[46%] shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                                        selectedLeft
                                            ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
                                            : "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                    }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                            selectedLeft ? "bg-brand-500" : "bg-gray-400"
                                        }`}
                                    />
                                    <span className="truncate">
                                        {selectedLeft
                                            ? `Ενημέρωση · ${value(selectedLeft.ITEM_CODE)}`
                                            : "Αναμονή επιλογής"}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <SearchBar
                            value={rightSearch}
                            onChange={setRightSearch}
                            onSearch={() => void runSearch("right")}
                            onClear={() => {
                                setRightSearch("");
                                setRightItems([]);
                                setRightTextFilter("");
                                setHasSearchedSide("right", false);
                            }}
                            placeholder="Αναζήτηση ομοίου..."
                            loading={loadingSide === "right"}
                            clearOnFocus={false}
                        />
                    </header>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {emptyMessage("right", rightItems.length) ? (
                            <div className="flex h-full min-h-48 items-center justify-center px-6 text-center text-sm text-gray-500">
                                {emptyMessage("right", rightItems.length)}
                            </div>
                        ) : (
                            <>
                                <div className="z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 bg-white px-4 py-2 dark:border-gray-800 dark:bg-[#0f172a]">
                                    <p className="truncate text-sm text-gray-500">
                                        {normalizedRightTextFilter
                                            ? `Βρέθηκαν ${filteredRightItems.length} αποτελέσματα`
                                            : `Βρέθηκαν ${rightItems.length} αποτελέσματα`}
                                    </p>

                                    <ResultsFilterInput
                                        value={rightTextFilter}
                                        onChange={setRightTextFilter}
                                        ariaLabel="Φιλτράρισμα αποτελεσμάτων ομοίων"
                                    />
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
                                    {filteredRightItems.length === 0 ? (
                                        <div className="flex min-h-48 items-center justify-center px-6 text-center text-sm text-gray-500">
                                            Δεν βρέθηκαν ανταλλακτικά με το επιλεγμένο φίλτρο.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredRightItems.map((item, index) => {
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
                            </>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
