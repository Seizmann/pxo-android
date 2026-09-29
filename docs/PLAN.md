# PXO Implementation Plan — Phases 0 → 3

> This file is the working plan for the coding agent.
> Updated only when the owner approves a revision.
> Source of truth for business rules remains `REQUIREMENT.md`.

---

## Confirmed answers (owner-approved overrides and decisions)

These supplement and, where noted, override `REQUIREMENT.md`.

| # | Topic | Decision |
|---|---|---|
| Q1 | MFS→Cash wallet effect | MFS −= amount+charge; Cash += amount; charge → Cash-out expense via `expense_wallet_lines` |
| Q2 | Expense wallets | **Multi-wallet.** `expense_wallet_lines` table; no `wallet_id` column on `expenses`. |
| Q3 | Per-packet rate override UI | **Hidden behind a "Custom rate" toggle** per packet row in Give Cards. |
| Q4 | Merge conflict rule | **Newer `updated_at` wins** when same `id` exists on both sides. |
| Q5 | Lockout ladder | **×3 escalating:** 5 wrong attempts → first lock at 30 s; each subsequent lock × 3 (30 → 90 → 270 → 810 → …). Correct PIN resets both counters. |
| Q6 | Recovery PIN storage | **Build-time GitHub secret** (`RECOVERY_PIN_HASH`) baked into the app via `expo-constants`. |
| Q7 | Figma | **Skipped (owner override).** UI previewed in Expo Go. Overrides REQUIREMENT.md §5 Phase 1 and §13 (Figma parts only). Icon and animated splash remain in scope. No Figma MCP calls. |
| Q8 | Git policy | **Conventional Commits + push to `origin` after each phase commit.** |
| Q9a | Core test runner | **Vitest** (pure TS; `@vitejs/plugin-react` excluded from core). |
| Q9b | Bonus cards scope | **Single `bonus_cards` field on `dispatches`** — not per-packet. |
| Q9c | Allocation mode column | **Single `allocation_mode` TEXT column** with values `auto` / `manual` / `hybrid`. |
| Q9d | Transfers soft-delete | **Transfers have `archived_at`** — soft-deletable, same as all other tables. |
| Q9e | Opening balance | **Editable from Settings; retroactive balance effect is intentional.** |
| Q9f | `KEY_ALIAS` in workflow | **Keep as GitHub secret** (value is always `pxo`, kept as secret per `docs/RELEASE.md`). |
| Q10 | Recovery PIN in Expo Go | **`.env.local` (git-ignored).** Owner places dev hash there; `expo-constants` reads it in development. |

---

## Phase 0 — Verify only ✅ (committed `4f2b34e`, unpushed)

All Phase 0 files verified against `REQUIREMENT.md` §15. No re-creation needed.

| File | Status |
|---|---|
| `AGENT.md`, `CLAUDE.md`, `README.md` | ✅ matches draft |
| `docs/DATA_MODEL.md`, `docs/SCREENS.md`, `docs/RELEASE.md` | ✅ matches draft |
| `pnpm-workspace.yaml`, `.npmrc` (`node-linker=hoisted`), `package.json`, `.gitignore` | ✅ |
| Full folder skeleton (`.gitkeep` placeholders) | ✅ |
| `.github/workflows/release.yml` placeholder | ✅ |

**No commit for Phase 0** — already done.

---

## Phase 1 — Design (skipped per Q7)

Figma MCP is not used. UI decisions are made inline while writing Phase 2 code, guided
by `docs/SCREENS.md` design principles (≥ 48 dp tap targets, money-app feel, large clear
numbers, status colour language). Icon and animated splash are delivered in Steps 2-B
and 2-C-5 respectively.

**No commit for Phase 1.**

---

## Phase 2 — Workspace, `packages/core`, `apps/mobile`

**First action before any code:** append the "Confirmed answers" table to `REQUIREMENT.md`
as a `## § Confirmed answers` section. This is the only edit to `REQUIREMENT.md`.

---

### Step 2-A — `packages/core`: pure TypeScript logic + Vitest tests

**New files:**

