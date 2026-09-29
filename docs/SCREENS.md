# Screens — PXO

All screens are designed in Figma (via Figma MCP) in Phase 1 before any UI code is
written. Add Figma frame links in the table below once they exist.

---

## Screen list

| # | Screen | Route | Figma frame |
|---|--------|-------|-------------|
| 1 | Lock | `/lock` | — |
| 2 | Home | `/` (index) | — |
| 3 | Buy Stock | `/stock` | — |
| 4 | Give Cards | `/give` | — |
| 5 | Receive Payment | `/payment` | — |
| 6 | Sellers | `/sellers` | — |
| 6a | Seller Detail | `/sellers/[id]` | — |
| 7 | Wallets | `/wallets` | — |
| 8 | Expenses | `/expenses` | — |
| 9 | Bonus | `/bonus` | — |
| 10 | History | `/history` | — |
| 11 | Settings | `/settings` | — |

---

## Sheets (bottom sheets / modals)

| Sheet | Trigger | Description |
|-------|---------|-------------|
| delete-confirm | Any delete button | Two choices: **Permanent delete** (removes row, cascades) or **Archive** (sets `archived_at`; restorable). |
| wallet-split | Payment / Buy Stock / Expense entry | Distribute an amount across Cash, bKash, Nagad. |
| allocation | Receive Payment entry | Choose **Auto** (oldest packet first) or **Manual** (amount + discount per packet) or a hybrid per-payment. |
| restore-mode | Settings → Restore | **Replace all** (wipe current data) or **Merge** (add backup rows without duplicates, newer `updated_at` wins). |
| category-editor | Settings → Expense categories | Add / edit / delete custom expense categories. |

---

## Screen details

### 1. Lock
- Custom 4-digit PIN keypad (styled like bKash / Nagad).
- Shows lockout countdown when locked (30s → 90s → 270s → 810s, ×3 per wrong streak).
- "Forgot PIN?" link → recovery PIN entry → if correct, allows setting a new PIN.
- On correct PIN: reset wrong-attempt counter, navigate to Home.

### 2. Home
Prominent summary cards:
- Cards in stock (computed).
- Wallet balances: Cash | bKash | Nagad | Total.
- Total seller due.
- Today's activity: cards given, payments received, expenses.

### 3. Buy Stock
- Form: entry date, quantity, rate (default from Settings), note.
- Multi-wallet payment (wallet-split sheet).
- List below form: all stock purchases, newest first, with edit/delete.

### 4. Give Cards
- Form: seller (picker), entry date, sell rate (default from Settings), note.
- Packet builder: add one or more packets, each with its own card count and optional
  rate override.
- Sell cards (sum of packet cards) and bonus cards (manual entry) shown separately.
- List: all dispatches, newest first, with edit/delete.

### 5. Receive Payment
- Form: seller (picker), entry date, note.
- Multi-wallet split (wallet-split sheet): total amount across wallets.
- Discount: entered in the same form (not a separate entry).
- Packet selector: which packets this payment applies to.
- Allocation mode: Auto / Manual via allocation sheet.
- List: all payments, newest first, with edit/delete.

### 6. Sellers
- List of active sellers with their total due.
- Add / edit seller (name, note).
- Tap a seller → Seller Detail.

**Seller Detail:**
- Packets with status (open / fully paid) and individual dues.
- Payment history (amounts, wallets, discounts).
- Totals: cards received, total charged, total paid, total discount, total due.
- Bonus cards received (for information, separate from due).

### 7. Wallets
- Three balance cards: Cash, bKash, Nagad (computed from opening balance + entries).
- Transfer form: from wallet, to wallet, amount.
  - MFS → Cash: extra field for cash-out charge (auto-creates a Cash-out expense).
- Transfer history list.

### 8. Expenses
- List: all expenses, newest first. Filter by category.
- Add / edit form: date, category (picker + category-editor sheet), amount, wallet,
  optional note.
- Delete: permanent or archive.

### 9. Bonus
- Two sections clearly separated: **Seller Bonus** | **Manager Bonus**.
- Bonus value shown = `cards × sell rate at entry` (for information only; never in due).
- Filters: by seller / manager, by date range.
- Add Manager Bonus form: date, cards count, note.

### 10. History
- All entries (stock purchases, dispatches, payments, expenses, transfers, manager bonus)
  interleaved, newest first, with date **and timestamp**.
- Filter: All / Active / Archived.
- Tap any entry → edit sheet / form.
- Swipe or long-press → delete-confirm sheet.
- Archived entries have a **Restore** button.

### 11. Settings
- Source buying rate (poisha/card, default 19 000 = 190 taka).
- Seller sell rate (poisha/card, default 30 000 = 300 taka).
- Opening balances: Cash, bKash, Nagad.
- Expense categories: list with add / edit / delete via category-editor sheet.
- Change PIN.
- Backup button → generates `pta_backup_YYYY-MM-DD_HHMM.json` → Android share sheet.
- Restore button → Android file picker → restore-mode sheet.

---

## Design principles (Phase 1 Figma brief)

- Money-app feel: large, clear numbers; generous tap targets (≥ 48 dp).
- Fast entry forms — this app is used daily on the phone.
- Consistent colour language for status: paid, partial, fully due, archived.
- Date and timestamp visible on every record in History.
- Bottom sheets for confirmations and sub-forms to keep the main screen uncluttered.
