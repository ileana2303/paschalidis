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
                "mt-2 grid grid-cols-1 gap-x-3 gap-y-2 rounded-lg border border-gray-200 bg-white/70 p-3 sm:grid-cols-2 dark:border-gray-800 dark:bg-gray-900/60",
                className,
            ].join(" ")}
        >
            {DETAIL_FIELDS.map((field) => (
                <p
                    key={field.label}
                    className="min-w-0 text-xs text-gray-700 dark:text-gray-200"
                >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                        {field.label}:
                    </span>{" "}
                    {formatDetailValue(field.getValue(item))}
                </p>
            ))}
        </div>
    );
}
