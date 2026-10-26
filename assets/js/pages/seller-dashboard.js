/* ==========================================================================
   Seller dashboard — section-based workspace
   Storefront (overview, new product, orders, listings) and Account (Pass).
   ========================================================================== */

import { icon } from "../core/icons.js";
import { POLICY } from "../core/config.js";
import {
  esc,
  fmtDate,
  pageRoot,
  peso,
  pct
} from "../core/utils.js";
import {
  currentRole,
  listingImage,
  listingStatus,
  netOf,
  passRequestPending,
  sellerForSession,
  sellerListings,
  sellerMetrics,
  sellerOrders,
  sellerTickets,
  tierOf
} from "../core/selectors.js";
import {
  badge,
  emptyState,
  escrowBadge,
  kpiCard,
  listingBadge,
  meter,
  orderBadge,
  tierBadge
} from "../components/ui.js";
import { portalShell, roleGate } from "../components/shell.js";
import { listingComposerMarkup, wireListingComposer } from "./sell.js";
import { passMarkup } from "./verified-pass.js";
import { orderDetailMarkup } from "./orders.js";

const VIEWS = [
  "overview",
  "orders",
  "listings",
  "payouts",
  "new-listing",
  "pass"
];

const VIEW_META = {
  overview: {
    eyebrow: "Quiapo Silicon Co. · seller desk",
    heading: "Seller dashboard",
    sub: `Manage stock, fulfil escrowed orders, and watch the ${POLICY.reserveDays}-day reserve. Everything here is local demo data.`
  },
  orders: {
    eyebrow: "Storefront · fulfilment",
    heading: "Orders & fulfilment",
    sub: "Ship paid orders and close delivered ones without leaving the seller workspace."
  },
  listings: {
    eyebrow: "Storefront · inventory",
    heading: "Listings",
    sub: "Pause stock instantly. Suspended listings stay hidden from the marketplace."
  },
  payouts: {
    eyebrow: "Finances · escrow",
    heading: "Payouts & reserve",
    sub: "Commission and reserve are deducted from each payout, never added to the buyer price."
  },
  "new-listing": {
    eyebrow: "Storefront · new product",
    heading: "List a new product",
    sub: "This is the same composer as the public listing form, but it stays inside your workspace."
  },
  pass: {
    eyebrow: "Account · trust programme",
    heading: "Verified Pass",
    sub: "Evidence, plans, and audit rules for the badge on your listings. Activating a plan stays in this workspace."
  }
};

function currentView() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ""));
  const [view, detail] = raw.split("/");
  if (!VIEWS.includes(view)) return { view: "overview", detail: "" };
  return { view, detail: detail || "" };
}

function orderActions(order) {
  if (order.status === "PAID")
    return `<button class="btn btn-primary btn-sm" type="button" data-action="ship-order" data-id="${esc(
      order.id
    )}">${icon("truck")}Ship</button>`;
  if (order.status === "SHIPPED")
    return `<button class="btn btn-secondary btn-sm" type="button" data-action="deliver-order" data-id="${esc(
      order.id
    )}">${icon("package")}Delivered</button>`;
  if (order.status === "DISPUTED" || order.status === "DOA_CLAIM")
    return `<a class="btn btn-danger-soft btn-sm" href="support.html?order=${encodeURIComponent(
      order.id
    )}">${icon("gavel")}Evidence</a>`;
  return `<a class="btn btn-ghost btn-sm" href="#orders/${encodeURIComponent(
    order.id
  )}">Open</a>`;
}

function listingActions(listing) {
  const status = listingStatus(listing);
  if (status === "ACTIVE")
    return `<button class="btn btn-ghost btn-sm" type="button" data-action="pause-listing" data-id="${esc(
      listing.id
    )}">Pause</button>`;
  if (status === "PAUSED")
    return `<button class="btn btn-secondary btn-sm" type="button" data-action="resume-listing" data-id="${esc(
      listing.id
    )}">Resume</button>`;
  return listingBadge(listing);
}

