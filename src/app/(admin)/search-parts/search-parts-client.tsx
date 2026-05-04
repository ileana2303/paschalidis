"use client";

import PageBreadcrumb from "@/components/template components/common/PageBreadCrumb";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSearchPartsStore } from "@/stores/searchPartsStore";
import { useCustomerStore } from "@/stores/customerStore";
import { useAuthStore } from "@/stores/authStore";
import type { ICustomerInfo } from "@/lib/interface";
import CustomerInfoContainer from "@/components/customer/customer-info-container";
import PartsSearchModal from "@/components/search/parts-search-modal";
import CustomerSearchModal from "@/components/search/customer-search-modal";
import PartsResultsContainer from "@/components/parts/parts-results-container";
import PartsSummarySidebar from "@/components/parts/parts-summary-sidebar";
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
    });

    const resetScopedSearchState = resultsController.resetScopedResultsState;

    const handleSearch = async () => {
        resultsController.prepareForSearch();
        await runPageSearch();
    };

    const handleModalSearch = async () => {
        resultsController.prepareForSearch();
        await runPageModalSearch();
    };

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
        resetScopedSearchState({ resetScroll: true });
    }, [
        clearCustomer,
        clearSearchPartsState,
        customer?.TRDR,
        hasMounted,
        resetScopedSearchState,
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
        resetScopedSearchState();
        setSearchStateTrdr(customerTrdr);
    }, [
        clearSearchPartsState,
        customer?.TRDR,
        resetScopedSearchState,
        searchStateTrdr,
        setSearchStateTrdr,
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
                <PartsResultsContainer
                    layout={{
                        hasCustomer: customer != null,
                        sidebarVisible: resultsController.sidebarVisible,
                        resultsContainerRef,
                        onResultsScroll: resultsController.handleResultsScroll,
                        hasScrolledResults: resultsController.hasScrolledResults,
                        isResultsScrollable: resultsController.isResultsScrollable,
                        onOpenSearchModal: handleOpenSearchModal,
                    }}
                    search={{
                        inputRef: searchInputRef,
                        value: search,
                        onChange: setSearch,
                        onSearch: handleSearch,
                        loading,
                        hasSearched,
                    }}
                    results={{
                        items,
                        isEndoMode: resultsController.isEndoMode,
                        onToggleEndoMode: resultsController.handleToggleEndoMode,
                        onToggleAllExpanded: resultsController.toggleAllExpanded,
                        areAllResultsExpanded: resultsController.areAllResultsExpanded,
                        expandedItems: resultsController.expandedItems,
                        getExpandedItemKey: resultsController.getExpandedItemKey,
                        toggleExpanded: resultsController.toggleExpanded,
                    }}
                    endo={{
                        getBranchOptions: resultsController.getEndoBranchOptions,
                        endoBasketItems: resultsController.endoBasketItems,
                        getEndoRequestedQty: resultsController.getEndoRequestedQty,
                        setEndoRequestedQty: resultsController.setEndoRequestedQty,
                        onAddToEndoBasket: resultsController.handleAddToEndoBasket,
                        isAddingToEndoBasket: resultsController.isAddingToEndoBasket,
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
                        discountPrices: basketController.discountPrices,
                        submittingDiscount: basketController.submittingDiscount,
                        onDiscountValueChange: basketController.setDiscountValue,
                        onAddToBasket: basketController.handleAddToBasket,
                        onRequestDiscount: basketController.handleRequestDiscount,
                        onStoreOrderQuantityChange: resultsController.setStoreOrderQuantity,
                        onSubmitStockRequest: resultsController.handleSubmitStockRequest,
                        formatPrice: basketController.formatPrice,
                    }}
                />

                <PartsSummarySidebar
                    customer={customer}
                    isEndoMode={resultsController.isEndoMode}
                    currentBranchCode={resultsController.currentBranchCode}
                    currentBranchName={resultsController.currentBranchName}
                    endoBasketItems={resultsController.endoBasketItems}
                    endoSummaryLoading={resultsController.endoSummaryLoading}
                    endoBasketError={resultsController.endoBasketError}
                    endoBasketSuccess={resultsController.endoBasketSuccess}
                    sidebarVisible={resultsController.sidebarVisible}
                    onToggleSidebar={resultsController.handleToggleSidebarVisibility}
                    basket={basketController.basket}
                    basketLoading={basketController.basketLoading}
                    basketError={basketController.basketError}
                    onRefreshBasket={basketController.handleRefreshBasket}
                    selectedItems={basketController.selectedItems}
                    selectedCount={basketController.selectedItemsList.length}
                    selectedTotal={basketController.selectedTotal}
                    receiptType={basketController.receiptType}
                    onReceiptTypeChange={basketController.setReceiptType}
                    pickupPoint={basketController.pickupPoint}
                    onPickupPointChange={basketController.setPickupPoint}
                    notes={basketController.notes}
                    onNotesChange={basketController.setNotes}
                    onSendOrder={basketController.handleSendOrder}
                    sendingOrder={basketController.sendingOrder}
                    onToggleSelectedItem={basketController.handleToggleSelectedItem}
                    onRemoveItem={basketController.handleRemoveItem}
                    removingBasketItems={basketController.removingBasketItems}
                    onRemoveSelectedItems={basketController.handleRemoveSelectedItems}
                    removingSelectedBasketItems={basketController.removingSelectedBasketItems}
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
