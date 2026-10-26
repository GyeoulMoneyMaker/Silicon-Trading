/* ==========================================================================
   Listing detail — evidence, diagnostics, compatibility, buy box
   ========================================================================== */

import { icon } from "../core/icons.js";
import { esc, pageRoot, param, peso, peso0 } from "../core/utils.js";
import { addListingView } from "../core/actions.js";
import {
  listingImage,
  listingStatus,
  publicListings,
  sellerOf
} from "../core/selectors.js";
import { getState } from "../core/store.js";
import {
  badge,
  emptyState,
  productCard,
  tierBadge
} from "../components/ui.js";

const tracked = new Set();

function diagRow(key, value) {
  let status = "na";
  let text = value;
  if (value === true) {
    status = "ok";
    text = "Pass";
  } else if (value === false) {
    status = "bad";
    text = "No";
  } else if (/pass|clean|none|match|verified|intact|checked|reballed|sealed/i.test(String(value))) {
    status = "ok";
  } else if (/fail|damage|trigger|not tested|not included/i.test(String(value))) {
    status = "bad";
  }

  return `<div class="diag-row">
    <span class="diag-status diag-status--${status}">${icon(
    status === "bad" ? "close" : status === "ok" ? "check" : "info"
  )}</span>
    <span>${esc(key)}</span>
    <b>${esc(text)}</b>
  </div>`;
}