function ordersTable(orders) {
  if (!orders.length) {
    return emptyState({
      iconName: "box",
      title: "No orders yet",
      text: "Paid orders appear here as soon as a buyer checks out."
    });
  }
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Order</th><th>Buyer protection</th><th>Courier</th><th class="num">Total</th><th></th></tr></thead>
    <tbody>
      ${orders
        .map(
          (order) => `<tr>
            <td><div class="cell-main">
              <img class="thumb" src="${esc(order.image)}" alt="" />
              <div><b>${esc(order.title)}</b><span class="cell-sub">${esc(
            order.id
          )} · ${fmtDate(order.createdAt)}</span></div>
            </div></td>
            <td>${orderBadge(order)} ${escrowBadge(order)}</td>
            <td><b>${esc(order.courier)}</b><span class="cell-sub">${
            order.tracking ? esc(order.tracking) : "No tracking yet"
          }</span></td>
            <td class="num"><b>${peso(order.total)}</b><span class="cell-sub">${peso(
            netOf(order)
          )} net</span></td>
            <td><div class="row-actions">${orderActions(order)}</div></td>
          </tr>`
        )
        .join("")}
    </tbody>
  </table></div>`;
}

function overviewView({ seller, metrics, orders, openTickets }) {
  return `<section id="overview" class="stack">
    <div class="kpi-grid">
      ${kpiCard({
        label: "Gross sales",
        value: peso(metrics.gross),
        sub: `${orders.length} orders · all time`
      })}
      ${kpiCard({
        tone: "green",
        label: "Held in escrow",
        value: peso(metrics.inEscrow),
        sub: "Released after buyer validation"
      })}
      ${kpiCard({
        tone: "amber",
        label: "Reserve held",
        value: peso(metrics.reserveHeld),
        sub: `${POLICY.reserveDays}-day rolling reserve`
      })}
      ${kpiCard({
        tone: metrics.disputes.length ? "red" : "green",
        label: "Open claims",
        value: String(metrics.disputes.length),
        sub: metrics.disputes.length
          ? "Escrow frozen pending evidence"
          : "No frozen orders"
      })}
    </div>

    <div class="dash-split">
      <section class="card">
        <div class="card-head card-head--row">
          <div>
            <h2 class="card-title">Orders needing action</h2>
            <p>Ship paid orders, close delivered ones, and answer claims.</p>
          </div>
          <a class="link-arrow" href="#orders">All orders ${icon(
            "arrow-right"
          )}</a>
        </div>
        ${
          orders.length
            ? `<div class="table-wrap"><table class="data-table">
                <thead><tr><th>Order</th><th>Status</th><th class="num">Net</th><th></th></tr></thead>
                <tbody>
                  ${orders
                    .slice(0, 6)
                    .map(
                      (order) => `<tr>
                        <td><div class="cell-main">
                          <img class="thumb" src="${esc(order.image)}" alt="" />
                          <div><b>${esc(order.id)}</b><span class="cell-sub">${esc(
                        order.title
                      )}</span></div>
                        </div></td>
                        <td>${orderBadge(order)} ${escrowBadge(order)}</td>
                        <td class="num"><b>${peso(netOf(order))}</b><span class="cell-sub">${peso(
                        order.total
                      )} order</span></td>
                        <td><div class="row-actions">${orderActions(order)}</div></td>
                      </tr>`
                    )
                    .join("")}
                </tbody>
              </table></div>`
            : emptyState({
                iconName: "box",
                title: "No orders yet",
                text: "Paid orders appear here as soon as a buyer checks out."
              })
        }
      </section>

      <aside class="stack">
        <div class="card">
          <div class="card-head card-head--row">
            <div><h3>Store tier</h3><p>${esc(seller.name)}</p></div>
            ${tierBadge(seller)}
          </div>
          <div class="summary-list">
            <div class="summary-row"><span>Rating</span><b>★ ${Number(
              seller.rating || 0
            ).toFixed(1)}</b></div>
            <div class="summary-row"><span>Completed orders</span><b>${Number(
              seller.orders || 0
            )}</b></div>
            <div class="summary-row"><span>Live listings</span><b>${metrics.live.length}</b></div>
            <div class="summary-row"><span>Listing views</span><b>${metrics.views.toLocaleString(
              "en-PH"
            )}</b></div>
            <div class="summary-row"><span>Open tickets</span><b>${openTickets.length}</b></div>
          </div>
          <div class="mt-16">${meter(
            metrics.releasedNet,
            Math.max(metrics.releasedNet, 1),
            "ok"
          )}</div>
          <p class="small mt-8">${peso(
            metrics.releasedNet
          )} released to date · ${peso(metrics.reserveHeld)} still in reserve.</p>
        </div>

        <div class="card">
          <div class="card-head card-head--row">
            <h3>Verified Pass</h3>
            ${passRequestPending() ? badge("Approval pending", "warn") : ""}
          </div>
          <div class="pass-status" style="padding:14px">
            <span class="action-icon">${icon("badge-check")}</span>
            <div>
              <b>${esc(tierOf(seller))}</b>
              <span>${metrics.live.filter((item) => item.pass).length} of ${
    metrics.live.length
  } live listings carry the badge.${
    passRequestPending()
      ? " A plan change is waiting for admin approval."
      : ""
  }</span>
            </div>
          </div>
          <div class="row mt-16">
            <a class="btn btn-secondary btn-sm" href="#pass">${icon(
              "badge-check"
            )}Plans</a>
            <a class="btn btn-ghost btn-sm" href="#new-listing">${icon(
              "plus"
            )}New listing</a>
          </div>
        </div>

        <div class="alert alert--info">${icon("info")}<span>Seller payouts are released from escrow after buyer validation or 72 hours. The 10% reserve is held for ${POLICY.reserveDays} days.</span></div>
      </aside>
    </div>
  </section>`;
}

function ordersView({ seller, orders, metrics, detailId }) {
  if (detailId) {
    const order = orders.find((item) => item.id === detailId);
    if (!order) {
      return `<section id="orders" class="portal-section">
        <div class="portal-section-head">
          <div><h2>Order detail</h2><p>The order could not be found in your storefront.</p></div>
          <a class="btn btn-secondary btn-sm" href="#orders">${icon(
            "arrow-left"
          )}All orders</a>
        </div>
        ${emptyState({
          iconName: "search",
          title: "Order not found",
          text: "That order is not assigned to your seller account.",
          cta: '<a class="btn btn-primary mt-16" href="#orders">Back to orders</a>'
        })}
      </section>`;
    }
    return `<section id="orders" class="portal-section">
      ${orderDetailMarkup(order, {
        context: "seller",
        wrap: false,
        backHref: "#orders",
        backLabel: "Orders & fulfilment"
      })}
    </section>`;
  }

  return `<section id="orders" class="portal-section">
    <div class="portal-section-head">
      <div>
        <h2>Orders &amp; fulfilment</h2>
        <p>Move paid orders to shipped, then wait for delivery confirmation.</p>
      </div>
      ${badge(
        `${metrics.pendingShip.length} to ship`,
        metrics.pendingShip.length ? "warn" : "ok"
      )}
    </div>
    ${ordersTable(orders)}
  </section>`;
}

function listingsView({ listings, metrics }) {
  return `<section id="listings" class="portal-section">
    <div class="portal-section-head">
      <div>
        <h2>Listings</h2>
        <p>${metrics.live.length} live · ${listings.length} total. Pause stock instantly.</p>
      </div>
      <a class="btn btn-primary btn-sm" href="#new-listing">${icon(
        "plus"
      )}List new product</a>
    </div>
    ${
      listings.length
        ? `<div class="table-wrap"><table class="data-table">
            <thead><tr><th>Listing</th><th>Status</th><th>Evidence</th><th class="num">Price</th><th class="num">Views</th><th></th></tr></thead>
            <tbody>
              ${listings
                .map(
                  (listing) => `<tr>
                    <td><div class="cell-main">
                      <img class="thumb" src="${esc(listingImage(listing))}" alt="" />
                      <div><b>${esc(listing.title)}</b><span class="cell-sub">${esc(
                    listing.category
                  )} · Grade ${esc(listing.grade)} · ${Number(
                    listing.stock
                  )} in stock</span></div>
                    </div></td>
                    <td>${listingBadge(listing)}</td>
                    <td>${
                      listing.pass
                        ? badge("Pass", "teal")
                        : badge("No pass", "neutral")
                    }</td>
                    <td class="num"><b>${peso(listing.price)}</b></td>
                    <td class="num">${Number(listing.views || 0).toLocaleString(
                      "en-PH"
                    )}</td>
                    <td><div class="row-actions">
                      <a class="btn btn-ghost btn-sm" href="listing.html?id=${encodeURIComponent(
                        listing.id
                      )}">View</a>
                      ${listingActions(listing)}
                    </div></td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table></div>`
        : emptyState({
            iconName: "layers",
            title: "No listings yet",
            text: "Publish your first part to start receiving escrowed orders.",
            cta: `<a class="btn btn-primary mt-16" href="#new-listing">List a product</a>`
          })
    }
  </section>`;
}

