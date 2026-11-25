import { getEndoBranchLabel } from "@/lib/auth/branches";

type BuildEndoCommentsParams = {
    /** BASKETID of the ENDO row - appears as "Νο<basketId>" in the comment. */
    basketId: string;
    /** Branch that holds and sends the items. */
    supplyingBranch: number;
    /** Branch that asked for the items. */
    requestingBranch: number;
};

export function buildEndoComments({
    basketId,
    supplyingBranch,
    requestingBranch,
}: BuildEndoCommentsParams) {
    const from = getEndoBranchLabel(supplyingBranch);
    const to = getEndoBranchLabel(requestingBranch);

    return `ΠΑΡΑΣΤΑΤΙΚΟ Νο${basketId} ΑΠΟ ${from} ΣΕ ${to} ${supplyingBranch}-->${requestingBranch}`;
}

type BuildEndoPriorityCommentsParams = Omit<
    BuildEndoCommentsParams,
    "basketId"
> & {
    customerName?: string;
};

export function buildEndoPriorityComments({
    supplyingBranch,
    requestingBranch,
    customerName,
}: BuildEndoPriorityCommentsParams) {
    const from = `${getEndoBranchLabel(supplyingBranch)} (${supplyingBranch})`;
    const to = `${getEndoBranchLabel(requestingBranch)} (${requestingBranch})`;
    const customer = String(customerName ?? "").trim();

    return `ΠΑΡΑΣΤΑΤΙΚΟ PRIORITY ΑΠΟ ${from} ΠΡΟΣ ${to}${customer ? ` ΓΙΑ ΠΕΛΑΤΗ ${customer}` : ""}`;
}
