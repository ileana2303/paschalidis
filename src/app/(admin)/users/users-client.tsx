"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import DataTable from "@/components/ui/data-table/data-table";
import DataTableEmptyState from "@/components/ui/data-table/data-table-empty-state";
import DataTableHeader from "@/components/ui/data-table/data-table-header";
import DataTableSearchBar from "@/components/ui/data-table/data-table-search-bar";
import StatusBadge from "@/components/ui/data-table/status-badge";
import UserFormModal from "@/components/users/user-form-modal";
import {
    useFetchUsersMutation,
    usePermissionCatalogQuery,
    useSaveUserMutation,
} from "@/hooks/queries/useUserQueries";
import { useCan } from "@/hooks/usePermissions";
import { formatBranchLabel } from "@/lib/auth/branches";
import {
    ChevronDown,
    Eye,
    Loader2,
    Pencil,
    Plus,
    Shield,
    UserRound,
    Users,
} from "@/lib/icons/lucide";
import type {
    PermissionCatalog,
    PermissionCatalogEntry,
    UserPermission,
    UserWithPermissions,
} from "@/lib/users/types";

function normalizeEntries(entries: UserPermission[] | undefined): UserPermission[] {
    return (entries ?? []).map((entry) => ({
        code: String(entry.code ?? "").trim(),
        isActive: Number(entry.isActive) === 0 ? 0 : 1,
    }));
}

function normalizeRecord(record: UserWithPermissions): UserWithPermissions {
    return {
        user: {
            ...record.user,
            username: String(record.user.username ?? "").trim(),
            isActive: record.user.isActive === 1 ? 1 : 0,
            isSuperAdmin: record.user.isSuperAdmin === 1 ? 1 : 0,
            isCustomer: record.user.isCustomer === 1 ? 1 : 0,
            trdr: Number(record.user.trdr) || 0,
        },
        permissions: {
            modules: normalizeEntries(record.permissions?.modules),
            features: normalizeEntries(record.permissions?.features),
            branches: normalizeEntries(record.permissions?.branches),
        },
    };
}

function countActive(entries: UserPermission[]) {
    return entries.filter((entry) => entry.isActive === 1).length;
}

