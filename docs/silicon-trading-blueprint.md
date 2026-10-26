# Silicon Trading — Website Blueprint & Technical Architecture

**Version:** 1.1 · **Market:** Philippines (PHP) · **Model:** B2B escrow marketplace for repair-grade silicon

> **Locked decisions in this revision**
> 1. Custody via a **licensed PSP escrow API** — the platform never holds client funds.
> 2. Verified Pass verification = **seller evidence upload + flag-and-ban spot audit**.
> 3. Commission = **8% of item subtotal, ₱20 minimum floor**.
> 4. Buyer KYC triggers at **₱15,000 cumulative paid volume per calendar month** (not per order).
> 5. **72-hour auto-release for every tier.** The 48-hour metric exists only as the **Pro Workshop support resolution guarantee**.
> 6. **Platform-mandated 7-day DOA** coverage on every component.
> 7. DOA/dispute returns use a **platform-generated prepaid courier label**.

---

## 0. Product Foundation

### 0.1 Positioning

> **"Silicon you can trust. Your money sits in licensed escrow until you verify the part."**

Silicon Trading is a **trusted middleman** for the secondary electronics supply chain. It connects:

| Supply side | Demand side |
|---|---|
| Repair technicians | Repair shops needing donor boards |
| Refurbishers | Refurbishers sourcing ICs / assemblies |
| Scrap collectors | Technicians buying reclaimed OEM parts |
| Component sellers | Resellers needing verified stock |

The differentiator is not the catalog — it is the **escrow + verification loop**. Every transaction has three evidentiary moments: *listing proof*, *checkout acknowledgement*, and *post-delivery validation*.

### 0.2 Commercial model (locked, but stored in `PlatformSetting`)

| Revenue line | Amount | Charged to |
|---|---|---|
| Marketplace commission | **8% of item subtotal, ₱20 minimum** | Seller, deducted from escrow release |
| Verified Pass — single | ₱49 / listing / 30 days | Seller |
| Verified Pass — **Pro Workshop** | ₱399 / month / 8 boosted listings + **48h support resolution guarantee** | Seller |
| Payout fee | Pass-through (GCash/bank) | Seller |
| DOA return shipping | Platform-funded prepaid label; recovered from seller if the claim is upheld | Platform → seller |

**Commission math** (item subtotal only; shipping and taxes excluded, half-up to the centavo):

| Item subtotal | 8% | Commission charged |
|---|---|---|
| ₱150 | ₱12.00 | **₱20.00** (floor) |
| ₱320 | ₱25.60 | ₱25.60 |
| ₱1,000 | ₱80.00 | ₱80.00 |
| ₱4,850 | ₱388.00 | ₱388.00 |

Seller payable = `subtotal − commission` (+ shipping reimbursement only if the seller books and pays the courier directly). The commission snapshot is written at order creation and is immutable.

Buyer pays item price + shipping, with **no buyer-side platform fee**. **No COD** — COD bypasses escrow and is therefore disabled platform-wide.

**Buyer KYC trigger:** a buyer may transact freely until cumulative **paid** volume in the current calendar month (Asia/Manila) reaches **₱15,000**. At that point the next checkout requires identity verification; the order in flight is unaffected. Volume is gross of refunds so the threshold cannot be gamed by refund cycling.

### 0.3 Design direction

- **Mood:** laboratory-instrument, evidence-first, industrial. Not a consumer shopping app.
- **Palette:** Ink `#0A0F1A` · Steel `#4B5A70` · Surface `#F6F8FB` · **Wafer Teal `#0F9D8A`** (primary/trust) · **Trace Copper `#C87941`** (Verified Pass) · Signal Amber `#F59E0B` (pending) · Danger `#DC2626` · Success `#16A34A`.
- **Type:** `Inter` for UI; `JetBrains Mono` for part numbers, SKUs, serials, tracking numbers, prices in tables.
- **Shape:** 4–8px radii, 1px hairline borders, thin circuit-trace dividers, faint die-shot grid in hero only.
- **Rule:** every trust claim must render as a *badge with provenance* (who verified it, when). No decorative trust language.

### 0.4 Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Web app | Next.js 15 (App Router) + TypeScript | SSR for SEO-critical listings, route groups per nav section |
| Styling | Tailwind CSS + Radix primitives | Fast, accessible, consistent badges/filters |
| API | Next Route Handlers + tRPC (internal) | Typed contracts, colocated with app |
| DB | PostgreSQL 16 + Prisma | Relational integrity for escrow ledger, JSONB for diagnostics |
| Search | Postgres FTS + `pg_trgm` (MVP) → Meilisearch at scale | Part-number fuzzy matching, facet counts |
| Jobs | BullMQ + Redis | 72h release timers, DOA expiry, reminders, pass expiry, webhook retries |
| Storage | S3 / Cloudflare R2 + signed URLs | Listing photos, KYC docs, seller evidence packs, dispute evidence |
| Payments | **BSP-licensed PSP escrow API** — shortlist Xendit / PayMongo / Maya Business; contract must explicitly cover escrow custody | Funds held by the licensee, not the platform |
| Reverse logistics | Same courier aggregator, reverse-pickup endpoint | Platform-generated return labels |
| Courier | Lalamove, J&T, Ninja Van, Grab Express | Live tracking webhooks |
| Auth | Auth.js (email OTP + Google) + RBAC middleware | Low-friction PH signup |
| Observability | Sentry + structured audit log | Dispute-grade traceability |

### 0.5 Sitemap

```
/                          Home
/marketplace               Search + facets
/marketplace/[slug]        Listing detail
/compatibility             Compatibility checker (also embedded on home)
/sell                      Seller dashboard (overview)
/sell/new                  Create listing (stepper)
/sell/listings             Manage listings
/sell/orders               Incoming orders
/sell/verified-pass        Upgrade / manage pass + Pro Workshop
/sell/evidence             Upload & track diagnostic evidence packs
/orders                    Buyer + seller orders (tabbed)
/orders/[id]               Order detail, tracking, 72h validation, DOA claim, return label
/checkout/[orderId]        Escrow checkout + Before You Buy checklist
/support                   Help center + ticket list (SLA badge for Pro Workshop)
/support/new               Open ticket
/disputes/[id]             Dispute room
/account                   Profile hub
/account/verification      Buyer + seller verification + monthly volume meter
/account/addresses         Delivery addresses
/account/payouts           Seller payout methods + rolling reserve
/admin/*                   Ops console (support, KYC, audits, DOA claims, escrow reconciliation)
```

---

## 1. Core Navigation & Account Logic

### 1.1 The six primary destinations

| # | Label | Route | Job to be done | Primary CTA | Visible when |
|---|---|---|---|---|---|
| 1 | **Marketplace** | `/marketplace` | Find donor boards, motherboards, ICs, reclaimed phone parts | `Search parts` | Always |
| 2 | **Sell a Board** | `/sell` | Create and manage component listings | `+ New listing` | Always (gated action) |
| 3 | **Verified Pass** | `/verified-pass` | Understand and buy diagnostic verification + priority placement | `Get Verified Pass` | Always |
| 4 | **Orders** | `/orders` | Track purchases, shipments, live transaction + escrow status | `View order` | Signed in |
| 5 | **Support / Dispute** | `/support` | Get help, report a listing mismatch, freeze escrow | `Open a ticket` | Always |
| 6 | **Account** | `/account` | Profile, verification, addresses, payout methods | `Complete verification` | Signed in |

**Header layout (desktop ≥1280px):**

```
[Silicon Trading]   Marketplace   Sell a Board   Verified Pass   Orders   Support   [ 🔍 Search ]  [ ♡ ]  [ Avatar ▾ ]
                                                                                        ↑ global search opens command palette
```

- **Global search** is a command palette (`⌘K` / `Ctrl K`): searches listings, device models, part numbers, and help articles. It is *not* a full-page input — the Marketplace owns deep search.
- **Avatar menu:** Account, Verification status, Addresses, Payouts, Switch to selling, Sign out.
- **Mobile (<768px):** 5-tab bottom bar — Home · Marketplace · **Sell** (center, elevated) · Orders · Account. Support and Verified Pass live in the top-right menu and Account hub.

**Demo build — role-filtered header:** the static demo shows only the links that
belong to the signed-in role. Guests and buyers see Marketplace · Support ·
Account. Sellers add Sell a Board, Verified Pass, and Orders. Admins add Sell a
Board and Orders. Footer and portal-menu links follow the same rule. Direct URL
access to `sell.html` shows a seller-access gate; buyer `orders.html` stays
reachable after checkout so the post-purchase flow is not interrupted. (The
production gating matrix in §1.3 keeps destinations visible and locks actions
contextually.)

### 1.2 Account state machine

A single account can be **both buyer and seller**; capabilities are unlocked by verification, not by separate signups.

```
GUEST
  └─ sign up (email OTP / Google)
REGISTERED_UNVERIFIED
  ├─ verify email + phone ─────────────► BUYER_ACTIVE        (can buy, cannot list)
  └─ start seller KYC
BUYER_ACTIVE
  ├─ monthly paid volume ≥ ₱15,000 ────► KYC_REQUIRED ──approved──► BUYER_VERIFIED
  └─ seller KYC ──► SELLER_KYC_PENDING
SELLER_KYC_PENDING
  ├─ approved ────────────────────────► SELLER_VERIFIED      (can list, can buy)
  └─ rejected ────────────────────────► SELLER_KYC_REJECTED  (resubmit)
SELLER_VERIFIED
  ├─ buy Verified Pass (single) ──────► VERIFIED_PASS_ACTIVE
  ├─ subscribe Pro Workshop ──────────► PRO_WORKSHOP_ACTIVE  (Pass + 48h support SLA)
  ├─ listing flagged ─────────────────► UNDER_AUDIT
  └─ 3 upheld violations / 90 days ───► BANNED
UNDER_AUDIT
  ├─ cleared ─────────────────────────► SELLER_VERIFIED
  ├─ evidence gap ────────────────────► LISTINGS_PAUSED      (remediate + re-audit)
  └─ misrepresentation upheld ────────► SUSPENDED → BANNED
PRO_WORKSHOP_ACTIVE
  └─ expiry / cancel ─────────────────► SELLER_VERIFIED
```

> `KYC_REQUIRED` blocks **new checkouts only**. Existing orders, shipments, disputes, and DOA claims continue normally. Completing KYC returns the buyer to `BUYER_VERIFIED`; the volume meter keeps counting for transparency but no longer gates.

### 1.3 Navigation gating matrix

| Destination | Guest | Registered | Buyer active | KYC required | Seller pending | Seller verified | Pro Workshop |
|---|---|---|---|---|---|---|---|
| Marketplace | Browse | Browse | Buy | Buy after KYC | Buy | Buy | Buy |
| Sell a Board | Marketing | Marketing | Marketing | Marketing | Dashboard locked | Full | Full + Pro tools |
| Verified Pass | Pricing | Pricing | Pricing | Pricing | Disabled CTA | Purchasable | Manage + upsell |
| Orders | → login | Empty | Full | Full (KYC banner) | Buying tab | Buying + selling | Same |
| Support / Dispute | Help + form | Help + form | Full | Full | Full | Full | **48h resolution SLA** |
| Account | → login | Verify prompt | Full | **Volume meter + KYC CTA** | KYC status | Full + payouts | Full + subscription |

