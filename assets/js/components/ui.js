/* ==========================================================================
   Silicon Trading — reusable markup components
   ========================================================================== */

import { icon } from "../core/icons.js";
import { esc, peso, fmtDate, fmtShort, initials, pct, clockLeft } from "../core/utils.js";
import {
  escrowMeta,
  listingImage,
  listingStatusMeta,
  orderStatusMeta,
  sellerOf,
  tierOf,
  tierTone
} from "../core/selectors.js";

const TONES = new Set(["ok", "warn", "bad", "info", "brand", "neutral", "teal"]);

export function badge(label, tone = "neutral", extra = "") {
  const safeTone = TONES.has(tone) ? tone : "neutral";
  return `<span class="pill pill--${safeTone} ${extra}">${esc(label)}</span>`;
}

export const listingBadge = (listing) => {
  const meta = listingStatusMeta(listing);
  return badge(meta.label, meta.tone);
};

export const orderBadge = (order) => {
  const meta = orderStatusMeta(order);
  return badge(meta.label, meta.tone);
};

export const escrowBadge = (order) => {
  const meta = escrowMeta(order);
  return badge(meta.label, meta.tone);
};

export const tierBadge = (seller) =>
  badge(tierOf(seller), tierTone(seller));

export const kycBadge = (seller) => {
  if (seller.kyc === "VERIFIED") return badge("KYC verified", "ok");
  if (seller.kyc === "PENDING") return badge("KYC pending", "warn");
  return badge("KYC suspended", "bad");
};

export function avatar(name, size = "") {
  return `<span class="avatar ${size}" aria-hidden="true">${esc(
    initials(name)
  )}</span>`;
}

export function kpiCard({ tone = "blue", label, value, sub = "", href, action }) {
  const modifier = tone === "blue" ? "" : ` kpi--${tone}`;
  return `<article class="kpi${modifier}">
    <p class="kpi-label">${esc(label)}</p>
    <p class="kpi-value">${esc(value)}</p>
    <p class="kpi-sub">${sub}</p>
    ${
      href && action
        ? `<a class="kpi-action" href="${href}">${esc(action)} &rarr;</a>`
        : ""
    }
  </article>`;
}

export function emptyState({ iconName = "box", title, text = "", cta = "" }) {
  return `<div class="empty">
    <span class="empty-icon">${icon(iconName, "icon--lg")}</span>
    <h3>${esc(title)}</h3>
    ${text ? `<p>${esc(text)}</p>` : ""}
    ${cta}
  </div>`;
}

export function productCard(listing, { saved = false } = {}) {
  const seller = sellerOf(listing);
  return `<article class="product">
    <div class="product-media">
      <a href="listing.html?id=${encodeURIComponent(listing.id)}" aria-label="${esc(
    listing.title
  )}">
        <img src="${esc(listingImage(listing))}" alt="${esc(
    listing.title
  )}" loading="lazy" />
      </a>
      ${listing.pass ? badge("Verified Pass", "teal") : `<span class="pill pill--neutral">Grade ${esc(listing.grade)}</span>`}
      <button type="button" class="product-save ${saved ? "is-saved" : ""}" data-action="toggle-saved" data-id="${esc(
    listing.id
  )}" aria-pressed="${saved}" aria-label="${saved ? "Remove from saved" : "Save part"}">
        ${icon("heart")}
      </button>
    </div>
    <div class="product-body">
      <div class="product-meta">
        <span>${esc(listing.category)}</span>
        <span>${esc(listing.condition)}</span>
      </div>
      <h3 class="product-title">
        <a href="listing.html?id=${encodeURIComponent(listing.id)}">${esc(
    listing.title
  )}</a>
      </h3>
      <p class="product-seller">
        ${seller?.verified ? icon("badge-check") : ""}
        ${esc(seller?.name || "Independent seller")} · ${esc(seller?.city || "PH")}
      </p>
      <div class="product-foot">
        <p class="product-price">${peso(listing.price, 0)}<small>${esc(
    listing.shipsIn
  )} shipping</small></p>
        <a class="product-cta" href="listing.html?id=${encodeURIComponent(
          listing.id
        )}">View ${icon("chevron-right")}</a>
      </div>
    </div>
  </article>`;
}

