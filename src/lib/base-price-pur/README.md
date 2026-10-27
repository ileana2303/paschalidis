# Base price purchase list (Διαμόρφωση Τιμών)

Proxies SoftOne `SqlData` calls for purchase-driven cost / selling-price approval.

## Implemented SqlNames

| SqlName | Route |
| --- | --- |
| `BASE_PRICE_PUR_LIST` | `POST /api/base-price-pur` |
| `BASE_PRICE_ITEM_LIST_FINDOC` | `POST /api/base-price-pur/items` |
| `PRICES_APPLY_FINDOC` | `POST /api/base-price-pur/apply` |

## Not yet wired (awaiting upstream SqlName / contract)

- **`FINDOC_MARK`** — mark document seen / dismiss without changing prices (`FINDOC`, `VALUE` 0|1).
- **`AKK_SP_SYNC_BASEPRICE`** — sync `MTRL.CCCBASEPRICE` from `CCCBASEPRICEHIST` before list load; fire-and-forget on login per manual.

When those endpoints are confirmed, add proxies here and call sync before `BASE_PRICE_PUR_LIST` on screen open.
