"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import Checkbox from "@/components/template-components/form/input/Checkbox";
import Label from "@/components/template-components/form/Label";
import { Modal } from "@/components/ui/modal";
import { useSearchSuppliersMutation } from "@/hooks/queries/useApiMutations";
import { useSaveSuffixMutation } from "@/hooks/queries/useSuffixManagementQuery";
import { AlertCircle, Check, Loader2, Search, Truck, X } from "@/lib/icons/lucide";
import type { ISupplierRow } from "@/lib/interface";
import {
  buildSuffixPartialUpdate,
  createSuffixEditForm,
  hasSuffixChanges,
  PERCENTAGE_FIELDS,
  type SuffixEditFormState,
  type SuffixEditPercentageField,
  type SuffixEditTextField,
} from "@/lib/suffix-management/partial-update";
import { getSuffixSaveOutcome } from "@/lib/suffix-management/save-result";
import type {
  SuffixB2B,
  SuffixGroup,
  SuffixRow,
} from "@/lib/suffix-management/types";

type SuffixEditModalProps = {
  isOpen: boolean;
  record: SuffixRow;
  groups: SuffixGroup[];
  b2b: SuffixB2B[];
  onClose: () => void;
  onSaved: () => void | Promise<unknown>;
};

const INPUT_CLASS_NAME =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";

const TEXTAREA_CLASS_NAME = `${INPUT_CLASS_NAME} min-h-24 resize-y`;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-4 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-white">
      {children}
    </h4>
  );
}

