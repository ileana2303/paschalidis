"use client";

import { useMutation } from "@tanstack/react-query";
import type {
    BasketAllRoutePayload,
    BasketInRoutePayload,
    BasketMassDeleteRoutePayload,
    BasketRequestPriceRoutePayload,
    BasketUpdateRoutePayload,
    EndoBasketAddRoutePayload,
    EndoBasketSubmitRoutePayload,
    EndoListRoutePayload,
    EndoListUpdateQtyRoutePayload,
    StockRequestListRoutePayload,
    StockRequestMassDeleteRoutePayload,
    StockRequestRoutePayload,
    StockRequestUpdateRoutePayload,
} from "@/app/lib/interface";
import {
    addItemToBasket,
    deleteBasketItems,
    fetchAllClientBaskets,
    fetchBasketItems,
    requestDiscount,
    submitBasketOrder,
    updateBasketItemQty,
} from "@/app/lib/api/basket";
import {
    addItemToEndoBasket,
    fetchEndoLists,
    submitEndoBasketOrder,
    updateEndoListQty,
} from "@/app/lib/api/endo";
import { fetchCatalogProducts } from "@/app/lib/api/catalogs";
import { searchCustomers } from "@/app/lib/api/customers";
import {
    fetchBatchStock,
    fetchStockRequests,
    massDeleteStockRequests,
    requestStockQuantity,
    searchItems,
    searchItemsByTrdr,
    updateStockRequest,
} from "@/app/lib/api/items";

export const useSearchCustomersMutation = () =>
    useMutation({
        mutationFn: (search: string) => searchCustomers(search),
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

export const useFetchBatchStockMutation = () =>
    useMutation({
        mutationFn: (codes: string[]) => fetchBatchStock(codes),
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

export const useMassDeleteStockRequestsMutation = () =>
    useMutation({
        mutationFn: (payload: StockRequestMassDeleteRoutePayload) =>
            massDeleteStockRequests(payload),
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

export const useRequestDiscountMutation = () =>
    useMutation({
        mutationFn: (payload: BasketRequestPriceRoutePayload) =>
            requestDiscount(payload),
    });

export const useSubmitBasketOrderMutation = () =>
    useMutation({
        mutationFn: (trdr: string) => submitBasketOrder(trdr),
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

export const useFetchCatalogProductsMutation = () =>
    useMutation({
        mutationFn: ({ page, pageSize }: { page: number; pageSize: number }) =>
            fetchCatalogProducts(page, pageSize),
    });
