# Family Finance App — Build Plan

A local-first iPhone app for a two-person household (Vishal & Shubhi) to manage
monthly budgets, tick off expenses, track fixed deposits, and follow an
investment/SIP allocation plan. Data lives on-device and syncs privately between
two iPhones through your own iCloud.

---

## 1. Tech choices

| Concern | Choice | Why |
|---|---|---|
| Language / UI | **Swift + SwiftUI** | Native, modern, least code for iOS UI |
| Local storage | **SwiftData** | On-device database, "local on iPhone" |
| Two-phone sharing | **CloudKit shared database** | Free, private (your iCloud), no server |
| Charts | **Swift Charts** | Built-in, for the SIP pie / spend trends |
| Notifications | **UserNotifications** | FD maturity + bill-due reminders |
| Min iOS | **iOS 17+** | Required for SwiftData |

**Prerequisites**
- Mac with Xcode 16+ (you're on macOS ✅)
- Apple ID; **Apple Developer Program ($99/yr)** for CloudKit sharing + 1-yr installs
- Both users signed into their own iCloud on their iPhones

---

## 2. Data model (SwiftData entities)

```
Household            // the shared "space" both users join
  - name, members[]

Person               // Vishal, Shubhi, Mum, etc.
  - name, color

MonthlyBudget        // one per person per month (the whiteboard split)
  - month (2026-07), person
  - common, fixedTotal, personal, prepayment, buffer
  - fixedItems[]     // 30k MF, 6k insurance, ... (name -> amount)

Expense              // the "monthly expense tick"
  - name, amount, category, dueDay
  - isRecurring, isPaid (the tick), paidDate
  - month, paidBy (person)

FixedDeposit         // the FD table
  - owner (Shubhi/Mum/Vishal), type (FD)
  - bank, amount, maturityDate, tenure
  - source (Bank/Axis App/Smallcase), status (Running/Matured)
  - phoneNum, nominee

Investment / SIP     // the allocation plan
  - person, fundName, assetClass (Equity/Gold/Debt/REIT/Crypto)
  - monthlyAmount, targetPercent
```

---

## 3. App screens

1. **Home / This Month**
   - Total budgeted vs. spent, buffer status, "X of Y bills ticked"
   - Quick tick list of this month's recurring expenses

2. **Monthly Split** (the whiteboard)
   - Per person: Common / Fixed / Personal / Prepayment / Buffer
   - Expandable Fixed breakdown; end-of-month status (savings pool, prepayment ideal vs worst case)

3. **Expenses** — add/edit expenses, tick as paid, filter by month/person/category

4. **Fixed Deposits** — the FD table; add/edit, group by owner, badge maturing-soon, tap-to-call nominee/phone

5. **Investments / SIP** — target allocation pie (Swift Charts), per-person monthly SIPs, emergency-fund breakdown

6. **Settings** — household sharing (invite the 2nd phone), notifications, backup

---

## 4. Build phases

**Phase 0 — Setup (½ day)**
Xcode project, SwiftData + CloudKit capability, seed with your real data.

**Phase 1 — FD tracker (1–2 days)**
Highest value, self-contained. List + add/edit form + maturity reminders. Import the 12 FDs from your sheet.

**Phase 2 — Expense ticking (2 days)**
Expense model, monthly recurring generation, the tick UI, home summary.

**Phase 3 — Monthly split (2 days)**
Per-person budget entry matching the whiteboard, fixed breakdown, end-of-month status calc.

**Phase 4 — SIP / allocation (1–2 days)**
Target allocation + charts + per-person SIP list + emergency fund.

**Phase 5 — Two-phone sharing (1–2 days)**
CloudKit shared database, invite flow, test sync between both iPhones.

**Phase 6 — Polish**
Reminders, icons, empty states, on-device install for a year.

---

## 5. Key decisions still open
- Currency/format: ₹ with "lakhs" shorthand like your sheet? (assume yes)
- Do Mum's FDs live in the same shared household or separate?
- Prepayment: track against a specific loan (target balance) or just a monthly pool?

---

## 6. Open risk / note
- CloudKit sharing genuinely needs the paid Apple Developer account. If you'd
  rather avoid that initially, we can build Phases 1–4 **local-only** first and
  add sharing later — the code is structured so sharing is an add-on, not a rewrite.
