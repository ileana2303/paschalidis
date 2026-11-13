"use client";

import { isAxiosError } from "axios";
import { useCallback, useEffect } from "react";
import type { AuthUser } from "@/lib/auth/types";
import type { IItem } from "@/lib/interface";
import {
    useAddItemToEndoBasketMutation,
    useFetchEndoListsMutation,
    useRequestStockQuantityMutation,
    useSubmitEndoPriorityOrderMutation,
} from "@/hooks/queries/useApiMutations";
import type { SearchPartsResultsState } from "@/hooks/search-parts/use-search-parts-results-state";
import {
    getEndoQtyKey,
    mapEndoRequestedRows,
} from "@/hooks/search-parts/search-parts-endo-utils";
import type { EndoBasketUiItem } from "@/components/endo/endo-order-summary";
import toast from "react-hot-toast";

interface UseSearchPartsResultsActionsParams {
    user: AuthUser | null;
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
    user,
    state,
}: UseSearchPartsResultsActionsParams) {
    const { mutateAsync: requestStockQuantity } = useRequestStockQuantityMutation();
    const { mutateAsync: addItemToEndoBasket } = useAddItemToEndoBasketMutation();
    const { mutateAsync: submitEndoPriorityOrder } = useSubmitEndoPriorityOrderMutation();
    const { mutateAsync: fetchEndoLists } = useFetchEndoListsMutation();
    const {
        addingToEndoBasket,
        submittingEndoPriority,
        currentBranchCode,
        getEndoBranchOptions,
        getEndoRequestedQty,
        getStoreOrderQuantity,
        hasValidBranch,
        setAddingToEndoBasket,
        setSubmittingEndoPriority,
        setEndoPendingQuantities,
        setEndoRequestedQty,
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

    const handleAddToEndoBasket = useCallback(async (item: IItem, sourceBranchCode: string) => {
        const normalizedRequestFromBranch = Number(sourceBranchCode);
        const normalizedRequesterBranch = Number(currentBranchCode);
        const requestedQty = getEndoRequestedQty(item.MTRL, sourceBranchCode);
        const sourceBranchStock = getEndoBranchOptions(item).find(
            (branch) => branch.code === sourceBranchCode
        )?.stock ?? 0;

        if (!Number.isFinite(normalizedRequesterBranch) || normalizedRequesterBranch <= 0) {
            toast.error("Δεν βρέθηκε ενεργό κατάστημα παραλαβής");
            return;
        }

        if (!Number.isFinite(normalizedRequestFromBranch) || normalizedRequestFromBranch <= 0) {
            toast.error("Μη έγκυρο κατάστημα αποστολής");
            return;
        }

        if (normalizedRequesterBranch === normalizedRequestFromBranch) {
            toast.error("Η ενδοδιακίνηση πρέπει να αφορά διαφορετικά καταστήματα");
            return;
        }

        if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
            toast.error("Η ποσότητα πρέπει να είναι μεγαλύτερη από 0");
            return;
        }

        if (requestedQty > sourceBranchStock) {
            toast.error("Η ζητούμενη ποσότητα υπερβαίνει το διαθέσιμο απόθεμα");
            return;
        }

        const requestKey = getEndoQtyKey(item.MTRL, sourceBranchCode);
        setAddingToEndoBasket((prev) => new Set(prev).add(requestKey));

        try {
            const response = await addItemToEndoBasket({
                MTRL: Number(item.MTRL),
                QTY: requestedQty,
                BRANCH: normalizedRequestFromBranch,
                TO_BRANCH: normalizedRequesterBranch,
                APPUSER_ID: user?.username,
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
            toast.success(message);
        } catch (error) {
            if (isAxiosError(error)) {
                const responseMessage =
                    typeof error.response?.data?.message === "string"
                        ? error.response.data.message
                        : undefined;
                const message = responseMessage ?? error.message;
                toast.error(message);
            } else {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Αποτυχία προσθήκης στο καλάθι ενδοδιακίνησης";
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
        setEndoPendingQuantities,
        setEndoRequestedQty,
        user,
    ]);

    const isAddingToEndoBasket = useCallback((
        mtrl: string | number,
        sourceBranchCode: string
    ) => {
        return addingToEndoBasket.has(getEndoQtyKey(mtrl, sourceBranchCode));
    }, [addingToEndoBasket]);

    const handleSubmitEndoPriority = useCallback(async (
        item: IItem,
        sourceBranchCode: string
    ) => {
        const supplyingBranch = Number(sourceBranchCode);
        const requestingBranch = Number(currentBranchCode);
        const requestedQty = getEndoRequestedQty(item.MTRL, sourceBranchCode);
        const sourceBranchStock = getEndoBranchOptions(item).find(
            (branch) => branch.code === sourceBranchCode
        )?.stock ?? 0;

        if (!Number.isFinite(requestingBranch) || requestingBranch <= 0) {
            toast.error("Δεν βρέθηκε ενεργό κατάστημα παραλαβής");
            return;
        }

        if (!Number.isFinite(supplyingBranch) || supplyingBranch <= 0) {
            toast.error("Μη έγκυρο κατάστημα αποστολής");
            return;
        }

        if (requestingBranch === supplyingBranch) {
            toast.error("Η ενδοδιακίνηση πρέπει να αφορά διαφορετικά καταστήματα");
            return;
        }

        if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
            toast.error("Η ποσότητα πρέπει να είναι μεγαλύτερη από 0");
            return;
        }

        if (requestedQty > sourceBranchStock) {
            toast.error("Η ζητούμενη ποσότητα υπερβαίνει το διαθέσιμο απόθεμα");
            return;
        }

        if (!window.confirm(
            `Να δημιουργηθεί άμεσα Priority παραστατικό για ${requestedQty} τεμ.; Δεν θα δημιουργηθεί αίτημα ενδοδιακίνησης.`
        )) {
            return;
        }

        const requestKey = getEndoQtyKey(item.MTRL, sourceBranchCode);
        setSubmittingEndoPriority((prev) => new Set(prev).add(requestKey));

        try {
            const response = await submitEndoPriorityOrder({
                appUserId: user?.username,
                items: [
                    {
                        mtrl: Number(item.MTRL),
                        qty: requestedQty,
                        supplyingBranch,
                        requestingBranch,
                    },
                ],
            });

            setEndoRequestedQty(item.MTRL, sourceBranchCode, 0);
            toast.success(
                response.message ?? "Η Priority ενδοδιακίνηση δημιουργήθηκε επιτυχώς"
            );
        } catch (error) {
            const responseMessage = isAxiosError(error)
                ? typeof error.response?.data?.message === "string"
                    ? error.response.data.message
                    : undefined
                : undefined;
            toast.error(
                responseMessage ??
                    (error instanceof Error
                        ? error.message
                        : "Αποτυχία δημιουργίας Priority ενδοδιακίνησης")
            );
        } finally {
            setSubmittingEndoPriority((prev) => {
                const next = new Set(prev);
                next.delete(requestKey);
                return next;
            });
        }
    }, [
        currentBranchCode,
        getEndoBranchOptions,
        getEndoRequestedQty,
        setEndoRequestedQty,
        setSubmittingEndoPriority,
        submitEndoPriorityOrder,
        user,
    ]);

    const isSubmittingEndoPriority = useCallback((
        mtrl: string | number,
        sourceBranchCode: string
    ) => {
        return submittingEndoPriority.has(getEndoQtyKey(mtrl, sourceBranchCode));
    }, [submittingEndoPriority]);

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
                origin: "STORE",
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
        handleAddToEndoBasket,
        isAddingToEndoBasket,
        handleSubmitEndoPriority,
        isSubmittingEndoPriority,
        handleSubmitStockRequest,
    };
}
