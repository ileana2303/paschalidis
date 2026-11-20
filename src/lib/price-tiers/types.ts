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

/** A customer currently assigned to a customer group (BCUSTOMERS_BY_GROUP). */
export interface PriceTierGroupCustomer {
    trdr: string;
    code: string;
    name: string;
    email: string;
    phone: string;
    taxId: string;
    address: string;
    zip: string;
    city: string;
    priceTier: string;
    branchCount: string;
    trdpGroup: string;
    groupCode: string;
    groupName: string;
}

export interface PriceTierGroupCustomersRoutePayload {
    trdpGroup: string;
}

export interface PriceTierGroupCustomersResponse {
    success: boolean;
    message?: string;
    totalCount: number;
    customers: PriceTierGroupCustomer[];
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

export interface PriceTierAutoExecResponse {
    success: boolean;
    message?: string;
}
