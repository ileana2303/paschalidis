"use client";

import { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import CustomerGroupForm from "@/components/price-tiers/customer-group-form";
import CustomerGroupPicker from "@/components/price-tiers/customer-group-picker";
import PriceTierGrid, {
    PRICE_TIER_AXIS_LABELS,
    type PriceTierGridOrientation,
} from "@/components/price-tiers/price-tier-grid";
import { getPriceTierTone } from "@/components/price-tiers/price-tier-visuals";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import {
    usePriceTierGridQuery,
    usePriceTierGroupsQuery,
} from "@/hooks/queries/usePriceTierQueries";
import { Loader2, RefreshCw, Table2 } from "@/lib/icons/lucide";
import { buildPriceTierGrid, PRICE_TIER_OPTIONS } from "@/lib/price-tiers/grid";

const ORIENTATION_OPTIONS: ReadonlyArray<{
    value: PriceTierGridOrientation;
    label: string;
}> = [
    { value: "items-as-rows", label: PRICE_TIER_AXIS_LABELS.items },
    { value: "customers-as-rows", label: PRICE_TIER_AXIS_LABELS.customers },
];

export default function PriceTiersClient() {
    const { data, error, isError, isLoading, isFetching, refetch } =
        usePriceTierGridQuery();
    const groupsQuery = usePriceTierGroupsQuery();
    const [orientation, setOrientation] =
        useState<PriceTierGridOrientation>("items-as-rows");
    const [selectedCustomerGroupId, setSelectedCustomerGroupId] =
        useState<string | null>(null);

    const grid = useMemo(() => buildPriceTierGrid(data?.cells ?? []), [data?.cells]);
    const availableGroupIds = useMemo(
        () => new Set(grid.columns.map((column) => column.id)),
        [grid.columns]
    );
    const customerGroups = useMemo(
        () => (groupsQuery.data?.groups ?? []).map((group) => {
            const gridGroup = grid.columns.find((column) => column.id === group.trdpGroup);

            return {
                ...group,
                code: group.code || gridGroup?.code || group.trdpGroup,
                name: group.name || gridGroup?.name || "",
            };
        }),
        [grid.columns, groupsQuery.data?.groups]
    );
    const selectedCustomerGroup = customerGroups.find(
        (group) => group.trdpGroup === selectedCustomerGroupId
    );
    const activeCustomerGroupId = selectedCustomerGroup
        ? selectedCustomerGroupId
        : null;

    const handleSelectCustomerGroup = (groupId: string | null) => {
        setSelectedCustomerGroupId(groupId);
        if (groupId) setOrientation("items-as-rows");
    };
    const isRefreshing = isFetching || groupsQuery.isFetching;

    const itemsCount = `${grid.rows.length} ομάδες ειδών`;
    const customersCount = `${grid.columns.length} ομάδες πελατών`;
    const count = data
        ? activeCustomerGroupId
            ? `${itemsCount} · 1 ομάδα πελατών`
            : orientation === "items-as-rows"
                ? `${itemsCount} × ${customersCount}`
                : `${customersCount} × ${itemsCount}`
        : undefined;

    return (
        <div>
            <PageBreadcrumb pageTitle="Βαθμίδες Τιμών" />

            <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_22rem]">
                <DataTable className="min-w-0">
                    <DataTableHeader
                        title="Πλέγμα βαθμίδων"
                        description={selectedCustomerGroup
                            ? `Επεξεργασία της ομάδας ${selectedCustomerGroup.code}${selectedCustomerGroup.name ? ` — ${selectedCustomerGroup.name}` : ""}. Κάθε αλλαγή αποθηκεύεται αμέσως.`
                            : "0 = χονδρική (προεπιλογή) · 1–5 = κλιμακωτές τιμές · 99 = λιανική. Κάθε αλλαγή αποθηκεύεται αμέσως."}
                        count={count}
                        action={(
                            <div className="flex flex-wrap items-center gap-3">
                                {!activeCustomerGroupId && (
                                    <div className="flex items-center gap-2">
                                        <span
                                            id="price-tier-orientation-label"
                                            className="text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            Γραμμές:
                                        </span>
                                        <div
                                            role="radiogroup"
                                            aria-labelledby="price-tier-orientation-label"
                                            className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-900"
                                        >
                                            {ORIENTATION_OPTIONS.map((option) => {
                                                const selected = orientation === option.value;

                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={selected}
                                                        onClick={() => setOrientation(option.value)}
                                                        className={[
                                                            "h-8 rounded-md px-3 text-sm font-medium transition",
                                                            selected
                                                                ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                                                                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
                                                        ].join(" ")}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        void refetch();
                                        void groupsQuery.refetch();
                                    }}
                                    disabled={isRefreshing}
                                    className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:opacity-60 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
                                >
                                    <RefreshCw
                                        className={["size-4", isRefreshing ? "animate-spin" : ""].join(" ")}
                                        aria-hidden="true"
                                    />
                                    Ανανέωση
                                </button>
                            </div>
                        )}
                    />

                    <CustomerGroupPicker
                        groups={customerGroups}
                        availableGroupIds={availableGroupIds}
                        selectedGroupId={activeCustomerGroupId}
                        isLoading={groupsQuery.isLoading}
                        isFetching={groupsQuery.isFetching}
                        error={groupsQuery.isError
                            ? groupsQuery.error instanceof Error
                                ? groupsQuery.error
                                : new Error("Αποτυχία φόρτωσης των ομάδων πελατών.")
                            : null}
                        onSelect={handleSelectCustomerGroup}
                        onRetry={() => void groupsQuery.refetch()}
                    />

                    <div
                        className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 px-3 py-2.5 sm:px-5 dark:border-gray-800"
                        aria-label="Χρωματική κλίμακα βαθμίδων τιμών"
                    >
                        <span className="mr-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Κλίμακα:
                        </span>
                        {PRICE_TIER_OPTIONS.map((option) => (
                            <span
                                key={option.value}
                                className={[
                                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ring-inset",
                                    getPriceTierTone(option.value),
                                ].join(" ")}
                            >
                                <span className="font-bold tabular-nums">{option.value}</span>
                                <span className="hidden sm:inline">{option.label}</span>
                            </span>
                        ))}
                        <span className="ml-1 text-[11px] text-gray-500 dark:text-gray-400">
                            1 χαμηλότερη · 5 υψηλότερη
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
                            <Loader2 className="size-6 animate-spin" />
                            Φόρτωση πλέγματος…
                        </div>
                    ) : isError ? (
                        <DataTableEmptyState
                            icon={<Table2 className="size-6" aria-hidden="true" />}
                            title="Αποτυχία φόρτωσης"
                            description={
                                error instanceof Error
                                    ? error.message
                                    : "Αποτυχία φόρτωσης του πλέγματος βαθμίδων."
                            }
                        />
                    ) : grid.rows.length === 0 ? (
                        <DataTableEmptyState
                            icon={<Table2 className="size-6" aria-hidden="true" />}
                            title="Κενό πλέγμα"
                            description="Δεν υπάρχουν ομάδες ειδών ή πελατών για διαμόρφωση."
                        />
                    ) : (
                        <PriceTierGrid
                            grid={grid}
                            orientation={orientation}
                            customerGroupId={activeCustomerGroupId}
                        />
                    )}
                </DataTable>

                <div className="w-full max-w-2xl 2xl:max-w-none">
                    <CustomerGroupForm />
                </div>
            </div>
        </div>
    );
}
