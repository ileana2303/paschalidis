"use client";

import { useMutation } from "@tanstack/react-query";
import type {
    BasketInRoutePayload,
    BasketRequestPriceRoutePayload,
    StockRequestListRoutePayload,
    StockRequestMassDeleteRoutePayload,
    StockRequestRoutePayload,
    StockRequestUpdateRoutePayload,
} from "@/app/lib/interface";
import {
    addItemToBasket,
    fetchBasketItems,
    requestDiscount,
    submitBasketOrder,
} from "@/app/lib/api/basket";
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

export const useAddItemToBasketMutation = () =>
    useMutation({
        mutationFn: (payload: BasketInRoutePayload) => addItemToBasket(payload),
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

export const useFetchCatalogProductsMutation = () =>
    useMutation({
        mutationFn: ({ page, pageSize }: { page: number; pageSize: number }) =>
            fetchCatalogProducts(page, pageSize),
    });