```
packages/core/package.json
packages/core/tsconfig.json
packages/core/vitest.config.ts          no @vitejs/plugin-react (pure TS core)
packages/core/src/index.ts              re-exports everything
packages/core/src/money.ts              takaToPaisa, paisaToTaka, formatTaka
packages/core/src/stock.ts              computeStock(purchases, dispatches, managerBonus)
packages/core/src/allocation.ts         autoAllocate, manualAllocate → PaymentAllocation[]
packages/core/src/discount.ts           discount application helpers
packages/core/src/due.ts               packetDue, sellerDue
packages/core/src/balance.ts           walletBalance (see formula below)
packages/core/src/bonus.ts             bonusValue(cards, rateAtEntry)
packages/core/src/pin-lockout.ts       PinLockout class (see lockout spec below)
packages/core/src/backup-format.ts     BackupDoc type, serialize, validate, merge
packages/core/tests/money.test.ts
packages/core/tests/stock.test.ts
packages/core/tests/allocation.test.ts
packages/core/tests/due.test.ts
packages/core/tests/balance.test.ts    includes MFS→Cash double-count guard test
packages/core/tests/pin-lockout.test.ts
packages/core/tests/backup-format.test.ts
```

#### Wallet balance formula (`balance.ts`)

```
walletBalance(wallet) =
  wallet.opening_balance
  + Σ stock_purchase_payments.amount    where wallet_id = wallet.id  (active)
  + Σ payment_wallet_lines.amount       where wallet_id = wallet.id  (active payment)
  - Σ expense_wallet_lines.amount       where wallet_id = wallet.id  (active expense)
  + Σ transfers.amount                  where to_wallet_id   = wallet.id  (active)
  - Σ transfers.amount                  where from_wallet_id = wallet.id  (active)
```

**`transfers.charge` is NOT in this formula.** The charge is captured exactly once
via its linked Cash-out expense's `expense_wallet_lines` row
(wallet_id = source MFS wallet, amount = charge).

Rules:
- A transfer moves only `amount` between the two wallets.
- The MFS→Cash `charge` affects balances **only** through its linked Cash-out expense's
  `expense_wallet_lines` row.
- `transfers.charge` is audit data only; the balance formula ignores it.
- Charge must never be counted twice.

**MFS→Cash walkthrough** (amount = 5 000 poisha, charge = 100 poisha):
- MFS wallet: −5 000 (transfer out) −100 (Cash-out expense_wallet_line) = **−5 100**
- Cash wallet: +5 000 (transfer in)
- `balance.test.ts` must contain a test asserting these exact values.

#### PIN lockout spec (`pin-lockout.ts`)

- Track: `wrongAttempts` (resets to 0 on correct PIN), `lockLevel` (resets to 0 on correct PIN).
- `attempt(pin)`: correct → reset both, return `{ success: true }`.
  5 wrong → lock, return `{ locked: true, durationSeconds: 30 * 3**lockLevel }`, increment `lockLevel`.
  < 5 wrong → return `{ success: false, attemptsLeft }`.
- `lockDuration(level)` = `30 * 3**level` seconds.
- `packages/core` exposes pure arithmetic and state machine only.
  State is persisted by the mobile app via `expo-secure-store`.

#### Validation

```sh
pnpm --filter core test        # all tests green
pnpm --filter core typecheck   # zero errors
```

**Commit:** `feat(core): packages/core logic and Vitest tests`
**Push:** yes

---

### Step 2-B — `apps/mobile` scaffold: project files, theme, DB schema, repos

**New files:**

```
apps/mobile/package.json
apps/mobile/app.json                    name: PXO, android.package: pta.pxo.fp
                                         extra.recoveryPinHash: process.env.RECOVERY_PIN_HASH
apps/mobile/tsconfig.json
apps/mobile/babel.config.js             expo preset + reanimated plugin
apps/mobile/metro.config.js             extend Expo Metro; resolve workspace packages

apps/mobile/src/theme/colours.ts        brand palette (primary, surface, error, status)
apps/mobile/src/theme/typography.ts     font sizes and weights
apps/mobile/src/theme/spacing.ts        4-pt grid constants
apps/mobile/src/theme/index.ts

apps/mobile/src/types/index.ts          TS interfaces for every table row

apps/mobile/src/db/client.ts            openDatabase(), runMigrations()
apps/mobile/src/db/migrations/
  0001_initial_schema.sql               16 tables + seed data

apps/mobile/src/db/repos/wallets.ts
apps/mobile/src/db/repos/sellers.ts
apps/mobile/src/db/repos/stock-purchases.ts
apps/mobile/src/db/repos/dispatches.ts
apps/mobile/src/db/repos/packets.ts
apps/mobile/src/db/repos/payments.ts
apps/mobile/src/db/repos/manager-bonus.ts
apps/mobile/src/db/repos/transfers.ts
apps/mobile/src/db/repos/expense-categories.ts
apps/mobile/src/db/repos/expenses.ts    includes expense_wallet_lines helpers
apps/mobile/src/db/repos/settings.ts

apps/mobile/assets/icon.png             1024×1024 generated geometric icon
apps/mobile/assets/splash.png           static splash matching icon's final frame
apps/mobile/assets/adaptive-icon.png
```

