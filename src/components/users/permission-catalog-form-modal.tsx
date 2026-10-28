"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import Checkbox from "@/components/template-components/form/input/Checkbox";
import Label from "@/components/template-components/form/Label";
import { Check, Loader2 } from "@/lib/icons/lucide";
import { MODULE_GROUP_LABELS } from "@/lib/auth/permissions";
import { useSavePermissionCatalogMutation } from "@/hooks/queries/useUserQueries";
import type {
    NumericFlag,
    PermissionCatalog,
    PermissionCatalogEntry,
    PermissionCatalogType,
    SavePermsItem,
} from "@/lib/users/types";

const CATALOG_TYPE_LABELS: Record<PermissionCatalogType, string> = {
    MODULE: "Σελίδα",
    FEATURE: "Λειτουργία",
    BRANCH: "Κατάστημα",
};

type PermissionCatalogFormModalProps = {
    catalog: PermissionCatalog;
    type: PermissionCatalogType;
    /** Entry being edited; omitted when adding a new one. */
    entry?: PermissionCatalogEntry;
    onClose: () => void;
};

const INPUT_CLASS_NAME =
    "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";

/** Valid parents: menu groups for pages, pages for features, "branches" for branches. */
function getParentOptions(
    catalog: PermissionCatalog,
    type: PermissionCatalogType
): Array<{ code: string; label: string }> {
    if (type === "BRANCH") {
        return [{ code: "branches", label: "branches" }];
    }

    if (type === "FEATURE") {
        return catalog.modules.map((module) => ({
            code: module.code,
            label: module.descr || module.code,
        }));
    }

    const groupCodes = new Set([
        ...Object.keys(MODULE_GROUP_LABELS),
        ...catalog.modules.map((module) => module.parent),
    ]);
    return Array.from(groupCodes).map((code) => ({
        code,
        label: MODULE_GROUP_LABELS[code] ?? code,
    }));
}

export default function PermissionCatalogFormModal({
    catalog,
    type: initialType,
    entry,
    onClose,
}: PermissionCatalogFormModalProps) {
    const isEditing = entry !== undefined;
    const [type, setType] = useState<PermissionCatalogType>(initialType);
    const [code, setCode] = useState(entry?.code ?? "");
    const [parent, setParent] = useState(
        entry?.parent ?? (initialType === "BRANCH" ? "branches" : "")
    );
    const [descr, setDescr] = useState(entry?.descr ?? "");
    const [isActive, setIsActive] = useState<NumericFlag>(entry?.isActive ?? 1);
    const { mutateAsync: savePerms, isPending: saving } =
        useSavePermissionCatalogMutation();
    const parentOptions = useMemo(() => getParentOptions(catalog, type), [catalog, type]);

    const buildItem = (): SavePermsItem | null => {
        const trimmedCode = code.trim();
        const trimmedDescr = descr.trim();

        if (!trimmedCode) {
            toast.error("Ο κωδικός είναι υποχρεωτικός.");
            return null;
        }

        if (!parent) {
            toast.error("Επιλέξτε γονέα.");
            return null;
        }

        if (!isEditing) {
            const existing = catalog[
                type === "MODULE" ? "modules" : type === "FEATURE" ? "features" : "branches"
            ].some((item) => item.code.toLocaleLowerCase() === trimmedCode.toLocaleLowerCase());

            if (existing) {
                toast.error(`Υπάρχει ήδη ${CATALOG_TYPE_LABELS[type].toLocaleLowerCase("el")} με κωδικό ${trimmedCode}.`);
                return null;
            }

            return { type, code: trimmedCode, parent, descr: trimmedDescr, isActive };
        }

        // Only the changed fields are sent; the rest keep their current value.
        const item: SavePermsItem = { type, code: entry.code };
        if (parent !== entry.parent) item.parent = parent;
        if (trimmedDescr && trimmedDescr !== entry.descr) item.descr = trimmedDescr;
        if (isActive !== entry.isActive) item.isActive = isActive;
        return item;
    };

    const handleSave = async () => {
        if (saving) return;
        const item = buildItem();
        if (!item) return;

        if (isEditing && Object.keys(item).length === 2) {
            toast("Δεν υπάρχουν αλλαγές για αποθήκευση.");
            return;
        }

        try {
            await savePerms([item]);
            toast.success(isEditing ? "Το δικαίωμα ενημερώθηκε." : "Το δικαίωμα δημιουργήθηκε.");
            onClose();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Η αποθήκευση δεν ολοκληρώθηκε."
            );
        }
    };

    return (
        <Modal isOpen onClose={onClose} className="m-4 max-w-xl">
            <div className="p-6 sm:p-8">
                <div className="pr-12">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                        Κατάλογος δικαιωμάτων
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                        {isEditing ? `Επεξεργασία ${entry.code}` : "Νέο δικαίωμα"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {isEditing
                            ? "Ο κωδικός δεν μπορεί να αλλάξει. Η απενεργοποίηση ισχύει για όλους τους χρήστες, και τους Super Admin."
                            : "Ο κωδικός πρέπει να ταιριάζει με αυτόν που ελέγχει η εφαρμογή."}
                    </p>
                </div>

                <div className="mt-7 grid gap-4">
                    <div>
                        <Label htmlFor="perm-type">Τύπος</Label>
                        <select
                            id="perm-type"
                            value={type}
                            disabled={isEditing}
                            onChange={(event) => {
                                const nextType = event.target.value as PermissionCatalogType;
                                setType(nextType);
                                setParent(nextType === "BRANCH" ? "branches" : "");
                            }}
                            className={INPUT_CLASS_NAME}
                        >
                            {(Object.keys(CATALOG_TYPE_LABELS) as PermissionCatalogType[]).map((option) => (
                                <option key={option} value={option}>
                                    {CATALOG_TYPE_LABELS[option]} ({option})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="perm-code">Κωδικός *</Label>
                        <input
                            id="perm-code"
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                            disabled={isEditing}
                            placeholder={type === "BRANCH" ? "π.χ. 1008" : "π.χ. stock-feedback"}
                            autoComplete="off"
                            className={INPUT_CLASS_NAME}
                        />
                    </div>
                    <div>
                        <Label htmlFor="perm-parent">Γονέας *</Label>
                        <select
                            id="perm-parent"
                            value={parent}
                            onChange={(event) => setParent(event.target.value)}
                            disabled={type === "BRANCH"}
                            className={INPUT_CLASS_NAME}
                        >
                            <option value="">Επιλέξτε γονέα</option>
                            {parentOptions.map((option) => (
                                <option key={option.code} value={option.code}>
                                    {option.label === option.code
                                        ? option.code
                                        : `${option.label} (${option.code})`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="perm-descr">Περιγραφή</Label>
                        <input
                            id="perm-descr"
                            value={descr}
                            onChange={(event) => setDescr(event.target.value)}
                            className={INPUT_CLASS_NAME}
                        />
                    </div>
                    <Checkbox
                        label="Ενεργό"
                        checked={isActive === 1}
                        onChange={(checked) => setIsActive(checked ? 1 : 0)}
                    />
                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row sm:justify-end">
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
                        disabled={saving}
                        className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {saving ? "Αποθήκευση..." : isEditing ? "Αποθήκευση αλλαγών" : "Δημιουργία"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
