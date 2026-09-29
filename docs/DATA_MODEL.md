# Data Model — PXO

Full table definitions are the authoritative record here; the prose in
`REQUIREMENT.md` section 10 is the source of truth for rules.

---

## Core rules

- Every row carries: `id TEXT PRIMARY KEY` (UUID v4), `created_at TEXT`,
  `updated_at TEXT` (ISO 8601 UTC), `archived_at TEXT` (nullable — soft delete).
- `entry_date TEXT` is user-editable (ISO date, e.g. `2024-06-15`). It determines
  ordering in lists and reports.
- **Money is stored as integer poisha** (1 taka = 100 poisha). Never use REAL for money.
- **Derived values are never stored.** Compute at read time from raw rows:
  - Stock = total bought − sell cards given − bonus cards given − manager bonus cards
    (active entries only)
  - Packet due = packet amount − payments allocated to packet − discount allocated to packet
  - Seller due = sum of active packet dues for that seller
  - Wallet balance = opening balance + money in − money out − expenses ± transfers
  - Bonus value = bonus cards × sell rate at the time of entry

---

## Tables

### `wallets`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| type | TEXT | `cash` or `mfs` |
| name | TEXT | `Cash`, `bKash`, or `Nagad` |
| opening_balance | INTEGER | poisha; user-editable from Settings |
| created_at | TEXT | |
| updated_at | TEXT | |
| archived_at | TEXT | nullable |

Seeded once at first launch: Cash (cash), bKash (mfs), Nagad (mfs).

---

### `sellers`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| name | TEXT | |
| note | TEXT | nullable |
| created_at / updated_at / archived_at | TEXT | |

---

### `stock_purchases` (Buy Stock)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| entry_date | TEXT | |
| quantity | INTEGER | cards |
| rate | INTEGER | poisha per card (editable per entry; default from Settings) |
| note | TEXT | nullable |
| created_at / updated_at / archived_at | TEXT | |

Total cost = `quantity × rate` (computed, not stored).

---

### `stock_purchase_payments`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| purchase_id | TEXT FK → stock_purchases | CASCADE delete |
| wallet_id | TEXT FK → wallets | |
| amount | INTEGER | poisha |
| created_at / updated_at | TEXT | |

---

### `dispatches` (Give Cards)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| seller_id | TEXT FK → sellers | |
| entry_date | TEXT | |
| sell_rate | INTEGER | poisha; default from Settings, editable |
| sell_cards | INTEGER | total sell cards across all packets |
| bonus_cards | INTEGER | bonus cards given to seller (man. entered) |
| note | TEXT | nullable |
| created_at / updated_at / archived_at | TEXT | |

Stock decreases by `sell_cards + bonus_cards`.

---

### `packets`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| dispatch_id | TEXT FK → dispatches | CASCADE delete |
| seq | INTEGER | order within the dispatch |
| cards | INTEGER | card count for this packet (not fixed to 25) |
| rate_override | INTEGER | nullable poisha; overrides dispatch sell_rate for this packet |
| created_at / updated_at | TEXT | |

Packet amount = `cards × (rate_override ?? dispatch.sell_rate)` (computed).

---

### `payments` (Receive Payment)
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| seller_id | TEXT FK → sellers | |
| entry_date | TEXT | |
| discount_total | INTEGER | poisha; shortfall the manager accepts |
| allocation_mode | TEXT | `auto`, `manual`, or `hybrid` |
| note | TEXT | nullable |
| created_at / updated_at / archived_at | TEXT | |

---

### `payment_wallet_lines`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| payment_id | TEXT FK → payments | CASCADE delete |
| wallet_id | TEXT FK → wallets | |
| amount | INTEGER | poisha |
| created_at / updated_at | TEXT | |

---

### `payment_allocations`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| payment_id | TEXT FK → payments | CASCADE delete |
| packet_id | TEXT FK → packets | |
| amount | INTEGER | poisha allocated to this packet |
| discount | INTEGER | poisha discount allocated to this packet |
| created_at / updated_at | TEXT | |

---

### `manager_bonus`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| entry_date | TEXT | |
| cards | INTEGER | |
| rate_at_entry | INTEGER | poisha; sell rate at time of entry |
| note | TEXT | nullable |
| created_at / updated_at / archived_at | TEXT | |

Counted in stock consumption: `stock -= manager_bonus.cards`.

---

### `transfers`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| from_wallet_id | TEXT FK → wallets | |
| to_wallet_id | TEXT FK → wallets | |
| amount | INTEGER | poisha transferred |
| charge | INTEGER | poisha; MFS→Cash cash-out charge (0 for other transfers) |
| expense_id | TEXT FK → expenses | nullable; points to auto-created Cash-out expense |
| entry_date | TEXT | |
| created_at / updated_at / archived_at | TEXT | |

On MFS → Cash: MFS decreases by `amount + charge`; Cash increases by `amount`;
`charge` is booked as an expense (category "Cash-out") linked via `expense_id`.

---

### `expense_categories`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| name | TEXT UNIQUE | |
| created_at / updated_at / archived_at | TEXT | |

Seeded at first launch: Cash-out, Transport, Packaging, Other.

---

### `expenses`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| entry_date | TEXT | |
| category_id | TEXT FK → expense_categories | |
| amount | INTEGER | poisha |
| wallet_id | TEXT FK → wallets | single wallet per expense |
| note | TEXT | nullable |
| created_at / updated_at / archived_at | TEXT | |

---

### `settings`
| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK | |
| value | TEXT | |

Keys: `source_rate` (poisha/card, default 19000), `sell_rate` (poisha/card, default 30000).

---

## Migrations

- Location: `apps/mobile/src/db/migrations/`
- File naming: `NNNN_<description>.sql` (e.g. `0001_initial_schema.sql`)
- Forward-only; migrations run in sequence on app start.
- Schema version is stored as a `schema_migrations` table or `PRAGMA user_version`.

---

## Backup JSON

```jsonc
{
  "app": "pxo",
  "schemaVersion": 1,
  "exportedAt": "2024-06-15T14:30:00Z",
  "tables": {
    "wallets": [...],
    "sellers": [...],
    "stock_purchases": [...],
    "stock_purchase_payments": [...],
    "dispatches": [...],
    "packets": [...],
    "payments": [...],
    "payment_wallet_lines": [...],
    "payment_allocations": [...],
    "manager_bonus": [...],
    "transfers": [...],
    "expense_categories": [...],
    "expenses": [...],
    "settings": [...]
  }
}
```

**PIN and recovery hash are never included.** Validate `schemaVersion` and structure
before touching the DB. Run restores inside a transaction; roll back on any error.

Merge conflict rule: same `id` on both sides → keep the row with the newer `updated_at`.

File name format: `pta_backup_YYYY-MM-DD_HHMM.json`
