import { getEndoBranchLabel } from "@/lib/auth/branches";

type EndoRouteParams = {
    /** Branch that holds and sends the items. */
    supplyingBranch: number;
    /** Branch that asked for the items. */
    requestingBranch: number;
    customerName?: string;
};

/** `ΑΠΟ <label> (<code>) ΠΡΟΣ <label> (<code>)[ ΓΙΑ ΠΕΛΑΤΗ <name>]` - shared by ENDO and Priority. */
function describeEndoRoute({
    supplyingBranch,
    requestingBranch,
    customerName,
}: EndoRouteParams) {
    const from = `${getEndoBranchLabel(supplyingBranch)} (${supplyingBranch})`;
    const to = `${getEndoBranchLabel(requestingBranch)} (${requestingBranch})`;
    const customer = String(customerName ?? "").trim();

    return `ΑΠΟ ${from} ΠΡΟΣ ${to}${customer ? ` ΓΙΑ ΠΕΛΑΤΗ ${customer}` : ""}`;
}

type BuildEndoCommentsParams = EndoRouteParams & {
    /** BASKETID of the ENDO row - appears as "Νο<basketId>" in the comment. */
    basketId: string;
};

export function buildEndoComments({ basketId, ...route }: BuildEndoCommentsParams) {
    return `ΕΝΔΟΔΙΑΚΙΝΗΣΗ Νο${basketId} ${describeEndoRoute(route)}`;
}

/** Priority also has a BASKETID: the one reserved via NOW_ENDO_INSERT (= SERIESNUM). */
export function buildEndoPriorityComments({ basketId, ...route }: BuildEndoCommentsParams) {
    return `PRIORITY ΕΝΔΟΔΙΑΚΙΝΗΣΗ Νο${basketId} ${describeEndoRoute(route)}`;
}
