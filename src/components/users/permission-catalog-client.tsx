"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import PermissionCatalogFormModal from "@/components/users/permission-catalog-form-modal";
import {
    useDeletePermissionCatalogMutation,
    usePermissionCatalogQuery,
    useSavePermissionCatalogMutation,
} from "@/hooks/queries/useUserQueries";
import { useCan } from "@/hooks/usePermissions";
import { MODULE_GROUP_LABELS } from "@/lib/auth/permissions";
import {
    ChevronLeft,
    Loader2,
    Pencil,
    Plus,
    Shield,
    Trash2,
} from "@/lib/icons/lucide";
import type {
    PermissionCatalog,
    PermissionCatalogEntry,
    PermissionCatalogType,
} from "@/lib/users/types";

const CATALOG_KEYS: Record<PermissionCatalogType, keyof PermissionCatalog> = {
    MODULE: "modules",
    FEATURE: "features",
    BRANCH: "branches",
};

const TAB_LABELS: Record<PermissionCatalogType, string> = {
    MODULE: "Σελίδες",
    FEATURE: "Λειτουργίες",
    BRANCH: "Καταστήματα",
};

type FormState = { type: PermissionCatalogType; entry?: PermissionCatalogEntry };

function getParentLabel(
    catalog: PermissionCatalog,
    type: PermissionCatalogType,
    parent: string
) {
    if (type === "MODULE") return MODULE_GROUP_LABELS[parent] ?? parent;
    if (type === "FEATURE") {
        return catalog.modules.find((module) => module.code === parent)?.descr || parent;
    }
    return parent;
}

