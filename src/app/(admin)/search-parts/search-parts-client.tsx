"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { type UIEvent, useCallback, useEffect, useRef, useState } from "react";
import { searchCustomers } from "@/app/lib/api/customers";
import { searchItems } from "@/app/lib/api/items";
import { Plus, Search, X, Trash2, Loader2, ChevronDown, Minus, ShoppingCart, BadgePercent, Check, Clock3, Send, Package } from "@/app/lib/lucide";
import { useCustomerStore } from "@/stores/customerStore";
import { ICustomerInfo, IItem, IBasket, IBasketItem } from "@/app/lib/interface";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import { fetchBasketItems, removeBasketItem, addItemToBasket, createBasket, requestDiscount, updateBasketItem } from "@/app/lib/api/basket";
import OrderSummary from "@/components/basket/order-summary";

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
    const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [addingToBasket, setAddingToBasket] = useState<Set<string>>(new Set());
    const [discountPrices, setDiscountPrices] = useState<Record<string, string>>({});
    const [submittingDiscount, setSubmittingDiscount] = useState<Set<string>>(new Set());
    const [updatingQty, setUpdatingQty] = useState<Set<string>>(new Set());
    const [basketQtyEdits, setBasketQtyEdits] = useState<Record<string, number>>({});
    const customer = useCustomerStore((state) => state.customer);
    const setCustomer = useCustomerStore((state) => state.setCustomer);
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
    };

    const loadBasket = useCallback(async (trdr: string) => {
        setBasketLoading(true);
        setBasketError("");

        try {
            const data = await fetchBasketItems(trdr);

            if (data.success) {
                setBasket(data.basket);
                setSelectedItems(new Set(data.basket?.Items.map((item) => item.Uid) ?? []));
            } else {
                setBasketError(data.message ?? "Αποτυχία φόρτωσης καλαθιού");
            }
        } catch (error) {
            setBasketError(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία φόρτωσης καλαθιού"
            );
        } finally {
            setBasketLoading(false);
        }
    }, []);

    useEffect(() => {
        if (customer?.TRDR) {
            loadBasket(customer.TRDR);
        } else {
            setBasket(null);
            setBasketError("");
            setSelectedItems(new Set());
        }
    }, [customer?.TRDR, loadBasket]);

    const handleRemoveBasketItem = async (uid: string) => {
        if (!basket) return;

        setRemovingItems((prev) => new Set(prev).add(uid));

        try {
            await removeBasketItem(basket.Uid, uid);
            if (customer?.TRDR) await loadBasket(customer.TRDR);
        } catch (err) {
            console.error("Failed to remove item:", err);
        } finally {
            setRemovingItems((prev) => {
                const next = new Set(prev);
                next.delete(uid);
                return next;
            });
        }
    };

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

    const handleAddToBasket = async (item: IItem) => {
        if (!customer) return;

        setAddingToBasket((prev) => new Set(prev).add(item.ITEM_CODE));

        try {
            let basketUid = basket?.Uid;

            if (!basketUid) {
                const created = await createBasket(customer.TRDR);
                if (created.success && created.basket) {
                    basketUid = created.basket.Uid;
                    setBasket(created.basket);
                } else {
                    return;
                }
            }

            await addItemToBasket({
                basketUid,
                productCode: item.ITEM_CODE,
                productName: item.ITEM_DESCR,
                productS1MTRL: item.MTRL,
                qty: getQuantity(item.ITEM_CODE),
                productPrice: item.PRICE_WHOLE,
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

    const findBasketItem = (itemCode: string): IBasketItem | undefined => {
        return basket?.Items.find((bi) => bi.ProductCode === itemCode);
    };

    const handleRequestDiscount = async (item: IItem) => {
        if (!basket) return;

        const basketItem = findBasketItem(item.ITEM_CODE);
        if (!basketItem) return;

        const priceStr = discountPrices[item.ITEM_CODE];
        const price = Number(priceStr);
        if (!priceStr || isNaN(price) || price <= 0) return;

        setSubmittingDiscount((prev) => new Set(prev).add(item.ITEM_CODE));

        try {
            await requestDiscount(basket.Uid, basketItem.Uid, price);
            setDiscountPrices((prev) => ({ ...prev, [item.ITEM_CODE]: "" }));
            if (customer?.TRDR) await loadBasket(customer.TRDR);
        } catch (err) {
            console.error("Failed to request discount:", err);
        } finally {
            setSubmittingDiscount((prev) => {
                const next = new Set(prev);
                next.delete(item.ITEM_CODE);
                return next;
            });
        }
    };

    const handleUpdateBasketQty = async (item: IItem) => {
        if (!basket) return;

        const basketItem = findBasketItem(item.ITEM_CODE);
        if (!basketItem) return;

        const newQty = basketQtyEdits[item.ITEM_CODE] ?? basketItem.Qty ?? 1;
        if (newQty === basketItem.Qty) return;

        setUpdatingQty((prev) => new Set(prev).add(item.ITEM_CODE));

        try {
            await updateBasketItem(basket.Uid, basketItem.Uid, newQty);
            if (customer?.TRDR) await loadBasket(customer.TRDR);
        } catch (err) {
            console.error("Failed to update basket qty:", err);
        } finally {
            setUpdatingQty((prev) => {
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
                        backHref="/search-customer"
                        backLabel="Επιστροφή στην αναζήτηση πελατών"
                    />
                </div>
            )}

            {hasMounted && customer && (
                <div className="mb-4 shrink-0 flex items-center gap-3 rounded-full border-2 border-brand-500 bg-brand-50 p-4 text-sm text-gray-700">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4 sm:gap-8">
                        <span className="font-semibold text-gray-800">
                            {customer.NAME}
                        </span>

                        <span className="text-gray-500">
                            ΑΦΜ: {customer.AFM}
                        </span>

                        {customer.PHONE01 && (
                            <span className="text-gray-500">
                                📞 {customer.PHONE01}
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenCustomerModal}
                        aria-label="Νέα αναζήτηση πελάτη"
                        className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-500 bg-white text-brand-500 shadow-sm transition-all duration-200 hover:bg-brand-500 hover:text-white dark:border-brand-500 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white"
                    >
                        <Plus className="h-5 w-5" />
                    </button>
                </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
                <div className={`relative min-h-0 w-full xl:min-w-0 ${sidebarVisible ? "xl:basis-2/3" : ""} transition-all duration-300`}>
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

                                <div className={`flex items-center gap-2 ${hasScrolledResults ? "mt-0" : "mt-6"}`}>
                                    <div className="relative min-w-0 flex-1">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onFocus={() => {
                                                if (search) {
                                                    setSearch("");
                                                }
                                            }}
                                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                            placeholder="Κωδικός ανταλλακτικού, όνομα, περιγραφή..."
                                            className={`w-full rounded-full border bg-gray-50 px-4 py-3 pr-11 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2  focus:ring-brand-500 focus:bg-brand-50 dark:bg-gray-900 dark:text-white ${search.trim()
                                                ? "border-brand-500 ring-2 ring-brand-500"
                                                : "border-gray-300 dark:border-gray-700"
                                                }`}
                                        />

                                        {search.trim() && (
                                            <button
                                                type="button"
                                                onClick={() => setSearch("")}
                                                aria-label="Καθαρισμός αναζήτησης"
                                                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleSearch}
                                        aria-label="Αναζήτηση"
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 font-medium text-white shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow-md sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
                                    >
                                        {loading ? (
                                            <span
                                                aria-hidden="true"
                                                className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                                            />
                                        ) : (
                                            <>
                                                <Search className="h-5 w-5" />
                                                <span className="hidden sm:inline">Αναζήτηση</span>
                                            </>
                                        )}
                                    </button>
                                </div>
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

                                        return (
                                            <div
                                                key={item.ITEM_CODE}
                                                className="rounded-xl border border-gray-200 bg-white transition  hover:bg-brand-100 hover:border-2 hover:border-brand-500 dark:border-gray-800 dark:bg-white/[0.03]"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpanded(item.ITEM_CODE)}
                                                    className="flex w-full items-start gap-3 p-4 text-left"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-brand-600 dark:text-brand-400">
                                                                {item.ITEM_CODE2}
                                                            </p>
                                                            <span
                                                                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${item.STATUS_NOW === 1
                                                                    ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                                                    : item.STATUS_NOW === 0
                                                                        ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                                                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"
                                                                    }`}
                                                            >
                                                                {item.STATUS_LABEL}
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-white/90">
                                                            {item.MNF_DESCR}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-gray-500">
                                                            {item.ITEM_DESCR}
                                                        </p>
                                                    </div>
                                                    <ChevronDown
                                                        className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                                    />
                                                </button>

                                                {/* Expanded details */}
                                                <div
                                                    className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                                                        }`}
                                                >
                                                    <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-800">
                                                        {/* Codes */}
                                                        <div className="mb-3">
                                                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                                                Κωδικοί
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                                                                <div>
                                                                    <span className="text-gray-400">Κωδικός: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{item.ITEM_CODE}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Κωδ. 2: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{item.ITEM_CODE2}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Ομοιος: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{item.ITEM_OMOIO || "—"}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">CODE1_0: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{item.CODE1_0 || "—"}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Stock / Availability */}
                                                        <div className="mb-3">
                                                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                                                Απόθεμα
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                                                                <div>
                                                                    <span className="text-gray-400">ΥΠ 1001: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{item.YP1001}</span>
                                                                    {item.THESI1001 && (
                                                                        <span className="ml-1 text-gray-400">({item.THESI1001})</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">ΥΠ 1006: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{item.YP1006}</span>
                                                                    {item.THESI1006 && (
                                                                        <span className="ml-1 text-gray-400">({item.THESI1006})</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">ΥΠ 1007: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{item.YP1007}</span>
                                                                    {item.THESI1007 && (
                                                                        <span className="ml-1 text-gray-400">({item.THESI1007})</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Συνολ. Διαθ.: </span>
                                                                    <span className="font-semibold text-gray-800 dark:text-white/90">{item.TOTAL_AVAIL}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Σε εξέλιξη: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{item.ONGOING}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Καθαρή Διαθ.: </span>
                                                                    <span className="font-semibold text-gray-800 dark:text-white/90">{item.NET_QTY_AVAILABLE}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Orders */}
                                                        <div className="mb-3">
                                                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                                                Παραγγελίες
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                                                                <div>
                                                                    <span className="text-gray-400">Παραγγελθέντα: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{item.SoOrdered}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Δεσμευμένα: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{item.SoReserved}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Κατάσταση: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{item.STATUS_MOBILE || "—"}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Prices */}
                                                        <div>
                                                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                                                Τιμές
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                                                                <div>
                                                                    <span className="text-gray-400">Χονδρική: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{formatPrice(item.PRICE_WHOLE)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Λιανική: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{formatPrice(item.PRICE_RETAIL)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Κόστος: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{formatPrice(item.STANDCOST)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Τιμοκ. 01: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{formatPrice(item.PRICER01)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Τιμοκ. 02: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{formatPrice(item.PRICER02)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400">Τιμοκ. 03: </span>
                                                                    <span className="font-medium text-gray-700 dark:text-white/80">{formatPrice(item.PRICER03)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Basket actions — discount request + stock qty + add to basket */}
                                                {customer && (
                                                    <div className="border-t border-gray-100 dark:border-gray-800">
                                                        {/* Discount request section — only when item is in basket */}
                                                        {(() => {
                                                            const basketItem = findBasketItem(item.ITEM_CODE);
                                                            if (!basketItem) return null;

                                                            const isSubmittingDiscount = submittingDiscount.has(item.ITEM_CODE);
                                                            const discountValue = discountPrices[item.ITEM_CODE] ?? "";

                                                            return (
                                                                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <BadgePercent className="h-4 w-4 text-amber-500" />
                                                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                                            Αίτημα Έκπτωσης
                                                                        </p>
                                                                        {/* Current status badge */}
                                                                        {basketItem.BargainStatus != null && (
                                                                            <span
                                                                                className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                                                    basketItem.BargainStatus === 200
                                                                                        ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                                                                        : basketItem.BargainStatus === 500
                                                                                            ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                                                                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                                                                }`}
                                                                            >
                                                                                {basketItem.BargainStatus === 200 ? (
                                                                                    <><Check className="h-3 w-3" /> Εγκρίθηκε: {formatPrice(basketItem.ProductBargainPrice)}</>
                                                                                ) : basketItem.BargainStatus === 500 ? (
                                                                                    <><X className="h-3 w-3" /> Απορρίφθηκε</>
                                                                                ) : (
                                                                                    <><Clock3 className="h-3 w-3" /> Αναμονή: {formatPrice(basketItem.ProductBargainPrice)}</>
                                                                                )}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="relative">
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
                                                                                onKeyDown={(e) => e.key === "Enter" && handleRequestDiscount(item)}
                                                                                placeholder="Τιμή έκπτωσης..."
                                                                                className="h-9 w-36 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRequestDiscount(item)}
                                                                            disabled={isSubmittingDiscount || !discountValue || Number(discountValue) <= 0}
                                                                            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:bg-amber-600 disabled:opacity-40"
                                                                        >
                                                                            {isSubmittingDiscount ? (
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

                                                        {/* Stock quantity section — update qty for items already in basket */}
                                                        {(() => {
                                                            const basketItem = findBasketItem(item.ITEM_CODE);
                                                            if (!basketItem) return null;

                                                            const currentQty = basketQtyEdits[item.ITEM_CODE] ?? basketItem.Qty ?? 1;
                                                            const isUpdating = updatingQty.has(item.ITEM_CODE);
                                                            const hasChanged = currentQty !== (basketItem.Qty ?? 1);

                                                            return (
                                                                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <Package className="h-4 w-4 text-blue-500" />
                                                                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                                            Ποσότητα στο καλάθι
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setBasketQtyEdits((prev) => ({
                                                                                        ...prev,
                                                                                        [item.ITEM_CODE]: Math.max(1, currentQty - 1),
                                                                                    }))
                                                                                }
                                                                                disabled={currentQty <= 1}
                                                                                aria-label="Μείωση"
                                                                                className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                                                                            >
                                                                                <Minus className="h-4 w-4" />
                                                                            </button>
                                                                            <input
                                                                                type="number"
                                                                                min={1}
                                                                                value={currentQty}
                                                                                onChange={(e) => {
                                                                                    const val = parseInt(e.target.value, 10);
                                                                                    if (!isNaN(val) && val >= 1) {
                                                                                        setBasketQtyEdits((prev) => ({
                                                                                            ...prev,
                                                                                            [item.ITEM_CODE]: val,
                                                                                        }));
                                                                                    }
                                                                                }}
                                                                                onKeyDown={(e) => e.key === "Enter" && hasChanged && handleUpdateBasketQty(item)}
                                                                                className="h-9 w-14 border-x border-gray-200 bg-transparent text-center text-sm font-medium text-gray-800 outline-none dark:border-gray-700 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setBasketQtyEdits((prev) => ({
                                                                                        ...prev,
                                                                                        [item.ITEM_CODE]: currentQty + 1,
                                                                                    }))
                                                                                }
                                                                                aria-label="Αύξηση"
                                                                                className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                            >
                                                                                <Plus className="h-4 w-4" />
                                                                            </button>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleUpdateBasketQty(item)}
                                                                            disabled={isUpdating || !hasChanged}
                                                                            className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-600 disabled:opacity-40"
                                                                        >
                                                                            {isUpdating ? (
                                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                            ) : (
                                                                                <Check className="h-3.5 w-3.5" />
                                                                            )}
                                                                            <span>Ενημέρωση</span>
                                                                        </button>
                                                                        <span className="ml-auto text-xs text-gray-400">
                                                                            Τρέχουσα: {basketItem.Qty ?? 0}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Add to basket controls */}
                                                        <div className="flex items-center gap-3 px-4 py-3">
                                                            <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setQuantity(item.ITEM_CODE, qty - 1)}
                                                                    disabled={qty <= 1}
                                                                    aria-label="Μείωση ποσότητας"
                                                                    className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                                                                >
                                                                    <Minus className="h-4 w-4" />
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    value={qty}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value, 10);
                                                                        if (!isNaN(val)) setQuantity(item.ITEM_CODE, val);
                                                                    }}
                                                                    className="h-9 w-12 border-x border-gray-200 bg-transparent text-center text-sm font-medium text-gray-800 outline-none dark:border-gray-700 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setQuantity(item.ITEM_CODE, qty + 1)}
                                                                    aria-label="Αύξηση ποσότητας"
                                                                    className="flex h-9 w-9 items-center justify-center text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
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
                                                    </div>
                                                )}
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

                <OrderSummary
                    customer={customer}
                    basket={basket}
                    loading={basketLoading}
                    error={basketError}
                    onRefresh={() => customer && loadBasket(customer.TRDR)}
                    onSendOrder={() => {
                        // TODO: integrate with order submission API
                    }}
                    selectedItems={selectedItems}
                    selectedCount={basket?.Items.filter((i) => selectedItems.has(i.Uid)).length ?? 0}
                    selectedTotal={basket?.Items.filter((i) => selectedItems.has(i.Uid)).reduce((sum, i) => sum + (i.ProductPrice ?? 0) * (i.Qty ?? 0), 0) ?? 0}
                    onToggleItem={(uid) => {
                        setSelectedItems((prev) => {
                            const next = new Set(prev);
                            if (next.has(uid)) next.delete(uid);
                            else next.add(uid);
                            return next;
                        });
                    }}
                    onRemoveItem={handleRemoveBasketItem}
                    removingItems={removingItems}
                    collapsible
                    collapsed={!sidebarVisible}
                    onToggleCollapse={() => setSidebarVisible((v) => !v)}
                />
            </div>

            <Modal isOpen={isSearchModalOpen} onClose={closeSearchModal} className="max-w-[820px] m-4 p-6 sm:p-8">
                <div className="pr-12">
                    <h4 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                        Βρείτε το ανταλλακτικό που ψάχνετε
                    </h4>

                    <div className="mt-6 flex items-center gap-2">
                        <div className="relative min-w-0 flex-1">
                            <input
                                ref={modalInputRef}
                                type="text"
                                value={modalSearch}
                                onChange={(e) => setModalSearch(e.target.value)}
                                onFocus={() => {
                                    if (modalSearch) {
                                        setModalSearch("");
                                    }
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleModalSearch()}
                                placeholder="Κωδικός ανταλλακτικού, όνομα, περιγραφή..."
                                className={`w-full rounded-full border bg-gray-50 px-4 py-3 pr-11 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2  focus:ring-brand-500 focus:bg-brand-50 dark:bg-gray-900 dark:text-white ${modalSearch.trim()
                                    ? "border-brand-500 ring-2 ring-brand-500"
                                    : "border-gray-300 dark:border-gray-700"
                                    }`}
                            />

                            {modalSearch.trim() && (
                                <button
                                    type="button"
                                    onClick={() => setModalSearch("")}
                                    aria-label="Καθαρισμός αναζήτησης"
                                    className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleModalSearch}
                            aria-label="Αναζήτηση από modal"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 font-medium text-white shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow-md sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
                        >
                            {loading ? (
                                <span
                                    aria-hidden="true"
                                    className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                                />
                            ) : (
                                <>
                                    <Search className="h-5 w-5" />
                                    <span className="hidden sm:inline">Αναζήτηση</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isCustomerModalOpen} onClose={closeCustomerModal} className="max-w-[900px] m-4 p-6 sm:p-8">
                <div className="space-y-6 pr-12">
                    <div>
                        <h4 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                            Βρείτε τον πελάτη στη λίστα των καταχωρημένων πελατών
                        </h4>

                        <div className="mt-6 flex items-center gap-2">
                            <div className="relative min-w-0 flex-1">
                                <input
                                    ref={customerModalInputRef}
                                    value={customerModalSearch}
                                    onChange={(e) => setCustomerModalSearch(e.target.value)}
                                    onFocus={() => {
                                        if (customerModalSearch) {
                                            setCustomerModalSearch("");
                                        }
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && handleCustomerModalSearch()}
                                    className={`w-full rounded-full border bg-gray-50 px-4 py-3 pr-11 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2  focus:ring-brand-500 focus:bg-brand-50 dark:bg-gray-900 dark:text-white ${customerModalSearch.trim()
                                        ? "border-brand-500 ring-2 ring-brand-500"
                                        : "border-gray-300 dark:border-gray-700"
                                        }`}
                                    placeholder="Όνομα, ΑΦΜ, email..."
                                />

                                {customerModalSearch.trim() && (
                                    <button
                                        type="button"
                                        onClick={() => setCustomerModalSearch("")}
                                        aria-label="Καθαρισμός αναζήτησης"
                                        className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleCustomerModalSearch}
                                aria-label="Αναζήτηση πελάτη"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
                            >
                                {customerModalLoading ? (
                                    <span
                                        aria-hidden="true"
                                        className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                                    />
                                ) : (
                                    <>
                                        <Search className="h-5 w-5" />
                                        <span className="hidden sm:inline">Αναζήτηση</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[60dvh] overflow-y-auto">
                        <div className="space-y-3">
                            {customerModalError && (
                                <p className="text-sm text-red-500">
                                    {customerModalError}
                                </p>
                            )}

                            {customerResults.length > 0 && (
                                <p className="text-sm text-gray-500">
                                    Βρέθηκαν {customerResults.length} πελάτες
                                </p>
                            )}

                            {customerResults.map((resultCustomer) => (
                                <div
                                    key={resultCustomer.TRDR}
                                    onClick={() => handleCustomerSelect(resultCustomer)}
                                    className="rounded-xl border bg-white p-4 cursor-pointer transition hover:border-2 hover:border-brand-500 hover:bg-brand-100"
                                >
                                    <p className="font-semibold">{resultCustomer.NAME}</p>
                                    <p className="text-sm text-gray-500">{resultCustomer.AFM}</p>
                                    <p className="text-xs">
                                        {resultCustomer.MAIN_ADDRESS} - {resultCustomer.MAIN_CITY}
                                    </p>
                                </div>
                            ))}

                            {customerModalHasSearched && !customerModalLoading && customerResults.length === 0 && !customerModalError && (
                                <p className="text-center text-sm text-gray-400">
                                    Δεν βρέθηκαν πελάτες
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
