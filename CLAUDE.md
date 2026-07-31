# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A local-first household finance PWA — one `index.html` file with all CSS/JS inlined, a service worker for offline, and optional Supabase-based two-phone sync. No framework, no build step.

## Run / Deploy

No build step. Open `index.html` directly in a browser, or:

```
# Deploy to Netlify (drag-and-drop):
# 1. Go to https://app.netlify.com/drop
# 2. Drag the project folder or household.zip onto the page
```

The app is also available as a PWA: Safari → Share → Add to Home Screen.

## Architecture

### Storage

- **localStorage** under key `family-finance-v1` contains all data as a single JSON blob (`DB` global).
- Optional **Supabase** sync: data pushed to a `public.households` table via RPC functions (PIN-protected, last-write-wins with rev counter).
- A backup key `family-finance-lastgood` keeps the last valid state for corruption recovery.

### Data model (`DB` object)

| Field | Description |
|-------|------------|
| `people[]` | Actors with name, avatar emoji, color, commonPct/personalPct split ratio |
| `budgets[]` | Per-person monthly salary split — `salary` minus `fixedItems[]` (name, amount, type tag) = remainder split by commonPct/personalPct |
| `expenses[]` | Two kinds: `kind:"fixed"` (planned bills, tickable, dueDay, paidBy) and `kind:"extra"` (unplanned common spend with date) |
| `savings[]` | Fixed deposits & investments — owner, bank, amount, maturity, tenure, phone, nominee |
| `savingsTypes[]` | Customizable type list for the savings dropdown |

### Time

All dates use **Asia/Kolkata** (IST) via `Intl.DateTimeFormat` with `timeZone:'Asia/Kolkata'` — never device local time. `istNow()` returns `{y,m,d}` in IST.

### Views (tabs)

1. **Home** — monthly stats cards, bill tick progress bar, maturing savings alert
2. **Split** — per-person salary → fixed items → remainder → common/personal savings
3. **Expenses** — fixed/planned bills (tickable) + extra/unplanned spends
4. **Analytics** — combined or per-person donut chart, 6-month stacked bars, common savings pool
5. **Savings** — grouped by owner, maturity badges, tap-to-call phone numbers
6. **Settings** — actor profiles, sync setup, backup export/import

### Sync

- Opt-in, PIN-protected, uses Supabase RPC functions (`household_create`, `household_get`, `household_put`).
- Push on every data save (debounced 800ms), pull every 5 seconds.
- `lastSerialized` tracks the last pushed snapshot so unchanged data skips network.

### Templating

Each view is a function returning an HTML string (e.g. `viewHome()`, `viewSplit()`). `render()` calls the current tab's view function and sets `innerHTML`. Targeted DOM updates exist only for `togglePaid()` (tick checkbox without full re-render).

### Key conventions

- `fmt(n)` — format ₹ amount with Indian numbering, optionally hidden as `•••••`
- `uid()` — generate random 8-char ID (used for all entity IDs)
- `curMonth()` — returns the currently viewed month as `YYYY-MM`
- `thisMonth()` — returns the current IST month as `YYYY-MM`
- Modals open via `openModal(html)` which sets `#sheet` innerHTML and shows `#modal`
- `save()` — bumps `DB.rev`, calls `migrate()` for data upgrades, writes to localStorage, triggers `syncPush()`
- SVG icons are defined in the `ICONS` object and rendered via `icon(name, color, size)`

### Supabase RPC

The `supabase-setup.sql` file defines the backend schema. Run it once in the Supabase SQL editor. Two files are not directly served:
- `supabase-setup.sql` — schema + RPC functions
- `supabase-cleanup-tests.sql` — optional test data cleanup