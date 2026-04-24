"use client";

import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { type UIEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "@/app/lib/lucide";
import { useCustomerStore } from "@/stores/customerStore";
import { useSearchPartsStore } from "@/stores/searchPartsStore";
import { ICustomerInfo, IItem, IBasket, IBasketItem, StockRequestStatus } from "@/app/lib/interface";
import {
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemQty,
    normalizeBasket,
} from "@/app/lib/basket";
import { useModal } from "@/hooks/useModal";
import OrderSummary from "@/components/basket/order-summary";
import { useRouter, useSearchParams } from "next/navigation";
import CustomerInfoContainer from "../../../components/customer/customer-info-container";
import PartsSearchModal from "../../../components/parts/parts-search-modal";
import PartResults from "../../../components/parts/part-results";
import CustomerSearchModal from "../../../components/customer/customer-search-modal";
import SearchBar from "@/components/search/search-bar";
import {
    useAddItemToBasketMutation,
    useFetchBasketItemsMutation,
    useRequestDiscountMutation,
    useRequestStockQuantityMutation,
    useSearchCustomersMutation,
    useSearchItemsByTrdrMutation,
    useSearchItemsMutation,
    useSubmitBasketOrderMutation,
    useUpdateBasketItemQtyMutation,
} from "@/hooks/queries/useApiMutations";
import { useAuthStore } from "@/stores/authStore";
import { isAxiosError } from "axios";

const DEFAULT_STOCK_REQUEST_BRANCH = "1001";
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
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [storeOrderQuantities, setStoreOrderQuantities] = useState<Record<string, number>>({});
    const [stockRequestStatuses, setStockRequestStatuses] = useState<Record<string, StockRequestStatus>>({});
    const [stockRequestErrors, setStockRequestErrors] = useState<Record<string, string>>({});
    const [submittingStockRequests, setSubmittingStockRequests] = useState<Set<string>>(new Set());
    const [addingToBasket, setAddingToBasket] = useState<Set<string>>(new Set());
    const [discountPrices, setDiscountPrices] = useState<Record<string, string>>({});
    const [submittingDiscount, setSubmittingDiscount] = useState<Set<string>>(new Set());
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
    const { mutateAsync: requestDiscount } = useRequestDiscountMutation();
    const { mutateAsync: submitBasketOrder } = useSubmitBasketOrderMutation();
    const { mutateAsync: updateBasketItemQty } = useUpdateBasketItemQtyMutation();

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
        const customerTrdr = String(customer?.TRDR ?? "").trim();

        if (customerTrdr && urlTrdr !== customerTrdr) {
            router.replace(`/search-parts?trdr=${customerTrdr}`);
            return;
        }

        if (!customerTrdr && urlTrdr) {
            router.replace("/search-parts");
        }
    }, [customer?.TRDR, hasMounted, router, searchParams]);

    useEffect(() => {
        const customerTrdr = String(customer?.TRDR ?? "").trim() || null;
        const snapshotTrdr = String(searchStateTrdr ?? "").trim() || null;

        if (snapshotTrdr === customerTrdr) {
            return;
        }

        clearSearchPartsState();
        setExpandedItems(new Set());
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
    }, [hasMounted, items.length]);

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
        setCustomer(selectedCustomer);
        clearSearchPartsState();
        setSearchStateTrdr(String(selectedCustomer.TRDR).trim() || null);
        setModalSearch("");
        setExpandedItems(new Set());
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

    const toggleExpanded = (itemCode: string) => {
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (next.has(itemCode)) next.delete(itemCode);
            else next.add(itemCode);
            return next;
        });
    };

    const areAllResultsExpanded =
        items.length > 0 && items.every((item) => expandedItems.has(item.ITEM_CODE));

    const toggleAllExpanded = () => {
        setExpandedItems((prev) => {
            const next = new Set(prev);

            if (areAllResultsExpanded) {
                items.forEach((item) => next.delete(item.ITEM_CODE));
            } else {
                items.forEach((item) => next.add(item.ITEM_CODE));
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
        const netAvailable = Number(item.NET_QTY_AVAILABLE);
        if (Number.isFinite(netAvailable)) {
            return netAvailable;
        }

        const totalAvailable = Number(item.TOTAL_AVAIL);
        if (Number.isFinite(totalAvailable)) {
            return totalAvailable;
        }

        const branchStocks = [item.YP1001, item.YP1006, item.YP1007]
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0);

        return branchStocks.reduce((sum, value) => sum + value, 0);
    };

    const getStoreOrderQuantity = (mtrl: string) => storeOrderQuantities[mtrl] ?? 0;

    const setStoreOrderQuantity = (mtrl: string, qty: number) => {
        setStoreOrderQuantities((prev) => ({ ...prev, [mtrl]: qty }));
    };

    const handleSubmitStockRequest = async (item: IItem) => {
        const mtrlKey = String(item.MTRL);
        const qty = getStoreOrderQuantity(mtrlKey);

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
                branch: DEFAULT_STOCK_REQUEST_BRANCH,
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

    const handleRequestDiscount = async (item: IItem) => {
        if (!customer) return;

        const discountValue = discountPrices[item.ITEM_CODE] ?? "";
        const requestedPrice = Number(discountValue);
        const basketItem = findBasketItem(item);
        const basketQty = basketItem ? Math.max(1, getBasketItemQty(basketItem)) : 1;
        const requestedQty = Math.max(1, getQuantity(item.ITEM_CODE, basketQty));

        if (!discountValue || !Number.isFinite(requestedPrice) || requestedPrice <= 0) {
            return;
        }

        setSubmittingDiscount((prev) => new Set(prev).add(item.ITEM_CODE));

        try {
            if (basketItem) {
                await updateBasketItemQty({
                    BASKETID: basketItem.BASKETID,
                    QTY: requestedQty,
                    PRICE_ERP: Number(item.PRICE_WHOLE),
                    PRICE_REQ: requestedPrice,
                });
            } else {
                await requestDiscount({
                    TRDR: customer.TRDR,
                    MTRL: Number(item.MTRL),
                    QTY: requestedQty,
                    PRICE_ERP: Number(item.PRICE_WHOLE),
                    PRICE_REQ: requestedPrice,
                    APPUSER_ID: user?.uid,
                });
            }

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
                    clearCustomer();
                    clearSearchPartsState();
                    setExpandedItems(new Set());
                    router.replace("/search-parts");
                }}
                onOpenCustomerModal={handleOpenCustomerModal}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
                <div className={`relative min-h-0 w-full xl:min-w-0 ${customer && sidebarVisible ? "xl:basis-2/3" : ""} transition-all duration-300`}>
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
                                    Βρείτε το ανταλλακτικό που ψάχνετε
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
                                        const isExpanded = expandedItems.has(item.ITEM_CODE);
                                        const basketItem = findBasketItem(item);
                                        const qty = getQuantity(
                                            item.ITEM_CODE,
                                            basketItem ? Math.max(1, getBasketItemQty(basketItem)) : 1
                                        );
                                        const isAdding = addingToBasket.has(item.ITEM_CODE);
                                        const isInBasket = basketItem != null;
                                        const mtrlKey = String(item.MTRL);
                                        const storeStock = getStoreStock(item);
                                        const storeOrderQty = getStoreOrderQuantity(mtrlKey);
                                        const stockRequestStatus = stockRequestStatuses[mtrlKey] ?? null;
                                        const stockRequestError = stockRequestErrors[mtrlKey] ?? "";
                                        const isSubmittingStockRequest = submittingStockRequests.has(mtrlKey);
                                        const discountValue = discountPrices[item.ITEM_CODE] ?? "";
                                        const isSubmittingRequestPrice = submittingDiscount.has(item.ITEM_CODE);

                                        return (
                                            <PartResults
                                                key={`${item.ITEM_CODE}-${mtrlKey}`}
                                                item={item}
                                                isExpanded={isExpanded}
                                                qty={qty}
                                                isAdding={isAdding}
                                                isInBasket={isInBasket}
                                                basketItem={basketItem}
                                                hasCustomer={customer != null}
                                                storeStock={storeStock}
                                                storeOrderQty={storeOrderQty}
                                                stockRequestStatus={stockRequestStatus}
                                                stockRequestError={stockRequestError}
                                                isSubmittingStockRequest={isSubmittingStockRequest}
                                                discountValue={discountValue}
                                                isSubmittingRequestPrice={isSubmittingRequestPrice}
                                                onToggleExpanded={() => toggleExpanded(item.ITEM_CODE)}
                                                onQuantityChange={(nextQty) => setQuantity(item.ITEM_CODE, nextQty)}
                                                onAddToBasket={() => handleAddToBasket(item)}
                                                onDiscountValueChange={(value) =>
                                                    setDiscountPrices((prev) => ({
                                                        ...prev,
                                                        [item.ITEM_CODE]: value,
                                                    }))
                                                }
                                                onRequestDiscount={() => handleRequestDiscount(item)}
                                                onStoreOrderQuantityChange={(nextQuantity) =>
                                                    setStoreOrderQuantity(mtrlKey, nextQuantity)
                                                }
                                                onSubmitStockRequest={() => handleSubmitStockRequest(item)}
                                                formatPrice={formatPrice}
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

                {customer && (
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
                        collapsible
                        collapsed={!sidebarVisible}
                        onToggleCollapse={() => setSidebarVisible((v) => !v)}
                    />
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