export function render() {
  const root = pageRoot();
  if (!root) return;

  const state = getState();
  const listing = state.listings.find((item) => item.id === param("id"));
  const status = listingStatus(listing);

  if (!listing || status === "REMOVED" || status === "PENDING") {
    root.innerHTML = `<div class="container">${emptyState({
      iconName: "box",
      title: "Listing not found",
      text: "This listing may have sold or been removed. Browse current stock instead.",
      cta: `<a class="btn btn-primary mt-16" href="marketplace.html">Browse marketplace</a>`
    })}</div>`;
    return;
  }

  if (!tracked.has(listing.id)) {
    tracked.add(listing.id);
    addListingView(listing.id);
  }

  const seller = sellerOf(listing);
  const saved = state.saved.includes(listing.id);
  const related = publicListings()
    .filter(
      (item) => item.category === listing.category && item.id !== listing.id
    )
    .slice(0, 4);

  const diagKeys = Object.keys(listing.diagnostics || {});
  const notes = (listing.notes || [])
    .map((note) => `<span class="chip">${icon("check")}${esc(note)}</span>`)
    .join("");

  const evidence = listing.evidence
    ? `<div class="evidence-grid">${listing.evidence
        .map(
          (item) => `<div class="evidence-item">${icon("camera")}
            <div><b>${esc(item.label)}</b><span>${esc(item.meta)}</span></div>
          </div>`
        )
        .join("")}</div>`
    : `<div class="alert alert--warn">${icon("alert")}<span>This listing has no Verified Pass evidence pack. The copper badge is not shown.</span></div>`;

  const compatibility = (listing.compat || [])
    .map(
      (device) => `<div class="evidence-item">${icon("check-circle")}
        <div><b>${esc(device)}</b><span>${
        listing.pass ? "Verified fit · evidence on file" : "Tagged fit · catalog-derived"
      }</span></div>
      </div>`
    )
    .join("");

  root.innerHTML = `
    ${
      status === "PAUSED"
        ? `<div class="container mt-24"><div class="alert alert--warn">${icon(
            "alert"
          )}<span>This listing is paused and hidden from the marketplace. It is visible here for the seller preview.</span></div></div>`
        : ""
    }
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="marketplace.html">Marketplace</a>${icon("chevron-right")}
        <a href="marketplace.html?category=${encodeURIComponent(
          listing.category
        )}">${esc(listing.category)}</a>${icon("chevron-right")}
        <span>${esc(listing.device)}</span>
      </nav>

      <div class="listing-layout">
        <div>
          <div class="listing-gallery">
            <div class="gallery-badges">
              ${
                listing.pass
                  ? badge("Verified Pass", "teal")
                  : badge(`Grade ${listing.grade}`, "neutral")
              }
              ${badge(listing.condition, "brand")}
            </div>
            <img id="gallery-main" src="${esc(
              listingImage(listing)
            )}" alt="${esc(listing.title)}" />
            <span class="gallery-note">${icon("shield")}${
    listing.pass
      ? `Evidence pack · audited ${esc(listing.auditedAt || "—")}`
      : "Seller-declared condition"
  }</span>
            <span class="gallery-note" id="gallery-label" style="left:auto;right:16px">${icon(
              "eye"
            )}TOP VIEW</span>
          </div>
          <div class="gallery-thumbs">
            ${["TOP", "CONNECTORS", "MARKINGS", "DIAGNOSTIC"]
              .map(
                (angle, index) => `<button class="gallery-thumb ${
                  index === 0 ? "is-active" : ""
                }" type="button" data-angle="${angle}" aria-label="${angle} view">
                  <img src="${esc(listingImage(listing))}" alt="" />
                </button>`
              )
              .join("")}
          </div>

          <section class="card listing-section">
            <h2>About this part</h2>
            <p class="listing-description">${esc(listing.description)}</p>
            ${notes ? `<div class="chip-row mt-16">${notes}</div>` : ""}
            <dl class="meta-grid mt-24">
              <div class="meta-item"><dt>Part number</dt><dd>${esc(
                listing.partNumber
              )}</dd></div>
              <div class="meta-item"><dt>Device / alias</dt><dd>${esc(
                listing.device
              )} · ${esc(listing.alias)}</dd></div>
              <div class="meta-item"><dt>Condition</dt><dd>Grade ${esc(
                listing.grade
              )} · ${esc(listing.condition)}</dd></div>
              <div class="meta-item"><dt>Water damage</dt><dd>${
                listing.water ? "Disclosed" : "None indicated"
              }</dd></div>
              <div class="meta-item"><dt>Stock</dt><dd>${Number(
                listing.stock
              )} available</dd></div>
              <div class="meta-item"><dt>Ships from</dt><dd>${esc(
                listing.shipsFrom
              )} · ${esc(listing.shipsIn)}</dd></div>
            </dl>
          </section>

          <section class="card listing-section">
            <h2>Diagnostics</h2>
            <p class="small mb-16">${
              listing.pass
                ? `Tested by the seller · evidence on file · spot-audited ${esc(
                    listing.auditedAt
                  )}`
                : "Seller-declared condition. No Verified Pass evidence pack on file."
            }</p>
            <div class="diag-grid">${diagKeys
              .map((key) => diagRow(key, listing.diagnostics[key]))
              .join("")}</div>
          </section>

          <section class="card listing-section">
            <h2>Verified Pass evidence</h2>
            <p class="small mb-16">A Pass badge is only rendered after all five evidence items are uploaded. A 10% weekly sample is spot-audited.</p>
            ${evidence}
          </section>

          <section class="card listing-section">
            <h2>Compatibility</h2>
            <p class="small mb-16">Fit confidence is shown per device. "Verified" requires evidence; "Tagged" is catalog-derived.</p>
            <div class="evidence-grid">${compatibility}</div>
            <div class="alert mt-16">${icon("info")}<span>Cross-model fits are not assumed. If your exact revision is not listed, open a support ticket before buying.</span></div>
          </section>

          <section class="card listing-section">
            <h2>Seller</h2>
            <div class="seller-card" style="margin-top:0;padding-top:0;border-top:0">
              ${`<span class="avatar">${esc(
                (seller?.name || "?")
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()
              )}</span>`}
              <div>
                <b>${esc(seller?.name || "Independent seller")}</b>
                <span>★ ${Number(seller?.rating || 0).toFixed(1)} · ${Number(
    seller?.orders || 0
  )} orders · ${esc(seller?.city || "PH")} · replies in ${esc(
    seller?.response || "—"
  )}</span>
              </div>
              <span class="seller-rating">${icon("star")}${Number(
    seller?.rating || 0
  ).toFixed(1)}</span>
            </div>
            <p class="small mt-16">Member since ${esc(
              seller?.since || "—"
            )} · ID verified · payout account verified. Dispute history is shown in the support console during a claim.</p>
          </section>

          <section class="card listing-section">
            <h2>Shipping &amp; returns</h2>
            <dl class="kv kv--left">
              <dt>Ships from</dt><dd>${esc(listing.shipsFrom)}</dd>
              <dt>Estimated delivery</dt><dd>${esc(listing.shipsIn)}</dd>
              <dt>Validation window</dt><dd>72 hours from delivery — every seller tier</dd>
              <dt>DOA cover</dt><dd>7 days from delivery, including after escrow release</dd>
              <dt>Return label</dt><dd>Platform-generated prepaid label for upheld claims</dd>
              <dt>Payment</dt><dd>Escrow only · no COD</dd>
            </dl>
            <div class="alert alert--success mt-16">${icon(
              "shield"
            )}<span>If the part does not match the listing, freeze escrow from the order page and open a dispute. Evidence is required.</span></div>
          </section>
        </div>

        <aside class="buy-box">
          <div class="row">
            ${badge(`Grade ${listing.grade}`, "neutral")}
            ${badge(listing.condition, "brand")}
            ${listing.pass ? badge("Verified Pass", "teal") : ""}
          </div>
          <h1 class="mt-16" style="font-size:24px">${esc(listing.title)}</h1>
          <p class="small mt-8">Fits ${esc(listing.device)} · ${esc(
    listing.alias
  )} · Part ${esc(listing.partNumber)}</p>

          <div class="buy-price mt-16">
            <b>${peso(listing.price)}</b>
            <span>+ shipping from ${peso0(160)}<br />no buyer platform fee</span>
          </div>

          <div class="summary-list" style="padding:14px 0">
            <div class="summary-row"><span>Item</span><b>${peso(
              listing.price
            )}</b></div>
            <div class="summary-row"><span>ESCROW</span><b>Held by licensed PSP</b></div>
            <div class="summary-row"><span>Validation</span><b>72 hours</b></div>
            <div class="summary-row"><span>DOA cover</span><b>7 days</b></div>
          </div>

          <div class="buy-actions">
            ${
              Number(listing.stock) > 0
                ? `<a class="btn btn-primary btn-lg" href="checkout.html?id=${encodeURIComponent(
                    listing.id
                  )}">${icon("lock")}Buy with escrow</a>`
                : `<button class="btn btn-primary btn-lg" type="button" disabled>Out of stock</button>`
            }
            <button class="btn btn-secondary btn-lg ${
              saved ? "is-saved" : ""
            }" type="button" data-action="toggle-saved" data-id="${esc(
    listing.id
  )}" aria-pressed="${saved}">
              ${icon("heart")}${saved ? "Saved" : "Save for later"}
            </button>
          </div>

          <div class="buy-protect">
            <div class="protect-row">${icon("clock")}<span>72-hour validation window</span></div>
            <div class="protect-row">${icon("shield")}<span>7-day DOA guarantee</span></div>
            <div class="protect-row">${icon("truck")}<span>Prepaid return label if something is wrong</span></div>
            <div class="protect-row">${icon("lock")}<span>No COD — escrow protects both sides</span></div>
          </div>

          <div class="seller-card">
            ${`<span class="avatar">${esc(
              (seller?.name || "?")
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()
            )}</span>`}
            <div>
              <b>${esc(seller?.name || "Independent seller")}</b>
              <span>★ ${Number(seller?.rating || 0).toFixed(1)} · ${esc(
    seller?.city || "PH"
  )}</span>
            </div>
            ${tierBadge(seller)}
          </div>

          <p class="small mt-16">Seller pays the 8% commission (₱20 minimum). You pay the listed price plus shipping — no buyer platform fee.</p>
          <p class="small mt-8"><a class="link-arrow" href="support.html">Report listing or ask a question ${icon(
            "arrow-right"
          )}</a></p>
        </aside>
      </div>

      ${
        related.length
          ? `<section class="section">
              <div class="section-head">
                <div><h2>More ${esc(listing.category.toLowerCase())}</h2></div>
                <a class="link-arrow" href="marketplace.html?category=${encodeURIComponent(
                  listing.category
                )}">See all ${icon("arrow-right")}</a>
              </div>
              <div class="product-grid">${related
                .map((item) =>
                  productCard(item, { saved: state.saved.includes(item.id) })
                )
                .join("")}</div>
            </section>`
          : ""
      }
    </div>`;

  const main = document.getElementById("gallery-main");
  const label = document.getElementById("gallery-label");
  document.querySelectorAll("[data-angle]").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-angle]")
        .forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      if (label)
        label.innerHTML = `${icon("eye")}${button.dataset.angle} VIEW`;
      if (main) {
        main.style.filter =
          button.dataset.angle === "CONNECTORS"
            ? "saturate(1.15) brightness(1.05)"
            : button.dataset.angle === "MARKINGS"
            ? "contrast(1.1) brightness(0.96)"
            : button.dataset.angle === "DIAGNOSTIC"
            ? "saturate(0.8) brightness(1.08)"
            : "none";
      }
    });
  });

  if (listing.pass) {
    root
      .querySelectorAll(".listing-section")
      .forEach((section) => section.classList.add("card"));
  }
}