function payoutsView({ seller, metrics }) {
  const reserveCap = Math.max(1, metrics.reserveHeld + metrics.releasedNet);
  return `<section id="payouts" class="portal-section">
    <div class="portal-section-head">
      <div>
        <h2>Payouts &amp; reserve</h2>
        <p>Commission and reserve are deducted from each payout, never added to the buyer price.</p>
      </div>
      ${badge(seller.payoutMethod || "InstaPay", "neutral")}
    </div>
    <div class="dash-grid dash-grid--halves">
      <div class="card">
        <div class="card-head"><h3>Payout breakdown</h3></div>
        <div class="summary-list">
          <div class="summary-row"><span>Gross sales</span><b>${peso(metrics.gross)}</b></div>
          <div class="summary-row"><span>Held in escrow</span><b>${peso(metrics.inEscrow)}</b></div>
          <div class="summary-row"><span>Frozen by claims</span><b>${peso(metrics.frozenValue)}</b></div>
          <div class="summary-row"><span>Reserve held</span><b>${peso(metrics.reserveHeld)}</b></div>
          <div class="summary-row summary-row--total"><span>Released to date</span><b>${peso(metrics.releasedNet)}</b></div>
        </div>
        <div class="mt-16">${meter(metrics.reserveHeld, reserveCap, "warn")}</div>
        <p class="small mt-8">Reserve ratio: ${pct(
          metrics.reserveHeld,
          reserveCap
        )}% of tracked earnings. Released ${POLICY.reserveDays} days after delivery.</p>
      </div>
      <div class="card">
        <div class="card-head"><h3>Payout account</h3></div>
        <dl class="kv kv--left">
          <dt>Method</dt><dd>${esc(seller.payoutMethod || "InstaPay")}</dd>
          <dt>Account</dt><dd>${esc(seller.payoutAccount || "Not set")}</dd>
          <dt>Commission</dt><dd>8% · ₱20 floor</dd>
          <dt>Reserve</dt><dd>10% · ${POLICY.reserveDays} days</dd>
          <dt>Schedule</dt><dd>After validation or ${POLICY.autoReleaseHours}h</dd>
        </dl>
        <div class="alert mt-16">${icon("bank")}<span>Payout verification is shared with the buyer account. Update it from the account page.</span></div>
        <a class="btn btn-secondary btn-block mt-16" href="account.html">${icon(
          "user"
        )}Account settings</a>
      </div>
    </div>
    <div class="card mt-16">
      <div class="card-head"><h3>Reserve release schedule</h3></div>
      ${
        metrics.orders.length
          ? `<div class="table-wrap"><table class="data-table">
              <thead><tr><th>Order</th><th>Delivered</th><th>Escrow</th><th class="num">Reserve</th><th>Releases</th></tr></thead>
              <tbody>
                ${metrics.orders
                  .filter((order) => order.reserve > 0)
                  .map(
                    (order) => `<tr>
                      <td><b>${esc(order.id)}</b><span class="cell-sub">${esc(
                      order.title
                    )}</span></td>
                      <td>${fmtDate(order.deliveredAt)}</td>
                      <td>${escrowBadge(order)}</td>
                      <td class="num">${peso(order.reserve)}</td>
                      <td>${
                        order.deliveredAt
                          ? fmtDate(order.deliveredAt + POLICY.reserveDays * 864e5)
                          : "After delivery"
                      }</td>
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table></div>`
          : `<p class="small">No reserve movements yet.</p>`
      }
    </div>
  </section>`;
}

function newListingView() {
  return `<section id="new-listing" class="portal-section">
    <div class="portal-section-head">
      <div>
        <h2>List new product</h2>
        <p>Publish a part and choose the evidence pack. You stay in the workspace when it goes live.</p>
      </div>
      ${badge("Stays in workspace", "teal")}
    </div>
    ${listingComposerMarkup({ embedded: true })}
  </section>`;
}

function passView() {
  return `<section id="pass" class="portal-section">
    <div class="portal-section-head">
      <div>
        <h2>Verified Pass</h2>
        <p>Plan status, evidence rules, and listing coverage for this seller account.</p>
      </div>
      <a class="btn btn-primary btn-sm" href="#new-listing">${icon(
        "plus"
      )}List with evidence</a>
    </div>
    ${passMarkup({ embedded: true })}
  </section>`;
}

function pageActions(view) {
  if (view === "overview")
    return `<a class="btn btn-secondary" href="marketplace.html">${icon(
      "store"
    )}Storefront</a><a class="btn btn-primary" href="#new-listing">${icon(
      "plus"
    )}List new product</a>`;
  if (view === "orders" || view === "listings")
    return `<a class="btn btn-secondary" href="marketplace.html">${icon(
      "store"
    )}Storefront</a><a class="btn btn-primary" href="#new-listing">${icon(
      "plus"
    )}List new product</a>`;
  if (view === "new-listing")
    return `<a class="btn btn-secondary" href="#overview">${icon(
      "arrow-left"
    )}Back to overview</a>`;
  if (view === "pass")
    return `<a class="btn btn-secondary" href="#new-listing">${icon(
      "plus"
    )}List with evidence</a>`;
  return `<a class="btn btn-secondary" href="marketplace.html">${icon(
    "store"
  )}Storefront</a>`;
}

export function render() {
  const root = pageRoot();
  if (!root) return;

  if (currentRole() !== "seller") {
    root.innerHTML = roleGate({
      role: "seller",
      title: "Seller dashboard access",
      text: "This workspace is scoped to the seller account. Sign in with the seller email to manage stock and fulfilment.",
      iconName: "store"
    });
    return;
  }

  const seller = sellerForSession();
  if (!seller) {
    root.innerHTML = roleGate({
      role: "seller",
      title: "Seller profile not found",
      text: "The demo seller record is missing. Reset demo data from the account page to restore it.",
      iconName: "alert"
    });
    return;
  }

  const { view, detail } = currentView();
  const active = view === "overview" ? "overview" : view;
  const meta = VIEW_META[view];
  const metrics = sellerMetrics(seller.id);
  const orders = [...sellerOrders(seller.id)].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt)
  );
  const listings = sellerListings(seller.id);
  const tickets = sellerTickets(seller.id);
  const openTickets = tickets.filter((ticket) => ticket.status === "OPEN");

  let content = "";
  if (view === "orders") {
    content = ordersView({ seller, orders, metrics, detailId: detail });
  } else if (view === "listings") {
    content = listingsView({ listings, metrics });
  } else if (view === "payouts") {
    content = payoutsView({ seller, metrics });
  } else if (view === "new-listing") {
    content = newListingView();
  } else if (view === "pass") {
    content = passView();
  } else {
    content = overviewView({ seller, metrics, orders, openTickets });
  }

  root.innerHTML = portalShell({
    role: "seller",
    active,
    topbarTitle: "Seller workspace",
    eyebrow: meta.eyebrow,
    heading: meta.heading,
    sub: meta.sub,
    actions: pageActions(view),
    content
  });

  if (view === "new-listing") wireListingComposer(root);
}
