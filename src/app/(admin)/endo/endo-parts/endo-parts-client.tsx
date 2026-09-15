"use client";

import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import { type UIEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ListChevronsDownUp,
    ListChevronsUpDown,
    Plus,
    Search,
} from "@/lib/icons/lucide";
import type { IItem } from "@/lib/interface";
import { useSearchEndoStore } from "@/stores/searchEndoStore";
import {
    getBranchCodesFromItem,
    getEndoItemKey,
    getEndoQtyKey,
    getItemLocationForBranch,
    getItemStockForBranch,
    mapEndoRequestedRows,
} from "@/lib/utils/endo";
import { useModal } from "@/hooks/useModal";
import PartsSearchModal from "@/components/search/parts-search-modal";
import SearchBar from "@/components/search/search-bar";
import Checkbox from "@/components/template-components/form/input/Checkbox";
import {
    useAddItemToEndoBasketMutation,
    useDeleteBasketItemsMutation,
    useFetchEndoListsMutation,
    useSearchItemsMutation,
    useUpdateEndoListQtyMutation,
} from "@/hooks/queries/useApiMutations";
import { normalizeBranchCode, resolveBranchName } from "@/lib/auth/branches";
import { useAuthStore } from "@/stores/authStore";
import { isAxiosError } from "axios";
import EndoOrderSummary, { EndoBasketUiItem } from "@/components/endo/endo-order-summary";
import EndoPartResults from "@/components/endo/endo-part-results";
import type { EndoBranchOption } from "@/components/endo/request-endo-card";
import toast from "react-hot-toast";

