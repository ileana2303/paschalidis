"use client";

import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { type UIEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCustomerStore } from "@/stores/customerStore";
import { useSearchPartsStore } from "@/stores/searchPartsStore";
import { ICustomerInfo, IEndoListRow, IItem, IBasket, IBasketItem, StockRequestStatus } from "@/app/lib/interface";
import {
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemQty,
    normalizeBasket,
} from "@/app/lib/basket";
import { useModal } from "@/hooks/useModal";
import OrderSummary from "@/components/basket/order-summary";
import { useRouter, useSearchParams } from "next/navigation";
import CustomerInfoContainer from "@/components/customer/customer-info-container";
import PartsSearchModal from "@/components/parts/parts-search-modal";
import CustomerSearchModal from "@/components/customer/customer-search-modal";
import EndoOrderSummary, { EndoBasketUiItem } from "@/components/endo/endo-order-summary";
import type { EndoBranchOption } from "@/components/endo/endo-part-results";
import PartsResultsContainer from "@/components/parts/parts-results-container";
import {
    useAddItemToBasketMutation,
    useAddItemToEndoBasketMutation,
    useDeleteBasketItemsMutation,
    useFetchBasketItemsMutation,
    useFetchEndoListsMutation,
    useRequestStockQuantityMutation,
    useSearchCustomersMutation,
    useSearchItemsByTrdrMutation,
    useSearchItemsMutation,
    useSubmitBasketOrderMutation,
    useUpdateBasketItemQtyMutation,
} from "@/hooks/queries/useApiMutations";
import { useAuthStore } from "@/stores/authStore";
import { isAxiosError } from "axios";

function parseStockValue(value: unknown) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    if (!Number.isFinite(parsed)) {
        return 0;
    }

    return parsed;
}

function parseAvailableStock(value: unknown) {
    const parsed = Number(String(value ?? "").trim().replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }

    return Math.floor(parsed);
}

