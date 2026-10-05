"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import Checkbox from "@/components/template-components/form/input/Checkbox";
import Label from "@/components/template-components/form/Label";
import {
    Check,
    Loader2,
    Plus,
    Shield,
    Trash2,
} from "@/lib/icons/lucide";
import { formatBranchLabel, getKnownBranchOptions } from "@/lib/auth/branches";
import {
    useFetchUsersMutation,
    useSaveUserMutation,
} from "@/hooks/queries/useUserQueries";
import type {
    AppUser,
    NumericFlag,
    SaveUserRoutePayload,
    UserPermission,
    UserPermissions,
    UserWithPermissions,
} from "@/lib/users/types";

type UserFormModalProps = {
    isOpen: boolean;
    record: UserWithPermissions | null;
    onClose: () => void;
    onSaved: (record: UserWithPermissions) => void;
};

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
    permissions: UserPermissions;
};

const INPUT_CLASS_NAME =
    "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:disabled:bg-gray-800";

function emptyPermissions(): UserPermissions {
    return { modules: [], features: [], branches: [] };
}

function normalizePermissions(
    permissions: UserPermissions | null | undefined
): UserPermissions {
    return {
        modules: (permissions?.modules ?? []).map((entry) => ({
            code: String(entry.code ?? "").trim(),
            rights: Number(entry.rights),
        })),
        features: (permissions?.features ?? []).map((entry) => ({
            code: String(entry.code ?? "").trim(),
            rights: Number(entry.rights),
        })),
        branches: (permissions?.branches ?? [])
            .map((branch) => String(branch).trim())
            .filter(Boolean),
    };
}

function createFormState(record: UserWithPermissions | null): UserFormState {
    if (!record) {
        return {
            username: "",
            password: "",
            fname: "",
            lname: "",
            email: "",
            mobile: "",
            role: "User",
            mainBranch: "",
            isActive: 1,
            isSuperAdmin: 0,
            isCustomer: 0,
            trdr: "",
            permissions: emptyPermissions(),
        };
    }

    const { user } = record;
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
        permissions: normalizePermissions(record.permissions),
    };
}

function permissionsEqual(left: UserPermissions, right: UserPermissions) {
    return (
        JSON.stringify(normalizePermissions(left)) ===
        JSON.stringify(normalizePermissions(right))
    );
}

function isNotFoundResponse(error: string | undefined) {
    const message = String(error ?? "").toLocaleLowerCase("el");
    return message.includes("δεν βρέθηκε") || message.includes("not found");
}

function validatePermissionEntries(
    entries: UserPermission[],
    label: string
): string | null {
    const codes = new Set<string>();

    for (const entry of entries) {
        const code = entry.code.trim();
        if (!code) return `Συμπληρώστε τον κωδικό σε όλα τα ${label}.`;
        if (!Number.isInteger(entry.rights) || entry.rights < 0) {
            return `Τα δικαιώματα στα ${label} πρέπει να είναι μη αρνητικοί ακέραιοι.`;
        }

        const normalizedCode = code.toLocaleLowerCase();
        if (codes.has(normalizedCode)) {
            return `Ο κωδικός ${code} υπάρχει περισσότερες από μία φορές στα ${label}.`;
        }
        codes.add(normalizedCode);
    }

    return null;
}

