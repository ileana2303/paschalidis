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

    const loadRequestedEndoLines = useCallback(async () => {
        if (!state.hasValidBranch) {
            state.setEndoBasketItems([]);
            state.setEndoBasketError("Δεν βρέθηκε ενεργό κατάστημα στο προφίλ χρήστη");
            state.setEndoSummaryLoading(false);
            return;
        }

        state.setEndoSummaryLoading(true);

        try {
            const data = await fetchEndoLists({
                branch: state.currentBranchCode,
                scope: "requested",
            });
            state.setEndoBasketItems(
                mapEndoRequestedRows(data.requested.rows ?? [], state.currentBranchCode)
            );

            if (String(data.message ?? "").trim()) {
                state.setEndoBasketError(String(data.message).trim());
            } else {
                state.setEndoBasketError("");
            }
        } catch (error) {
            state.setEndoBasketItems([]);
            state.setEndoBasketError(
                error instanceof Error
                    ? error.message
                    : "Αποτυχία φόρτωσης ENDO_LIST_ESO"
            );
        } finally {
            state.setEndoSummaryLoading(false);
        }
    }, [fetchEndoLists, state]);

    useEffect(() => {
        if (!state.isEndoMode || !customer?.TRDR) {
            return;
        }

        void loadRequestedEndoLines();
    }, [customer?.TRDR, loadRequestedEndoLines, state.isEndoMode]);

    const handleToggleEndoMode = useCallback(() => {
        if (!customer) {
            onRequireCustomerSelection();
            return;
        }

        if (!state.hasValidBranch) {
            state.setEndoBasketError("Δεν βρέθηκε ενεργό κατάστημα στο προφίλ χρήστη");
            return;
        }

        state.setExpandedItems(new Set());
        state.setEndoBasketSuccess("");
        state.setEndoBasketError("");
        state.setIsEndoMode((prev) => !prev);
    }, [customer, onRequireCustomerSelection, state]);

    const handleAddToEndoBasket = useCallback(async (item: IItem, sourceBranchCode: string) => {
        const normalizedDestinationBranch = Number(state.currentBranchCode);
        const normalizedSourceBranch = Number(sourceBranchCode);
        const requestedQty = state.getEndoRequestedQty(item.MTRL, sourceBranchCode);
        const sourceBranchStock = state.getEndoBranchOptions(item).find(
            (branch) => branch.code === sourceBranchCode
        )?.stock ?? 0;

        if (!Number.isFinite(normalizedDestinationBranch) || normalizedDestinationBranch <= 0) {
            state.setEndoBasketError("Δεν βρέθηκε ενεργό κατάστημα χρήστη");
            return;
        }

        if (!Number.isFinite(normalizedSourceBranch) || normalizedSourceBranch <= 0) {
            state.setEndoBasketError("Μη έγκυρο κατάστημα αποστολής");
            return;
        }

        if (normalizedDestinationBranch === normalizedSourceBranch) {
            state.setEndoBasketError("Η ενδοδιακίνηση πρέπει να αφορά διαφορετικά καταστήματα");
            return;
        }

        if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
            state.setEndoBasketError("Η ποσότητα πρέπει να είναι μεγαλύτερη από 0");
            return;
        }

        if (requestedQty > sourceBranchStock) {
            state.setEndoBasketError("Η ζητούμενη ποσότητα υπερβαίνει το διαθέσιμο απόθεμα");
            return;
        }

        const requestKey = getEndoQtyKey(item.MTRL, sourceBranchCode);
        state.setAddingToEndoBasket((prev) => new Set(prev).add(requestKey));
        state.setEndoBasketError("");
        state.setEndoBasketSuccess("");

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

            state.setEndoRequestedQty(item.MTRL, sourceBranchCode, 0);
            await loadRequestedEndoLines();
            state.setEndoBasketSuccess(response.message ?? "Η γραμμή προστέθηκε στο καλάθι ενδοδιακίνησης");
        } catch (error) {
            if (isAxiosError(error)) {
                const responseMessage =
                    typeof error.response?.data?.message === "string"
                        ? error.response.data.message
                        : undefined;
                state.setEndoBasketError(responseMessage ?? error.message);
            } else {
                state.setEndoBasketError(
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία προσθήκης στο καλάθι ενδοδιακίνησης"
                );
            }
        } finally {
            state.setAddingToEndoBasket((prev) => {
                const next = new Set(prev);
                next.delete(requestKey);
                return next;
            });
        }
    }, [addItemToEndoBasket, loadRequestedEndoLines, state, user?.uid]);

    const isAddingToEndoBasket = useCallback((
        mtrl: string | number,
        sourceBranchCode: string
    ) => {
        return state.addingToEndoBasket.has(getEndoQtyKey(mtrl, sourceBranchCode));
    }, [state.addingToEndoBasket]);

    const handleSubmitStockRequest = useCallback(async (item: IItem) => {
        const mtrlKey = String(item.MTRL);
        const qty = state.getStoreOrderQuantity(mtrlKey);

        if (!state.hasValidBranch) {
            state.setStockRequestErrors((prev) => ({
                ...prev,
                [mtrlKey]: "Δεν βρέθηκε ενεργό κατάστημα χρήστη",
            }));
            return;
        }

        if (qty <= 0) {
            state.setStockRequestErrors((prev) => ({
                ...prev,
                [mtrlKey]: "Type a quantity greater than 0",
            }));
            return;
        }

        state.setSubmittingStockRequests((prev) => new Set(prev).add(mtrlKey));
        state.setStockRequestErrors((prev) => ({ ...prev, [mtrlKey]: "" }));

        try {
            await requestStockQuantity({
                mtrl: Number(item.MTRL),
                qty,
                branch: state.currentBranchCode,
            });

            state.setStockRequestStatuses((prev) => ({
                ...prev,
                [mtrlKey]: "pending",
            }));
        } catch (error) {
            state.setStockRequestErrors((prev) => ({
                ...prev,
                [mtrlKey]:
                    error instanceof Error
                        ? error.message
                        : "Failed to submit stock request",
            }));
        } finally {
            state.setSubmittingStockRequests((prev) => {
                const next = new Set(prev);
                next.delete(mtrlKey);
                return next;
            });
        }
    }, [requestStockQuantity, state]);

    return {
        handleToggleEndoMode,
        handleAddToEndoBasket,
        isAddingToEndoBasket,
        handleSubmitStockRequest,
    };
}
