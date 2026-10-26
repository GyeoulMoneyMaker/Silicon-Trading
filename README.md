# Silicon Trading — demo

A dependency-free demo of a B2B escrow marketplace for repair-grade
electronics: donor boards, motherboards, ICs, and phone parts for Philippine
repair shops.

Everything runs locally in the browser. **No real payments, escrow, courier
tracking, or identity checks happen.** All state is saved in `localStorage`.
The UI follows the Aquaflow design system — royal-blue navigation, an `#EAEFF6`
canvas, white cards, tonal KPI tiles, and compact status pills.

## Run it

```bash
npm start
```

Open <http://localhost:4173>. The zero-dependency server (`server.js`) serves
the static files on port 4173; set `PORT` to change it.

Opening `index.html` directly also works, but the server keeps URLs and relative
assets consistent.

## Accounts and demo logins

There is **one sign-in form** at `login.html`. Enter an email and password and
the account decides the destination: a buyer lands on the account page, a seller
on the seller workspace, and an admin on the admin console. Guests can browse
the marketplace and read support content without signing in, but checkout
requires a registered buyer account.

Buyers can register with a name, email, password, and password confirmation.
Registration signs them in and returns them to the page they came from (for
example, the exact checkout they were blocked on). Seller and admin accounts are
provisioned by the platform in this demo.

| Account | Email | Password | Destination |
| --- | --- | --- | --- |
| Buyer | `demo@silicon.trading` | `demo1234` | `account.html` |
| Seller | `seller@silicon.trading` | `demo1234` | `seller-dashboard.html` |
| Admin | `admin@silicon.trading` | `demo1234` | `admin-dashboard.html` |

The login page lists all three demo accounts as one-click fill buttons, and the
footer and account page link to them directly (`login.html?demo=seller`, etc.).
Signing in as the seller maps you to **Quiapo Silicon Co. (`S-02`)**.

The public header is the same for every role: **Marketplace · Support ·
Account**. Workspace tools live inside the seller and admin portals, not in the
marketplace header. While a seller or admin browses public pages, a fixed
bottom-left control returns them to their workspace.

`orders.html` remains the buyer order list and is reachable for signed-in
buyers. Seller fulfilment lives in the seller workspace. `sell.html` stays
available as the public seller-only listing form, while the workspace's
**List new product** uses the same composer without leaving the portal.

## Seeded demo data

Every fresh browser starts from `assets/js/data/seed.js`:

- 5 sellers (Cebu Boardworks, Quiapo Silicon Co., Davao Parts Lab, Baguio
  Microspares, Bacolod Board Co.)
- 13 listings — 12 live and 1 pending moderation (`L-1013`)
- 5 orders across paid, delivered, disputed, and closed states
- 2 support tickets — one open dispute ticket, one resolved courier delay
- 3 seeded demo accounts (buyer, seller, admin) — all with password `demo1234`
- Bacolod Board Co. (`S-05`) starts with KYC pending
- Buyer volume starts at ₱8,950, below the ₱15,000 KYC gate

## What to try

1. **Marketplace** — search `iPhone 13 Pro`, filter by category, grade, price,
   and *Verified Pass only*. Pending and paused listings stay hidden.
2. **Listing** — inspect diagnostics, the evidence pack, fit confidence, the
   seller tier, and gallery angles.
3. **Checkout** — guests see a registration gate with the part summary.
   Register or sign in and you return to that exact checkout. Enter delivery
   details, choose a courier, accept the *Before You Buy* checklist, and pay
   through a simulated PSP. The first order that crosses ₱15,000 of monthly
   volume triggers the demo KYC gate. Escrow starts at `HELD`.
4. **Orders** — as a buyer, open an order and use its demo controls to ship,
   deliver, release, extend validation, open a dispute, or file a 7-day DOA
   claim. Tabs filter all, in-escrow, shipped, delivered, claims, and closed
   orders.
5. **Seller workspace → Storefront → List new product** — publish a listing with
   a live 8% (₱20 floor) + 10% reserve payout preview. The composer stays in the
   workspace and sends you back to **Listings** after publishing. A listing only
   earns the Verified Pass badge when the seller has an active plan and all five
   evidence items are declared.
6. **Seller workspace → Account → Verified Pass** — activate the ₱49 single pass
   or the ₱399 Pro Workshop and cancel it without leaving the workspace. The
   seller dashboard and support SLA update with the plan, and badges stay on
   already-published evidence-backed listings after cancellation.
7. **Support** — open a ticket; the SLA is 72h, or 48h on Pro Workshop.
8. **Account** — verify contact details and payout, watch the monthly volume
   meter cross the ₱15,000 KYC threshold, manage saved parts, and reset the demo.
