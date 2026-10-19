"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import flatpickr from "flatpickr";
import type { Instance as FlatpickrInstance } from "flatpickr/dist/types/instance";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import SearchBar from "@/components/search/search-bar";
import { Calendar, Check, ChevronDown, Loader2 } from "@/lib/icons/lucide";
import { Modal } from "@/components/ui/modal";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/dropdown-item";
import toast from "react-hot-toast";
import {
    useFetchEditableItemMutation,
    useSearchItemsMutation,
    useUpdateEditableItemMutation,
} from "@/hooks/queries/useApiMutations";
import type { IItem, ItemEditFields } from "@/lib/interface";
import { useEditItemsSearchStore } from "@/stores/editItemsSearchStore";
import {
    DISABLED_ITEM_FIELDS,
    EDIT_ITEM_CATALOG_PRICE_PAIRS,
    formatMarkupPercent,
    formatSoftOneDate,
    getEmptyItemExtraFields,
    getSalePriceMarkupPercent,
    normalizeItemExtra,
    parseSoftOneDate,
    SALE_TO_COMPUTED_PRICE,
    toItemEditInputValue,
} from "@/lib/utils/edit-items";

const EDITABLE_FIELDS = [
    { name: "CODE", label: "Κωδικός" },
    { name: "CODE2", label: "Κωδικός 2" },
    { name: "MTRUNIT1", label: "Μονάδα μέτρησης" },
    { name: "NAME", label: "Περιγραφή" },
    { name: "PRICEW", label: "Τιμή χονδρικής (€)" },
    ...[1, 2, 3, 4, 5].map((priceList) => ({
        name: `PRICEW${String(priceList).padStart(2, "0")}`,
        label: `Τιμές πώλησης ${String(priceList).padStart(2, "0")}`,
    })),
    ...[13, 14, 15, 16, 17].map((priceList, index) => ({
        name: `CCCPRICEW${priceList}`,
        label: `Υπολογισμένες τιμές πώλησης ${String(index + 1).padStart(2, "0")} (€)`,
    })),
    { name: "MTRMANFCTR", label: "Κατασκευαστής" },
    { name: "VARCHAR1", label: "VARCHAR1" },
    { name: "VARCHAR2", label: "VARCHAR2" },
    { name: "VARCHAR3", label: "VARCHAR3" },
    { name: "BOOL03", label: "BOOL03" },
    { name: "CCCSUFIX", label: "CCCSUFIX" },
] as const;

const ITEEXTRA_FIELD_NAMES = [
    "VARCHAR01",
    "VARCHAR02",
    "VARCHAR03",
    "BOOL03",
    "DATE03",
] as const;

const BOOL03_OPTIONS = [
    { value: "1", label: "ΝΑΙ" },
    { value: "0", label: "ΟΧΙ" },
] as const;

const INPUT_CLASS_NAME =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const READONLY_VALUE_CLASS_NAME =
    "flex h-11 w-full items-center text-sm font-medium text-gray-900 dark:text-white";

const ITEM_SEARCH_COMPUTED_PRICE_FIELDS = [
    "CCCPRICEW13",
    "CCCPRICEW14",
    "CCCPRICEW15",
    "CCCPRICEW16",
    "CCCPRICEW17",
] as const;

function getItemSearchComputedPrices(item: IItem): ItemEditFields {
    return Object.fromEntries(
        ITEM_SEARCH_COMPUTED_PRICE_FIELDS.map((name) => [name, item[name]])
    );
}