export default function EndoPartsClient() {
    const [modalSearch, setModalSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [hasScrolledResults, setHasScrolledResults] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [isResultsScrollable, setIsResultsScrollable] = useState<boolean | null>(null);
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [basketItems, setBasketItems] = useState<EndoBasketUiItem[]>([]);
    const [selectedBasketItemIds, setSelectedBasketItemIds] = useState<Set<string>>(new Set());
    const [addingToBasket, setAddingToBasket] = useState<Set<string>>(new Set());
    const [removingSelectedBasketItems, setRemovingSelectedBasketItems] = useState(false);
    const [updatingBasketItemIds, setUpdatingBasketItemIds] = useState<Set<string>>(new Set());
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [basketError, setBasketError] = useState("");
    const [basketSuccess, setBasketSuccess] = useState("");
    const search = useSearchEndoStore((state) => state.searchTerm);
    const setSearch = useSearchEndoStore((state) => state.setSearchTerm);
    const items = useSearchEndoStore((state) => state.items);
    const setItems = useSearchEndoStore((state) => state.setItems);
    const hasSearched = useSearchEndoStore((state) => state.hasSearched);
    const setHasSearched = useSearchEndoStore((state) => state.setHasSearched);
    const clearSearchState = useSearchEndoStore((state) => state.clearState);
    const [textFilter, setTextFilter] = useState("");
    const [statusFilterSelection, setStatusFilterSelection] = useState<Set<string> | null>(null);
    const user = useAuthStore((state) => state.user);
    const {
        isOpen: isSearchModalOpen,
        openModal: openSearchModal,
        closeModal: closeSearchModal,
    } = useModal();
    const modalInputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const basketSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { mutateAsync: searchItems } = useSearchItemsMutation();
    const { mutateAsync: addItemToEndoBasket } = useAddItemToEndoBasketMutation();
    const { mutateAsync: deleteBasketItems } = useDeleteBasketItemsMutation();
    const { mutateAsync: fetchEndoLists } = useFetchEndoListsMutation();
    const { mutateAsync: updateEndoListQty } = useUpdateEndoListQtyMutation();

    useEffect(() => {
        // Remove data saved by older versions and always start this page clean.
        sessionStorage.removeItem("search-endo-storage");
        clearSearchState();

        return () => {
            clearSearchState();
        };
    }, [clearSearchState]);

    const currentBranchCode = useMemo(
        () => normalizeBranchCode(user?.s1code),
        [user?.s1code]
    );
    const hasValidBranch = currentBranchCode.length > 0;

    const currentBranchName = useMemo(() => {
        if (!hasValidBranch) {
            return "—";
        }

        const normalizedCurrent = normalizeBranchCode(currentBranchCode);
        const fromProfile = user?.listBranches?.find(
            (branch) => normalizeBranchCode(branch.s1Code) === normalizedCurrent
        )?.name;

        return resolveBranchName(normalizedCurrent, fromProfile);
    }, [currentBranchCode, hasValidBranch, user?.listBranches]);

    const clearBasketSuccessTimeout = useCallback(() => {
        if (basketSuccessTimeoutRef.current) {
            clearTimeout(basketSuccessTimeoutRef.current);
            basketSuccessTimeoutRef.current = null;
        }
    }, []);

    const resetBasketSuccess = useCallback(() => {
        clearBasketSuccessTimeout();
        setBasketSuccess("");
    }, [clearBasketSuccessTimeout]);

    const showBasketSuccess = useCallback(
        (message: string, duration = 3000) => {
            clearBasketSuccessTimeout();
            setBasketSuccess(message);
            toast.success(message, { duration });
            basketSuccessTimeoutRef.current = setTimeout(() => {
                setBasketSuccess("");
                basketSuccessTimeoutRef.current = null;
            }, duration);
        },
        [clearBasketSuccessTimeout]
    );

    const loadRequestedEndoLines = useCallback(async () => {
        if (!hasValidBranch) {
            setBasketItems([]);
            setSelectedBasketItemIds(new Set());
            setBasketError("Δεν βρέθηκε ενεργό κατάστημα στο προφίλ χρήστη");
            setSummaryLoading(false);
            return;
        }

        setSummaryLoading(true);

        try {
            const data = await fetchEndoLists({
                branch: currentBranchCode,
                scope: "requested",
            });
            const nextBasketItems = mapEndoRequestedRows(
                data.requested.rows ?? [],
                currentBranchCode
            );

            setBasketItems(nextBasketItems);
            setSelectedBasketItemIds(
                new Set(nextBasketItems.map((item) => item.uid))
            );

            if (String(data.message ?? "").trim()) {
                setBasketError(String(data.message).trim());
            } else {
                setBasketError("");
            }
        } catch (error) {
            setBasketItems([]);
            setSelectedBasketItemIds(new Set());
            setBasketError(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία φόρτωσης ENDO_LIST_ESO"
            );
        } finally {
            setSummaryLoading(false);
        }
    }, [currentBranchCode, fetchEndoLists, hasValidBranch]);

    useEffect(() => {
        return () => {
            clearBasketSuccessTimeout();
        };
    }, [clearBasketSuccessTimeout]);

    const handleToggleBasketItem = (uid: string) => {
        setSelectedBasketItemIds((prev) => {
            const next = new Set(prev);

            if (next.has(uid)) {
                next.delete(uid);
            } else {
                next.add(uid);
            }

            return next;
        });
    };

    const handleRemoveBasketItems = async (uids: string[]) => {
        const idsToRemove = new Set(uids);
        const itemsToRemove = basketItems.filter((item) => idsToRemove.has(item.uid));

        if (itemsToRemove.length === 0) {
            return;
        }

        const basketIds = itemsToRemove
            .flatMap((item) => item.basketIds)
            .map((basketId) => String(basketId ?? "").trim())
            .filter(Boolean);

        setRemovingSelectedBasketItems(true);
        setBasketError("");
        resetBasketSuccess();

        try {
            if (basketIds.length > 0) {
                await deleteBasketItems({
                    basketIds,
                    tableAction: "ENDO",
                    method: "LINK_S1",
                    s1Key: "1305",
                    appUserId: user?.uid,
                });

                await loadRequestedEndoLines();
            } else {
                setBasketItems((prev) =>
                    prev.filter((item) => !idsToRemove.has(item.uid))
                );
                setSelectedBasketItemIds((prev) => {
                    const next = new Set(prev);
                    idsToRemove.forEach((uid) => next.delete(uid));
                    return next;
                });
            }

            showBasketSuccess(
                itemsToRemove.length === 1
                    ? "Η γραμμή αφαιρέθηκε από το καλάθι"
                    : "Οι επιλεγμένες γραμμές αφαιρέθηκαν από το καλάθι"
            );
        } catch (error) {
            setBasketError(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία διαγραφής γραμμών ενδοδιακίνησης"
            );
        } finally {
            setRemovingSelectedBasketItems(false);
        }
    };

    const handleUpdateBasketQty = async (uid: string, nextQty: number) => {
        const normalizedQty = Number.isFinite(nextQty)
            ? Math.max(1, Math.floor(nextQty))
            : 1;
        const basketItem = basketItems.find((item) => item.uid === uid);

        if (!basketItem) {
            setBasketError("Δεν βρέθηκε η γραμμή καλαθιού για ενημέρωση ποσότητας");
            return;
        }

        if (basketItem.basketIds.length !== 1) {
            setBasketError("Η ενημέρωση ποσότητας απαιτεί μοναδική γραμμή καλαθιού.");
            return;
        }

        setBasketError("");
        resetBasketSuccess();
        setUpdatingBasketItemIds((prev) => new Set(prev).add(uid));

        try {
            await updateEndoListQty({
                basketId: basketItem.basketIds[0],
                qty: normalizedQty,
                mtrl: basketItem.mtrl,
                toBranch: basketItem.fromBranch,
                branch: basketItem.toBranch || currentBranchCode,
                appUserId: user?.uid,
            });

            setBasketItems((prev) =>
                prev.map((item) =>
                    item.uid === uid
                        ? {
                            ...item,
                            qty: normalizedQty,
                        }
                        : item
                )
            );
            showBasketSuccess("Η ποσότητα ανανεώθηκε");
        } catch (error) {
            if (isAxiosError(error)) {
                const responseMessage =
                    typeof error.response?.data?.message === "string"
                        ? error.response.data.message
                        : undefined;
                setBasketError(responseMessage ?? error.message);
            } else {
                setBasketError(
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία ενημέρωσης ποσότητας ενδοδιακίνησης"
                );
            }
        } finally {
            setUpdatingBasketItemIds((prev) => {
                const next = new Set(prev);
                next.delete(uid);
                return next;
            });
        }
    };

    const handleOpenSearchModal = useCallback(() => {
        setModalSearch("");
        openSearchModal();
    }, [openSearchModal]);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (hasMounted) {
            searchInputRef.current?.focus();
        }
    }, [hasMounted]);

    useEffect(() => {
        const updateScrollability = () => {
            const container = resultsContainerRef.current;
            if (!container) {
                return;
            }

            setIsResultsScrollable(container.scrollHeight > container.clientHeight + 1);
        };

        updateScrollability();
        window.addEventListener("resize", updateScrollability);

        return () => {
            window.removeEventListener("resize", updateScrollability);
        };
    }, [hasMounted, items.length]);

    useEffect(() => {
        if (isSearchModalOpen) {
            modalInputRef.current?.focus();
        }
    }, [isSearchModalOpen]);

    useEffect(() => {
        void loadRequestedEndoLines();
    }, [loadRequestedEndoLines]);

    useEffect(() => {
        const handleEnterShortcut = (event: KeyboardEvent) => {
            if (event.key !== "Enter" || isSearchModalOpen) {
                return;
            }

            const activeElement = document.activeElement as HTMLElement | null;
            const tagName = activeElement?.tagName.toLowerCase();
            const isTypingContext =
                tagName === "input" ||
                tagName === "textarea" ||
                tagName === "select" ||
                tagName === "button" ||
                activeElement?.isContentEditable;

            if (isTypingContext) {
                return;
            }

            event.preventDefault();
            handleOpenSearchModal();
        };

        window.addEventListener("keydown", handleEnterShortcut);

        return () => {
            window.removeEventListener("keydown", handleEnterShortcut);
        };
    }, [handleOpenSearchModal, isSearchModalOpen]);

    const runSearch = async (value: string) => {
        const trimmedSearch = value.trim();

        if (!trimmedSearch) {
            return false;
        }

        setHasSearched(true);
        setLoading(true);

        try {
            const data = await searchItems(trimmedSearch);
            setSearch(trimmedSearch);

            if (data.success) {
                setItems(data.rows);
            } else {
                setItems([]);
            }

            return true;
        } catch (error) {
            console.error(error);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        await runSearch(search);
    };

    const handleModalSearch = async () => {
        const hasRunSearch = await runSearch(modalSearch);

        if (hasRunSearch) {
            closeSearchModal();
        }
    };

    const toggleExpanded = (itemKey: string) => {
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (next.has(itemKey)) {
                next.delete(itemKey);
            } else {
                next.add(itemKey);
            }
            return next;
        });
    };

    const areAllResultsExpanded =
        items.length > 0 && items.every((item) => expandedItems.has(getEndoItemKey(item)));

    const toggleAllExpanded = () => {
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (areAllResultsExpanded) {
                items.forEach((item) => next.delete(getEndoItemKey(item)));
            } else {
                items.forEach((item) => next.add(getEndoItemKey(item)));
            }
            return next;
        });
    };

    const availableStatusLabels = useMemo(() => {
        const labels = new Set<string>();

        for (const item of items) {
            const label = String(item.STATUS_LABEL ?? "").trim();

            if (label) {
                labels.add(label);
            }
        }

        return Array.from(labels).sort((a, b) => a.localeCompare(b, "el"));
    }, [items]);

    const availableStatusLabelsKey = availableStatusLabels.join("\0");
    const [syncedStatusLabelsKey, setSyncedStatusLabelsKey] = useState(availableStatusLabelsKey);

    if (syncedStatusLabelsKey !== availableStatusLabelsKey) {
        setSyncedStatusLabelsKey(availableStatusLabelsKey);
        setStatusFilterSelection(null);
    }

    const selectedStatusLabels = useMemo(
        () => statusFilterSelection ?? new Set(availableStatusLabels),
        [statusFilterSelection, availableStatusLabels],
    );

    const normalizedTextFilter = textFilter.trim().toLowerCase();
    const isStatusFilterActive =
        statusFilterSelection !== null &&
        statusFilterSelection.size < availableStatusLabels.length;

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const statusLabel = String(item.STATUS_LABEL ?? "").trim();

            if (
                isStatusFilterActive &&
                statusLabel &&
                !selectedStatusLabels.has(statusLabel)
            ) {
                return false;
            }

            if (!normalizedTextFilter) {
                return true;
            }

            const itemCode = String(item.ITEM_CODE ?? "").toLowerCase();
            const itemDescr = String(item.ITEM_DESCR ?? "").toLowerCase();
            const manufacturerDescr = String(item.MNF_DESCR ?? "").toLowerCase();

            return (
                itemCode.includes(normalizedTextFilter) ||
                itemDescr.includes(normalizedTextFilter) ||
                manufacturerDescr.includes(normalizedTextFilter)
            );
        });
    }, [items, isStatusFilterActive, normalizedTextFilter, selectedStatusLabels]);

    const hasActiveFilters = normalizedTextFilter.length > 0 || isStatusFilterActive;

    const toggleStatusLabel = (statusLabel: string) => {
        setStatusFilterSelection((prev) => {
            const current = prev ?? new Set(availableStatusLabels);
            const next = new Set(current);

            if (next.has(statusLabel)) {
                next.delete(statusLabel);
            } else {
                next.add(statusLabel);
            }

            return next;
        });
    };

    const getRequestedQty = (mtrl: string | number, sourceBranch: string) =>
        quantities[getEndoQtyKey(mtrl, sourceBranch)] ?? 0;

    const setRequestedQty = (mtrl: string | number, sourceBranch: string, next: number) => {
        const qtyKey = getEndoQtyKey(mtrl, sourceBranch);
        const normalizedQty = Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0;

        setQuantities((prev) => {
            if (normalizedQty <= 0) {
                if (!(qtyKey in prev)) {
                    return prev;
                }
                const copy = { ...prev };
                delete copy[qtyKey];
                return copy;
            }

            return {
                ...prev,
                [qtyKey]: normalizedQty,
            };
        });
    };

    const getBranchOptions = (item: IItem): EndoBranchOption[] => {
        const branchCodes = new Set<string>(getBranchCodesFromItem(item));

        return Array.from(branchCodes)
            .sort((a, b) => Number(a) - Number(b))
            .filter((code) => code !== currentBranchCode)
            .map((code) => {
                const labelFromProfile = user?.listBranches?.find(
                    (branch) => normalizeBranchCode(branch.s1Code) === code
                )?.name;
                const label = resolveBranchName(code, labelFromProfile);
                const location = getItemLocationForBranch(item, code) || "-";

                return {
                    code,
                    label,
                    stock: getItemStockForBranch(item, code) ?? 0,
                    location,
                };
            });
    };

    const handleAddToBasket = async (item: IItem, sourceBranchCode: string) => {
        const normalizedRequestFromBranch = Number(sourceBranchCode);
        const normalizedRequesterBranch = Number(currentBranchCode);
        const requestedQty = getRequestedQty(item.MTRL, sourceBranchCode);
        const sourceBranchStock = getBranchOptions(item).find(
            (branch) => branch.code === sourceBranchCode
        )?.stock ?? 0;

        if (!Number.isFinite(normalizedRequesterBranch) || normalizedRequesterBranch <= 0) {
            setBasketError("Δεν βρέθηκε ενεργό κατάστημα παραλαβής");
            return;
        }

        if (!Number.isFinite(normalizedRequestFromBranch) || normalizedRequestFromBranch <= 0) {
            setBasketError("Μη έγκυρο κατάστημα αποστολής");
            return;
        }

        if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
            setBasketError("Η ποσότητα πρέπει να είναι μεγαλύτερη από 0");
            return;
        }

        if (requestedQty > sourceBranchStock) {
            setBasketError("Η ζητούμενη ποσότητα υπερβαίνει το διαθέσιμο απόθεμα");
            return;
        }

        const requestKey = getEndoQtyKey(item.MTRL, sourceBranchCode);
        setAddingToBasket((prev) => new Set(prev).add(requestKey));
        setBasketError("");
        resetBasketSuccess();

        try {
            const response = await addItemToEndoBasket({
                MTRL: Number(item.MTRL),
                QTY: requestedQty,
                BRANCH: normalizedRequestFromBranch,
                TO_BRANCH: normalizedRequesterBranch,
                APPUSER_ID: user?.uid,
                ITEM_CODE: item.ITEM_CODE,
                ITEM_DESCR: item.ITEM_DESCR,
                MNF_DESCR: item.MNF_DESCR,
            });

            const basketId = String(response.basketId ?? response.id ?? "").trim();
            const nextBasketItem: EndoBasketUiItem = {
                uid: basketId
                    ? `endo-${basketId}`
                    : `endo-pending-${item.MTRL}-${sourceBranchCode}-${Date.now()}`,
                basketIds: basketId ? [basketId] : [],
                mtrl: Number(item.MTRL),
                qty: requestedQty,
                fromBranch: sourceBranchCode,
                toBranch: currentBranchCode,
                itemCode: String(item.ITEM_CODE ?? item.MTRL),
                itemDescr: String(item.ITEM_DESCR ?? "—"),
                manufacturer: String(item.MNF_DESCR ?? "").trim(),
            };

            setBasketItems((prev) => [...prev, nextBasketItem]);
            setSelectedBasketItemIds((prev) =>
                new Set(prev).add(nextBasketItem.uid)
            );
            setRequestedQty(item.MTRL, sourceBranchCode, 0);
            showBasketSuccess(
                response.message ?? "Η γραμμή προστέθηκε στο καλάθι ενδοδιακίνησης"
            );
        } catch (error) {
            if (isAxiosError(error)) {
                const responseMessage =
                    typeof error.response?.data?.message === "string"
                        ? error.response.data.message
                        : undefined;
                setBasketError(responseMessage ?? error.message);
            } else {
                setBasketError(
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία προσθήκης στο καλάθι ενδοδιακίνησης"
                );
            }
        } finally {
            setAddingToBasket((prev) => {
                const next = new Set(prev);
                next.delete(requestKey);
                return next;
            });
        }
    };

    const handleResultsScroll = (event: UIEvent<HTMLDivElement>) => {
        if (event.currentTarget.scrollTop > 0) {
            setHasScrolledResults(true);
        }
    };

    return (
        <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">

            <div className="shrink-0">
                <PageBreadcrumb pageTitle="Ενδοδιακίνηση Ανταλλακτικών" />
            </div>



            <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
                <div
                    className={`min-h-0 w-full xl:min-w-0 ${sidebarVisible ? "xl:basis-2/3" : ""} flex flex-1 flex-col transition-all duration-300`}
                >
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="shrink-0 px-5 py-6 dark:border-gray-800 xl:px-10">
                            <div className="mx-auto w-full max-w-[820px] text-center xl:max-w-[1120px] 2xl:max-w-[1360px]">
                                <h3
                                    className={`overflow-hidden text-theme-xl font-semibold text-gray-800 transition-all duration-300 dark:text-white/90 sm:text-2xl ${hasScrolledResults
                                        ? "mb-0 max-h-0 opacity-0"
                                        : "mb-4 max-h-16 opacity-100"
                                        }`}
                                >
                                    Aναζήτηση ανταλλακτικων για Ενδοδιακίνηση
                                </h3>

                                <SearchBar
                                    inputRef={searchInputRef}
                                    value={search}
                                    onChange={setSearch}
                                    onSearch={handleSearch}
                                    onClear={() => setSearch("")}
                                    placeholder="Κωδικός ανταλλακτικού, όνομα, περιγραφή..."
                                    loading={loading}
                                    containerClassName={hasScrolledResults ? "mt-0" : "mt-6"}
                                    searchButtonClassName="font-medium shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow-md"
                                />
                            </div>
                        </div>

                        <div className="relative min-h-0 flex-1">
                            <div
                                ref={resultsContainerRef}
                                className="h-full overflow-y-auto overscroll-contain"
                                onScroll={handleResultsScroll}
                            >
                                <div className="px-5 pb-2 xl:px-10 xl:pb-2">
                                    <div className="mx-auto w-full max-w-[820px] text-left xl:max-w-[1120px] 2xl:max-w-[1360px]">
                                        {items.length > 0 && (
                                            <div className="sticky top-0 z-10 mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-gray-100 bg-white py-2 backdrop-blur dark:border-gray-800 dark:bg-[#0f172a]/95">
                                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                                    <p className="truncate text-sm text-gray-500">
                                                        {hasActiveFilters
                                                            ? `Βρέθηκαν ${filteredItems.length} αποτελέσματα`
                                                            : `Βρέθηκαν ${items.length} αποτελέσματα`}
                                                    </p>

                                                    <button
                                                        type="button"
                                                        onClick={toggleAllExpanded}
                                                        aria-label={areAllResultsExpanded ? "Κλείσιμο λεπτομερειών" : "Άνοιγμα λεπτομερειών"}
                                                        title={areAllResultsExpanded ? "Κλείσιμο λεπτομερειών" : "Άνοιγμα λεπτομερειών"}
                                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                                                    >
                                                        {areAllResultsExpanded ? (
                                                            <ListChevronsDownUp className="h-4 w-4" />
                                                        ) : (
                                                            <ListChevronsUpDown className="h-4 w-4" />
                                                        )}
                                                    </button>

                                                    <div className="relative min-w-0 max-w-[220px] flex-1 sm:max-w-[280px]">
                                                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={textFilter}
                                                            onChange={(event) => setTextFilter(event.target.value)}
                                                            placeholder="Κωδικός, περιγραφή, κατασκευαστής..."
                                                            aria-label="Φιλτράρισμα ανταλλακτικών"
                                                            className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2.5 text-xs text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-200"
                                                        />
                                                    </div>

                                                    {availableStatusLabels.length > 0 && (
                                                        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 [&_label]:gap-2 [&_span]:text-xs">
                                                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                                Κατάσταση
                                                            </span>
                                                            {availableStatusLabels.map((statusLabel) => (
                                                                <Checkbox
                                                                    key={statusLabel}
                                                                    id={`endo-status-filter-${statusLabel}`}
                                                                    label={statusLabel}
                                                                    checked={selectedStatusLabels.has(statusLabel)}
                                                                    onChange={() => toggleStatusLabel(statusLabel)}
                                                                    className="h-4 w-4"
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {filteredItems.map((item) => {
                                                const itemKey = getEndoItemKey(item);
                                                const branches = getBranchOptions(item);
                                                const inBasketQtyByBranch = basketItems
                                                    .filter((basketItem) => basketItem.mtrl === Number(item.MTRL))
                                                    .reduce<Record<string, number>>((acc, basketItem) => {
                                                        const sourceBranch =
                                                            basketItem.fromBranch === currentBranchCode
                                                                ? basketItem.toBranch
                                                                : basketItem.fromBranch || basketItem.toBranch;

                                                        if (sourceBranch) {
                                                            acc[sourceBranch] =
                                                                (acc[sourceBranch] ?? 0) + basketItem.qty;
                                                        }

                                                        return acc;
                                                    }, {});

                                                return (
                                                    <EndoPartResults
                                                        key={itemKey}
                                                        item={item}
                                                        currentBranchName={currentBranchName}
                                                        currentBranchStock={getItemStockForBranch(
                                                            item,
                                                            currentBranchCode
                                                        )}
                                                        isExpanded={expandedItems.has(itemKey)}
                                                        branches={branches}
                                                        getRequestedQty={(branchCode) =>
                                                            getRequestedQty(item.MTRL, branchCode)
                                                        }
                                                        onRequestedQtyChange={(branchCode, nextQty) =>
                                                            setRequestedQty(item.MTRL, branchCode, nextQty)
                                                        }
                                                        onAddToBasket={(branchCode) =>
                                                            handleAddToBasket(item, branchCode)
                                                        }
                                                        isAdding={(branchCode) =>
                                                            addingToBasket.has(getEndoQtyKey(item.MTRL, branchCode))
                                                        }
                                                        inBasketQtyByBranch={inBasketQtyByBranch}
                                                        onToggleExpanded={() => toggleExpanded(itemKey)}
                                                    />
                                                );
                                            })}
                                        </div>

                                        {hasSearched && !loading && items.length === 0 && (
                                            <p className="mt-6 text-center text-sm text-gray-400">
                                                Δεν βρέθηκαν ανταλλακτικά
                                            </p>
                                        )}

                                        {hasSearched && !loading && items.length > 0 && filteredItems.length === 0 && (
                                            <p className="mt-6 text-center text-sm text-gray-400">
                                                Δεν βρέθηκαν ανταλλακτικά με τα επιλεγμένα φίλτρα
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {items.length > 0 && (hasScrolledResults || isResultsScrollable === false) && (
                                <button
                                    type="button"
                                    onClick={handleOpenSearchModal}
                                    aria-label="Νέα αναζήτηση ανταλλακτικού"
                                    className="absolute bottom-6 right-6 z-20 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-500 bg-brand-500 text-white shadow-lg transition-all duration-200 hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:text-white dark:hover:bg-brand-600"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <EndoOrderSummary
                    currentBranchCode={currentBranchCode}
                    currentBranchName={currentBranchName}
                    basketItems={basketItems}
                    selectedItems={selectedBasketItemIds}
                    loading={summaryLoading}
                    error={basketError}
                    successMessage={basketSuccess}
                    onToggleItem={handleToggleBasketItem}
                    onRemoveItem={(uid) => void handleRemoveBasketItems([uid])}
                    onRemoveSelectedItems={() =>
                        void handleRemoveBasketItems(Array.from(selectedBasketItemIds))
                    }
                    removingSelectedItems={removingSelectedBasketItems}
                    onChangeQuantity={(uid, quantity) =>
                        void handleUpdateBasketQty(uid, quantity)
                    }
                    updatingItems={updatingBasketItemIds}
                    collapsible
                    collapsed={!sidebarVisible}
                    onToggleCollapse={() => setSidebarVisible((prev) => !prev)}
                />
            </div>

            <PartsSearchModal
                isOpen={isSearchModalOpen}
                onClose={closeSearchModal}
                inputRef={modalInputRef}
                searchValue={modalSearch}
                onSearchValueChange={setModalSearch}
                onSearch={handleModalSearch}
                loading={loading}
            />
        </div>
    );
}
