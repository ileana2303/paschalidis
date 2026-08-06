"use client";

import { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import SearchBar from "@/components/search/search-bar";
import { Check, Loader2 } from "@/lib/icons/lucide";
import { Modal } from "@/components/ui/modal";
import toast from "react-hot-toast";
import {
    useFetchEditableItemMutation,
    useSearchItemsMutation,
    useUpdateEditableItemMutation,
} from "@/hooks/queries/useApiMutations";
import type { IItem, ItemEditFields, ItemEditValue } from "@/lib/interface";

const EDITABLE_FIELDS = [
    { name: "CODE", label: "Κωδικός" },
    { name: "CODE1", label: "Κωδικός 1" },
    { name: "CODE2", label: "Κωδικός 2" },
    { name: "MTRUNIT1", label: "Μονάδα μέτρησης" },
    { name: "NAME", label: "Περιγραφή" },
    { name: "PRICER", label: "Τιμή" },
    { name: "STANDCOST", label: "Τιμή αγοράς βάσης" },
    ...[1, 2, 3, 4, 5, 8, 9, 10, 11, 12].map((priceList) => ({
        name: `PRICER${String(priceList).padStart(2, "0")}`,
        label: `Τιμοκατάλογος ${String(priceList).padStart(2, "0")}`,
    })),
    { name: "MTRMANFCTR", label: "Κατασκευαστής" },
    { name: "VARCHAR1", label: "VARCHAR1" },
    { name: "VARCHAR2", label: "VARCHAR2" },
    { name: "VARCHAR3", label: "VARCHAR3" },
    { name: "BOOL03", label: "BOOL03" },
    { name: "CCCSUFIX", label: "CCCSUFIX" },
] as const;

const CATALOG_PRICE_PAIRS = [
    ["PRICER01", "PRICER08"],
    ["PRICER02", "PRICER09"],
    ["PRICER03", "PRICER10"],
    ["PRICER04", "PRICER11"],
    ["PRICER05", "PRICER12"],
] as const;

function toInputValue(value: ItemEditValue): string {
    return value == null ? "" : String(value);
}

export default function EditItemsClient() {
    const [searchKey, setSearchKey] = useState("");
    const [searchResults, setSearchResults] = useState<IItem[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [loadedKey, setLoadedKey] = useState("");
    const [originalFields, setOriginalFields] = useState<ItemEditFields>({});
    const [fields, setFields] = useState<ItemEditFields>({});
    const { mutateAsync: searchItemsRequest, isPending: searchingItems } =
        useSearchItemsMutation();
    const { mutateAsync: fetchEditableItem, isPending: loadingItem } =
        useFetchEditableItemMutation();
    const { mutateAsync: updateEditableItem, isPending: saving } =
        useUpdateEditableItemMutation();
    const loading = searchingItems || loadingItem;

    const hasChanges = useMemo(
        () => JSON.stringify(fields) !== JSON.stringify(originalFields),
        [fields, originalFields]
    );

    const searchItems = async () => {
        const search = searchKey.trim();
        if (!search || loading) return;

        setHasSearched(true);
        setLoadedKey("");
        setOriginalFields({});
        setFields({});

        try {
            const data = await searchItemsRequest(search);

            if (!data.success) {
                throw new Error(data.message || "Η αναζήτηση δεν ολοκληρώθηκε.");
            }

            setSearchResults(data.rows);
        } catch (requestError) {
            setSearchResults([]);
            const message =
                requestError instanceof Error
                    ? requestError.message
                    : "Η αναζήτηση δεν είναι διαθέσιμη προσωρινά.";
            toast.error(message);
        }
    };

    const loadItem = async (key: string) => {
        if (!key || loading) return;

        try {
            const data = await fetchEditableItem(key);
            const item = data.item;

            if (!item) {
                throw new Error("Το προϊόν δεν περιέχει επεξεργάσιμα στοιχεία.");
            }

            setLoadedKey(data.key || key);
            setOriginalFields(item);
            setFields(item);
        } catch (requestError) {
            const message =
                requestError instanceof Error
                    ? requestError.message
                    : "Η φόρτωση του είδους δεν είναι διαθέσιμη προσωρινά.";
            toast.error(message);
        }
    };

    const handleItemSelect = (key: string) => {
        setIsEditModalOpen(true);
        void loadItem(key);
    };

    const updateField = (name: string, nextValue: string) => {
        setFields((current) => ({ ...current, [name]: nextValue }));
    };

    const renderField = (name: string, className = "") => {
        const field = EDITABLE_FIELDS.find((candidate) => candidate.name === name);

        if (!field || !Object.prototype.hasOwnProperty.call(fields, name)) {
            return null;
        }

        return (
            <label key={name} className={`block ${className}`}>
                <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {field.label}
                </span>
                <input
                    type="text"
                    value={toInputValue(fields[name])}
                    onChange={(event) => updateField(name, event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
            </label>
        );
    };

    const saveItem = async () => {
        if (!loadedKey || !hasChanges || saving) return;

        try {
            const changedFields = Object.fromEntries(
                Object.entries(fields).filter(
                    ([name, fieldValue]) =>
                        EDITABLE_FIELDS.some((field) => field.name === name) &&
                        (!(name in originalFields) ||
                            fieldValue !== originalFields[name])
                )
            );
            const data = await updateEditableItem({
                key: loadedKey,
                fields: changedFields,
            });

            setOriginalFields(fields);
            const message = data.message || "Το προϊόν ενημερώθηκε επιτυχώς.";
            toast.success(message);
        } catch (requestError) {
            const message =
                requestError instanceof Error
                    ? requestError.message
                    : "Η αποθήκευση δεν είναι διαθέσιμη προσωρινά.";
            toast.error(message);
        }
    };

    const clearSearch = () => {
        setSearchKey("");
        setSearchResults([]);
        setHasSearched(false);
        setIsEditModalOpen(false);
        setLoadedKey("");
        setOriginalFields({});
        setFields({});
    };

    return (
        <div className="mx-auto w-full max-w-6xl">
            <PageBreadcrumb pageTitle="Επεξεργασία Ειδών" />

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
                <header className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-7">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">
                        SoftOne ITEM
                    </p>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Αναζήτηση είδους
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Αναζητήστε με κωδικό, όνομα ή περιγραφή και επιλέξτε το είδος για επεξεργασία.
                    </p>
                    <SearchBar
                        value={searchKey}
                        onChange={setSearchKey}
                        onSearch={() => void searchItems()}
                        onClear={clearSearch}
                        placeholder="Κωδικός ανταλλακτικού, όνομα, περιγραφή..."
                        loading={loading}
                        clearOnFocus={false}
                        containerClassName="mt-5 max-w-2xl"
                    />
                </header>

                <div className="p-5 sm:p-7">
                    {searchResults.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                Επιλέξτε είδος για επεξεργασία
                            </p>
                            {searchResults.map((item) => (
                                <button
                                    key={item.MTRL}
                                    type="button"
                                    onClick={() => handleItemSelect(item.MTRL)}
                                    className="grid w-full gap-2 rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-800 dark:hover:border-brand-800 dark:hover:bg-brand-950/20 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
                                >
                                    <div>
                                        <p className="text-xs text-gray-500">Κωδικός</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {item.ITEM_CODE || "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Περιγραφή</p>
                                        <p className="font-medium text-gray-800 dark:text-gray-100">
                                            {item.ITEM_DESCR || "—"}
                                        </p>
                                    </div>
                                    <div className="sm:text-right">
                                        <p className="text-xs text-gray-500">Κωδικός 2</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            {item.ITEM_CODE2 || "—"}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {searchingItems ? (
                        <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 px-6 text-center text-sm text-gray-500 dark:border-gray-800">
                            <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
                            Αναζήτηση ειδών…
                        </div>
                    ) : searchResults.length === 0 && !isEditModalOpen && (
                        <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-gray-200 px-6 text-center text-sm text-gray-500 dark:border-gray-800">
                            {hasSearched
                                ? "Δεν βρέθηκαν είδη για την αναζήτησή σας."
                                : "Αναζητήστε ένα είδος για να εμφανιστούν τα αποτελέσματα."}
                        </div>
                    )}
                </div>
            </section>

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                className="m-4 max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto"
            >
                <div className="p-6 sm:p-8">
                    <h3 className="pr-10 text-xl font-semibold text-gray-900 dark:text-white">
                        Επεξεργασία είδους
                    </h3>

                    {loadingItem ? (
                        <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-sm text-gray-500">
                            <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
                            Φόρτωση στοιχείων είδους…
                        </div>
                    ) : (
                        <>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm text-gray-500">
                                    KEY: <span className="font-medium text-gray-800 dark:text-gray-200">{loadedKey}</span>
                                </p>
                                {hasChanges && (
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                        Μη αποθηκευμένες αλλαγές
                                    </span>
                                )}
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {renderField("CODE")}
                                {renderField("CODE1")}
                                {renderField("CODE2")}
                                {renderField("MTRUNIT1")}
                                {renderField("NAME", "md:col-span-2")}
                                {renderField("PRICER")}
                                {renderField("STANDCOST")}
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                {CATALOG_PRICE_PAIRS.flatMap(([leftName, rightName]) => [
                                    renderField(leftName),
                                    renderField(rightName),
                                ])}
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                {renderField("MTRMANFCTR")}
                                {renderField("VARCHAR1")}
                                {renderField("VARCHAR2")}
                                {renderField("VARCHAR3")}
                                {renderField("BOOL03")}
                                {renderField("CCCSUFIX")}
                            </div>

                            <div className="mt-7 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => void saveItem()}
                                    disabled={!hasChanges || saving}
                                    className="inline-flex min-w-40 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
                                >
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                    {saving ? "Αποθήκευση..." : "Αποθήκευση αλλαγών"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
