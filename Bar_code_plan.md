# Serial Number / Barcode Tracking — Implementation Plan

> Status: **Implemented on `feature/serial-tracking` (both repos), not merged or deployed.** Migration
> `20261022120000_product_unit_serials` applied to the serial test copy only; production untouched. Backend smoke run
> (`npm run test:serials-smoke`) passes on the test copy with 0 pre-existing business rows changed. Not built in v1:
> serial entry on the admin order-create form (scan from the order page instead), and "Print label".
> Written against the code as it is on 2026-10-22
> (backend `electro_mart_backend/src` + `prisma/schema.prisma`, frontend `electro_mart_frontend/src`).
> Goal: track individual units (e.g. each of 5 smart TVs) by their barcode/serial for warranty,
> without changing how stock, money, invoices or any existing record works today.

---

## 0. The idea in one paragraph

Some products (TVs, fridges, phones…) get **per-unit serial tracking**; small items don't. When goods
arrive, the admin *may* scan each unit's barcode against the purchase, now or later, one at a time or
as a list. When an order is packed, the admin scans the exact units going to that dealer. The printed
invoice gets a **second page listing every serial sold**. A **Scan screen** lets anyone scan a unit
and immediately see its full life: which product, which purchase and supplier it came from, which
order, invoice and buyer it went to, warranty status, and any returns.

---

## 1. What already exists (and why it matters)

| Fact in current code | Consequence for this feature |
|---|---|
| `Product.barcode String? @unique` already exists (product-level EAN/UPC, edited in `product-form-dialog.tsx`). | That is the **model barcode** — identical on all 5 TVs. Per-unit serials must be a **new table**, not this column. The scanner must tell the two apart (§4.4). |
| Stock is a single integer `Product.currentStock`, changed only by `InventoryService.recordMovement()` with an atomic conditional `UPDATE` and an `InventoryLog` row. | Serials will be a **label layer on top of quantity stock**. They never change `currentStock`. Quantity accounting, Liquid Cash, balance sheet and reports stay untouched. |
| Stock is reserved at **approval** (`applyApproval` → `RESERVE`), invoice is generated at approval. | Serial scanning happens **after approval** (at packing), so the invoice already exists. The serial page of the invoice is rendered live from assigned units at print time. |
| `updateItems`, `updateAdminOrder`, `remove` and `dealers.clearData` call `orderItem.deleteMany` and recreate the rows. `purchases.update` does the same with `purchaseItem`. | Units must **never** have a foreign key to `OrderItem` / `PurchaseItem` (those ids are thrown away on every edit). Units link to the **header** (`Order`, `Purchase`) + `productId`. |
| Order delete, purchase delete/edit/cancel, sales returns, purchase returns, replacements and dealer data-clear all move stock. | Each of these flows needs an explicit serial rule (§6). Foreign keys are `ON DELETE RESTRICT`, so if any flow forgets, the **database refuses** instead of leaving orphans. |
| Existing patterns: `idempotencyKey` (`PurchaseReturnReplacement`), before-image history with no FK (`PaymentRevision`, `LedgerRevision`), `TRANSACTION_OPTIONS`, `ActivityLog`, `ThrottlerGuard`, `class-validator` DTOs. | Reuse all of them. Nothing new invented. |
| Invoice print = `InvoicePrintLayout` + `window.print()` via `usePrint`. | The serial page is a second `<section>` with CSS `break-before: page` in the same layout. No PDF library change needed. |

---

## 2. Non-negotiable safety rules ("never corrupt the DB")

1. **Additive-only migration.** New enums, new tables, two new columns on `Product`, both nullable or
   defaulted. No existing column is renamed, retyped, dropped or backfilled. Existing rows stay
   exactly as they are; every existing product has serial tracking **off**.
2. **Serials never touch money or quantity.** No change to `currentStock`, `InventoryLog`, invoices,
   payments, balances or Liquid Cash. Turning the feature off leaves the business data identical.
3. **Every serial write runs inside the same `$transaction` as the document it belongs to.** It all
   commits together or nothing does.
4. **Atomic state changes.** Serial status changes use conditional `updateMany({ where: { id, status: EXPECTED } })`
   and assert the affected count, the same way `recordMovement` guards stock. Two admins scanning the same TV
   into two orders at the same time: one wins, the other gets `409`.
5. **`ON DELETE RESTRICT` on every FK from units**, so a forgotten code path fails loudly instead of orphaning data.
6. **Append-only history.** A `ProductUnitEvent` row is written for every change. Events keep
   document numbers as text snapshots and have no FKs to documents (same idea as `PaymentRevision`),
   so history survives even if an order is later deleted.
7. **Validation on the server, always.** The client's "looks OK" is only UX; the server re-checks
   every serial, product, order and quantity in the transaction.
8. **Deploy procedure** (see §10): backup + Neon branch, migration created with `--create-only` and reviewed by eye,
   applied to the branch first, smoke-tested, then production.
9. **The serial module cannot move stock, by construction.** `ProductUnitsModule` does **not** import
   `InventoryModule` and `ProductUnitsService` has no `InventoryService` dependency. Serial-only operations
   (register, assign/unassign, warranty swap, condition change, correct, delete) therefore *cannot* call
   `recordMovement()`. Where an existing operation already moves stock (purchase, return, cancellation, adjustment,
   order delete), its `recordMovement` calls stay **exactly** as today, and the serial handling is added beside them in
   the same transaction. A unit test asserts the module has no `InventoryService` provider.
