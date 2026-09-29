# PXO — Requirements

> Single source of truth for the coding agent. Read this file fully before doing anything.
> Section 15 contains **draft contents** of the other project docs. Your first task is to create those files from the drafts (Phase 0).

---

## 1. What we are building

**PXO** is a fully local, offline Android app that the owner (the "manager") uses to run a small hobby business trading cards named **"PTA"**. It tracks stock, cards handed to sellers, payments received (with discounts), bonuses, wallets (Cash / bKash / Nagad), expenses, and backup/restore.

- App name: **PXO**
- Android package name: **`pta.pxo.fp`**
- GitHub remote (polyrepo, one repo for this app): `https://github.com/Seizmann/pxo-android.git`
- UI language: **English only**
- No server, no cloud, no login, no network needed for any feature.
- **v1 / MVP ships Manager mode only.**

### Business context (plain words)

- The manager buys PTA cards from a source at about **190 taka/card**, and sells them through **sellers** at about **300 taka/card** (sometimes 280 or 270).
- An investor (the manager's friend) funds the business. The investor is **not** a user of v1.
- Cards are handed to a seller in **packets**. A packet usually has 25 cards but can be 20, 30 or anything. **Nothing is fixed; everything must be editable.**
- The seller is supposed to pay `cards × rate` (e.g. 25 × 300 = 7500) but often pays less, sometimes 200/300, sometimes 500/700 less. The shortfall is a **discount** (think of it as the seller's wage). It is **not** a due and is never collected later.
- Sellers also get **bonus cards** (roughly 4–5 per 100 cards, but the count is always decided manually per entry). The seller pays nothing for bonus cards. The manager may also keep bonus cards for himself (**manager bonus**).
- Sellers pay in instalments and in different wallets; money is not always paid at once.

---

## 2. Non-goals for v1

- Investor mode and Seller mode (design the code so they can be added later, but do not build them).
- Profit / investor profit-sharing calculation (the owner will ask later).
- Auto backup, cloud sync, multi-device sync.
- Login/accounts, network features, analytics, ads.
- Local app builds by the owner (see section 12).

---

## 3. Tech stack (decided)

| Area | Decision |
|---|---|
| Framework | React Native with **Expo**, **TypeScript** |
| Package manager | **pnpm workspace** (`.npmrc`: `node-linker=hoisted` so Metro works) |
| Routing | expo-router |
| Database | **SQLite** via `expo-sqlite` (data lives on the phone) |
| PIN storage | `expo-secure-store` (never in the SQLite DB, never in backup) |
| Backup | Single **JSON** file; restore from the same JSON |
| Dev preview | Expo Go on the phone, dev server on the owner's local PC |
| Release build | **GitHub Actions only** (no local APK build), APK sent to Telegram |
| Repo model | Polyrepo (this repo only), pnpm workspace inside it |

The owner's AI agent runs on his **local computer**. There is no cloud agent.

### Code style rules (important)

1. **Many small files.** One file per component, screen, sheet, hook, repository, service. Keep each file as short as possible.
2. Screens contain layout only. Business logic lives in `packages/core`. Database access lives in `src/db/repos`.
3. All amounts are derived from entries. **Never store a balance, due or stock number**; compute it so edits/deletes stay consistent.
4. Every record has `id` (UUID), `entry_date` (user-editable date), `created_at`, `updated_at` (timestamps), and `archived_at` (nullable, for soft delete).
5. Money is stored as integer **poisha** (1 taka = 100) to avoid float bugs. Display in taka.

---

## 4. Repository structure

```
pxo-android/
├─ REQUIREMENT.md            (this file, stays at the root)
├─ AGENT.md  CLAUDE.md  README.md
├─ pnpm-workspace.yaml  .npmrc  package.json
├─ docs/
│  ├─ DATA_MODEL.md  SCREENS.md  RELEASE.md
├─ .github/workflows/release.yml
├─ apps/mobile/                      Expo app
│  ├─ app.json  package.json  tsconfig.json
│  ├─ assets/                        icon, splash
│  ├─ app/                           expo-router screens (thin)
│  │  ├─ _layout.tsx  lock.tsx  index.tsx (Home)
│  │  ├─ stock/  give/  payment/  sellers/  wallets/
│  │  ├─ expenses/  bonus/  history/  settings/
│  └─ src/
│     ├─ components/  (ui, cards, forms, lists)
│     ├─ sheets/      (delete-confirm, wallet-split, allocation, restore-mode)
│     ├─ db/          (client, schema, migrations, repos/)
│     ├─ hooks/  theme/  utils/  types/
└─ packages/core/                    pure TypeScript, no React
   ├─ src/  (allocation, discount, balance, stock, bonus,
   │         due, backup-format, pin-lockout)
   └─ tests/
```

---

## 5. Phases (the agent must follow this order)

| Phase | Work |
|---|---|
| **0** | Create `AGENT.md`, `CLAUDE.md`, `README.md`, `docs/DATA_MODEL.md`, `docs/SCREENS.md`, `docs/RELEASE.md` from section 15 drafts. Fix/extend them where this file is clearer. |
| **1** | Design the full app UI/UX in **Figma via Figma MCP**: every screen and sheet in section 9, plus a generated app icon and an animated splash concept. |
| **2** | Set up the pnpm workspace, `packages/core` (logic + tests), then `apps/mobile` from the Figma design. |
| **3** | GitHub Actions release pipeline and Telegram delivery (section 12). |
| **4** | Test on the phone with Expo Go, then verify the release APK (splash/icon only show correctly there). |

**Ask the owner** (never guess, never commit these): Telegram bot token, Telegram chat ID, keystore store password, keystore key password, the fixed recovery PIN.

---

## 6. Domain rules

### 6.1 Wallets

- Types: **Cash** and **MFS**. Under MFS there are two wallets: **bKash** and **Nagad**. So three wallets total: Cash, bKash, Nagad.
- Each wallet has a manually entered **opening balance**.
- **Transfer** between wallets is supported.
- **MFS → Cash transfer** has a manually entered **cash-out charge**. The charge is recorded as an **expense** (category "Cash-out").
- Wallet balance = opening balance + money received − money paid out − expenses ± transfers.
- Multiple wallets can be used inside a single entry (e.g. 3000 cash + 4000 bKash).

> Assumption to confirm with the owner: on MFS → Cash, the MFS wallet decreases by `amount + charge`, Cash increases by `amount`, and `charge` is booked as an expense.

### 6.2 Entries (UI names in English)

| Owner's term | UI name | What it records |
|---|---|---|
| Stock Kena | **Buy Stock** | Cards bought from the source: quantity, rate per card (default from Settings, editable per entry), total, payment from one or more wallets, date, note. Every purchase is its **own entry** (no batches). |
| Card Dilam | **Give Cards** | Cards handed to a seller: seller, packets (each with its own card count), sell rate (default from Settings, editable), **sell cards** count and **bonus cards** count, note. |
| Taka Peyechi | **Receive Payment** | Money received from a seller: amount per wallet (multi-wallet), discount, and which packet(s) it applies to. |
| — | **Transfer** | Wallet to wallet, with optional cash-out charge for MFS → Cash. |
| — | **Expense** | Category (custom, user-editable) + optional note, amount, wallet(s), date. |
| — | **Manager Bonus** | Cards the manager keeps for himself, entered manually. |

Give Cards and Receive Payment are **always separate entries**.

### 6.3 Give Cards, packets and bonus

- Packet size is **not fixed** (25 is only the common case; 20/30/any). Each packet stores its own card count.
- Packet amount = `packet cards × sell rate` (per-packet rate override allowed).
- The entry records **sell cards** and **bonus cards** separately, and bonus is always decided at entry time. The count is manual (roughly 4–5 per 100 sell cards in practice, but never auto-filled as a rule; do **not** add a bonus rule to Settings).
- **Stock decreases by sell cards + bonus cards** (e.g. 100 sell + 4 bonus = 104 out of stock).
- Bonus is **not** part of the seller's amount, payments, or due.

### 6.4 Bonus section

- Shows **seller bonus** and **manager bonus** together but clearly separated from sell accounting.
- Bonus value = `bonus cards × main sell rate` (e.g. 4 × 300 = 1200). It is a **value shown for information**, never mixed into due/payment.
- Manager bonus works exactly like seller bonus (leaves stock, valued at the sell rate, shown in the Bonus section). The manager enters the number of cards manually.
- Bonus section supports filters by seller / manager and by date.

### 6.5 Receive Payment, discount and due

- **Due** for a packet = `packet amount − payments allocated − discount allocated`.
- **Seller due** = sum of due of all that seller's active packets.
- Discount is the shortfall the manager accepts (seller's wage). Once discount is given, the due it covers becomes 0; it is never chased.
- Discount is entered **in the same entry** as the payment (e.g. 7000 received + 500 discount), not a separate entry.
- One payment entry can cover **multiple packets**, and one packet can receive **multiple payments over time**, in different wallets.
- Seller detail shows total received, total discount, total due, packets and their status.

### 6.6 Allocation modes (payment and discount)

When one payment covers several packets, the user chooses:

- **Auto**: apply oldest packet first until money runs out (same for discount).
- **Manual**: the user types the amount (and discount) per packet.
- The **hybrid** is allowed: e.g. auto for payment and manual for discount, or the reverse. The user decides each time.

### 6.7 Stock

`Stock = total bought − sell cards given − bonus cards given − manager bonus cards` (active entries only).

### 6.8 Edit, delete, archive, restore

- Every record is **editable**. All derived numbers (stock, due, balances) recompute.
- Delete shows a confirmation with **two options**:
  1. **Permanent delete**: the record is removed; balances/stock/due return as if it never existed.
  2. **Archive (soft delete)**: `archived_at` set; excluded from all calculations.
- Archived records are found on **History** through a filter (All / Active / Archived). No separate Archive screen. Archived records can be **restored**.

---

## 7. Security: PIN lock

- Built-in custom **4-digit PIN**, like bKash/Nagad. Required **every time the app is newly opened**.
- Changeable from **Settings**.
- **5 wrong attempts → auto lock.** Lock durations grow ×3 each time: **30 s → 90 s → 270 s → 810 s → …**
- A **correct PIN resets** the wrong-attempt and lock-level counters.
- **Recovery PIN**: one fixed global PIN can reset a forgotten PIN. It must **not** be hard-coded in plain form in the source. Ask the owner for it, then store only a salted hash (e.g. derived at build time from a GitHub secret, or hashed constant). Never log it.
- Security note for the owner: the recovery PIN is a fixed backdoor by design. A hashed 4-digit value can still be brute-forced by someone who has the APK, so treat this as convenience-grade security.
- The PIN and recovery hash are **never included in the backup JSON**. After a restore on a new phone, the user sets a new PIN.

---

## 8. Settings

- **Source buying rate** (currently 190) and **seller sell rate** (currently 300). Both editable. They are defaults; each entry can override.
- **Opening balances** for Cash, bKash, Nagad.
- **Expense categories**: add / edit / delete (custom). Suggested seeds: Cash-out, Transport, Packaging, Other.
- **Change PIN**.
- **Backup** and **Restore** (section 11).

---

## 9. Screens (v1, Manager mode)

1. **Lock** (PIN entry, lockout timer, recovery PIN flow)
2. **Home**: cards in stock; balance of Cash, bKash, Nagad and their total; total seller due; today's cards given, payments received and expenses.
3. **Buy Stock**: form + list.
4. **Give Cards**: form (seller, packets, rate, sell cards, bonus cards) + list.
5. **Receive Payment**: form with multi-wallet split, discount, packet selection, Auto/Manual allocation.
6. **Sellers**: list, seller add/edit, **seller detail** (packets, payments, discount, due, bonus).
7. **Wallets**: three balances, transfer form (with cash-out charge for MFS → Cash).
8. **Expenses**: list, add/edit, category filter.
9. **Bonus**: seller bonus and manager bonus, values at the sell rate, add manager bonus.
10. **History**: all entries with date and timestamp, edit, delete/archive, filter All / Active / Archived, restore.
11. **Settings**.

Sheets: delete-confirm (permanent vs archive), wallet-split, allocation (auto/manual), restore-mode (replace vs merge), category editor.

The app must show **date and timestamp** for all records.

---

## 10. Data model (draft)

All tables also carry `id`, `created_at`, `updated_at`, `archived_at`. Money in poisha.

| Table | Key columns |
|---|---|
| `wallets` | type (`cash`/`mfs`), name (`Cash`/`bKash`/`Nagad`), opening_balance |
| `sellers` | name, note |
| `stock_purchases` | entry_date, quantity, rate, note |
| `stock_purchase_payments` | purchase_id, wallet_id, amount |
| `dispatches` (Give Cards) | seller_id, entry_date, sell_rate, sell_cards, bonus_cards, note |
| `packets` | dispatch_id, seq, cards, rate_override (nullable) |
| `payments` (Receive Payment) | seller_id, entry_date, discount_total, allocation_mode, note |
| `payment_wallet_lines` | payment_id, wallet_id, amount |
| `payment_allocations` | payment_id, packet_id, amount, discount |
| `manager_bonus` | entry_date, cards, rate_at_entry, note |
| `transfers` | from_wallet_id, to_wallet_id, amount, charge, expense_id (nullable), entry_date |
| `expense_categories` | name |
| `expenses` | entry_date, category_id, amount, wallet_id, note |
| `settings` | key, value (source_rate, sell_rate) |

Derived (never stored): stock, packet due, seller due, wallet balances, bonus values.

---

## 11. Backup and restore

- **Manual only** (button). No auto backup.
- Backup is **one JSON file**: `{ app: "pxo", schemaVersion, exportedAt, tables: { ... } }`. Includes all tables and settings rates. **Excludes PIN and recovery hash.**
- File name is auto-generated: **`pta_backup_YYYY-MM-DD_HHMM.json`**.
- The **user picks the save location** with the Android file picker/share sheet (phone storage, Google Drive, pen drive, anything). Restore also uses the file picker.
- On restore the user chooses:
  1. **Replace all**: wipe current data, load the backup.
  2. **Merge**: add backup records to current data without duplicates (match by `id`; if the same `id` exists on both sides keep the one with the newer `updated_at`).
- Validate `schemaVersion` and structure before touching the DB; run the restore in a transaction and roll back on any error.

---

## 12. Release pipeline (GitHub Actions only)

- **No local APK builds.** The owner tests with Expo Go; releases are built by GitHub Actions.
- Workflow (`.github/workflows/release.yml`): install pnpm, run `packages/core` tests, `expo prebuild` for Android, `gradlew assembleRelease` signed with the release keystore, upload the APK as an artifact, then send it to Telegram with `sendDocument`.
- Signing keystore (create once with `keytool`, never commit the file):

```
keytool -genkeypair -v -keystore pxo-release.jks -alias pxo \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -dname "CN=Mohammad Sijan, O=SpritexAI, L=Faridpur, ST=Dhaka, C=BD"
```

  (File `pxo-release.jks`, alias `pxo`, 30 years, no OU.) `keytool` only needs a JDK. If the owner has no JDK, create it with a one-off `workflow_dispatch` workflow instead. The owner must keep a safe copy of the keystore and passwords; if they are lost, updates to installed APKs are impossible.
- GitHub Secrets to set (ask the owner for values, **never** hard-code or log):
  `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` (= `pxo`), `KEY_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- `android.package` in `app.json` must be `pta.pxo.fp`; app name `PXO`.

---

## 13. Design and branding (Phase 1)

- Design **every screen and sheet** in Figma through **Figma MCP** before writing UI code, then convert the design to code.
- The agent **generates a good-looking app icon** by itself and uses it for the launcher icon and splash.
- **Animated splash screen** built from that icon. Expo's native splash is static, so: keep a matching static native splash, then show an animated in-app splash (e.g. Reanimated) before the lock screen. Verify on the release APK.
- Money-app feel: clear numbers, large tap targets, fast entry forms (this is used daily on the phone).

---

## 14. Acceptance checklist (v1)

- [ ] Buy Stock (multi-wallet payment), stock count correct
- [ ] Give Cards with variable packet sizes, sell cards and bonus cards separate; stock drops by both
- [ ] Receive Payment: multi-wallet, discount in same entry, multi-packet, Auto/Manual allocation
- [ ] Due = amount − payments − discount, per packet and per seller; bonus never affects due
- [ ] Bonus section (seller + manager) valued at sell rate
- [ ] Wallets: three balances, opening balances, transfers, cash-out charge saved as expense
- [ ] Expenses with custom categories and optional note
- [ ] Edit everything; permanent delete or archive; History filter and restore
- [ ] PIN lock, lockout ladder 30s×3, correct PIN resets, recovery PIN via hash
- [ ] Manual backup/restore (replace and merge), no PIN in JSON, timestamped file name
- [ ] Date and timestamp on every record
- [ ] `packages/core` tests pass in CI
- [ ] Release APK arrives on Telegram, signed with the keystore
- [ ] English-only UI

### Open assumptions to confirm with the owner

1. MFS → Cash: MFS decreases by `amount + charge`.
2. An expense uses a single wallet (multi-wallet expenses are not required).
3. Per-packet rate override is allowed but rarely used.
4. Merge conflict rule: newer `updated_at` wins.

---

## 15. Draft contents of the other docs (create these in Phase 0)

### 15.1 `AGENT.md`

```markdown
# AGENT.md — PXO

Read `REQUIREMENT.md` first. It is the source of truth.

## Rules
- Many small files: one component/screen/sheet/hook/repo/service per file, as short as possible.
- Screens are thin. Logic in `packages/core`. DB in `apps/mobile/src/db/repos`.
- Never store balances, stock or due. Always derive from entries.
- Money = integer poisha. Every record: id (UUID), entry_date, created_at, updated_at, archived_at.
- English UI only. Offline only. No network features.
- Never commit secrets: keystore, passwords, Telegram token/chat ID, recovery PIN.
- Ask the owner for secrets; do not invent them.
- No local APK builds. Preview with Expo Go. Releases via GitHub Actions.
- pnpm only. `.npmrc` has `node-linker=hoisted`.

## Commands
- `pnpm install`
- `pnpm --filter mobile start` (Expo Go preview)
- `pnpm --filter core test`
```

### 15.2 `CLAUDE.md`

```markdown
# CLAUDE.md — PXO

@AGENT.md
@REQUIREMENT.md

## Claude-specific
- Follow the phases in REQUIREMENT.md section 5 in order.
- Design in Figma (Figma MCP) before UI code.
- Keep each file short; split instead of growing a file.
- Before finishing a task: run core tests, check types, update docs/ if behaviour changed.
- If a requirement is unclear, ask the owner. Do not assume business rules.
```

### 15.3 `README.md`

```markdown
# PXO
Offline Android app (Expo, React Native, TypeScript) to manage the PTA card business.
Package: pta.pxo.fp. Docs: REQUIREMENT.md, docs/.
Dev: pnpm install, then pnpm --filter mobile start and open in Expo Go.
Release: GitHub Actions builds the APK and sends it to Telegram.
```

### 15.4 `docs/DATA_MODEL.md`

```markdown
# Data model
See REQUIREMENT.md section 10 for the table list. Rules:
- UUID ids, integer poisha, ISO timestamps.
- archived_at = soft delete; permanent delete removes rows (cascade allocations/lines).
- Derived, never stored: stock, packet due, seller due, wallet balance, bonus value.
- Migrations live in apps/mobile/src/db/migrations, numbered, forward-only.
- Backup JSON mirrors the tables plus schemaVersion; no PIN data.
```

### 15.5 `docs/SCREENS.md`

```markdown
# Screens
Lock, Home, Buy Stock, Give Cards, Receive Payment, Sellers (+detail),
Wallets (+Transfer), Expenses, Bonus, History (filter All/Active/Archived), Settings.
Sheets: delete-confirm (permanent vs archive), wallet-split, allocation (auto/manual),
restore-mode (replace/merge), category editor.
Home shows: stock, 3 wallet balances + total, total seller due, today's give/payment/expense.
Each screen is designed in Figma first; link frames here once created.
```

### 15.6 `docs/RELEASE.md`

```markdown
# Release
- Signed by GitHub Actions only. Keystore pxo-release.jks (alias pxo, RSA 2048, 30 years).
- Secrets: KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD,
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
- Steps: pnpm install, core tests, expo prebuild android, gradlew assembleRelease,
  upload artifact, Telegram sendDocument.
- Package: pta.pxo.fp. App name: PXO.
- Keep the keystore and passwords backed up privately; never commit them.
```
