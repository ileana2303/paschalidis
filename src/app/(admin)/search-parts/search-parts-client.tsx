"use client";

import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { type UIEvent, useCallback, useEffect, useRef, useState } from "react";
import { Plus, Loader2, ChevronDown, Minus, ShoppingCart, BadgePercent, Send } from "@/app/lib/lucide";
import { useCustomerStore } from "@/stores/customerStore";
import { ICustomerInfo, IItem, IBasket, IBasketItem, StockRequestStatus } from "@/app/lib/interface";
import {
    getBasketItemId,
    getBasketItemLineTotal,
    getBasketItemQty,
    getBasketItemRequestedPrice,
    normalizeBasket,
} from "@/app/lib/basket";
import { useModal } from "@/hooks/useModal";
import OrderSummary from "@/components/basket/order-summary";
import { useRouter, useSearchParams } from "next/navigation";
import CustomerInfoContainer from "../../../components/customer/customer-info-container";
import PartsSearchModal from "../../../components/parts/parts-search-modal";
import PartStockQuantityContainer from "../../../components/parts/part-stock-quantity-container";
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
} from "@/hooks/queries/useApiMutations";

const DEFAULT_STOCK_REQUEST_BRANCH = "1001";
type ReceiptType = "receipt" | "invoice";

export default function SearchPartsClient() {
    const [search, setSearch] = useState("");
    const [modalSearch, setModalSearch] = useState("");
    const [customerModalSearch, setCustomerModalSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<ICustomerInfo[]>([]);
    const [items, setItems] = useState<IItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [customerModalLoading, setCustomerModalLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
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
    const customer = useCustomerStore((state) => state.customer);
    const setCustomer = useCustomerStore((state) => state.setCustomer);
    const clearCustomer = useCustomerStore((state) => state.clearCustomer);
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
    const customerSyncCheckedRef = useRef(false);
    const { mutateAsync: searchItems } = useSearchItemsMutation();
    const { mutateAsync: searchItemsByTrdr } = useSearchItemsByTrdrMutation();
    const { mutateAsync: searchCustomers } = useSearchCustomersMutation();
    const { mutateAsync: fetchBasketItems } = useFetchBasketItemsMutation();
    const { mutateAsync: requestStockQuantity } = useRequestStockQuantityMutation();
    const { mutateAsync: addItemToBasket } = useAddItemToBasketMutation();
    const { mutateAsync: requestDiscount } = useRequestDiscountMutation();
    const { mutateAsync: submitBasketOrder } = useSubmitBasketOrderMutation();

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
        if (!hasMounted || customerSyncCheckedRef.current) return;
        customerSyncCheckedRef.current = true;

        const urlTrdr = searchParams.get("trdr");

        if (urlTrdr && customer?.TRDR !== urlTrdr) {
            router.replace("/search-parts");
            clearCustomer();
        } else if (!urlTrdr && customer) {
            clearCustomer();
        }
    }, [clearCustomer, customer, hasMounted, router, searchParams]);

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
        setSearch("");
        setModalSearch("");
        setItems([]);
        setHasSearched(false);
        setHasScrolledResults(false);
        closeCustomerModal();
        router.replace(`/search-parts?trdr=${selectedCustomer.TRDR}`);
    };

    const loadBasket = useCallback(async (trdr: string) => {
        setBasketLoading(true);
        setBasketError("");

        try {
            const data = await fetchBasketItems(trdr);

            const nextBasket = normalizeBasket(data);
            setBasket(nextBasket);
            setSelectedItems(new Set(nextBasket.items.map((item) => getBasketItemId(item))));
        } catch (error) {
            setBasketError(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία φόρτωσης καλαθιού"
            );
            setSelectedItems(new Set());
        } finally {
            setBasketLoading(false);
        }
    }, [fetchBasketItems]);

    useEffect(() => {
        if (customer?.TRDR) {
            loadBasket(customer.TRDR);
        } else {
            setBasket(null);
            setBasketError("");
            setSelectedItems(new Set());
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

    const getQuantity = (itemCode: string) => quantities[itemCode] ?? 1;

    const setQuantity = (itemCode: string, qty: number) => {
        if (qty < 1) qty = 1;
        setQuantities((prev) => ({ ...prev, [itemCode]: qty }));
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

        setAddingToBasket((prev) => new Set(prev).add(item.ITEM_CODE));

        try {
            await addItemToBasket({
                TRDR: customer.TRDR,
                MTRL: Number(item.MTRL),
                QTY: getQuantity(item.ITEM_CODE),
                PRICE_ERP: Number(item.PRICE_WHOLE),
                PRICE_REQ: Number(item.PRICE_WHOLE),
            });

            setQuantities((prev) => ({ ...prev, [item.ITEM_CODE]: 1 }));
            await loadBasket(customer.TRDR);
        } catch (err) {
            console.error("Failed to add item to basket:", err);
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

        if (!discountValue || !Number.isFinite(requestedPrice) || requestedPrice <= 0) {
            return;
        }

        setSubmittingDiscount((prev) => new Set(prev).add(item.ITEM_CODE));

        try {
            await requestDiscount({
                TRDR: customer.TRDR,
                MTRL: Number(item.MTRL),
                QTY: getQuantity(item.ITEM_CODE),
                PRICE_ERP: Number(item.PRICE_WHOLE),
                PRICE_REQ: requestedPrice,
            });

            setDiscountPrices((prev) => ({ ...prev, [item.ITEM_CODE]: "" }));
            setQuantities((prev) => ({ ...prev, [item.ITEM_CODE]: 1 }));
            await loadBasket(customer.TRDR);
        } catch (error) {
            setBasketError(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία αιτήματος τιμής"
            );
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
                    setItems([]);
                    setHasSearched(false);
                    setSearch("");
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
                                    <p className="mb-2 text-sm text-gray-500">
                                        Βρέθηκαν {items.length} αποτελέσματα
                                    </p>
                                )}

                                <div className="space-y-2">
                                    {items.map((item) => {
                                        const isExpanded = expandedItems.has(item.ITEM_CODE);
                                        const qty = getQuantity(item.ITEM_CODE);
                                        const isAdding = addingToBasket.has(item.ITEM_CODE);
                                        const isInBasket = !!findBasketItem(item);
                                        const mtrlKey = String(item.MTRL);
                                        const storeStock = getStoreStock(item);
                                        const storeOrderQty = getStoreOrderQuantity(mtrlKey);
                                        const stockRequestStatus = stockRequestStatuses[mtrlKey] ?? null;
                                        const stockRequestError = stockRequestErrors[mtrlKey] ?? "";
                                        const isSubmittingStockRequest = submittingStockRequests.has(mtrlKey);

                                        return (
                                            <div key={`${item.ITEM_CODE}-${mtrlKey}`} className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_228px]">
                                                <div
                                                    className={`rounded-xl border transition hover:border-2 ${isInBasket
                                                        ? "border-green-400 bg-green-50 hover:bg-green-100 hover:border-green-500 dark:border-green-600 dark:bg-green-500/[0.06] dark:hover:bg-green-500/10 dark:hover:border-green-500"
                                                        : "border-gray-200 bg-white hover:bg-brand-100/40 hover:border-brand-500 dark:border-gray-800 dark:bg-white/[0.03]"
                                                        }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpanded(item.ITEM_CODE)}
                                                        className="flex w-full items-start gap-3 p-4 text-left"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-brand-600 dark:text-brand-400">
                                                                    {item.ITEM_CODE}
                                                                </p>
                                                                <span
                                                                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${item.STATUS_NOW === "1"
                                                                        ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                                                        : item.STATUS_NOW === "0"
                                                                            ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                                                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                                                                        }`}
                                                                >
                                                                    {item.STATUS_LABEL}
                                                                </span>

                                                                {isInBasket && (
                                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold leading-tight text-green-700 dark:bg-green-500/10 dark:text-green-400">
                                                                        <ShoppingCart className="h-3 w-3" />
                                                                        Στο καλάθι
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-white/90">
                                                                {item.MNF_DESCR}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-gray-500">
                                                                {item.ITEM_DESCR}
                                                            </p>

                                                            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
                                                                <div className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                                                    Απόθεμα ανά κατάστημα
                                                                </div>

                                                                <div className="grid gap-2 sm:grid-cols-3">

                                                                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm dark:bg-white/[0.04]">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                                                                                Ν.Κόσμος
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="font-semibold text-gray-800 dark:text-white">
                                                                                {item.YP1001}
                                                                            </span>
                                                                            {item.THESI1001 && (
                                                                                <div className="text-[10px] text-gray-400">
                                                                                    {item.THESI1001}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm dark:bg-white/[0.04]">
                                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                                            Λ.Αθηνών
                                                                        </span>
                                                                        <div className="text-right">
                                                                            <span className="font-semibold text-gray-800 dark:text-white">
                                                                                {item.YP1006}
                                                                            </span>
                                                                            {item.THESI1006 && (
                                                                                <div className="text-[10px] text-gray-400">
                                                                                    {item.THESI1006}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm dark:bg-white/[0.04]">
                                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                                                            Λ.Μεσογείων
                                                                        </span>
                                                                        <div className="text-right">
                                                                            <span className="font-semibold text-gray-800 dark:text-white">
                                                                                {item.YP1007}
                                                                            </span>
                                                                            {item.THESI1007 && (
                                                                                <div className="text-[10px] text-gray-400">
                                                                                    {item.THESI1007}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <ChevronDown
                                                            className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                                        />
                                                    </button>

                                                    <div
                                                        className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
                                                            }`}
                                                    >
                                                        <div className="border-t border-gray-100 px-4 py-4 text-sm dark:border-gray-800">

                                                            {/* 🔥 SUMMARY */}
                                                            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">

                                                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                                                    <div className="text-[10px] text-gray-400">Σύνολο</div>
                                                                    <div className="font-semibold tabular-nums">{item.TOTAL_AVAIL}</div>
                                                                </div>

                                                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                                                    <div className="text-[10px] text-gray-400">Καθαρή Διαθ.</div>
                                                                    <div className="font-semibold tabular-nums text-green-600 dark:text-green-400">
                                                                        {item.NET_QTY_AVAILABLE}
                                                                    </div>
                                                                </div>

                                                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                                                    <div className="text-[10px] text-gray-400">Δεσμ. Καλαθιού</div>
                                                                    <div className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                                                                        {item.BasketReserved}
                                                                    </div>
                                                                </div>

                                                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                                                                    <div className="text-[10px] text-gray-400">Παραγγελίες</div>
                                                                    <div className="font-semibold tabular-nums">{item.SoOrdered}</div>
                                                                </div>

                                                            </div>

                                                            {/* ΚΩΔΙΚΟΙ */}
                                                            <div className="mb-4">
                                                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                                                    Κωδικοί
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Κωδ. 2</span>
                                                                        <span className="font-medium text-gray-800 dark:text-white">{item.ITEM_CODE2}</span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Ομοιος</span>
                                                                        <span className="font-medium text-gray-800 dark:text-white">{item.ITEM_OMOIO || "—"}</span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">CODE1_0</span>
                                                                        <span className="font-medium text-gray-800 dark:text-white">{item.CODE1_0 || "—"}</span>
                                                                    </div>

                                                                </div>
                                                            </div>

                                                            {/* ΑΠΟΘΕΜΑ */}
                                                            <div className="mb-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                                                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                                                    Κατάσταση Αποθέματος
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-x-6 gap-y-2">

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Σε εξέλιξη</span>
                                                                        <span className="font-medium text-gray-800 dark:text-white">{item.ONGOING}</span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Καθαρή Διαθ.</span>
                                                                        <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                                                                            {item.NET_QTY_AVAILABLE}
                                                                        </span>
                                                                    </div>

                                                                </div>
                                                            </div>

                                                            {/* ΠΑΡΑΓΓΕΛΙΕΣ */}
                                                            <div className="mb-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                                                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                                                    Παραγγελίες
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Παραγγελθέντα</span>
                                                                        <span className="font-medium text-gray-800 dark:text-white">{item.SoOrdered}</span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Δεσμευμένα</span>
                                                                        <span className="font-medium text-gray-800 dark:text-white">{item.SoReserved}</span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Κατάσταση</span>
                                                                        <span className="font-medium text-gray-800 dark:text-white">{item.STATUS_MOBILE || "—"}</span>
                                                                    </div>

                                                                </div>
                                                            </div>

                                                            {/* ΚΑΛΑΘΙ */}
                                                            <div className="mb-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                                                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                                                    Καλάθι
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-x-6 gap-y-2">

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Ποσότητα</span>
                                                                        <span className="font-medium text-gray-800 dark:text-white">{item.BASKET_QTY}</span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Ημ/νία</span>
                                                                        <span className="text-gray-500">
                                                                            {item.BASKET_DATE !== "1900-01-01 00:00:00"
                                                                                ? item.BASKET_DATE
                                                                                : "—"}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Req. Τιμή</span>
                                                                        <span className="font-medium text-gray-800 dark:text-white">
                                                                            {formatPrice(item.BASKET_REQ_PRICE)}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">ERP Τιμή</span>
                                                                        <span className="font-medium text-gray-800 dark:text-white">
                                                                            {formatPrice(item.BASKET_ERP_PRICE)}
                                                                        </span>
                                                                    </div>

                                                                </div>
                                                            </div>

                                                            {/* ΤΙΜΕΣ */}
                                                            <div className="border-t border-gray-100 pt-3 dark:border-gray-800">

                                                                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                                                    Τιμές
                                                                </div>

                                                                {item.PRICE_MESSAGE && item.PRICE_MESSAGE !== "0" && (
                                                                    <div className="mb-2 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                                                        {item.PRICE_MESSAGE}
                                                                    </div>
                                                                )}

                                                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Χονδρική</span>
                                                                        <span>{formatPrice(item.PRICE_WHOLE)}</span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Λιανική</span>
                                                                        <span className="font-semibold">{formatPrice(item.PRICE_RETAIL)}</span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Κόστος</span>
                                                                        <span>{formatPrice(item.STANDCOST)}</span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Τιμοκ. 01</span>
                                                                        <span>{formatPrice(item.PRICER01)}</span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Τιμοκ. 02</span>
                                                                        <span>{formatPrice(item.PRICER02)}</span>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-400">Τιμοκ. 03</span>
                                                                        <span>{formatPrice(item.PRICER03)}</span>
                                                                    </div>

                                                                </div>
                                                            </div>

                                                        </div>
                                                    </div>

                                                    {customer && (
                                                        <div className="border-t border-gray-100 dark:border-gray-800">
                                                            {(() => {
                                                                const basketItem = findBasketItem(item);
                                                                const requestedPrice =
                                                                    basketItem != null
                                                                        ? getBasketItemRequestedPrice(basketItem)
                                                                        : null;
                                                                const discountValue = discountPrices[item.ITEM_CODE] ?? "";
                                                                const isSubmittingRequestPrice =
                                                                    submittingDiscount.has(item.ITEM_CODE);

                                                                return (
                                                                    <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                                                                        <div className="mb-2 flex items-center gap-2">
                                                                            <BadgePercent className="h-4 w-4 text-amber-500" />
                                                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                                                Αίτημα Τιμής
                                                                            </p>
                                                                            {requestedPrice != null && requestedPrice > 0 && (
                                                                                <span className="ml-auto text-xs font-medium text-amber-700 dark:text-amber-400">
                                                                                    Τρέχον: {formatPrice(requestedPrice)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="number"
                                                                                min={0}
                                                                                step="0.01"
                                                                                value={discountValue}
                                                                                onChange={(e) =>
                                                                                    setDiscountPrices((prev) => ({
                                                                                        ...prev,
                                                                                        [item.ITEM_CODE]: e.target.value,
                                                                                    }))
                                                                                }
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === "Enter") {
                                                                                        handleRequestDiscount(item);
                                                                                    }
                                                                                }}
                                                                                placeholder="Νέα τιμή..."
                                                                                className="h-9 w-36 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRequestDiscount(item)}
                                                                                disabled={isSubmittingRequestPrice || !discountValue || Number(discountValue) <= 0}
                                                                                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:bg-amber-600 disabled:opacity-40"
                                                                            >
                                                                                {isSubmittingRequestPrice ? (
                                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                                ) : (
                                                                                    <Send className="h-3.5 w-3.5" />
                                                                                )}
                                                                                <span>Αίτημα</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            <div className="flex items-center gap-3 px-4 py-3">
                                                                <div className="inline-flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setQuantity(item.ITEM_CODE, qty - 1)}
                                                                        disabled={qty <= 1}
                                                                        aria-label="Μείωση ποσότητας"
                                                                        className="flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300 dark:disabled:text-gray-600"
                                                                    >
                                                                        <Minus className="h-4 w-4" />
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        value={qty === 1 ? "" : qty}
                                                                        placeholder="1"
                                                                        onChange={(e) => {
                                                                            const rawValue = e.target.value;
                                                                            if (rawValue === "") {
                                                                                setQuantity(item.ITEM_CODE, 1);
                                                                                return;
                                                                            }

                                                                            const val = parseInt(rawValue, 10);
                                                                            if (!isNaN(val)) setQuantity(item.ITEM_CODE, val);
                                                                        }}
                                                                        onBlur={() => {
                                                                            if (qty < 1) setQuantity(item.ITEM_CODE, 1);
                                                                        }}
                                                                        className="h-10 w-14 border-x border-gray-200 bg-gray-50/70 text-center text-sm font-semibold text-gray-800 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-800/70 dark:text-white dark:focus:bg-gray-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setQuantity(item.ITEM_CODE, qty + 1)}
                                                                        aria-label="Αύξηση ποσότητας"
                                                                        className="flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                                                                    >
                                                                        <Plus className="h-4 w-4" />
                                                                    </button>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAddToBasket(item)}
                                                                    disabled={isAdding}
                                                                    className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow-md disabled:opacity-60"
                                                                >
                                                                    {isAdding ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <ShoppingCart className="h-4 w-4" />
                                                                    )}
                                                                    <span className="hidden sm:inline">Προσθήκη</span>
                                                                </button>

                                                                <span className="ml-auto text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                                    {formatPrice(item.PRICE_WHOLE)}
                                                                </span>
                                                            </div>
                                                            {(() => {
                                                                const basketItem = findBasketItem(item);

                                                                if (!basketItem) return null;

                                                                return (
                                                                    <div className="border-t border-gray-100 px-4 py-2 text-xs text-green-700 dark:border-gray-800 dark:text-green-400">
                                                                        Ήδη στο καλάθι: {getBasketItemQty(basketItem)} τεμ.
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                <PartStockQuantityContainer
                                                    mtrl={item.MTRL}
                                                    stock={storeStock}
                                                    quantity={storeOrderQty}
                                                    onQuantityChange={(nextQuantity) =>
                                                        setStoreOrderQuantity(mtrlKey, nextQuantity)
                                                    }
                                                    onSubmitRequest={() => handleSubmitStockRequest(item)}
                                                    requestStatus={stockRequestStatus}
                                                    isSubmittingRequest={isSubmittingStockRequest}
                                                    requestError={stockRequestError}
                                                />
                                            </div>
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
