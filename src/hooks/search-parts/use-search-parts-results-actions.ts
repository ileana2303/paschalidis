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
    getEndoItemKey,
    mapEndoRequestedRows,
} from "@/hooks/search-parts/search-parts-endo-utils";
import type { EndoBasketUiItem } from "@/components/endo/endo-order-summary";
import toast from "react-hot-toast";

interface UseSearchPartsResultsActionsParams {
    customer: ICustomerInfo | null;
    user: ExternalLoginUserAccount | null;
    onRequireCustomerSelection: () => void;
    state: SearchPartsResultsState;
}

function buildEndoPendingQuantities(
    items: EndoBasketUiItem[],
    currentBranchCode: string
) {
    return items.reduce<Record<string, number>>((acc, item) => {
        const fromBranch = String(item.fromBranch ?? "").trim();
        const toBranch = String(item.toBranch ?? "").trim();
        const sourceBranch =
            fromBranch === currentBranchCode ? toBranch : fromBranch || toBranch;

        if (!sourceBranch || item.mtrl <= 0 || item.qty <= 0) {
            return acc;
        }

        const key = getEndoQtyKey(item.mtrl, sourceBranch);
        acc[key] = (acc[key] ?? 0) + item.qty;
        return acc;
    }, {});
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
        setAddingToEndoBasket,
        setEndoBasketError,
        setEndoBasketSuccess,
        setEndoPendingQuantities,
        setEndoRequestedQty,
        toggleEndoSourcesForItem,
        setStockRequestErrors,
        setStockRequestStatuses,
        setSubmittingStockRequests,
    } = state;

    const refreshEndoPendingQuantities = useCallback(async () => {
        if (!hasValidBranch) {
            setEndoPendingQuantities({});
            return;
        }

        const data = await fetchEndoLists({
            branch: currentBranchCode,
            scope: "requested",
        });
        const requestedItems = mapEndoRequestedRows(
            data.requested.rows ?? [],
            currentBranchCode
        );

        setEndoPendingQuantities(
            buildEndoPendingQuantities(requestedItems, currentBranchCode)
        );
    }, [
        currentBranchCode,
        fetchEndoLists,
        hasValidBranch,
        setEndoPendingQuantities,
    ]);

    useEffect(() => {
        void refreshEndoPendingQuantities().catch(() => {
            setEndoPendingQuantities({});
        });
    }, [refreshEndoPendingQuantities, setEndoPendingQuantities]);

    const handleToggleEndoForItem = useCallback((item: IItem) => {
        if (!customer) {
            onRequireCustomerSelection();
            return;
        }

        if (!hasValidBranch) {
            setEndoBasketError("Δεν βρέθηκε ενεργό κατάστημα στο προφίλ χρήστη");
            return;
        }

        setEndoBasketSuccess("");
        setEndoBasketError("");
        toggleEndoSourcesForItem(getEndoItemKey(item));
    }, [
        customer,
        hasValidBranch,
        onRequireCustomerSelection,
        setEndoBasketError,
        setEndoBasketSuccess,
        toggleEndoSourcesForItem,
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

            setEndoPendingQuantities((prev) => ({
                ...prev,
                [requestKey]: (prev[requestKey] ?? 0) + requestedQty,
            }));
            setEndoRequestedQty(item.MTRL, sourceBranchCode, 0);
            const message =
                response.message ?? "Η γραμμή προστέθηκε στο καλάθι ενδοδιακίνησης";
            setEndoBasketSuccess(message);
            toast.success(message);
        } catch (error) {
            if (isAxiosError(error)) {
                const responseMessage =
                    typeof error.response?.data?.message === "string"
                        ? error.response.data.message
                        : undefined;
                const message = responseMessage ?? error.message;
                setEndoBasketError(message);
                toast.error(message);
            } else {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία προσθήκης στο καλάθι ενδοδιακίνησης";
                setEndoBasketError(message);
                toast.error(message);
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
        setAddingToEndoBasket,
        setEndoBasketError,
        setEndoBasketSuccess,
        setEndoPendingQuantities,
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
            toast.success("Το αίτημα αποθέματος καταχωρήθηκε.");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Αποτυχία υποβολής αιτήματος αποθέματος.";
            setStockRequestErrors((prev) => ({
                ...prev,
                [mtrlKey]: message,
            }));
            toast.error(message);
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
        handleToggleEndoForItem,
        handleAddToEndoBasket,
        isAddingToEndoBasket,
        handleSubmitStockRequest,
    };
}
