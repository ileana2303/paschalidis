"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import Checkbox from "@/components/template-components/form/input/Checkbox";
import Label from "@/components/template-components/form/Label";
import { Modal } from "@/components/ui/modal";
import { useSaveSuffixMutation } from "@/hooks/queries/useSuffixManagementQuery";
import { AlertCircle, Check, Loader2 } from "@/lib/icons/lucide";
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
  const { mutateAsync: saveSuffix, isPending: saving } =
    useSaveSuffixMutation();

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
          <SectionTitle>Προμηθευτής</SectionTitle>
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
