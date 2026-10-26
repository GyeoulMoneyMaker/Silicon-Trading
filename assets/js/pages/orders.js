/* ==========================================================================
   Orders — list with tabs, plus escrow order detail and demo operations
   ========================================================================== */

import { icon } from "../core/icons.js";
import { ORDER_TABS } from "../core/config.js";
import {
  esc,
  fmtDate,
  fmtDateTime,
  daysLeft,
  pageRoot,
  param,
  peso,
  setParams
} from "../core/utils.js";
import {
  ordersForTab,
  tabCounts,
  netOf,
  sellerById,
  tierOf
} from "../core/selectors.js";
import { getState } from "../core/store.js";
import {
  badge,
  emptyState,
  orderBadge,
  escrowBadge,
  orderCard,
  countdown,
  fact,
  tierBadge
} from "../components/ui.js";

let activeTab = param("tab") || "all";
if (!ORDER_TABS.some((tab) => tab.key === activeTab)) activeTab = "all";

function orderTimeline(order) {
  const items = order.timeline || [];
  const terminal = ["COMPLETED", "REFUNDED", "CANCELLED"].includes(order.status);
  return `<ol class="timeline">
    ${items
      .map(
        (item, index) => `<li>
          <span class="timeline-dot"></span>
          <div class="timeline-body">
            <b>${esc(item.label)}</b>
            <span>${esc(item.detail)}</span>
            <time>${fmtDateTime(item.at)}${
          index === items.length - 1 && !terminal ? " · current" : ""
        }</time>
          </div>
        </li>`
      )
      .join("")}
  </ol>`;
}

function returnLabel(order) {
  if (!order.returnLabel) return "";
  const scanned = order.doaStatus === "RETURN_IN_TRANSIT";
  return `<div class="card card--brand mt-16">
    <div class="card-head card-head--row">
      <div>
        <h3>${icon("truck")} Platform-generated return label</h3>
        <p>Prepaid by the platform. Refund clears after the first carrier scan.</p>
      </div>
      ${badge(scanned ? "In transit" : "Awaiting drop-off", scanned ? "info" : "warn")}
    </div>
    <div class="summary-row">
      <span class="mono">${esc(order.returnLabel)}</span>
      <button class="btn btn-secondary btn-sm" type="button" data-action="copy-text" data-text="${esc(
        order.returnLabel
      )}">${icon("doc")}Copy</button>
    </div>
    <p class="small mt-8">${esc(order.courier)} · insured return · attach the printed label to the original packaging.</p>
  </div>`;
}

function doaCover(order) {
  if (!order.doaEndsAt) return "";
  const left = order.doaEndsAt - Date.now();
  if (left <= 0) return "";
  return `<span class="countdown" data-countdown="${order.doaEndsAt}" data-countdown-format="days">${icon(
    "shield"
  )}<span data-countdown-text>${daysLeft(left)}</span></span>`;
}

function demoControls(order) {
  const buttons = [];
  const add = (action, label, style = "btn-secondary", attrs = "") =>
    buttons.push(`<button class="btn btn-sm ${style}" type="button" data-action="${action}" data-id="${esc(
      order.id
    )}" ${attrs}>${label}</button>`);

  if (order.status === "PAID") {
    add("ship-order", `${icon("truck")}Seller ships`, "btn-primary");
    add("open-refund", `${icon("arrow-left")}Refund &amp; cancel`, "btn-danger-soft");
  }
  if (order.status === "SHIPPED") {
    add("deliver-order", `${icon("package")}Mark delivered`, "btn-primary");
  }
  if (order.status === "DELIVERED") {
    add("release-order", `${icon("check")}Release escrow`, "btn-primary");
    add("force-auto-release", `${icon("clock")}Simulate 72h auto-release`);
    if (!order.extensionUsed) add("extend-validation", `${icon("plus")}Extend +48h`);
    add("open-dispute", `${icon("alert")}Raise dispute`, "btn-danger-soft");
  }
  if (
    order.status === "COMPLETED" &&
    order.doaEndsAt &&
    Date.now() < order.doaEndsAt
  ) {
    add("open-doa", `${icon("shield")}Claim DOA`, "btn-danger-soft");
  }
  if (order.status === "DISPUTED" || order.status === "DOA_CLAIM") {
    add("admin-release", `${icon("check")}Ruling · release to seller`, "btn-success");
    add("open-refund", `${icon("arrow-left")}Ruling · refund buyer`, "btn-danger");
    if (order.returnLabel && order.doaStatus !== "RETURN_IN_TRANSIT") {
      add("return-scan", `${icon("scan")}Simulate return scan`);
    }
  }

  if (!buttons.length) return "";
  return `<div class="card demo-box">
    <h3>${icon("play")}Demo controls</h3>
    <p>Move this order through the escrow lifecycle. Every action is persisted locally.</p>
    <div class="demo-actions">${buttons.join("")}</div>
  </div>`;
}

