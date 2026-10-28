"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import Checkbox from "@/components/template-components/form/input/Checkbox";
import Label from "@/components/template-components/form/Label";
import { Check, Crown, Loader2, MapPin, Shield } from "@/lib/icons/lucide";
import { formatBranchLabel } from "@/lib/auth/branches";
import { MODULE_GROUP_LABELS } from "@/lib/auth/permissions";
import {
    useFetchUsersMutation,
    useSaveUserMutation,
} from "@/hooks/queries/useUserQueries";
import type {
    NumericFlag,
    PermissionCatalog,
    PermissionCatalogEntry,
    SaveUserRoutePayload,
    UserPermission,
    UserWithPermissions,
} from "@/lib/users/types";

type UserFormModalProps = {
    isOpen: boolean;
    record: UserWithPermissions | null;
    catalog: PermissionCatalog;
    onClose: () => void;
    onSaved: (record: UserWithPermissions) => void;
};

/** Active permission codes selected in the form. */
type SelectedPermissions = {
    modules: string[];
    features: string[];
    branches: string[];
};

type PermissionKind = keyof SelectedPermissions;

type UserFormState = {
    username: string;
    password: string;
    fname: string;
    lname: string;
    email: string;
    mobile: string;
    role: string;
    mainBranch: string;
    isActive: NumericFlag;
    isSuperAdmin: NumericFlag;
    isCustomer: NumericFlag;
    trdr: string;
    permissions: SelectedPermissions;
};

type PermissionGroup = {
    code: string;
    label: string;
    modules: Array<{
        module: PermissionCatalogEntry;
        features: PermissionCatalogEntry[];
    }>;
};

const INPUT_CLASS_NAME =
    "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";

function activeCodes(entries: UserPermission[] | undefined): string[] {
    return (entries ?? [])
        .filter((entry) => entry.isActive === 1)
        .map((entry) => String(entry.code ?? "").trim())
        .filter(Boolean);
}

/** Store-management pages are reserved for admins: last in the form, off for plain users. */
const ADMIN_GROUP_CODE = "company-management";

/**
 * Default selection: every active permission for a SuperAdmin; for a regular
 * user everything except the store-management (company-management) pages.
 */
function defaultPermissions(
    catalog: PermissionCatalog,
    isSuperAdmin: boolean
): SelectedPermissions {
    const modules = catalog.modules
        .filter(
            (module) =>
                module.isActive === 1 &&
                (isSuperAdmin || module.parent !== ADMIN_GROUP_CODE)
        )
        .map((module) => module.code);

    return {
        modules,
        features: catalog.features
            .filter(
                (feature) => feature.isActive === 1 && modules.includes(feature.parent)
            )
            .map((feature) => feature.code),
        branches: catalog.branches
            .filter((branch) => branch.isActive === 1)
            .map((branch) => branch.code),
    };
}

/** Keeps the main branch when still allowed, otherwise falls back to the first allowed one. */
function resolveMainBranch(mainBranch: string, branches: string[]) {
    return branches.includes(mainBranch) ? mainBranch : branches[0] ?? "";
}

function createFormState(
    record: UserWithPermissions | null,
    catalog: PermissionCatalog
): UserFormState {
    if (!record) {
        return {
            username: "",
            password: "",
            fname: "",
            lname: "",
            email: "",
            mobile: "",
            role: "User",
            mainBranch: defaultPermissions(catalog, false).branches[0] ?? "",
            isActive: 1,
            isSuperAdmin: 0,
            isCustomer: 0,
            trdr: "",
            permissions: defaultPermissions(catalog, false),
        };
    }

    const { user, permissions } = record;
    return {
        username: user.username,
        password: "",
        fname: user.fname ?? "",
        lname: user.lname ?? "",
        email: user.email ?? "",
        mobile: user.mobile ?? "",
        role: user.role ?? "",
        mainBranch: user.mainBranch ?? "",
        isActive: user.isActive === 1 ? 1 : 0,
        isSuperAdmin: user.isSuperAdmin === 1 ? 1 : 0,
        isCustomer: user.isCustomer === 1 ? 1 : 0,
        trdr: user.trdr > 0 ? String(user.trdr) : "",
        permissions: {
            modules: activeCodes(permissions.modules),
            features: activeCodes(permissions.features),
            branches: activeCodes(permissions.branches),
        },
    };
}

