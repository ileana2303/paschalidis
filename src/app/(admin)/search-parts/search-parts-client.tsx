"use client";

import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import { Modal } from "@/components/ui/modal";
import { fetchRequestedPriceRequests } from "@/lib/api-client/basket";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSearchPartsStore } from "@/stores/searchPartsStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useAuthStore } from "@/stores/authStore";
import type { ICustomerInfo } from "@/lib/interface";
import CustomerInfoContainer from "@/components/customer/customer-info-container";
import PartsSearchModal from "@/components/search/parts-search-modal";
import CustomerSearchModal from "@/components/search/customer-search-modal";
import SearchBar from "@/components/search/search-bar";
import PartsResultsContainer from "@/components/parts/parts-results-container";
import CustomerOrderSummary from "@/components/order-summary/customer-order-summary";
import { useFetchCustomerByTrdrMutation } from "@/hooks/queries/useApiMutations";
import { useSearchPartsBasketController } from "@/hooks/search-parts/use-search-parts-basket-controller";
import { useSearchPartsResultsController } from "@/hooks/search-parts/use-search-parts-results-controller";
import { useSearchPartsPageController } from "@/hooks/search-parts/use-search-parts-page-controller";

export default function SearchPartsClient() {
    const hasMounted = true;

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

    const modalInputRef = useRef<HTMLInputElement>(null);
    const customerModalInputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const pendingScopedNavigationRef = useRef(false);
    const lastUrlPartSearchRef = useRef<string | null>(null);
    const customerHydrationAttemptedRef = useRef<Set<string>>(new Set());
    const { mutateAsync: fetchCustomerByTrdr } = useFetchCustomerByTrdrMutation();
    const [storesReady, setStoresReady] = useState(false);
    const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
    const [pendingPriceRequestCount, setPendingPriceRequestCount] = useState(0);

    const pageController = useSearchPartsPageController({
        customer,
        search,
        setSearch,
        setItems,
        setHasSearched,
        setSearchStateTrdr,
    });
    const {
        modalSearch,
        setModalSearch,
        customerModalSearch,
        setCustomerModalSearch,
        customerResults,
        loading,
        customerModalLoading,
        customerModalHasSearched,
        customerModalError,
        isSearchModalOpen,
        closeSearchModal,
        isCustomerModalOpen,
        closeCustomerModal,
        handleOpenSearchModal,
        handleOpenCustomerModal,
        runSearch: runPageDirectSearch,
        handleSearch: runPageSearch,
        handleModalSearch: runPageModalSearch,
        handleCustomerModalSearch,
    } = pageController;

    const resultsController = useSearchPartsResultsController({
        customer,
        user,
        items,
        hasMounted,
        resultsContainerRef,
        onRequireCustomerSelection: handleOpenCustomerModal,
    });

    const basketController = useSearchPartsBasketController({
        customer,
        currentBranchCode: resultsController.currentBranchCode,
        userId: user?.uid,
        searchItems: items,
    });
    const handleUpdateQty = basketController.handleUpdateQty;

    const resetScopedSearchState = resultsController.resetScopedResultsState;
    const prepareResultsForSearch = resultsController.prepareForSearch;

    const handleSearch = async () => {
        prepareResultsForSearch();
        await runPageSearch();
    };

    const handleModalSearch = async () => {
        prepareResultsForSearch();
        await runPageModalSearch();
    };

    useEffect(() => {
        const urlPart = String(searchParams.get("part") ?? "").trim();

        if (!urlPart) {
            lastUrlPartSearchRef.current = null;
            return;
        }

        const urlTrdr = String(searchParams.get("trdr") ?? "").trim();
        const customerTrdr = String(customer?.TRDR ?? "").trim();
        const searchKey = [urlTrdr, customerTrdr, urlPart].join("|");

        if (lastUrlPartSearchRef.current === searchKey) {
            return;
        }

        lastUrlPartSearchRef.current = searchKey;
        pendingScopedNavigationRef.current = Boolean(urlTrdr);
        prepareResultsForSearch();

        void runPageDirectSearch(urlPart).then((hasRunSearch) => {
            if (!hasRunSearch) {
                return;
            }

            requestAnimationFrame(() => {
                resultsContainerRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                });
            });
        });
    }, [
        customer?.TRDR,
        prepareResultsForSearch,
        runPageDirectSearch,
        searchParams,
    ]);

    useEffect(() => {
        const syncStoresReady = () => {
            if (
                useCustomerStore.persist.hasHydrated() &&
                useSearchPartsStore.persist.hasHydrated()
            ) {
                setStoresReady(true);
            }
        };

        syncStoresReady();

        const unsubscribeCustomer =
            useCustomerStore.persist.onFinishHydration(syncStoresReady);
        const unsubscribeSearch =
            useSearchPartsStore.persist.onFinishHydration(syncStoresReady);

        return () => {
            unsubscribeCustomer();
            unsubscribeSearch();
        };
    }, []);

    useEffect(() => {
        if (!storesReady || !hasMounted) {
            return;
        }

        const customerTrdr = String(customer?.TRDR ?? "").trim();
        const urlTrdr = String(searchParams.get("trdr") ?? "").trim();

        if (customerTrdr && !urlTrdr) {
            pendingScopedNavigationRef.current = true;
            router.replace(`/search-parts?trdr=${customerTrdr}`);
            return;
        }

        if (urlTrdr) {
            pendingScopedNavigationRef.current = false;
        }
    }, [customer?.TRDR, hasMounted, router, searchParams, storesReady]);

    useEffect(() => {
        if (!storesReady) {
            return;
        }

        const urlTrdr = String(searchParams.get("trdr") ?? "").trim();

        if (!urlTrdr) {
            return;
        }

        const customerTrdr = String(customer?.TRDR ?? "").trim();
        const priceTier = String(customer?.PRICE_TIER ?? "").trim();
        const hasCompleteCustomer =
            customerTrdr === urlTrdr && priceTier.length > 0;

        if (hasCompleteCustomer) {
            return;
        }

        if (customerHydrationAttemptedRef.current.has(urlTrdr)) {
            return;
        }

        customerHydrationAttemptedRef.current.add(urlTrdr);

        void fetchCustomerByTrdr({
            trdr: urlTrdr,
            name: customer?.NAME,
        })
            .then((resolvedCustomer) => {
                if (String(resolvedCustomer.TRDR ?? "").trim() !== urlTrdr) {
                    return;
                }

                setCustomer(resolvedCustomer);
                setSearchStateTrdr(urlTrdr);
            })
            .catch(() => {
                customerHydrationAttemptedRef.current.delete(urlTrdr);
            });
    }, [
        customer?.NAME,
        customer?.PRICE_TIER,
        customer?.TRDR,
        fetchCustomerByTrdr,
        searchParams,
        setCustomer,
        setSearchStateTrdr,
        storesReady,
    ]);

    useEffect(() => {
        if (!storesReady) {
            return;
        }

        const customerTrdr = String(customer?.TRDR ?? "").trim() || null;
        const snapshotTrdr = String(searchStateTrdr ?? "").trim() || null;

        if (customerTrdr === snapshotTrdr) {
            return;
        }

        if (customerTrdr && snapshotTrdr && customerTrdr !== snapshotTrdr) {
            clearSearchPartsState();
            resetScopedSearchState();
        }

        setSearchStateTrdr(customerTrdr);
    }, [
        clearSearchPartsState,
        customer?.TRDR,
        resetScopedSearchState,
        searchStateTrdr,
        setSearchStateTrdr,
        storesReady,
    ]);

    useEffect(() => {
        if (hasMounted) {
            searchInputRef.current?.focus();
        }
    }, [hasMounted]);

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
            if (
                event.key !== "Enter" ||
                isSearchModalOpen ||
                isCustomerModalOpen
            ) {
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
    }, [
        handleOpenSearchModal,
        isCustomerModalOpen,
        isSearchModalOpen,
    ]);

    const handleCustomerSelect = (selectedCustomer: ICustomerInfo) => {
        pendingScopedNavigationRef.current = true;
        setCustomer(selectedCustomer);
        clearSearchPartsState();
        setSearchStateTrdr(String(selectedCustomer.TRDR).trim() || null);
        setModalSearch("");
        resetScopedSearchState({ resetScroll: true });
        closeCustomerModal();
        router.replace(`/search-parts?trdr=${selectedCustomer.TRDR}`);
    };

    const handleClearCustomer = () => {
        pendingScopedNavigationRef.current = false;
        clearCustomer();
        clearSearchPartsState();
        resetScopedSearchState();
        router.replace("/search-parts");
    };

    const handleSendOrder = useCallback(async () => {
        if (!customer) {
            return;
        }

        try {
            const data = await fetchRequestedPriceRequests();
            const pendingForCustomer = (data.rows ?? []).filter(
                (row) => String(row.TRDR ?? "").trim() === String(customer.TRDR).trim()
            );

            if (pendingForCustomer.length > 0) {
                setPendingPriceRequestCount(pendingForCustomer.length);
                setOrderConfirmOpen(true);
                return;
            }
        } catch {
            await basketController.handleSendOrder();
            return;
        }

        await basketController.handleSendOrder();
    }, [basketController, customer]);

    const handleConfirmSendOrder = useCallback(async () => {
        setOrderConfirmOpen(false);
        await basketController.handleSendOrder();
    }, [basketController]);

    return (
        <div className="flex h-[calc(100dvh-8rem)] flex-col overflow-hidden md:h-[calc(100dvh-9rem)]">
            {!resultsController.hasScrolledResults && (
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
                onClearCustomer={handleClearCustomer}
                onOpenCustomerModal={handleOpenCustomerModal}
            />

            <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
                <div
                    className={`min-h-0 w-full xl:min-w-0 ${customer != null && resultsController.sidebarVisible ? "xl:basis-2/3" : ""} flex flex-1 flex-col transition-all duration-300`}
                >
                    <div className="min-h-0 flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-white/3">
                        <div className="shrink-0 px-5 py-6 dark:border-gray-800 xl:px-10">
                            <div className="mx-auto w-full max-w-[820px] text-center xl:max-w-[1120px] 2xl:max-w-[1360px]">
                                <h3
                                    className={`overflow-hidden text-theme-xl font-semibold text-gray-800 transition-all duration-300 dark:text-white/90 sm:text-2xl ${resultsController.hasScrolledResults
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
                                    clearOnFocus={false}
                                    containerClassName={resultsController.hasScrolledResults ? "mt-0" : "mt-6"}
                                    searchButtonClassName="font-medium shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow-md"
                                />
                            </div>
                        </div>

                        <PartsResultsContainer
                            layout={{
                                hasCustomer: customer != null,
                                customer,
                                resultsContainerRef,
                                onResultsScroll: resultsController.handleResultsScroll,
                                hasScrolledResults: resultsController.hasScrolledResults,
                                isResultsScrollable: resultsController.isResultsScrollable,
                                onOpenSearchModal: handleOpenSearchModal,
                            }}
                            results={{
                                items,
                                loading,
                                hasSearched,
                                currentBranchCode: resultsController.currentBranchCode,
                                stockRequestCardsVisible: resultsController.stockRequestCardsVisible,
                                onToggleStockRequestCardsVisibility: resultsController.toggleStockRequestCardsVisibility,
                                onToggleAllExpanded: resultsController.toggleAllExpanded,
                                areAllResultsExpanded: resultsController.areAllResultsExpanded,
                                expandedItems: resultsController.expandedItems,
                                getExpandedItemKey: resultsController.getExpandedItemKey,
                                toggleExpanded: resultsController.toggleExpanded,
                            }}
                            endo={{
                                openEndoItemKeys: resultsController.openEndoItemKeys,
                                getBranchOptions: resultsController.getEndoBranchOptions,
                                getEndoRequestedQty: resultsController.getEndoRequestedQty,
                                getEndoPendingQty: resultsController.getEndoPendingQty,
                                setEndoRequestedQty: resultsController.setEndoRequestedQty,
                                onAddToEndoBasket: resultsController.handleAddToEndoBasket,
                                isAddingToEndoBasket: resultsController.isAddingToEndoBasket,
                                endoBasketError: resultsController.endoBasketError,
                                endoBasketSuccess: resultsController.endoBasketSuccess,
                                onToggleEndoForItem: resultsController.handleToggleEndoForItem,
                                areAllEndoSourcesOpen: resultsController.areAllEndoSourcesOpen,
                                onToggleAllEndoSources: resultsController.toggleAllEndoSources,
                            }}
                            basket={{
                                findBasketItem: basketController.findBasketItem,
                                getQuantity: basketController.getQuantity,
                                onQuantityChange: basketController.setQuantity,
                                addingToBasket: basketController.addingToBasket,
                                getStoreStock: resultsController.getStoreStock,
                                getStoreOrderQuantity: resultsController.getStoreOrderQuantity,
                                stockRequestStatuses: resultsController.stockRequestStatuses,
                                stockRequestErrors: resultsController.stockRequestErrors,
                                submittingStockRequests: resultsController.submittingStockRequests,
                                requestedPrices: basketController.requestedPrices,
                                submittingRequestedPrices: basketController.submittingRequestedPrices,
                                onRequestedPriceValueChange: basketController.setRequestedPriceValue,
                                onAddToBasket: basketController.handleAddToBasket,
                                onRequestPrice: basketController.handleRequestPrice,
                                onStoreOrderQuantityChange: resultsController.setStoreOrderQuantity,
                                onSubmitStockRequest: resultsController.handleSubmitStockRequest,
                                formatPrice: basketController.formatPrice,
                            }}
                        />
                    </div>
                </div>

                {customer && (
                    <CustomerOrderSummary
                        customer={customer}
                        basket={basketController.basket}
                        loading={basketController.basketLoading}
                        error={basketController.basketError}
                        successMessage={
                            basketController.orderSubmittedSuccess ? (
                                <div className="space-y-3">
                                    <p className="font-semibold">
                                        Η παραγγελία καταχωρήθηκε επιτυχώς.
                                    </p>
                                    <p className="text-xs opacity-90">
                                        Μπορείτε να επιστρέψετε στην αρχική σελίδα ή να συνεχίσετε με νέα παραγγελία.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => router.push("/")}
                                        className="inline-flex items-center rounded-lg bg-green-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-green-700"
                                    >
                                        Επιστροφή στην αρχική
                                    </button>
                                </div>
                            ) : undefined
                        }
                        onRefresh={basketController.handleRefreshBasket}
                        selectedItems={basketController.selectedItems}
                        selectedCount={basketController.selectedItemsList.length}
                        selectedTotal={basketController.selectedTotal}
                        receiptType={basketController.receiptType}
                        onReceiptTypeChange={basketController.setReceiptType}
                        pickupPoint={basketController.pickupPoint}
                        onPickupPointChange={basketController.setPickupPoint}
                        notes={basketController.notes}
                        onNotesChange={basketController.setNotes}
                        onSendOrder={handleSendOrder}
                        sendingOrder={basketController.sendingOrder}
                        onToggleItem={basketController.handleToggleSelectedItem}
                        onRemoveItem={basketController.handleRemoveItem}
                        removingItems={basketController.removingBasketItems}
                        onRemoveSelectedItems={basketController.handleRemoveSelectedItems}
                        removingSelectedItems={basketController.removingSelectedBasketItems}
                        onChangeQuantity={handleUpdateQty}
                        requestedPriceValues={basketController.basketLineRequestedPrices}
                        onRequestedPriceValueChange={basketController.setBasketLineRequestedPriceValue}
                        onRequestPrice={basketController.handleRequestBasketLinePrice}
                        submittingRequestedPrices={basketController.submittingBasketLineRequestedPrices}
                        collapsible
                        collapsed={!resultsController.sidebarVisible}
                        onToggleCollapse={resultsController.handleToggleSidebarVisibility}
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

            <Modal
                isOpen={orderConfirmOpen}
                onClose={() => setOrderConfirmOpen(false)}
                className="m-4 max-w-lg"
            >
                <div className="p-6 sm:p-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Επιβεβαίωση αποστολής παραγγελίας
                    </h3>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                        {pendingPriceRequestCount > 0
                            ? `Υπάρχουν ${pendingPriceRequestCount} εκκρεμή αιτήματα τιμών για αυτόν τον πελάτη στα «Αιτήματα τιμών». Θέλετε σίγουρα να υποβάλετε την παραγγελία;`
                            : "Δεν ήταν δυνατός ο έλεγχος των εκκρεμών αιτημάτων τιμών. Θέλετε σίγουρα να συνεχίσετε με την αποστολή της παραγγελίας;"}
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setOrderConfirmOpen(false)}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            Ακύρωση
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleConfirmSendOrder()}
                            disabled={basketController.sendingOrder}
                            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Ναι, αποστολή
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