10. **Every product-level serial write locks the product row first** (`SELECT id FROM "Product" WHERE id = $1 FOR UPDATE`,
    the same lock `recordMovement`'s UPDATE takes), so stock movements and serial-count checks for one product are
    serialized and can't race (§6.2).
11. **Database-level guards on the new tables only** (raw SQL appended to the new migration, touching nothing that exists):
    `CHECK` constraints for status ↔ link consistency, and a trigger that rejects `UPDATE` on `ProductUnitEvent`
    (history is insert-only). See §3 "Extra SQL".
12. **Guards are always on.** A `SERIAL_TRACKING_ENABLED` env flag hides the new endpoints and UI, but the §6 guards in
    existing flows stay active whenever any `ProductUnit` row exists. Turning the flag off can never let an order
    delete orphan or skip releasing units.
13. **Business fingerprint before and after.** A read-only query (§10, step 1) fingerprints stock, inventory log, invoices,
    payments, dealer balances, supplier payables and cash. It must be **byte-identical** before and after the
    migration, and after every test scenario that doesn't intentionally change business data.

---

## 3. Data model (Prisma, additive)

```prisma
// ---------------------------------------------------------------------------
// Serial-number tracking — Bar_code_plan.md. Additive only: a label layer on
// top of quantity stock. Nothing here is ever read by stock, invoice or cash
// math; Product.currentStock stays the single source of truth for quantity.
// ---------------------------------------------------------------------------

enum ProductUnitStatus {
  IN_STOCK              // physically with us, free to sell
  ALLOCATED             // scanned onto an APPROVED/PACKED order: still in our building, reserved for that buyer
  SOLD                  // its order reached DELIVERED/COMPLETED: left our building, warranty running
  RETURNED_TO_SUPPLIER  // left via purchase return / purchase cancellation
  WRITTEN_OFF           // damaged / lost, via a negative stock adjustment
}

enum ProductUnitSource {
  PURCHASE       // scanned against a purchase (purchaseId set)
  REPLACEMENT    // received as a supplier replacement (replacementId set)
  OPENING_STOCK  // registered for stock already on hand before this feature
}

// Physical condition, independent of status. A DEFECTIVE unit is still
// IN_STOCK (it is counted in currentStock, exactly like today's sales returns)
// but can't be assigned to an order until marked GOOD again.
enum ProductUnitCondition {
  GOOD
  DEFECTIVE
}

enum ProductUnitEventType {
  REGISTERED
  SERIAL_CORRECTED
  ASSIGNED_TO_ORDER
  UNASSIGNED_FROM_ORDER      // admin removed it from an order, or the order was edited/deleted
  RETURNED_BY_DEALER         // sales return
  DEALER_RETURN_REVERSED     // that sales return was edited/deleted
  RETURNED_TO_SUPPLIER       // purchase return or purchase cancellation
  SUPPLIER_RETURN_REVERSED   // that return was edited/deleted, or the purchase reinstated
  SUPPLIER_RETURN_RELINKED   // its purchase return was linked to / unlinked from a purchase
  MARKED_DEFECTIVE
  MARKED_GOOD
  WARRANTY_SWAP_OUT          // defective unit taken back from the buyer, replacement handed over
  WARRANTY_SWAP_IN           // the replacement unit given to the buyer
  WRITTEN_OFF
  WRITE_OFF_REVERSED
  WARRANTY_UPDATED
  RELEASED_BY_DATA_CLEAR     // dealer data-clear removed the order it was on
}

model ProductUnit {
  id                String            @id @default(uuid())
  productId         String
  product           Product           @relation(fields: [productId], references: [id], onDelete: Restrict)
  // As scanned (trimmed). Shown to people and printed on the invoice.
  serialNumber      String
  // Normalized (uppercase, no whitespace/control chars). Used for uniqueness and lookup.
  serialKey         String
  status            ProductUnitStatus    @default(IN_STOCK)
  condition         ProductUnitCondition @default(GOOD)
  source            ProductUnitSource

  // Warranty chain: the unit this one replaced (warranty swap to a buyer, or
  // a supplier replacement for a returned unit). Both units keep their own
  // history; the detail page links them both ways.
  replacesUnitId    String?              @unique
  replacesUnit      ProductUnit?         @relation("UnitReplacement", fields: [replacesUnitId], references: [id], onDelete: Restrict)
  replacedBy        ProductUnit?         @relation("UnitReplacement")

  purchaseId        String?
  purchase          Purchase?                  @relation(fields: [purchaseId], references: [id], onDelete: Restrict)
  replacementId     String?
  replacement       PurchaseReturnReplacement? @relation(fields: [replacementId], references: [id], onDelete: Restrict)
  receivedAt        DateTime          // purchaseDate / receivedDate / registration date

  // Current sale. Cleared if unassigned or returned by the dealer (history lives in events).
  orderId           String?
  order             Order?            @relation(fields: [orderId], references: [id], onDelete: Restrict)
  allocatedAt       DateTime?         // when scanned onto the order
  soldAt            DateTime?         // order deliveredAt (else completedAt) — set on ALLOCATED → SOLD
  // Warranty is computed once, at ALLOCATED → SOLD: start = soldAt, expiry =
  // start + product.warrantyMonths (null when the product has no months set).
  warrantyStartsAt  DateTime?
  warrantyExpiresAt DateTime?
  // true once an admin edits either warranty date by hand. Automatic stamping
  // never touches a unit with warrantyManual = true.
  warrantyManual    Boolean           @default(false)

  purchaseReturnId  String?
  purchaseReturn    PurchaseReturn?   @relation(fields: [purchaseReturnId], references: [id], onDelete: Restrict)

  notes             String?
  createdByAdminId  String
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  events ProductUnitEvent[]

  @@unique([productId, serialKey])
  @@index([serialKey])
  @@index([productId, status])
  @@index([orderId])
  @@index([purchaseId])
  @@index([purchaseReturnId])
}

// Append-only life history of a unit. Deliberately no FK to orders/purchases/
// returns (like PaymentRevision): document numbers and buyer name are copied
// as text so the timeline still reads correctly after a document is deleted.
model ProductUnitEvent {
  id          String               @id @default(uuid())
  unitId      String
  unit        ProductUnit          @relation(fields: [unitId], references: [id], onDelete: Restrict)
  type        ProductUnitEventType
  documentId  String?              // orderId / purchaseId / salesReturnId / purchaseReturnId …
  documentRef String?              // "ORD-2026-00012 / INV-2026-00009", "PR-2026-00003" …
  partyName   String?              // dealer businessName or supplier name at that moment
  // Why it happened, copied at the time: the sales-return / purchase-return
  // reason, write-off reason, swap reason, condition-change reason.
  reason      String?
  // Per-unit note typed or picked during a return, e.g. "no display, power LED blinks".
  faultNote   String?
  // The unit's state right after this event, so the timeline reads as a
  // sequence of states even if a document is later edited or deleted.
  statusAfter    ProductUnitStatus
  conditionAfter ProductUnitCondition
  // Business date of the document (returnDate, purchaseDate, delivery date),
  // which can differ from createdAt when entered later.
  eventDate   DateTime
  // Money attached to this unit in that document, for display only (never
  // summed into any balance): sale netUnitPrice, refund per unit, return unitCost.
  amount      Decimal?
  details     String?
  adminId     String
  createdAt   DateTime             @default(now())

  @@index([unitId, createdAt])
  @@index([documentId])
}
```

Additive changes to existing models:

```prisma
model Product {
  // … existing fields unchanged …
  trackSerials   Boolean @default(false)  // opt-in per product; small items stay false
  warrantyMonths Int?                     // machine-readable warranty; existing `warranty` text stays as-is
  units          ProductUnit[]
}
model Purchase                  { /* … */ units ProductUnit[] }
model Order                     { /* … */ units ProductUnit[] }
model PurchaseReturn            { /* … */ units ProductUnit[] }
model PurchaseReturnReplacement { /* … */ units ProductUnit[] }
```

Relation-only lines (`units ProductUnit[]`) add **no columns** to those tables.

### Why these choices

- **Unique per product (`productId + serialKey`), indexed globally.** Two different brands can
  legitimately share a serial string. The scan endpoint handles more than one match with a chooser.
  Within one product a duplicate is impossible at DB level.
- **No `orderItemId` / `purchaseItemId`.** Explained in §1: those rows are deleted and recreated by edits.
  `orderId + productId` identifies the line uniquely, because `buildItemsAndSubtotal` already forbids
  the same product twice in one order.
- **`trackSerials` is opt-in and scanning is optional.** It only switches on the scan UI and the
  "3 / 5 serials" progress indicators. Untracked products behave exactly as today.
- **`warrantyMonths` as a new Int** instead of parsing the free-text `warranty` ("1 year", "6 months
  shop warranty"…), which would be guesswork. Admin fills it in once per product; if it's empty,
  the unit page simply shows the text warranty and no expiry date.

### Expected migration SQL (what we must see when reviewing, nothing else)

```sql
CREATE TYPE "ProductUnitStatus" AS ENUM (...);
CREATE TYPE "ProductUnitSource" AS ENUM (...);
CREATE TYPE "ProductUnitCondition" AS ENUM (...);
CREATE TYPE "ProductUnitEventType" AS ENUM (...);
ALTER TABLE "Product" ADD COLUMN "trackSerials" BOOLEAN NOT NULL DEFAULT false,
                      ADD COLUMN "warrantyMonths" INTEGER;
CREATE TABLE "ProductUnit" (...);
CREATE TABLE "ProductUnitEvent" (...);
CREATE TABLE "SerialRequest" (...);
CREATE UNIQUE INDEX ... ; CREATE INDEX ... ;
ALTER TABLE "ProductUnit" ADD CONSTRAINT ... FOREIGN KEY ... ON DELETE RESTRICT ON UPDATE CASCADE;
```

**Extra SQL appended by hand to the same migration** (new tables only):

```sql
ALTER TABLE "ProductUnit" ADD CONSTRAINT "unit_order_link_ck"
  CHECK ((status IN ('ALLOCATED','SOLD')) = ("orderId" IS NOT NULL));
ALTER TABLE "ProductUnit" ADD CONSTRAINT "unit_sold_dates_ck"
  CHECK (status <> 'SOLD' OR "soldAt" IS NOT NULL);
ALTER TABLE "ProductUnit" ADD CONSTRAINT "unit_supplier_return_ck"
  CHECK (status <> 'RETURNED_TO_SUPPLIER' OR "purchaseReturnId" IS NOT NULL);
ALTER TABLE "ProductUnit" ADD CONSTRAINT "unit_sellable_condition_ck"
  CHECK (status NOT IN ('ALLOCATED') OR condition = 'GOOD');
ALTER TABLE "ProductUnit" ADD CONSTRAINT "unit_serial_len_ck"
  CHECK (char_length("serialKey") BETWEEN 3 AND 64);

CREATE FUNCTION product_unit_event_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'ProductUnitEvent rows are append-only'; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER product_unit_event_no_update BEFORE UPDATE ON "ProductUnitEvent"
  FOR EACH ROW EXECUTE FUNCTION product_unit_event_immutable();
```

Prisma doesn't model CHECKs or triggers, so `migrate dev` won't report drift for them. They're the last line of
defence: a code bug that would leave e.g. a `SOLD` unit without an order fails the whole transaction instead of
committing bad data. `DELETE` on events stays allowed only for the mistaken-unit delete (§6.3).

If the generated file contains any `DROP`, `ALTER COLUMN`, `RENAME` or `UPDATE` against an existing
table, **stop**: the schema has drifted and must be investigated before applying anything.
Postgres 11+ adds a `NOT NULL DEFAULT false` column without rewriting the table, so this is safe on a
live Neon database.

---

## 4. Serial input rules

### 4.1 Normalization (one shared function, backend `common/utils/serial.ts`, mirrored in frontend)

- Trim; strip control characters (scanners sometimes send `\r`, `\t`, GS `\x1d`).
- `serialKey` = uppercase, all internal whitespace removed.
- Allowed: printable ASCII `[A-Za-z0-9\-_/.:#+]`, length **3–64**. Anything else is rejected with a clear message.
- Optional per-brand prefix stripping (e.g. scanners adding `S/N:`) as a later setting, not v1.

### 4.2 Per-request limits

- Max **500 serials** per request (DTO `@ArrayMaxSize(500)`), each validated with `@Matches`.
- Duplicates inside the same request are rejected before touching the DB.
- Serials for a purchase line ≤ that line's quantity, minus serials already registered for the line.
- Serials for an order line ≤ ordered quantity − quantity returned by sales returns.

### 4.3 Validity per context

| Context | A serial is accepted only if… |
|---|---|
| Receive (purchase / replacement / opening stock) | No unit with the same `productId + serialKey` exists, and it is not the product's own `barcode`/`sku`/`productCode`. |
| Assign to order | The unit exists, belongs to that product, is `IN_STOCK` with condition `GOOD`, and has no `orderId`. A `DEFECTIVE` unit gets the verdict `DEFECTIVE` ("returned faulty on RTN-…"). |
| Assign to order — **unknown serial** | Allowed only while the product has an untracked gap (§6.2): the server locks the product row, re-computes the gap inside the transaction, creates the unit as `OPENING_STOCK` and assigns it. Two concurrent requests can't both use the last slot, because the second waits on the row lock and then sees gap = 0. For a `DELIVERED`/`COMPLETED` order (goods already gone) the check is the line's own limit instead: assigned ≤ quantity − returned. The UI shows it as "new — will be registered". |
| Sales return | The unit is `SOLD` on **this** order. |
| Purchase return | The unit is `IN_STOCK`, same product (and same purchase, if the return is linked to one). |

### 4.4 Model barcode vs. unit serial

A TV box usually carries both an EAN (same on every box) and a serial barcode. If the scanned value
equals any `Product.barcode`, `sku` or `productCode`, the scan dialog answers
**"That's the model barcode of *Samsung 55" QLED* — scan the serial number label instead."**
This is the most common real-world scanning mistake and it's caught before anything is saved.

---

## 5. Backend API (new module `src/product-units/`)

Same structure as every other module: controller + service + `dto/*`. All routes are 👑 admin-only,
except the dealer read in §5.3.

### 5.1 Units

| Method & path | Purpose |
|---|---|
| `POST /product-units/validate` | **No writes.** Body `{ productId, serials[], context: RECEIVE \| ASSIGN \| SALES_RETURN \| PURCHASE_RETURN, orderId?, purchaseId? }` → a verdict per serial: `OK`, `NEW_WILL_REGISTER`, `DUPLICATE_IN_REQUEST`, `ALREADY_EXISTS`, `IS_MODEL_BARCODE`, `WRONG_PRODUCT` (+ which product), `ALREADY_SOLD` (+ order no.), `NOT_IN_STOCK`, `INVALID_FORMAT`. Powers the live scan dialog. Throttled. |
| `POST /product-units` | Register serials. `{ productId, serials[], source, purchaseId?, replacementId?, receivedAt?, idempotencyKey }`. Retrying with the same `idempotencyKey` returns the first result instead of failing or duplicating. |
| `GET /product-units?productId&status&purchaseId&orderId&search&page&limit` | Paginated list (standard pagination shape). |
| `GET /product-units/:id` | Full detail, shaped for the page in §7.5: `unit`, `product` (+images), `statusSummary` (headline + sub-line, computed server-side), `received` (purchase/replacement + supplier), `currentSale` (order, invoice + payment status, dealer, rep, delivery dates, warranty), `customerReturns[]`, `supplierReturns[]` (each with `replacement` state), `swaps[]`, `writeOff`, `previousSales[]`, `timeline[]`. Live document data comes from the linked rows; for deleted documents it falls back to the event snapshots and is marked "document deleted". |
| `GET /product-units/scan/:code` | Resolver for the Scan screen: `{ kind: 'UNIT', units: [...] }` (1 = open directly, >1 = chooser), `{ kind: 'PRODUCT', product }` (model barcode scanned), or `{ kind: 'NONE' }`. |
| `PATCH /product-units/:id` | Fix a typo in the serial (`IN_STOCK` only, never sold), edit notes or `warrantyExpiresAt`. Logs `SERIAL_CORRECTED` / `WARRANTY_UPDATED` with the old value. |
| `DELETE /product-units/:id` | Only if `IN_STOCK` and its history has no `ASSIGNED_TO_ORDER` event (a pure data-entry mistake). Otherwise refused: "This unit has sales history; write it off instead." |
| `POST /product-units/:id/condition` | `{ condition: GOOD \| DEFECTIVE, reason }`, `IN_STOCK` units only. |
| `POST /product-units/:id/warranty-swap` | `{ replacementSerial, reason, idempotencyKey }`: the §6.1 step 3 swap, one transaction, no stock or money writes. |
| `POST /product-units/:id/supplier-replacement` | `{ serial, replacementId?, receivedAt, idempotencyKey }`, only for a `RETURNED_TO_SUPPLIER` unit with no `replacedBy` yet. |
| `GET /product-units/coverage?productId` | Per tracked product: `currentStock`, `IN_STOCK` serials, reserved-but-unassigned qty, and the **untracked gap** (§8.3). |

### 5.2 Order assignment

| Method & path | Purpose |
|---|---|
| `GET /orders/:id/units` | For each line of a tracked product: `{ productId, quantity, returnedQty, assigned: Unit[] }`. |
| `PUT /orders/:id/units` | Body `{ lines: [{ productId, serials[] }], idempotencyKey }`. **Desired final set**: the server diffs it against what's assigned, unassigns the removed units and assigns the added ones, in one transaction. Allowed in `APPROVED`, `PACKED`, `DELIVERED`, `COMPLETED` (late entry for already-delivered goods). Refused in `PENDING_APPROVAL` / `REJECTED`. Can't unassign a unit already returned by a sales return. |

**Status meaning (settled, see D7):**
- Scanning onto an `APPROVED` / `PACKED` order → `ALLOCATED` (`orderId`, `allocatedAt` set; no warranty yet). The TV is
  still in the building and can be unassigned freely.
- Scanning onto a `DELIVERED` / `COMPLETED` order (late entry) → straight to `SOLD` with the warranty stamped as below.
- When the order moves to `DELIVERED` (`advanceStatus`) or is fast-forwarded (`completeDirectly`), or is created
  already completed (admin walk-in with `completionDate`), every `ALLOCATED` unit on it → `SOLD` **in the same
  transaction**, with `soldAt = deliveredAt ?? completedAt`.

**Warranty stamping (settled):** on `ALLOCATED → SOLD` only, and only when `warrantyManual = false`:
`warrantyStartsAt = soldAt`, `warrantyExpiresAt = soldAt + product.warrantyMonths`. Order dates never change after
delivery in this system except through `updateAdminOrder`'s `saleDate` on a completed order. In that case units with
`warrantyManual = false` are restamped from the new date, and manual ones are left alone. An admin edit
(`PATCH /product-units/:id`) sets `warrantyManual = true` and logs `WARRANTY_UPDATED` with the old and new values.
Changing `product.warrantyMonths` later **never** rewrites existing units.

### 5.3 Reads added to existing endpoints

- `GET /invoices/:id` → also returns `serialAnnex: [{ productName, model, brand, serials: [{ serialNumber, warrantyExpiresAt }] }]`.
  This works for the dealer role too, because the existing `findOne` already scopes dealers to their own
  invoices. Dealers never get cost price, supplier or purchase data.
- `GET /purchases/:id` → `units` grouped by productId with counts (`registered / quantity`).
- `GET /orders/:id` → `serialProgress: { [productId]: { assigned, required } }` (cheap `groupBy`), for the badge on the order screen.

### 5.4 Admin-created orders (walk-in / backdated sales)

`POST /orders` from the admin (`order-form.tsx`, which goes through `applyApproval` and possibly `completionDate`)
accepts an optional `serials` array per item. They are assigned **inside the same transaction** right after
`applyApproval`, so a walk-in TV sale is created with its serials in one step.

---

## 6. Changes to existing flows (the "don't break anything" list)

Every row below runs inside that flow's **existing** transaction. ✋ = new refusal. ↩ = automatic serial reversal.

| Flow (file) | Serial rule |
|---|---|
| `OrdersService.updateItems` (pending only) | Nothing: pending orders can't have serials. |
| `OrdersService.updateAdminOrder` | Units are untouched by the `orderItem.deleteMany`, because they don't reference items. After rebuilding the items: ✋ if a product with assigned units was removed or its quantity dropped below the assigned count, refuse with "Unassign N serial(s) of *X* first." If the dealer changes, units stay with the order (the event records it). |
| `OrdersService.remove` | ↩ All assigned units (`ALLOCATED` or `SOLD`) → `IN_STOCK`, `orderId = null`, warranty fields cleared (old values kept in the event), event `UNASSIGNED_FROM_ORDER` ("order deleted"). Runs before `order.delete`; without it the RESTRICT FK would block the delete. |
| `OrdersService.reject` | Nothing: pending only. |
| `OrdersService.advanceStatus` → `DELIVERED` / `completeDirectly` | `ALLOCATED` units on the order → `SOLD` + warranty stamp (§5.2), same transaction. No stock call: stock was already reserved at approval. → `PACKED`: nothing. |
| `OrdersService.create` (admin, with `completionDate`) | Serials sent with the order are created as `SOLD` directly, after `applyApproval`, same transaction. |
| `DealersService.clearData` | ↩ For every cleared order: units currently `SOLD` on it → `IN_STOCK`, `orderId = null`, event `RELEASED_BY_DATA_CLEAR`. Units that came back through its sales returns are already `IN_STOCK` (or have moved on since) and are **left as they are**. Unlike a single sales-return delete, a data-clear must never be blocked by a unit that was resold, because its stock math already nets the return and the sale out. |
| `PurchasesService.create` | Optional `serials[]` per item, registered as `source = PURCHASE` in the same transaction. |
| `PurchasesService.update` | ✋ Refuse if any unit of this purchase is not `IN_STOCK` ("N serial(s) from this purchase are already sold or returned"). Otherwise keep units whose product is still on the purchase with a quantity ≥ unit count; ✋ refuse if the edit would leave more serials than quantity for a product. |
| `PurchasesService.remove` | ✋ Refuse if any unit is not `IN_STOCK`. Otherwise delete its `IN_STOCK` units and their events in the same transaction (the purchase "never happened"); the activity log records the serials removed. |
| `PurchasesService.cancel` | ↩ Units of this purchase still `IN_STOCK` → `RETURNED_TO_SUPPLIER`, `purchaseReturnId` = the cancellation return. The count can't exceed the quantity the cancellation return takes back. |
| `PurchasesService.reinstate` | ↩ Exact reverse of the above (`SUPPLIER_RETURN_REVERSED`). |
| `SalesReturnsService.create` | Per item: `serials: [{ serial, condition, faultNote? }]`; `condition` (`GOOD` / `DEFECTIVE`, default `DEFECTIVE` when the reason is a fault). The number of serials picked must be ≥ return qty − (line qty − assigned serials): if 5 TVs went out with 3 serials and 2 come back, at least 0 must be picked, but if all 5 had serials, both returned ones must be picked, so we always know *which* TV came back. Serials must be `SOLD` on **this** order. Units → `IN_STOCK`, `orderId = null`, chosen condition, event `RETURNED_BY_DEALER` (return no., reason, dealer name). The existing order-row `FOR UPDATE` lock also serializes serial picks. |
| `SalesReturnsService.update / remove` | ↩ Reverse the previous serial set (back to `SOLD` on the order, previous condition restored from the event). ✋ Refuse if one of those units has since been resold, sent to the supplier, written off or swapped ("TV SN123 from this return was already resold on ORD-…"). |
| `PurchaseReturnsService.create` — linked to a purchase | Optional `serials[]` per item; units must be `IN_STOCK` and, if they have a `purchaseId`, from **this** purchase. `DEFECTIVE` units are offered first in the picker (typical case: a customer's faulty TV going back to the supplier). Units → `RETURNED_TO_SUPPLIER`, `purchaseReturnId` set. |
| `PurchaseReturnsService.create` — standalone (no purchase) | Same, without the same-purchase check. |
| `PurchaseReturnsService.update / deleteWithin` | ↩ Units back to `IN_STOCK` with their previous condition. ✋ Refuse if a unit has since been replaced by a registered replacement unit (`replacedBy` set); unlink the replacement first. |
| `PurchaseReturnsService.link` (standalone return → purchase) | ✋ Refuse if any unit on the return has a `purchaseId` other than the target purchase. Otherwise only an event `SUPPLIER_RETURN_RELINKED`; the units don't change. |
| `PurchaseReturnsService.unlink` | Event `SUPPLIER_RETURN_RELINKED` only; units unchanged. |
| Cancellation return (`isCancellation`) | Never edited/deleted on its own (existing rule), so its units only move through `cancel` / `reinstate` above. |
| **Supplier replacements — note** | In this backend, `PurchaseReturnReplacement` is **read-only** (the tables came from a feature branch; only `credits.service.ts` reads them, and nothing creates or deletes them). So v1 does **not** hook into a replacement flow. Instead, the unit page of a `RETURNED_TO_SUPPLIER` unit gets **"Register supplier replacement"**: scan the new serial, which creates a unit with `source = REPLACEMENT`, `replacesUnitId` = the returned unit, and `replacementId` if the admin picks an existing replacement record. **No stock movement**: the stock side stays with whatever the admin records in the existing quantity screens. If a replacement-create endpoint is added later, it takes `serials[]` and follows the purchase-create rule. |
| `InventoryService` adjustment (negative) | Optional `serials[]` → `WRITTEN_OFF`. Positive adjustment: optional `serials[]` registered as `OPENING_STOCK`. |
| `ProductsService.remove` | Already refuses on FK violation with "has history — deactivate instead"; units add one more FK, same message. |
| `ProductsService.update` turning `trackSerials` off | Allowed; existing units and their history are kept and stay searchable; only the scan prompts disappear. |

**Stock is never moved by serial code.** All `recordMovement` calls stay exactly where and how they are today.

Modules checked that need **no** serial change: payments, refunds (money only, per dealer/supplier, not per unit),
credits / supplier settlements, liquid cash, balance sheet, equity, investors, expenses, commission, collections,
dashboard, reports, banners/brands/categories, rep portal (reps don't scan in v1; rep search keeps using the
model `Product.barcode`), counters and `reset-counter` endpoints.

### 6.1 Return & warranty lifecycle with serials

```
 Supplier ──purchase──▶ IN_STOCK/GOOD ──assign──▶ SOLD (Dealer X, ORD/INV)
                            ▲  │                       │
          supplier          │  │ write-off             │ customer return (sales return)
          replacement       │  ▼                       ▼
          (new serial,      │ WRITTEN_OFF        IN_STOCK/GOOD ──▶ resell
           replacesUnitId)  │                    IN_STOCK/DEFECTIVE
                            │                          │ purchase return
                            └──── RETURNED_TO_SUPPLIER ◀┘
```

1. **Customer returns a good unit** (wrong model, cancelled): sales return with condition `GOOD`. It's back in sellable stock and can be scanned into a new order.
2. **Customer returns a faulty unit** (refund or credit): sales return with condition `DEFECTIVE`. The money side is the existing sales-return logic (dealer balance / store credit / refund). The unit is blocked from sale, then goes back on a purchase return to the supplier (`RETURNED_TO_SUPPLIER`). When the supplier sends a new one, use "Register supplier replacement" (`replacesUnitId` links old to new).
3. **Warranty swap, no money** (dealer brings a faulty TV and gets another TV of the same model): **Warranty swap** action on the sold unit's page. Scan the replacement (`IN_STOCK`, `GOOD`, same product). In one transaction: the old unit → `IN_STOCK`/`DEFECTIVE`, `orderId = null`, event `WARRANTY_SWAP_OUT`; the new unit → the old unit's status (`ALLOCATED` or `SOLD`) on the **same order**, `replacesUnitId` = old, **same `warrantyStartsAt`/`warrantyExpiresAt` as the old unit, with `warrantyManual = true`** (warranty doesn't restart unless the admin edits it), event `WARRANTY_SWAP_IN`. Stock: one unit in, one out of the same product, so `currentStock` correctly stays unchanged and **no stock movement or money is written**. The invoice serial page then shows the new serial with "replaces SN…".
4. **Mark defective / good**: available on any `IN_STOCK` unit (e.g. damaged in the warehouse), with a reason; events `MARKED_DEFECTIVE` / `MARKED_GOOD`.
5. **Write-off** of a defective unit: via the existing negative stock adjustment with that serial (§6 table).

The unit detail page shows the whole chain: "Sold to Dealer X on INV-…, returned on RTN-… (defective), sent back on PRN-…, replaced by SN-NEW (sold on …)".

### 6.2 Shelf invariant & coverage formula (settled)

Definitions for one product, all read inside the transaction after `SELECT … FOR UPDATE` on the product row:

| Symbol | Meaning | Source |
|---|---|---|
| `S` | `Product.currentStock` | existing column |
| `R` | Units reserved on orders not yet delivered = Σ `OrderItem.quantity` on orders in `APPROVED` / `PACKED`. Still physically here: stock is reserved at approval, but the goods leave at delivery. | existing tables |
| `H = S + R` | **Units physically in our building** (including defective ones, which `currentStock` already counts after a sales return) | derived |
| `T` | Serial units physically here = count of `IN_STOCK` + `ALLOCATED` units | new table |
| `gap = H − T` | Units on the shelf with no serial registered yet | derived |

**Invariant: `T ≤ H` (gap ≥ 0).** Coverage reports `gap > 0` as a to-do list, never as an error.

Enforcement, so it can't silently drift:
- **Operations that add a serial without a stock movement** (register opening stock, register against a purchase
  after the fact, unknown serial on assign): refused if they'd make `gap < 0`.
- **Existing operations that reduce stock of a tracked product** (purchase return, purchase edit/delete/cancel, negative
  adjustment): after their unchanged `recordMovement`, if `gap < 0` **and** it is lower than before the operation, the
  request must pick that many serials (they leave with the goods). Otherwise it's refused with "Select N serial(s)
  leaving stock". This is a **new refusal only for `trackSerials` products**; untracked products behave exactly as today.
- **Operations that move stock and units together** (sales return in, order delete release, cancellation/reinstate)
  keep `gap` unchanged by construction. The check still runs as an assertion.
- If legacy data is already at `gap < 0` (e.g. before this rule existed), operations that don't make it worse are
  allowed. The coverage report flags the product in red for an admin to fix, with links to the units to review.
  **Nothing is ever auto-corrected:** neither stock nor units are adjusted by the system.

Coverage report columns: `S`, `R`, `H`, `T`, `gap`, `ALLOCATED` without delivery, `DEFECTIVE` in stock, units
`SOLD` this month. A unit test covers every row of §6 against this formula.

### 6.3 Deleting a unit (mistaken registration only)

Allowed only when **all** hold, checked inside the transaction after locking the unit row (`FOR UPDATE`):
`status = IN_STOCK`; no event of type `ASSIGNED_TO_ORDER`, `RETURNED_*`, `WARRANTY_SWAP_*`, `WRITTEN_OFF`; no
`replacedBy` / `replacesUnitId`. Order of writes: (1) `ActivityLog` row `DELETED_SERIAL_UNIT` whose `details` holds the full
JSON snapshot of the unit **and all its events**, (2) `DELETE` its events, (3) `DELETE` the unit. Because
`ProductUnitEvent → ProductUnit` is `RESTRICT`, deleting the unit before its events is impossible. Everything else is
corrected with **Correct serial** (typo) or **Write off** (gone), never deleted.

### 6.4 Reversal rule (returns, cancellations, swaps)

Every reversal (sales return edit/delete, purchase return edit/delete, reinstate, write-off reversal) runs this
inside the transaction **before** touching anything:
1. Lock the affected unit rows (`SELECT … FOR UPDATE`).
2. For each unit, confirm its **latest event** is the one being reversed, i.e. nothing happened to it since. A unit
   resold, sent to the supplier, swapped, written off or corrected after the return fails the check.
3. If any unit fails, throw before any write. The document, stock, money and units all stay exactly as they were, and
   the error names the unit and what happened to it later.
4. Otherwise write the reverse state plus a `*_REVERSED` event. The original events are never edited or deleted.

---

## 7. Frontend

### 7.1 Scanner input (shared)

USB/Bluetooth barcode scanners act as a keyboard: they type the code quickly and press Enter.

- `components/scan/serial-scan-input.tsx`: an autofocused input; **Enter** commits a code. It also accepts a
  pasted list (newlines, commas, tabs) for bulk entry from a supplier's packing list in Excel.
- `hooks/use-barcode-scanner.ts`: global keystroke listener used only on the Scan screen. It detects a burst
  of ≥4 characters with <35 ms between keys ending in Enter, ignores events while the user is typing in another
  input, and calls `onScan(code)`.
- Feedback per scan: short beep (WebAudio, two tones for OK/error), green/red flash, toast with the reason.
  The operator should never need to look at the screen to know whether a scan worked.
- **Camera scanning** (phone/tablet, for reps or a warehouse without a scanner): the native `BarcodeDetector`
  API where available, falling back to `@zxing/browser`. Phase 5, behind a "Use camera" button.

### 7.2 `SerialScanDialog` (reused everywhere)

```
┌ Scan serials — Samsung 55" QLED (QA55Q60) ───────────────┐
│ [ ▌scan or paste…                                    ]   │
│  3 / 5 scanned                         ██████░░░░        │
│  ✓ SN0A12345   new                                  ✕    │
│  ✓ SN0A12346   new                                  ✕    │
│  ✗ 8806094… model barcode — scan the serial label   ✕    │
│  ✓ SN0A12347   new                                  ✕    │
│                                    [Cancel] [Save 3]     │
└──────────────────────────────────────────────────────────┘
```

- Duplicates are checked instantly on the client; then a debounced `POST /product-units/validate` returns
  the server verdict for each serial.
- Further scans are blocked once the quantity is reached.
- **Nothing is saved until Save**, which sends one request with an `idempotencyKey` (`crypto.randomUUID()`
  generated when the dialog opens), so a double click or network retry can't create duplicates.
- Save is disabled while any row has an error. Saving fewer serials than the quantity is allowed
  (scanning is optional); the rest can be added later.
- Props: `{ product, max, context, orderId?, purchaseId?, initial? }`.

### 7.3 Screens

| Where | Change |
|---|---|
| `product-form-dialog.tsx` | "Track serial numbers" switch + "Warranty (months)" number field. |
| `admin/products` list | Small "Serial-tracked" badge; filter. |
| Product detail / inventory ledger sheet | New **Units** tab: list with status filter, coverage ("12 in stock · 9 with serials · 3 untracked"), **Register serials** button (source `OPENING_STOCK`) for stock already on the shelf. |
| `purchase-form.tsx` (new + edit) | For tracked products, a "Scan serials (0/5)" button on each line; the serials go in the same create/update request. |
| `admin/purchases/[id]` | Per line "5 / 5 serials" with an expandable list; **Add serials** to scan more later. |
| `admin/orders/[id]` | A **Serial numbers** card (status `APPROVED` and later) with one row per tracked line: progress badge, **Scan** button (opens the dialog in `ASSIGN` mode), assigned list with remove. Warning chip "Serials 3/5" next to the status. The "Mark Packed / Delivered / Complete" buttons show a confirm "2 serials still missing — continue anyway?" (soft enforcement, §11 D2). |
| `order-form.tsx` (admin create) | Optional scan per tracked line, sent with the create request. |
| `sales-return-form-dialog.tsx` (customer return) | For tracked lines with assigned units: tick which serials came back (checkboxes, or scan to tick), plus a Good / Defective choice and an optional fault note (quick picks + free text) per serial. The minimum number of picks is shown and enforced. Editing a return pre-ticks its serials. |
| `purchase-return-form-dialog.tsx`, `standalone-purchase-return-form-dialog.tsx` (return to supplier) | Optional serial picker/scan from `IN_STOCK` units (from this purchase when linked), defective units listed first. |
| `purchase-returns-tab.tsx` / return detail | The serials on each return; link/unlink shows an error if serials belong to another purchase. |
| `stock-adjustment-dialog.tsx` | Negative: pick serials to write off. Positive: optionally scan serials to register. |
| `admin/units/[id]` actions | Mark defective/good, **Warranty swap**, **Register supplier replacement**, Write off, all shown only when the status allows. |
| `invoice-print-layout.tsx` (admin + dealer invoice) | **Page 2 — Serial Number Annex**, see §7.4. |
| **New** `admin/scan/page.tsx` + nav item "Scan" | Big scan box. Resolves via `/product-units/scan/:code`: unit → redirect to unit page; several → chooser; model barcode → product card with "this is a model barcode" note; none → "Not registered" + "Register this serial" shortcut. Keeps the last 10 scans in the session. |
| **New** `admin/units/[id]/page.tsx` | **Unit detail**, see §7.5. |
| Dealer `dealer/invoices/[id]` and `dealer/orders/[id]` | Read-only serial list (their warranty proof). |

### 7.4 Invoice page 2 — Serial Number Annex

- Rendered only when the invoice has at least one assigned serial, inside `InvoicePrintLayout` as
  `<section className="break-before-page">` (Tailwind `break-before-page`, plus a `@media print` fallback).
- Header repeats invoice no., date and dealer, so page 2 is valid on its own as warranty proof.
- Table: `#`, Product (brand / model), Serial No., Warranty until. Grouped by product, sorted by serial.
  `thead { display: table-header-group }` so the header repeats if the list runs to page 3.
- Footer: "Total units: 12", plus a signature/stamp line.
- Optional: a Code128 barcode of each serial (via `jsbarcode`, ~20 KB) so the printed invoice itself can be scanned. Phase 5.
- If a tracked line is incomplete, the Print button shows a warning: "Serial page lists 3 of 5 TVs."

### 7.5 Unit detail page (what the scan opens)

Scanning a serial on the Scan screen (or clicking any serial anywhere in the app) opens this page.
The goal is that **one look answers "where is this unit, what happened to it, and why"**.

**A. Status header**, always on top, colour-coded. The headline is computed server-side from status + condition +
the latest event:

| Situation | Headline | Sub-line |
|---|---|---|
| In stock, good | 🟢 **In stock** | Received 02 Sep 2026 from ABC Distributors (PINV-4471) |
| In stock after a good return | 🟢 **In stock — returned by customer** | Returned by Dealer X on RTN-2026-00004, 14 Oct: "wrong model ordered" |
| In stock, defective | 🟠 **Defective — in our store** | Returned by Dealer X on RTN-2026-00004, 14 Oct: "no display". **Not sellable.** Next step: return to supplier |
| Sold | 🔵 **Sold to Dealer X** | INV-2026-00009 · delivered 10 Oct · warranty valid, 287 days left |
| Sold, a replacement from a swap | 🔵 **Sold to Dealer X (warranty replacement)** | Replaces SN0A12299 (swapped 20 Oct: "dead pixels") |
| Returned to supplier, waiting | 🟣 **With supplier — awaiting replacement** | Sent to ABC Distributors on PRN-2026-00002, 16 Oct: "faulty panel" · 6 days ago |
| Returned to supplier, replaced | 🟣 **Returned to supplier — replaced** | Replaced by SN0B77810, received 30 Oct |
| Returned on purchase cancellation | 🟣 **Returned to supplier (purchase cancelled)** | PINV-4471 cancelled 05 Sep: "order called off" |
| Written off | ⚫ **Written off** | 01 Nov: "screen cracked in warehouse" |

Badges next to it: status, condition (Good / Defective), warranty (Valid / Expired / Not set).

**B. Product**: image, name, brand, model, category, warranty text and months, link to the product.

**C. Received from (admin only)**: purchase invoice no. and date, supplier name and phone, unit cost, link to the purchase.
For a replacement unit: "Supplier replacement for SN… (returned on PRN-…)", with links.
For opening stock: "Registered from existing stock on <date> by <admin>".

**D. Current sale**, if sold: order no. and status, invoice no., invoice payment status (Paid / Partial / Pending / Overdue),
sale price for this unit (net unit price), sold and delivered dates, buyer (business name, owner, phone, address,
district), the rep who placed it if any. Warranty: start, months, expiry, days left. [Edit] for admins.

**E. Customer returns**, one card per sales return this unit was part of (there can be several over its life):
```
↩ RTN-2026-00004 · 14 Oct 2026 · from Dealer X (ORD-2026-00012 / INV-2026-00009)
  Reason (on the return):  Customer reports no display
  This unit:               Defective — "no display, power LED blinks"
  Credited for this unit:  Rs 145,000 (net unit price)          [admin only]
  Recorded by:             admin name · 14 Oct 10:32
  Now:                     sent to supplier on PRN-2026-00002 →
```

**F. Returns to supplier**, one card per purchase return / cancellation:
```
↪ PRN-2026-00002 · 16 Oct 2026 · to ABC Distributors (linked to PINV-4471)
  Reason (on the return):  Faulty panel — customer return RTN-2026-00004
  This unit:               Defective, unit cost Rs 120,000                [admin only]
  Replacement:             ⏳ Awaiting · 6 days       [Register supplier replacement]
                       or  ✅ SN0B77810 received 30 Oct (link)
  Recorded by:             admin name · 16 Oct 09:10
```

**G. Warranty swaps**: "Swapped out on 20 Oct, replaced by SN… for Dealer X: 'dead pixels'", or the reverse view on the new unit.

**H. Write-off**: date, reason, admin, stock adjustment reference.

**I. Previous sales**: if the unit was sold, returned and resold, every earlier sale with its buyer and return, so
"who had this TV before" is always answerable.

**J. Full timeline** (bottom, newest first): every `ProductUnitEvent` with date, event, document link (or
"document deleted" + the snapshot number), party, reason, fault note, the status/condition it moved to, and the admin.
Nothing ever disappears from here.

**K. Actions**, shown only when the status allows: Correct serial · Mark defective / good · Warranty swap ·
Register supplier replacement · Write off · Print label · Copy link.

**Dealer view** (their own units only, via their invoice/order): product, serial, invoice, delivery date, warranty
status, and their own returns with reasons. Never cost, supplier, purchase or supplier returns.

**Scan screen quick card**: after each scan, before opening the page, the Scan screen shows a one-line card with the
**status header from A** (colour, headline, sub-line). Scanning several units in a row (e.g. checking a returned batch)
shows a stack of these cards without leaving the screen.

**Where the reasons come from**
- Customer return reason: `SalesReturn.reason` (existing field). Per-unit fault: the new `faultNote` from the return
  dialog (an optional text per serial, with quick picks: No power / No display / Physical damage / Wrong model / Other).
- Supplier return reason: `PurchaseReturn.reason` (existing); cancellation: `Purchase.cancelReason` (existing).
- Write-off, swap and condition change: a required reason field in their dialogs.
- All of them are also copied into `ProductUnitEvent.reason` / `faultNote` at that moment. So if a return is later
  edited, the timeline still shows what was recorded then, and the card shows the current value, marked "edited" if it differs.

### 7.6 Frontend plumbing (existing conventions)

- `lib/api/endpoints.ts` + `lib/api/types.ts`: `ProductUnit`, `ProductUnitEvent`, `SerialVerdict`, `ScanResult`.
- `hooks/use-product-units.ts` (React Query): `useUnits`, `useUnit`, `useScanResolve`, `useValidateSerials`,
  `useRegisterUnits`, `useOrderUnits`, `useAssignOrderUnits`. Invalidate the `orders`, `invoices`, `purchases`
  and `units` keys on mutation.
- `lib/serial.ts`: same normalization as the backend.

---

## 8. Enhancements on top of the core idea

1. **Label printing for unlabeled units.** For a product without a manufacturer serial barcode, "Generate & print
   labels" creates internal serials `EM-<productCode>-000001…` (sequence via the existing `Counter` /
   `nextSequenceNumber`) and prints a sheet of Code128 stickers. Now every unit is scannable. (Phase 5)
2. **Warranty lookup at the counter.** A dealer's customer brings a TV back → scan it → the unit page shows
   instantly whether it's in warranty, who bought it, and the supplier and purchase invoice to claim against
   (supplier warranty usually runs from *our* purchase date).
3. **Coverage & reconciliation report** (`/product-units/coverage`). Per tracked product:
   `untracked gap = currentStock + reservedButUnassigned − IN_STOCK serials`. A non-zero gap isn't an error
   (scanning is optional); it's a to-do list. A **negative** gap means more serial units than physical stock,
   which flags a data-entry problem to fix. It's computed, never auto-corrected.
4. **Warranty expiring report.** Units whose warranty ends in the next 30/60/90 days, filter by dealer. Useful for
   service calls and upselling extended warranty.
5. **Dealer self-service.** Dealer portal: "My serials" search; dealers can check warranty for their own units only.
6. **Warranty claims** (later): a `WarrantyClaim` table linked to a unit (received, sent to supplier, repaired,
   replaced, returned to dealer), with a replacement unit swap that keeps both units' histories. Not v1.
7. **Public QR verification** (optional, later): a QR on the invoice annex pointing at a signed, expiring token that shows
   **only** product + serial + "warranty valid until". Never buyer data or prices. Only if there's a real need,
   because it's the one piece that faces the internet.

---

## 9. Security

- All `/product-units/*` and `PUT /orders/:id/units` routes: `JwtAuthGuard + RolesGuard(ADMIN)`, the same decorators
  as the purchases controller. Dealers and reps get serials only through the invoice/order reads that already
  enforce ownership.
- DTO validation (`class-validator`): array sizes, string length/charset, UUID ids, enums. The global
  `ValidationPipe` with `whitelist` drops unknown fields.
- `@Throttle` on `validate` and `scan/:code` (e.g. 120/min/admin): a scanner is fast, but not *that* fast.
- Serial strings are rendered as text only (React escapes; no `dangerouslySetInnerHTML`) and, in CSV export,
  through the existing `lib/csv.ts` escaping. Values beginning with `= + - @` are prefixed with `'` (CSV/Excel injection).
- Every mutation writes `ActivityLog` (`REGISTERED_SERIALS`, `ASSIGNED_SERIALS`, `CORRECTED_SERIAL`,
  `WROTE_OFF_UNIT`, …) **and** `ProductUnitEvent`, inside the same transaction.
- Unique violations (`P2002`) map to `409` with a readable message (like `isForeignKeyViolation` today); FK
  violations (`P2003`) map to `409` "has related serial records".
- **Idempotency (settled, D8):** a dedicated table, written **inside** the same transaction as the work:

  ```prisma
  model SerialRequest {
    id             String   @id @default(uuid())
    idempotencyKey String   @unique
    adminId        String
    operation      String   // REGISTER | ASSIGN_ORDER | SWAP | SUPPLIER_REPLACEMENT | RETURN_SERIALS …
    requestHash    String   // sha256 of the canonical request body
    response       Json     // what the first successful call returned
    createdAt      DateTime @default(now())
    @@index([adminId, createdAt])
  }
  ```

  Flow: (1) before the transaction, look up the key. If found with the same `requestHash` and `adminId`, return the stored
  `response` and do nothing else. If found with a different hash, return `409` "this key was used for a different request".
  (2) Otherwise run the work and insert the `SerialRequest` row **as the last statement of the same transaction**.
  (3) If two identical requests race, the second insert hits the unique index (`P2002`), its whole transaction rolls back,
  and the handler re-reads the key and returns the first call's stored response.
  **Crash safety:** if the process dies mid-transaction, Postgres rolls everything back including the key row, so the
  retry simply runs again. There is never a "key saved but work not done" state, or the reverse.
  Keys older than 30 days can be purged by the existing `@nestjs/schedule` setup. Business data is unaffected.
  For serial fields carried **inside existing document requests** (purchase create, sales return create…), those
  endpoints keep their current duplicate protection. Serial uniqueness (`@@unique`) additionally makes a replayed
  registration fail as a whole rather than half-apply.

---

## 10. Rollout (phased, each phase shippable alone)

### 10.1 Safe workflow (strict order, no skipping)

**Step 1 — Baseline (read-only).**
- `npx prisma migrate status` against production: it must say "Database schema is up to date" with the 27 migrations
  listed in `prisma/migrations`. If anything is pending or failed, stop and resolve that first; never stack a new migration on drift.
- Run the **business fingerprint** (read-only) and save the output with a timestamp:

```sql
SELECT 'product'  k, count(*), md5(string_agg(id||':'||"currentStock", ',' ORDER BY id)) FROM "Product"
UNION ALL SELECT 'invlog',   count(*), md5(string_agg(id||':'||"quantityIn"||':'||"quantityOut"||':'||"balanceAfter", ',' ORDER BY id)) FROM "InventoryLog"
UNION ALL SELECT 'invoice',  count(*), md5(string_agg(id||':'||"grandTotal"||':'||"paymentStatus", ',' ORDER BY id)) FROM "Invoice"
UNION ALL SELECT 'orderitem',count(*), md5(string_agg(id||':'||quantity||':'||"netLineTotal", ',' ORDER BY id)) FROM "OrderItem"
UNION ALL SELECT 'payment',  count(*), md5(string_agg(id||':'||amount||':'||coalesce("chequeStatus"::text,''), ',' ORDER BY id)) FROM "Payment"
UNION ALL SELECT 'dealer',   count(*), md5(string_agg(id||':'||"outstandingBalance", ',' ORDER BY id)) FROM "Dealer"
UNION ALL SELECT 'purchase', count(*), md5(string_agg(id||':'||"totalValue"||':'||coalesce("cancelledAt"::text,''), ',' ORDER BY id)) FROM "Purchase"
UNION ALL SELECT 'supppay',  count(*), md5(string_agg(id||':'||amount, ',' ORDER BY id)) FROM "SupplierPayment"
UNION ALL SELECT 'salesret', count(*), md5(string_agg(id||':'||"totalAmount", ',' ORDER BY id)) FROM "SalesReturn"
UNION ALL SELECT 'purchret', count(*), md5(string_agg(id||':'||"totalAmount", ',' ORDER BY id)) FROM "PurchaseReturn"
UNION ALL SELECT 'refund',   count(*), md5(string_agg(id||':'||amount, ',' ORDER BY id)) FROM "Refund"
UNION ALL SELECT 'cashadj',  count(*), md5(string_agg(id||':'||amount, ',' ORDER BY id)) FROM "CashAdjustment";
```
  Also save the Liquid Cash and Balance Sheet totals from their existing screens/endpoints.

**Test database (decided 2026-10-22).** All development, migration rehearsal and testing use the owner-provided
**Neon test copy**: endpoint `ep-bold-voice-at6xjudh` (production is `ep-icy-boat-atnomn52`, from the backend `.env`).
No local Postgres is used.
- The connection string lives **only** in the shell environment / an untracked `.env.serials-test`, as
  `SERIALS_TEST_DATABASE_URL`. **Never in this file, in git, or in `.env`.**
- Prisma migrate commands use the **direct** host (the same URL without `-pooler`). The pooled URL is for the app and tests.
- Guard before every write command: the command's target host must contain `ep-bold-voice` and must **not** contain `ep-icy-boat`.
  Abort otherwise. A tiny `scripts/assert-test-db.sh` does this check, and every serial-related npm script runs it first.

Baseline of the test copy, taken read-only on 2026-10-22: 27 migrations applied (latest
`20261020120000_purchase_cancellation_refunds`), 0 unfinished or rolled back, `ProductUnit` absent; 7 products (none with
a model barcode), 80 orders (all `COMPLETED`), 80 invoices, 80 payments, 18 purchases, 6 sales returns, 7 purchase returns,
33 dealers, 344 inventory-log rows. Fingerprint hashes:

| key | count | md5 |
|---|---|---|
| product | 7 | 10ca72375ffdeb178f1424a7e6bbd637 |
| invlog | 344 | 85e33021b4e07cbf7d4d59aa932de178 |
| invoice | 80 | 8f785a7f158def71768f5afc72bed2bf |
| orderitem | 87 | 47608acf1c4c1667f6863a421552d583 |
| payment | 80 | 114f88b59e47522000d0914f2fa83872 |
| dealer | 33 | 2c788d622fb3bd3117fbf1e7c619653e |
| purchase | 18 | ba04ee6fdb8cb649bc20b0b471e1e6fb |
| supppay | 54 | d9465119e5b0e4597ddcd298f97e6fc6 |
| salesret | 6 | 0c1b3d1e566ed799847d457349e6c38b |
| purchret | 7 | c57d213efa1c0b1a516324ae16d78a1f |
| refund / cashadj | 0 / 0 | — |

**Step 2 — Protect.** Production keeps its own verified `pg_dump` before the eventual production deploy (Step 7).
For the test copy, create a Neon **snapshot/branch of it** before the first migration, so it can be reset to this exact
baseline at any time. **Forbidden at every step:** `prisma migrate reset`, `prisma db push`, hand-written SQL
against production, running `migrate dev` with a `DATABASE_URL` that points to production (`migrate dev` uses a shadow
database and may offer to reset). Before every Prisma command, `echo $DATABASE_URL | sed 's/:.*@/:***@/'` and confirm the host.

**Step 3 — Additive migration.** Edit `schema.prisma`, then `npx prisma migrate dev --create-only --name product_unit_serials`
with `DATABASE_URL`/`DIRECT_URL` set to the **test copy** for that one command. `--create-only` only writes the SQL file;
it doesn't apply it. If Prisma reports drift or offers to **reset**, answer **no** and stop: a reset would wipe the test copy's data. Append the §3 "Extra SQL". Review the whole file line by line against §3's allow-list.
Commit the migration on its own commit so it can be reviewed in isolation.

**Step 4 — Backend.** `product-units` module, then the §6 guards in existing services. Each guard is added next to the
existing code without reordering or changing the existing `recordMovement` / balance / invoice statements. The diff of
each existing service should be **additions only** (plus the new DTO fields). Any changed or removed existing line needs
a written reason in the PR.

**Step 5 — Test in isolation.**
Order matters here, because the integration suite **truncates every table**:
- **5a — Rehearsal on the test copy (non-destructive, first).** `prisma migrate deploy` → re-run the fingerprint → it
  must equal the baseline table above **exactly**. Then run the scripted smoke pass with the real backend pointed at the
  test copy (register → allocate on a new order → deliver → customer return (defective) → supplier return → replacement
  → warranty swap → reversals) on 1–2 products, and confirm the fingerprint changed **only** where those new test
  documents were added. Then rehearse the rollback (§10.3) and the re-apply.
- **5b — Integration suite.** Run it on a **Neon child branch** of the test copy (one click, so the copy itself keeps
  its realistic data for UI testing). Alternatively, run it on the copy itself after 5a, accepting that its data is wiped.
  The harness (`test/support/isolated-db.ts`) currently accepts only `localhost`, which is a deliberate safety check. It
  gets a small additive change: also accept a host listed in `TEST_DB_ALLOWED_HOSTS` (set to the test branch's endpoint).
  **All** its other checks stay: the URL must differ from `DATABASE_URL`/`DIRECT_URL` (production), and the
  `test_isolation.marker` token must match. The marker table is created once, by hand, on the test branch only.

**Step 6 — Regression.** `npm test`, `npm run test:integration` (all existing suites green and unchanged), `npm run lint`
and `npm run build` in both repos. Run the full suite twice: with **no** product tracked (must match today's behaviour
exactly), and with all test products tracked.

**Step 7 — Deploy, only after sign-off.** New `pg_dump` → `prisma migrate deploy` on production → Step 1 fingerprint
again (must be identical) → deploy backend → deploy frontend → run the §10.4 reconciliation queries → watch error logs
for 48 h. Production starts with `SERIAL_TRACKING_ENABLED=false`. Turn it on after a day without incidents, then
enable `trackSerials` on **one** product first.

### 10.2 Feature phases (each goes through steps 3–7)

- **Phase 1 — Schema + backend core:** models, migration, `product-units` module, idempotency, **all §6 guards**, tests. No UI.
- **Phase 2 — Receiving:** product flag and warranty months, `SerialScanDialog`, purchase scanning, register existing stock.
- **Phase 3 — Selling, invoice and scan:** order serial card, admin create-order scanning, invoice page 2, Scan screen, unit page.
- **Phase 4 — Returns and adjustments screens:** customer return (condition, fault note), supplier return, link/unlink,
  cancel/reinstate, defective/good, warranty swap, supplier replacement, write-off, coverage report.
- **Phase 5 — Extras (optional):** labels, camera scanning, warranty-expiry report, dealer "My serials", claims.

### 10.3 Rollback

- Frontend: revert freely.
- Backend: revert to the previous build. The new tables stay and are ignored by old code. One caveat: old code's order
  delete would now hit the `RESTRICT` FK for orders with units, and fail safely with its existing "has related records"
  message. That is a refusal, never corruption.
- Schema (only if the feature is abandoned): a reviewed down-migration that drops `SerialRequest`, `ProductUnitEvent`,
  `ProductUnit`, the trigger and function, the 4 enums and the two `Product` columns. Rehearsed on the test copy with a
  fingerprint before and after (identical).

### Tests that must pass before production

Unit:
- Normalization (whitespace, case, control characters, length, charset).
- Model-barcode detection.
- Diffing in `PUT /orders/:id/units`.

Integration (real Postgres):
1. Two concurrent assignments of the same serial to two orders → exactly one succeeds, the other gets `409`.
2. Same serial registered twice concurrently → one `409`, no duplicate row.
3. Order delete with assigned units → units back to `IN_STOCK`, events written, stock identical to today's behaviour.
4. `updateAdminOrder` that drops a line with serials → refused, nothing changed (transaction rolled back).
5. Purchase edit/delete after one of its units is sold → refused.
6. Purchase cancel → in-stock units become `RETURNED_TO_SUPPLIER`; reinstate → back.
7. Sales return with serials, then delete the return after one unit was resold → refused.
8. Dealer clear-data with serial-assigned orders → completes, units released, even when a returned unit was resold.
9. Dealer A cannot read dealer B's invoice serials; no dealer response contains `costPrice` / supplier.
10. Existing suites unchanged and green; `currentStock` and `InventoryLog` for every scenario identical with the feature on and off.
11. Customer return marked defective → the unit can't be assigned to a new order; purchase return of it → `RETURNED_TO_SUPPLIER`; supplier replacement links old to new.
12. Warranty swap → `currentStock`, invoice totals and dealer balance unchanged; the new unit is on the same order with the old warranty date.
13. Deleting a purchase return whose unit already has a supplier replacement → refused.
14. Linking a standalone purchase return to a purchase its serials didn't come from → refused.
15. A sales return picking fewer serials than required (all units serialized) → refused.
16. Same `idempotencyKey` sent twice in parallel → one unit set created; both responses identical. Same key with a different body → `409`.
17. Process killed mid-request (test hook throws after unit insert) → nothing persisted, including the key; the retry succeeds.
18. Two concurrent "unknown serial" assigns when gap = 1 → exactly one succeeds.
19. Negative stock adjustment on a tracked product with gap = 0 and no serials picked → refused; with serials picked → `WRITTEN_OFF`.
20. Order `APPROVED` → allocate 2 → `DELIVERED` → units `SOLD`, warranty stamped from `deliveredAt`; a manually edited warranty survives a `saleDate` edit.
21. Bypass test: a raw insert of a `SOLD` unit with `orderId = NULL` → rejected by the CHECK constraint; `UPDATE` on an event → rejected by the trigger.
22. `ProductUnitsService` has no `InventoryService` provider (unit test), and no serial-only endpoint changes `InventoryLog` (integration: row count unchanged).
23. Fingerprint test: run every existing integration suite with the migration applied and **no** tracked products; the Step 1 fingerprint of the resulting data is identical to the same run without the migration.

### 10.4 Reconciliation SQL (read-only; run after deploy, and weekly via the coverage report)

```sql
-- ALLOCATED/SOLD units must point at an order, others must not (also enforced by CHECK)
SELECT id FROM "ProductUnit" WHERE (status IN ('ALLOCATED','SOLD')) <> ("orderId" IS NOT NULL);
-- ALLOCATED only on undelivered orders, SOLD only on delivered/completed ones
SELECT u.id FROM "ProductUnit" u JOIN "Order" o ON o.id = u."orderId"
WHERE (u.status = 'ALLOCATED' AND o.status NOT IN ('APPROVED','PACKED'))
   OR (u.status = 'SOLD' AND o.status NOT IN ('DELIVERED','COMPLETED'));
-- shelf invariant: serial units physically here must not exceed physical stock (gap < 0)
SELECT p.id, p.name, p."currentStock" + coalesce(r.q,0) AS h, coalesce(t.c,0) AS t
FROM "Product" p
LEFT JOIN (SELECT oi."productId", sum(oi.quantity) q FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
           WHERE o.status IN ('APPROVED','PACKED') GROUP BY 1) r ON r."productId" = p.id
LEFT JOIN (SELECT "productId", count(*) c FROM "ProductUnit" WHERE status IN ('IN_STOCK','ALLOCATED') GROUP BY 1) t
       ON t."productId" = p.id
WHERE coalesce(t.c,0) > p."currentStock" + coalesce(r.q,0);
-- never more serial units on an order line than its quantity
SELECT u."orderId", u."productId", count(*) c, max(oi.quantity) q
FROM "ProductUnit" u JOIN "OrderItem" oi ON oi."orderId" = u."orderId" AND oi."productId" = u."productId"
GROUP BY 1,2 HAVING count(*) > max(oi.quantity);
```

---

## 11. Decisions (D1–D6 defaults, D7–D8 settled by the safety audit; change any before Phase 1)

| # | Question | Default in this plan |
|---|---|---|
| D1 | Unique scope of a serial | Per product (`productId + serialKey`), globally indexed for scanning. |
| D2 | Must every tracked unit be scanned before Delivered/Completed? | **Soft**: a warning with "continue anyway", logged. It can become a hard block per product later (`requireSerialsOnDelivery`). |
| D3 | When does warranty start? | At `ALLOCATED → SOLD` (= `deliveredAt`, else `completedAt`); never restamped once `warrantyManual = true` (§5.2). |
| D4 | Can dealers see serials? | Yes, read-only, their own invoices/orders only. |
| D5 | Unknown serial scanned on an order of a tracked product | Auto-register as `OPENING_STOCK` if within the untracked gap, checked under the product row lock (§6.2); otherwise refuse. |
| D6 | Who can scan/assign | Admin only (reps later if wanted). |
| D7 | What does "assigned to an order" mean? | `ALLOCATED` (in our building, reserved for that buyer) until the order is `DELIVERED`/`COMPLETED`, then `SOLD`. The invoice serial page lists both, and dispatch notes can be printed from `ALLOCATED`. Settled before coding because it drives warranty, returns and CHECK constraints. |
| D8 | Idempotency storage | Dedicated `SerialRequest` table, written in the same transaction (§9). |

---

## 12. Safety audit — resolution of each finding

| Audit finding | Severity | Resolution in this plan |
|---|---|---|
| R1 — stock calculations could be affected | Critical | Rule 9: the units module has no `InventoryService`, so serial-only operations cannot move stock. Existing `recordMovement` calls are unchanged; serial handling sits beside them in the same transaction (§6). §6.2 gap invariant. Tests 10, 22, 23. |
| R2 — migration SQL must be reviewed | Critical | §3 allow-list + extra SQL; §10.1 steps 1, 3, 5, 7 (`migrate status` first, `--create-only` against the test copy, review, test-copy rehearsal with an identical fingerprint, forbidden commands listed). |
| R3 — edit/delete flows vs serial history | Critical | §6 table covers every flow that touches stock or orders. Guards throw **before** writes, so the whole transaction (document included) rolls back. `RESTRICT` FKs + CHECK constraints as backstop. Tests 3–8, 13–15, 21. |
| R4 — retries and concurrency | High | D8 `SerialRequest` written inside the transaction (§9); conditional updates + row locks (rules 4, 10); tests 1, 2, 16–18. |
| R5 — return history and swaps | High | §6.4 reversal rule: lock, require that the latest event is the one being reversed, else refuse with no writes; history insert-only (trigger). Tests 7, 13. |
| SOLD during approval | Issue | D7: new `ALLOCATED` status; `SOLD` only after delivery. |
| Warranty date preservation | Issue | `warrantyManual` flag; single stamping point (§5.2); test 20. |
| Deleting units and history | Issue | §6.3: strict conditions, snapshot to ActivityLog, events deleted before the unit (FK order enforced). |
| Coverage formula | Issue | §6.2: defined `S, R, H, T, gap`; reports, never corrects; reconciliation SQL in §10.4. |
| Unknown serial over-registration | Issue | Product row lock + gap recheck inside the transaction (§4.3, D5); test 18. |
| Idempotency schema | Issue | D8 / §9, including crash behaviour. |

### 12.1 Final verification checklist (sign off every line before Step 7)

**Database**
- [ ] `prisma migrate status` on production clean before starting; same after deploy.
- [ ] Migration SQL contains only allow-listed statements (§3) + the extra SQL; reviewed by a second person.
- [ ] `pg_dump` taken **and** test-restored; a second dump taken right before deploy.
- [ ] Test-copy rehearsal (`ep-bold-voice`): fingerprint identical to the 2026-10-22 baseline after the migration.
- [ ] Every write command during development was confirmed to target `ep-bold-voice`, never `ep-icy-boat`.
- [ ] Production: fingerprint identical before and after the migration.
- [ ] Down-migration rehearsed on the test copy; fingerprint identical.
- [ ] No `migrate reset` / `db push` / manual production SQL used at any point.

**Code**
- [ ] `ProductUnitsService` has no `InventoryService` dependency (test 22).
- [ ] Diff of every existing service is additions only (or each changed line is justified in the PR).
- [ ] Every serial write is in the same `$transaction` as its document; every guard throws before the first write.
- [ ] All serial endpoints admin-only; dealer responses contain no cost/supplier fields (test 9).
- [ ] `SERIAL_TRACKING_ENABLED` hides UI/endpoints but not the §6 guards.

**Tests**
- [ ] All 23 integration tests + unit tests pass on the Neon test branch (isolation marker present).
- [ ] All pre-existing suites pass unchanged, with and without tracked products.
- [ ] Lint + build green in backend and frontend.

**After deploy**
- [ ] §10.4 reconciliation queries return zero rows.
- [ ] Liquid Cash, Balance Sheet, dealer balances and supplier payables identical to the Step 1 snapshot.
- [ ] 48 h of error logs reviewed, then `SERIAL_TRACKING_ENABLED=true`, then one product with `trackSerials` first.

---

## 13. File checklist

Backend (`electro_mart_backend`)
- `prisma/schema.prisma` (+ new migration folder)
- `src/common/utils/serial.ts`, `src/product-units/serial-invariant.ts` (§6.2 gap check), `src/product-units/idempotency.ts` (§9)
- `src/product-units/{product-units.module,controller,service}.ts`, `dto/{validate-serials,register-units,query-units,update-unit,assign-order-units}.dto.ts`
- `src/app.module.ts` (register module)
- Edits: `orders/orders.service.ts` (+ create/assign DTO), `orders/orders.controller.ts`, `purchases/purchases.service.ts` (+ DTOs),
  `sales-returns/sales-returns.service.ts` (+ DTO), `purchase-returns/purchase-returns.service.ts` (create/update/delete/link/unlink + DTO),
  `inventory/inventory.service.ts` (adjustment DTO), `dealers/dealers.service.ts` (clearData),
  `invoices/invoices.service.ts` (serialAnnex), `products/*` (two new fields)
- Tests under `test/` (integration) and `*.spec.ts`

Frontend (`electro_mart_frontend/src`)
- `lib/serial.ts`, `lib/api/{endpoints,types}.ts`, `hooks/use-product-units.ts`, `hooks/use-barcode-scanner.ts`
- `components/scan/{serial-scan-input,serial-scan-dialog,serial-list,unit-status-badge}.tsx`
- `app/admin/scan/page.tsx`, `app/admin/units/[id]/page.tsx`, `components/admin/admin-nav-items.ts`
- Edits: `product-form-dialog.tsx`, `purchase-form.tsx`, `admin/purchases/[id]`, `admin/orders/[id]`, `order-form.tsx`,
  `sales-return-form-dialog.tsx`, `purchase-return-form-dialog.tsx`, `standalone-purchase-return-form-dialog.tsx`,
  `stock-adjustment-dialog.tsx`, `inventory-ledger-sheet.tsx` / products page (Units tab),
  `invoice-print-layout.tsx`, `dealer/invoices/[id]`, `dealer/orders/[id]`