**Gate pattern:** never hide a destination — show it, then intercept the action with a contextual lock card ("Verify your seller account to publish listings — takes ~10 minutes"). Hidden navigation creates support tickets.

### 1.4 Account page anatomy

```
/account
├── Identity        name, avatar, email, phone, business name, taxpayer type
├── Verification    ① Email ② Phone ③ Buyer KYC ④ Seller KYC ⑤ Payout account
├── Volume          ₱11,200 / ₱15,000 paid this month · resets 1 Nov · [ Verify now ]
├── Addresses       default pickup (seller) + default delivery (buyer), barangay-level
├── Payouts         GCash / bank, masked, verified badge, rolling reserve balance
├── Security        sessions, 2FA, password / passkeys
└── Preferences     notifications, language (EN / TL), currency display
```

### 1.5 Demo role portals (implemented)

The demo adds two role-protected surfaces on top of the buyer journey. They share
the same local dataset so an admin decision immediately changes the marketplace,
the seller desk, and the buyer's order view.

| Portal | Route | Demo login | Scope |
|---|---|---|---|
| Buyer | `account.html` | `demo@silicon.trading` | Shopping, orders, KYC, saved parts |
| Seller | `seller-dashboard.html` | `seller@silicon.trading` | Quiapo Silicon Co. only: fulfilment, listings, payouts, views |
| Admin | `admin-dashboard.html` | `admin@silicon.trading` | Platform-wide escrow, disputes, moderation, support, seller KYC |

All demo passwords are `demo1234` and are validated client-side only.

**Session model.** `localStorage["st.session.v1"]` stores
`{ role: buyer | seller | admin, email, name, sellerId }`. Seller records live in
`st.sellers.v1`, separate from the buyer profile. Protected routes render a
contextual gate with a one-click demo sign-in rather than hiding navigation.
Buyer browsing remains open without a session.

**Seller tools.** Net released / in-escrow / reserve / gross KPIs, an attention
queue (ship, frozen escrow, open tickets), order fulfilment with escrow state, a
listing table with `ACTIVE | PAUSED | PENDING | REMOVED` status and pause/resume,
a commission + reserve payout ledger, per-listing view bars, and KYC / payout /
SLA side cards.

**Admin tools.** Platform GMV, held escrow, frozen exposure, and commission KPIs;
a dispute queue with refund, release, and simulated return-scan actions; an
escrow order table; listing moderation (approve pending, pause live, restore);
an SLA-counted support queue; seller KYC approval and suspension; category mix;
and a policy guardrail card.

**Moderation rules.** A listing without a `status` is treated as `ACTIVE`. Only
`ACTIVE` listings appear in the marketplace, home rails, related listings, and
search. `PENDING` and `REMOVED` listings return the listing-not-found state;
`PAUSED` listings stay reachable for a seller preview with a warning banner.
Seller listings published through the demo form go live immediately; the seeded
Davao 12 mini board starts `PENDING` so the admin approval queue is populated.

---

## 2. The Buyer Journey

### Step 1 — Create / Log In

**Goal:** zero-friction entry, then progressive trust.

- Entry points: header `Sign in`, checkout gate, "Save this part", "Message seller".
- Methods: email OTP (default, no password), Google OAuth, optional password.
- Fields: name, mobile (+63, validated), email, optional shop name.
- **Buyer activation requires email + mobile verification only.** Identity KYC is triggered by **cumulative paid volume of ₱15,000 in a calendar month**, never by a single order value.
- Post-signup: return to the exact prior intent (listing, checkout, saved search) — never dump the user on a generic dashboard.
- States: `REGISTERED_UNVERIFIED → BUYER_ACTIVE → KYC_REQUIRED → BUYER_VERIFIED`; mobile banner persists until verified.

**Monthly volume KYC mechanics**

- `BuyerVolumePeriod` row per buyer per `YYYY-MM` (Asia/Manila), incremented on `PAID_ESCROW`, never decremented by refunds.
- Counter check runs **before checkout intent creation**, not at payment, so a buyer is never blocked mid-payment.
- At `≥ ₱15,000`: show the threshold gate with the exact figure, three-step KYC (ID + selfie + address), and "your current order is unaffected" reassurance. Existing orders, returns, and DOA claims remain fully usable.
- Threshold is configurable in `PlatformSetting` (`kyc.monthly_volume_php`, default `15000`) so it can be tuned without a deploy.
- Buyer sees a meter in Account and at checkout: `₱11,200 of ₱15,000 this month`.

**Functional requirements**

- Rate-limited OTP (60s resend, 5 attempts / 15 min).
- Device + session list in Account → Security.
- Guest cart is allowed; cart merges on login.
- Account deletion request path (PH Data Privacy Act compliance), with escrow/dispute/DOA holds retained until resolution.

### Step 2 — Go to Marketplace

**Goal:** browse four inventory families without needing a query.

- **Category tiles:** Donor Boards · Motherboards · ICs · Smartphone Components (display, battery, camera, charging port, flex, housing).
- **Default sort:** relevance blended with Verified Pass boost, then freshness. Never pure "newest" — it buries verified stock.
- **Facets:** category, brand, device model, component type, condition grade, price range, seller tier, location, shipping availability, "Verified Pass only".
- **Card data:** photo, title, condition chip, `Fits:` pills (max 2 + "+3"), price, seller tier badge, escrow shield, save heart.
- **Density toggle:** grid (visual) / list (spec-dense, preferred by technicians).
- **Persistence:** filters live in the URL (`?category=ic&brand=apple&grade=B`) so links are shareable and back-button safe.
- **States:** skeleton, empty ("No parts match — broaden brand or condition"), error with retry, offline banner.

### Step 3 — Search & Check Compatibility

This is the trust engine. Two entry modes, one result model.

**Mode A — "Find parts for my device"**
```
[ Device brand ▾ ] [ Model ▾ ] [ Variant / region ▾ ]
→ returns: compatible listings grouped by category, with fit confidence
```

**Mode B — "Does this part fit?"**
```
[ Part number / IC marking / listing URL ]
→ returns: compatible device list + fit confidence + source of claim
```

**Fit confidence levels (must be visually distinct)**

| Level | Badge | Meaning | Source |
|---|---|---|---|
| Verified fit | ✅ copper shield | Tested in a device by seller, evidence attached | Verified Pass diagnostic |
| Tagged fit | ◐ teal outline | Seller-declared compatibility | Listing compatibility tags |
| Catalog fit | ○ grey | Derived from canonical component catalog | Platform mapping |
| Unknown | ⚠ amber | Insufficient data — buyer must confirm | — |

**Search requirements**

- Normalize part numbers: uppercase, strip spaces/dashes (`A2638` = `a 2638` = `A-2638`); support Apple model numbers, Samsung SM- codes, IC markings (`PMIC 338S00509`), and board silkscreen codes.
- Typo tolerance via `pg_trgm` (similarity ≥ 0.35), plus exact-match boost.
- Device aliases table handles regional variants (e.g., iPhone 13 Pro `A2638` vs `A2483`).
- Results update facets with counts; zero-result state offers "remove brand filter" and "request a part".
- Compatibility result is **shareable** (`/compatibility?device=...`) and embeddable on listing pages.
- Saved searches + "notify me when a compatible board is listed".

**Anti-pattern guards**

- Never show "compatible" without a source. If only catalog-derived, label it.
- Warn on cross-model fits: "Fits 13 Pro; not confirmed for 13 Pro Max."
- Surface known caveats from seller notes (e.g., "True Tone disabled", "no Face ID").

### Step 4 — Review the Listing

**Above the fold (desktop: 7/12 gallery + 5/12 buy box)**

```
┌───────────────────────────────┬──────────────────────────────────┐
│  Photo gallery                │  Condition chip  ·  Verified Pass │
│  [main] [thumb][thumb][thumb] │  iPhone 13 Pro Logic Board       │
│  badges: OEM Pull · Tested    │  ₱4,850.00   [ negotiable? ]      │
│                               │  🛡 Escrow protected              │
│                               │  Fits: 13 Pro (A2638) ✅ verified │
│                               │  Seller: ⭐4.9 · 128 orders ·     │
│                               │          Verified Pass · 2h reply │
│                               │  [ Buy with escrow ]  [ ♡ Save ]  │
│                               │  Ships from Cebu · 2–4 days       │
└───────────────────────────────┴──────────────────────────────────┘
```

**Required content blocks**

1. **Price & fees:** item price, shipping estimate, "seller pays 8% platform commission — no hidden buyer fee".
2. **Condition:** grade (A/B/C/D) + type (New / OEM Pull / Refurbished / Used-Tested / Untested / For Parts) + cosmetic notes. Warranty is no longer seller-defined: every listing carries the **platform-mandated 7-day DOA** badge.
3. **Seller verification:** tier badge, KYC-verified date, completed orders, rating, dispute rate, response time, member since.
4. **Specifications:** brand, device model(s), part number, board revision, IC markings, capacity/color (if relevant), OEM vs aftermarket.
5. **Diagnostics table** (Verified Pass): power-on, boot, charging, display/touch, cameras, Face ID/Touch ID, Wi-Fi/BT, battery health, water damage indicators, serial/IMEI status.
6. **Compatibility panel:** verified/tagged/catalog list with the confidence legend, link to full checker.
7. **Photos:** 4–8 required angles (top, bottom, connectors, markings, diagnostic screen). Zoom, no stock photos, EXIF stripped.
8. **Trust strip:** escrow explainer, **72-hour validation window**, **7-day DOA protection**, "Mismatch? Open a support ticket" link preview.
9. **Evidence pack preview** (Verified Pass): thumbnails of the seller's uploaded test evidence with upload date and audit status — `Spot-audited 12 Oct` or `Evidence on file, not yet audited`.
10. **Seller Q&A** (public, moderated) and **Report listing**.
11. **Sticky mobile buy bar:** price + `Buy with escrow`.

### Step 5 — Place Your Order

**Checkout is a 3-step drawer/page, not a single form.**

```
① Delivery       ② Review & Checklist        ③ Payment
   address           item + fees + escrow       GCash / Maya / card
   courier           Before You Buy (5/5)       → escrow hold
   contact           acknowledgement stored     → order created
```

**Requirements**

- One order per seller (multi-seller cart splits automatically; explain this in the cart).
- **Monthly volume gate:** if the buyer's paid volume this month is already ≥ ₱15,000 and KYC is incomplete, checkout stops before payment with a verification CTA.
- Address: recipient, mobile, region/province/city/barangay, landmark, postal code; save-as-default.
- Courier selection with live rate + ETA; seller may restrict couriers by origin.
- Order summary: subtotal, shipping, **escrow hold amount**, **8% seller commission (min ₱20) shown for transparency**, total. The buyer pays no platform fee.
- **Escrow consent copy:** "Your payment is held in escrow by *[Licensed PSP]*, a BSP-licensed payment provider — not by Silicon Trading. Funds are released to the seller after you validate the part, or automatically **72 hours after delivery**. A **7-day DOA guarantee** applies to every component."
- The **Before You Buy checklist must be 5/5** before the pay button enables (see §4.2).
- Payment via the PSP's hosted checkout (GCash / Maya / card / bank); 30-minute payment window, then cart releases stock.
- Platform creates a **PSP escrow intent** before redirecting; the webhook is the only authority that moves the order to `PAID_ESCROW`. The `psp_escrow_id` is stored on the order and shown in support tooling.
- Idempotency key per checkout attempt; duplicate webhooks are no-ops.
- Buyer can cancel before shipment → PSP refund to source; commission is not charged.

