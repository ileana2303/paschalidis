"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  BASKET_HISTORY_ORDER_ERROR,
  BASKET_HISTORY_ORDER_SECTIONS,
  BASKET_HISTORY_PATH,
  basketHistoryShowsPrices,
  mergeBasketHistoryOrderLines,
  type BasketHistoryOrderResponse,
} from "@/lib/basket-history";
import { formatEuro } from "@/lib/utils/number";

async function fetchOrder(findoc: string, source: string, signal: AbortSignal) {
  const query = new URLSearchParams({ source });
  const response = await fetch(
    `/api${BASKET_HISTORY_PATH}/orders/${encodeURIComponent(findoc)}?${query}`,
    { signal }
  );
  const result = (await response.json()) as BasketHistoryOrderResponse;
  if (!result.success) throw new Error(result.message);
  if (!response.ok) throw new Error(BASKET_HISTORY_ORDER_ERROR);
  return result.data;
}

const detailSections = ["SALDOC", "MTRDOC"] as const;

export default function BasketHistoryOrderDetails({
  findoc,
  source,
}: {
  findoc: string;
  source: string;
}) {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["basket-history", "order", findoc, source],
    queryFn: ({ signal }) => fetchOrder(findoc, source, signal),
    staleTime: 60_000,
    retry: false,
  });

  if (isPending) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Φόρτωση παραστατικού…
      </p>
    );
  }

  const lines = mergeBasketHistoryOrderLines(data);
  const showPrices = basketHistoryShowsPrices(source);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <p role="alert" className="text-red-700 dark:text-red-400">{error.message}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-lg border border-current px-2.5 py-1 font-semibold"
          >
            Δοκιμάστε ξανά
          </button>
        </div>
      )}
      {detailSections.map((section) => {
        const { title, fields } = BASKET_HISTORY_ORDER_SECTIONS[section];
        const rows = data?.[section];
        if (!rows?.length) return null;
        const columns = Object.entries(fields).filter(([field]) =>
          rows.some((row) => row[field])
        );
        if (columns.length === 0) return null;

        return (
          <section key={section} className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
            {rows.map((row, index) => (
              <dl key={index} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {columns.map(([field, label]) => row[field] && (
                  <div key={field} className="min-w-0">
                    <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</dt>
                    <dd className="whitespace-pre-wrap text-sm">{row[field]}</dd>
                  </div>
                ))}
              </dl>
            ))}
          </section>
        );
      })}
      {lines.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Λεπτομέρειες παραγγελίας</h4>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table aria-label="Λεπτομέρειες παραγγελίας" className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-xs font-semibold dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-3 py-2">Κωδικός είδους</th>
                  <th scope="col" className="px-3 py-2 text-right">Ποσότητα</th>
                  {showPrices && <th scope="col" className="px-3 py-2 text-right">Τιμή</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {lines.map(({ code, quantity, price }, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 font-medium">{code || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{quantity || "—"}</td>
                    {showPrices && (
                      <td className="px-3 py-2 text-right tabular-nums">
                        {price ? formatEuro(price, price) : "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
