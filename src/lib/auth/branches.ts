const BRANCH_NAME_BY_CODE = {
  "1000": "Κασομούλη",
  "1006": "Λ. Αθηνών",
  "1007": "Λ. Μεσογείων",
} as const;

type KnownBranchCode = keyof typeof BRANCH_NAME_BY_CODE;

const Secondary_BranchPriority: Record<KnownBranchCode, number> = {
  "1006": 0,
  "1000": 1,
  "1007": 2,
};

export function getStockBranchOrder(currentBranchCode: string): KnownBranchCode[] {
  const branchCodes = Object.keys(BRANCH_NAME_BY_CODE) as KnownBranchCode[];
  const currentBranch = currentBranchCode.trim() as KnownBranchCode;

  if (!branchCodes.includes(currentBranch)) return branchCodes;

  return [
    currentBranch,
    ...branchCodes
      .filter((branchCode) => branchCode !== currentBranch)
      .sort((a, b) => Secondary_BranchPriority[a] - Secondary_BranchPriority[b]),
  ];
}

const TRDBranchByBranchCode: Partial<Record<KnownBranchCode, number>> = {
  "1000": 15,
  "1006": 13,
  "1007": 14,
} as const;

const ENDO_BRANCH_LABEL_BY_CODE: Partial<Record<KnownBranchCode, string>> = {
  "1000": "Κασομούλη",
  "1006": "Πάροδος Λ.Αθηνών 65",
  "1007": "Λ.Μεσογείων 573",
} as const;

const SaldocSeriesByBranchCode: Partial<Record<KnownBranchCode, string>> = {
  "1000": "7002",
  "1006": "17002",
  "1007": "27002",
} as const;

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

export function getTrdBranchByBranchCode(
  branchCode: string | number | null | undefined
) {
  const code = normalizeBranchCode(branchCode) as KnownBranchCode;
  return TRDBranchByBranchCode[code];
}

export function getSaldocSeriesByBranchCode(
  branchCode: string | number | null | undefined
) {
  const code = normalizeBranchCode(branchCode) as KnownBranchCode;
  return SaldocSeriesByBranchCode[code];
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

export function getEndoBranchLabel(
  branchCode: string | number | null | undefined
) {
  const code = normalizeBranchCode(branchCode) as KnownBranchCode;
  return ENDO_BRANCH_LABEL_BY_CODE[code] ?? resolveBranchName(code);
}
