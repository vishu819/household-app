# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A local-first household finance PWA — `index.html` with inline CSS plus `app.js`, `views.js`, `savings.js`, and `institutions.js`, a service worker for offline, and optional Supabase-based two-phone sync. No framework, no build step.

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
- Push on every data save (debounced 800ms), remote refresh every 12 hours while active, with a due check on focus/resume and an icon-only Force sync action. Successful upload/read timestamps and pending edits are stored per device; a failed request does not advance the success timestamp.
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

### Savings forms and directory

- `savings.js` owns type-specific FD/RD/fund/gold/custom forms, deposit tenure validation, and the institution combobox. Deposit rates are recorded, not used to estimate guaranteed interest.
- `institutions.js` is a local bank/broker directory. Logos are served from `assets/institutions/`; `sources.json` records their provenance. Missing logos fall back to initials. No typed search is sent to an external service.
- `screenHeader()` supplies the same compact header for all six tabs. Its sync icon retains the accessible name "Force sync".
- Run `node tests/regression.mjs` and `node tests/local-savings-sync.mjs` for dependency-free tests using synthetic data and mocked sync.

## Vault references
`vault.js` manages `DB.vault`: owner/actor, institution, purpose, Bitwarden item name or Google Drive document URL, plus optional related credential reference. Never collect passwords, PINs, security answers or recovery secrets here. Metadata uses existing local storage/household sync and is not end-to-end encrypted; the UI states this. Documents remain in Drive and credentials in Bitwarden. Only HTTPS drive.google.com/docs.google.com document URLs are accepted. The Bitwarden action opens its web vault, not a guaranteed item deep link; offline unlock is handled by its installed app. Vault shell is cached by the service worker, external files are not. Analytics and Settings are accessed through More to keep six navigation items. Run `node tests/vault.mjs` for reference storage, filtering, URL and migration checks.

## Encrypted credential vault
`encrypted-vault/` contains the KDBX reader/editor and Google Drive manual encrypted snapshot flow. `vault.js` embeds it in the Vault tab; Documents & links preserves the previous reference directory. Never put credential fields into DB.vault, financial backups, or Supabase. Encrypted bytes alone persist in the separate vault IndexedDB; tokens stay in memory. Owner filters do not restrict access. This is a local integration preview, not a completed automatic shared sync implementation. The iframe shares the app origin; it is not a security boundary against compromised app scripts. Leaving Vault destroys the embedded document and its in-memory unlock session. Main service worker must not delete nested vault caches or cache Google API responses.

Vault workflow now gates credentials behind Google connection, discovers Household.kdbx, uploads after creation, and queues/syncs encrypted saves. It makes an immutable recovery file before updating the linked shared file, checks remote checksum/version, and refuses observed conflicts. Drive updates do not yet have a verified atomic precondition: concurrent races may leave competing recovery copies requiring review; do not claim lossless automatic merging. Document picker allows multiple files; IDs/names/owners are encrypted KDBX entries. Credential metadata never goes to DB.vault. Initial local adoption may require choosing the shared file. Google reconnect is required per session; offline unlock without a Google session is not yet exposed. Run tests/vault-workflow.mjs.

## Household membership boundary
Vault now requires successful create/join or explicit server verification of a saved household connection. `membership.js` accepts context only from the same-origin parent frame. Local IndexedDB names include household IDs; unscoped prototype data is preserved but not automatically imported. Drive metadata uses a SHA-256 household tag. Leaving or switching households destroys the embedded frame and its in-memory Google access; ordinary tab switches keep it mounted and only lock credentials. The server registry in `supabase-vault-setup.sql` validates household code/PIN for reads and links, serializes link creation on the household row, and refuses replacing an existing link. It stores only Drive file IDs. This retains the shared code/PIN access model; it does not create individual user authentication or revoke existing Drive sharing. Tests: vault-membership.mjs, vault-workflow.mjs, vault-lock.mjs, vault-recovery.mjs.

## Document organization and ZIP downloads
`encrypted-vault/documents.js` organizes documents and virtual folders as encrypted KDBX entries. `Access type` is Document or Document folder; folder IDs refer to entry UUIDs. These entries must be excluded from credential lists and owner calculations. Document names/categories/folder membership are local app labels and do not rename or move original Drive files. Add from Drive stages a naming/category/folder form before saving. ZIP exports operate on the current folder plus owner/category/search filters, permit at most 30 files / 50 MB, check canDownload, export supported native Google formats to PDF/PNG, and fail without producing a partial archive. ZIPs contain original, unencrypted documents; users explicitly tap Save ZIP. Object URLs and document metadata are cleared when the vault locks. fflate 0.8.2 is locally bundled with its license. Tests include vault-documents.mjs and vault-empty-fields.mjs; tests/vault-ui-preview.html is a fictional UI harness with no live Google access and should not be published as part of the app shell.

Vault owner editors now accept household actors only, via the verified same-origin membership bridge. Owner actor IDs are stored with encrypted entries; renamed actors resolve to their latest household name. Legacy owner labels remain readable, but editing requires a current actor. No synthetic Joint owner is injected unless Joint is actually an actor. Access type uses the schema in credential-form.js and redraws the relevant fields; unknown/previous fields are retained to avoid silent data loss. Documents share the actor selector. Folder navigation uses compact rows with counts instead of horizontal cards.

Mobile session correction: switching app/browser tabs conceals revealed values but retains the unlock session until its five-minute absolute inactivity deadline. Return checks the deadline even if background timers were throttled. Household changes and explicit Lock still destroy/lock immediately. Google Picker uses the documented toUri embed in a top-level native dialog sized to the visual viewport, rather than the default minimum-width Google dialog inside the auto-height vault frame. Inputs use at least 16px to avoid iOS focus zoom; touch-action manipulation suppresses accidental double-tap zoom while retaining pinch zoom.
