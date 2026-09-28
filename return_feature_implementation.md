# Replacement Receipts for Purchase Returns — Analysis & Implementation Plan (v2)

> **Status:** Implemented on branch `feature/return-replacement-receipts` (backend + frontend), **not committed, not migrated, not deployed**. See §13.
> **Revision:** v2 (2026-09-29): adds the production safeguards from the design review (§0).
> **Scope:** `electro_mart_backend/src` (NestJS + Prisma 6.19 + Postgres on Neon) and `electro_mart_frontend/src` (Next.js admin).
> **Constraint:** Production DB holds real data. This is an **add-on**. Nothing about existing rows, columns or the results of existing records changes.

---

## 0. Mandatory safeguards (the rules this implementation must follow)

| # | Safeguard | Where it's handled |
|---|---|---|
| S1 | **No existing row or column is modified.** The migration only creates new tables. No backfill, no data transform, no recalculation of old returns. | §4.3, §9 |
| S2 | **One authoritative supplier-balance formula.** Every screen and API must get the same number. | §5.2 |
| S3 | **Replacement belongs to the Return, and each line belongs to a specific Return Item**, not to the purchase. | §4.2 |
| S4 | **Many replacement receipts per return** (supplier ships in batches). | §4.1 |
| S5 | **Quantity protection enforced in the database transaction** (with a row lock), not only in the UI. | §4.4 |
| S6 | **Stock only changes through the existing `InventoryService.recordMovement()`.** Never `product.currentStock += n`. | §4.4, §5.3 |
| S7 | **Everything in ONE transaction:** replacement header + items + stock movements + activity log. If any step fails, the whole thing rolls back. | §4.4 |
| S8 | **Idempotency:** a double-click or a retry after a timeout must not receive the goods twice. | §4.5 |
| S9 | **Purchase deletion is hard-blocked** when any of its returns has a replacement receipt. No cascading deletes through replacement history. | §5.4 |
| S10 | **A return with a replacement receipt becomes immutable** (no edit, no delete). | §4.4 |
| S11 | **Existing returns without replacements behave exactly as today.** | §4.4, §8 |
| S12 | **Replacement adds to the supplier balance exactly once**, only by the value of the replaced return lines. It never creates a Purchase row. | §4.1, §8 |
| S13 | **Replacement unit price is locked** to the returned line's unit cost. | §4.1 |
| S14 | **Automated before/after invariant check on a production copy:** every supplier balance, product stock and headline total must be identical after the migration. | §8 |
| S15 | **Full production backup**, then build and test on a **Neon branch** of production, and only then deploy. | §9 |

---

## 1. Requirement

On **/admin/purchases → Returns** we record goods sent back to a supplier. That lowers stock and **reduces what we owe the supplier**. When the supplier later **sends replacement goods for that return**, there is no way to record it. We need a **Replacement Receipt**, recorded inside the return it belongs to, that:

1. Puts the received units **back into stock** through the existing inventory ledger.
2. **Adds the replaced value back** to the supplier's balance.
3. Shows on the return: returned, received so far, remaining, and a status.
4. Appears everywhere the supplier balance appears: credits, credit-balance ledger and PDF, supplier statement, dashboard, balance sheet, inventory ledger, activity log.

---

## 2. How the system works today (verified in code)

### 2.1 Supplier balance is derived, never stored

`Supplier` has **no balance column**. The balance is recomputed on every read:

```
creditBalance = Σ Purchase.totalValue
              − Σ PurchaseReturn.totalAmount
              − Σ SupplierPayment.amount          (bounced cheques excluded)
              − Σ Purchase.transportCharges
```

That is why this feature can be additive. With zero replacement rows, `+ Σ replacements` adds 0, and every existing balance is unchanged.

The formula is currently **duplicated in 5 places**:

| # | File | Code | Feeds |
|---|---|---|---|
| 1 | `backend/src/credits/credits.service.ts` | `computeCreditBalance()` | Supplier credit page, **settlement over-payment guard** |
| 2 | `backend/src/credits/credits.service.ts` | `getSummary()` (4 × `groupBy`) | `/admin/credits` list |
| 3 | `backend/src/credit-balance/credit-balance.service.ts` | `computeBalanceBreakdown()` | Credit-balance page; also reused by **dashboard** (`getCurrentBalance`) and **balance sheet** (`getSummary`) |
| 4 | `backend/src/credit-balance/credit-balance.service.ts` | `getHistory()` raw SQL `UNION ALL` | Ledger with running balance + PDF |
| 5 | `frontend/src/app/admin/suppliers/[id]/statement/page.tsx` | client-side `netPayable` | Printable supplier statement |

