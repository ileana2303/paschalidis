const BRANCH_NAME_BY_CODE = {
  "1001": "Κασομούλη",
  "1006": "Λ. Αθηνών",
  "1007": "Λ. Μεσογείων",
} as const;

type KnownBranchCode = keyof typeof BRANCH_NAME_BY_CODE;

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export function normalizeBranchCode(value: string | number | null | undefined) {
  return String(value ?? "").trim();
}

export function getKnownBranchName(
  branchCode: string | number | null | undefined
) {
  const code = normalizeBranchCode(branchCode) as KnownBranchCode;
  return BRANCH_NAME_BY_CODE[code];
}

export function resolveBranchName(
  branchCode: string | number | null | undefined,
  branchName?: string | null
) {
  const code = normalizeBranchCode(branchCode);
  if (!code) return "—";

  const knownName = getKnownBranchName(code);
  if (knownName) return knownName;

  const normalizedName = normalizeText(branchName);
  return normalizedName || code;
}

export function formatBranchLabel(
  branchCode: string | number | null | undefined,
  branchName?: string | null
) {
  const code = normalizeBranchCode(branchCode);
  if (!code) return "—";

  const resolvedName = resolveBranchName(code, branchName);
  return resolvedName === code ? code : `${resolvedName} (${code})`;
}
