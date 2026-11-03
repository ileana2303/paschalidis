"use client";

import { useCallback, useRef, useState } from "react";
import type { ICustomerInfo, IItem } from "@/lib/interface";
import { useModal } from "@/hooks/useModal";
import {
    useSearchCustomersMutation,
    useSearchItemsByTrdrMutation,
    useSearchItemsMutation,
} from "@/hooks/queries/useApiMutations";

interface UseSearchPartsPageControllerParams {
    customer: ICustomerInfo | null;
    search: string;
    setSearch: (value: string) => void;
    setItems: (items: IItem[]) => void;
    setHasSearched: (value: boolean) => void;
    setSearchStateTrdr: (trdr: string | null) => void;
}

export function useSearchPartsPageController({
    customer,
    search,
    setSearch,
    setItems,
    setHasSearched,
    setSearchStateTrdr,
}: UseSearchPartsPageControllerParams) {
    const [modalSearch, setModalSearch] = useState("");
    const [customerModalSearch, setCustomerModalSearch] = useState("");
    const [customerResults, setCustomerResults] = useState<ICustomerInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [customerModalLoading, setCustomerModalLoading] = useState(false);
    const [customerModalHasSearched, setCustomerModalHasSearched] = useState(false);
    const [customerModalError, setCustomerModalError] = useState("");
    const searchRequestIdRef = useRef(0);

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

    const { mutateAsync: searchItems } = useSearchItemsMutation();
    const { mutateAsync: searchItemsByTrdr } = useSearchItemsByTrdrMutation();
    const { mutateAsync: searchCustomers } = useSearchCustomersMutation();

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

    const runSearch = useCallback(async (
        value: string,
        selectedTrdr: string | null = String(customer?.TRDR ?? "").trim() || null
    ) => {
        const trimmedSearch = value.trim();

        if (!trimmedSearch) return false;

        const requestId = ++searchRequestIdRef.current;
        setItems([]);
        setSearchStateTrdr(selectedTrdr);
        setHasSearched(true);
        setLoading(true);

        try {
            const data = selectedTrdr
                ? await searchItemsByTrdr({
                    search: trimmedSearch,
                    trdr: selectedTrdr,
                })
                : await searchItems(trimmedSearch);

            if (searchRequestIdRef.current !== requestId) {
                return true;
            }

            setSearch(trimmedSearch);

            if (data.success) {
                setItems(data.rows);
            } else {
                setItems([]);
            }

            return true;
        } catch (error) {
            if (searchRequestIdRef.current === requestId) {
                setItems([]);
                console.error(error);
            }
            return false;
        } finally {
            if (searchRequestIdRef.current === requestId) {
                setLoading(false);
            }
        }
    }, [
        customer,
        searchItems,
        searchItemsByTrdr,
        setHasSearched,
        setItems,
        setSearch,
        setSearchStateTrdr,
    ]);

    const invalidateSearchResults = useCallback(() => {
        searchRequestIdRef.current += 1;
        setItems([]);
        setLoading(false);
    }, [setItems]);

    const handleSearch = useCallback(async () => {
        await runSearch(search);
    }, [runSearch, search]);

    const handleModalSearch = useCallback(async () => {
        const hasRunSearch = await runSearch(modalSearch);

        if (hasRunSearch) {
            closeSearchModal();
        }
    }, [closeSearchModal, modalSearch, runSearch]);

    const runCustomerSearch = useCallback(async (value: string) => {
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
    }, [searchCustomers]);

    const handleCustomerModalSearch = useCallback(async () => {
        await runCustomerSearch(customerModalSearch);
    }, [customerModalSearch, runCustomerSearch]);

    return {
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
        invalidateSearchResults,
        runSearch,
        handleSearch,
        handleModalSearch,
        handleCustomerModalSearch,
    };
}