function sameCodes(left: string[], right: string[]) {
    return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function permissionsEqual(left: SelectedPermissions, right: SelectedPermissions) {
    return (
        sameCodes(left.modules, right.modules) &&
        sameCodes(left.features, right.features) &&
        sameCodes(left.branches, right.branches)
    );
}

function isNotFoundResponse(error: string | undefined) {
    const message = String(error ?? "").toLocaleLowerCase("el");
    return message.includes("δεν βρέθηκε") || message.includes("not found");
}

/** Catalog modules grouped by menu group, each with its features. */
function buildPermissionGroups(catalog: PermissionCatalog): PermissionGroup[] {
    const groupCodes = Array.from(
        new Set(["menu", ...catalog.modules.map((module) => module.parent)])
    );

    // The admin group always goes last.
    groupCodes.sort(
        (left, right) =>
            Number(left === ADMIN_GROUP_CODE) - Number(right === ADMIN_GROUP_CODE)
    );

    return groupCodes.flatMap((code) => {
        const modules = catalog.modules
            .filter((module) => module.parent === code)
            .map((module) => ({
                module,
                features: catalog.features.filter(
                    (feature) => feature.parent === module.code
                ),
            }));

        return modules.length > 0
            ? [{ code, label: MODULE_GROUP_LABELS[code] ?? code, modules }]
            : [];
    });
}

function PermissionCheckbox({
    entry,
    checked,
    disabled = false,
    onChange,
}: {
    entry: PermissionCatalogEntry;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}) {
    const inactive = entry.isActive !== 1;

    return (
        <div
            title={inactive ? `${entry.code}: απενεργοποιημένο για όλους` : entry.code}
            className={inactive ? "line-through" : undefined}
        >
            <Checkbox
                label={entry.descr || entry.code}
                checked={checked}
                disabled={disabled || inactive}
                onChange={onChange}
            />
        </div>
    );
}

function PermissionTree({
    groups,
    selected,
    onToggle,
    onToggleGroup,
}: {
    groups: PermissionGroup[];
    selected: SelectedPermissions;
    onToggle: (kind: PermissionKind, code: string, checked: boolean) => void;
    onToggleGroup: (group: PermissionGroup, checked: boolean) => void;
}) {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {groups.map((group) => {
                const activeModules = group.modules.filter(
                    ({ module }) => module.isActive === 1
                );
                const allChecked =
                    activeModules.length > 0 &&
                    activeModules.every(({ module }) =>
                        selected.modules.includes(module.code)
                    );

                const isAdminGroup = group.code === ADMIN_GROUP_CODE;

                return (
                    <section
                        key={group.code}
                        className={isAdminGroup
                            ? "rounded-xl border border-amber-200/80 bg-amber-50/30 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.03]"
                            : "rounded-xl border border-gray-200 p-4 dark:border-gray-800"}
                    >
                        <div className={`flex items-center justify-between gap-3 border-b pb-3 ${isAdminGroup
                            ? "border-amber-100 dark:border-amber-500/10"
                            : "border-gray-100 dark:border-gray-800"}`}
                        >
                            {isAdminGroup ? (
                                <h5 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white">
                                    <Crown className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                                    {group.label}
                                    <span className="rounded-full border border-amber-200 px-1.5 py-px text-[10px] font-medium text-amber-700 dark:border-amber-500/30 dark:text-amber-300">
                                        Admin
                                    </span>
                                </h5>
                            ) : (
                                <h5 className="text-sm font-semibold text-gray-800 dark:text-white">
                                    {group.label}
                                </h5>
                            )}
                            <button
                                type="button"
                                onClick={() => onToggleGroup(group, !allChecked)}
                                disabled={activeModules.length === 0}
                                className="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-40 dark:text-brand-400"
                            >
                                {allChecked ? "Κανένα" : "Όλα"}
                            </button>
                        </div>

                        <ul className="mt-3 space-y-3">
                            {group.modules.map(({ module, features }) => {
                                const moduleChecked = selected.modules.includes(module.code);

                                return (
                                    <li key={module.code}>
                                        <PermissionCheckbox
                                            entry={module}
                                            checked={moduleChecked}
                                            onChange={(checked) =>
                                                onToggle("modules", module.code, checked)
                                            }
                                        />
                                        {features.length > 0 && (
                                            <ul className="mt-2 ml-6 space-y-2 border-l-2 border-gray-100 pl-3 dark:border-gray-800">
                                                {features.map((feature) => (
                                                    <li key={feature.code}>
                                                        <PermissionCheckbox
                                                            entry={feature}
                                                            checked={selected.features.includes(feature.code)}
                                                            disabled={!moduleChecked}
                                                            onChange={(checked) =>
                                                                onToggle("features", feature.code, checked)
                                                            }
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
}

export default function UserFormModal({
    isOpen,
    record,
    catalog,
    onClose,
    onSaved,
}: UserFormModalProps) {
    const [form, setForm] = useState<UserFormState>(() =>
        createFormState(record, catalog)
    );
    const { mutateAsync: lookupUser, isPending: checkingUsername } =
        useFetchUsersMutation();
    const { mutateAsync: submitUser, isPending: saving } = useSaveUserMutation();
    const isEditing = record !== null;

    const permissionGroups = useMemo(() => buildPermissionGroups(catalog), [catalog]);
    const branchOptions = useMemo(() => {
        const catalogCodes = new Set(catalog.branches.map((branch) => branch.code));
        const additionalCodes = [
            ...form.permissions.branches,
            ...(form.mainBranch ? [form.mainBranch] : []),
        ].filter((code) => code && !catalogCodes.has(code));

        return [
            ...catalog.branches,
            ...Array.from(new Set(additionalCodes)).map(
                (code): PermissionCatalogEntry => ({
                    code,
                    parent: "branches",
                    descr: "",
                    isActive: 1,
                })
            ),
        ];
    }, [catalog.branches, form.mainBranch, form.permissions.branches]);

    const updateText = (
        field:
            | "username"
            | "password"
            | "fname"
            | "lname"
            | "email"
            | "mobile"
            | "role"
            | "mainBranch"
            | "trdr",
        value: string
    ) => setForm((current) => ({ ...current, [field]: value }));

    const updateFlag = (
        field: "isActive" | "isSuperAdmin" | "isCustomer",
        checked: boolean
    ) =>
        setForm((current) => {
            const next = {
                ...current,
                [field]: checked ? 1 : 0,
                ...(field === "isCustomer" && !checked ? { trdr: "" } : {}),
            };

            if (field !== "isSuperAdmin" || (!checked && isEditing)) return next;

            const permissions = defaultPermissions(catalog, checked);
            return {
                ...next,
                permissions,
                mainBranch: resolveMainBranch(current.mainBranch, permissions.branches),
            };
        });

    const togglePermission = (kind: PermissionKind, code: string, checked: boolean) =>
        setForm((current) => {
            const codes = current.permissions[kind];
            return {
                ...current,
                permissions: {
                    ...current.permissions,
                    [kind]: checked
                        ? Array.from(new Set([...codes, code]))
                        : codes.filter((entry) => entry !== code),
                },
            };
        });

    const toggleGroup = (group: PermissionGroup, checked: boolean) =>
        setForm((current) => {
            const moduleCodes = group.modules
                .filter(({ module }) => module.isActive === 1)
                .map(({ module }) => module.code);
            const featureCodes = group.modules.flatMap(({ module, features }) =>
                module.isActive === 1
                    ? features
                        .filter((feature) => feature.isActive === 1)
                        .map((feature) => feature.code)
                    : []
            );
            const apply = (codes: string[], groupCodes: string[]) =>
                checked
                    ? Array.from(new Set([...codes, ...groupCodes]))
                    : codes.filter((code) => !groupCodes.includes(code));

            return {
                ...current,
                permissions: {
                    ...current.permissions,
                    modules: apply(current.permissions.modules, moduleCodes),
                    features: apply(current.permissions.features, featureCodes),
                },
            };
        });

    const toggleBranch = (branchCode: string, checked: boolean) => {
        setForm((current) => {
            const branches = checked
                ? Array.from(new Set([...current.permissions.branches, branchCode]))
                : current.permissions.branches.filter((code) => code !== branchCode);

            return {
                ...current,
                mainBranch: resolveMainBranch(current.mainBranch, branches),
                permissions: { ...current.permissions, branches },
            };
        });
    };

    const buildPayload = (): SaveUserRoutePayload | null => {
        const username = form.username.trim();
        const { branches } = form.permissions;

        if (!username) {
            toast.error("Το username είναι υποχρεωτικό.");
            return null;
        }

        if (!isEditing && !form.password.trim()) {
            toast.error("Ο κωδικός πρόσβασης είναι υποχρεωτικός για νέο χρήστη.");
            return null;
        }

        if (form.isCustomer === 1) {
            const trdr = Number(form.trdr);
            if (!Number.isInteger(trdr) || trdr <= 0) {
                toast.error(
                    "Ο πελάτης χρήστης πρέπει να έχει έγκυρο TRDR μεγαλύτερο του 0."
                );
                return null;
            }
        }

        if (
            branches.length > 0 &&
            (!form.mainBranch || !branches.includes(form.mainBranch))
        ) {
            toast.error(
                "Επιλέξτε κύριο κατάστημα από τα επιτρεπόμενα καταστήματα."
            );
            return null;
        }

        // saveUser replaces all permissions, so the full selection is always sent.
        const permissions = {
            modules: form.permissions.modules,
            features: form.permissions.features,
            branches,
        };
        const user: SaveUserRoutePayload["user"] = { username };
        const textFields = [
            "fname",
            "lname",
            "email",
            "mobile",
            "role",
            "mainBranch",
        ] as const;

        if (!isEditing) {
            user.password = form.password;
            for (const field of textFields) {
                if (form[field].trim()) user[field] = form[field].trim();
            }
            user.isActive = form.isActive;
            user.isSuperAdmin = form.isSuperAdmin;
            user.isCustomer = form.isCustomer;
            user.trdr = form.isCustomer === 1 ? Number(form.trdr) : 0;

            return { user, permissions };
        }

        const original = record.user;
        for (const field of textFields) {
            const nextValue = form[field].trim();
            const previousValue = String(original[field] ?? "").trim();
            if (nextValue && nextValue !== previousValue) user[field] = nextValue;
        }

        if (form.password.length > 0) user.password = form.password;
        if (form.isActive !== original.isActive) user.isActive = form.isActive;
        if (form.isSuperAdmin !== original.isSuperAdmin) {
            user.isSuperAdmin = form.isSuperAdmin;
        }
        if (form.isCustomer !== original.isCustomer) {
            user.isCustomer = form.isCustomer;
        }
        if (
            form.isCustomer === 1 &&
            Number(form.trdr) !== Number(original.trdr)
        ) {
            user.trdr = Number(form.trdr);
        }

        return { user, permissions };
    };

    const handleSave = async () => {
        if (saving || checkingUsername) return;
        const payload = buildPayload();
        if (!payload) return;

        if (
            isEditing &&
            Object.keys(payload.user).length === 1 &&
            permissionsEqual(form.permissions, createFormState(record, catalog).permissions)
        ) {
            toast("Δεν υπάρχουν αλλαγές για αποθήκευση.");
            return;
        }

        try {
            if (!isEditing) {
                const lookup = await lookupUser(form.username.trim());
                const alreadyExists =
                    lookup.success === true &&
                    (lookup.users ?? []).some(
                        (entry) =>
                            entry.user.username.toLocaleLowerCase() ===
                            form.username.trim().toLocaleLowerCase()
                    );

                if (alreadyExists) {
                    toast.error("Υπάρχει ήδη χρήστης με αυτό το username.");
                    return;
                }

                if (lookup.success !== true && !isNotFoundResponse(lookup.error)) {
                    throw new Error(
                        lookup.error?.trim() ||
                            "Δεν ήταν δυνατός ο έλεγχος του username."
                    );
                }
            }

            const response = await submitUser(payload);
            const savedRecord = response.users?.[0];
            if (!savedRecord) {
                throw new Error("Η αποθήκευση ολοκληρώθηκε χωρίς στοιχεία χρήστη.");
            }

            onSaved(savedRecord);
            toast.success(
                isEditing
                    ? "Ο χρήστης ενημερώθηκε."
                    : "Ο χρήστης δημιουργήθηκε."
            );
            onClose();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Η αποθήκευση δεν ολοκληρώθηκε."
            );
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-5xl">
            <div className="p-6 sm:p-8">
                <div className="pr-12">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                        User Management
                    </p>
                    <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                        {isEditing ? `Επεξεργασία ${record.user.username}` : "Νέος χρήστης"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {isEditing
                            ? "Ο νέος κωδικός είναι προαιρετικός. Κενές τιμές δεν διαγράφουν υπάρχοντα στοιχεία."
                            : "Το username και ο κωδικός πρόσβασης είναι υποχρεωτικά."}
                    </p>
                </div>

                <div className="mt-7 grid gap-4 md:grid-cols-2">
                    <div>
                        <Label htmlFor="user-username">Username *</Label>
                        <input
                            id="user-username"
                            value={form.username}
                            onChange={(event) => updateText("username", event.target.value)}
                            disabled={isEditing}
                            autoComplete="off"
                            className={INPUT_CLASS_NAME}
                        />
                    </div>
                    <div>
                        <Label htmlFor="user-password">
                            {isEditing ? "Νέος κωδικός" : "Κωδικός πρόσβασης *"}
                        </Label>
                        <input
                            id="user-password"
                            type="password"
                            value={form.password}
                            onChange={(event) => updateText("password", event.target.value)}
                            autoComplete="new-password"
                            placeholder={isEditing ? "Αφήστε κενό για να μη μεταβληθεί" : ""}
                            className={INPUT_CLASS_NAME}
                        />
                    </div>
                    <div>
                        <Label htmlFor="user-fname">Όνομα</Label>
                        <input id="user-fname" value={form.fname} onChange={(event) => updateText("fname", event.target.value)} className={INPUT_CLASS_NAME} />
                    </div>
                    <div>
                        <Label htmlFor="user-lname">Επώνυμο</Label>
                        <input id="user-lname" value={form.lname} onChange={(event) => updateText("lname", event.target.value)} className={INPUT_CLASS_NAME} />
                    </div>
                    <div>
                        <Label htmlFor="user-email">Email</Label>
                        <input id="user-email" type="email" value={form.email} onChange={(event) => updateText("email", event.target.value)} className={INPUT_CLASS_NAME} />
                    </div>
                    <div>
                        <Label htmlFor="user-mobile">Κινητό</Label>
                        <input id="user-mobile" value={form.mobile} onChange={(event) => updateText("mobile", event.target.value)} className={INPUT_CLASS_NAME} />
                    </div>
                    <div>
                        <Label htmlFor="user-role">Ρόλος</Label>
                        <input id="user-role" value={form.role} onChange={(event) => updateText("role", event.target.value)} placeholder="π.χ. User, admin" className={INPUT_CLASS_NAME} />
                    </div>
                    <div>
                        <Label htmlFor="user-trdr">TRDR{form.isCustomer === 1 ? " *" : ""}</Label>
                        <input
                            id="user-trdr"
                            type="number"
                            min="1"
                            step="1"
                            value={form.trdr}
                            onChange={(event) => updateText("trdr", event.target.value)}
                            disabled={form.isCustomer !== 1}
                            placeholder={form.isCustomer === 1 ? "Κωδικός πελάτη" : "Μόνο για χρήστες πελάτες"}
                            className={INPUT_CLASS_NAME}
                        />
                    </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:grid-cols-3">
                    <Checkbox label="Ενεργός" checked={form.isActive === 1} onChange={(checked) => updateFlag("isActive", checked)} />
                    <Checkbox label="Super Admin" checked={form.isSuperAdmin === 1} onChange={(checked) => updateFlag("isSuperAdmin", checked)} />
                    <Checkbox label="Πελάτης" checked={form.isCustomer === 1} onChange={(checked) => updateFlag("isCustomer", checked)} />
                </div>


                <div className="mt-7 flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                    <MapPin className="h-4 w-4 text-brand-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                        Καταστήματα
                    </h4>
                    <span className="text-xs text-gray-500">
                        Επιλέξτε πού μπορεί να εργαστεί ο χρήστης και ορίστε ένα ως κύριο.
                    </span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {branchOptions.map((branch) => {
                        const allowed = form.permissions.branches.includes(branch.code);
                        const isMain = allowed && form.mainBranch === branch.code;

                        return (
                            <div
                                key={branch.code}
                                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition ${isMain
                                    ? "border-brand-300 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10"
                                    : "border-gray-200 dark:border-gray-800"}`}
                            >
                                <PermissionCheckbox
                                    entry={{
                                        ...branch,
                                        descr: formatBranchLabel(branch.code, branch.descr),
                                    }}
                                    checked={allowed}
                                    onChange={(checked) => toggleBranch(branch.code, checked)}
                                />
                                {allowed && (
                                    <button
                                        type="button"
                                        onClick={() => updateText("mainBranch", branch.code)}
                                        aria-pressed={isMain}
                                        title={isMain ? "Κύριο κατάστημα" : "Ορισμός ως κύριο"}
                                        className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition ${isMain
                                            ? "bg-brand-500 text-white"
                                            : "border border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400"}`}
                                    >
                                        {isMain && <Check className="h-3 w-3" />}
                                        {isMain ? "Κύριο" : "Ορισμός κύριου"}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
                {form.permissions.branches.length === 0 && (
                    <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                        Δεν έχει επιλεγεί κατάστημα.
                    </p>
                )}

                <div className="mt-7 flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                    <Shield className="h-4 w-4 text-brand-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                        Δικαιώματα
                    </h4>
                    <span className="text-xs text-gray-500">
                        Οι λειτουργίες ισχύουν μόνο όταν είναι επιλεγμένη η σελίδα τους.
                    </span>
                </div>

                <div className="mt-4">
                    <PermissionTree
                        groups={permissionGroups}
                        selected={form.permissions}
                        onToggle={togglePermission}
                        onToggleGroup={toggleGroup}
                    />
                </div>

                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 dark:border-gray-800 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving || checkingUsername}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        Ακύρωση
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={saving || checkingUsername}
                        className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                    >
                        {saving || checkingUsername ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" />
                        )}
                        {checkingUsername
                            ? "Έλεγχος username..."
                            : saving
                              ? "Αποθήκευση..."
                              : isEditing
                                ? "Αποθήκευση αλλαγών"
                                : "Δημιουργία χρήστη"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