function sellerControls(order) {
  const buttons = [];
  const add = (action, label, style = "btn-secondary") =>
    buttons.push(`<button class="btn btn-sm ${style}" type="button" data-action="${action}" data-id="${esc(
      order.id
    )}">${label}</button>`);

  if (order.status === "PAID") {
    add("ship-order", `${icon("truck")}Mark shipped`, "btn-primary");
  }
  if (order.status === "SHIPPED") {
    add("deliver-order", `${icon("package")}Mark delivered`, "btn-primary");
  }
  if (order.status === "DISPUTED" || order.status === "DOA_CLAIM") {
    buttons.push(
      `<a class="btn btn-danger-soft btn-sm" href="support.html?order=${encodeURIComponent(
        order.id
      )}">${icon("gavel")}Open evidence thread</a>`
    );
  }

  if (!buttons.length) return "";
  return `<div class="card demo-box">
    <h3>${icon("play")}Fulfilment actions</h3>
    <p>Seller actions stay inside the workspace. Escrow release and disputes belong to the buyer or platform.</p>
    <div class="demo-actions">${buttons.join("")}</div>
  </div>`;
}

export function orderDetailMarkup(
  order,
  {
    context = "buyer",
    wrap = true,
    backHref = "orders.html",
    backLabel = "Orders"
  } = {}
) {
  const state = getState();
  const seller = sellerById(order.sellerId);
  const listing = state.listings.find((item) => item.id === order.listingId);
  const claimed = order.status === "DISPUTED" || order.status === "DOA_CLAIM";
  const controls =
    context === "seller" ? sellerControls(order) : demoControls(order);

  return `${wrap ? '<div class="container">' : ""}
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="${esc(backHref)}">${esc(backLabel)}</a>${icon("chevron-right")}
        <span>${esc(order.id)}</span>
      </nav>

      <div class="order-detail-head">
        <div>
          <p class="eyebrow">${icon("box")}Escrow order</p>
          <h1>${esc(order.id)}</h1>
          <div class="row">
            ${orderBadge(order)}
            ${escrowBadge(order)}
            <span class="small">Placed ${fmtDate(order.createdAt)}</span>
            ${doaCover(order)}
          </div>
        </div>
        <div class="row">
          <a class="btn btn-secondary btn-sm" href="support.html?order=${encodeURIComponent(
            order.id
          )}">${icon("message")}Get help</a>
          ${
            listing
              ? `<a class="btn btn-secondary btn-sm" href="listing.html?id=${encodeURIComponent(
                  listing.id
                )}">${icon("external")}View listing</a>`
              : ""
          }
        </div>
      </div>

      <div class="orders-layout mt-24">
        <div class="stack">
          ${
            countdown(order)
              ? `<div class="card"><div class="card-head card-head--row"><div><h3>Validation window</h3><p>Escrow releases automatically at zero.</p></div>${countdown(
                  order
                )}</div>
                <p class="small">Boot the part, test every documented function, then release. If it does not match the listing, open a dispute before the countdown ends.</p></div>`
              : ""
          }

          <section class="card">
            <div class="card-head card-head--row">
              <h3>Item</h3>
              ${orderBadge(order)}
            </div>
            <div class="order-item">
              <img src="${esc(order.image)}" alt="" />
              <div>
                <b>${esc(order.title)}</b>
                <span>${esc(order.seller)} · Qty 1 · ${esc(order.courier)}</span>
                <span>${listing ? esc(listing.condition) + " · Grade " + esc(listing.grade) : "Listing snapshot"}</span>
              </div>
              <span class="product-price">${peso(order.total)}</span>
            </div>
            <div class="order-facts mt-16">
              ${fact("Item subtotal", peso(order.subtotal))}
              ${fact("Shipping", peso(order.shipping))}
              ${fact("Held in escrow", order.escrow === "HELD" ? peso(order.total) : "—")}
              ${fact("Payment", esc(order.paymentMethod))}
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <h3>Escrow timeline</h3>
                <p>${esc(order.psp)} · ${esc(order.pspEscrowId)}</p>
              </div>
              ${escrowBadge(order)}
            </div>
            ${orderTimeline(order)}
          </section>

          ${returnLabel(order)}

          ${
            claimed
              ? `<div class="alert alert--danger">${icon("alert")}<span><b>Escrow frozen.</b> ${
                  order.disputeReason || order.doaNote || "A claim is under evidence review."
                } Support compares the listing snapshot, diagnostics, and buyer evidence. The full amount is either released or refunded — the platform never keeps disputed funds.</span></div>`
              : ""
          }

          <div class="card">
            <div class="card-head"><h3>Delivery</h3></div>
            <dl class="kv kv--left">
              <dt>Recipient</dt><dd>${esc(order.address?.recipient || "—")}</dd>
              <dt>Mobile</dt><dd>${esc(order.address?.phone || "—")}</dd>
              <dt>Address</dt><dd>${esc(order.address?.landmark || "")}, ${esc(
    order.address?.barangay || ""
  )}, ${esc(order.address?.city || "")} ${esc(order.address?.postal || "")}</dd>
              <dt>Courier</dt><dd>${esc(order.courier)}</dd>
              <dt>Tracking</dt><dd>${
                order.tracking
                  ? `<span class="mono">${esc(order.tracking)}</span>`
                  : "Assigned on hand-over"
              }</dd>
              <dt>Validation ends</dt><dd>${fmtDateTime(
                order.validationEndsAt
              )}</dd>
              <dt>DOA cover ends</dt><dd>${fmtDateTime(order.doaEndsAt)}</dd>
            </dl>
          </div>
        </div>

        <aside class="stack">
          ${controls}

          <div class="card">
            <div class="card-head card-head--row">
              <div>
                <h3>Payment</h3>
                <p>${esc(order.psp)}</p>
              </div>
              <span class="pill pill--neutral">${esc(order.pspEscrowId)}</span>
            </div>
            <div class="summary-list">
              <div class="summary-row"><span>Item</span><b>${peso(
                order.subtotal
              )}</b></div>
              <div class="summary-row"><span>${esc(
                order.courier
              )} shipping</span><b>${peso(order.shipping)}</b></div>
              <div class="summary-row"><span>Buyer fee</span><b>${peso(0)}</b></div>
              <div class="summary-row summary-row--total"><span>Total</span><b>${peso(
                order.total
              )}</b></div>
            </div>
            <div class="summary-list mt-16">
              <div class="summary-row"><span>Seller commission</span><b>${peso(
                order.commission
              )}${order.commissionFloorApplied ? " · ₱20 floor" : " · 8%"}</b></div>
              <div class="summary-row"><span>Seller reserve · 14 days</span><b>${peso(
                order.reserve
              )}</b></div>
              <div class="summary-row"><span>Seller payout</span><b>${peso(
                netOf(order)
              )}</b></div>
            </div>
            <p class="small mt-8">Commission and reserve are deducted from the seller payout, not added to your total.</p>
          </div>

          ${
            seller
              ? `<div class="card">
                  <div class="card-head"><h3>Seller</h3></div>
                  <div class="seller-card" style="margin:0;padding:0;border:0">
                    <span class="avatar">${esc(
                      seller.name
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()
                    )}</span>
                    <div>
                      <b>${esc(seller.name)}</b>
                      <span>${esc(tierOf(seller))} · ★ ${Number(
                    seller.rating || 0
                  ).toFixed(1)} · ${esc(seller.city)}</span>
                    </div>
                    ${tierBadge(seller)}
                  </div>
                  <p class="small mt-16">Dispute history and evidence uploads are visible in the support console during a claim.</p>
                </div>`
              : ""
          }

          <div class="alert">${icon("info")}<span>Demo build: order actions exist so you can see each escrow state. No courier or payment network is contacted.</span></div>
        </aside>
      </div>
    ${wrap ? "</div>" : ""}`;
}

function renderList(root) {
  const list = ordersForTab(activeTab);
  const counts = tabCounts();

  root.innerHTML = `
    <div class="container">
      <header class="page-head">
        <div>
          <p class="eyebrow">${icon("box")}Buyer protection</p>
          <h1>Orders</h1>
          <p>Every order is escrow-protected. Validate within 72 hours of delivery, and keep 7-day DOA cover after release.</p>
        </div>
        <div class="page-head-actions">
          <a class="btn btn-secondary" href="marketplace.html">${icon("search")}Browse parts</a>
        </div>
      </header>

      <div class="tabs" id="order-tabs">
        ${ORDER_TABS.map(
          (tab) => `<button class="tab ${
            activeTab === tab.key ? "is-active" : ""
          }" type="button" data-tab="${tab.key}">
            ${esc(tab.label)}
            <span class="pill pill--neutral">${counts[tab.key] || 0}</span>
          </button>`
        ).join("")}
      </div>

      <div class="orders-list mt-16">
        ${
          list.length
            ? list.map((order) => orderCard(order)).join("")
            : emptyState({
                iconName: "box",
                title: "No orders in this view",
                text: "Orders you place appear here with their escrow state and validation countdown.",
                cta: `<a class="btn btn-primary mt-16" href="marketplace.html">Find a part</a>`
              })
        }
      </div>

      <div class="alert mt-24">${icon("alert")}<span>Demo build: open an order to move it through shipment, delivery, validation, dispute, and the 7-day DOA flow.</span></div>
    </div>`;

  root.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      setParams({ tab: activeTab === "all" ? "" : activeTab });
      render();
    });
  });
}

export function render() {
  const root = pageRoot();
  if (!root) return;

  const id = param("order");
  if (id) {
    const order = getState().orders.find((item) => item.id === id);
    if (!order) {
      root.innerHTML = `<div class="container">${emptyState({
        iconName: "search",
        title: "Order not found",
        text: "That order ID is not in this demo store. Check the order list.",
        cta: `<a class="btn btn-primary mt-16" href="orders.html">Back to orders</a>`
      })}</div>`;
      return;
    }
    root.innerHTML = orderDetailMarkup(order);
    return;
  }

  renderList(root);
}
