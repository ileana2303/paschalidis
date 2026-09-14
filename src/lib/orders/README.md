# Order submission (SoftOne setData)

Three independent document flows, one folder each. Nothing is shared except the
setData envelope, the POST helper and MASS_DELETE.

| Flow | Route | Folder | S1 route env | TABLE_ACTION | Documents |
|---|---|---|---|---|---|
| Ενδοδιακίνηση Ανταλλακτικών | `POST /api/orders/endo` | `endo/` | `S1_ENDO_ENDPOINT` | `ENDO` | one **per basket line** |
| Καλάθι Πελάτη | `POST /api/orders/basket` | `customer-basket/` | `S1_BASKET_ENDPOINT` | `USRCUST` | one per basket |
| Αιτήματα Αποθέματος | `POST /api/orders/anatrof` | `anatrof/` | `S1_ANATROF_ENDPOINT` | `ANATROF` | one per request list |

Every `S1_*_ENDPOINT` falls back to `S1_ENDPOINT` when unset, so a single-route
installation keeps working.

## Where to look when debugging

Each flow has exactly three files:

1. `*-constants.ts` - every fixed ("σταθερό") value, S1 route env key, log label.
2. `build-*-payload.ts` - the **complete setData JSON**. Pure function: no env
   reads, no branch lookups. What you read here is what SoftOne receives.
3. `submit-*-order.ts` - resolves the branch-dependent values (clientID, SERIES,
   TRDBRANCH, BRANCHSEC), posts, then runs MASS_DELETE / LINK_S1.

Every request logs the outgoing payload (clientID masked) and the returned S1 id
under the flow's log label, e.g.:

```
[orders/endo] setData -> https://... (S1_ENDO_ENDPOINT) {"service":"setData",...}
[orders/endo] setData ok, S1 id 400123
[orders/endo] MASS_DELETE LINK_S1 ENDO basketIds=20435 S1_KEY=400123
```

## Branch-driven values

`lib/auth/branches.ts` is the single source of truth:

Branch code `1000` is Κασομούλη (there is no `1001`; the SoftOne stock columns
are still named `YP1001` / `THESI1001`).

| Branch | TRDBRANCH | SALDOC SERIES | ENDO comment label |
|---|---|---|---|
| 1000 Κασομούλη | 15 | 7002 | Κασομούλη |
| 1006 Λ. Αθηνών | 13 | 17002 | Πάροδος Λ.Αθηνών 65 |
| 1007 Λ. Μεσογείων | 14 | 27002 | Λ.Μεσογείων 573 |

ENDO ignores the SERIES column: it always sends the fixed `7004|πΔ` + `TAXSERIES πΔ`.

## TRDR / TRDBRANCH per flow

| Flow | TRDR | TRDBRANCH |
|---|---|---|
| ENDO | `8674` ΠΑΣΧΑΛΙΔΗΣ, fixed | ΠΑΣΧΑΛΙΔΗΣ branch **the items were asked from** (supplying branch) |
| CUST BASKET | the customer | the **customer's** TRDBRANCH (basket row `TRD_BRANCH`) |
| ANATROF | `8674` ΠΑΣΧΑΛΙΔΗΣ, fixed | `13`, fixed - always ΠΑΣΧΑΛΙΔΗΣ |

## ENDO specifics

- `SERIES 7004|πΔ`, `TAXSERIES πΔ`, `PAYMENT 1011`, `TRUCKS 2`, `SHIPKIND 1007`,
  `SOCASH 3800` are fixed for every document (`endo-constants.ts`).
- `SERIESNUM` = BASKETID of the line.
- `COMMENTS` = `ΠΑΡΑΣΤΑΤΙΚΟ Νο<basketId> ΑΠΟ <source label> ΣΕ <dest label> <source>--><dest>`
  (`endo-comments.ts`).
- Each line carries two branches, straight from the ENDO row:
  `supplyingBranch` (row `BRANCH`, holds and sends the items) and
  `requestingBranch` (row `TO_BRANCH`, asked for them).
- `TRDBRANCH` = TRDBRANCH of the **supplying** branch, which owns the document;
  its setData clientID is used too.
- `BRANCHSEC` / `WHOUSESEC` = the **requesting** branch.
- Example - 1000 is logged in and asks 5 pieces from 1006:
  `TRDBRANCH 13` (=1006), `BRANCHSEC 1000`, `WHOUSESEC 1000`,
  `COMMENTS ... ΑΠΟ Πάροδος Λ.Αθηνών 65 ΣΕ Κασομούλη 1006-->1000`.
- `TRDR` is `8674` (ΠΑΣΧΑΛΙΔΗΣ) for every document.

## setData clientID resolution

`getSoftOneSetDataClientID(branch, { endo })` in `lib/softone.ts`, first hit wins:

1. `S1_ENDO_SETDATA_CLIENT_ID_<branch>` (ENDO only)
2. `S1_SETDATA_CLIENT_ID_<branch>`
3. `S1_SETDATA_CLIENT_ID`
4. `S1_CLIENT_ID_<branch>`
5. `S1_CLIENT_ID`

MASS_DELETE always uses the SQL clientID (`S1_CLIENT_ID`), never the setData one.