(Dashboard and balance sheet do **not** have their own copy. They already call `CreditBalanceService`, so they follow #3 automatically.)

### 2.2 Purchase-return lifecycle (`backend/src/purchase-returns/purchase-returns.service.ts`)

- **Create:** either against a purchase (locks the `Purchase` row `FOR UPDATE`, caps quantity at purchased − already returned, and prices lines from `PurchaseItem.unitCost`) or standalone (admin enters `unitCost`). Both issue `PRTN-YYYY-NNNNN`, move stock out via `recordMovement(ADJUSTMENT, quantityOut)`, and write the activity log, all in one transaction.
- **Update (≤ 1 day):** reverses stock, then **`items: { deleteMany: {}, create: … }`**, which deletes and re-creates every return-item row.
- **Delete (≤ 1 day):** restores stock, deletes the return, and realigns the `PRTN` counter.

### 2.3 Inventory mechanism

`InventoryService.recordMovement(tx, …)` is the **only** stock mechanism. It does an atomic conditional `UPDATE "Product" SET currentStock = currentStock + Δ WHERE currentStock + Δ >= 0` and writes an `InventoryLog` row with `balanceAfter`, all inside the caller's transaction. There are no warehouses or locations in this system. Replacement receipts will use exactly this call (S6).

### 2.4 Other code touching returns

| File | Today | Needed |
|---|---|---|
| `purchases.service.ts` `remove()` | Deleting a purchase cascades through its returns | **Hard-block** if any return has a replacement receipt (S9) |
| `purchases.service.ts` `update()` | Already blocked if returns exist | No change |
| `purchases.service.ts` `findAll/findOne` | Includes `purchaseReturns.totalAmount` for the net-value badge | Also include replacement totals |
| `dashboard.service.ts` | `netPurchase = gross − returns` | Add replacements (D3) |
| `inventory.service.ts` `enrichLedgerEntries()` | Resolves reference UUIDs to readable text | Add replacement lookup |
| `balance-sheet.service.ts` | Uses `CreditBalanceService` + `Σ stock × costPrice` | **No change.** Stays balanced (§7) |
| `balance-sheet.service.spec.ts` | `OTHER_PRISMA_MODELS` guard list | Add the 2 new model names |
| `liquid-cash`, `sales-analysis`, `equity` | Cash / COGS | No change (no cash moves, costPrice untouched) |

---

## 3. The gap

| Step | Stock | Supplier balance |
|---|---:|---:|
| Purchase 10 × 1,000 | 10 | 10,000 |
| Return 2 damaged | 8 | 8,000 |
| Supplier sends 2 new units, **today** | 8 ✗ | 8,000 ✗ |
| Same, **with this feature** | 10 ✓ | 10,000 ✓ |

---

## 4. Design

### 4.1 Concept

```
PURCHASE (optional; standalone returns have none)
  └── PURCHASE ITEM
        └── PURCHASE RETURN  (PRTN-…)          supplier balance −
              ├── RETURN ITEM (product, qty, unitCost)
              └── REPLACEMENT RECEIPT #1..n  (RPLC-…)   supplier balance +
                    └── REPLACEMENT RECEIPT ITEM ──► points at one RETURN ITEM
```

- One return can have **many** Replacement Receipts (S4). Example: returned 10, received in batches of 3, then 4, then 3, which ends **Fully replaced**.
- Each receipt line references the **exact return item** it replaces (S3).
- **Value is locked** (S13): `unitCost` is copied from the return item on the server. The client never sends a price. A full replacement therefore reverses exactly the return's credit effect, and nothing more (S12).
- A different commercial price, or a substitute product, is a **separate business process** (a normal new purchase). It is not handled through this feature (D1).
- Status is **derived, not stored**, so existing returns need no backfill (S1):

| Received value vs returned value | Status |
|---|---|
| 0 | Not replaced |
| between | Partially replaced |
| equal | Fully replaced |

### 4.2 New Prisma models (additive only)

```prisma
model PurchaseReturnReplacement {
  id                String   @id @default(uuid())
  replacementNumber String   @unique                 // RPLC-YYYY-NNNNN
  idempotencyKey    String   @unique                 // S8, generated client-side per dialog
  purchaseReturnId  String
  purchaseReturn    PurchaseReturn @relation(fields: [purchaseReturnId], references: [id])
  supplierId        String                           // copied from the return (same pattern as PurchaseReturn)
  supplier          Supplier @relation(fields: [supplierId], references: [id])
  totalAmount       Decimal
  receivedDate      DateTime
  reference         String?                          // supplier delivery note / GRN no.
  notes             String?
  adminId           String
  admin             Admin    @relation(fields: [adminId], references: [id])
  createdAt         DateTime @default(now())
  items             PurchaseReturnReplacementItem[]

  @@index([purchaseReturnId])
  @@index([supplierId])
  @@index([receivedDate])
}

model PurchaseReturnReplacementItem {
  id                   String   @id @default(uuid())
  replacementId        String
  replacement          PurchaseReturnReplacement @relation(fields: [replacementId], references: [id])
  purchaseReturnItemId String
  purchaseReturnItem   PurchaseReturnItem @relation(fields: [purchaseReturnItemId], references: [id])
  productId            String                        // must equal the return item's productId (v1)
  product              Product  @relation(fields: [productId], references: [id])
  quantity             Int
  unitCost             Decimal                       // copied from PurchaseReturnItem, never user input
  lineTotal            Decimal

  @@index([replacementId])
  @@index([purchaseReturnItemId])
  @@index([productId])
}
```

The back-relation fields added to `PurchaseReturn`, `PurchaseReturnItem`, `Supplier`, `Admin` and `Product` exist **only in the Prisma client**. They produce **no SQL** on those tables.

All foreign keys use `ON DELETE RESTRICT`. This is a database-level backstop: Postgres itself refuses to delete a return, return item or purchase that has replacement history, even if application code has a bug.

### 4.3 Migration

Create it with `npx prisma migrate dev --create-only --name purchase_return_replacements` **against the Neon dev branch only**. Review the SQL by hand. It must contain **only**:

- `CREATE TABLE` × 2
- `CREATE UNIQUE INDEX` × 2 (`replacementNumber`, `idempotencyKey`)
- `CREATE INDEX` × 6
- `ALTER TABLE <new table> ADD CONSTRAINT … FOREIGN KEY … ON DELETE RESTRICT` (constraints only on the **new** tables)
- Optional hand-added line: `ALTER TABLE "PurchaseReturnReplacementItem" ADD CONSTRAINT "…_quantity_positive" CHECK ("quantity" > 0);` (still on the new table only)

**Reject the migration** if it contains any `DROP`, `ALTER COLUMN`, `ALTER TYPE`, `UPDATE`, `DELETE`, `TRUNCATE`, or any `ALTER TABLE` on an existing table.

No enum change is needed. Stock movements reuse `InventoryLogType.ADJUSTMENT`, exactly as returns do. That avoids `ALTER TYPE … ADD VALUE`.

### 4.4 Business rules

**Receive replacement.** `POST /purchase-returns/:id/replacements` runs in **one `$transaction`** (S7):

```
BEGIN
 1. SELECT … FROM "PurchaseReturn" WHERE id = $1 FOR UPDATE         -- serialises concurrent receipts for this return (S5)
 2. Idempotency: if a receipt with this idempotencyKey exists → return it, no side effects (S8)
 3. Load return items + Σ already-received qty per return item
 4. For each requested line:
      - return item belongs to this return
      - qty ≥ 1 and qty ≤ returned − already received            -- S5
      - unitCost := returnItem.unitCost; lineTotal := unitCost × qty   -- S13
 5. nextSequenceNumber(tx, 'purchaseReturnReplacement', 'RPLC')
 6. INSERT header + items
 7. InventoryService.recordMovement(tx, ADJUSTMENT, quantityIn, reference = replacement.id)  per line   -- S6
 8. Re-verify: Σ received per return item ≤ returned qty, else throw → ROLLBACK   -- defence in depth
 9. ActivityLog RECORDED_REPLACEMENT_RECEIPT
COMMIT        (any throw at any step → full ROLLBACK, nothing partial is saved)
```

There is **no separate "update supplier balance" step**. The balance is derived (§2.1), so committing the receipt row *is* the balance change, and it cannot drift from the stock movement.

**Other rules:**

| Rule | Detail |
|---|---|
| Date | `receivedDate` ≥ the return's `returnDate` and not in the future |
| Product | Same product as the return item (v1, D1) |
| Supplier | Taken from the return, never from the client |
| Return has ≥ 1 receipt | Return **edit and delete are blocked** (S10): *"This return has replacement receipts and can no longer be changed."* Required anyway because return `update()` deletes and re-creates return items, which the new foreign key would reject. |
| Return has 0 receipts | **Unchanged**: the existing 1-day edit/delete still works (S11) |
| Editing a receipt | **Not supported.** Receipts are corrected by voiding and re-recording. |
| Voiding a receipt | `DELETE /purchase-return-replacements/:id` within 1 day of `createdAt` (same window as returns and settlements), in one transaction: `recordMovement(quantityOut)` (fails cleanly if the units were already sold), delete the receipt, realign the `RPLC` counter, write activity log `VOIDED_REPLACEMENT_RECEIPT`. After 1 day a receipt is permanent (D5). |

### 4.5 Idempotency (S8)

- When the "Receive replacement" dialog opens, the frontend generates `idempotencyKey = crypto.randomUUID()` and sends it with the create request. Retries and double-clicks reuse the same key.
- The backend checks the key inside the locked transaction (step 2). The `@unique` constraint is the final guarantee: if two identical requests race, the second one hits a unique violation. The backend catches that (`P2002` on `idempotencyKey`) and returns the already-created receipt.
- The UI also disables the submit button while the request is pending. This is UX only, not the protection.

---

## 5. Backend changes

### 5.1 Schema and migration
`prisma/schema.prisma` gets the models from §4.2. The new migration folder comes from §4.3.

### 5.2 One authoritative balance formula (S2)

**New** `backend/src/common/accounting/supplier-balance.ts` (pure functions, no database access):

```ts
export interface SupplierBalanceComponents {
  purchases; transportCharges; returns; replacements; settled;   // Prisma.Decimal
}
export function supplierBalance(c): Prisma.Decimal
  // purchases − returns + replacements − settled − transportCharges
export const EFFECTIVE_PAYMENT_FILTER   // moved here, currently duplicated in 2 services
```

| Place | Change |
|---|---|
| #1 `CreditsService.computeCreditBalance()` | Fetches components (+ replacement aggregate), then calls `supplierBalance()` |
| #2 `CreditsService.getSummary()` | + replacement `groupBy`, per-row `supplierBalance()`, `totalReplacements` in totals |
| #3 `CreditBalanceService.computeBalanceBreakdown()` | + replacement aggregate, `supplierBalance()`, `totalReplacements` |
| #4 `CreditBalanceService.getHistory()` SQL | SQL can't call TS, so add a 5th `UNION ALL` branch `'RETURN_REPLACEMENT'` with a **positive** amount and `date = receivedDate`. It is guarded by a **consistency test**: the latest running `balanceAfter` must equal `computeBalanceBreakdown().balance`. Extend the `type` union and `query-credit-balance-history.dto.ts`. |
| #5 Supplier statement (frontend) | Add a replacements section and replacements to `netPayable`. It is guarded by the invariant script (§8), which recomputes the statement formula server-side and compares it with #1. *(v2 option: move the statement calculation to a backend endpoint that uses `supplierBalance()`.)* |

The refactor of #1–#3 onto the shared helper is behaviour-neutral. With replacements = 0 it produces identical numbers, and §8 proves that on the production copy.

The settlement over-payment guard (`createSettlement`) calls #1 inside its locked transaction. After a replacement it automatically allows paying the re-added amount, with no other change.

### 5.3 Replacement receipts (inside `purchase-returns/`, to avoid circular modules)

- **New** `dto/create-replacement-receipt.dto.ts`: `idempotencyKey (UUID)`, `receivedDate`, `reference?`, `notes?`, `items: [{ purchaseReturnItemId, quantity }]`. **No `unitCost`, `productId` or `supplierId` accepted.**
- **New** `dto/query-replacement-receipts.dto.ts`: `supplierId`, `dateFrom`, `dateTo`, pagination.
- **New** `replacement-receipts.service.ts`: `create`, `findAll`, `findForReturn`, `findOne`, `void`, following §4.4 and using `TRANSACTION_OPTIONS`, `recordMovement`, `nextSequenceNumber` / `resetSequenceCounter` and `ActivityLogService`.
- Controller routes (Admin only, same guards as today):
  - `POST   /purchase-returns/:id/replacements`
  - `GET    /purchase-returns/:id/replacements`
  - `GET    /purchase-return-replacements` (statement and lists)
  - `GET    /purchase-return-replacements/:id`
  - `DELETE /purchase-return-replacements/:id` (void, ≤ 1 day)
- `purchase-returns.service.ts`:
  - `include` → + `replacements { items }`. The response mapper adds derived `receivedAmount`, `replacementStatus`, and per item `receivedQuantity` and `remainingQuantity`.
  - `update()` and `remove()` → reject when `replacements.length > 0` (S10). Returns without receipts are untouched (S11).
  - *(D2)* `computeItemsAgainstPurchase()` return cap.

### 5.4 Purchases (S9)
- `remove()`: before the transaction, if any return of this purchase has a replacement receipt, reject with *"Cannot delete this purchase. It has returns with replacement receipts. Void the receipts first (within 1 day) or keep the purchase."* The `RESTRICT` foreign key backs this up at the database level.
- Purchases with returns but **no** receipts keep today's behaviour (cascade-reverse the returns). See D6 for tightening this.
- `findAll/findOne`: also select `purchaseReturns.replacements.totalAmount` for the net-value badge.

### 5.5 Dashboard, inventory ledger, tests
- `dashboard.service.ts`: replacement aggregates (range by `receivedDate`, plus all-time), `netPurchase = gross − returns + replacements`, and new `totalReturnReplacement` + change % (D3).
- `inventory.service.ts` `enrichLedgerEntries()`: 6th lookup, description `"Replacement receipt #RPLC… — <Supplier> (for return #PRTN…)"`, `performedBy` from the activity log.
- `balance-sheet.service.spec.ts`: add `'purchaseReturnReplacement', 'purchaseReturnReplacementItem'` to `OTHER_PRISMA_MODELS`.
- **New unit tests:**
  - quantity cap, including across multiple receipts
  - concurrent receipts (only one passes the last unit)
  - idempotent retry (same key → one receipt, one stock movement)
  - rollback when `recordMovement` throws (no receipt row left)
  - price ignored if sent
  - return immutable once received
  - purchase delete blocked
  - void within and after 1 day
  - void after units were sold fails cleanly
  - `supplierBalance()` math
  - history final running balance = breakdown balance

---

## 6. Frontend changes

### 6.1 API layer
- `src/lib/api/types.ts`:
  - `ReplacementReceipt` and `ReplacementReceiptItem`
  - `PurchaseReturn` gets `replacements?`, `receivedAmount` and `replacementStatus`; `PurchaseReturnItem` gets `receivedQuantity` and `remainingQuantity`
  - `Purchase.purchaseReturns[].replacements`
  - `totalReplacements` on `CreditSummaryEntry`, `CreditsSummary.totals`, `SupplierCreditDetail` and `CreditBalanceSummary`
  - `CreditBalanceEntryType` gets `'RETURN_REPLACEMENT'`
  - dashboard KPI fields
- `src/lib/api/endpoints.ts`: `replacementReceipts: { list, listForReturn, get, create, void }`.

### 6.2 Hooks
- `src/hooks/use-purchase-returns.ts`: `useReplacementReceipts`, `useCreateReplacementReceipt`, `useVoidReplacementReceipt`.
- Widen `invalidatePurchaseReturnRelated()` to also invalidate `['credit-balance']`, `['balance-sheet']` and `['supplier-statement']`. This also fixes a **pre-existing gap**: today's returns don't refresh those three pages either.

### 6.3 UI

| Screen / file | Change |
|---|---|
| **Purchases → Returns tab** `components/admin/purchase-returns-tab.tsx` | **Status** badge column, **Received** column (`6 / 10`, `+Rs 600`), and a **"Receive replacement"** action (hidden when fully replaced). Clicking a row opens a return detail drawer (below). Return edit/delete hidden when receipts exist, with a tooltip explaining why. Mobile cards get the same. |
| **New** `components/admin/return-detail-sheet.tsx` | The audit view: return header, lines table (Product, Returned, Unit cost, Received, **Remaining**), then **Replacement history** (RPLC no., date, supplier ref, qty, value, admin; a Void button within 1 day). Footer: `Total received 10/10 · FULLY REPLACED`. |
| **New** `components/admin/replacement-receipt-form-dialog.tsx` | One row per return line: returned, received, remaining, "Qty received now" (max = remaining), read-only unit cost, line total. Also received date, supplier ref and notes. A "Receive all remaining" shortcut. Confirmation text: *"Adds N units to stock and Rs X back to <Supplier>'s balance."* Generates the `idempotencyKey` on open; submit is disabled while pending. |
| **Purchase detail** `app/admin/purchases/[id]/page.tsx` | Returns card: status badge, "Receive replacement", "Total received" row. Delete-purchase button disabled with a reason when blocked (S9). |
| **Purchases list** `app/admin/purchases/page.tsx` `purchaseTotals()` | `returnedValue = returns − replacements`, so badges and net value are correct |
| **Supplier credit** `app/admin/credits/[supplierId]/page.tsx` | StatCard "Replacements +X", returns table status/received columns, and the action |
| **Credits list** `app/admin/credits/page.tsx` | "Replacements" column and total |
| **Credit balance** `app/admin/credit-balance/page.tsx` + `lib/credit-balance-pdf.ts` | `RETURN_REPLACEMENT` label/icon/filter, and a "Return Replacements +X" summary line |
| **Supplier statement** `app/admin/suppliers/[id]/statement/page.tsx` + `components/admin/supplier-statement-print-layout.tsx` | "Replacements Received" section and the updated `netPayable` |
| **Dashboard** `components/admin/dashboard/more-metrics-strip.tsx` | Per D3 |
| **Activity log** `app/admin/activity-log/page.tsx` | New actions, plus the already-missing `UPDATED_/DELETED_PURCHASE_RETURN` |

---

## 7. Accounting walk-through

Returned 10 × 100 on a supplier whose balance was 10,000. Receipts come in as 4, then 6.

| Event | Stock | Supplier balance | Ledger row | Status |
|---|---:|---:|---|---|
| Before return | 10 | 10,000 | | |
| Return PRTN-…12 | 0 | 9,000 | −1,000 PURCHASE_RETURN | Not replaced |
| RPLC-…21 (4) | 4 | 9,400 | +400 RETURN_REPLACEMENT | Partially replaced |
| RPLC-…28 (6) | 10 | 10,000 | +600 RETURN_REPLACEMENT | Fully replaced |
| Try RPLC (1 more) | ✗ rejected | ✗ unchanged | | |

- **Exactly-once (S12):** only replacement rows add value. No Purchase row is created, so the purchase total is not counted twice.
- **Balance sheet:** inventory (asset) +1,000 and accounts payable (liability) +1,000 cancel out, so it stays `BALANCED`.
- **Liquid cash / profit:** unchanged.

---

## 8. Before/after invariant check (S14)

A **read-only** script, `backend/prisma/scripts/verify-balances.ts`, runs against a database URL and writes a JSON snapshot:

| Captured | Detail |
|---|---|
| Row counts | suppliers, products, purchases, purchase items, returns, return items, supplier payments, inventory logs |
| Per supplier | purchases, transport, returns, settled and **creditBalance**, using the *old* formula written out inline in the script (independent of app code) |
| Per product | `currentStock` and the latest `InventoryLog.balanceAfter` (a mismatch is reported but not fixed) |
| Headline figures | global credit balance, balance-sheet totals, dashboard `netPurchase` |

How it is used:

1. **Snapshot A** on the Neon dev branch **before** the migration.
2. Apply the migration and deploy the new backend to the branch.
3. **Snapshot B**: the script also calls the new code (`supplierBalance()`, `/credits`, `/credit-balance/summary`, `/balance-sheet`) and compares.
4. **Pass criterion:** A = B for **every supplier and every product**, with zero diff. Any diff means stop.
5. After testing replacements on the branch, a third run confirms that only suppliers who received test receipts changed, each by exactly their receipt totals.

The same script is re-run on production right before and right after the production migration.

---

## 9. Rollout plan (S15)

| Phase | Action |
|---|---|
| **A: Backup** | Take a production backup: a Neon snapshot / point-in-time restore point **and** `pg_dump -Fc` to local storage. Verify the dump restores. |
| **B: Branch** | Create the Neon branch `electro-mart-feature-dev` **from current production**. Point the local `.env` `DATABASE_URL` at the **branch** and double-check the host before running anything. |
| **C: Baseline** | Snapshot A (§8). |
| **D: Migrate** | `prisma migrate dev --create-only`, hand review (§4.3), then `prisma migrate deploy` **on the branch**. |
| **E: Regression** | Snapshot B = A. Then manually exercise existing flows: create/edit/delete purchase, create/edit/delete return (without receipts), settlements and cheques, supplier statement, credits, credit balance + PDF, inventory ledger, dashboard, balance sheet. Everything must behave as before. |
| **F: Feature tests** | Checklist in §10. |
| **G: Production** | Fresh backup, Snapshot A on prod, `prisma migrate deploy` (**never** `db push`, `migrate dev` or `migrate reset`), deploy backend, Snapshot B on prod = A, then deploy frontend. |
| **Rollback** | The migration only adds empty tables, so rollback means redeploying the previous backend build. Drop the new tables only after confirming no receipts were written. |

⚠️ `electro_mart_backend/README.md` (line ~423) lists `npx prisma migrate reset`. That command **wipes the database**. It must never be run against production or the branch you care about. Consider removing or annotating it.

Deploy order is backend first, then frontend. All response changes are new fields, so the old frontend keeps working against the new backend.

---

## 10. Feature test checklist (on the Neon branch)

- [ ] Return 10 → stock −10, balance −1,000.
- [ ] Receive 4 → stock +4, balance +400, *Partially replaced*.
- [ ] Receive 6 → *Fully replaced*, action hidden.
- [ ] Receive 1 more → rejected; nothing changed.
- [ ] Two tabs receive the last remaining unit at the same time → exactly one succeeds.
- [ ] Double-click / resend with the same `idempotencyKey` → one receipt, one stock movement.
- [ ] Force a failure inside `recordMovement` → no receipt row, no stock change, no log.
- [ ] Send `unitCost` / `productId` in the payload → ignored or rejected; value comes from the return line.
- [ ] Standalone return → receipts work the same.
- [ ] Return with receipts: edit and delete blocked (UI and API).
- [ ] Return without receipts: edit and delete still work as before.
- [ ] Purchase whose return has receipts: delete blocked (UI, API, and the DB foreign key).
- [ ] Void a receipt within 1 day → stock and balance revert, RPLC counter realigns. Void after the units were sold → clean failure. After 1 day → blocked.
- [ ] Settlement up to the new balance is allowed; over it is rejected.
- [ ] Credit-balance ledger row, type filter and PDF are correct; final running balance = summary balance.
- [ ] Supplier statement period includes receipts; net payable is correct.
- [ ] Balance sheet still `BALANCED`.
- [ ] Inventory ledger text and activity-log entries/filters are correct.
- [ ] Suppliers with no receipts: every figure identical to Snapshot A.

---

## 11. Decisions

| # | Question | Recommendation |
|---|---|---|
| **D1** | Substitute product (return A, receive B)? | **No for v1.** Same product only. A substitute is handled as a normal purchase; the original return stays "Not replaced" or is closed via D4. |
| **D2** | Can replaced units be returned again against the original purchase? Today the cap is `purchased − returned`, so they could only go as a standalone return. | **Yes:** cap = `purchased − returned + received`. Validation only, no data impact. |
| **D3** | Dashboard "Total Purchase Return": gross or net? | Keep it **gross** (same meaning as today), fix `netPurchase`, and add a separate "Replacements received" figure. |
| **D4** | Mark old returns as "Closed, credit kept, no replacement coming"? | Optional **v2**: a nullable `resolution` column on `PurchaseReturn` (an additive `ALTER TABLE … ADD COLUMN` with NULL default, no backfill). Left out of v1 to keep v1 free of any change to existing tables. |
| **D5** | Can a receipt be voided? | Yes, **within 1 day** only (same window as returns and settlements). After that it's permanent; a proper reversal document can come later. |
| **D6** | Also block deleting purchases that have returns but **no** receipts (the reviewer's stricter option)? | **Not in v1.** It would change today's behaviour for existing data, which conflicts with S11. The system should move to void/reversal documents instead of physical deletes, but as a separate change. |

---

## 12. Implementation order

1. Neon backup + branch + Snapshot A (§9 A–C). Write `verify-balances.ts` first.
2. Schema + migration on the branch, then SQL review.
3. `supplier-balance.ts` helper; refactor #1–#3 onto it. Run Snapshot B, which must equal A **before** adding any feature code.
4. Replacement receipt service, DTOs, routes and unit tests (transaction, lock, idempotency, cap, rollback).
5. Guards: return immutability, purchase delete block.
6. History SQL branch + consistency test, dashboard, inventory ledger, spec list.
7. Frontend types / endpoints / hooks (+ wider invalidation).
8. Receipt dialog, return detail sheet, Returns tab, purchase detail.
9. Credits pages, credit balance + PDF, supplier statement, activity log, dashboard.
10. Full regression + feature checklist on the branch → production rollout (§9 G).

**Footprint:** 1 additive migration (2 new tables, 0 changes to existing tables); ~4 new backend files + 1 script; 2 new frontend components; ~16 existing files edited.

---

## 13. Implementation status (2026-09-29)

Branch `feature/return-replacement-receipts` in **both** repos. Nothing has been committed. **No command has touched any database.** The migration SQL was generated offline (`prisma migrate diff` schema → schema) and `prisma generate` only builds the client.

### Verified locally
- Backend: `tsc` clean, eslint clean on all changed files, `nest build` OK, **50/50 tests pass** (31 existing + 19 new in `replacement-receipts.service.spec.ts`).
- Frontend: `tsc` clean, eslint clean on all changed files, `next build` OK.
- Migration audit: only `CREATE TABLE` ×2, `CREATE [UNIQUE] INDEX` ×8, and FK + `CHECK (quantity > 0)` constraints **on the two new tables**. Schema changes to existing models are back-relations only (no SQL). No `DROP` / `ALTER COLUMN` / `ALTER TYPE` / `UPDATE` / `DELETE`.

### Decisions applied (recommendations from §11)
D1 same product only · D2 replaced units returnable again (backend cap + return dialog) · D3 "Purchase Return" stays gross; a "+X replaced" note was added to that tile instead of a 7th tile (the strip is a 3-column grid) · D4 not done (v2) · D5 **edit or void within 1 day** (edit added on request, see below) · D6 purchases with returns but no receipts keep today's delete behaviour.

### Files
- **Backend, new:** `prisma/migrations/20260929120000_purchase_return_replacements/migration.sql`, `prisma/scripts/verify-balances.ts`, `src/common/utils/supplier-balance.ts`, `src/purchase-returns/replacement-receipts.service.ts` (+ spec), `src/purchase-returns/dto/create-replacement-receipt.dto.ts`, `src/purchase-returns/dto/query-replacement-receipts.dto.ts`.
- **Backend, edited:** `schema.prisma`, `credits.service.ts`, `credit-balance.service.ts` (+ history DTO), `dashboard.service.ts`, `inventory.service.ts`, `purchase-returns.{controller,module,service}.ts`, `purchases.service.ts`, `balance-sheet.service.spec.ts`.
- **Frontend, new:** `components/admin/replacement-receipt-form-dialog.tsx`, `return-detail-sheet.tsx`, `replacement-status-badge.tsx`.
- **Frontend, edited:** `lib/api/types.ts`, `lib/api/endpoints.ts`, `hooks/use-purchase-returns.ts`, `components/admin/purchase-returns-tab.tsx`, `purchase-return-form-dialog.tsx`, `supplier-statement-print-layout.tsx`, `dashboard/more-metrics-strip.tsx`, `lib/credit-balance-pdf.ts`, pages: `purchases`, `purchases/[id]`, `credits`, `credits/[supplierId]`, `credit-balance`, `suppliers/[id]/statement`, `activity-log`.

### Notes and deviations
- **Deploy order (correction to §9):** the new backend code queries the new tables. `prisma migrate deploy` must be applied **before** the new backend build serves traffic, or every balance endpoint will error. The old backend is unaffected by the new (empty) tables, so migrating first is safe.
- `CreditBalanceService` now computes the company-wide balance in `Decimal` and converts it to a number at the end. Previously it did float arithmetic. Any difference is sub-cent float noise; `verify-balances.ts` compares at 2 dp.
- The planned "history final running balance = summary balance" check needs a real database (raw SQL). Verify it on the Neon branch: filter nothing, look at page 1's top `balanceAfter`, and compare it with `/credit-balance/summary`.

### Next steps (need you, and a DB you confirm is the Neon branch)
1. Take the production backup (§9 A). Create the Neon branch from production and point `electro_mart_backend/.env` `DATABASE_URL` / `DIRECT_URL` at the **branch**.
2. `npx ts-node -r tsconfig-paths/register prisma/scripts/verify-balances.ts snapshot before.json` (read-only)
3. `npx prisma migrate deploy` (branch only)
4. `… verify-balances.ts snapshot after.json`, then `… verify-balances.ts compare before.json after.json` must print **PASS**
5. Run the backend and frontend against the branch → regression (§9 E) + feature checklist (§10)
6. Only then: production backup, then snapshot, `migrate deploy`, snapshot + compare, deploy backend, deploy frontend.

### Addendum: editing replacement receipts
Admins can **Edit** a receipt within 1 day (Return detail sheet → Edit): fix the count, move units to a different return line (i.e. the correct product), or change the date, ref or notes.
- `PATCH /purchase-return-replacements/:id` runs in one transaction under the same `PurchaseReturn` row lock. Lines are re-validated against what's outstanding (excluding this receipt's own old lines) and re-priced from the return lines, so the receipt value and supplier balance follow automatically. The same post-write over-receive check applies.
- Stock moves by the **per-product net difference** (e.g. 4 → 6 = +2 in; moving 4 from product A to B = 4 out of A, 4 into B). Correcting a count doesn't fail just because some units were sold meanwhile. A decrease below what's still in stock fails cleanly via `recordMovement`.
- Activity log: `UPDATED_REPLACEMENT_RECEIPT` records old and new values. 7 new unit tests (57 total pass).
- Returns themselves stay locked once they have receipts (S10). To fix a wrong return line, void its receipts first.