**Order state (entry):** `PENDING_PAYMENT → PAID_ESCROW → AWAITING_SHIPMENT`.

### Step 6 — Track Delivery

`/orders/[id]` is the transaction cockpit.

```
Order #ST-2026-004182        [ Escrow: HELD ₱4,850 ]  [ Get help ]
─────────────────────────────────────────────────────────────────────
● Paid            Oct 25, 10:42
● Seller packed   Oct 25, 16:10
● Picked up       Oct 26, 09:05   J&T · JT8823190045
● In transit      Oct 27, 14:20   Cebu → Manila hub
○ Out for delivery
○ Delivered       expected Oct 28
🛡 7-day DOA protection starts on delivery
─────────────────────────────────────────────────────────────────────
Items · Seller · Shipping address · Payment breakdown · Timeline log
```

- Courier webhook → append-only `shipment_events`; map courier statuses to a normalized enum.
- Show **both** the raw courier status and the platform-normalized status; technicians distrust unexplained state changes.
- Delays: if there is no movement for 3 days, banner "Shipment looks stuck — contact support" + auto-created draft ticket.
- Notifications: in-app, email, SMS at picked-up, out-for-delivery, delivered, 24h before auto-release, and DOA expiry.
- Failed delivery → reschedule flow, 3 attempts, then return-to-seller → refund path.

### Step 7 — Receive & Verify

Delivery scan starts a visible **72-hour validation window** for every seller tier.

```
┌─ Delivered Oct 28, 11:02 ─────────────────── ⏱ 71:59:59 left ─┐
│  Verify your part                                              │
│  □ Board powers on and boots                                   │
│  □ Connectors and mounting points intact                       │
│  □ Part number / serial matches listing                        │
│  □ Documented functions pass (per listing diagnostics)         │
│                                                                │
│  [ Everything matches — release payment ]                      │
│  [ Mismatch? → Open Support Ticket ]                           │
│                                                                │
│  🛡 7-day DOA cover continues after release                    │
└────────────────────────────────────────────────────────────────┘
```

**Requirements**

- Validation checklist is generated from the listing's own diagnostics — not generic.
- Buyer uploads optional evidence (photos/video) when confirming; **required** when disputing.
- `Everything matches` → `COMPLETED`, PSP release job queued (payout T+1 after release).
- `Mismatch?` → `DISPUTED`; PSP escrow frozen immediately; auto-release timer cancelled; SLA clock starts.
- No action by deadline → reminders 24h and 12h before deadline → **auto-release at 72h** with a clear warning; buyer may extend **once by 24h** with a reason (max 96h).
- **The 72h clock is identical for Standard, Verified, and Pro Workshop sellers.** Paid priority never shortens a buyer's validation time.
- Post-release: **7-day DOA claim** remains available until `deliveredAt + 7 days`, even after funds release. The claim is funded by the platform guarantee and recovered from the seller (see §4.1).
- Post-completion: review prompt (rating + "would buy again"), DOA countdown badge, and return-label entry point.
- Seller-side mirror view: "Buyer has 55h left to validate."

---

## 3. The Seller Journey

### Step 1 — Create an Account

- Same identity system as buyers. Seller signup adds: display name / shop name, business type (individual technician, repair shop, refurbisher, scrap trader), city, years in business.
- **No separate password or account.** A user toggles "Selling mode" in the avatar menu; `/sell` becomes their dashboard.
- Onboarding checklist card appears on `/sell`: complete profile → verify identity → add pickup address → add payout → create first listing.
- Collect intent at signup ("I mainly sell: boards / ICs / phone parts") to pre-filter the listing form.

### Step 2 — Verify Your Seller Account

**Listing permissions are locked until verification is approved.**

