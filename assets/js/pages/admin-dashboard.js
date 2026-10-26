/* ==========================================================================
   Admin dashboard — escrow oversight, disputes, moderation, KYC
   ========================================================================== */

import { icon } from "../core/icons.js";
import { POLICY } from "../core/config.js";
import {
  esc,
  fmtDate,
  initials,
  pageRoot,
  peso,
  peso0,
  pct
} from "../core/utils.js";
import { getState } from "../core/store.js";
import {
  currentRole,
  listingImage,
  listingStatus,
  monthlyVolume,
  netOf,
  platformMetrics,
  sellerMetrics,
  tierOf
} from "../core/selectors.js";
import {
  badge,
  emptyState,
  escrowBadge,
  kpiCard,
  kycBadge,
  listingBadge,
  meter,
  orderBadge,
  tierBadge
} from "../components/ui.js";
import { portalShell, roleGate } from "../components/shell.js";

function disputeActions(order) {
  return `<div class="row-actions">
    <button class="btn btn-danger-soft btn-sm" type="button" data-action="open-refund" data-id="${esc(
      order.id
    )}">Refund</button>
    <button class="btn btn-success btn-sm" type="button" data-action="admin-release" data-id="${esc(
      order.id
    )}">Release</button>
  </div>`;
}

function listingModeration(listing) {
  const status = listingStatus(listing);
  if (status === "PENDING")
    return `<button class="btn btn-primary btn-sm" type="button" data-action="approve-listing" data-id="${esc(
      listing.id
    )}">${icon("check")}Approve</button>`;
  if (status === "ACTIVE")
    return `<button class="btn btn-danger-soft btn-sm" type="button" data-action="pause-listing" data-id="${esc(
      listing.id
    )}">Pause</button>`;
  if (status === "PAUSED")
    return `<button class="btn btn-secondary btn-sm" type="button" data-action="resume-listing" data-id="${esc(
      listing.id
    )}">Resume</button>`;
  return listingBadge(listing);
}

