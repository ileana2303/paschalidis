"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import CustomerSearchModal from "@/components/search/customer-search-modal";
import { useSearchCustomersMutation } from "@/hooks/queries/useApiMutations";
import {
    useAssignCustomerPriceGroupMutation,
    usePriceTierGroupsQuery,
} from "@/hooks/queries/usePriceTierQueries";
import { useModal } from "@/hooks/useModal";
import { Check, Loader2, RefreshCw, UserSearch, X } from "@/lib/icons/lucide";
import type { ICustomerInfo } from "@/lib/interface";
import type { PriceTierCustomerGroup } from "@/lib/price-tiers/types";

function formatGroup(group: PriceTierCustomerGroup) {
    return group.name ? `${group.code} — ${group.name}` : group.code;
}

export default function CustomerGroupForm() {
    const groupsQuery = usePriceTierGroupsQuery();
    const assignMutation = useAssignCustomerPriceGroupMutation();
    const { mutateAsync: searchCustomers } = useSearchCustomersMutation();
    const { isOpen, openModal, closeModal } = useModal();
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [customer, setCustomer] = useState<ICustomerInfo | null>(null);
    const [trdpGroup, setTrdpGroup] = useState("");
    const [confirmation, setConfirmation] = useState<string | null>(null);
    const [assignError, setAssignError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [results, setResults] = useState<ICustomerInfo[]>([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchError, setSearchError] = useState("");

    const groups = useMemo(() => groupsQuery.data?.groups ?? [], [groupsQuery.data?.groups]);

    const handleOpenSearch = useCallback(() => {
        setSearch("");
        setResults([]);
        setHasSearched(false);
        setSearchError("");
        openModal();
    }, [openModal]);

    const handleSearch = useCallback(async () => {
        const term = search.trim();
        if (!term) return;

        setHasSearched(true);
        setSearching(true);
        setSearchError("");

        try {
            const data = await searchCustomers(term);
            setResults(data.rows);
        } catch (error) {
            setResults([]);
            setSearchError(
                error instanceof Error
                    ? error.message
                    : "Η αναζήτηση πελατών δεν είναι διαθέσιμη προσωρινά"
            );
        } finally {
            setSearching(false);
        }
    }, [search, searchCustomers]);

    const handleSelectCustomer = useCallback(
        (selected: ICustomerInfo) => {
            setCustomer(selected);
            setConfirmation(null);
            setAssignError(null);
            closeModal();
        },
        [closeModal]
    );

    const handleAssign = useCallback(async () => {
        if (!customer || !trdpGroup) return;

        setConfirmation(null);
        setAssignError(null);

        try {
            await assignMutation.mutateAsync({
                trdr: String(customer.TRDR),
                trdpGroup,
            });

            const group = groups.find((entry) => entry.trdpGroup === trdpGroup);
            const message = `Ο πελάτης ${customer.NAME} ανατέθηκε στην ομάδα ${
                group ? formatGroup(group) : trdpGroup
            }.`;

            setConfirmation(message);
            toast.success(message);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Η ανάθεση ομάδας απέτυχε.";

            setAssignError(message);
            toast.error(message);
        }
    }, [assignMutation, customer, groups, trdpGroup]);

    const canAssign = Boolean(customer && trdpGroup) && !assignMutation.isPending;

    return (
        <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Ανάθεση ομάδας σε πελάτη
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Η ομάδα του πελάτη καθορίζει ποια στήλη του πλέγματος ισχύει γι’ αυτόν.
                </p>
            </div>

            <div className="space-y-5 p-5">
                <div>
                    <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Πελάτης
                    </span>

                    {customer ? (
                        <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
                            <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-900 dark:text-white">
                                    {customer.NAME}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    Κωδικός {customer.CODE} · TRDR {customer.TRDR}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                                <button
                                    type="button"
                                    onClick={handleOpenSearch}
                                    className="rounded-md px-2 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
                                >
                                    Αλλαγή
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCustomer(null);
                                        setConfirmation(null);
                                        setAssignError(null);
                                    }}
                                    aria-label="Αφαίρεση πελάτη"
                                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleOpenSearch}
                            className="flex h-11 w-full items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 text-sm text-gray-600 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5"
                        >
                            <UserSearch className="size-4" aria-hidden="true" />
                            Αναζήτηση πελάτη…
                        </button>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="price-tier-customer-group"
                        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        Ομάδα πελάτη
                    </label>

                    {groupsQuery.isError ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-300">
                            <span>
                                {groupsQuery.error instanceof Error
                                    ? groupsQuery.error.message
                                    : "Αποτυχία φόρτωσης των ομάδων πελατών."}
                            </span>
                            <button
                                type="button"
                                onClick={() => void groupsQuery.refetch()}
                                disabled={groupsQuery.isFetching}
                                aria-label="Επανάληψη φόρτωσης ομάδων"
                                className="shrink-0 rounded-md p-1.5 hover:bg-error-100 dark:hover:bg-error-500/20"
                            >
                                <RefreshCw
                                    className={["size-4", groupsQuery.isFetching ? "animate-spin" : ""].join(" ")}
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                    ) : (
                        <select
                            id="price-tier-customer-group"
                            value={trdpGroup}
                            onChange={(event) => {
                                setTrdpGroup(event.target.value);
                                setConfirmation(null);
                                setAssignError(null);
                            }}
                            disabled={groupsQuery.isLoading}
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        >
                            <option value="" disabled>
                                {groupsQuery.isLoading ? "Φόρτωση ομάδων…" : "Επιλέξτε ομάδα"}
                            </option>
                            {groups.map((group) => (
                                <option key={group.trdpGroup} value={group.trdpGroup}>
                                    {formatGroup(group)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => void handleAssign()}
                    disabled={!canAssign}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300 dark:disabled:bg-brand-500/40"
                >
                    {assignMutation.isPending && (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    )}
                    Αποθήκευση
                </button>

                {confirmation && (
                    <p
                        role="status"
                        className="flex items-start gap-2 rounded-lg bg-success-50 px-3 py-2.5 text-sm text-success-800 dark:bg-success-500/10 dark:text-success-300"
                    >
                        <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {confirmation}
                    </p>
                )}

                {assignError && (
                    <p
                        role="alert"
                        className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-300"
                    >
                        {assignError}
                    </p>
                )}
            </div>

            <CustomerSearchModal
                isOpen={isOpen}
                onClose={closeModal}
                inputRef={searchInputRef}
                searchValue={search}
                onSearchValueChange={setSearch}
                onSearch={() => void handleSearch()}
                loading={searching}
                error={searchError}
                results={results}
                hasSearched={hasSearched}
                onSelectCustomer={handleSelectCustomer}
            />
        </section>
    );
}