function PermissionList({
    entries,
    catalog,
    emptyLabel,
    mainBranch,
}: {
    entries: UserPermission[];
    catalog: PermissionCatalogEntry[];
    emptyLabel: string;
    mainBranch?: string;
}) {
    if (entries.length === 0) {
        return <p className="text-sm text-gray-500">{emptyLabel}</p>;
    }

    return (
        <ul className="flex flex-wrap gap-2">
            {entries.map((entry, index) => {
                const label =
                    catalog.find((item) => item.code === entry.code)?.descr || entry.code;

                return (
                    <li
                        key={`${entry.code}-${index}`}
                        title={entry.isActive === 1 ? entry.code : `${entry.code} (ανενεργό)`}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${entry.isActive === 1
                            ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            : "bg-gray-50 text-gray-400 line-through dark:bg-gray-900 dark:text-gray-600"}`}
                    >
                        {label}
                        {entry.code === mainBranch && (
                            <span className="ml-1.5 font-semibold text-brand-600 dark:text-brand-300">
                                Κύριο
                            </span>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

function PermissionsDetails({
    record,
    catalog,
}: {
    record: UserWithPermissions;
    catalog: PermissionCatalog | undefined;
}) {
    const { permissions } = record;
    const sections = [
        { title: "Σελίδες", entries: permissions.modules, catalog: catalog?.modules ?? [], empty: "Δεν υπάρχουν σελίδες." },
        { title: "Λειτουργίες", entries: permissions.features, catalog: catalog?.features ?? [], empty: "Δεν υπάρχουν λειτουργίες." },
        { title: "Καταστήματα", entries: permissions.branches, catalog: catalog?.branches ?? [], empty: "Δεν υπάρχουν επιτρεπόμενα καταστήματα." },
    ];

    return (
        <div className="grid gap-4 p-5 lg:grid-cols-3">
            {sections.map((section) => (
                <section
                    key={section.title}
                    className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40"
                >
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                        {section.title} ({countActive(section.entries)})
                    </h4>
                    <PermissionList
                        entries={section.entries}
                        catalog={section.catalog}
                        emptyLabel={section.empty}
                        mainBranch={section.title === "Καταστήματα" ? record.user.mainBranch : undefined}
                    />
                </section>
            ))}
        </div>
    );
}

export default function UsersClient() {
    const can = useCan();
    const canCreate = can("create-user");
    const canEdit = can("edit-user");
    const canManagePerms = can("manage-perms");
    const [records, setRecords] = useState<UserWithPermissions[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loadError, setLoadError] = useState("");
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
    const [editingRecord, setEditingRecord] = useState<UserWithPermissions | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [updatingUsername, setUpdatingUsername] = useState("");
    const initialLoadStarted = useRef(false);
    const { mutateAsync: fetchUsers, isPending: loadingUsers } = useFetchUsersMutation();
    const { mutateAsync: saveUser } = useSaveUserMutation();
    const catalogQuery = usePermissionCatalogQuery();
    const catalogTotals = useMemo(() => {
        const catalog = catalogQuery.data;
        if (!catalog) return null;

        const activeCount = (entries: PermissionCatalogEntry[]) =>
            entries.filter((entry) => entry.isActive === 1).length;

        return {
            permissions: activeCount(catalog.modules) + activeCount(catalog.features),
            branches: activeCount(catalog.branches),
        };
    }, [catalogQuery.data]);

    const loadUsers = useCallback(async () => {
        setLoadError("");

        try {
            const response = await fetchUsers(undefined);
            if (response.success !== true) {
                throw new Error(response.error?.trim() || "Αποτυχία φόρτωσης χρηστών.");
            }

            setRecords((response.users ?? []).map(normalizeRecord));
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Αποτυχία φόρτωσης χρηστών.";
            setLoadError(message);
            toast.error(message);
        }
    }, [fetchUsers]);

    useEffect(() => {
        if (initialLoadStarted.current) return;

        initialLoadStarted.current = true;
        void loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        if (catalogQuery.error) {
            toast.error(
                catalogQuery.error instanceof Error
                    ? catalogQuery.error.message
                    : "Αποτυχία φόρτωσης δικαιωμάτων."
            );
        }
    }, [catalogQuery.error]);

    const upsertRecord = useCallback((savedRecord: UserWithPermissions) => {
        const normalized = normalizeRecord(savedRecord);
        const normalizedUsername = normalized.user.username.toLocaleLowerCase();

        setRecords((current) => {
            const existingIndex = current.findIndex(
                (entry) => entry.user.username.toLocaleLowerCase() === normalizedUsername
            );

            if (existingIndex === -1) {
                return [...current, normalized].sort((left, right) =>
                    left.user.username.localeCompare(right.user.username, "el")
                );
            }

            return current.map((entry, index) =>
                index === existingIndex ? normalized : entry
            );
        });
    }, []);

    const filteredRecords = useMemo(() => {
        const query = searchTerm.trim().toLocaleLowerCase("el");
        if (!query) return records;

        return records.filter(({ user }) =>
            [
                user.username,
                user.fname,
                user.lname,
                user.email,
                user.mobile,
                user.role,
                user.mainBranch,
            ]
                .filter((value) => value != null)
                .join(" ")
                .toLocaleLowerCase("el")
                .includes(query)
        );
    }, [records, searchTerm]);

    const toggleDetails = (username: string) => {
        const key = username.toLocaleLowerCase();
        setExpandedUsers((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const openCreateForm = () => {
        setEditingRecord(null);
        setIsFormOpen(true);
    };

    const openEditForm = (record: UserWithPermissions) => {
        setEditingRecord(record);
        setIsFormOpen(true);
    };

    const toggleActive = async (record: UserWithPermissions) => {
        if (updatingUsername) return;
        const nextStatus = record.user.isActive === 1 ? 0 : 1;
        setUpdatingUsername(record.user.username);

        try {
            const response = await saveUser({
                user: {
                    username: record.user.username,
                    isActive: nextStatus,
                },
            });
            const savedRecord = response.users?.[0];
            if (!savedRecord) {
                throw new Error("Η ενημέρωση ολοκληρώθηκε χωρίς στοιχεία χρήστη.");
            }

            upsertRecord(savedRecord);
            toast.success(nextStatus === 1 ? "Ο χρήστης ενεργοποιήθηκε." : "Ο χρήστης απενεργοποιήθηκε.");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Η ενημέρωση δεν ολοκληρώθηκε."
            );
        } finally {
            setUpdatingUsername("");
        }
    };

    return (
        <div className="mx-auto w-full">
            <PageBreadcrumb pageTitle="Λίστα Χρηστών" />

            <DataTable>
                <DataTableHeader
                    title="Χρήστες"
                    description="Διαχείριση στοιχείων, κατάστασης, καταστημάτων και δικαιωμάτων χρηστών."
                    count={records.length}
                    action={
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <DataTableSearchBar
                                value={searchTerm}
                                onChange={setSearchTerm}
                                onRefresh={() => void loadUsers()}
                                isRefreshing={loadingUsers}
                                refreshDisabled={loadingUsers}
                                placeholder="Username, όνομα, email, ρόλος..."
                            />
                            {canManagePerms && (
                                <Link
                                    href="/users-list/permissions"
                                    prefetch={false}
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                                >
                                    <Shield className="h-4 w-4" />
                                    Κατάλογος δικαιωμάτων
                                </Link>
                            )}
                            {canCreate && (
                                <button
                                    type="button"
                                    onClick={openCreateForm}
                                    disabled={!catalogQuery.data}
                                    title={catalogQuery.data ? undefined : "Φόρτωση δικαιωμάτων…"}
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    Νέος χρήστης
                                </button>
                            )}
                        </div>
                    }
                />

                {loadingUsers && records.length === 0 ? (
                    <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-gray-500">
                        <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
                        Φόρτωση χρηστών…
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <DataTableEmptyState
                        icon={<Users className="h-6 w-6" />}
                        title={loadError ? "Η φόρτωση απέτυχε" : "Δεν βρέθηκαν χρήστες"}
                        description={
                            loadError ||
                            (searchTerm
                                ? "Δεν υπάρχει χρήστης που να ταιριάζει στην αναζήτηση."
                                : "Δεν επιστράφηκαν χρήστες από το SoftOne.")
                        }
                        action={
                            loadError ? (
                                <button
                                    type="button"
                                    onClick={() => void loadUsers()}
                                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                                >
                                    Δοκιμή ξανά
                                </button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1320px] table-auto">
                            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
                                <tr>
                                    <th className="px-4 py-3">Username</th>
                                    <th className="px-4 py-3">Όνομα</th>
                                    <th className="px-4 py-3">Επικοινωνία</th>
                                    <th className="px-4 py-3">Ρόλος</th>
                                    <th className="px-4 py-3">Κύριο κατάστημα</th>
                                    <th className="px-4 py-3">Κατάσταση</th>
                                    <th className="px-4 py-3">Τύπος</th>
                                    <th className="px-4 py-3">Δικαιώματα</th>
                                    {canEdit && <th className="px-4 py-3 text-right">Ενέργειες</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredRecords.map((record) => {
                                    const { user, permissions } = record;
                                    const key = user.username.toLocaleLowerCase();
                                    const expanded = expandedUsers.has(key);
                                    const updating = updatingUsername === user.username;
                                    const fullName = [user.fname, user.lname]
                                        .map((part) => String(part ?? "").trim())
                                        .filter(Boolean)
                                        .join(" ");

                                    return (
                                        <Fragment key={key}>
                                            <tr className="text-sm text-gray-700 hover:bg-gray-50/70 dark:text-gray-300 dark:hover:bg-white/[0.02]">
                                                <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                                                    {user.username}
                                                </td>
                                                <td className="px-4 py-4">{fullName || "—"}</td>
                                                <td className="px-4 py-4">
                                                    <div>{user.email || "—"}</div>
                                                    {user.mobile && <div className="mt-1 text-xs text-gray-500">{user.mobile}</div>}
                                                </td>
                                                <td className="px-4 py-4">{user.role || "—"}</td>
                                                <td className="px-4 py-4">
                                                    {user.mainBranch ? formatBranchLabel(user.mainBranch) : "—"}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <StatusBadge
                                                        status={user.isActive === 1 ? "Active" : "Inactive"}
                                                        label={user.isActive === 1 ? "Ενεργός" : "Ανενεργός"}
                                                        className={
                                                            user.isActive === 1
                                                                ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                                                                : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                                        }
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {user.isSuperAdmin === 1 && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                                                                <Shield className="h-3 w-3" /> Super Admin
                                                            </span>
                                                        )}
                                                        {user.isCustomer === 1 && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                                                                <UserRound className="h-3 w-3" /> Customer
                                                            </span>
                                                        )}
                                                        {user.isSuperAdmin !== 1 && user.isCustomer !== 1 && "—"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleDetails(user.username)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                                                        aria-expanded={expanded}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        {countActive(permissions.modules) + countActive(permissions.features)} δικαιώματα
                                                        {catalogTotals && ` από τα ${catalogTotals.permissions}`}
                                                        {" · "}
                                                        {countActive(permissions.branches)} καταστήματα
                                                        {catalogTotals && ` από τα ${catalogTotals.branches}`}
                                                        <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180" : ""}`} />
                                                    </button>
                                                </td>
                                                {canEdit && (
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="inline-flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditForm(record)}
                                                                disabled={Boolean(updatingUsername) || !catalogQuery.data}
                                                                title="Επεξεργασία"
                                                                aria-label={`Επεξεργασία ${user.username}`}
                                                                className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-brand-600 disabled:opacity-40 dark:hover:bg-gray-800"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
                                                            <button
                                                                type="button"
                                                                onClick={() => void toggleActive(record)}
                                                                disabled={Boolean(updatingUsername)}
                                                                className={`flex h-9 items-center justify-center px-3 text-xs font-semibold disabled:opacity-40 ${user.isActive === 1 ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"}`}
                                                            >
                                                                {updating ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : user.isActive === 1 ? (
                                                                    "Απενεργοποίηση"
                                                                ) : (
                                                                    "Ενεργοποίηση"
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                            {expanded && (
                                                <tr className="bg-gray-50/50 dark:bg-gray-950/30">
                                                    <td colSpan={canEdit ? 9 : 8}>
                                                        <PermissionsDetails record={record} catalog={catalogQuery.data} />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </DataTable>

            {isFormOpen && catalogQuery.data && (
                <UserFormModal
                    key={editingRecord?.user.username ?? "new-user"}
                    isOpen
                    record={editingRecord}
                    catalog={catalogQuery.data}
                    onClose={() => setIsFormOpen(false)}
                    onSaved={upsertRecord}
                />
            )}
        </div>
    );
}
