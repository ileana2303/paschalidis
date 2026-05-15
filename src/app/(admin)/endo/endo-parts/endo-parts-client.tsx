"use client";

import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import { type UIEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus } from "@/lib/icons/lucide";
import type { IEndoListRow, IItem } from "@/lib/interface";
import { useSearchEndoStore } from "@/stores/searchEndoStore";
import { useModal } from "@/hooks/useModal";
import PartsSearchModal from "@/components/search/parts-search-modal";
import SearchBar from "@/components/search/search-bar";
import {
    useAddItemToEndoBasketMutation,
    useFetchEndoListsMutation,
    useSearchItemsMutation,
} from "@/hooks/queries/useApiMutations";
import { normalizeBranchCode, resolveBranchName } from "@/lib/auth/branches";
import { useAuthStore } from "@/stores/authStore";
import { isAxiosError } from "axios";
import EndoOrderSummary, { EndoBasketUiItem } from "@/components/endo/endo-order-summary";
import EndoPartResults from "@/components/endo/endo-part-results";
import type { EndoBranchOption } from "@/components/endo/request-endo-card";

function parseStockValue(value: unknown) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    return Math.floor(parsed);
}

function getItemFieldValue(item: IItem, key: string) {
    return (item as unknown as Record<string, unknown>)[key];
}

function getBranchCodesFromItem(item: IItem) {
    const codes = new Set<string>();

    Object.keys(item).forEach((key) => {
        const match = key.match(/^YP(\d+)$/i);
        if (match?.[1]) {
            codes.add(match[1]);
        }
    });

    return Array.from(codes);
}

function getItemKey(item: IItem) {
    return `${item.ITEM_CODE}-${item.MTRL}`;
}

function getQtyKey(mtrl: string | number, sourceBranch: string) {
    return `${mtrl}:${sourceBranch}`;
}

function parsePositiveInt(value: unknown) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    return Math.floor(parsed);
}

function mapEndoRequestedRows(
    rows: IEndoListRow[],
    currentBranchCode: string
): EndoBasketUiItem[] {
    return rows
        .map((row, index) => {
            const basketId = String(row.BASKETID ?? row.ID ?? "").trim();
            const mtrl = parsePositiveInt(row.MTRL);
            const qty = parsePositiveInt(row.QTY || row.QTY_REQUESTED);
            const rowBranch = String(row.BRANCH ?? "").trim();
            const rowToBranch = String(row.TO_BRANCH ?? "").trim();
            let fromBranch = rowToBranch || rowBranch;
            let toBranch = rowBranch || currentBranchCode;

            if (!fromBranch) {
                fromBranch = "-";
            }

            return {
                uid: basketId ? `endo-${basketId}` : `endo-row-${index}`,
                basketIds: basketId ? [basketId] : [],
                mtrl,
                qty,
                fromBranch,
                toBranch,
                itemCode: String(row.ITEM_CODE ?? row.CODE ?? mtrl ?? "").trim(),
                itemDescr: String(
                    row.ITEM_DESCR ?? row.ITEM_NAME ?? row.NAME ?? "—"
                ).trim(),
                manufacturer: String(row.MNF_DESCR ?? row.MANUFACTURER ?? "").trim(),
            } as EndoBasketUiItem;
        })
        .filter((row) => row.mtrl > 0 && row.qty > 0);
}

