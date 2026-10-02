# AGENT.md — PXO

Read `REQUIREMENT.md` first. It is the single source of truth.

## Rules

- **Many small files.** One component / screen / sheet / hook / repo / service per file.
  Keep each file as short as possible. Split rather than grow.
- **Screens are thin.** Layout only. Business logic lives in `packages/core`.
  Database access lives in `apps/mobile/src/db/repos`.
- **Never store derived values.** Stock, packet due, seller due, wallet balances, and bonus
  values are always computed from raw entries. Never write them to the DB.
- **Money = integer poisha** (1 taka = 100 poisha). Display in taka; calculate in poisha.
- **Every record carries:** `id` (UUID v4), `entry_date` (user-editable ISO date),
  `created_at`, `updated_at` (auto timestamps), `archived_at` (nullable soft-delete).
- **English UI only.** Offline only. No network access at runtime.
- **Never commit secrets:** keystore file, store/key passwords, or the recovery PIN hash.
  Ask the owner when they are needed.
- **No local APK builds.** Development preview via Expo Go.
  All release APKs are built by GitHub Actions only.
- **pnpm only.** `.npmrc` must contain `node-linker=hoisted` so Metro resolves packages.
- **Phases must be followed in order** (section 5 of REQUIREMENT.md).
  Do not start Phase N+1 work inside Phase N.

## Domain reminders

- Discount is the shortfall the manager accepts when a seller pays less than the packet
  amount. It is entered alongside the payment, never as a separate entry, and is never
  collected later.
- Bonus cards leave stock (decrease by sell cards + bonus cards). Bonus is never part
  of due/payment calculations.
- Delete has two modes: **permanent** (removes row, cascades; stock/due/balance restored)
  and **archive** (sets `archived_at`; excluded from all calculations, restorable).
- PIN lock: 5 wrong attempts → lock, then 30 s → 90 s → 270 s → 810 s (×3 each level).
  Correct PIN resets attempt and lock-level counters.
- Recovery PIN: store only a salted hash derived from a GitHub secret at build time.
  Never log or expose the raw value.

## Commands

```sh
pnpm install                        # install all workspace packages
pnpm --filter mobile start          # Expo Go dev server
pnpm --filter core test             # run packages/core unit tests
pnpm --filter core typecheck        # TypeScript check for core
```

## Secrets to ask the owner (never invent)

- Keystore store password
- Keystore key password  
- Recovery PIN (for hash derivation)