export function render() {
  const root = pageRoot();
  if (!root) return;

  if (currentRole() !== "admin") {
    root.innerHTML = roleGate({
      role: "admin",
      title: "Admin console access",
      text: "Escrow oversight and moderation are limited to the demo operations account.",
      iconName: "shield"
    });
    return;
  }

  const state = getState();
  const metrics = platformMetrics();
  const disputed = metrics.disputes;
  const pending = metrics.pendingListings;
  const openTickets = metrics.openTickets;
  const pendingKyc = metrics.pendingKyc;
  const buyers = metrics.buyers;
  const buyerKycPending = state.profile.buyerKycRequest?.status === "PENDING";
  const passPending = state.profile.passRequest?.status === "PENDING";
  const pendingUsers =
    pendingKyc.length + (buyerKycPending ? 1 : 0) + (passPending ? 1 : 0);
  const orders = [...state.orders].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt)
  );
  const heldOrders = orders.filter((order) => order.escrow !== "REFUNDED");

  const content = `
    <section id="dashboard" class="stack">
      <div class="kpi-grid">
        ${kpiCard({
          label: "Platform GMV",
          value: peso(metrics.gmv),
          sub: `${metrics.orders} orders · demo history`
        })}
        ${kpiCard({
          tone: "green",
          label: "Held in escrow",
          value: peso(metrics.held),
          sub: `Commission booked ${peso(metrics.commission)}`
        })}
        ${kpiCard({
          tone: metrics.frozen ? "red" : "green",
          label: "Frozen by claims",
          value: peso(metrics.frozen),
          sub: `${disputed.length} active dispute${disputed.length === 1 ? "" : "s"}`
        })}
        ${kpiCard({
          tone: "amber",
          label: "Reserve held",
          value: peso(metrics.reserveHeld),
          sub: `${POLICY.reserveDays}-day seller reserve`
        })}
      </div>

      <div class="dash-split">
        <section class="card">
          <div class="card-head card-head--row">
            <div>
              <h2 class="card-title">Escrow health</h2>
              <p>Every peso is either held, frozen, released, or refunded.</p>
            </div>
            ${badge(
              metrics.frozen ? "Review needed" : "Balanced",
              metrics.frozen ? "warn" : "ok"
            )}
          </div>
          <div class="summary-list">
            <div class="summary-row"><span>Held for validation</span><b>${peso(
              metrics.held
            )}</b></div>
            <div class="summary-row"><span>Frozen by claims</span><b>${peso(
              metrics.frozen
            )}</b></div>
            <div class="summary-row"><span>Commission booked</span><b>${peso(
              metrics.commission
            )}</b></div>
            <div class="summary-row"><span>Reserve held</span><b>${peso(
              metrics.reserveHeld
            )}</b></div>
            <div class="summary-row summary-row--total"><span>Total tracked</span><b>${peso(
              metrics.held + metrics.frozen + metrics.commission + metrics.reserveHeld
            )}</b></div>
          </div>
          <div class="mt-16">${meter(
            metrics.held,
            Math.max(metrics.held + metrics.frozen, 1),
            "ok"
          )}</div>
          <p class="small mt-8">${pct(
            metrics.held,
            Math.max(metrics.held + metrics.frozen, 1)
          )}% of open escrow is on a normal validation path.</p>
        </section>

        <aside class="stack">
          <div class="card">
            <div class="card-head"><h3>Queues</h3></div>
            <div class="action-list">
              <a class="action-card action-card--danger" href="#disputes">
                <span class="action-icon">${icon("gavel")}</span>
                <span class="action-body"><b>Dispute queue</b><span>${disputed.length} frozen order${
    disputed.length === 1 ? "" : "s"
  }</span></span>
                ${icon("chevron-right")}
              </a>
              <a class="action-card action-card--warn" href="#moderation">
                <span class="action-icon">${icon("layers")}</span>
                <span class="action-body"><b>Moderation</b><span>${pending.length} listing${
    pending.length === 1 ? "" : "s"
  } awaiting review</span></span>
                ${icon("chevron-right")}
              </a>
              <a class="action-card action-card--info" href="#support">
                <span class="action-icon">${icon("message")}</span>
                <span class="action-body"><b>Support queue</b><span>${openTickets.length} open ticket${
    openTickets.length === 1 ? "" : "s"
  }</span></span>
                ${icon("chevron-right")}
              </a>
              <a class="action-card action-card--warn" href="#users">
                <span class="action-icon">${icon("users")}</span>
                <span class="action-body"><b>Users</b><span>${buyers.length} buyer${
    buyers.length === 1 ? "" : "s"
  } · ${state.sellers.length} sellers · ${pendingUsers} pending</span></span>
                ${icon("chevron-right")}
              </a>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section id="disputes" class="portal-section">
      <div class="portal-section-head">
        <div>
          <h2>Dispute queue</h2>
          <p>Frozen escrow can only move when evidence review closes. The platform never keeps disputed funds.</p>
        </div>
        ${badge(`${disputed.length} open`, disputed.length ? "bad" : "ok")}
      </div>
      ${
        disputed.length
          ? `<div class="table-wrap"><table class="data-table">
              <thead><tr><th>Order</th><th>Claim</th><th>Seller</th><th class="num">Frozen</th><th></th></tr></thead>
              <tbody>
                ${disputed
                  .map(
                    (order) => `<tr>
                      <td><div class="cell-main">
                        <img class="thumb" src="${esc(order.image)}" alt="" />
                        <div><b>${esc(order.id)}</b><span class="cell-sub">${esc(
                      order.title
                    )}</span></div>
                      </div></td>
                      <td>${orderBadge(order)}<span class="cell-sub">${esc(
                      order.disputeReason ||
                        order.doaNote ||
                        "Claim under review"
                    )}</span></td>
                      <td><b>${esc(order.seller)}</b><span class="cell-sub">${esc(
                      order.courier
                    )} · ${esc(order.tracking || "no tracking")}</span></td>
                      <td class="num"><b>${peso(order.total)}</b><span class="cell-sub">${escrowBadge(
                      order
                    )}</span></td>
                      <td>${disputeActions(order)}</td>
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table></div>`
          : emptyState({
              iconName: "gavel",
              title: "No open disputes",
              text: "Frozen escrow appears here the moment a buyer opens a claim."
            })
      }
    </section>

    <section id="escrow" class="portal-section">
      <div class="portal-section-head">
        <div>
          <h2>Escrow orders</h2>
          <p>Releases are automatic at the end of validation, or manual after evidence review.</p>
        </div>
        ${badge(`${orders.length} total`, "neutral")}
      </div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Order</th><th>Status</th><th>Escrow</th><th class="num">Total</th><th class="num">Net seller</th><th></th></tr></thead>
        <tbody>
          ${heldOrders
            .map(
              (order) => `<tr>
                <td><div class="cell-main">
                  <img class="thumb" src="${esc(order.image)}" alt="" />
                  <div><b>${esc(order.id)}</b><span class="cell-sub">${esc(
                order.title
              )} · ${esc(order.seller)}</span></div>
                </div></td>
                <td>${orderBadge(order)}</td>
                <td>${escrowBadge(order)}<span class="cell-sub">${esc(
                order.pspEscrowId
              )}</span></td>
                <td class="num"><b>${peso(order.total)}</b><span class="cell-sub">${fmtDate(
                order.createdAt
              )}</span></td>
                <td class="num">${peso(netOf(order))}</td>
                <td><div class="row-actions">
                  <a class="btn btn-ghost btn-sm" href="orders.html?order=${encodeURIComponent(
                    order.id
                  )}">Open</a>
                  ${
                    order.status === "PAID"
                      ? `<button class="btn btn-secondary btn-sm" type="button" data-action="ship-order" data-id="${esc(
                          order.id
                        )}">Ship</button>`
                      : ""
                  }
                  ${
                    order.status === "SHIPPED"
                      ? `<button class="btn btn-secondary btn-sm" type="button" data-action="deliver-order" data-id="${esc(
                          order.id
                        )}">Deliver</button>`
                      : ""
                  }
                </div></td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table></div>
    </section>

    <section id="moderation" class="portal-section">
      <div class="portal-section-head">
        <div>
          <h2>Moderation</h2>
          <p>Pending listings stay hidden from the marketplace until approved.</p>
        </div>
        ${badge(`${pending.length} pending`, pending.length ? "warn" : "ok")}
      </div>
      <div class="dash-grid dash-grid--halves">
        <div class="card">
          <div class="card-head"><h3>Pending review</h3></div>
          ${
            pending.length
              ? `<div class="stack stack--sm">
                  ${pending
                    .map(
                      (listing) => `<div class="order-item">
                        <img src="${esc(listingImage(listing))}" alt="" />
                        <div>
                          <b>${esc(listing.title)}</b>
                          <span>${esc(listing.category)} · Grade ${esc(
                        listing.grade
                      )} · ${peso(listing.price)}</span>
                          <span>Seller: ${esc(
                            state.sellers.find((s) => s.id === listing.sellerId)?.name ||
                              listing.sellerId
                          )}</span>
                        </div>
                        ${listingModeration(listing)}
                      </div>`
                    )
                    .join("")}
                </div>`
              : `<p class="small">Nothing waiting. New listings with unverified sellers appear here.</p>`
          }
        </div>
        <div class="card">
          <div class="card-head"><h3>Live inventory</h3></div>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Listing</th><th>Status</th><th class="num">Price</th><th></th></tr></thead>
            <tbody>
              ${state.listings
                .filter((listing) => listingStatus(listing) !== "PENDING")
                .slice(0, 7)
                .map(
                  (listing) => `<tr>
                    <td><div class="cell-main">
                      <img class="thumb" src="${esc(listingImage(listing))}" alt="" />
                      <div><b>${esc(listing.title)}</b><span class="cell-sub">${esc(
                    listing.category
                  )} · ${Number(listing.views || 0)} views</span></div>
                    </div></td>
                    <td>${listingBadge(listing)}</td>
                    <td class="num">${peso(listing.price)}</td>
                    <td><div class="row-actions">${listingModeration(listing)}</div></td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table></div>
        </div>
      </div>
    </section>

    <section id="users" class="portal-section">
      <div class="portal-section-head">
        <div>
          <h2>Users</h2>
          <p>Buyers and sellers are listed separately. Approve identity checks and Pass plan changes, then work the support queue below.</p>
        </div>
        <div class="row">
          ${badge(`${buyers.length} buyers · ${state.sellers.length} sellers`, "neutral")}
          ${badge(`${pendingUsers} pending`, pendingUsers ? "warn" : "ok")}
        </div>
      </div>

      <div class="card" id="buyers">
        <div class="card-head card-head--row">
          <div>
            <h3>Buyers</h3>
            <p>Registered buyer accounts and their identity status.</p>
          </div>
          ${badge(
            buyerKycPending ? "KYC request pending" : "No pending KYC",
            buyerKycPending ? "warn" : "neutral"
          )}
        </div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Buyer</th><th>Username</th><th>Identity</th><th class="num">30-day volume</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            ${buyers
              .map((account) => {
                const isPrimary =
                  String(account.email).trim().toLowerCase() ===
                  String(state.profile.email).trim().toLowerCase();
                const username =
                  account.username ||
                  (isPrimary ? state.profile.username : "") ||
                  "—";
                const photo = isPrimary ? state.profile.avatar : account.avatar;
                const kycState = isPrimary
                  ? state.profile.buyerKyc
                    ? "VERIFIED"
                    : buyerKycPending
                    ? "PENDING"
                    : "NONE"
                  : "NONE";
                const kycPill =
                  kycState === "VERIFIED"
                    ? badge("Verified", "ok")
                    : kycState === "PENDING"
                    ? badge("Awaiting approval", "warn")
                    : badge("Not requested", "neutral");
                return `<tr>
                  <td><div class="cell-main">
                    <span class="avatar">
                      ${photo ? `<img src="${esc(photo)}" alt="" />` : esc(initials(account.name))}
                    </span>
                    <div><b>${esc(account.name)}</b><span class="cell-sub">${esc(
                      account.email
                    )}</span></div>
                  </div></td>
                  <td><b>@${esc(username)}</b>${account.demo ? badge("Demo", "neutral") : ""}</td>
                  <td>${kycPill}</td>
                  <td class="num">${
                    isPrimary ? peso(monthlyVolume()) : "—"
                  }<span class="cell-sub">${
                    isPrimary
                      ? `of ${peso0(POLICY.kycMonthlyVolume)} cap`
                      : "No orders"
                  }</span></td>
                  <td>${fmtDate(account.createdAt)}</td>
                  <td><div class="row-actions">
                    ${
                      isPrimary && buyerKycPending
                        ? `<button class="btn btn-primary btn-sm" type="button" data-action="buyer-kyc" data-status="VERIFIED">Approve</button>
                           <button class="btn btn-danger-soft btn-sm" type="button" data-action="buyer-kyc" data-status="REJECTED">Reject</button>`
                        : kycState === "VERIFIED"
                        ? badge("Approved", "ok")
                        : `<span class="small">No request</span>`
                    }
                  </div></td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table></div>
        ${
          buyers.length
            ? ""
            : emptyState({
                iconName: "users",
                title: "No buyer accounts",
                text: "New buyer registrations appear here."
              })
        }
      </div>

      <div class="card mt-16" id="sellers">
        <div class="card-head card-head--row">
          <div>
            <h3>Sellers</h3>
            <p>Seller KYC, storefront tier, and pending Pass plan changes.</p>
          </div>
          ${badge(
            `${pendingKyc.length} KYC · ${passPending ? 1 : 0} pass`,
            pendingKyc.length || passPending ? "warn" : "ok"
          )}
        </div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Seller</th><th>KYC</th><th>Tier</th><th>Plan request</th><th class="num">Rating</th><th class="num">Orders</th><th></th></tr></thead>
          <tbody>
            ${state.sellers
              .map((seller) => {
                const sellerStat = sellerMetrics(seller.id);
                const sellerPassPending = passPending && seller.id === "S-02";
                const request = state.profile.passRequest;
                return `<tr>
                  <td><div class="cell-main">
                    <span class="avatar">${esc(
                      seller.name
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()
                    )}</span>
                    <div><b>${esc(seller.name)}</b><span class="cell-sub">${esc(
                      seller.city
                    )} · ${esc(seller.email)}</span></div>
                  </div></td>
                  <td>${kycBadge(seller)}</td>
                  <td>${tierBadge(seller)}<span class="cell-sub">${esc(
                    tierOf(seller)
                  )} · ${sellerStat.live.length} live</span></td>
                  <td>${
                    sellerPassPending
                      ? `${badge(
                          request?.plan === "CANCEL"
                            ? "Cancel requested"
                            : request?.plan === "PRO"
                            ? "Pro requested"
                            : "Single pass requested",
                          "warn"
                        )}
                         <div class="row-actions mt-8">
                           <button class="btn btn-primary btn-sm" type="button" data-action="pass-request" data-status="APPROVED">Approve</button>
                           <button class="btn btn-danger-soft btn-sm" type="button" data-action="pass-request" data-status="REJECTED">Reject</button>
                         </div>`
                      : badge("None", "neutral")
                  }</td>
                  <td class="num">${seller.rating ? `★ ${Number(seller.rating).toFixed(1)}` : "—"}</td>
                  <td class="num">${Number(seller.orders || 0)}</td>
                  <td><div class="row-actions">
                    ${
                      seller.kyc === "PENDING"
                        ? `<button class="btn btn-primary btn-sm" type="button" data-action="seller-kyc" data-id="${esc(
                            seller.id
                          )}" data-status="VERIFIED">Verify</button>
                           <button class="btn btn-danger-soft btn-sm" type="button" data-action="seller-kyc" data-id="${esc(
                             seller.id
                           )}" data-status="REJECTED">Reject</button>`
                        : `<button class="btn btn-ghost btn-sm" type="button" data-action="suspend-seller" data-id="${esc(
                            seller.id
                          )}">${
                            seller.status === "SUSPENDED" ? "Reinstate" : "Suspend"
                          }</button>`
                    }
                  </div></td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table></div>
      </div>

      <div class="card mt-16" id="support">
        <div class="card-head card-head--row">
          <div>
            <h3>Support queue</h3>
            <p>Resolve tickets once evidence review or the courier issue is closed.</p>
          </div>
          ${badge(`${openTickets.length} open`, openTickets.length ? "warn" : "ok")}
        </div>
        ${
          state.tickets.length
            ? `<div class="table-wrap"><table class="data-table">
                <thead><tr><th>Ticket</th><th>Category</th><th>Opened</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  ${state.tickets
                    .map(
                      (ticket) => `<tr>
                        <td><b>${esc(ticket.id)}</b><span class="cell-sub">${esc(
                        ticket.subject
                      )}</span></td>
                        <td>${badge(ticket.category, "neutral")}</td>
                        <td>${fmtDate(ticket.createdAt)}<span class="cell-sub">${
                        ticket.orderId ? esc(ticket.orderId) : "No order"
                      }</span></td>
                        <td>${
                          ticket.status === "OPEN"
                            ? badge("Open", "warn")
                            : badge("Resolved", "ok")
                        }</td>
                        <td><div class="row-actions">
                          ${
                            ticket.status === "OPEN"
                              ? `<button class="btn btn-secondary btn-sm" type="button" data-action="resolve-ticket" data-id="${esc(
                                  ticket.id
                                )}">Resolve</button>`
                              : ""
                          }
                        </div></td>
                      </tr>`
                    )
                    .join("")}
                </tbody>
              </table></div>`
            : emptyState({ iconName: "message", title: "No tickets" })
        }
      </div>
    </section>

    <section id="policy" class="portal-section">
      <div class="portal-section-head">
        <div>
          <h2>Policy guardrails</h2>
          <p>The same constants drive buyer checkout, seller payout previews, and this console.</p>
        </div>
        ${badge("Locked constants", "brand")}
      </div>
      <div class="dash-grid dash-grid--thirds">
        <div class="card">
          <div class="card-head"><h3>Money</h3></div>
          <ul class="policy-list">
            <li>${icon("check")}Commission ${POLICY.commissionRate * 100}% · ${peso0(
              POLICY.commissionFloor
            )} floor.</li>
            <li>${icon("check")}Reserve ${POLICY.reserveRate * 100}% for ${
              POLICY.reserveDays
            } days.</li>
            <li>${icon("check")}Buyer pays no platform fee.</li>
            <li>${icon("check")}Refunds are full-value, including shipping.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-head"><h3>Time</h3></div>
          <ul class="policy-list">
            <li>${icon("check")}Validation ${POLICY.autoReleaseHours}h on every tier.</li>
            <li>${icon("check")}DOA cover ${POLICY.doaDays} days after delivery.</li>
            <li>${icon("check")}Support ${POLICY.supportSlaHours}h · Pro ${
              POLICY.supportProSlaHours
            }h.</li>
            <li>${icon("check")}Evidence audits run weekly on 10% of Pass stock.</li>
          </ul>
        </div>
        <div class="card">
          <div class="card-head"><h3>Identity</h3></div>
          <ul class="policy-list">
            <li>${icon("check")}KYC above ${peso0(POLICY.kycMonthlyVolume)} monthly volume.</li>
            <li>${icon("check")}Seller ID and payout account verified before listing.</li>
            <li>${icon("check")}Pass badge requires all five evidence items.</li>
            <li>${icon("check")}Suspension hides listings and freezes payouts.</li>
          </ul>
        </div>
      </div>
    </section>`;

  root.innerHTML = portalShell({
    role: "admin",
    active: "dashboard",
    topbarTitle: "Admin console",
    eyebrow: "Platform operations · escrow oversight",
    heading: "Dashboard",
    sub: "Escrow movement, disputes, listing moderation, users, and support — all over the same local demo state.",
    actions: `<a class="btn btn-secondary" href="marketplace.html">${icon(
      "store"
    )}View marketplace</a><a class="btn btn-secondary" href="account.html">${icon(
      "user"
    )}Buyer account</a>`,
    content
  });
}