function mergeEndoBasketItem(
    items: EndoBasketUiItem[],
    nextItem: EndoBasketUiItem
) {
    const existingIndex = items.findIndex((item) =>
        item.mtrl === nextItem.mtrl &&
        item.fromBranch === nextItem.fromBranch &&
        item.toBranch === nextItem.toBranch
    );

    if (existingIndex === -1) {
        return [...items, nextItem];
    }

    return items.map((item, index) => {
        if (index !== existingIndex) {
            return item;
        }

        return {
            ...item,
            qty: item.qty + nextItem.qty,
            basketIds: Array.from(new Set([...item.basketIds, ...nextItem.basketIds])),
        };
    });
}

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
    const [addingToBasket, setAddingToBasket] = useState<Set<string>>(new Set());
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [basketError, setBasketError] = useState("");
    const [basketSuccess, setBasketSuccess] = useState("");
    const search = useSearchEndoStore((state) => state.searchTerm);
    const setSearch = useSearchEndoStore((state) => state.setSearchTerm);
    const items = useSearchEndoStore((state) => state.items);
    const setItems = useSearchEndoStore((state) => state.setItems);
    const hasSearched = useSearchEndoStore((state) => state.hasSearched);
    const setHasSearched = useSearchEndoStore((state) => state.setHasSearched);
    const user = useAuthStore((state) => state.user);
    const {
        isOpen: isSearchModalOpen,
        openModal: openSearchModal,
        closeModal: closeSearchModal,
    } = useModal();
    const modalInputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { mutateAsync: searchItems } = useSearchItemsMutation();
    const { mutateAsync: addItemToEndoBasket } = useAddItemToEndoBasketMutation();
    const { mutateAsync: fetchEndoLists } = useFetchEndoListsMutation();

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

    const loadRequestedEndoLines = useCallback(async () => {
        if (!hasValidBranch) {
            setBasketItems([]);
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
            setBasketItems(
                mapEndoRequestedRows(data.requested.rows ?? [], currentBranchCode)
            );

            if (String(data.message ?? "").trim()) {
                setBasketError(String(data.message).trim());
            } else {
                setBasketError("");
            }
        } catch (error) {
            setBasketItems([]);
            setBasketError(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία φόρτωσης ENDO_LIST_ESO"
            );
        } finally {
            setSummaryLoading(false);
        }
    }, [currentBranchCode, fetchEndoLists, hasValidBranch]);

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
        items.length > 0 && items.every((item) => expandedItems.has(getItemKey(item)));

    const toggleAllExpanded = () => {
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (areAllResultsExpanded) {
                items.forEach((item) => next.delete(getItemKey(item)));
            } else {
                items.forEach((item) => next.add(getItemKey(item)));
            }
            return next;
        });
    };

    const getRequestedQty = (mtrl: string | number, sourceBranch: string) =>
        quantities[getQtyKey(mtrl, sourceBranch)] ?? 0;

    const setRequestedQty = (mtrl: string | number, sourceBranch: string, next: number) => {
        const qtyKey = getQtyKey(mtrl, sourceBranch);
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
                const location =
                    String(getItemFieldValue(item, `THESI${code}`) ?? "").trim() || "-";

                return {
                    code,
                    label,
                    stock: parseStockValue(getItemFieldValue(item, `YP${code}`)),
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

        if (normalizedRequesterBranch === normalizedRequestFromBranch) {
            setBasketError("Η ενδοδιακίνηση πρέπει να αφορά διαφορετικά καταστήματα");
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

        const requestKey = getQtyKey(item.MTRL, sourceBranchCode);
        setAddingToBasket((prev) => new Set(prev).add(requestKey));
        setBasketError("");
        setBasketSuccess("");

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

            setBasketItems((prev) => mergeEndoBasketItem(prev, nextBasketItem));
            setRequestedQty(item.MTRL, sourceBranchCode, 0);
            setBasketSuccess(response.message ?? "Η γραμμή προστέθηκε στο καλάθι ενδοδιακίνησης");
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
                    className={`relative min-h-0 w-full xl:min-w-0 ${sidebarVisible ? "xl:basis-2/3" : ""} transition-all duration-300`}
                >
                    <div
                        ref={resultsContainerRef}
                        className="h-full overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
                        onScroll={handleResultsScroll}
                    >
                        <div className="sticky top-0 z-10 overflow-hidden bg-white px-5 py-7 transition-all duration-300 dark:bg-[#0f172a] xl:px-10 xl:py-12">
                            <div className="mx-auto w-full max-w-[820px] text-center xl:max-w-[1120px] 2xl:max-w-[1360px]">
                                <h3
                                    className={`overflow-hidden text-theme-xl font-semibold text-gray-800 transition-all duration-300 dark:text-white/90 sm:text-2xl ${hasScrolledResults
                                        ? "mb-0 max-h-0 opacity-0"
                                        : "mb-4 max-h-16 opacity-100"
                                        }`}
                                >
                                    Βρείτε ανταλλακτικά για ενδοδιακίνηση
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

                        <div className="px-5 pb-2 xl:px-10 xl:pb-2">
                            <div className="mx-auto w-full max-w-[820px] text-left xl:max-w-[1120px] 2xl:max-w-[1360px]">
                                {items.length > 0 && (
                                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-gray-500">
                                            Βρέθηκαν {items.length} αποτελέσματα
                                        </p>

                                        <button
                                            type="button"
                                            onClick={toggleAllExpanded}
                                            aria-label={areAllResultsExpanded ? "Κλείσιμο όλων" : "Άνοιγμα όλων"}
                                            title={areAllResultsExpanded ? "Κλείσιμο όλων" : "Άνοιγμα όλων"}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                                        >
                                            <ChevronDown
                                                className={`h-4 w-4 transition-transform duration-200 ${areAllResultsExpanded ? "rotate-180" : ""}`}
                                            />
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {items.map((item) => {
                                        const itemKey = getItemKey(item);
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
                                                    addingToBasket.has(getQtyKey(item.MTRL, branchCode))
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

                <EndoOrderSummary
                    currentBranchCode={currentBranchCode}
                    currentBranchName={currentBranchName}
                    basketItems={basketItems}
                    loading={summaryLoading}
                    error={basketError}
                    successMessage={basketSuccess}
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