export function ticketCard(ticket) {
  const open = ticket.status === "OPEN";
  const sla = open
    ? `<span class="countdown ${ticket.dueAt - Date.now() < 0 ? "is-urgent" : ""}" data-countdown="${ticket.dueAt}">${icon(
        "clock"
      )}<span>${ticket.dueAt - Date.now() < 0 ? "SLA breached" : "SLA"}</span></span>`
    : "";
  return `<article class="ticket-card">
    <div class="ticket-card-top">
      <span class="mono">${esc(ticket.id)}</span>
      ${badge(ticket.category, "neutral")}
      ${open ? badge("Open", "warn") : badge("Resolved", "ok")}
      ${sla}
    </div>
    <h3>${esc(ticket.subject)}</h3>
    <p>${esc(ticket.message)}</p>
    <div class="ticket-meta">
      <span>Opened ${fmtDate(ticket.createdAt)}</span>
      ${ticket.orderId ? `<span>Order ${esc(ticket.orderId)}</span>` : ""}
      ${
        ticket.resolvedAt
          ? `<span>Resolved ${fmtDate(ticket.resolvedAt)}</span>`
          : `<span>${ticket.slaHours}h SLA</span>`
      }
    </div>
  </article>`;
}

export function orderCard(order) {
  return `<a class="order-card" href="orders.html?order=${encodeURIComponent(
    order.id
  )}">
    <img src="${esc(order.image)}" alt="" loading="lazy" />
    <div class="order-card-body">
      <div class="order-card-top">
        <b>${esc(order.id)}</b>
        <span>·</span>
        <span>${fmtShort(order.createdAt)}</span>
        ${orderBadge(order)}
        ${escrowBadge(order)}
      </div>
      <h3>${esc(order.title)}</h3>
      <div class="order-card-meta">
        <span>${esc(order.seller)}</span>
        <span>·</span>
        <span>${esc(order.courier)}</span>
        ${
          order.tracking
            ? `<span>·</span><span class="mono">${esc(order.tracking)}</span>`
            : ""
        }
      </div>
    </div>
    <div class="order-card-right">
      <b>${peso(order.total)}</b>
      <span>${escrowMeta(order).label}</span>
    </div>
  </a>`;
}

export function savedItem(listing) {
  return `<a class="saved-item" href="listing.html?id=${encodeURIComponent(
    listing.id
  )}">
    <img src="${esc(listingImage(listing))}" alt="" loading="lazy" />
    <div>
      <b>${esc(listing.title)}</b>
      <span>${peso(listing.price, 0)} · ${esc(listing.grade)} grade</span>
    </div>
  </a>`;
}

export function meter(value, max, tone = "") {
  const percent = pct(value, max);
  return `<div class="meter ${tone ? `meter--${tone}` : ""}" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}">
    <span style="width:${percent}%"></span>
  </div>`;
}

export function actionCard({ tone = "", iconName = "info", title, meta, href = "#", action = "" }) {
  return `<a class="action-card ${tone ? `action-card--${tone}` : ""}" href="${href}" ${
    action ? `data-action="${action}"` : ""
  }>
    <span class="action-icon">${icon(iconName)}</span>
    <span class="action-body">
      <b>${esc(title)}</b>
      <span>${esc(meta)}</span>
    </span>
    ${icon("chevron-right")}
  </a>`;
}

export function countdown(order) {
  const deadline = order.validationEndsAt;
  if (!deadline || order.escrow !== "HELD") return "";
  const urgent = deadline - Date.now() < 12 * 3600e3;
  return `<span class="countdown ${urgent ? "is-urgent" : ""}" data-countdown="${deadline}" data-countdown-format="clock">${icon(
    "clock"
  )}<span data-countdown-text>${clockLeft(deadline - Date.now())}</span></span>`;
}

export function fact(label, value) {
  return `<div class="order-fact"><span>${esc(label)}</span><b>${value}</b></div>`;
}
