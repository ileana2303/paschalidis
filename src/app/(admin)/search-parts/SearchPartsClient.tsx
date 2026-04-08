"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { type UIEvent, useCallback, useEffect, useRef, useState } from "react";
import { searchCustomers } from "@/app/lib/api/customers";
import { searchItems } from "@/app/lib/api/items";
import { Plus, Search, X } from "@/app/lib/lucide";
import { useCustomerStore } from "@/stores/customerStore";
import { ICustomerInfo, IItem } from "@/app/lib/interface";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";

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
    const [isSearchHeaderHidden, setIsSearchHeaderHidden] = useState(false);
    const [hasScrolledResults, setHasScrolledResults] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [customerModalError, setCustomerModalError] = useState("");
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
        setIsSearchHeaderHidden(false);
        closeCustomerModal();
    };

    const handleResultsScroll = (event: UIEvent<HTMLDivElement>) => {
        const scrollTop = event.currentTarget.scrollTop;
        const nextIsHidden = scrollTop > 16;

        if (scrollTop > 0) {
            setHasScrolledResults(true);
        }

        setIsSearchHeaderHidden((currentValue) =>
            currentValue === nextIsHidden ? currentValue : nextIsHidden
        );
    };

    return (
        <div>
            <PageBreadcrumb
                pageTitle="Αναζήτηση Ανταλλακτικών"
                backHref="/search-customer"
                backLabel="Επιστροφή στην αναζήτηση πελατών"
            />

            {hasMounted && customer && (
                <div className="mb-4 flex items-center gap-3 rounded-full border-2 border-brand-500 bg-brand-50 p-4 text-sm text-gray-700">
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

            <div className="relative w-full lg:w-2/3">
                <div
                    className="max-h-[calc(100dvh-14rem)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:max-h-[calc(100dvh-10.5rem)]"
                    onScroll={handleResultsScroll}
                >
                    <div
                        className={`sticky top-0 z-10 overflow-hidden bg-white transition-all duration-300 dark:bg-[#0f172a] ${isSearchHeaderHidden
                            ? "max-h-0 px-5 py-0 opacity-0 xl:px-10 xl:py-0"
                            : "max-h-80 px-5 py-7 opacity-100 xl:px-10 xl:py-12"
                            }`}
                    >
                        <div className="mx-auto w-full max-w-[820px] text-center xl:max-w-[1120px] 2xl:max-w-[1360px]">
                            <h3 className="mb-4 text-theme-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">
                                Βρείτε το ανταλλακτικό που ψάχνετε
                            </h3>

                            <div className="mt-6 flex items-center gap-2">
                                <div className="relative min-w-0 flex-1">
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
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
                                {items.map((item) => (
                                    <div
                                        key={item.ITEM_CODE}
                                        className="rounded-xl border p-4 bg-white cursor-pointer hover:bg-brand-100 hover:border-2 hover:border-brand-500 transition"
                                    >
                                        <p className="font-semibold text-gray-800">
                                            {item.ITEM_CODE2}
                                        </p>

                                        <p className="font-semibold text-gray-800">
                                            {item.MNF_DESCR}
                                        </p>

                                        <p className="text-sm text-gray-500">
                                            {item.ITEM_DESCR}
                                        </p>

                                        <p className="mt-1 text-xs">
                                            {item.STATUS_LABEL}
                                        </p>

                                        <p className="text-xs text-gray-400">
                                            {item.STANDCOST}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {hasSearched && !loading && items.length === 0 && (
                                <p className="mt-6 text-center text-sm text-gray-400">
                                    Δεν βρέθηκαν ανταλλακτικά
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {hasScrolledResults && (
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