function PermissionRows({
    title,
    entries,
    onChange,
}: {
    title: string;
    entries: UserPermission[];
    onChange: (entries: UserPermission[]) => void;
}) {
    return (
        <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h5 className="text-sm font-semibold text-gray-800 dark:text-white">
                        {title}
                    </h5>
                    <p className="mt-0.5 text-xs text-gray-500">
                        Κωδικός δικαιώματος και αριθμητικό rights.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onChange([...entries, { code: "", rights: 1 }])}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Προσθήκη
                </button>
            </div>

            {entries.length === 0 ? (
                <p className="mt-4 rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-500 dark:bg-gray-800/50">
                    Δεν υπάρχουν καταχωρήσεις.
                </p>
            ) : (
                <div className="mt-4 space-y-2">
                    {entries.map((entry, index) => (
                        <div
                            key={`${title}-${index}`}
                            className="grid grid-cols-[minmax(0,1fr)_7rem_2.5rem] gap-2"
                        >
                            <input
                                value={entry.code}
                                onChange={(event) => {
                                    const next = [...entries];
                                    next[index] = { ...entry, code: event.target.value };
                                    onChange(next);
                                }}
                                placeholder="π.χ. search-parts"
                                aria-label={`${title} κωδικός ${index + 1}`}
                                className={INPUT_CLASS_NAME}
                            />
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={entry.rights}
                                onChange={(event) => {
                                    const next = [...entries];
                                    next[index] = {
                                        ...entry,
                                        rights: Number(event.target.value),
                                    };
                                    onChange(next);
                                }}
                                aria-label={`${title} rights ${index + 1}`}
                                className={INPUT_CLASS_NAME}
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    onChange(
                                        entries.filter(
                                            (_, itemIndex) => itemIndex !== index
                                        )
                                    )
                                }
                                aria-label={`Αφαίρεση από ${title}`}
                                className="flex h-11 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default function UserFormModal({
    isOpen,
    record,
    onClose,
    onSaved,
}: UserFormModalProps) {
    const [form, setForm] = useState<UserFormState>(() => createFormState(record));
    const { mutateAsync: lookupUser, isPending: checkingUsername } =
        useFetchUsersMutation();
    const { mutateAsync: submitUser, isPending: saving } = useSaveUserMutation();
    const isEditing = record !== null;

    useEffect(() => {
        if (isOpen) {
            setForm(createFormState(record));
        }
    }, [isOpen, record]);

    const branchOptions = useMemo(() => {
        const knownOptions = getKnownBranchOptions();
        const knownCodes = new Set(knownOptions.map((branch) => branch.code));
        const additionalCodes = [
            ...form.permissions.branches,
            ...(form.mainBranch ? [form.mainBranch] : []),
        ].filter((code) => code && !knownCodes.has(code));

        return [
            ...knownOptions,
            ...Array.from(new Set(additionalCodes)).map((code) => ({
                code,
                label: code,
            })),
        ];
    }, [form.mainBranch, form.permissions.branches]);

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
        setForm((current) => ({
            ...current,
            [field]: checked ? 1 : 0,
            ...(field === "isCustomer" && !checked ? { trdr: "" } : {}),
        }));

    const updatePermissions = (permissions: Partial<UserPermissions>) =>
        setForm((current) => ({
            ...current,
            permissions: { ...current.permissions, ...permissions },
        }));

    const toggleBranch = (branchCode: string, checked: boolean) => {
        setForm((current) => {
            const branches = checked
                ? Array.from(new Set([...current.permissions.branches, branchCode]))
                : current.permissions.branches.filter((code) => code !== branchCode);

            return {
                ...current,
                mainBranch:
                    !checked && current.mainBranch === branchCode
                        ? ""
                        : current.mainBranch,
                permissions: { ...current.permissions, branches },
            };
        });
    };

    const buildPayload = (): SaveUserRoutePayload | null => {
        const username = form.username.trim();
        const currentBranches = normalizePermissions(form.permissions).branches;
        const originalBranches = record
            ? normalizePermissions(record.permissions).branches
            : [];
        const branchConfigurationChanged =
            !isEditing ||
            form.mainBranch.trim() !==
                String(record.user.mainBranch ?? "").trim() ||
            JSON.stringify(currentBranches) !== JSON.stringify(originalBranches);

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
            branchConfigurationChanged &&
            form.mainBranch &&
            !form.permissions.branches.includes(form.mainBranch)
        ) {
            toast.error(
                "Το κύριο κατάστημα πρέπει να ανήκει στα επιτρεπόμενα καταστήματα."
            );
            return null;
        }

        if (
            branchConfigurationChanged &&
            form.permissions.branches.length > 0 &&
            !form.mainBranch
        ) {
            toast.error(
                "Επιλέξτε κύριο κατάστημα από τα επιτρεπόμενα καταστήματα."
            );
            return null;
        }

        if (
            isEditing &&
            branchConfigurationChanged &&
            record.user.mainBranch &&
            form.permissions.branches.length === 0
        ) {
            toast.error(
                "Δεν μπορείτε να αφαιρέσετε όλα τα καταστήματα όσο υπάρχει κύριο κατάστημα."
            );
            return null;
        }

        const permissionError =
            validatePermissionEntries(form.permissions.modules, "modules") ??
            validatePermissionEntries(form.permissions.features, "features");
        if (permissionError) {
            toast.error(permissionError);
            return null;
        }

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

            return {
                user,
                permissions: normalizePermissions(form.permissions),
            };
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

        return {
            user,
            ...(!permissionsEqual(form.permissions, record.permissions)
                ? { permissions: normalizePermissions(form.permissions) }
                : {}),
        };
    };

    const handleSave = async () => {
        if (saving || checkingUsername) return;
        const payload = buildPayload();
        if (!payload) return;

        if (
            isEditing &&
            Object.keys(payload.user).length === 1 &&
            !payload.permissions
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
                        <Label htmlFor="user-main-branch">Κύριο κατάστημα</Label>
                        <select
                            id="user-main-branch"
                            value={form.mainBranch}
                            onChange={(event) => updateText("mainBranch", event.target.value)}
                            disabled={form.permissions.branches.length === 0}
                            className={INPUT_CLASS_NAME}
                        >
                            <option value="">Επιλέξτε κατάστημα</option>
                            {branchOptions
                                .filter((branch) => form.permissions.branches.includes(branch.code))
                                .map((branch) => (
                                    <option key={branch.code} value={branch.code}>
                                        {formatBranchLabel(branch.code, branch.label)}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:grid-cols-3">
                    <Checkbox label="Ενεργός" checked={form.isActive === 1} onChange={(checked) => updateFlag("isActive", checked)} />
                    <Checkbox label="Super Admin" checked={form.isSuperAdmin === 1} onChange={(checked) => updateFlag("isSuperAdmin", checked)} />
                    <Checkbox label="Πελάτης" checked={form.isCustomer === 1} onChange={(checked) => updateFlag("isCustomer", checked)} />
                </div>

                {form.isCustomer === 1 && (
                    <div className="mt-4 max-w-sm">
                        <Label htmlFor="user-trdr">TRDR *</Label>
                        <input
                            id="user-trdr"
                            type="number"
                            min="1"
                            step="1"
                            value={form.trdr}
                            onChange={(event) => updateText("trdr", event.target.value)}
                            className={INPUT_CLASS_NAME}
                        />
                        <p className="mt-1.5 text-xs text-gray-500">
                            Το 0 δεν αντιστοιχεί σε έγκυρο πελάτη.
                        </p>
                    </div>
                )}

                <div className="mt-7 flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                    <Shield className="h-4 w-4 text-brand-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                        Δικαιώματα
                    </h4>
                    <span className="text-xs text-gray-500">
                        Αποστέλλονται πάντα ως πλήρες σύνολο όταν αλλάξουν.
                    </span>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <PermissionRows title="Modules" entries={form.permissions.modules} onChange={(modules) => updatePermissions({ modules })} />
                    <PermissionRows title="Features" entries={form.permissions.features} onChange={(features) => updatePermissions({ features })} />
                </div>

                <section className="mt-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <h5 className="text-sm font-semibold text-gray-800 dark:text-white">
                        Επιτρεπόμενα καταστήματα
                    </h5>
                    <p className="mt-0.5 text-xs text-gray-500">
                        Ορίζουν πού μπορεί να αλλάξει ο χρήστης, όχι την προβολή αποθεμάτων άλλων καταστημάτων.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {branchOptions.map((branch) => (
                            <Checkbox
                                key={branch.code}
                                label={formatBranchLabel(branch.code, branch.label)}
                                checked={form.permissions.branches.includes(branch.code)}
                                onChange={(checked) => toggleBranch(branch.code, checked)}
                            />
                        ))}
                    </div>
                    {form.permissions.branches.length === 0 && (
                        <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                            Δεν έχει επιλεγεί κατάστημα.
                        </p>
                    )}
                </section>

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