**16 tables in `0001_initial_schema.sql`:**

| Table | Key columns |
|---|---|
| `wallets` | type (cash/mfs), name, opening_balance |
| `sellers` | name, note |
| `stock_purchases` | entry_date, quantity, rate, note |
| `stock_purchase_payments` | purchase_id FK, wallet_id FK, amount |
| `dispatches` | seller_id FK, entry_date, sell_rate, sell_cards, bonus_cards, note |
| `packets` | dispatch_id FK CASCADE, seq, cards, rate_override (nullable) |
| `payments` | seller_id FK, entry_date, discount_total, allocation_mode, note |
| `payment_wallet_lines` | payment_id FK CASCADE, wallet_id FK, amount |
| `payment_allocations` | payment_id FK CASCADE, packet_id FK, amount, discount |
| `manager_bonus` | entry_date, cards, rate_at_entry, note |
| `transfers` | from_wallet_id FK, to_wallet_id FK, amount, charge, expense_id FK nullable, entry_date |
| `expense_categories` | name UNIQUE |
| `expenses` | entry_date, category_id FK, note — **no wallet_id** |
| `expense_wallet_lines` | expense_id FK CASCADE, wallet_id FK, amount |
| `settings` | key PK, value |
| `schema_migrations` | version INTEGER PK |

All tables (except `settings`, `schema_migrations`, `expense_categories`) carry:
`id TEXT PK (UUID v4)`, `entry_date TEXT`, `created_at TEXT`, `updated_at TEXT`,
`archived_at TEXT` nullable. `expense_categories` carries all except `entry_date`.

Seed rows: wallets (Cash/bKash/Nagad, opening_balance=0), expense_categories
(Cash-out/Transport/Packaging/Other), settings (source_rate=19000, sell_rate=30000).

#### Validation

```sh
pnpm --filter mobile typecheck
```

App boots in Expo Go without crash; DB initialises; seed rows present.

**Commit:** `feat(mobile): scaffold, theme, SQLite schema and repos`
**Push:** yes

---

### Step 2-C-1 — Lock screen + Home screen

**Shared items added here (first use):**

```
apps/mobile/src/utils/uuid.ts
apps/mobile/src/utils/dateFormat.ts
apps/mobile/src/hooks/useDb.ts
apps/mobile/src/hooks/usePinLock.ts        drives PinLockout from @pxo/core;
                                              persists state in expo-secure-store;
                                              reads recoveryPinHash from expo-constants
apps/mobile/src/hooks/useStock.ts
apps/mobile/src/hooks/useWalletBalances.ts
apps/mobile/src/hooks/useSellerDue.ts
apps/mobile/src/components/PinKeypad.tsx   4-digit PIN pad, bKash/Nagad style grid
apps/mobile/src/components/CountdownTimer.tsx
apps/mobile/src/components/SummaryCard.tsx
apps/mobile/src/components/AmountDisplay.tsx
```

**Screens:**

```
apps/mobile/app/_layout.tsx    root Stack layout; DB init on mount; PIN gate
apps/mobile/app/lock.tsx       PIN entry, lockout countdown, "Forgot PIN?" → recovery flow
apps/mobile/app/index.tsx      Home: stock card, three wallet balance cards + total,
                                 total seller due, today's activity row
```

#### Validation

```sh
pnpm --filter mobile typecheck
```

5 wrong PINs → countdown; correct PIN → Home; recovery flow → PIN reset;
Home shows correct computed values.

**Commit:** `feat(mobile): Lock screen and Home screen`
**Push:** yes

---

### Step 2-C-2 — Buy Stock + Give Cards screens

**Shared items added here (first use):**

```
apps/mobile/src/components/DatePicker.tsx          wraps @react-native-community/datetimepicker
apps/mobile/src/components/AmountInput.tsx
apps/mobile/src/components/EntryList.tsx           edit tap; swipe-to-delete (gesture-handler)
apps/mobile/src/components/PacketBuilder.tsx       per-packet rows: cards + "Custom rate"
                                                     toggle → rate field (hidden until toggled)
apps/mobile/src/components/SellerPicker.tsx
apps/mobile/src/sheets/DeleteConfirmSheet.tsx      Permanent delete / Archive
apps/mobile/src/sheets/WalletSplitSheet.tsx        distribute amount across Cash/bKash/Nagad
```

**Screens:**

```
apps/mobile/app/stock/index.tsx    Buy Stock: form (date, qty, rate, note,
                                    WalletSplitSheet) + EntryList
apps/mobile/app/give/index.tsx     Give Cards: form (seller picker, date, sell_rate,
                                    PacketBuilder, bonus_cards field, note) + EntryList
```

