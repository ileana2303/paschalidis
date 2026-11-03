"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import PriceTierCell, {
    type PriceTierCellStatus,
} from "@/components/price-tiers/price-tier-cell";
import { useSavePriceTierMutation } from "@/hooks/queries/usePriceTierQueries";
import { priceTierCellKey, type PriceTierGrid as PriceTierGridData } from "@/lib/price-tiers/grid";
import type { PriceTierCell as PriceTierCellData } from "@/lib/price-tiers/types";

const FLASH_DURATION_MS = 1800;

export type PriceTierGridOrientation = "items-as-rows" | "customers-as-rows";

export const PRICE_TIER_AXIS_LABELS = {
    items: "Ομάδες ειδών",
    customers: "Ομάδες πελατών",
} as const;

interface PriceTierGridProps {
    grid: PriceTierGridData;
    orientation: PriceTierGridOrientation;
}

export default function PriceTierGrid({ grid, orientation }: PriceTierGridProps) {
    const { mutateAsync: saveTier } = useSavePriceTierMutation();
    // autoId → tier currently being saved for that cell.
    const [pending, setPending] = useState<Record<string, string>>({});
    const [flash, setFlash] = useState<Record<string, "saved" | "failed">>({});
    const flashTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

    useEffect(() => {
        const timers = flashTimers.current;
        return () => timers.forEach((timer) => clearTimeout(timer));
    }, []);

    const showFlash = useCallback((autoId: string, kind: "saved" | "failed") => {
        const timers = flashTimers.current;
        clearTimeout(timers.get(autoId));

        setFlash((current) => ({ ...current, [autoId]: kind }));
        timers.set(
            autoId,
            setTimeout(() => {
                timers.delete(autoId);
                setFlash((current) => {
                    const next = { ...current };
                    delete next[autoId];
                    return next;
                });
            }, FLASH_DURATION_MS)
        );
    }, []);

    const handleChange = useCallback(
        async (cell: PriceTierCellData, tier: string) => {
            if (tier === cell.tier || pending[cell.autoId] !== undefined) return;

            setPending((current) => ({ ...current, [cell.autoId]: tier }));

            try {
                await saveTier({ autoId: cell.autoId, tier });
                showFlash(cell.autoId, "saved");
            } catch (error) {
                // The cell falls back to its saved tier once `pending` clears.
                showFlash(cell.autoId, "failed");
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Η αποθήκευση της βαθμίδας απέτυχε."
                );
            } finally {
                setPending((current) => {
                    const next = { ...current };
                    delete next[cell.autoId];
                    return next;
                });
            }
        },
        [pending, saveTier, showFlash]
    );

    const getStatus = (autoId: string): PriceTierCellStatus =>
        pending[autoId] !== undefined ? "saving" : flash[autoId] ?? "idle";

    // The grid is keyed MTRGROUP × TRDPGROUP; transposing only swaps which
    // axis is drawn as rows, so the cell lookup swaps its arguments too.
    const itemsAsRows = orientation === "items-as-rows";
    const rowAxis = itemsAsRows ? grid.rows : grid.columns;
    const columnAxis = itemsAsRows ? grid.columns : grid.rows;
    const rowLabel = itemsAsRows ? PRICE_TIER_AXIS_LABELS.items : PRICE_TIER_AXIS_LABELS.customers;
    const columnLabel = itemsAsRows ? PRICE_TIER_AXIS_LABELS.customers : PRICE_TIER_AXIS_LABELS.items;
    const rowsAreCustomers = !itemsAsRows;
    const columnsAreCustomers = itemsAsRows;
    const getCell = (rowId: string, columnId: string) =>
        grid.cells[
            itemsAsRows ? priceTierCellKey(rowId, columnId) : priceTierCellKey(columnId, rowId)
        ];

    return (
        <div className="max-h-[70dvh] overflow-x-hidden overflow-y-auto">
            <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
                <colgroup>
                    <col className="w-[30%] sm:w-[26%] lg:w-[22%] 2xl:w-[20%]" />
                    {columnAxis.map((column) => <col key={column.id} />)}
                </colgroup>
                <thead>
                    <tr>
                        <th
                            scope="col"
                            rowSpan={2}
                            className="sticky top-0 z-30 border-b border-r border-gray-200 bg-gray-100 px-2 py-2 text-left align-bottom sm:px-3 dark:border-gray-800 dark:bg-gray-900"
                        >
                            <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Γραμμές
                            </span>
                            <span className="block whitespace-nowrap text-xs font-semibold text-gray-800 dark:text-gray-100">
                                {rowLabel} ↓
                            </span>
                        </th>
                        <th
                            scope="colgroup"
                            colSpan={columnAxis.length}
                            className="sticky top-0 z-20 h-9 border-b border-gray-200 bg-gray-100 px-2 text-left dark:border-gray-800 dark:bg-gray-900"
                        >
                            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Στήλες
                            </span>{" "}
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                                {columnLabel} →
                            </span>
                        </th>
                    </tr>
                    <tr>
                        {columnAxis.map((column) => (
                            <th
                                key={column.id}
                                scope="col"
                                title={column.name ? `${column.code} — ${column.name}` : column.code}
                                className="sticky top-9 z-20 overflow-hidden border-b border-gray-200 bg-gray-50 px-1 py-2 text-center text-xs font-semibold text-gray-700 sm:px-1.5 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                            >
                                <span className="block truncate uppercase tracking-wide">
                                    {column.code}
                                </span>
                                {columnsAreCustomers && column.name && (
                                    <span className="mt-0.5 block break-words text-[10px] font-medium leading-3 text-gray-500 dark:text-gray-400">
                                        {column.name}
                                    </span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rowAxis.map((row) => (
                        <tr key={row.id}>
                            <th
                                scope="row"
                                title={row.name ? `${row.code} — ${row.name}` : row.code}
                                className="border-b border-r border-gray-100 bg-white px-2 py-2 text-left font-semibold text-gray-900 sm:px-3 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                            >
                                <span className="block truncate">{row.code}</span>
                                {rowsAreCustomers && row.name && (
                                    <span className="mt-0.5 block break-words text-[11px] font-medium leading-4 text-gray-500 dark:text-gray-400">
                                        {row.name}
                                    </span>
                                )}
                            </th>
                            {columnAxis.map((column) => {
                                const cell = getCell(row.id, column.id);

                                return (
                                    <td
                                        key={column.id}
                                        className="overflow-hidden border-b border-gray-100 px-1 py-1.5 text-center align-top sm:px-1.5 dark:border-gray-800"
                                    >
                                        {cell ? (
                                            <PriceTierCell
                                                cell={cell}
                                                value={pending[cell.autoId] ?? cell.tier}
                                                status={getStatus(cell.autoId)}
                                                onChange={(tier) => void handleChange(cell, tier)}
                                            />
                                        ) : (
                                            <span className="flex h-9 items-center justify-center text-gray-400">
                                                —
                                            </span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
