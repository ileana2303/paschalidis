/** One cell of the tier grid (MTRGROUP × TRDPGROUP), normalized from TIER_LIST_ALL. */
export interface PriceTierCell {
    autoId: string;
    mtrGroup: string;
    mtrCode: string;
    mtrName: string;
    trdpGroup: string;
    trdCode: string;
    trdName: string;
    tier: string;
    isActive: boolean;
    /** CCCAPPUSER - absent when the cell has never been written. */
    lastUser?: string;
}

/** A customer group from TIER_TRDPGROUP. */
export interface PriceTierCustomerGroup {
    trdpGroup: string;
    code: string;
    name: string;
}

export interface PriceTierGridResponse {
    success: boolean;
    message?: string;
    cells: PriceTierCell[];
}

export interface PriceTierGroupsResponse {
    success: boolean;
    message?: string;
    groups: PriceTierCustomerGroup[];
}

export interface PriceTierSaveRoutePayload {
    autoId: string;
    tier: string;
}

export interface PriceTierSaveResponse {
    success: boolean;
    message?: string;
    autoId?: string;
    tier?: string;
    appUser?: string;
}

export interface PriceTierAssignRoutePayload {
    trdr: string;
    trdpGroup: string;
}

export interface PriceTierAssignResponse {
    success: boolean;
    message?: string;
    trdr?: string;
    trdpGroup?: string;
}