export default function SuffixEditModal({
  isOpen,
  record,
  groups,
  b2b,
  onClose,
  onSaved,
}: SuffixEditModalProps) {
  const [form, setForm] = useState<SuffixEditFormState>(() =>
    createSuffixEditForm(record)
  );
  const [saveError, setSaveError] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierResults, setSupplierResults] = useState<ISupplierRow[]>([]);
  const [supplierSearchError, setSupplierSearchError] = useState("");
  const [hasSearchedSuppliers, setHasSearchedSuppliers] = useState(false);
  const { mutateAsync: saveSuffix, isPending: saving } =
    useSaveSuffixMutation();
  const { mutateAsync: searchSuppliers, isPending: searchingSuppliers } =
    useSearchSuppliersMutation();

  const partialUpdate = useMemo(
    () => buildSuffixPartialUpdate({ original: record, form, groups, b2b }),
    [b2b, form, groups, record]
  );
  const hasChanges =
    hasSuffixChanges(partialUpdate.update) || partialUpdate.errors.length > 0;
  const changedFieldCount = Math.max(
    0,
    Object.keys(partialUpdate.update).length - 1
  );
  const missingGroup =
    record.ZGROUP_ID > 0 &&
    !groups.some((group) => group.ZGROUP_ID === record.ZGROUP_ID);
  const missingB2B =
    record.ZB2B_ID > 0 &&
    !b2b.some((entry) => entry.ZB2B_ID === record.ZB2B_ID);
  const hasSuggestedSupplier = Boolean(
    form.SUGGESTED_TRDR ||
      form.SUGGESTED_TRDR_CODE ||
      form.SUGGESTED_TRDR_NAME
  );
  const canSearchSuppliers = supplierSearch.trim().length >= 3;

  const updateText = (field: SuffixEditTextField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaveError("");
  };

  const updatePercentage = (
    field: SuffixEditPercentageField,
    value: string
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaveError("");
  };

  const handleSupplierSearch = async () => {
    const search = supplierSearch.trim();

    if (search.length < 3 || searchingSuppliers) {
      setSupplierSearchError(
        "Πληκτρολογήστε τουλάχιστον 3 χαρακτήρες για αναζήτηση."
      );
      return;
    }

    setSupplierSearchError("");

    try {
      const response = await searchSuppliers(search);
      setSupplierResults(response.rows ?? []);
      setHasSearchedSuppliers(true);
    } catch (error) {
      setSupplierResults([]);
      setHasSearchedSuppliers(true);
      setSupplierSearchError(
        error instanceof Error
          ? error.message
          : "Αποτυχία αναζήτησης προμηθευτών."
      );
    }
  };

  const selectSuggestedSupplier = (supplier: ISupplierRow) => {
    setForm((current) => ({
      ...current,
      SUGGESTED_TRDR: String(supplier.TRDR ?? ""),
      SUGGESTED_TRDR_CODE: String(supplier.CODE ?? ""),
      SUGGESTED_TRDR_NAME: String(supplier.NAME ?? ""),
    }));
    setSupplierSearch("");
    setSupplierResults([]);
    setHasSearchedSuppliers(false);
    setSupplierSearchError("");
    setSaveError("");
  };

  const clearSuggestedSupplier = () => {
    setForm((current) => ({
      ...current,
      SUGGESTED_TRDR: "",
      SUGGESTED_TRDR_CODE: "",
      SUGGESTED_TRDR_NAME: "",
    }));
    setSupplierSearchError("");
    setSaveError("");
  };

  const handleSave = async () => {
    if (saving || !hasChanges) return;

    if (partialUpdate.errors.length > 0) {
      const message = partialUpdate.errors.join(" ");
      setSaveError(message);
      toast.error(message);
      return;
    }

    try {
      setSaveError("");
      const response = await saveSuffix({ rows: [partialUpdate.update] });
      const outcome = getSuffixSaveOutcome(response);

      if (outcome.saved > 0) {
        await onSaved();
      }

      if (outcome.completed) {
        toast.success(outcome.message);
        onClose();
        return;
      }

      setSaveError(outcome.message);
      toast.error(outcome.message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Η αποθήκευση του suffix δεν ολοκληρώθηκε.";
      setSaveError(message);
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      className="m-4 max-w-5xl"
    >
      <div className="p-6 sm:p-8">
        <div className="pr-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Suffix Management
          </p>
          <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
            Επεξεργασία suffix {record.SOSUFIX}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Αποστέλλονται μόνο τα πεδία που αλλάζουν. Η εκκαθάριση ενός
            πεδίου αποστέλλεται ως κενή τιμή.
          </p>
        </div>

        {saveError ? (
          <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{saveError}</p>
          </div>
        ) : null}

        <section className="mt-7">
          <SectionTitle>Βασικά στοιχεία</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="suffix-key">SOSUFIX</Label>
              <input
                id="suffix-key"
                value={record.SOSUFIX}
                disabled
                className={`${INPUT_CLASS_NAME} font-mono`}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Κλειδί εγγραφής — δεν μπορεί να τροποποιηθεί.
              </p>
            </div>
            <div>
              <Label htmlFor="suffix-name">Όνομα</Label>
              <input
                id="suffix-name"
                value={form.NAME}
                onChange={(event) => updateText("NAME", event.target.value)}
                className={INPUT_CLASS_NAME}
              />
            </div>
          </div>
        </section>

        <section className="mt-7">
          <SectionTitle>Κατηγοριοποίηση</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="suffix-group">Group</Label>
              <select
                id="suffix-group"
                value={form.ZGROUP_ID}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    ZGROUP_ID: event.target.value,
                  }));
                  setSaveError("");
                }}
                className={INPUT_CLASS_NAME}
              >
                <option value="0">Μη αντιστοιχισμένο</option>
                {missingGroup ? (
                  <option value={record.ZGROUP_ID} disabled>
                    {record.ZGROUP_CODE || `ID ${record.ZGROUP_ID}`} — μη διαθέσιμο
                  </option>
                ) : null}
                {groups.map((group) => (
                  <option key={group.ZGROUP_ID} value={group.ZGROUP_ID}>
                    {group.ZGROUP_CODE || `ID ${group.ZGROUP_ID}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="suffix-b2b">B2B</Label>
              <select
                id="suffix-b2b"
                value={form.ZB2B_ID}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    ZB2B_ID: event.target.value,
                  }));
                  setSaveError("");
                }}
                className={INPUT_CLASS_NAME}
              >
                <option value="0">Μη αντιστοιχισμένο</option>
                {missingB2B ? (
                  <option value={record.ZB2B_ID} disabled>
                    {record.ZB2B_CODE || `ID ${record.ZB2B_ID}`} — μη διαθέσιμο
                  </option>
                ) : null}
                {b2b.map((entry) => (
                  <option key={entry.ZB2B_ID} value={entry.ZB2B_ID}>
                    {entry.ZB2B_CODE || `ID ${entry.ZB2B_ID}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <SectionTitle>Προτεινόμενος προμηθευτής</SectionTitle>

          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Τρέχουσα επιλογή
              </p>
              {hasSuggestedSupplier ? (
                <>
                  <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {form.SUGGESTED_TRDR_NAME || "Χωρίς όνομα"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Κωδικός: {form.SUGGESTED_TRDR_CODE || "—"} · TRDR:{" "}
                    {form.SUGGESTED_TRDR || "—"}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Δεν έχει οριστεί προτεινόμενος προμηθευτής.
                </p>
              )}
            </div>

            {hasSuggestedSupplier ? (
              <button
                type="button"
                onClick={clearSuggestedSupplier}
                disabled={saving}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-600 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
                Καθαρισμός
              </button>
            ) : null}
          </div>

          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSupplierSearch();
            }}
          >
            <Label htmlFor="suggested-supplier-search">
              Αλλαγή προτεινόμενου προμηθευτή
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="suggested-supplier-search"
                  value={supplierSearch}
                  onChange={(event) => {
                    setSupplierSearch(event.target.value);
                    setSupplierResults([]);
                    setHasSearchedSuppliers(false);
                    setSupplierSearchError("");
                  }}
                  placeholder="Όνομα, κωδικός ή ΑΦΜ"
                  autoComplete="off"
                  className={`${INPUT_CLASS_NAME} pl-9`}
                />
              </div>
              <button
                type="submit"
                disabled={!canSearchSuppliers || searchingSuppliers || saving}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
              >
                {searchingSuppliers ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {searchingSuppliers ? "Αναζήτηση..." : "Αναζήτηση"}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Πληκτρολογήστε τουλάχιστον 3 χαρακτήρες και πατήστε Enter ή
              Αναζήτηση.
            </p>
          </form>

          {supplierSearchError ? (
            <div className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{supplierSearchError}</p>
            </div>
          ) : null}

          {searchingSuppliers ? (
            <div className="mt-3 flex items-center justify-center rounded-xl border border-gray-200 py-7 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand-500" />
              Αναζήτηση προμηθευτών...
            </div>
          ) : supplierResults.length > 0 ? (
            <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {supplierResults.map((supplier, index) => (
                  <button
                    key={`${supplier.TRDR}-${supplier.CODE}-${index}`}
                    type="button"
                    onClick={() => selectSuggestedSupplier(supplier)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-brand-50 focus:bg-brand-50 focus:outline-none dark:hover:bg-brand-500/10 dark:focus:bg-brand-500/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                        {supplier.NAME || "Χωρίς όνομα"}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                        Κωδικός: {supplier.CODE || "—"} · ΑΦΜ:{" "}
                        {supplier.AFM || "—"} · TRDR: {supplier.TRDR || "—"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-brand-600 dark:text-brand-400">
                      Επιλογή
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : hasSearchedSuppliers && !supplierSearchError ? (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-7 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <Truck className="h-4 w-4" />
              Δεν βρέθηκαν προμηθευτές.
            </div>
          ) : null}
        </section>

        <section className="mt-7">
          <SectionTitle>Ποσοστά</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PERCENTAGE_FIELDS.map((field) => (
              <div key={field}>
                <Label htmlFor={`suffix-${field}`}>{field}</Label>
                <input
                  id={`suffix-${field}`}
                  type="number"
                  step="any"
                  value={form[field]}
                  onChange={(event) =>
                    updatePercentage(field, event.target.value)
                  }
                  className={INPUT_CLASS_NAME}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Αφήστε ένα ποσοστό κενό για να διαγραφεί η υπάρχουσα τιμή του.
          </p>
        </section>

        <section className="mt-7">
          <SectionTitle>Προμηθευτής Πασχαλίδη</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="suffix-supplier-code">Κωδικός προμηθευτή</Label>
              <input
                id="suffix-supplier-code"
                value={form.SUPPLIER_CODE}
                onChange={(event) =>
                  updateText("SUPPLIER_CODE", event.target.value)
                }
                className={INPUT_CLASS_NAME}
              />
            </div>
            <div>
              <Label htmlFor="suffix-supplier-name">Όνομα προμηθευτή</Label>
              <input
                id="suffix-supplier-name"
                value={form.SUPPLIER_NAME}
                onChange={(event) =>
                  updateText("SUPPLIER_NAME", event.target.value)
                }
                className={INPUT_CLASS_NAME}
              />
            </div>
          </div>
        </section>

        <section className="mt-7">
          <SectionTitle>Σημειώσεις</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="suffix-remarks">Remarks</Label>
              <textarea
                id="suffix-remarks"
                value={form.REMARKS}
                onChange={(event) => updateText("REMARKS", event.target.value)}
                className={TEXTAREA_CLASS_NAME}
              />
            </div>
            <div>
              <Label htmlFor="suffix-notes">Notes</Label>
              <textarea
                id="suffix-notes"
                value={form.NOTES}
                onChange={(event) => updateText("NOTES", event.target.value)}
                className={TEXTAREA_CLASS_NAME}
              />
            </div>
          </div>
        </section>

        <section className="mt-7 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <SectionTitle>Κατάσταση</SectionTitle>
          <Checkbox
            label="Ενεργό suffix"
            checked={form.ISACTIVE === 1}
            onChange={(checked) => {
              setForm((current) => ({
                ...current,
                ISACTIVE: checked ? 1 : 0,
              }));
              setSaveError("");
            }}
            disabled={saving}
          />
        </section>

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            {hasChanges
              ? `${changedFieldCount || 1} πεδία έχουν αλλάξει.`
              : "Δεν υπάρχουν αλλαγές."}
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Ακύρωση
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !hasChanges}
              className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? "Αποθήκευση..." : "Αποθήκευση αλλαγών"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
