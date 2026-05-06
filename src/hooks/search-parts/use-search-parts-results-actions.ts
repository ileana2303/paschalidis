"use client";

import { isAxiosError } from "axios";
import { useCallback, useEffect } from "react";
import type { ExternalLoginUserAccount } from "@/lib/auth/types";
import type { ICustomerInfo, IItem } from "@/lib/interface";
import {
    useAddItemToEndoBasketMutation,
    useFetchEndoListsMutation,
    useRequestStockQuantityMutation,
} from "@/hooks/queries/useApiMutations";
import type { SearchPartsResultsState } from "@/hooks/search-parts/use-search-parts-results-state";
import {
    getEndoQtyKey,
    mapEndoRequestedRows,
} from "@/hooks/search-parts/search-parts-endo-utils";

interface UseSearchPartsResultsActionsParams {
    customer: ICustomerInfo | null;
    user: ExternalLoginUserAccount | null;
    onRequireCustomerSelection: () => void;
    state: SearchPartsResultsState;
}

export function useSearchPartsResultsActions({
    customer,
    user,
    onRequireCustomerSelection,
    state,
}: UseSearchPartsResultsActionsParams) {
    const { mutateAsync: requestStockQuantity } = useRequestStockQuantityMutation();
    const { mutateAsync: addItemToEndoBasket } = useAddItemToEndoBasketMutation();
    const { mutateAsync: fetchEndoLists } = useFetchEndoListsMutation();
    const {
        addingToEndoBasket,
        currentBranchCode,
        getEndoBranchOptions,
        getEndoRequestedQty,
        getStoreOrderQuantity,
        hasValidBranch,
        isEndoMode,
        setAddingToEndoBasket,
        setEndoBasketError,
        setEndoBasketItems,
        setEndoBasketSuccess,
        setEndoRequestedQty,
        setEndoSummaryLoading,
        setExpandedItems,
        setIsEndoMode,
        setStockRequestErrors,
        setStockRequestStatuses,
        setSubmittingStockRequests,
    } = state;

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
    }, [
        currentBranchCode,
        fetchEndoLists,
        hasValidBranch,
        setEndoBasketError,
        setEndoBasketItems,
        setEndoSummaryLoading,
    ]);

    useEffect(() => {
        if (!isEndoMode || !customer?.TRDR) {
            return;
        }

        void loadRequestedEndoLines();
    }, [customer?.TRDR, isEndoMode, loadRequestedEndoLines]);

    const handleToggleEndoMode = useCallback(() => {
        if (!customer) {
            onRequireCustomerSelection();
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
    }, [
        customer,
        hasValidBranch,
        onRequireCustomerSelection,
        setEndoBasketError,
        setEndoBasketSuccess,
        setExpandedItems,
        setIsEndoMode,
    ]);

    const handleAddToEndoBasket = useCallback(async (item: IItem, sourceBranchCode: string) => {
        const normalizedRequestFromBranch = Number(sourceBranchCode);
        const normalizedRequesterBranch = Number(currentBranchCode);
        const requestedQty = getEndoRequestedQty(item.MTRL, sourceBranchCode);
        const sourceBranchStock = getEndoBranchOptions(item).find(
            (branch) => branch.code === sourceBranchCode
        )?.stock ?? 0;

        if (!Number.isFinite(normalizedRequesterBranch) || normalizedRequesterBranch <= 0) {
            setEndoBasketError("Δεν βρέθηκε ενεργό κατάστημα παραλαβής");
            return;
        }

        if (!Number.isFinite(normalizedRequestFromBranch) || normalizedRequestFromBranch <= 0) {
            setEndoBasketError("Μη έγκυρο κατάστημα αποστολής");
            return;
        }

        if (normalizedRequesterBranch === normalizedRequestFromBranch) {
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
                BRANCH: normalizedRequestFromBranch,
                TO_BRANCH: normalizedRequesterBranch,
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
    }, [
        addItemToEndoBasket,
        currentBranchCode,
        getEndoBranchOptions,
        getEndoRequestedQty,
        loadRequestedEndoLines,
        setAddingToEndoBasket,
        setEndoBasketError,
        setEndoBasketSuccess,
        setEndoRequestedQty,
        user?.uid,
    ]);

    const isAddingToEndoBasket = useCallback((
        mtrl: string | number,
        sourceBranchCode: string
    ) => {
        return addingToEndoBasket.has(getEndoQtyKey(mtrl, sourceBranchCode));
    }, [addingToEndoBasket]);

    const handleSubmitStockRequest = useCallback(async (item: IItem) => {
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
    }, [
        currentBranchCode,
        getStoreOrderQuantity,
        hasValidBranch,
        requestStockQuantity,
        setStockRequestErrors,
        setStockRequestStatuses,
        setSubmittingStockRequests,
    ]);

    return {
        handleToggleEndoMode,
        handleAddToEndoBasket,
        isAddingToEndoBasket,
        handleSubmitStockRequest,
    };
}