function Bool03Dropdown({
    value,
    onChange,
}: {
    value: string;
    onChange: (nextValue: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedLabel =
        BOOL03_OPTIONS.find((option) => option.value === value)?.label ??
        "Επιλέξτε";

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                className={`${INPUT_CLASS_NAME} dropdown-toggle flex items-center justify-between gap-2 text-left`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className={value ? "" : "text-gray-400"}>{selectedLabel}</span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-500 transition ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            <Dropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                className="left-0 right-0 z-50 mt-2 w-full p-1"
            >
                {BOOL03_OPTIONS.map((option) => (
                    <DropdownItem
                        key={option.value}
                        onItemClick={() => {
                            onChange(option.value);
                            setIsOpen(false);
                        }}
                        className={`rounded-lg px-3 py-2.5 ${
                            value === option.value
                                ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                                : ""
                        }`}
                    >
                        {option.label}
                    </DropdownItem>
                ))}
            </Dropdown>
        </div>
    );
}

function Date03Picker({
    value,
    onChange,
}: {
    value: string;
    onChange: (nextValue: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<FlatpickrInstance | null>(null);

    useEffect(() => {
        if (!inputRef.current) {
            return;
        }

        const picker = flatpickr(inputRef.current, {
            dateFormat: "Y-m-d",
            allowInput: false,
            disableMobile: true,
            maxDate: "today",
            defaultDate: parseSoftOneDate(value),
            onReady: (_selectedDates, _dateStr, instance) => {
                const calendarContainer = instance.calendarContainer as
                    | HTMLDivElement
                    | undefined;
                if (calendarContainer) {
                    calendarContainer.style.zIndex = "100001";
                }
            },
            onChange: (selectedDates) => {
                const selected = selectedDates[0];
                onChange(selected ? formatSoftOneDate(selected) : "");
            },
        });
        const instance = Array.isArray(picker) ? picker[0] : picker;
        pickerRef.current = instance ?? null;

        return () => {
            if (instance && typeof instance.destroy === "function") {
                instance.destroy();
            }
            if (pickerRef.current === instance) {
                pickerRef.current = null;
            }
        };
        // Initialize once; sync later via setDate.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const picker = pickerRef.current;
        if (
            !picker ||
            typeof picker.setDate !== "function" ||
            typeof picker.clear !== "function"
        ) {
            return;
        }

        const parsed = parseSoftOneDate(value);
        if (parsed) {
            picker.setDate(parsed, false);
        } else {
            picker.clear(false);
        }
    }, [value]);

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                readOnly
                placeholder="Επιλέξτε ημερομηνία"
                className={`${INPUT_CLASS_NAME} cursor-pointer pr-10`}
            />
            <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
    );
}

export default function EditItemsClient() {
    const searchKey = useEditItemsSearchStore((state) => state.searchKey);
    const setSearchKey = useEditItemsSearchStore((state) => state.setSearchKey);
    const searchResults = useEditItemsSearchStore((state) => state.searchResults);
    const setSearchResults = useEditItemsSearchStore(
        (state) => state.setSearchResults
    );
    const hasSearched = useEditItemsSearchStore((state) => state.hasSearched);
    const setHasSearched = useEditItemsSearchStore((state) => state.setHasSearched);
    const clearSearchState = useEditItemsSearchStore((state) => state.clearState);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [loadedKey, setLoadedKey] = useState("");
    const [originalFields, setOriginalFields] = useState<ItemEditFields>({});
    const [fields, setFields] = useState<ItemEditFields>({});
    const [originalItemExtra, setOriginalItemExtra] = useState<ItemEditFields>(
        getEmptyItemExtraFields
    );
    const [itemExtra, setItemExtra] = useState<ItemEditFields>(getEmptyItemExtraFields);
    const loadRequestIdRef = useRef(0);
    const { mutateAsync: searchItemsRequest, isPending: searchingItems } =
        useSearchItemsMutation();
    const { mutateAsync: fetchEditableItem, isPending: loadingItem } =
        useFetchEditableItemMutation();
    const { mutateAsync: updateEditableItem, isPending: saving } =
        useUpdateEditableItemMutation();

    const hasChanges = useMemo(
        () =>
            JSON.stringify(fields) !== JSON.stringify(originalFields) ||
            JSON.stringify(itemExtra) !== JSON.stringify(originalItemExtra),
        [fields, itemExtra, originalFields, originalItemExtra]
    );

    const searchItems = async () => {
        const search = searchKey.trim();
        if (!search || searchingItems) return;

        loadRequestIdRef.current += 1;
        setHasSearched(true);
        setSearchResults([]);
        setIsEditModalOpen(false);
        setLoadedKey("");
        setOriginalFields({});
        setFields({});
        setOriginalItemExtra(getEmptyItemExtraFields());
        setItemExtra(getEmptyItemExtraFields());

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

    const loadItem = async (key: string, searchItem: IItem) => {
        const normalizedKey = String(key ?? "").trim();
        if (!normalizedKey) return;

        const requestId = ++loadRequestIdRef.current;

        try {
            const data = await fetchEditableItem(normalizedKey);
            const item = data.item;

            if (!item) {
                throw new Error("Το προϊόν δεν περιέχει επεξεργάσιμα στοιχεία.");
            }

            if (requestId !== loadRequestIdRef.current) {
                return;
            }

            const nextItemExtra = normalizeItemExtra(data.itemExtra);
            const nextFields = {
                ...item,
                ...getItemSearchComputedPrices(searchItem),
            };

            setLoadedKey(data.key || normalizedKey);
            setOriginalFields(nextFields);
            setFields(nextFields);
            setOriginalItemExtra(nextItemExtra);
            setItemExtra(nextItemExtra);
        } catch (requestError) {
            if (requestId !== loadRequestIdRef.current) {
                return;
            }

            setIsEditModalOpen(false);
            const message =
                requestError instanceof Error
                    ? requestError.message
                    : "Η φόρτωση του είδους δεν είναι διαθέσιμη προσωρινά.";
            toast.error(message);
        }
    };

    const handleItemSelect = (item: IItem) => {
        const normalizedKey = String(item.MTRL ?? "").trim();
        if (!normalizedKey) {
            toast.error("Το είδος δεν περιέχει έγκυρο KEY.");
            return;
        }

        setLoadedKey("");
        setOriginalFields({});
        setFields({});
        setOriginalItemExtra(getEmptyItemExtraFields());
        setItemExtra(getEmptyItemExtraFields());
        setIsEditModalOpen(true);
        void loadItem(normalizedKey, item);
    };

    const updateField = (name: string, nextValue: string) => {
        setFields((current) => ({ ...current, [name]: nextValue }));
    };

    const updateItemExtraField = (name: string, nextValue: string) => {
        setItemExtra((current) => ({ ...current, [name]: nextValue }));
    };

    const renderField = (name: string, className = "") => {
        const field = EDITABLE_FIELDS.find((candidate) => candidate.name === name);

        if (!field || !Object.prototype.hasOwnProperty.call(fields, name)) {
            return null;
        }

        const isDisabled = DISABLED_ITEM_FIELDS.has(name);
        const markupPercent = getSalePriceMarkupPercent(fields, name);
        const showMarkup = markupPercent != null;

        const fieldValue = toItemEditInputValue(fields[name]);

        return (
            <div
                key={name}
                className={`grid grid-rows-[minmax(2.5rem,auto)_2.75rem] gap-1.5 ${className}`}
            >
                <span className="flex flex-wrap items-end gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    <span>
                        {Object.prototype.hasOwnProperty.call(
                            SALE_TO_COMPUTED_PRICE,
                            name
                        )
                            ? `${field.label} (€)`
                            : field.label}
                    </span>
                    {showMarkup && (
                        <span
                            className={
                                markupPercent > 0
                                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                                    : markupPercent < 0
                                      ? "font-semibold text-red-600 dark:text-red-400"
                                      : "font-medium text-gray-400 dark:text-gray-500"
                            }
                        >
                            {formatMarkupPercent(markupPercent)}
                        </span>
                    )}
                </span>
                {isDisabled ? (
                    <p className={READONLY_VALUE_CLASS_NAME}>
                        {fieldValue || "—"}
                    </p>
                ) : (
                    <input
                        type="text"
                        value={fieldValue}
                        onChange={(event) => updateField(name, event.target.value)}
                        className={`${INPUT_CLASS_NAME} h-full`}
                    />
                )}
            </div>
        );
    };

    const saveItem = async () => {
        if (!loadedKey || !hasChanges || saving) return;

        try {
            const changedFields = Object.fromEntries(
                Object.entries(fields).filter(
                    ([name, fieldValue]) =>
                        EDITABLE_FIELDS.some((field) => field.name === name) &&
                        !DISABLED_ITEM_FIELDS.has(name) &&
                        (!(name in originalFields) ||
                            fieldValue !== originalFields[name])
                )
            );
            const changedItemExtra = Object.fromEntries(
                Object.entries(itemExtra).filter(([name, fieldValue]) => {
                    if (
                        !ITEEXTRA_FIELD_NAMES.includes(
                            name as (typeof ITEEXTRA_FIELD_NAMES)[number]
                        )
                    ) {
                        return false;
                    }

                    return (
                        !(name in originalItemExtra) ||
                        fieldValue !== originalItemExtra[name]
                    );
                })
            );

            const payload: {
                key: string;
                fields?: ItemEditFields;
                itemExtra?: ItemEditFields;
            } = { key: loadedKey };

            if (Object.keys(changedFields).length > 0) {
                payload.fields = changedFields;
            }

            if (Object.keys(changedItemExtra).length > 0) {
                payload.itemExtra = {
                    ...changedItemExtra,
                    ...(itemExtra.LINENUM != null
                        ? { LINENUM: itemExtra.LINENUM }
                        : {}),
                    ...(itemExtra.MTRL != null ? { MTRL: itemExtra.MTRL } : {}),
                };
            }

            const data = await updateEditableItem(payload);

            setOriginalFields(fields);
            setOriginalItemExtra(itemExtra);
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
        loadRequestIdRef.current += 1;
        clearSearchState();
        setIsEditModalOpen(false);
        setLoadedKey("");
        setOriginalFields({});
        setFields({});
        setOriginalItemExtra(getEmptyItemExtraFields());
        setItemExtra(getEmptyItemExtraFields());
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
                        loading={searchingItems}
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
                            <div
                                className="hidden gap-4 px-4 text-xs font-medium text-gray-500 sm:grid sm:grid-cols-[11rem_minmax(0,1fr)_11rem]"
                                aria-hidden
                            >
                                <span>Κωδικός</span>
                                <span>Περιγραφή</span>
                                <span className="text-right">Κωδικός 2</span>
                            </div>
                            {searchResults.map((item) => (
                                <button
                                    key={item.MTRL}
                                    type="button"
                                    onClick={() => handleItemSelect(item)}
                                    className="grid w-full gap-2 rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-800 dark:hover:border-brand-800 dark:hover:bg-brand-950/20 sm:grid-cols-[11rem_minmax(0,1fr)_11rem] sm:items-start sm:gap-4"
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs text-gray-500 sm:hidden">Κωδικός</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {item.ITEM_CODE || "—"}
                                        </p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-gray-500 sm:hidden">Περιγραφή</p>
                                        <p className="font-medium text-gray-800 dark:text-gray-100">
                                            {item.ITEM_DESCR || "—"}
                                        </p>
                                    </div>
                                    <div className="min-w-0 sm:text-right">
                                        <p className="text-xs text-gray-500 sm:hidden">Κωδικός 2</p>
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
                className="m-4 max-w-4xl"
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
                                {renderField("MTRUNIT1")}
                                {renderField("CODE2")}
                                {renderField("NAME", "md:col-span-2")}
                                {renderField("PRICEW")}
                            </div>

                            <div className="mt-6 grid gap-6 border-t border-gray-100 pt-6 dark:border-gray-800 md:grid-cols-2 md:gap-4">
                                <div className="grid gap-4">
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        Τιμές πώλησης (€)
                                    </h4>
                                    {EDIT_ITEM_CATALOG_PRICE_PAIRS.map(([leftName]) =>
                                        renderField(leftName)
                                    )}
                                </div>
                                <div className="grid gap-4">
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        Υπολογισμός τιμών βάσει SUFIX (€)
                                    </h4>
                                    {EDIT_ITEM_CATALOG_PRICE_PAIRS.map(([, rightName]) =>
                                        renderField(rightName)
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                {renderField("MTRMANFCTR")}
                                {renderField("VARCHAR1")}
                                {renderField("VARCHAR2")}
                                {renderField("VARCHAR3")}
                                {renderField("BOOL03")}
                                {renderField("CCCSUFIX")}
                            </div>

                            <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800">
                                <div className="block">
                                    <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        Θέσεις/Ραφια
                                    </span>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        {(["VARCHAR01", "VARCHAR02", "VARCHAR03"] as const).map(
                                            (name) => (
                                                <input
                                                    key={name}
                                                    type="text"
                                                    value={toItemEditInputValue(itemExtra[name])}
                                                    onChange={(event) =>
                                                        updateItemExtraField(
                                                            name,
                                                            event.target.value
                                                        )
                                                    }
                                                    className={INPUT_CLASS_NAME}
                                                    aria-label={`Θέσεις/Ραφια ${name}`}
                                                />
                                            )
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <div className="block">
                                        <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            Έλεγχος
                                        </span>
                                        <Bool03Dropdown
                                            value={toItemEditInputValue(itemExtra.BOOL03)}
                                            onChange={(nextValue) =>
                                                updateItemExtraField("BOOL03", nextValue)
                                            }
                                        />
                                    </div>

                                    <div className="block">
                                        <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            Ημερομηνία ελέγχου
                                        </span>
                                        <Date03Picker
                                            value={toItemEditInputValue(itemExtra.DATE03)}
                                            onChange={(nextValue) =>
                                                updateItemExtraField("DATE03", nextValue)
                                            }
                                        />
                                    </div>
                                </div>
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