export default function PermissionCatalogClient() {
    const router = useRouter();
    const canManage = useCan()("manage-perms");
    const [activeType, setActiveType] = useState<PermissionCatalogType>("MODULE");
    const [searchTerm, setSearchTerm] = useState("");
    const [form, setForm] = useState<FormState | null>(null);
    const [busyCode, setBusyCode] = useState("");
    const catalogQuery = usePermissionCatalogQuery();
    const { mutateAsync: savePerms } = useSavePermissionCatalogMutation();
    const { mutateAsync: deletePerms } = useDeletePermissionCatalogMutation();
    const catalog = catalogQuery.data;

    useEffect(() => {
        if (!canManage) router.replace("/users-list");
    }, [canManage, router]);

    const entries = useMemo(() => {
        const items = catalog?.[CATALOG_KEYS[activeType]] ?? [];
        const query = searchTerm.trim().toLocaleLowerCase("el");
        if (!query) return items;

        return items.filter((item) =>
            [item.code, item.parent, item.descr]
                .join(" ")
                .toLocaleLowerCase("el")
                .includes(query)
        );
    }, [activeType, catalog, searchTerm]);

    const toggleActive = async (entry: PermissionCatalogEntry) => {
        if (busyCode) return;
        const nextActive = entry.isActive === 1 ? 0 : 1;

        if (
            nextActive === 0 &&
            !window.confirm(
                `Το "${entry.descr || entry.code}" θα απενεργοποιηθεί για όλους τους χρήστες, και τους Super Admin. Συνέχεια;`
            )
        ) {
            return;
        }

        setBusyCode(entry.code);
        try {
            await savePerms([{ type: activeType, code: entry.code, isActive: nextActive }]);
            toast.success(nextActive === 1 ? "Το δικαίωμα ενεργοποιήθηκε." : "Το δικαίωμα απενεργοποιήθηκε.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Η ενημέρωση δεν ολοκληρώθηκε.");
        } finally {
            setBusyCode("");
        }
    };

    const deleteEntry = async (entry: PermissionCatalogEntry) => {
        if (busyCode) return;

        if (
            !window.confirm(
                `Διαγραφή του "${entry.descr || entry.code}" (${entry.code}) από τον κατάλογο και από όλους τους χρήστες που το έχουν. Η ενέργεια δεν αναιρείται. Συνέχεια;`
            )
        ) {
            return;
        }

        setBusyCode(entry.code);
        try {
            await deletePerms([{ type: activeType, code: entry.code }]);
            toast.success("Το δικαίωμα διαγράφηκε.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Η διαγραφή δεν ολοκληρώθηκε.");
        } finally {
            setBusyCode("");
        }
    };

    if (!canManage) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="mx-auto w-full">
            <PageBreadcrumb pageTitle="Κατάλογος Δικαιωμάτων" />

            <Link
                href="/users-list"
                prefetch={false}
                className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-600 dark:text-gray-400"
            >
                <ChevronLeft className="h-4 w-4" />
                Λίστα Χρηστών
            </Link>

            <DataTable>
                <DataTableHeader
                    title="Κατάλογος δικαιωμάτων"
                    description="Σελίδες, λειτουργίες και καταστήματα που μπορούν να αποδοθούν σε χρήστες."
                    count={entries.length}
                    action={
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <DataTableSearchBar
                                value={searchTerm}
                                onChange={setSearchTerm}
                                onRefresh={() => void catalogQuery.refetch()}
                                isRefreshing={catalogQuery.isFetching}
                                refreshDisabled={catalogQuery.isFetching}
                                placeholder="Κωδικός, γονέας, περιγραφή..."
                            />
                            <button
                                type="button"
                                onClick={() => setForm({ type: activeType })}
                                disabled={!catalog}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                Νέο δικαίωμα
                            </button>
                        </div>
                    }
                />

                <div className="flex gap-1 border-b border-gray-100 px-5 pt-3 dark:border-gray-800">
                    {(Object.keys(TAB_LABELS) as PermissionCatalogType[]).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setActiveType(type)}
                            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${activeType === type
                                ? "border-brand-500 text-brand-700 dark:text-brand-300"
                                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                        >
                            {TAB_LABELS[type]}
                            <span className="ml-1.5 text-xs text-gray-400">
                                {catalog?.[CATALOG_KEYS[type]].length ?? 0}
                            </span>
                        </button>
                    ))}
                </div>

                {catalogQuery.isPending ? (
                    <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-gray-500">
                        <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
                        Φόρτωση καταλόγου…
                    </div>
                ) : !catalog || entries.length === 0 ? (
                    <DataTableEmptyState
                        icon={<Shield className="h-6 w-6" />}
                        title={catalogQuery.error ? "Η φόρτωση απέτυχε" : "Δεν βρέθηκαν δικαιώματα"}
                        description={
                            catalogQuery.error instanceof Error
                                ? catalogQuery.error.message
                                : searchTerm
                                    ? "Δεν υπάρχει δικαίωμα που να ταιριάζει στην αναζήτηση."
                                    : "Ο κατάλογος είναι κενός."
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] table-auto">
                            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-3">Κωδικός</th>
                                    <th className="px-4 py-3">Περιγραφή</th>
                                    <th className="px-4 py-3">Γονέας</th>
                                    <th className="px-4 py-3">Κατάσταση</th>
                                    <th className="px-4 py-3 text-right">Ενέργειες</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {entries.map((entry) => {
                                    const busy = busyCode === entry.code;

                                    return (
                                        <tr
                                            key={entry.code}
                                            className="text-sm text-gray-700 hover:bg-gray-50/70 dark:text-gray-300 dark:hover:bg-white/[0.02]"
                                        >
                                            <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">
                                                {entry.code}
                                            </td>
                                            <td className="px-4 py-3">{entry.descr || "—"}</td>
                                            <td className="px-4 py-3">
                                                {getParentLabel(catalog, activeType, entry.parent)}
                                                <span className="ml-1.5 font-mono text-xs text-gray-400">
                                                    {entry.parent}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${entry.isActive === 1
                                                        ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
                                                >
                                                    {entry.isActive === 1 ? "Ενεργό" : "Ανενεργό"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="inline-flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                                    <button
                                                        type="button"
                                                        onClick={() => setForm({ type: activeType, entry })}
                                                        disabled={Boolean(busyCode)}
                                                        title="Επεξεργασία"
                                                        aria-label={`Επεξεργασία ${entry.code}`}
                                                        className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-brand-600 disabled:opacity-40 dark:hover:bg-gray-800"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
                                                    <button
                                                        type="button"
                                                        onClick={() => void toggleActive(entry)}
                                                        disabled={Boolean(busyCode)}
                                                        className={`flex h-9 min-w-28 items-center justify-center px-3 text-xs font-semibold disabled:opacity-40 ${entry.isActive === 1
                                                            ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                                                            : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"}`}
                                                    >
                                                        {busy ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : entry.isActive === 1 ? (
                                                            "Απενεργοποίηση"
                                                        ) : (
                                                            "Ενεργοποίηση"
                                                        )}
                                                    </button>
                                                    <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
                                                    <button
                                                        type="button"
                                                        onClick={() => void deleteEntry(entry)}
                                                        disabled={Boolean(busyCode)}
                                                        title="Διαγραφή"
                                                        aria-label={`Διαγραφή ${entry.code}`}
                                                        className="flex h-9 w-9 items-center justify-center text-red-500 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </DataTable>

            {form && catalog && (
                <PermissionCatalogFormModal
                    key={form.entry ? `${form.type}-${form.entry.code}` : `${form.type}-new`}
                    catalog={catalog}
                    type={form.type}
                    entry={form.entry}
                    onClose={() => setForm(null)}
                />
            )}

            <p className="mt-3 text-xs text-gray-500">
                Οι αλλαγές στα δικαιώματα ισχύουν από την επόμενη σύνδεση κάθε χρήστη.
            </p>
        </div>
    );
}
