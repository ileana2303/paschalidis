"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import Checkbox from "@/components/template-components/form/input/Checkbox";
import Label from "@/components/template-components/form/Label";
import { Modal } from "@/components/ui/modal";
import { useSaveSuffixMutation } from "@/hooks/queries/useSuffixManagementQuery";
import { AlertCircle, Check, Loader2 } from "@/lib/icons/lucide";
import { getSuffixSaveOutcome } from "@/lib/suffix-management/save-result";
import type {
  B2BSaveRow,
  GroupSaveRow,
  SoftOneFlag,
} from "@/lib/suffix-management/types";

export type ReferenceEditRecord = {
  id: number;
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: SoftOneFlag;
};

type ReferenceEditModalProps = {
  kind: "groups" | "b2b";
  record?: ReferenceEditRecord;
  onClose: () => void;
  onSaved: () => void | Promise<unknown>;
};

type FormState = {
  code: string;
  name: string;
  description: string;
  sortOrder: string;
  isActive: SoftOneFlag;
};

const INPUT_CLASS_NAME =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";

export default function ReferenceEditModal({
  kind,
  record,
  onClose,
  onSaved,
}: ReferenceEditModalProps) {
  const isGroup = kind === "groups";
  const isCreating = !record;
  const entityLabel = isGroup ? "Group" : "B2B";
  const codeField = isGroup ? "ZGROUP_CODE" : "ZB2B_CODE";
  const nameField = isGroup ? "ZGROUP_NAME" : "ZB2B_NAME";
  const [form, setForm] = useState<FormState>(() => ({
    code: record?.code ?? "",
    name: record?.name ?? "",
    description: record?.description ?? "",
    sortOrder: String(record?.sortOrder ?? 0),
    isActive: record?.isActive ?? 1,
  }));
  const [saveError, setSaveError] = useState("");
  const { mutateAsync: saveRows, isPending: saving } = useSaveSuffixMutation();

  const changedFieldCount = useMemo(() => {
    if (!record) return form.code.trim() ? 5 : 0;

    return [
      form.name !== record.name,
      form.description !== record.description,
      form.sortOrder !== String(record.sortOrder),
      form.isActive !== record.isActive,
    ].filter(Boolean).length;
  }, [form, record]);

  const updateForm = <Field extends keyof FormState>(
    field: Field,
    value: FormState[Field]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaveError("");
  };

  const handleSave = async () => {
    if (saving || changedFieldCount === 0) return;

    const code = isCreating ? form.code.trim() : record.code;
    if (!code) {
      const message = `Το ${codeField} είναι υποχρεωτικό.`;
      setSaveError(message);
      toast.error(message);
      return;
    }

    const sortOrder = Number(form.sortOrder);
    if (!Number.isInteger(sortOrder)) {
      const message = "Το SORT_ORDER πρέπει να είναι ακέραιος αριθμός.";
      setSaveError(message);
      toast.error(message);
      return;
    }

    try {
      setSaveError("");
      let response;

      if (isGroup) {
        const row: GroupSaveRow = { ZGROUP_CODE: code };

        if (isCreating || form.name !== record.name) row.ZGROUP_NAME = form.name;
        if (isCreating || form.description !== record.description) {
          row.DESCR = form.description;
        }
        if (isCreating || form.sortOrder !== String(record.sortOrder)) {
          row.SORT_ORDER = sortOrder;
        }
        if (isCreating || form.isActive !== record.isActive) {
          row.IS_ACTIVE = form.isActive;
        }

        response = await saveRows({ kind: "GROUP", rows: [row] });
      } else {
        const row: B2BSaveRow = { ZB2B_CODE: code };

        if (isCreating || form.name !== record.name) row.ZB2B_NAME = form.name;
        if (isCreating || form.description !== record.description) {
          row.DESCR = form.description;
        }
        if (isCreating || form.sortOrder !== String(record.sortOrder)) {
          row.SORT_ORDER = sortOrder;
        }
        if (isCreating || form.isActive !== record.isActive) {
          row.IS_ACTIVE = form.isActive;
        }

        response = await saveRows({ kind: "B2B", rows: [row] });
      }

      const outcome = getSuffixSaveOutcome(response);

      if (outcome.saved > 0) await onSaved();

      if (outcome.completed) {
        toast.success(outcome.message);
        onClose();
        return;
      }

      setSaveError(outcome.message);
      toast.error(outcome.message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Η αποθήκευση δεν ολοκληρώθηκε.";
      setSaveError(message);
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saving) onClose();
      }}
      className="m-4 max-w-2xl"
    >
      <div className="p-6 sm:p-8">
        <div className="pr-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            {entityLabel} Management
          </p>
          <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
            {isCreating ? `Νέο ${entityLabel}` : `Επεξεργασία ${record.code}`}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isCreating
              ? "Συμπληρώστε τα στοιχεία της νέας εγγραφής."
              : "Αποστέλλονται μόνο τα πεδία που αλλάζουν."}
          </p>
        </div>

        {saveError ? (
          <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{saveError}</p>
          </div>
        ) : null}

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="reference-code">{codeField}</Label>
            <input
              id="reference-code"
              value={form.code}
              onChange={(event) => updateForm("code", event.target.value)}
              disabled={!isCreating || saving}
              className={`${INPUT_CLASS_NAME} font-mono`}
            />
            {!isCreating ? (
              <p className="mt-1.5 text-xs text-gray-500">
                Κλειδί εγγραφής — δεν μπορεί να τροποποιηθεί.
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="reference-name">{nameField}</Label>
            <input
              id="reference-name"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              disabled={saving}
              className={INPUT_CLASS_NAME}
            />
          </div>
          <div>
            <Label htmlFor="reference-sort-order">SORT_ORDER</Label>
            <input
              id="reference-sort-order"
              type="number"
              step="1"
              value={form.sortOrder}
              onChange={(event) => updateForm("sortOrder", event.target.value)}
              disabled={saving}
              className={INPUT_CLASS_NAME}
            />
          </div>
          <div className="flex items-end pb-2">
            <Checkbox
              label="Ενεργό"
              checked={form.isActive === 1}
              onChange={(checked) => updateForm("isActive", checked ? 1 : 0)}
              disabled={saving}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="reference-description">DESCR</Label>
            <textarea
              id="reference-description"
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              disabled={saving}
              className={`${INPUT_CLASS_NAME} min-h-24 resize-y`}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-lg border border-gray-300 px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Ακύρωση
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || changedFieldCount === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isCreating ? "Δημιουργία" : "Αποθήκευση"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
