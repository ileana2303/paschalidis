"use client";

import { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/template-components/common/PageBreadCrumb";
import SearchBar from "@/components/search/search-bar";
import { Check, Plus, Trash2 } from "@/lib/icons/lucide";
import { httpClient } from "@/lib/http/client";

type EditableValue = string | number | boolean | null;
type ItemFields = Record<string, EditableValue>;

type GetItemResponse = {
    success: boolean;
    message?: string;
    key?: string;
    item?: ItemFields;
};

type SaveItemResponse = {
    success: boolean;
    message?: string;
};

function toInputValue(value: EditableValue): string {
    return value == null ? "" : String(value);
}

export default function EditItemsClient() {
    const [searchKey, setSearchKey] = useState("");
    const [loadedKey, setLoadedKey] = useState("");
    const [originalFields, setOriginalFields] = useState<ItemFields>({});
    const [fields, setFields] = useState<ItemFields>({});
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldValue, setNewFieldValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fieldNames = useMemo(
        () => Object.keys(fields).sort((a, b) => {
            const preferred = ["CODE", "NAME", "CODE1", "CODE2", "APVCODE"];
            const aIndex = preferred.indexOf(a);
            const bIndex = preferred.indexOf(b);
            if (aIndex >= 0 || bIndex >= 0) {
                return (aIndex >= 0 ? aIndex : preferred.length) -
                    (bIndex >= 0 ? bIndex : preferred.length);
            }
            return a.localeCompare(b);
        }),
        [fields]
    );

    const hasChanges = useMemo(
        () => JSON.stringify(fields) !== JSON.stringify(originalFields),
        [fields, originalFields]
    );

    const loadItem = async () => {
        const key = searchKey.trim();
        if (!key || loading) return;

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const { data } = await httpClient.post<GetItemResponse>(
                "/api/items/edit",
                { key }
            );

            if (!data.success || !data.item) {
                throw new Error(data.message || "Το προϊόν δεν βρέθηκε.");
            }

            setLoadedKey(data.key || key);
            setOriginalFields(data.item);
            setFields(data.item);
        } catch (requestError) {
            setLoadedKey("");
            setOriginalFields({});
            setFields({});
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Η αναζήτηση δεν είναι διαθέσιμη προσωρινά."
            );
        } finally {
            setLoading(false);
        }
    };

    const updateField = (name: string, nextValue: string) => {
        setFields((current) => ({ ...current, [name]: nextValue }));
        setError("");
        setSuccess("");
    };

    const addField = () => {
        const name = newFieldName.trim().toUpperCase();

        if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
            setError("Το όνομα πεδίου επιτρέπεται να περιέχει λατινικά, αριθμούς και _.");
            return;
        }
        if (name in fields) {
            setError(`Το πεδίο ${name} υπάρχει ήδη.`);
            return;
        }

        setFields((current) => ({ ...current, [name]: newFieldValue }));
        setNewFieldName("");
        setNewFieldValue("");
        setError("");
        setSuccess("");
    };

    const removeAddedField = (name: string) => {
        if (name in originalFields) return;
        setFields((current) => {
            const next = { ...current };
            delete next[name];
            return next;
        });
    };

    const saveItem = async () => {
        if (!loadedKey || !hasChanges || saving) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const changedFields = Object.fromEntries(
                Object.entries(fields).filter(
                    ([name, fieldValue]) =>
                        !(name in originalFields) ||
                        fieldValue !== originalFields[name]
                )
            );
            const { data } = await httpClient.patch<SaveItemResponse>(
                "/api/items/edit",
                { key: loadedKey, fields: changedFields }
            );

            if (!data.success) {
                throw new Error(data.message || "Η αποθήκευση δεν ολοκληρώθηκε.");
            }

            setOriginalFields(fields);
            setSuccess(data.message || "Το προϊόν ενημερώθηκε επιτυχώς.");
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Η αποθήκευση δεν είναι διαθέσιμη προσωρινά."
            );
        } finally {
            setSaving(false);
        }
    };

    const clearSearch = () => {
        setSearchKey("");
        setLoadedKey("");
        setOriginalFields({});
        setFields({});
        setError("");
        setSuccess("");
    };

    return (
        <div className="mx-auto w-full max-w-6xl">
            <PageBreadcrumb pageTitle="Επεξεργασία Ειδών" />

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                <header className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-7">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">
                        SoftOne ITEM
                    </p>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Αναζήτηση είδους με KEY
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Εισαγάγετε το MTRL/KEY του είδους που θέλετε να επεξεργαστείτε.
                    </p>
                    <SearchBar
                        value={searchKey}
                        onChange={setSearchKey}
                        onSearch={() => void loadItem()}
                        onClear={clearSearch}
                        placeholder="π.χ. 451835"
                        loading={loading}
                        clearOnFocus={false}
                        containerClassName="mt-5 max-w-2xl"
                    />
                </header>

                <div className="p-5 sm:p-7">
                    {(error || success) && (
                        <div
                            role="status"
                            className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
                                error
                                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                                    : "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300"
                            }`}
                        >
                            {error || success}
                        </div>
                    )}

                    {!loadedKey ? (
                        <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-gray-200 px-6 text-center text-sm text-gray-500 dark:border-gray-800">
                            Αναζητήστε ένα είδος για να εμφανιστούν τα διαθέσιμα πεδία.
                        </div>
                    ) : (
                        <>
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs text-gray-500">Επεξεργασία KEY</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {loadedKey}
                                    </p>
                                </div>
                                {hasChanges && (
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                        Μη αποθηκευμένες αλλαγές
                                    </span>
                                )}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                {fieldNames.map((name) => (
                                    <label key={name} className="block">
                                        <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            {name}
                                            {!(name in originalFields) && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeAddedField(name)}
                                                    className="inline-flex items-center gap-1 font-normal text-red-500 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Αφαίρεση
                                                </button>
                                            )}
                                        </span>
                                        <input
                                            type="text"
                                            value={toInputValue(fields[name])}
                                            onChange={(event) =>
                                                updateField(name, event.target.value)
                                            }
                                            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                        />
                                    </label>
                                ))}
                            </div>

                            <div className="mt-7 rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
                                <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">
                                    Προσθήκη επιπλέον πεδίου
                                </p>
                                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                                    <input
                                        type="text"
                                        value={newFieldName}
                                        onChange={(event) => setNewFieldName(event.target.value)}
                                        placeholder="ΟΝΟΜΑ ΠΕΔΙΟΥ"
                                        className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm uppercase text-gray-800 outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        value={newFieldValue}
                                        onChange={(event) => setNewFieldValue(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") addField();
                                        }}
                                        placeholder="Τιμή"
                                        className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={addField}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-brand-200 px-4 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:border-brand-800 dark:hover:bg-brand-950/30"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Προσθήκη
                                    </button>
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
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                    {saving ? "Αποθήκευση..." : "Αποθήκευση αλλαγών"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
