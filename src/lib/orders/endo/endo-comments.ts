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
>;

export function buildEndoPriorityComments({
    supplyingBranch,
    requestingBranch,
}: BuildEndoPriorityCommentsParams) {
    const from = getEndoBranchLabel(supplyingBranch);
    const to = getEndoBranchLabel(requestingBranch);

    return `ΠΑΡΑΣΤΑΤΙΚΟ PRIORITY ΑΠΟ ${from} ΣΕ ${to} ${supplyingBranch}-->${requestingBranch}`;
}
