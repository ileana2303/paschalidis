import type { IBasketItem } from "@/lib/interface";

interface BasketItemDetailsProps {
    item: IBasketItem;
    className?: string;
}

type BasketItemDetailField = {
    label: string;
    getValue: (item: IBasketItem) => unknown;
};

const DETAIL_FIELDS: BasketItemDetailField[] = [
    { label: "MTRL", getValue: (item) => item.MTRL },
    { label: "PRICE_ERP", getValue: (item) => item.PRICE_ERP },
    { label: "PRICE_REQ", getValue: (item) => item.PRICE_REQ },
    { label: "IS_APROVED", getValue: (item) => item.IS_APROVED },
    { label: "ADDED", getValue: (item) => item.BASKET_DATE },
    { label: "COMPANY", getValue: (item) => item.COMPANY },
    { label: "CODE", getValue: (item) => item.CODE },
    { label: "CODE2", getValue: (item) => item.CODE2 },
    { label: "BASKET_QTY", getValue: (item) => item.BASKET_QTY },
    { label: "BASKET_ERP_PRICE", getValue: (item) => item.BASKET_ERP_PRICE },
    { label: "BASKET_REQ_PRICE", getValue: (item) => item.BASKET_REQ_PRICE },
    { label: "BargainStatus", getValue: (item) => item.BargainStatus },
    { label: "ITEM_CODE", getValue: (item) => item.ITEM_CODE },
];

function formatDetailValue(value: unknown) {
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue || "-";
}

export default function BasketItemDetails({
    item,
    className = "",
}: BasketItemDetailsProps) {
    return (
        <div
            className={[
                "grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:grid-cols-3 lg:grid-cols-6",
                className,
            ].join(" ")}
        >
            {DETAIL_FIELDS.map((field) => (
                <div
                    key={field.label}
                    className="min-w-0 text-xs"
                >
                    <div className="text-[10px] text-gray-400">{field.label}</div>
                    <div className="mt-0.5 break-words text-gray-800 dark:text-gray-200">
                        {formatDetailValue(field.getValue(item))}
                    </div>
                </div>
            ))}
        </div>
    );
}
