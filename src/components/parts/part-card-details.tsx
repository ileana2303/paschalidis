import type { IItem } from "@/lib/interface";

interface PartCardDetailsProps {
    item: IItem;
    isExpanded: boolean;
    formatPrice: (price: number | string | null | undefined) => string;
}

export default function PartCardDetails({
    item,
    isExpanded,
    formatPrice,
}: PartCardDetailsProps) {
    return (
        <div
            className={`overflow-hidden transition-[max-height,opacity] duration-75 ease-out ${isExpanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
                }`}
        >
            <div className="border-t border-gray-100 px-4 py-4 text-sm dark:border-gray-800">
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="text-[10px] text-gray-400">Σύνολο</div>
                        <div className="font-semibold tabular-nums">{item.TOTAL_AVAIL}</div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="text-[10px] text-gray-400">Καθαρή Διαθ.</div>
                        <div className="font-semibold tabular-nums text-green-600 dark:text-green-400">
                            {item.NET_QTY_AVAILABLE}
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="text-[10px] text-gray-400">Δεσμ. Καλαθιού</div>
                        <div className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                            {item.BasketReserved}
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                        <div className="text-[10px] text-gray-400">Παραγγελίες</div>
                        <div className="font-semibold tabular-nums">{item.SoOrdered}</div>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Κωδικοί
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Κωδ. 2</span>
                            <span className="font-medium text-gray-800 dark:text-white">{item.ITEM_CODE2}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Ομοιος</span>
                            <span className="font-medium text-gray-800 dark:text-white">{item.ITEM_OMOIO || "—"}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">CODE1_0</span>
                            <span className="font-medium text-gray-800 dark:text-white">{item.CODE1_0 || "—"}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Κατάσταση Αποθέματος
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Σε εξέλιξη</span>
                            <span className="font-medium text-gray-800 dark:text-white">{item.ONGOING}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Καθαρή Διαθ.</span>
                            <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                                {item.NET_QTY_AVAILABLE}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mb-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Παραγγελίες
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Παραγγελθέντα</span>
                            <span className="font-medium text-gray-800 dark:text-white">{item.SoOrdered}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Δεσμευμένα</span>
                            <span className="font-medium text-gray-800 dark:text-white">{item.SoReserved}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Κατάσταση</span>
                            <span className="font-medium text-gray-800 dark:text-white">{item.STATUS_MOBILE || "—"}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Καλάθι
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Ποσότητα</span>
                            <span className="font-medium text-gray-800 dark:text-white">{item.BASKET_QTY}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Ημ/νία</span>
                            <span className="text-gray-500">
                                {item.BASKET_DATE !== "1900-01-01 00:00:00"
                                    ? item.BASKET_DATE
                                    : "—"}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Req. Τιμή</span>
                            <span className="font-medium text-gray-800 dark:text-white">
                                {formatPrice(item.BASKET_REQ_PRICE)}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">ERP Τιμή</span>
                            <span className="font-medium text-gray-800 dark:text-white">
                                {formatPrice(item.BASKET_ERP_PRICE)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Τιμές
                    </div>

                    {item.PRICE_MESSAGE && item.PRICE_MESSAGE !== "0" && (
                        <div className="mb-2 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                            {item.PRICE_MESSAGE}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Χονδρική</span>
                            <span>{formatPrice(item.PRICE_WHOLE)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Λιανική</span>
                            <span className="font-semibold">{formatPrice(item.PRICE_RETAIL)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Κόστος</span>
                            <span>{formatPrice(item.STANDCOST)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Τιμοκ. 01</span>
                            <span>{formatPrice(item.PRICER01)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Τιμοκ. 02</span>
                            <span>{formatPrice(item.PRICER02)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Τιμοκ. 03</span>
                            <span>{formatPrice(item.PRICER03)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