| Check | Requirement | Automated? |
|---|---|---|
| Email | OTP verified | Yes |
| Mobile | OTP verified | Yes |
| Identity | Government ID (PhilID, driver's license, passport) + selfie holding ID | Manual / vendor KYC |
| Address | Pickup address + proof (utility bill / shop permit) | Manual |
| Payout | GCash or bank account name must match ID | Name-match check |
| Business (optional) | DTI / BIR registration for "Registered Business" badge | Manual |

**UI**

- 4-step wizard with save-and-resume; progress persists.
- Document capture: camera or upload, max 10MB, JPG/PNG/PDF, auto-crop, encrypted private bucket, signed URLs only.
- Status card: `Pending review (SLA 1 business day)` · `Approved` · `Rejected — reason + resubmit`.
- While pending: can draft listings, cannot publish.
- **Policy acceptance is part of KYC:** seller agrees to the evidence-upload standard, random spot audits, the 7-day DOA obligation, the prepaid-return process, and the strike/ban policy. Acceptance is versioned and audited.
- Verification levels displayed publicly: `ID Verified` → `Verified Seller` → `Verified Pass` → `Pro Workshop`.

### Step 3 — Go to Sell a Board

`/sell` dashboard:

```
┌ Overview ──────────────────────────────────────────────────────┐
│ [ + New listing ]              Verification: ✅ Verified seller│
│ Active 12 · Drafts 3 · Sold 84 · This month ₱62,400            │
│ Escrow pending ₱9,700 · Next payout ₱4,105 (Oct 29)            │
├ Listings table ────────────────────────────────────────────────┤
│ Photo │ Title │ Category │ Price │ Views │ Status │ Pass │ ⋯    │
├ Orders needing action ─────────────────────────────────────────┤
│ #ST-… │ 2 items │ PAID → pack & ship │ [Prepare shipment]      │
└────────────────────────────────────────────────────────────────┘
```

- **Listing states:** `DRAFT → PENDING_REVIEW (first listing / flagged) → ACTIVE → PAUSED → SOLD → EXPIRED → REMOVED`.
- Bulk actions: pause, relist, duplicate, apply Verified Pass, export CSV.
- Stock: `quantity` for ICs/repeated parts; serialized `1-of-1` for boards. Quantity > 1 creates per-unit order items but one listing.
- Low-performing listing nudge: "12 views, 0 saves in 7 days — add a diagnostic photo or check price."

### Step 4 — Add Component Details

**Stepper: Category → Device & Compatibility → Specs → Condition → Photos → Pricing & Shipping → Review.**

| Step | Fields | Rules |
|---|---|---|
| Category | Donor board / Motherboard / IC / Smartphone part / Other | Drives the rest of the form |
| Device & compatibility | Brand, model, variant, part number, compatible devices (multi-select) | At least 1 compatibility tag required to publish |
| Specs | OEM part number, board revision, IC markings, capacity/color, OEM vs aftermarket | Part number strongly encouraged; required for Verified Pass |
| Condition | Grade A–D, type, cosmetic notes, functional notes, water damage. **7-day DOA is platform-mandated and not seller-editable**; optional extended warranty may be added | Grade + type mandatory |
| Photos | 4–8 images: top, bottom, connectors, markings, diagnostic screen | Drag-drop, reorder, first = cover, auto-compress, EXIF strip |
| Pricing & shipping | Price, negotiable toggle, quantity, weight, dimensions, origin, couriers, handling time. Live payout preview after 8% (₱20 floor) and 10% reserve | Weight/dims required for live rates |
| Review | Preview exactly as buyers see it + checklist of missing trust signals | Publish / save draft |

**Smart assists:** OCR on photos to suggest part numbers; "copy specs from a previous listing"; duplicate detection ("A similar board is already listed by you — update instead?").

### Step 5 — Verified Pass: Evidence Upload + Spot Audit

**Upsell appears after specs are complete and on the listing review screen — never before the seller has invested effort.**

```
┌─ Get Verified Pass ─ copper ─────────────────────────────────────┐
│ Evidence-backed diagnostics · Compatibility tags · Priority search│
│                                                                  │
│  ○ ₱49   Single board, 30 days                                   │
│  ● ₱399  /month — Pro Workshop: 8 listings + 48h support SLA     │
│          auto-renew, cancel anytime                              │
│                                                                  │
│  Evidence required before activation. Spot audits apply.         │
│  [ Upload evidence & activate ]        Maybe later               │
└──────────────────────────────────────────────────────────────────┘
```

#### Evidence pack (mandatory before a Pass badge renders)

| # | Evidence | Format | Auto-check |
|---|---|---|---|
| 1 | Power-on / boot proof | Photo or 15s video | Device model recognition, screen-on detection |
| 2 | Serial / IMEI / part-number close-up | Photo | OCR must match the listing |
| 3 | Function matrix | Per-function photo/video (display, touch, cameras, Face ID, charging, radios) | Completeness + timestamp |
| 4 | Diagnostic screen | Photo | Battery health / storage parsed where available |
| 5 | Board markings | Macro photo | Silkscreen vs listed revision |

**Automated gates before human review**

- Perceptual hash + EXIF check → reject reused or stock images; reject evidence older than 30 days for a new listing.
- Serial OCR must match listing; mismatch = automatic rejection + audit flag.
- Duplicate detection across the seller's other listings and the platform catalog.
- Seller must be `SELLER_VERIFIED` with a clean strike record; first-time sellers get manual review.

```
┌─ Evidence pack ───────────────────── 4 / 5 ready ─┐
│ ✅ Boot video              0:15 · 12 Oct          │
│ ✅ Serial macro            A2638 · matches listing │
│ ✅ Function matrix         9 / 9 clips            │
│ ✅ Diagnostic screen       battery 89%            │
│ ○  Board markings          required               │
│ [ Submit for review ]      Est. 24h               │
└───────────────────────────────────────────────────┘
```

The public badge copy is **"Tested by seller · evidence on file · spot-audited [date]"** — never "Certified by Silicon Trading" unless ops physically bench-tested the unit.

#### Flag-and-ban spot audit

**Flags that force an audit within 24 hours** (listing boost frozen immediately):

- Buyer mismatch dispute or DOA claim on a Pass listing.
- Compatibility report ("listed as 13 Pro, board is 13").
- Duplicate/reused evidence, serial mismatch, or price anomaly.
- Any "Report listing" submission above the trust threshold.
- Random sample: **10% of Pass listings weekly**, plus every seller's **first 3 Pass listings**.

**Audit outcomes**

| Outcome | Effect |
|---|---|
| **Pass** | Badge shows "Spot-audited [date]"; boost restored; audit logged |
| **Remediate** | 5 business days to upload missing evidence; boost paused; listing stays live but unbadged |
| **Delist** | Listing removed, buyer refunded if sold, pass slot consumed |
| **Strike** | Upheld misrepresentation; pass revoked without refund, payout hold 30 days |
| **Ban** | 3 strikes in 90 days, or any proven fraud (serial swap, fabricated evidence, account farming) → permanent ban, listings removed, payouts held pending claims |

Sellers may appeal once within 7 days; appeals go to a second auditor and the outcome is written to `AuditLog`. Ban decisions are visible in the seller's account with evidence references — no silent bans.

#### Pro Workshop (₱399/month)

- 8 Verified Pass listings per month (unused slots do not accumulate; show `6 / 8 used`).
- **48-hour support resolution guarantee** — the *only* place the 48h metric applies. First response ≤ 4 business hours; resolution ≤ 48h from ticket creation (disputes: ≤ 48h from evidence deadline). Breach issues a service credit (one month, configurable).
- Priority audit queue (24h) and a named ops contact.
- Does **not** shorten the buyer's 72h validation window, does **not** exempt the 8% commission, and does **not** guarantee search rank — it buys evidence review speed, not immunity.

**Billing:** GCash/Maya/card; single pass expires in 30 days; Pro Workshop auto-renews, prorated upgrade, cancel at period end. Pass revoked if a misrepresentation dispute is upheld; refund only if the listing was removed before activation.

### Step 6 — Manage Orders

`/sell/orders` with tabs: **Needs action · To ship · In transit · Awaiting validation · Completed · DOA claims · Disputed · Cancelled**.

Order card shows: buyer masked name, item, amount, **PSP escrow status**, countdown to ship (`Ship within 2 business days`), **buyer validation countdown**, DOA deadline, and required action.

- Accept/decline not needed — paid orders are binding; seller may request cancellation with reason (buyer refunded in full).
- Packing checklist: verify serial against listing, photograph packed item + label (dispute evidence), confirm courier.
- **DOA queue:** claim + buyer evidence + one-tap "accept return" or "contest". Platform generates the prepaid label either way; seller cannot refuse the return.
- SLA breach: late shipment → warning, then order auto-cancellable by buyer, seller reliability score drops, pass eligibility reviewed.

### Step 7 — Ship & Complete

```
Prepare shipment
  ├─ Package weight/dims prefilled from listing
  ├─ Choose courier → live rate → book pickup or drop-off
  ├─ Print/download label (PDF/A6)
  ├─ Enter tracking (auto-filled by courier API)
  └─ Mark as shipped → buyer notified

In transit → delivered → buyer validates (72h)
  └─ PSP releases escrow → seller payable → payout T+1/T+2
      └─ 10% rolling reserve held 14 days (DOA cover)

DOA claim (within 7 days of delivery)
  ├─ Platform issues prepaid return label
  ├─ Courier pickup → tracking → seller receives
  └─ Refund released on first return scan; recovered from reserve/payout
```

- Courier booking API creates shipment + label; webhook drives status. Manual tracking entry is a fallback with proof-of-shipment photo.
- **Funds release only after:** delivered + buyer validates, **or 72h auto-release** with no dispute, **or** support ruling. The clock is 72h for every tier.
- Payout ledger: `pending → available → paid`; payout batch daily at 15:00; minimum ₱100; fees disclosed pre-confirmation. `available = released − 10% rolling reserve`.
- **Rolling reserve:** 10% of each released order is held 14 days to fund post-release DOA claims (waived after 90 days clean history, at ops discretion). Reserve balance is visible in Account → Payouts.
- **DOA obligation:** seller must accept the platform-generated return; refusal or non-receipt within 7 days triggers automatic refund and a strike. If the claim is upheld, return shipping is deducted from the seller; if not upheld, the platform absorbs it.
- Seller protection: if courier marks delivered but buyer claims non-receipt, support reviews proof-of-delivery + packing photos; escrow stays frozen until ruling. A seller may contest a DOA claim with bench-test evidence within 72h of receiving the return.
- Completion screen: earnings breakdown (item, 8% commission/min ₱20, pass, payout fee, reserve) + review of buyer + "relist similar".

---

## 4. Trust & Trustee Infrastructure

### 4.1 Protected Transaction — escrow architecture

**Principle:** Silicon Trading is the **trustee-orchestrator**, not the custodian. Money is held inside a **BSP-licensed PSP escrow product**. The platform only issues release/refund instructions; the PSP executes them. Platform state is a mirror, and the PSP webhook — never a browser redirect — is the source of truth.

```
Buyer ──► PSP hosted checkout ──► Licensed escrow account (PSP)
              │ signed webhook                 ▲
              ▼                                │ release / refund instruction
     Silicon Trading orchestrator ─────────────┘
     order state · fee snapshot · ledger mirror · BullMQ clocks
              │
              └──► payout rail (GCash / bank) ──► Seller
```

#### PSP integration contract

| Concern | Design |
|---|---|
| Provider | BSP-licensed PSP with a contractual escrow product (shortlist: Xendit, PayMongo, Maya Business). Confirm escrow custody, split, partial refund, and payout APIs in the contract **before** build. |
| Adapter | `EscrowProvider` interface: `createIntent()`, `hold()`, `release()`, `refund()`, `partialRefund()`, `getStatus()`, `verifyWebhook()`. One adapter per provider; the rest of the app never calls a PSP SDK directly. |
| Money custody | Client funds never touch a Silicon Trading bank account. Ledger account is `PSP_ESCROW`, not `ESCROW_HELD`. |
| Webhooks | Signature + timestamp verification (5-minute tolerance), replay protection, raw payload stored, idempotency on `psp_event_id`. Handles `escrow.created`, `payment.succeeded`, `escrow.held`, `escrow.released`, `escrow.refunded`, `payout.paid`, `payout.failed`. |
| Order authority | Redirect return is UX only. Only `payment.succeeded` moves `PENDING_PAYMENT → PAID_ESCROW`. |
| Failure handling | PSP timeout → stay `PENDING_PAYMENT`, retry with backoff. Release failure → retry 3× then ops alert; **order never leaves `RELEASING` until the PSP confirms**. |
| Reconciliation | Daily PSP settlement file vs `ledger_entries`; unmatched rows open an ops case and block that seller's payout batch. |
| Idempotency | `escrow.release:{order_id}:{release_version}` — a retried or duplicate instruction cannot pay twice. |
| Compliance | PSP onboarding/KYC of the platform, disclosure of the 8% commission and 7-day DOA in checkout, and retention of consent + acknowledgement records. |

**Integration sequence**

```
1. GET  /checkout/eligibility        → monthly volume + KYC decision
2. POST /orders                      → order + fee snapshot (8% / ₱20 floor)
3. POST escrow.createIntent()        → { pspEscrowId, checkoutUrl }
4. Buyer completes hosted checkout
5. POST /webhooks/escrow             → payment.succeeded (signed)
   └─ order: PAID_ESCROW · escrow: HELD · ledger: BUYER → PSP_ESCROW
6. Seller ships → courier webhook    → IN_TRANSIT
7. Delivered                          → deliveredAt, validationEndsAt = +72h, doaEndsAt = +7d
8a. Buyer validates                  → release(pspEscrowId, releaseVersion)
8b. 72h elapses                      → same release job (idempotent)
    └─ PSP: RELEASED · ledger: PSP_ESCROW → SELLER_PAYABLE + PLATFORM_FEE + SELLER_RESERVE
9. Payout batch T+1                  → PSP payout rail → PAID
10. DOA upheld                       → platform-funded refund + return label; recover from reserve/payout
   └─ escrow is already settled; DOA is a guarantee claim, not an escrow reversal
```

**State mapping**

| Platform order | Escrow | PSP status (normalized) | Trigger |
|---|---|---|---|
| `PENDING_PAYMENT` | `PENDING` | `awaiting_payment` | Intent created |
| `PAID_ESCROW` | `HELD` | `held` | `payment.succeeded` |
| `AWAITING_SHIPMENT` / `IN_TRANSIT` | `HELD` | `held` | Courier events |
| `DELIVERED` | `HELD` | `held` | Delivery scan |
| `COMPLETED` | `RELEASING → RELEASED` | `release_pending → released` | Validate or 72h |
| `DISPUTED` | `FROZEN` | `held` (dispute flag) | Mismatch claim |
| `REFUNDED` | `REFUNDED` | `refunded` | Ruling / DOA |
| `COMPLETED` + `doaStatus=CLAIMED` | `RELEASED` | `released` | Post-release DOA (platform-funded) |

```ts
// Provider-agnostic boundary — the app never imports a PSP SDK directly.
interface EscrowProvider {
  createIntent(input: {
    orderId: string;
    amount: number;          // centavos
    currency: "PHP";
    buyer: { id: string; email: string; name: string };
    seller: { id: string; name: string };
    metadata: { orderNumber: string; commission: number; reserve: number };
    idempotencyKey: string;  // checkout:{orderId}:{attempt}
  }): Promise<{ escrowId: string; checkoutUrl: string }>;

  release(input: {
    escrowId: string;
    amount: number;
    idempotencyKey: string;  // release:{orderId}:{releaseVersion}
  }): Promise<{ status: "PENDING" | "RELEASED" | "FAILED"; providerRef: string }>;

  refund(input: {
    escrowId: string;
    amount?: number;         // omit for full refund
    reason: string;
    idempotencyKey: string;
  }): Promise<{ status: "PENDING" | "REFUNDED" | "FAILED"; providerRef: string }>;

  getStatus(escrowId: string): Promise<{ status: string; raw: unknown }>;

  verifyWebhook(rawBody: Buffer, signature: string, timestamp: string): boolean;
}
```

**Webhook handler rules**

1. Verify signature **before** parsing JSON; reject stale timestamps beyond 5 minutes.
2. Insert `(provider, event_id)` into `PspWebhookEvent`; a duplicate returns `200` and does nothing.
3. Apply state transitions inside one transaction (order + escrow + ledger + audit).
4. Never trust amount or status from the client redirect; read it from the PSP response.
5. Return `2xx` only after the transaction commits; otherwise the PSP retries.
6. Alert if the same `escrowId` reports contradictory terminal states; freeze and reconcile.

#### Escrow + DOA state machine

```
PENDING_PAYMENT ─paid─► HELD ─ship─► IN_TRANSIT ─delivered─► VALIDATION (72h)
      │                  │               │                      │
   expired             cancel        failed/returned            ├─ validate ──► RELEASED ──T+1──► PAID_OUT
      ▼                  ▼               ▼                      ├─ 72h timeout ► RELEASED (auto)
  CANCELLED          REFUNDED      RETURN_TO_SELLER             └─ mismatch ───► DISPUTED (FROZEN)
                                                                                    │
RELEASED ──DOA claim ≤7d──► DOA_CLAIM ──upheld──► DOA_REFUNDED (platform) ◄──────┘
                                └─ rejected ──► CLOSED (reserve returned to seller)
```

#### 72-hour auto-release clock (all tiers)

- Starts at the **first `DELIVERED` courier scan**; if the scan is missing but the buyer confirms receipt, it starts at confirmation. Stored in UTC, displayed in Asia/Manila.
- One order-level clock (not per item). **Identical for Standard, Verified, and Pro Workshop sellers.**
- Reminders at T+24 and T+60 (24h and 12h remaining); the final warning names the exact release time.
- Auto-release job is a BullMQ delayed job keyed `release:{order_id}`; the dispute freeze removes it inside the same transaction and writes an audit entry.
- Buyer may extend **once by 24h** with a reason; Pro Workshop does not get a shorter clock, and no seller tier can shorten it.
- The clock pauses if the courier reports an exception (returned to sender, held at customs) or the platform opens a non-receipt investigation.

#### Fee computation (8%, ₱20 floor)

```
subtotal     = Σ order_items.line_total          (shipping excluded)
commission   = max(round(subtotal × 0.08, 2), 20.00)
seller_payable = subtotal − commission
reserve      = round(seller_payable × 0.10, 2)   (held 14 days)
payout_now   = seller_payable − reserve − payout_fee
```

The floor applies **once per seller-order**, not per item. Break-even is ₱250 (below that, the ₱20 floor exceeds 8%). The snapshot (`commission_rate`, `commission_amount`, `floor_applied`) is immutable and shown in the seller's earnings breakdown.

#### Platform-mandated 7-day DOA

Starts at the delivery scan and runs **7 calendar days**, independently of the 72h validation window. A DOA claim is allowed even after escrow has released to the seller.

| Covered | Excluded |
|---|---|
| Dead on arrival, no power/boot | Impact or crush damage after delivery |
| Failure of any function the listing claimed working | Buyer-caused damage after delivery |
| Undisclosed damage, missing components, or undisclosed liquid ingress | Improper installation, soldering, or repair attempts |
| Serial/part number mismatch with the listing | Tampering with warranty seals or serial labels |
| Item materially different from photos/specs | Incompatibility where fit was explicitly marked "Unknown" |

**Remedy:** buyer chooses replacement (same or functionally equivalent, subject to stock) or full refund. If no replacement is available within 7 days, refund is automatic.

**Funding:** post-release DOA refunds are **platform-funded guarantee claims, not PSP escrow reversals** — the escrow legally settled at 72h. They are paid from the **10% rolling reserve** and, if insufficient, the platform DOA guarantee fund. The platform recovers from the seller's future payouts (offset), reserve, or negative balance. A seller with a negative balance is suspended from new listings until settled. This is why the 72h release does not leave the buyer unprotected.

**DOA flow**

```
Buyer claim (≤7d) + evidence
  → auto-triage: prepaid label issued immediately, seller notified
  → courier first scan → refund released (buyer-protective)
  → seller receives, may contest within 72h
      ├─ contest upheld → platform absorbs cost, item returned to buyer
      └─ claim stands  → reserve/payout offset; strike if misrepresentation
```

Only **one active claim per order** (validation dispute or DOA, not both). A validation-window mismatch freezes escrow; a post-release issue uses the DOA path.

#### Platform-generated return label

- Created through the courier's **reverse-pickup API** the moment a DOA or upheld mismatch is approved. The seller never generates or pays for the label upfront.
- Prepaid by the platform, QR/label PDF in the buyer's order page; pickup or drop-off selectable; one free reschedule; label expires in 7 days.
- Buyer is not asked to pay, and the refund is not contingent on the seller accepting the parcel.
- **Refund trigger:** first carrier scan of the return (platform bears transit risk). High-value returns (≥ ₱15,000) may be configured to refund on seller receipt.
- Seller refusal, wrong address, or failure to accept within 7 days → automatic refund + strike.
- If the claim is rejected, the platform absorbs the return cost and the item is returned to the buyer.

```
RETURN_REQUESTED → LABEL_ISSUED → PICKUP_SCHEDULED → IN_TRANSIT → RECEIVED → REFUNDED
                        │                │                │
                     expired          missed pickup    failed delivery
                        ▼                ▼                ▼
                   REISSUED          RESCHEDULED      RETURN_TO_BUYER
```

#### Dispute lifecycle & support SLA

```
OPEN → TRIAGE (24h) → EVIDENCE (buyer + seller, 72h) → UNDER_REVIEW → RESOLVED
                                                                    ├─ Full refund
                                                                    ├─ Partial refund
                                                                    ├─ Replacement
                                                                    └─ Release to seller
→ APPEALED (once, 7 days) → CLOSED
```

| Tier | First response | Resolution guarantee | Breach remedy |
|---|---|---|---|
| Standard | 24 business hours | 72h | — |
| **Pro Workshop** | **4 business hours** | **48h** | One month service credit |

The resolution clock pauses only while the platform is waiting on buyer/seller evidence. **48h is never used as a delivery, validation, or escrow metric** — it belongs exclusively to the Pro Workshop support promise.

Evidence types: photos, video, serial close-ups, courier POD, chat logs, diagnostic screenshots. The support console shows both parties' evidence side-by-side with listing snapshots and the immutable Before You Buy acknowledgement.

### 4.2 "Before You Buy" Checklist

**Purpose:** force explicit acknowledgement of the five risk checks and create dispute-grade evidence that the buyer was informed.

**Placement**

- Persistent **sticky summary** on listing detail ("4 of 5 checks available") that expands into the full widget.
- **Mandatory** expanded state on the checkout review step; pay button disabled until 5/5.
- Never a modal that can be dismissed without action; collapsing is allowed, skipping is not.

**Anatomy**

```
┌─ Before You Buy ─────────────────────────────── 3 / 5 ─┐
│ ✅ 1. Compatibility checked                            │
│      Fits iPhone 13 Pro (A2638) — verified fit         │
│ ✅ 2. Component condition reviewed                     │
│      Grade B · OEM pull · True Tone disabled           │
│ ○  3. Seller verification checked                      │
│      Verified Pass · ID verified Jan 2026 · ⭐4.9       │
│ ○  4. Transaction details reviewed                     │
│      ₱4,850 + ₱180 shipping · PSP escrow · 7-day DOA   │
│ ○  5. Delivery information confirmed                   │
│      Manila · J&T · 2–4 days                           │
│                                                        │
│ [ ] I confirm I reviewed the five checks above         │
│      ── 2 items need your confirmation ──              │
└────────────────────────────────────────────────────────┘
```

**Item logic**

| # | Check | Auto-verified when | Buyer confirms when |
|---|---|---|---|
| 1 | Compatibility | Listing has a verified/tagged fit for the selected device | No fit data → must open compatibility checker |
| 2 | Condition | Photos + grade + notes present (always) | Buyer ticks "I reviewed condition photos and notes" |
| 3 | Seller verification | Seller is KYC-verified (badge rendered) | Buyer ticks "I reviewed seller tier and history" |
| 4 | Transaction details | Price, shipping, escrow amount computed | Buyer ticks "I reviewed fees and escrow terms" |
| 5 | Delivery info | Address valid + courier + ETA available | Buyer ticks "Delivery address is correct" |

**Data captured per acknowledgement**

`checkout_acknowledgements`: `order_id`, `checklist_version`, `items JSONB` (id, state, timestamp), `listing_snapshot_hash`, `user_agent`, `ip`, `created_at`.

**Copy standards**

- Item 2 must link directly to the photo gallery and condition notes.
- Item 3 must show *why* the seller is trusted (tier, date, order count), not just a badge.
- If any check fails (e.g., no compatibility data), the widget turns amber and links to the fix — it does not silently pass.
- Acknowledgement is immutable and shown in the dispute console.

### 4.3 Trust surface inventory

| Surface | Element | Appears on |
|---|---|---|
| Escrow shield | "Held by [Licensed PSP] — released after you verify" | Card, PDP, checkout, order |
| Verification badge | ID Verified / Verified Seller / Verified Pass / Pro Workshop | Seller card, PDP, search card |
| Evidence badge | "Evidence on file · Spot-audited [date]" | PDP (Pass), seller profile |
| Fit confidence | Verified / Tagged / Catalog / Unknown | PDP, compatibility results |
| Condition chip | Grade + type, color-coded | Card, PDP, order |
| Diagnostics table | Function-by-function results + evidence | PDP (Pass), order |
| Validation clock | "72 hours to validate — every order" | PDP, checkout, order |
| DOA shield | "7-day DOA protection" + deadline | PDP, checkout, order, claim page |
| Return label | "Prepaid return label — no cost to you" | DOA claim, order |
| Support SLA | "48h resolution — Pro Workshop" | Ticket, support header |
| Timeline | Timestamped, actor-attributed events | Order page |
| Dispute CTA | "Mismatch? Open a support ticket" | Validation window, order |
| Reliability stats | Completed orders, dispute rate, response time, member since | Seller profile |
| Evidence pack | Packing photos, serial match, POD, return scan | Dispute console |

---

## 5. Database Schema

### 5.1 Roles & RBAC

A user has **one identity** and **capability rows**. `users.primary_role` is a UI hint only; authorization always checks capabilities/roles.

```prisma
enum Role           { BUYER SELLER SUPPORT ADMIN }
enum SellerTier     { STANDARD VERIFIED VERIFIED_PASS PRO_WORKSHOP }
enum KycStatus      { NOT_STARTED PENDING APPROVED REJECTED }
enum AuditOutcome   { PASS REMEDIATE DELIST STRIKE BAN }
enum DoaStatus      { NONE CLAIMED RETURN_IN_TRANSIT RECEIVED UPHELD REJECTED }
```

| Capability | Buyer | Seller | Verified Pass | Pro Workshop | Support | Admin |
|---|---|---|---|---|---|---|
| Browse / search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Place order | ✅ | ✅ | ✅ | ✅ | — | — |
| Create listing | — | ✅ | ✅ | ✅ | — | — |
| Buy / manage Pass | — | ✅ | ✅ | ✅ | — | — |
| View own orders | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Release escrow | ✅ (validate) | — | — | — | via ruling | via ruling |
| Open dispute / DOA claim | ✅ | ✅ (counter) | ✅ | ✅ | — | — |
| 48h support SLA | — | — | — | ✅ | — | — |
| Review audits / KYC | — | — | — | — | ✅ | ✅ |
| Issue strikes / ban | — | — | — | — | — | ✅ |
| Edit fees / settings | — | — | — | — | — | ✅ |

### 5.2 Prisma schema (core)

```prisma
// ───────── Identity ─────────
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  emailVerifiedAt   DateTime?
  phone             String?  @unique
  phoneVerifiedAt   DateTime?
  passwordHash      String?
  displayName       String
  avatarUrl         String?
  primaryRole       Role     @default(BUYER)
  status            String   @default("ACTIVE") // ACTIVE | SUSPENDED | BANNED | DELETED
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  roles             UserRole[]
  buyerProfile      BuyerProfile?
  sellerProfile     SellerProfile?
  addresses         Address[]
  listings          Listing[]
  buyerOrders       Order[]  @relation("buyer")
  sellerOrders      Order[]  @relation("seller")
  reviewsWritten    Review[] @relation("author")
  reviewsReceived   Review[] @relation("subject")
  notifications     Notification[]
}

model UserRole {
  id        String   @id @default(cuid())
  userId    String
  role      Role
  grantedAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  @@unique([userId, role])
}

model BuyerProfile {
  userId              String  @id
  shopName            String?
  defaultAddressId    String?
  kycStatus           KycStatus @default(NOT_STARTED)
  kycVerifiedAt       DateTime?
  completedOrders     Int     @default(0)
  user                User    @relation(fields: [userId], references: [id])
  volumePeriods       BuyerVolumePeriod[]
}

// ₱15,000 cumulative monthly KYC threshold — one row per buyer per YYYY-MM (Asia/Manila)
model BuyerVolumePeriod {
  id              String  @id @default(cuid())
  buyerId         String
  period          String  // "2026-10"
  paidVolume      Decimal @default(0) @db.Decimal(12,2) // gross of refunds
  paidOrders      Int     @default(0)
  kycTriggeredAt  DateTime?
  buyer           BuyerProfile @relation(fields: [buyerId], references: [userId])
  @@unique([buyerId, period])
  @@index([period])
}

model SellerProfile {
  userId              String  @id
  shopName            String
  slug                String  @unique
  businessType        String  // INDIVIDUAL | REPAIR_SHOP | REFURBISHER | SCRAP_TRADER
  bio                 String?
  city                String?
  tier                SellerTier @default(STANDARD)
  kycStatus           KycStatus  @default(NOT_STARTED)
  verifiedAt          DateTime?
  proWorkshopUntil    DateTime?
  strikes             Int     @default(0)   // rolling 90 days
  strikeWindowStart   DateTime?
  bannedAt            DateTime?
  banReason           String?
  payoutMethod        String?   // GCASH | BANK
  payoutAccountMasked String?
  rollingReservePct   Decimal @default(10) @db.Decimal(5,2)
  negativeBalance     Decimal @default(0) @db.Decimal(12,2)
  ratingAvg           Decimal @default(0) @db.Decimal(3,2)
  ratingCount         Int     @default(0)
  completedOrders     Int     @default(0)
  disputeRate         Decimal @default(0) @db.Decimal(5,2)
  responseMinutes     Int?
  shipsWithinDays     Int     @default(2)
  user                User    @relation(fields: [userId], references: [id])
}

model SellerVerification {
  id              String   @id @default(cuid())
  userId          String
  idType          String
  idNumberMasked  String?
  idDocUrl        String   // private bucket key
  selfieUrl       String
  proofOfAddressUrl String?
  businessPermitUrl String?
  status          KycStatus @default(PENDING)
  rejectionReason String?
  reviewedById    String?
  reviewedAt      DateTime?
  createdAt       DateTime @default(now())
  @@index([userId, status])
}

model Address {
  id          String  @id @default(cuid())
  userId      String
  label       String?
  recipient   String
  phone       String
  region      String
  province    String
  city        String
  barangay    String
  line1       String
  line2       String?
  postalCode  String?
  isDefault   Boolean @default(false)
  user        User    @relation(fields: [userId], references: [id])
  @@index([userId])
}

// ───────── Catalog & compatibility ─────────
model Brand {
  id       String  @id @default(cuid())
  name     String  @unique
  models   DeviceModel[]
}

model DeviceModel {
  id           String  @id @default(cuid())
  brandId      String
  name         String   // "iPhone 13 Pro"
  releaseYear  Int?
  aliases      String[] // ["A2638","A2483"]
  brand        Brand    @relation(fields: [brandId], references: [id])
  compat       ListingCompatibility[]
  @@index([brandId])
  @@index([name])
}

model Component {
  id              String  @id @default(cuid())
  category        String  // DONOR_BOARD | MOTHERBOARD | IC | SMARTPHONE_PART | OTHER
  oemPartNumber   String?
  canonicalName   String
  attributes      Json?   // chipset, capacity, color, etc.
  listings        Listing[]
  @@index([category])
  @@index([oemPartNumber])
}

model Listing {
  id                String   @id @default(cuid())
  sellerId          String
  componentId       String?
  category          String
  title             String
  slug              String   @unique
  description       String
  price             Decimal  @db.Decimal(12,2)
  negotiable        Boolean  @default(false)
  quantity          Int      @default(1)
  conditionType     String   // NEW | OEM_PULL | REFURBISHED | USED_TESTED | UNTESTED | FOR_PARTS
  conditionGrade    String   // A | B | C | D
  cosmeticNotes     String?
  functionalNotes   String?
  waterDamage       Boolean  @default(false)
  warrantyDays      Int      @default(7)   // platform-mandated DOA; not seller-editable
  evidenceStatus    String   @default("NONE") // NONE | PENDING | ON_FILE | AUDITED | REJECTED
  lastAuditedAt     DateTime?
  boostFrozenAt     DateTime?
  partNumber        String?
  boardRevision     String?
  icMarkings        String?
  isOem             Boolean  @default(true)
  weightGrams       Int?
  dimsCm            String?
  originCity        String
  courierOptions    String[]
  handlingDays      Int      @default(2)
  status            String   @default("DRAFT") // DRAFT|PENDING_REVIEW|ACTIVE|PAUSED|SOLD|EXPIRED|REMOVED
  isVerifiedPass    Boolean  @default(false)
  passExpiresAt     DateTime?
  diagnostics       Json?    // { powerOn: true, boot: true, faceId: false, ... }
  views             Int      @default(0)
  publishedAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  seller            SellerProfile @relation(fields: [sellerId], references: [userId])
  component         Component?    @relation(fields: [componentId], references: [id])
  photos            ListingPhoto[]
  compatibility     ListingCompatibility[]
  evidence          SellerEvidence[]
  audits            ListingAudit[]
  orderItems        OrderItem[]
  savedBy           SavedListing[]
  passPurchases     VerifiedPassPurchase[]
  @@index([status, category, price])
  @@index([sellerId, status])
  @@index([isVerifiedPass, status, boostFrozenAt])
}

model ListingPhoto {
  id         String  @id @default(cuid())
  listingId  String
  url        String
  position   Int
  kind       String  // TOP | BOTTOM | CONNECTOR | MARKING | DIAGNOSTIC | PACKED
  listing    Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  @@index([listingId, position])
}

model ListingCompatibility {
  id            String  @id @default(cuid())
  listingId     String
  deviceModelId String
  fitLevel      String  // VERIFIED | TAGGED | CATALOG | UNKNOWN
  evidenceUrl   String?
  notes         String?
  listing       Listing     @relation(fields: [listingId], references: [id], onDelete: Cascade)
  deviceModel   DeviceModel @relation(fields: [deviceModelId], references: [id])
  @@unique([listingId, deviceModelId])
  @@index([deviceModelId, fitLevel])
}

model SellerEvidence {
  id              String   @id @default(cuid())
  listingId       String
  type            String   // BOOT | SERIAL | FUNCTION | DIAGNOSTIC | MARKING
  url             String
  sha256          String?  // duplicate / reuse detection
  capturedAt      DateTime?
  status          String   @default("PENDING") // PENDING | ACCEPTED | REJECTED
  rejectionReason String?
  reviewedById    String?
  reviewedAt      DateTime?
  createdAt       DateTime @default(now())
  listing         Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  @@index([listingId, type])
}

model ListingAudit {
  id          String   @id @default(cuid())
  listingId   String
  sellerId    String
  trigger     String   // BUYER_DISPUTE | DOA | REPORT | RANDOM_10PCT | FIRST_3 | DUPLICATE | PRICE_ANOMALY
  status      String   @default("OPEN") // OPEN | IN_REVIEW | RESOLVED
  outcome     AuditOutcome?
  notes       String?
  auditorId   String?
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
  listing     Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  @@index([status, createdAt])
  @@index([listingId])
}

model UserSanction {
  id            String   @id @default(cuid())
  userId        String
  type          String   // WARNING | STRIKE | SUSPENSION | BAN
  reason        String
  evidenceUrl   String?
  auditId       String?
  effectiveAt   DateTime @default(now())
  expiresAt     DateTime?
  appealStatus  String?  // NONE | OPEN | UPHELD | OVERTURNED
  createdById   String?
  @@index([userId, effectiveAt])
}

model SavedListing {
  userId    String
  listingId String
  createdAt DateTime @default(now())
  @@id([userId, listingId])
}

// ───────── Orders & escrow ─────────
model Order {
  id                String   @id @default(cuid())
  orderNumber       String   @unique  // ST-2026-004182
  buyerId           String
  sellerId          String
  status            String   @default("PENDING_PAYMENT")
  subtotal          Decimal  @db.Decimal(12,2)
  shippingFee       Decimal  @db.Decimal(12,2) @default(0)
  commissionRate    Decimal  @default(0.08) @db.Decimal(5,4)  // snapshot
  commissionAmount  Decimal  @db.Decimal(12,2)               // 8% or ₱20 floor
  commissionFloorApplied Boolean @default(false)
  reserveAmount     Decimal  @db.Decimal(12,2) @default(0)   // 10% held 14d
  total             Decimal  @db.Decimal(12,2)
  currency          String   @default("PHP")
  courier           String?
  trackingNumber    String?
  shipByAt          DateTime?
  deliveredAt       DateTime?
  validationEndsAt  DateTime?  // deliveredAt + 72h
  autoReleaseAt     DateTime?  // same instant; kept explicit for the sweeper
  doaEndsAt         DateTime?  // deliveredAt + 7 days
  doaStatus         DoaStatus  @default(NONE)
  extensionUsed     Boolean  @default(false)
  completedAt       DateTime?
  cancelledAt       DateTime?
  cancelReason      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  buyer             User     @relation("buyer", fields: [buyerId], references: [id])
  seller            User     @relation("seller", fields: [sellerId], references: [id])
  items             OrderItem[]
  shipment          Shipment?
  escrow            EscrowTransaction?
  acknowledgement   CheckoutAcknowledgement?
  dispute           Dispute?
  doaClaim          DoaClaim?
  returnShipment    ReturnShipment?
  review            Review?
  @@index([buyerId, status])
  @@index([sellerId, status])
  @@index([status, autoReleaseAt])
}

model OrderItem {
  id             String  @id @default(cuid())
  orderId        String
  listingId      String
  titleSnapshot  String
  conditionSnapshot Json
  unitPrice      Decimal @db.Decimal(12,2)
  quantity       Int     @default(1)
  lineTotal      Decimal @db.Decimal(12,2)
  order          Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  listing        Listing @relation(fields: [listingId], references: [id])
  @@index([orderId])
}

model CheckoutAcknowledgement {
  id                  String   @id @default(cuid())
  orderId             String   @unique
  checklistVersion    String
  items               Json     // [{id, state, confirmedAt}]
  listingSnapshotHash String
  ip                  String?
  userAgent           String?
  createdAt           DateTime @default(now())
  order               Order    @relation(fields: [orderId], references: [id])
}

model EscrowTransaction {
  id               String   @id @default(cuid())
  orderId          String   @unique
  amount           Decimal  @db.Decimal(12,2)
  platformFee      Decimal  @db.Decimal(12,2)
  processingFee    Decimal  @db.Decimal(12,2) @default(0)
  status           String   @default("PENDING") // PENDING|HELD|FROZEN|RELEASING|RELEASED|DOA_CLAIM|REFUNDED|PARTIAL_REFUND
  provider         String   // XENDIT | PAYMONGO | MAYA — licensed escrow API
  pspEscrowId      String?  @unique
  pspStatus        String?  // raw provider status, mirrored
  providerRef      String?
  releaseVersion   Int      @default(1) // bumped on extension; guards idempotent release
  reserveAmount    Decimal  @default(0) @db.Decimal(12,2)
  heldAt           DateTime?
  autoReleaseAt    DateTime?
  releasedAt       DateTime?
  refundedAt       DateTime?
  releasedAmount   Decimal? @db.Decimal(12,2)
  refundedAmount   Decimal? @db.Decimal(12,2)
  order            Order    @relation(fields: [orderId], references: [id])
  @@index([status, autoReleaseAt])
  @@index([pspStatus])
}

model LedgerEntry {
  id             String   @id @default(cuid())
  orderId        String?
  account        String   // BUYER | PSP_ESCROW | SELLER_PAYABLE | SELLER_RESERVE | PLATFORM_FEE | DOA_FUND | PSP_CLEARING
  direction      String   // DEBIT | CREDIT
  amount         Decimal  @db.Decimal(12,2)
  idempotencyKey String   @unique
  memo           String?
  createdAt      DateTime @default(now())
  @@index([orderId])
  @@index([account, createdAt])
}

model PspWebhookEvent {
  id          String   @id @default(cuid())
  provider    String   // XENDIT | PAYMONGO | MAYA
  eventId     String
  type        String
  payload     Json
  signatureOk Boolean  @default(false)
  processedAt DateTime?
  createdAt   DateTime @default(now())
  @@unique([provider, eventId])
  @@index([processedAt])
}

model Payout {
  id            String   @id @default(cuid())
  sellerId      String
  amount        Decimal  @db.Decimal(12,2)
  fee           Decimal  @db.Decimal(12,2) @default(0)
  method        String
  accountMasked String
  status        String   @default("PENDING") // PENDING|PROCESSING|PAID|FAILED
  providerRef   String?
  periodStart   DateTime?
  periodEnd     DateTime?
  paidAt        DateTime?
  reserveHeld   Decimal  @default(0) @db.Decimal(12,2)
  createdAt     DateTime @default(now())
  @@index([sellerId, status])
}

model ReserveHold {
  id          String   @id @default(cuid())
  orderId     String   @unique
  sellerId    String
  amount      Decimal  @db.Decimal(12,2)
  status      String   @default("HELD") // HELD | RELEASED | APPLIED
  releaseAt   DateTime
  releasedAt  DateTime?
  appliedClaimId String?
  createdAt   DateTime @default(now())
  @@index([sellerId, status])
  @@index([status, releaseAt])
}

// ───────── DOA & returns ─────────
model DoaClaim {
  id                String   @id @default(cuid())
  orderId           String   @unique
  buyerId           String
  reason            String   // DEAD | FUNCTION_FAIL | UNDISCLOSED_DAMAGE | SERIAL_MISMATCH | OTHER
  description       String
  status            String   @default("CLAIMED") // CLAIMED|LABEL_ISSUED|IN_TRANSIT|RECEIVED|UPHELD|REJECTED|CLOSED
  remedy            String   @default("REFUND")  // REFUND | REPLACEMENT
  refundAmount      Decimal? @db.Decimal(12,2)
  evidence          Json?    // buyer photos/video, serial, packaging
  sellerResponse    String?
  sellerRespondedAt DateTime?
  resolvedById      String?
  resolvedAt        DateTime?
  createdAt         DateTime @default(now())
  order             Order    @relation(fields: [orderId], references: [id])
  returnShipment    ReturnShipment?
  @@index([status, createdAt])
}

model ReturnShipment {
  id               String   @id @default(cuid())
  orderId          String   @unique
  doaClaimId       String?  @unique
  courier          String
  trackingNumber   String?
  labelUrl         String?
  status           String   @default("REQUESTED") // REQUESTED|LABEL_ISSUED|PICKUP_SCHEDULED|IN_TRANSIT|RECEIVED|RETURNED_TO_BUYER|CANCELLED
  costBearer       String   @default("PLATFORM") // PLATFORM | SELLER (on upheld claim)
  labelIssuedAt    DateTime?
  firstScanAt      DateTime?
  receivedAt       DateTime?
  refundReleasedAt DateTime?
  events           Json?
  order            Order    @relation(fields: [orderId], references: [id])
  doaClaim         DoaClaim? @relation(fields: [doaClaimId], references: [id])
  @@index([status, createdAt])
}

// ───────── Fulfilment ─────────
model Shipment {
  id             String   @id @default(cuid())
  orderId        String   @unique
  courier        String
  trackingNumber String?
  labelUrl       String?
  status         String   @default("PENDING") // PENDING|BOOKED|PICKED_UP|IN_TRANSIT|OUT_FOR_DELIVERY|DELIVERED|FAILED|RETURNED
  shippedAt      DateTime?
  deliveredAt    DateTime?
  rawPayload     Json?
  order          Order    @relation(fields: [orderId], references: [id])
  events         ShipmentEvent[]
  @@index([trackingNumber])
}

model ShipmentEvent {
  id         String   @id @default(cuid())
  shipmentId String
  status     String
  message    String?
  occurredAt DateTime
  source     String   @default("WEBHOOK") // WEBHOOK | POLL | MANUAL
  shipment   Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  @@index([shipmentId, occurredAt])
}

// ───────── Disputes & support ─────────
model Dispute {
  id             String   @id @default(cuid())
  orderId        String   @unique
  openedById     String
  reason         String   // NOT_AS_DESCRIBED | WRONG_ITEM | DOA | DAMAGED | NOT_RECEIVED | OTHER
  status         String   @default("OPEN") // OPEN|TRIAGE|EVIDENCE|UNDER_REVIEW|RESOLVED|APPEALED|CLOSED
  resolution     String?  // FULL_REFUND|PARTIAL_REFUND|REPLACEMENT|RELEASE_TO_SELLER
  resolutionNote String?
  escrowFrozenAt DateTime?
  resolvedById   String?
  resolvedAt     DateTime?
  createdAt      DateTime @default(now())
  order          Order    @relation(fields: [orderId], references: [id])
  messages       DisputeMessage[]
  evidence       DisputeEvidence[]
  @@index([status, createdAt])
}

model DisputeMessage {
  id         String   @id @default(cuid())
  disputeId  String
  authorId   String
  body       String
  isInternal Boolean  @default(false)
  createdAt  DateTime @default(now())
  dispute    Dispute  @relation(fields: [disputeId], references: [id], onDelete: Cascade)
}

model DisputeEvidence {
  id        String   @id @default(cuid())
  disputeId String
  uploaderId String
  url       String
  kind      String   // PHOTO | VIDEO | DOCUMENT
  note      String?
  createdAt DateTime @default(now())
  dispute   Dispute  @relation(fields: [disputeId], references: [id], onDelete: Cascade)
}

model SupportTicket {
  id               String   @id @default(cuid())
  userId           String?
  orderId          String?
  subject          String
  category         String   // PRE_SALE | SHIPPING | PAYMENT | LISTING_REPORT | ACCOUNT | OTHER
  status           String   @default("OPEN")
  priority         String   @default("NORMAL")
  proWorkshop      Boolean  @default(false) // snapshot of subscriber status at ticket open
  firstResponseAt  DateTime?
  resolvedAt       DateTime?
  slaDueAt         DateTime? // +72h standard, +48h Pro Workshop
  slaBreached      Boolean  @default(false)
  createdAt        DateTime @default(now())
  @@index([status, priority])
  @@index([proWorkshop, slaDueAt])
}

// ───────── Monetisation & reputation ─────────
model VerifiedPassPurchase {
  id             String   @id @default(cuid())
  sellerId       String
  listingId      String?
  plan           String   // SINGLE | PRO_WORKSHOP
  amount         Decimal  @db.Decimal(12,2)
  status         String   @default("PENDING") // PENDING|ACTIVE|EXPIRED|REFUNDED|CANCELLED
  startsAt       DateTime?
  expiresAt      DateTime?
  slotsTotal     Int      @default(1)
  slotsUsed      Int      @default(0)
  supportSlaHours Int     @default(0)   // 48 only for PRO_WORKSHOP
  autoRenew      Boolean  @default(false)
  providerRef    String?
  createdAt      DateTime @default(now())
  listing        Listing? @relation(fields: [listingId], references: [id])
  @@index([sellerId, status])
}

model Review {
  id         String   @id @default(cuid())
  orderId    String   @unique
  authorId   String
  subjectId  String
  rating     Int      // 1..5
  comment    String?
  wouldBuyAgain Boolean?
  createdAt  DateTime @default(now())
  order      Order    @relation(fields: [orderId], references: [id])
  author     User     @relation("author", fields: [authorId], references: [id])
  subject    User     @relation("subject", fields: [subjectId], references: [id])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  title     String
  body      String?
  href      String?
  readAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  @@index([userId, readAt])
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  action     String
  entityType String
  entityId   String
  before     Json?
  after      Json?
  ip         String?
  createdAt  DateTime @default(now())
  @@index([entityType, entityId])
}

model PlatformSetting {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}
```

### 5.3 Key constraints & indexes

- `Order` unique per seller per checkout; multi-seller cart → multiple orders sharing a `checkoutGroupId`.
- **Partial unique index** on active Pass purchase per seller+listing (`status = 'ACTIVE'`); one active `PRO_WORKSHOP` subscription per seller.
- `ListingCompatibility` unique `(listingId, deviceModelId)` prevents duplicate tags.
- `BuyerVolumePeriod` unique `(buyerId, period)`; increment in the same transaction as `PAID_ESCROW`.
- `LedgerEntry.idempotencyKey` unique — webhook retries cannot double-post.
- `PspWebhookEvent` unique `(provider, eventId)` — replay-safe.
- `EscrowTransaction.pspEscrowId` unique; `releaseVersion` guards the release instruction.
- **One active claim per order:** `DoaClaim.orderId` unique and `Dispute.orderId` unique, with an application rule that only one opens.
- `ReturnShipment.orderId` unique; label state transitions are append-only in `events`.
- `ShipmentEvent` append-only; no updates.
- `Order.autoReleaseAt` and `Order.doaEndsAt` indexed for the sweepers.
- `Listing` FTS: `GIN (to_tsvector('simple', title || ' ' || coalesce(part_number,'')))`; trigram on `part_number`, `ic_markings`.
- Soft delete everywhere (`deletedAt`) except ledger, PSP events, and audit log.
- Policy values live in `PlatformSetting` and are read by both UI copy and workers: `commission.rate=0.08`, `commission.floor=20`, `kyc.monthly_volume=15000`, `escrow.auto_release_hours=72`, `doa.window_days=7`, `reserve.pct=10`, `reserve.days=14`, `support.sla.standard_hours=72`, `support.sla.pro_hours=48`. **A single source of truth prevents the UI and the release job from disagreeing.**

### 5.4 Core API surface

```
GET    /api/listings?category=&brand=&device=&part=&condition=&min=&max=&pass=&sort=&page=
GET    /api/listings/:slug
POST   /api/listings                       (seller)
PATCH  /api/listings/:id
POST   /api/listings/:id/verify-pass
POST   /api/listings/:id/evidence          (seller evidence pack)
GET    /api/compatibility?deviceId= | ?partNumber=
GET    /api/models?brand=&q=

GET    /api/checkout/eligibility           (monthly volume + KYC gate)
POST   /api/checkout/quote                 (shipping + 8%/₱20 fee snapshot)
POST   /api/orders                        (creates PENDING_PAYMENT + PSP escrow intent)
POST   /api/orders/:id/acknowledge        (Before You Buy snapshot)
POST   /api/webhooks/escrow               (signed; → PAID_ESCROW / RELEASED / REFUNDED)
POST   /api/orders/:id/validate           (→ COMPLETED, queue release)
POST   /api/orders/:id/extend-window      (once, +24h)
POST   /api/disputes                      (freeze escrow)

POST   /api/doa-claims                    (within 7 days; issues return label)
POST   /api/doa-claims/:id/contest
POST   /api/returns/:id/label             (platform-generated reverse label)
POST   /api/webhooks/courier              (forward + reverse scans)

POST   /api/shipments/book                (seller, courier rate + label)
POST   /api/shipments/:id/manual-tracking

GET    /api/seller/orders?tab=
GET    /api/seller/reserve
POST   /api/payouts/request
GET    /api/admin/audits?status=          (spot-audit queue)
POST   /api/admin/audits/:id/resolve
POST   /api/admin/sanctions               (strike / ban)
GET    /api/admin/escrow/reconcile
POST   /api/admin/disputes/:id/resolve
```

---

## 6. Wireframe Layouts

### 6.1 Home Page (desktop ≥1280px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [▣ Silicon Trading]  Marketplace  Sell a Board  Verified Pass  Orders  Support   🔍  ♡  (JD) │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   DONOR BOARDS · ICs · RECLAIMED PARTS                                       │
│   Silicon you can trust.                                                     │
│   Held in licensed escrow until you verify the part.                         │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────┐  [ Check ]  │
│   │ 🔍  Search iPhone 13 Pro, A2638, or PMIC 338S00509…        │            │
│   └────────────────────────────────────────────────────────────┘            │
│   Popular: iPhone 13 Pro · Samsung S22 · Snapdragon 888 · Charging flex      │
│                                                                              │
│   🛡 PSP escrow   ✅ KYC-verified sellers   ⏱ 72h validation · 7-day DOA      │
├──────────────────────────────────────────────────────────────────────────────┤
│  SHOP BY CATEGORY                                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Donor Boards │ │ Motherboards │ │     ICs      │ │ Phone Parts  │         │
│  │ 1,284 parts  │ │   642 parts  │ │  2,910 parts │ │  1,105 parts │         │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘         │
├──────────────────────────────────────────────────────────────────────────────┤
│  HOW ESCROW WORKS                                                            │
│  ① Pay ────────► ② Seller ships ────────► ③ You verify ────────► ④ Funds release │
│  PSP-held          Tracking updates        72-hour window        Seller paid    │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────┐  ┌─────────────────────────────────────┐ │
│  │ VERIFIED PASS  (copper panel)   │  │ COMPATIBILITY CHECKER               │ │
│  │ Evidence-uploaded boards,       │  │ "Will this part fit my phone?"      │ │
│  │ spot-audited. Priority search.  │  │ [Brand ▾] [Model ▾] [Check fit]     │ │
│  │ ₱49 single · ₱399 Pro Workshop  │  │ ✅ 42 compatible parts found         │ │
│  │ [ See verified stock → ]        │  │                                     │ │
│  └────────────────────────────────┘  └─────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│  TRENDING COMPONENTS                                         [ View all → ]  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                             │
│  │ photo   │ │ photo   │ │ photo   │ │ photo   │                             │
│  │ ✅ Pass │ │ ✅ Pass │ │         │ │ ✅ Pass │                             │
│  │ Title   │ │ Title   │ │ Title   │ │ Title   │                             │
│  │ Fits:…  │ │ Fits:…  │ │ Fits:…  │ │ Fits:…  │                             │
│  │ ₱4,850  │ │ ₱1,200  │ │ ₱320    │ │ ₱6,400  │                             │
│  │ seller  │ │ seller  │ │ seller  │ │ seller  │                             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                             │
├──────────────────────────────────────────────────────────────────────────────┤
│  TOP VERIFIED SELLERS            │  TRUST METRICS                            │
│  ┌────────────────────────────┐  │  ₱12.4M protected in licensed escrow     │
│  │ avatar · shop · ⭐4.9 · 128 │  │  1,842 disputes resolved                 │
│  │ ✅ Pro · Cebu · 2h reply   │  │  98.2% validation success                │
│  └────────────────────────────┘  │  72h auto-release · 7-day DOA            │
├──────────────────────────────────────────────────────────────────────────────┤
│  Sell your first board  →  [ Become a seller ]                               │
├──────────────────────────────────────────────────────────────────────────────┤
│  FOOTER: Marketplace · Sell · Verified Pass · Support · Dispute policy        │
│  Escrow terms · Privacy · Courier partners · Contact · © 2026 Silicon Trading │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Responsive behavior**

- **1024–1279:** 3-column trending grid; category tiles 2×2; hero search full width.
- **768–1023:** hide "Verified Pass" from header into overflow menu; escrow steps become vertical.
- **<768:** stacked; hero search sticky under header; category tiles horizontal scroll; trending list view; bottom tab bar. Trust strip becomes a 3-item scroll-snap row.

**Home page component tree**

```
<HomePage>
  <SiteHeader />                       // sticky, blur on scroll
  <Hero>
    <Eyebrow /> <H1 /> <Subcopy />
    <GlobalSearch /> <PopularQueries />
    <TrustStrip />                     // 3 badges
  </Hero>
  <CategoryGrid />                     // 4 tiles, count from API
  <EscrowSteps />                      // 4 numbered steps
  <TwoUpPanel>
    <VerifiedPassPromo />              // copper surface
    <CompatibilityTeaser />            // brand/model select → results
  </TwoUpPanel>
  <TrendingListings />                 // 4 ListingCards, horizontal scroll on mobile
  <SocialProof>                        // sellers + metrics
    <TopSellers /> <TrustMetrics />
  </SocialProof>
  <SellerCTA />
  <SiteFooter />
</HomePage>
```

### 6.2 Marketplace (desktop ≥1280px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ Home / Marketplace            Marketplace           1,284 parts   [Grid|List]│
│                               [ 🔍 Search within results… ]        Sort: Relevance ▾ │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ FILTERS       │ Active: [ICs ×] [Grade A–B ×] [Verified Pass ×]   Clear all   │
│               │                                                              │
│ Category      │  ┌────────────┐ ┌────────────┐ ┌────────────┐                │
│ ○ All         │  │ photo      │ │ photo      │ │ photo      │                │
│ ● ICs (2,910) │  │ ✅ Pass    │ │            │ │ ✅ Pass    │                │
│ ○ Donor boards│  │ Grade A    │ │ Grade B    │ │ Grade A    │                │
│ ○ Motherboards│  │ PMIC 338S… │ │ Charging IC│ │ Snapdragon │                │
│ ○ Phone parts │  │ Fits: 13P  │ │ Fits: 12/13│ │ Fits: S22  │                │
│               │  │ ₱1,450     │ │ ₱320       │ │ ₱6,400     │                │
│ Brand         │  │ ⭐4.9 Cebu │ │ ⭐4.7 MNL  │ │ ⭐5.0 Cebu │                │
│ ☑ Apple (1,2) │  └────────────┘ └────────────┘ └────────────┘                │
│ ☐ Samsung     │                                                              │
│ ☐ Qualcomm    │  ┌────────────┐ ┌────────────┐ ┌────────────┐                │
│               │  │ …          │ │ …          │ │ …          │                │
│ Device model  │  └────────────┘ └────────────┘ └────────────┘                │
│ [ iPhone 13 ▾]│                                                              │
│               │  ┌──────────────────────────────────────────────────────┐    │
│ Condition     │  │ List view row: photo · title · fits · grade · price  │    │
│ ☐ A ☑ B ☐ C   │  └──────────────────────────────────────────────────────┘    │
│               │                                                              │
│ Price (₱)     │              [ 1 ] [ 2 ] [ 3 ] … [ 43 ]  →                 │
│ [200]–[8000]  │                                                              │
│               │                                                              │
│ Seller        │                                                              │
│ ☑ Verified Pass only                                                         │
│ ☐ ID verified only                                                           │
│               │                                                              │
│ Location      │                                                              │
│ [ Cebu ▾ ]    │                                                              │
│               │                                                              │
│ [Apply] [Reset]                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

**Listing card anatomy**

```
┌──────────────────────────────┐
│  [ photo 4:3 ]      ♡   ✅  │  ← save heart, pass badge overlay
│                              │
│  Grade A · OEM Pull          │  ← condition chip (color-coded)
│  iPhone 13 Pro Logic Board   │  ← 2-line clamp
│  Fits: 13 Pro +2             │  ← compatibility pills
│  ₱4,850.00        negotiable │  ← price, mono
│  ⭐ 4.9 · Cebu · 2h          │
│  🛡 Escrow · DOA 7d · 2-day   │  ← trust footer
└──────────────────────────────┘
```

**Marketplace component tree**

```
<MarketplacePage>
  <PageHeader title resultsCount viewToggle sort />
  <SearchWithinResults />
  <Layout twoColumn>
    <FilterRail>                       // desktop only, sticky
      <FilterGroup category />
      <FilterGroup brand searchable />
      <FilterGroup deviceModel />
      <FilterGroup conditionGrade />
      <FilterGroup priceRange />
      <FilterGroup sellerTier />
      <FilterGroup location />
      <FilterActions reset />
    </FilterRail>
    <Results>
      <ActiveFilterChips />
      <ResultGrid>                     // 3 cols ≥1280, 2 cols 768–1279
        <ListingCard />…
      </ResultGrid>
      <Pagination />                   // numbered, SEO-friendly
      <EmptyState />                   // illustration + broaden filters + request part
    </Results>
  </Layout>
  <MobileFilterSheet />                // bottom sheet, "Show 214 results" CTA
  <SaveSearchPrompt />
</MarketplacePage>
```

**Marketplace states**

| State | Behavior |
|---|---|
| Loading | 6 skeleton cards, filter rail shimmer |
| Empty | "No exact match — remove brand filter" + "Request this part" |
| Error | Inline retry, preserve filters |
| Filter overflow | Max 6 groups visible, "More filters" expands |
| Mobile | Sticky `Filters (3)` + `Sort` bar; results 2-col compact / 1-col list |
| Deep link | Filters encoded in query string; share button copies URL |

---

## 7. Build Phasing & Open Decisions

### MVP (weeks 1–12)
Auth + account states → buyer monthly-volume meter + KYC gate → catalog/device models → listing create + photos → marketplace search/filters → listing detail → **PSP escrow adapter (intent, webhook, release, refund, reconciliation)** → 8%/₱20 fee snapshot → courier booking + webhook → **72h validation + auto-release** → **7-day DOA claim + platform-generated return label** → seller evidence upload → **flag-and-ban spot-audit queue** → disputes v1 → seller KYC review.

### Phase 2 (weeks 13–18)
Pro Workshop billing + 48h support SLA instrumentation → diagnostic evidence auto-checks (OCR, perceptual hash) → compatibility checker + part-number OCR → rolling-reserve automation → saved searches/alerts → reviews → payout batching → admin analytics.

### Phase 3
Multi-warehouse/consolidation, bulk IC inventory, repair-shop ERP API, reputation scoring, insurance partner, regional expansion.

### Decisions now locked
- Licensed PSP escrow (not a platform trust account).
- Seller evidence upload + spot audit; flag-and-ban.
- 8% commission, ₱20 floor, shipping excluded.
- ₱15,000 cumulative monthly buyer volume for KYC.
- 72h auto-release for all tiers; 48h reserved for Pro Workshop support.
- Platform-mandated 7-day DOA.
- Platform-generated prepaid return labels.

### Remaining implementation decisions
1. **PSP selection** — Xendit vs PayMongo vs Maya Business: confirm escrow custody, partial refunds, payout API, webhook SLAs, and pricing in contract. Build the adapter regardless.
2. **Pro Workshop packaging** — treat it as the ₱399/month tier (current assumption). If it is a separate tier above Verified Pass, set pricing and slot count.
3. **DOA exclusions** — confirm treatment of consumables (batteries with <80% health), cosmetic-only complaints, and buyer-caused damage.
4. **Reserve policy** — 10% for 14 days proposed; decide whether clean-history sellers can be waived earlier than 90 days.
5. **Refund trigger on returns** — first carrier scan (buyer-protective, proposed) vs seller receipt for orders ≥ ₱15,000.
6. **Support hours** — 48h/72h SLAs currently business-hours; decide whether Pro Workshop gets 7-day coverage.
7. **Courier coverage** — launch provinces and which couriers support reverse pickup in each.
8. **KYC vendor** — in-house review vs a PH KYC provider; affects the ₱15,000 gate's drop-off.
