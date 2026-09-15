"use client";

import { useMutation } from "@tanstack/react-query";
import type {
    BasketAllRoutePayload,
    BasketInRoutePayload,
    BasketMassDeleteRoutePayload,
    BasketRequestPriceRoutePayload,
    BasketSubmitRoutePayload,
    BasketUpdateRoutePayload,
    CustomerByTrdrRoutePayload,
    EndoBasketAddRoutePayload,
    EndoBasketSubmitRoutePayload,
    EndoListRoutePayload,
    EndoListUpdateQtyRoutePayload,
    ItemEditUpdatePayload,
    SetSimilarItemPayload,
    StockFeedbackRoutePayload,
    RequestedPriceUpdateRoutePayload,
    StockRequestListRoutePayload,
    StockRequestRoutePayload,
    StockRequestSubmitRoutePayload,
    StockRequestUpdateRoutePayload,
} from "@/lib/interface";
import {
    addItemToBasket,
    deleteRequestedPriceRequests,
    deleteBasketItems,
    fetchAllClientBaskets,
    fetchBasketItems,
    fetchRequestedPriceRequests,
    requestBasketItemPrice,
    submitBasketOrder,
    updateRequestedPriceRequest,
    updateBasketItemQty,
} from "@/lib/api-client/basket";
import {
    addItemToEndoBasket,
    fetchEndoLists,
    submitEndoBasketOrder,
    updateEndoListQty,
} from "@/lib/api-client/endo";
import { fetchCustomerByTrdr, searchCustomers } from "@/lib/api-client/customers";
import {
    fetchStockFeedback,
    fetchStockRequests,
    fetchEditableItem,
    requestStockQuantity,
    searchItems,
    searchItemsByTrdr,
    setSimilarItem,
    submitAnatrofOrder,
    updateEditableItem,
    updateStockRequest,
} from "@/lib/api-client/items";

export const useSearchCustomersMutation = () =>
    useMutation({
        mutationFn: (search: string) => searchCustomers(search),
    });

export const useFetchCustomerByTrdrMutation = () =>
    useMutation({
        mutationFn: (payload: CustomerByTrdrRoutePayload) =>
            fetchCustomerByTrdr(payload),
    });

export const useSearchItemsMutation = () =>
    useMutation({
        mutationFn: (search: string) => searchItems(search),
    });

export const useSearchItemsByTrdrMutation = () =>
    useMutation({
        mutationFn: ({ search, trdr }: { search: string; trdr: string }) =>
            searchItemsByTrdr(search, trdr),
    });

export const useFetchEditableItemMutation = () =>
    useMutation({
        mutationFn: (key: string) => fetchEditableItem(key),
    });

export const useUpdateEditableItemMutation = () =>
    useMutation({
        mutationFn: (payload: ItemEditUpdatePayload) =>
            updateEditableItem(payload),
    });

export const useSetSimilarItemMutation = () =>
    useMutation({
        mutationFn: (payload: SetSimilarItemPayload) => setSimilarItem(payload),
    });

export const useFetchStockFeedbackMutation = () =>
    useMutation({
        mutationFn: (payload: StockFeedbackRoutePayload) =>
            fetchStockFeedback(payload),
    });

export const useRequestStockQuantityMutation = () =>
    useMutation({
        mutationFn: (payload: StockRequestRoutePayload) =>
            requestStockQuantity(payload),
    });

export const useFetchStockRequestsMutation = () =>
    useMutation({
        mutationFn: (payload: StockRequestListRoutePayload) =>
            fetchStockRequests(payload),
    });

export const useUpdateStockRequestMutation = () =>
    useMutation({
        mutationFn: (payload: StockRequestUpdateRoutePayload) =>
            updateStockRequest(payload),
    });

export const useSubmitAnatrofOrderMutation = () =>
    useMutation({
        mutationFn: (payload: StockRequestSubmitRoutePayload) =>
            submitAnatrofOrder(payload),
    });

export const useFetchBasketItemsMutation = () =>
    useMutation({
        mutationFn: (trdr: string) => fetchBasketItems(trdr),
    });

export const useFetchAllClientBasketsMutation = () =>
    useMutation({
        mutationFn: (payload: BasketAllRoutePayload) =>
            fetchAllClientBaskets(payload),
    });

export const useAddItemToBasketMutation = () =>
    useMutation({
        mutationFn: (payload: BasketInRoutePayload) => addItemToBasket(payload),
    });

export const useUpdateBasketItemQtyMutation = () =>
    useMutation({
        mutationFn: (payload: BasketUpdateRoutePayload) =>
            updateBasketItemQty(payload),
    });

export const useDeleteBasketItemsMutation = () =>
    useMutation({
        mutationFn: (payload: BasketMassDeleteRoutePayload) =>
            deleteBasketItems(payload),
    });

export const useRequestPriceMutation = () =>
    useMutation({
        mutationFn: (payload: BasketRequestPriceRoutePayload) =>
            requestBasketItemPrice(payload),
    });

export const useFetchRequestedPriceRequestsMutation = () =>
    useMutation({
        mutationFn: () => fetchRequestedPriceRequests(),
    });

export const useUpdateRequestedPriceRequestMutation = () =>
    useMutation({
        mutationFn: (payload: RequestedPriceUpdateRoutePayload) =>
            updateRequestedPriceRequest(payload),
    });

export const useDeleteRequestedPriceRequestsMutation = () =>
    useMutation({
        mutationFn: (payload: BasketMassDeleteRoutePayload) =>
            deleteRequestedPriceRequests(payload),
    });

export const useSubmitBasketOrderMutation = () =>
    useMutation({
        mutationFn: (payload: BasketSubmitRoutePayload) =>
            submitBasketOrder(payload),
    });

export const useAddItemToEndoBasketMutation = () =>
    useMutation({
        mutationFn: (payload: EndoBasketAddRoutePayload) =>
            addItemToEndoBasket(payload),
    });

export const useSubmitEndoBasketOrderMutation = () =>
    useMutation({
        mutationFn: (payload: EndoBasketSubmitRoutePayload) =>
            submitEndoBasketOrder(payload),
    });

export const useFetchEndoListsMutation = () =>
    useMutation({
        mutationFn: (payload: EndoListRoutePayload) => fetchEndoLists(payload),
    });

export const useUpdateEndoListQtyMutation = () =>
    useMutation({
        mutationFn: (payload: EndoListUpdateQtyRoutePayload) =>
            updateEndoListQty(payload),
    });
