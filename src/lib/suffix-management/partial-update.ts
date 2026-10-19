import type {
  SoftOneFlag,
  SuffixB2B,
  SuffixGroup,
  SuffixRow,
  SuffixSaveRow,
} from "@/lib/suffix-management/types";

export type SuffixEditFormState = {
  NAME: string;
  ZGROUP_ID: string;
  ZB2B_ID: string;
  SUPPLIER_CODE: string;
  SUPPLIER_NAME: string;
  SUGGESTED_TRDR: string;
  SUGGESTED_TRDR_CODE: string;
  SUGGESTED_TRDR_NAME: string;
  PERCNT00: string;
  PERCNT01: string;
  PERCNT02: string;
  PERCNT03: string;
  PERCNT04: string;
  PERCNT05: string;
  PERCNT99: string;
  REMARKS: string;
  NOTES: string;
  ISACTIVE: SoftOneFlag;
};

export type SuffixEditTextField =
  | "NAME"
  | "SUPPLIER_CODE"
  | "SUPPLIER_NAME"
  | "REMARKS"
  | "NOTES";

export type SuffixEditPercentageField =
  | "PERCNT00"
  | "PERCNT01"
  | "PERCNT02"
  | "PERCNT03"
  | "PERCNT04"
  | "PERCNT05"
  | "PERCNT99";

const TEXT_FIELDS: SuffixEditTextField[] = [
  "NAME",
  "SUPPLIER_CODE",
  "SUPPLIER_NAME",
  "REMARKS",
  "NOTES",
];

export const PERCENTAGE_FIELDS: SuffixEditPercentageField[] = [
  "PERCNT00",
  "PERCNT01",
  "PERCNT02",
  "PERCNT03",
  "PERCNT04",
  "PERCNT05",
  "PERCNT99",
];

function formValue(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

export function createSuffixEditForm(row: SuffixRow): SuffixEditFormState {
  return {
    NAME: formValue(row.NAME),
    ZGROUP_ID: String(row.ZGROUP_ID),
    ZB2B_ID: String(row.ZB2B_ID),
    SUPPLIER_CODE: formValue(row.SUPPLIER_CODE),
    SUPPLIER_NAME: formValue(row.SUPPLIER_NAME),
    SUGGESTED_TRDR: formValue(row.SUGGESTED_TRDR),
    SUGGESTED_TRDR_CODE: formValue(row.SUGGESTED_TRDR_CODE),
    SUGGESTED_TRDR_NAME: formValue(row.SUGGESTED_TRDR_NAME),
    PERCNT00: formValue(row.PERCNT00),
    PERCNT01: formValue(row.PERCNT01),
    PERCNT02: formValue(row.PERCNT02),
    PERCNT03: formValue(row.PERCNT03),
    PERCNT04: formValue(row.PERCNT04),
    PERCNT05: formValue(row.PERCNT05),
    PERCNT99: formValue(row.PERCNT99),
    REMARKS: formValue(row.REMARKS),
    NOTES: formValue(row.NOTES),
    ISACTIVE: row.ISACTIVE === 1 ? 1 : 0,
  };
}

function parseSelectedId(
  value: string,
  validIds: Set<number>,
  label: string
): { value?: number; error?: string } {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return { error: `Η επιλογή ${label} δεν είναι έγκυρη.` };
  }

  if (parsed > 0 && !validIds.has(parsed)) {
    return { error: `Η επιλογή ${label} δεν υπάρχει στη φορτωμένη λίστα.` };
  }

  return { value: parsed };
}

export function buildSuffixPartialUpdate({
  original,
  form,
  groups,
  b2b,
}: {
  original: SuffixRow;
  form: SuffixEditFormState;
  groups: SuffixGroup[];
  b2b: SuffixB2B[];
}): { update: SuffixSaveRow; errors: string[] } {
  const update: SuffixSaveRow = { SOSUFIX: original.SOSUFIX };
  const errors: string[] = [];

  for (const field of TEXT_FIELDS) {
    if (form[field] !== formValue(original[field])) {
      update[field] = form[field];
    }
  }

  for (const field of PERCENTAGE_FIELDS) {
    if (form[field] === formValue(original[field])) continue;

    if (form[field] === "") {
      update[field] = "";
      continue;
    }

    const parsed = Number(form[field]);
    if (!Number.isFinite(parsed)) {
      errors.push(`Το ${field} πρέπει να είναι έγκυρος αριθμός ή κενό.`);
      continue;
    }

    update[field] = parsed;
  }

  if (form.ZGROUP_ID !== String(original.ZGROUP_ID)) {
    const result = parseSelectedId(
      form.ZGROUP_ID,
      new Set(groups.map((group) => group.ZGROUP_ID)),
      "Group"
    );
    if (result.error) errors.push(result.error);
    else if (result.value === 0) update.ZGROUP_CODE = "";
    else update.ZGROUP_ID = result.value;
  }

  if (form.ZB2B_ID !== String(original.ZB2B_ID)) {
    const result = parseSelectedId(
      form.ZB2B_ID,
      new Set(b2b.map((entry) => entry.ZB2B_ID)),
      "B2B"
    );
    if (result.error) errors.push(result.error);
    else if (result.value === 0) update.ZB2B_CODE = "";
    else update.ZB2B_ID = result.value;
  }

  const suggestedSupplierChanged =
    form.SUGGESTED_TRDR !== formValue(original.SUGGESTED_TRDR) ||
    form.SUGGESTED_TRDR_CODE !== formValue(original.SUGGESTED_TRDR_CODE) ||
    form.SUGGESTED_TRDR_NAME !== formValue(original.SUGGESTED_TRDR_NAME);

  if (suggestedSupplierChanged) {
    update.SUGGESTED_TRDR = form.SUGGESTED_TRDR;
    update.SUGGESTED_TRDR_CODE = form.SUGGESTED_TRDR_CODE;
    update.SUGGESTED_TRDR_NAME = form.SUGGESTED_TRDR_NAME;
  }

  if (form.ISACTIVE !== original.ISACTIVE) {
    update.IS_ACTIVE = form.ISACTIVE;
  }

  return { update, errors };
}

export function hasSuffixChanges(update: SuffixSaveRow) {
  return Object.keys(update).some((field) => field !== "SOSUFIX");
}