9. **Seller workspace** — section routes use the URL hash: `#overview`,
   `#orders`, `#orders/<id>`, `#listings`, `#payouts`, `#new-listing`, and
   `#pass`. Ship paid orders and open order details without leaving the portal;
   pause/resume listings; watch the payout ledger, reserve, and view counts.
10. **Admin console** — release the frozen Davao dispute, approve `L-1013`,
    verify Bacolod Board Co.'s KYC, and resolve the open ticket. Then revisit
    the marketplace to see moderation take effect; the bottom-left control
    returns to the console.

## Demo policy constants

| Rule | Value |
| --- | --- |
| Commission | 8% of item price, ₱20 minimum |
| Seller reserve | 10% of payout, held 14 days |
| Validation window | 72 hours after delivery, all seller tiers |
| Auto-release | End of validation window when there is no dispute |
| DOA cover | 7 days after delivery, even after release |
| Buyer KYC threshold | ₱15,000 cumulative paid volume per month |
| Support SLA | 72h standard · 48h Pro Workshop |
| Verified Pass | ₱49 per listing / 30 days |
| Pro Workshop | ₱399 per month |
| Couriers (flat) | J&T ₱180 · LBC ₱220 · Ninja Van ₱160 |

Escrow is presented as held by a licensed PSP (simulated as *Xendit (demo)*);
the platform itself never holds funds.

All of these live in `assets/js/core/config.js` (`POLICY`, `STORAGE`,
`PORTALS`, `COURIERS`).

## Architecture

No build step and no dependencies: static HTML, layered CSS, and native ES
modules.

```
HTML entry files       one per page; body[data-page] selects the module,
                       body[data-shell] selects the chrome
assets/css/tokens.css  design tokens (colour, spacing, radii, shadows, type)
assets/css/base.css    reset, typography, accessibility defaults
assets/css/components.css  buttons, pills, cards, KPIs, tables, forms
assets/css/shell.css   public header/footer, portal sidebar/topbar, auth card
assets/css/pages.css   page-specific layouts and responsive rules
assets/css/app.css     entry point; imports the layers in order

assets/js/app.js       bootstrap: page map, chrome, actions, forms, toast
assets/js/core/        config, store, selectors, actions, bus, icons, utils
assets/js/data/seed.js seeded sellers, listings, orders, tickets, accounts, profile
assets/js/components/  reusable UI (cards, badges, KPIs) and page shells
assets/js/pages/       one module per page, each exporting render()
```

Every page module exports `render()`. `app.js` renders the current page, then
repaints it on the `state:change` event emitted by the store. Page-specific
document listeners are attached once at module scope and guard on their own
elements, so repaints do not duplicate handlers.

### Storage schema

State is versioned. Keys use the `silicon.v3.*` namespace:

| Key | Contents |
| --- | --- |
| `silicon.v3.version` | Schema version (`3`) |
| `silicon.v3.profile` | Buyer profile, KYC, payout, Verified Pass plan |
| `silicon.v3.sellers` | Seller directory, KYC, tiers, payout accounts |
| `silicon.v3.listings` | Catalogue, evidence, moderation state |
| `silicon.v3.orders` | Orders, escrow, couriers, validation, disputes |
| `silicon.v3.tickets` | Support tickets and SLA timers |
| `silicon.v3.saved` | Saved listing ids |
| `silicon.v3.accounts` | Unified account registry (buyer, seller, admin) |
| `silicon.v3.session` | Signed-in account (`null` for guest) |

If the stored version differs from `3`, all keys are reseeded. `assets/app.js`
and `assets/styles.css` from the previous build are archived under
`docs/legacy/` and are not loaded.

## File map

```
index.html               Home
marketplace.html         Browse + URL-synced filters
listing.html             Listing detail (?id=L-1001)
checkout.html            Escrow checkout (?id=...)
orders.html              Order list + detail (?order=ST-2026-004184)
sell.html                Seller listing form (seller only)
verified-pass.html       Plans, evidence rules, spot audits
support.html             Tickets, disputes, DOA process
account.html             Identity, volume, payouts, saved parts
login.html               Unified sign-in + buyer registration
seller-dashboard.html    Seller workspace (#overview, #orders, #listings, #payouts, #new-listing, #pass)
admin-dashboard.html     Admin escrow, disputes, moderation, support
assets/                  CSS layers, JS modules, logo, SVG product art
server.js                Zero-dependency static server (port 4173)
docs/                    Product + technical blueprint
docs/legacy/             Archived v2 monolithic app.js and styles.css
```

## Reset

Use **Account → Reset demo data**, or clear the `silicon.v3.*` keys from
`localStorage`. A reset reseeds the demo and signs you out of any account.