#### Validation

```sh
pnpm --filter mobile typecheck
```

Buy Stock submits; stock on Home updates. Give Cards submits; sell_cards = sum of packet cards;
stock drops by sell_cards + bonus_cards. Delete sheet works (permanent + archive).

**Commit:** `feat(mobile): Buy Stock and Give Cards screens`
**Push:** yes

---

### Step 2-C-3 — Receive Payment + Sellers screens

**Shared items added here (first use):**

```
apps/mobile/src/sheets/AllocationSheet.tsx   Auto / Manual / Hybrid selector;
                                              Manual shows amount + discount per packet
apps/mobile/src/components/StatusBadge.tsx   paid / partial / due / archived badges
```

**Screens:**

```
apps/mobile/app/payment/index.tsx     Receive Payment: seller picker, date,
                                       WalletSplitSheet, discount, packet selector,
                                       AllocationSheet + EntryList
apps/mobile/app/sellers/index.tsx     Seller list with per-seller total due
apps/mobile/app/sellers/[id].tsx      Seller Detail: packets with per-packet due + status;
                                       payment history; totals (cards, charged, paid,
                                       discount, due); bonus info (separate from due)
```

#### Validation

```sh
pnpm --filter mobile typecheck
```

Auto allocation applies oldest packet first. Manual uses entered amounts.
Packet due = packet amount − paid − discount. Seller Detail totals consistent.

**Commit:** `feat(mobile): Receive Payment and Sellers screens`
**Push:** yes

---

### Step 2-C-4 — Wallets + Expenses + Bonus screens

**Shared items added here (first use):**

```
apps/mobile/src/sheets/CategoryEditorSheet.tsx   add / edit / delete expense categories
```

**Screens:**

```
apps/mobile/app/wallets/index.tsx     three computed balance cards; transfer form
                                       (from/to wallet, amount);
                                       MFS→Cash: extra charge field → auto-creates
                                       Cash-out expense linked via transfers.expense_id;
                                       transfer history list
apps/mobile/app/expenses/index.tsx    list (newest first, filter by category);
                                       form (date, category + CategoryEditorSheet,
                                       WalletSplitSheet, note); edit / delete
apps/mobile/app/bonus/index.tsx       Seller Bonus | Manager Bonus sections;
                                       bonus value = cards × rate_at_entry (info only,
                                       never in due); Add Manager Bonus form (date, cards,
                                       note); filters by seller/manager and date range
```

#### Validation

```sh
pnpm --filter mobile typecheck
```

MFS→Cash creates linked Cash-out expense; MFS balance = −amount −charge (once, via
expense line only — charge not re-subtracted from transfers.charge); Cash = +amount.
Expense multi-wallet split correct. Bonus correct; bonus never affects due.

**Commit:** `feat(mobile): Wallets, Expenses, and Bonus screens`
**Push:** yes

---

### Step 2-C-5 — History + Settings (+ Backup/Restore) + Animated Splash

**Shared items added here (first use):**

```
apps/mobile/src/sheets/RestoreModeSheet.tsx      Replace all / Merge
apps/mobile/src/hooks/useBackup.ts               exportBackup(), importBackup(uri)
apps/mobile/src/utils/backup.ts                  serialize / validate / merge;
                                                   calls @pxo/core backup-format
apps/mobile/src/components/AnimatedSplash.tsx    Reanimated 3: icon fade + scale ≥ 500 ms,
                                                   then navigate to /lock
```

**Screens:**

```
apps/mobile/app/history/index.tsx     all entry types interleaved, newest first;
                                       date AND timestamp on every row;
                                       filter: All / Active / Archived;
                                       tap → edit; swipe/long-press → DeleteConfirmSheet;
                                       Archived rows show Restore button
apps/mobile/app/settings/index.tsx    source rate, sell rate, opening balances;
                                       expense categories (CategoryEditorSheet);
                                       Change PIN;
                                       Backup → temp file → expo-sharing share sheet
                                         (filename: pta_backup_YYYY-MM-DD_HHMM.json);
                                       Restore → expo-document-picker → validate
                                         schemaVersion → RestoreModeSheet →
                                         transaction → rollback on error
```

`app/_layout.tsx` updated: show `AnimatedSplash` on cold start before the Navigator.
Static `splash.png` in `app.json` matches the animated icon's final frame.

#### Validation

```sh
pnpm --filter mobile typecheck
```