function getItemFieldValue(item: IItem, key: string) {
    const value = (item as unknown as Record<string, unknown>)[key];
    return value;
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

function getEndoItemKey(item: IItem) {
    return `${item.ITEM_CODE}-${item.MTRL}`;
}

function getEndoQtyKey(mtrl: string | number, sourceBranch: string) {
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
            let fromBranch = rowBranch || rowToBranch;
            let toBranch = rowToBranch || currentBranchCode;

            if (rowBranch === currentBranchCode && rowToBranch) {
                fromBranch = rowToBranch;
                toBranch = rowBranch;
            } else if (rowToBranch === currentBranchCode && rowBranch) {
                fromBranch = rowBranch;
                toBranch = rowToBranch;
            }

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

type ReceiptType = "receipt" | "invoice";

export default function SearchPartsClient() {
    const [modalSearch, setModalSearch] = useState("");
    const [customerModalSearch, setCustomerModalSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<ICustomerInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [customerModalLoading, setCustomerModalLoading] = useState(false);
    const [customerModalHasSearched, setCustomerModalHasSearched] = useState(false);
    const [hasScrolledResults, setHasScrolledResults] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [isResultsScrollable, setIsResultsScrollable] = useState<boolean | null>(null);
    const [customerModalError, setCustomerModalError] = useState("");
    const [basket, setBasket] = useState<IBasket | null>(null);
    const [basketLoading, setBasketLoading] = useState(false);
    const [basketError, setBasketError] = useState("");
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [receiptType, setReceiptType] = useState<ReceiptType>("receipt");
    const [pickupPoint, setPickupPoint] = useState("");
    const [notes, setNotes] = useState("");
    const [sendingOrder, setSendingOrder] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [isEndoMode, setIsEndoMode] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [storeOrderQuantities, setStoreOrderQuantities] = useState<Record<string, number>>({});
    const [stockRequestStatuses, setStockRequestStatuses] = useState<Record<string, StockRequestStatus>>({});
    const [stockRequestErrors, setStockRequestErrors] = useState<Record<string, string>>({});
    const [submittingStockRequests, setSubmittingStockRequests] = useState<Set<string>>(new Set());
    const [addingToBasket, setAddingToBasket] = useState<Set<string>>(new Set());
    const [endoQuantities, setEndoQuantities] = useState<Record<string, number>>({});
    const [endoBasketItems, setEndoBasketItems] = useState<EndoBasketUiItem[]>([]);
    const [addingToEndoBasket, setAddingToEndoBasket] = useState<Set<string>>(new Set());
    const [endoSummaryLoading, setEndoSummaryLoading] = useState(false);
    const [endoBasketError, setEndoBasketError] = useState("");
    const [endoBasketSuccess, setEndoBasketSuccess] = useState("");
    const [discountPrices, setDiscountPrices] = useState<Record<string, string>>({});
    const [submittingDiscount, setSubmittingDiscount] = useState<Set<string>>(new Set());
    const [removingBasketItems, setRemovingBasketItems] = useState<Set<string>>(new Set());
    const [removingSelectedBasketItems, setRemovingSelectedBasketItems] = useState(false);
    const search = useSearchPartsStore((state) => state.searchTerm);
    const setSearch = useSearchPartsStore((state) => state.setSearchTerm);
    const items = useSearchPartsStore((state) => state.items);
    const setItems = useSearchPartsStore((state) => state.setItems);
    const hasSearched = useSearchPartsStore((state) => state.hasSearched);
    const setHasSearched = useSearchPartsStore((state) => state.setHasSearched);
    const searchStateTrdr = useSearchPartsStore((state) => state.trdr);
    const setSearchStateTrdr = useSearchPartsStore((state) => state.setTrdr);
    const clearSearchPartsState = useSearchPartsStore((state) => state.clearState);
    const customer = useCustomerStore((state) => state.customer);
    const setCustomer = useCustomerStore((state) => state.setCustomer);
    const clearCustomer = useCustomerStore((state) => state.clearCustomer);
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        isOpen: isSearchModalOpen,
        openModal: openSearchModal,
        closeModal: closeSearchModal,
    } = useModal();
    const {
        isOpen: isCustomerModalOpen,
        openModal: openCustomerModal,
        closeModal: closeCustomerModal,
    } = useModal();
    const modalInputRef = useRef<HTMLInputElement>(null);
    const customerModalInputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const pendingScopedNavigationRef = useRef(false);
    const basketLoadInFlightRef = useRef<Promise<void> | null>(null);
    const basketLoadInFlightTrdrRef = useRef<string | null>(null);
    const basketLoadInFlightIdRef = useRef<number | null>(null);
    const basketRequestIdRef = useRef(0);
    const { mutateAsync: searchItems } = useSearchItemsMutation();
    const { mutateAsync: searchItemsByTrdr } = useSearchItemsByTrdrMutation();
    const { mutateAsync: searchCustomers } = useSearchCustomersMutation();
    const { mutateAsync: fetchBasketItems } = useFetchBasketItemsMutation();
    const { mutateAsync: requestStockQuantity } = useRequestStockQuantityMutation();
    const { mutateAsync: addItemToBasket } = useAddItemToBasketMutation();
    const { mutateAsync: addItemToEndoBasket } = useAddItemToEndoBasketMutation();
    const { mutateAsync: fetchEndoLists } = useFetchEndoListsMutation();
    const { mutateAsync: submitBasketOrder } = useSubmitBasketOrderMutation();
    const { mutateAsync: updateBasketItemQty } = useUpdateBasketItemQtyMutation();
    const { mutateAsync: deleteBasketItems } = useDeleteBasketItemsMutation();
    const currentBranchCode = useMemo(
        () => String(user?.s1code ?? "").trim(),
        [user?.s1code]
    );
    const hasValidBranch = currentBranchCode.length > 0;
    const currentBranchName = useMemo(() => {
        if (!hasValidBranch) {
            return "—";
        }

        const normalizedCurrent = String(currentBranchCode).trim();
        const fromProfile = user?.listBranches?.find(
            (branch) => String(branch.s1Code ?? "").trim() === normalizedCurrent
        )?.name;
        const normalizedProfileName = String(fromProfile ?? "").trim();

        if (normalizedProfileName) {
            return normalizedProfileName;
        }

        return normalizedCurrent;
    }, [currentBranchCode, hasValidBranch, user?.listBranches]);

    const loadRequestedEndoLines = useCallback(async () => {
        if (!hasValidBranch) {
            setEndoBasketItems([]);
            setEndoBasketError("Δεν βρέθηκε ενεργό κατάστημα στο προφίλ χρήστη");
            setEndoSummaryLoading(false);
            return;
        }

        setEndoSummaryLoading(true);

        try {
            const data = await fetchEndoLists({
                branch: currentBranchCode,
                scope: "requested",
            });
            setEndoBasketItems(
                mapEndoRequestedRows(data.requested.rows ?? [], currentBranchCode)
            );

            if (String(data.message ?? "").trim()) {
                setEndoBasketError(String(data.message).trim());
            } else {
                setEndoBasketError("");
            }
        } catch (error) {
            setEndoBasketItems([]);
            setEndoBasketError(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία φόρτωσης ENDO_LIST_ESO"
            );
        } finally {
            setEndoSummaryLoading(false);
        }
    }, [currentBranchCode, fetchEndoLists, hasValidBranch]);

    const handleOpenSearchModal = useCallback(() => {
        setModalSearch("");
        openSearchModal();
    }, [openSearchModal]);

    const handleOpenCustomerModal = useCallback(() => {
        setCustomerModalSearch("");
        setCustomerResults([]);
        setCustomerModalHasSearched(false);
        setCustomerModalError("");
        openCustomerModal();
    }, [openCustomerModal]);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted) return;

        const urlTrdr = String(searchParams.get("trdr") ?? "").trim();
        if (urlTrdr) {
            pendingScopedNavigationRef.current = false;
            return;
        }

        if (pendingScopedNavigationRef.current) {
            return;
        }

        const hasScopedContext =
            Boolean(String(customer?.TRDR ?? "").trim()) ||
            Boolean(String(searchStateTrdr ?? "").trim());

        if (!hasScopedContext) {
            return;
        }

        clearCustomer();
        clearSearchPartsState();
        setExpandedItems(new Set());
        setIsEndoMode(false);
        setEndoQuantities({});
        setEndoBasketItems([]);
        setEndoBasketError("");
        setEndoBasketSuccess("");
        setHasScrolledResults(false);
    }, [
        clearCustomer,
        clearSearchPartsState,
        customer?.TRDR,
        hasMounted,
        searchParams,
        searchStateTrdr,
    ]);

    useEffect(() => {
        const customerTrdr = String(customer?.TRDR ?? "").trim() || null;
        const snapshotTrdr = String(searchStateTrdr ?? "").trim() || null;

        if (snapshotTrdr === customerTrdr) {
            return;
        }

        clearSearchPartsState();
        setExpandedItems(new Set());
        setIsEndoMode(false);
        setEndoQuantities({});
        setEndoBasketItems([]);
        setEndoBasketError("");
        setEndoBasketSuccess("");
        setSearchStateTrdr(customerTrdr);
    }, [clearSearchPartsState, customer?.TRDR, searchStateTrdr, setSearchStateTrdr]);

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
    }, [hasMounted, isEndoMode, items.length]);

    useEffect(() => {
        if (isSearchModalOpen) {
            modalInputRef.current?.focus();
        }
    }, [isSearchModalOpen]);

    useEffect(() => {
        if (isCustomerModalOpen) {
            customerModalInputRef.current?.focus();
        }
    }, [isCustomerModalOpen]);

    useEffect(() => {
        if (!isEndoMode || !customer?.TRDR) {
            return;
        }

        void loadRequestedEndoLines();
    }, [customer?.TRDR, isEndoMode, loadRequestedEndoLines]);

    useEffect(() => {
        const handleEnterShortcut = (event: KeyboardEvent) => {
            if (event.key !== "Enter" || isSearchModalOpen || isCustomerModalOpen) {
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
    }, [handleOpenSearchModal, isCustomerModalOpen, isSearchModalOpen]);

    const runSearch = async (value: string) => {
        const trimmedSearch = value.trim();

        if (!trimmedSearch) return false;

        setSearchStateTrdr(String(customer?.TRDR ?? "").trim() || null);
        setHasSearched(true);
        setLoading(true);
        setEndoBasketSuccess("");
        setEndoQuantities({});

        try {
            const data = customer?.TRDR
                ? await searchItemsByTrdr({
                    search: trimmedSearch,
                    trdr: customer.TRDR,
                })
                : await searchItems(trimmedSearch);
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

    const runCustomerSearch = async (value: string) => {
        const trimmedSearch = value.trim();

        if (!trimmedSearch) return false;

        setCustomerModalSearch(trimmedSearch);
        setCustomerModalHasSearched(true);
        setCustomerModalLoading(true);
        setCustomerModalError("");

        try {
            const data = await searchCustomers(trimmedSearch);
            setCustomerResults(data.rows);
            return true;
        } catch (error) {
            setCustomerResults([]);
            setCustomerModalError(
                error instanceof Error
                    ? error.message
                    : "Η αναζήτηση πελατών δεν είναι διαθέσιμη προσωρινά"
            );
            console.error(error);
            return false;
        } finally {
            setCustomerModalLoading(false);
        }
    };

    const handleCustomerModalSearch = async () => {
        await runCustomerSearch(customerModalSearch);
    };

    const handleCustomerSelect = (selectedCustomer: ICustomerInfo) => {
        pendingScopedNavigationRef.current = true;
        setCustomer(selectedCustomer);
        clearSearchPartsState();
        setSearchStateTrdr(String(selectedCustomer.TRDR).trim() || null);
        setModalSearch("");
        setExpandedItems(new Set());
        setIsEndoMode(false);
        setEndoQuantities({});
        setEndoBasketItems([]);
        setEndoBasketError("");
        setEndoBasketSuccess("");
        setHasScrolledResults(false);
        closeCustomerModal();
        router.replace(`/search-parts?trdr=${selectedCustomer.TRDR}`);
    };

    const loadBasket = useCallback(async (trdr: string) => {
        const normalizedTrdr = String(trdr).trim();

        if (!normalizedTrdr) {
            return;
        }

        if (
            basketLoadInFlightRef.current &&
            basketLoadInFlightTrdrRef.current === normalizedTrdr
        ) {
            return basketLoadInFlightRef.current;
        }

        const requestId = ++basketRequestIdRef.current;
        setBasketLoading(true);
        setBasketError("");

        const requestPromise = (async () => {
            try {
                const data = await fetchBasketItems(normalizedTrdr);

                if (basketRequestIdRef.current !== requestId) {
                    return;
                }

                const nextBasket = normalizeBasket(data);
                setBasket(nextBasket);
                setSelectedItems(new Set(nextBasket.items.map((item) => getBasketItemId(item))));
            } catch (error) {
                if (basketRequestIdRef.current !== requestId) {
                    return;
                }

                setBasketError(
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία φόρτωσης καλαθιού"
                );
                setSelectedItems(new Set());
            } finally {
                if (basketRequestIdRef.current === requestId) {
                    setBasketLoading(false);
                }

                if (basketLoadInFlightIdRef.current === requestId) {
                    basketLoadInFlightRef.current = null;
                    basketLoadInFlightTrdrRef.current = null;
                    basketLoadInFlightIdRef.current = null;
                }
            }
        })();

        basketLoadInFlightRef.current = requestPromise;
        basketLoadInFlightTrdrRef.current = normalizedTrdr;
        basketLoadInFlightIdRef.current = requestId;

        return requestPromise;
    }, [fetchBasketItems]);

    useEffect(() => {
        if (customer?.TRDR) {
            loadBasket(customer.TRDR);
        } else {
            basketRequestIdRef.current += 1;
            basketLoadInFlightRef.current = null;
            basketLoadInFlightTrdrRef.current = null;
            basketLoadInFlightIdRef.current = null;
            setBasket(null);
            setBasketError("");
            setSelectedItems(new Set());
            setBasketLoading(false);
        }
    }, [customer?.TRDR, loadBasket]);

    const getExpandedItemKey = (item: IItem) =>
        isEndoMode ? getEndoItemKey(item) : item.ITEM_CODE;

    const toggleExpanded = (itemKey: string) => {
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (next.has(itemKey)) next.delete(itemKey);
            else next.add(itemKey);
            return next;
        });
    };

    const areAllResultsExpanded =
        items.length > 0 && items.every((item) => expandedItems.has(getExpandedItemKey(item)));

    const toggleAllExpanded = () => {
        setExpandedItems((prev) => {
            const next = new Set(prev);

            if (areAllResultsExpanded) {
                items.forEach((item) => next.delete(getExpandedItemKey(item)));
            } else {
                items.forEach((item) => next.add(getExpandedItemKey(item)));
            }

            return next;
        });
    };

    const getQuantity = (itemCode: string, fallback = 1) =>
        quantities[itemCode] ?? fallback;

    const setQuantity = (itemCode: string, qty: number) => {
        if (qty < 1) qty = 1;
        setQuantities((prev) => ({ ...prev, [itemCode]: qty }));
    };

    const clearQuantityOverride = (itemCode: string) => {
        setQuantities((prev) => {
            if (!(itemCode in prev)) {
                return prev;
            }

            const next = { ...prev };
            delete next[itemCode];
            return next;
        });
    };

    const getStoreStock = (item: IItem) => {
        if (!hasValidBranch) {
            return 0;
        }

        return parseStockValue(getItemFieldValue(item, `YP${currentBranchCode}`));
    };

    const getStoreOrderQuantity = (mtrl: string) => storeOrderQuantities[mtrl] ?? 0;

    const setStoreOrderQuantity = (mtrl: string, qty: number) => {
        setStoreOrderQuantities((prev) => ({ ...prev, [mtrl]: qty }));
    };

    const getEndoRequestedQty = (mtrl: string | number, sourceBranch: string) =>
        endoQuantities[getEndoQtyKey(mtrl, sourceBranch)] ?? 0;

    const setEndoRequestedQty = (
        mtrl: string | number,
        sourceBranch: string,
        next: number
    ) => {
        const qtyKey = getEndoQtyKey(mtrl, sourceBranch);
        const normalizedQty = Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0;

        setEndoQuantities((prev) => {
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

    const getEndoBranchOptions = (item: IItem): EndoBranchOption[] => {
        const branchCodes = new Set<string>(getBranchCodesFromItem(item));

        (user?.listBranches ?? []).forEach((branch) => {
            const code = String(branch.s1Code ?? "").trim();
            if (code) {
                branchCodes.add(code);
            }
        });

        if (hasValidBranch) {
            branchCodes.add(currentBranchCode);
        }

        return Array.from(branchCodes)
            .sort((a, b) => Number(a) - Number(b))
            .map((code) => {
                const labelFromProfile = user?.listBranches?.find(
                    (branch) => String(branch.s1Code ?? "").trim() === code
                )?.name;
                const label = String(labelFromProfile ?? "").trim() || code;
                const location =
                    String(getItemFieldValue(item, `THESI${code}`) ?? "").trim() || "-";

                return {
                    code,
                    label,
                    stock: parseAvailableStock(getItemFieldValue(item, `YP${code}`)),
                    location,
                    isCurrent: currentBranchCode === code,
                };
            });
    };

    const handleAddToEndoBasket = async (item: IItem, sourceBranchCode: string) => {
        const normalizedDestinationBranch = Number(currentBranchCode);
        const normalizedSourceBranch = Number(sourceBranchCode);
        const requestedQty = getEndoRequestedQty(item.MTRL, sourceBranchCode);
        const sourceBranchStock = getEndoBranchOptions(item).find(
            (branch) => branch.code === sourceBranchCode
        )?.stock ?? 0;

        if (!Number.isFinite(normalizedDestinationBranch) || normalizedDestinationBranch <= 0) {
            setEndoBasketError("Δεν βρέθηκε ενεργό κατάστημα χρήστη");
            return;
        }

        if (!Number.isFinite(normalizedSourceBranch) || normalizedSourceBranch <= 0) {
            setEndoBasketError("Μη έγκυρο κατάστημα αποστολής");
            return;
        }

        if (normalizedDestinationBranch === normalizedSourceBranch) {
            setEndoBasketError("Η ενδοδιακίνηση πρέπει να αφορά διαφορετικά καταστήματα");
            return;
        }

        if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
            setEndoBasketError("Η ποσότητα πρέπει να είναι μεγαλύτερη από 0");
            return;
        }

        if (requestedQty > sourceBranchStock) {
            setEndoBasketError("Η ζητούμενη ποσότητα υπερβαίνει το διαθέσιμο απόθεμα");
            return;
        }

        const requestKey = getEndoQtyKey(item.MTRL, sourceBranchCode);
        setAddingToEndoBasket((prev) => new Set(prev).add(requestKey));
        setEndoBasketError("");
        setEndoBasketSuccess("");

        try {
            const response = await addItemToEndoBasket({
                MTRL: Number(item.MTRL),
                QTY: requestedQty,
                BRANCH: normalizedDestinationBranch,
                TO_BRANCH: normalizedSourceBranch,
                APPUSER_ID: user?.uid,
                ITEM_CODE: item.ITEM_CODE,
                ITEM_DESCR: item.ITEM_DESCR,
                MNF_DESCR: item.MNF_DESCR,
            });

            setEndoRequestedQty(item.MTRL, sourceBranchCode, 0);
            await loadRequestedEndoLines();
            setEndoBasketSuccess(response.message ?? "Η γραμμή προστέθηκε στο καλάθι ενδοδιακίνησης");
        } catch (error) {
            if (isAxiosError(error)) {
                const responseMessage =
                    typeof error.response?.data?.message === "string"
                        ? error.response.data.message
                        : undefined;
                setEndoBasketError(responseMessage ?? error.message);
            } else {
                setEndoBasketError(
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία προσθήκης στο καλάθι ενδοδιακίνησης"
                );
            }
        } finally {
            setAddingToEndoBasket((prev) => {
                const next = new Set(prev);
                next.delete(requestKey);
                return next;
            });
        }
    };

    const handleSubmitStockRequest = async (item: IItem) => {
        const mtrlKey = String(item.MTRL);
        const qty = getStoreOrderQuantity(mtrlKey);

        if (!hasValidBranch) {
            setStockRequestErrors((prev) => ({
                ...prev,
                [mtrlKey]: "Δεν βρέθηκε ενεργό κατάστημα χρήστη",
            }));
            return;
        }

        if (qty <= 0) {
            setStockRequestErrors((prev) => ({
                ...prev,
                [mtrlKey]: "Type a quantity greater than 0",
            }));
            return;
        }

        setSubmittingStockRequests((prev) => new Set(prev).add(mtrlKey));
        setStockRequestErrors((prev) => ({ ...prev, [mtrlKey]: "" }));

        try {
            await requestStockQuantity({
                mtrl: Number(item.MTRL),
                qty,
                branch: currentBranchCode,
            });

            setStockRequestStatuses((prev) => ({
                ...prev,
                [mtrlKey]: "pending",
            }));
        } catch (error) {
            setStockRequestErrors((prev) => ({
                ...prev,
                [mtrlKey]:
                    error instanceof Error
                        ? error.message
                        : "Failed to submit stock request",
            }));
        } finally {
            setSubmittingStockRequests((prev) => {
                const next = new Set(prev);
                next.delete(mtrlKey);
                return next;
            });
        }
    };

    const handleAddToBasket = async (item: IItem) => {
        if (!customer) return;

        const normalizedBranch = Number(currentBranchCode);
        if (!Number.isFinite(normalizedBranch) || normalizedBranch <= 0) {
            setBasketError("Δεν βρέθηκε ενεργό κατάστημα χρήστη");
            return;
        }

        const basketItem = findBasketItem(item);
        const basketQtyFallback = basketItem ? Math.max(1, getBasketItemQty(basketItem)) : 1;
        const requestedQty = Math.max(1, getQuantity(item.ITEM_CODE, basketQtyFallback));

        setAddingToBasket((prev) => new Set(prev).add(item.ITEM_CODE));

        try {
            if (basketItem) {
                await updateBasketItemQty({
                    BASKETID: basketItem.BASKETID,
                    QTY: requestedQty,
                });
            } else {
                await addItemToBasket({
                    TRDR: customer.TRDR,
                    MTRL: Number(item.MTRL),
                    QTY: requestedQty,
                    PRICE_ERP: Number(item.PRICE_WHOLE),
                    PRICE_REQ: Number(item.PRICE_WHOLE),
                    BRANCH: normalizedBranch,
                    APPUSER_ID: user?.uid,
                });
            }

            clearQuantityOverride(item.ITEM_CODE);
            await loadBasket(customer.TRDR);
        } catch (err) {
            if (isAxiosError(err)) {
                const responseMessage =
                    typeof err.response?.data?.message === "string"
                        ? err.response.data.message
                        : undefined;
                setBasketError(responseMessage ?? err.message);
            } else {
                setBasketError(
                    err instanceof Error ? err.message : "Αποτυχία προσθήκης στο καλάθι"
                );
            }
        } finally {
            setAddingToBasket((prev) => {
                const next = new Set(prev);
                next.delete(item.ITEM_CODE);
                return next;
            });
        }
    };

    const formatPrice = (price: number | string | null | undefined) => {
        if (price == null) return "—";
        const num = Number(price);
        if (isNaN(num)) return "—";
        return num.toFixed(2) + " €";
    };

    const parseNumericValue = (value: unknown): number | null => {
        const raw = String(value ?? "").trim();
        if (!raw) {
            return null;
        }

        const parsed = Number(raw.replace(",", "."));
        if (!Number.isFinite(parsed)) {
            return null;
        }

        return parsed;
    };

    const findBasketItem = (item: IItem): IBasketItem | undefined => {
        return basket?.items.find((basketItem) =>
            basketItem.MTRL === item.MTRL || basketItem.CODE === item.ITEM_CODE
        );
    };

    const handleSendOrder = async () => {
        if (!customer || !basket || basket.items.length === 0 || selectedItems.size === 0) return;

        setSendingOrder(true);
        setBasketError("");

        try {
            await submitBasketOrder(customer.TRDR);
            await loadBasket(customer.TRDR);
        } catch (error) {
            setBasketError(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία αποστολής παραγγελίας"
            );
        } finally {
            setSendingOrder(false);
        }
    };

    const selectedItemsList = basket?.items.filter((item) =>
        selectedItems.has(getBasketItemId(item))
    ) ?? [];

    const selectedTotal = selectedItemsList.reduce(
        (sum, item) => sum + getBasketItemLineTotal(item),
        0
    );

    const handleRemoveItems = async (
        itemsToRemove: IBasket["items"],
        fallbackErrorMessage: string
    ) => {
        const basketIds = itemsToRemove
            .map((item) => String(item.BASKETID ?? "").trim())
            .filter(Boolean);

        if (!customer || basketIds.length === 0) {
            setBasketError("Δεν βρέθηκαν BASKET IDs για διαγραφή");
            return;
        }

        setBasketError("");

        try {
            await deleteBasketItems({
                basketIds,
                tableAction: "USRCUST",
                method: "DELETE",
                s1Key: "1305",
            });
            await loadBasket(customer.TRDR);
        } catch (error) {
            setBasketError(
                error instanceof Error
                    ? error.message
                    : fallbackErrorMessage
            );
        }
    };

    const handleRemoveSelectedItems = async () => {
        if (selectedItemsList.length === 0) return;

        setRemovingSelectedBasketItems(true);
        try {
            await handleRemoveItems(
                selectedItemsList,
                "Αποτυχία διαγραφής επιλεγμένων γραμμών"
            );
        } finally {
            setRemovingSelectedBasketItems(false);
        }
    };

    const handleRemoveItem = async (uid: string) => {
        const item = basket?.items.find((basketItem) => getBasketItemId(basketItem) === uid);
        if (!item) {
            setBasketError("Δεν βρέθηκε η γραμμή για διαγραφή");
            return;
        }

        setRemovingBasketItems((prev) => new Set(prev).add(uid));
        try {
            await handleRemoveItems([item], "Αποτυχία διαγραφής γραμμής");
        } finally {
            setRemovingBasketItems((prev) => {
                const next = new Set(prev);
                next.delete(uid);
                return next;
            });
        }
    };

    const handleRequestDiscount = async (item: IItem) => {
        if (!customer) return;

        const discountValue = discountPrices[item.ITEM_CODE] ?? "";
        const requestedPrice = parseNumericValue(discountValue);
        const basketItem = findBasketItem(item);
        if (!basketItem) return;
        const basketQty = Math.max(1, getBasketItemQty(basketItem));
        const requestedQty = Math.max(1, getQuantity(item.ITEM_CODE, basketQty));

        if (!discountValue || requestedPrice == null || requestedPrice <= 0) {
            return;
        }

        const basketErpPrice = parseNumericValue(
            String(basketItem.PRICE_ERP ?? basketItem.BASKET_ERP_PRICE ?? "")
        );
        const fallbackErpPrice = parseNumericValue(item.PRICE_WHOLE);
        const priceErpForUpdate = basketErpPrice ?? fallbackErpPrice;

        setSubmittingDiscount((prev) => new Set(prev).add(item.ITEM_CODE));

        try {
            await updateBasketItemQty({
                BASKETID: basketItem.BASKETID,
                QTY: requestedQty,
                ...(priceErpForUpdate != null ? { PRICE_ERP: priceErpForUpdate } : {}),
                PRICE_REQ: requestedPrice,
            });

            setDiscountPrices((prev) => ({ ...prev, [item.ITEM_CODE]: "" }));
            clearQuantityOverride(item.ITEM_CODE);
            await loadBasket(customer.TRDR);
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
                        : "Αποτυχία αιτήματος τιμής"
                );
            }
        } finally {
            setSubmittingDiscount((prev) => {
                const next = new Set(prev);
                next.delete(item.ITEM_CODE);
                return next;
            });
        }
    };

    const handleToggleEndoMode = () => {
        if (!customer) {
            handleOpenCustomerModal();
            return;
        }

        if (!hasValidBranch) {
            setEndoBasketError("Δεν βρέθηκε ενεργό κατάστημα στο προφίλ χρήστη");
            return;
        }

        setExpandedItems(new Set());
        setEndoBasketSuccess("");
        setEndoBasketError("");
        setIsEndoMode((prev) => !prev);
    };

    const handleResultsScroll = (event: UIEvent<HTMLDivElement>) => {
        const scrollTop = event.currentTarget.scrollTop;

        if (scrollTop > 0) {
            setHasScrolledResults(true);
        }
    };

    return (
        <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">
            {!hasScrolledResults && (
                <div className="shrink-0">
                    <PageBreadcrumb
                        pageTitle="Αναζήτηση Ανταλλακτικών"
                        {...(customer ? { backHref: "/search-customer", backLabel: "Επιστροφή στην αναζήτηση πελατών" } : {})}
                    />
                </div>
            )}

            <CustomerInfoContainer
                hasMounted={hasMounted}
                customer={customer}
                onClearCustomer={() => {
                    pendingScopedNavigationRef.current = false;
                    clearCustomer();
                    clearSearchPartsState();
                    setExpandedItems(new Set());
                    setIsEndoMode(false);
                    setEndoQuantities({});
                    setEndoBasketItems([]);
                    setEndoBasketError("");
                    setEndoBasketSuccess("");
                    router.replace("/search-parts");
                }}
                onOpenCustomerModal={handleOpenCustomerModal}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
                <PartsResultsContainer
                    hasCustomer={customer != null}
                    sidebarVisible={sidebarVisible}
                    resultsContainerRef={resultsContainerRef}
                    searchInputRef={searchInputRef}
                    onResultsScroll={handleResultsScroll}
                    hasScrolledResults={hasScrolledResults}
                    search={search}
                    onSearchChange={setSearch}
                    onSearch={handleSearch}
                    loading={loading}
                    hasSearched={hasSearched}
                    items={items}
                    isEndoMode={isEndoMode}
                    onToggleEndoMode={handleToggleEndoMode}
                    onToggleAllExpanded={toggleAllExpanded}
                    areAllResultsExpanded={areAllResultsExpanded}
                    expandedItems={expandedItems}
                    getExpandedItemKey={getExpandedItemKey}
                    toggleExpanded={toggleExpanded}
                    getEndoBranchOptions={getEndoBranchOptions}
                    endoBasketItems={endoBasketItems}
                    getEndoRequestedQty={getEndoRequestedQty}
                    setEndoRequestedQty={setEndoRequestedQty}
                    onAddToEndoBasket={handleAddToEndoBasket}
                    isAddingToEndoBasket={(mtrl, sourceBranchCode) =>
                        addingToEndoBasket.has(getEndoQtyKey(mtrl, sourceBranchCode))
                    }
                    findBasketItem={findBasketItem}
                    getQuantity={getQuantity}
                    onQuantityChange={setQuantity}
                    addingToBasket={addingToBasket}
                    getStoreStock={getStoreStock}
                    getStoreOrderQuantity={getStoreOrderQuantity}
                    stockRequestStatuses={stockRequestStatuses}
                    stockRequestErrors={stockRequestErrors}
                    submittingStockRequests={submittingStockRequests}
                    discountPrices={discountPrices}
                    submittingDiscount={submittingDiscount}
                    onDiscountValueChange={(itemCode, value) =>
                        setDiscountPrices((prev) => ({
                            ...prev,
                            [itemCode]: value,
                        }))
                    }
                    onAddToBasket={handleAddToBasket}
                    onRequestDiscount={handleRequestDiscount}
                    onStoreOrderQuantityChange={setStoreOrderQuantity}
                    onSubmitStockRequest={handleSubmitStockRequest}
                    formatPrice={formatPrice}
                    isResultsScrollable={isResultsScrollable}
                    onOpenSearchModal={handleOpenSearchModal}
                />

                {customer && (
                    isEndoMode ? (
                        <EndoOrderSummary
                            currentBranchCode={currentBranchCode}
                            currentBranchName={currentBranchName}
                            basketItems={endoBasketItems}
                            loading={endoSummaryLoading}
                            error={endoBasketError}
                            successMessage={endoBasketSuccess}
                            collapsible
                            collapsed={!sidebarVisible}
                            onToggleCollapse={() => setSidebarVisible((v) => !v)}
                        />
                    ) : (
                        <OrderSummary
                            customer={customer}
                            basket={basket}
                            loading={basketLoading}
                            error={basketError}
                            onRefresh={() => customer && loadBasket(customer.TRDR)}
                            selectedItems={selectedItems}
                            selectedCount={selectedItemsList.length}
                            selectedTotal={selectedTotal}
                            receiptType={receiptType}
                            onReceiptTypeChange={setReceiptType}
                            pickupPoint={pickupPoint}
                            onPickupPointChange={setPickupPoint}
                            notes={notes}
                            onNotesChange={setNotes}
                            onSendOrder={handleSendOrder}
                            sendingOrder={sendingOrder}
                            onToggleItem={(uid) => {
                                setSelectedItems((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(uid)) next.delete(uid);
                                    else next.add(uid);
                                    return next;
                                });
                            }}
                            onRemoveItem={handleRemoveItem}
                            removingItems={removingBasketItems}
                            onRemoveSelectedItems={handleRemoveSelectedItems}
                            removingSelectedItems={removingSelectedBasketItems}
                            collapsible
                            collapsed={!sidebarVisible}
                            onToggleCollapse={() => setSidebarVisible((v) => !v)}
                        />
                    )
                )}
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

            <CustomerSearchModal
                isOpen={isCustomerModalOpen}
                onClose={closeCustomerModal}
                inputRef={customerModalInputRef}
                searchValue={customerModalSearch}
                onSearchValueChange={setCustomerModalSearch}
                onSearch={handleCustomerModalSearch}
                loading={customerModalLoading}
                error={customerModalError}
                results={customerResults}
                hasSearched={customerModalHasSearched}
                onSelectCustomer={handleCustomerSelect}
            />
        </div>
    );
}