History filter works. Backup exports valid JSON — PIN and recovery hash absent.
Restore Replace wipes + loads. Restore Merge: newer `updated_at` wins; no duplicate ids.
PIN change works. Animated splash plays in Expo Go.

**Commit:** `feat(mobile): History, Settings, Backup/Restore, and animated splash`
**Push:** yes

---

## Phase 3 — GitHub Actions release pipeline

**Secrets requested from the owner at this point (not before; never invented):**

| Secret | Purpose |
|---|---|
| `KEYSTORE_BASE64` | base64-encoded `pxo-release.jks` |
| `KEYSTORE_PASSWORD` | keystore store password |
| `KEY_ALIAS` | always `pxo`; kept as a secret per `docs/RELEASE.md` |
| `KEY_PASSWORD` | key password |
| `TELEGRAM_BOT_TOKEN` | bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | chat/channel to receive the APK |
| `RECOVERY_PIN_HASH` | bcrypt hash of recovery PIN (owner pre-computes) |

**Files changed:**

```
.github/workflows/release.yml    replace placeholder with full pipeline
apps/mobile/app.json             verify extra.recoveryPinHash present (set in Step 2-B)
```

**Pipeline steps:**

1. Checkout repo
2. Node 20 + pnpm cache
3. `pnpm install --frozen-lockfile`
4. `pnpm --filter core test` — must pass before building
5. Decode `KEYSTORE_BASE64` → `pxo-release.jks` on runner
6. `expo prebuild --platform android` in `apps/mobile` (env `RECOVERY_PIN_HASH` set from secret)
7. `./gradlew assembleRelease` (signing env vars: `KEYSTORE_PATH`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`)
8. Upload APK as GitHub Actions artifact
9. `curl` POST to `https://api.telegram.org/bot$TOKEN/sendDocument`
10. Delete `pxo-release.jks` from runner

Trigger: push of `v*` tags **and** `workflow_dispatch`.

#### Validation

Workflow runs via `workflow_dispatch`; tests and prebuild succeed.
Full signed APK release requires owner to add secrets and push a `v*` tag.

**Commit:** `feat(ci): GitHub Actions release pipeline and Telegram delivery`
**Push:** yes

---

## Recovery PIN — exact specification

| Item | Detail |
|---|---|
| Algorithm | bcrypt, cost factor 10 |
| Salt | Fixed constant in `packages/core/src/pin-lockout.ts`: `$2a$10$pxo_recovery_salt_____` (22-char bcrypt salt format). Not secret; 4-digit PIN space is the security boundary (noted in `docs/RELEASE.md`). |
| Hash storage | GitHub secret `RECOVERY_PIN_HASH`. Owner pre-computes: `bcryptjs.hashSync(rawPin, SALT)`. |
| CI injection | `app.json extra.recoveryPinHash: process.env.RECOVERY_PIN_HASH`; CI sets env var from secret before `expo prebuild`. |
| Runtime read | `expo-constants` → `Constants.expoConfig.extra.recoveryPinHash` in `usePinLock.ts`. |
| Compare | `bcryptjs.compareSync(enteredPin, storedHash)` |
| Expo Go / dev | `.env.local` (git-ignored via existing `.env.*` rule). Owner places dev hash there. |
| Never in | source, logs, backup JSON, git history. |

---

## Extra packages (complete list — nothing may be installed later not on this list)

| Package | Purpose |
|---|---|
| `vitest` | Unit test runner for `packages/core` (pure TS, no native) |
| `react-native-reanimated` | Animated splash (Reanimated 3); required peer of `@gorhom/bottom-sheet` |
| `react-native-gesture-handler` | Required peer of `@gorhom/bottom-sheet`; swipe gestures on `EntryList` |
| `@gorhom/bottom-sheet` | All 5 bottom sheets |
| `expo-document-picker` | File picker for backup restore |
| `expo-sharing` | Share sheet for backup export |
| `expo-file-system` | Write backup JSON to temp path before sharing |
| `react-native-uuid` | UUID v4 in mobile app (pure JS, no native module) |
| `date-fns` | ISO date formatting, backup filename, display formatting |
| `@react-native-community/datetimepicker` | Native date/time picker wrapped by `DatePicker.tsx` |
| `expo-constants` | Read `recoveryPinHash` from `app.json` extra at runtime |
| `bcryptjs` | Recovery PIN hash comparison (pure JS, works in React Native) |

---

## End condition

After the Phase 3 commit and push, stop and report:

1. **Expo Go preview command** — exact `pnpm` command.
2. **Section 14 checklist** — each item: done / not done / needs owner action.
3. **Uncommitted changes** — expected: none.
4. **Unpushed commits** — expected: none after final push.

Do not start Phase 4.
