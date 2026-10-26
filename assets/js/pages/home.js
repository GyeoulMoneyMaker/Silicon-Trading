/* ==========================================================================
   Home — marketing surface with escrow explainer and live stock
   ========================================================================== */

import { icon } from "../core/icons.js";
import { CATEGORIES, CATEGORY_BLURBS, DEVICES } from "../core/config.js";
import { esc, pageRoot, peso0, plural } from "../core/utils.js";
import {
  listingImage,
  marketplaceFacets,
  publicListings
} from "../core/selectors.js";
import { badge, emptyState, productCard } from "../components/ui.js";

const STEPS = [
  {
    title: "Find the exact part",
    text: "Search by device, part number, or IC marking. Fit confidence is shown before you buy."
  },
  {
    title: "Pay into escrow",
    text: "A licensed PSP holds your payment. The seller only sees a paid order."
  },
  {
    title: "Validate in 72 hours",
    text: "Boot it, test the documented functions, and release only when it matches."
  },
  {
    title: "Covered for 7 days",
    text: "If it fails on arrival after release, the platform funds the refund and return label."
  },
  {
    title: "Seller gets paid",
    text: "Commission and reserve are deducted from the payout — never added to your price."
  }
];

function featuredListings() {
  const live = publicListings();
  const passed = live.filter((listing) => listing.pass);
  return (passed.length ? passed : live).slice(0, 4);
}

export function render() {
  const root = pageRoot();
  if (!root) return;

  const featured = featuredListings();
  const facets = marketplaceFacets();
  const hero = featured[0] || publicListings()[0];

  const categoryCards = CATEGORIES.map((category) => {
    const count = facets.byCategory[category] || 0;
    return `<a class="category-card" href="marketplace.html?category=${encodeURIComponent(
      category
    )}">
      <span class="eyebrow">${plural(count, "listing")}</span>
      <h3>${esc(category)}</h3>
      <span>${esc(CATEGORY_BLURBS[category])}</span>
      <img src="assets/${esc(
        category === "Motherboards"
          ? "board-motherboard"
          : category === "Donor Boards"
          ? "board-donor"
          : category === "ICs"
          ? "ic"
          : "phone-part"
      )}.svg" alt="" loading="lazy" />
    </a>`;
  }).join("");

  root.innerHTML = `
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <span class="eyebrow">${icon("spark")}Donor boards · ICs · reclaimed parts</span>
          <h1>Silicon you can <em>trust</em>.</h1>
          <p class="lead">Buy repair-grade boards and ICs with the money held in licensed escrow until you verify the part. Every order gets a 72-hour validation window and 7-day DOA cover.</p>
          <form class="row hero-actions" role="search" data-form="home-search">
            <div class="input-group" style="flex:1;min-width:260px">
              ${icon("search")}
              <input class="input" type="search" name="q" placeholder="Search iPhone 13 Pro, A2638, or PMIC 338S00509…" aria-label="Search parts" />
            </div>
            <button class="btn btn-primary btn-lg" type="submit">Search</button>
          </form>
          <div class="chip-row mt-16">
            <span class="small">Popular:</span>
            <a class="chip" href="marketplace.html?q=iPhone%2013%20Pro">iPhone 13 Pro</a>
            <a class="chip" href="marketplace.html?q=A2638">A2638</a>
            <a class="chip" href="marketplace.html?q=PMIC">PMIC</a>
            <a class="chip" href="marketplace.html?category=Donor%20Boards">Donor boards</a>
          </div>
          <div class="hero-stats">
            <div class="hero-stat"><b>₱12.4M</b><span>Protected in escrow</span></div>
            <div class="hero-stat"><b>1,842</b><span>Disputes resolved</span></div>
            <div class="hero-stat"><b>72h</b><span>Validation, every tier</span></div>
          </div>
        </div>

        <div class="hero-visual">
          <span class="hero-orbit" aria-hidden="true"></span>
          <span class="float-chip float-chip--one">${icon("shield")}Escrow held</span>
          <span class="float-chip float-chip--two">${icon("badge-check")}Verified Pass</span>
          <aside class="hero-panel">
            <div class="hero-panel-head">
              <div>
                <b>Order ST-2026-004182</b>
                <span>72-hour validation in progress</span>
              </div>
              ${badge("Held", "info")}
            </div>
            ${
              hero
                ? `<a class="hero-panel-item" href="listing.html?id=${encodeURIComponent(
                    hero.id
                  )}">
                    <span class="hero-thumb"><img src="${esc(
                      listingImage(hero)
                    )}" alt="" /></span>
                    <span style="min-width:0">
                      <b>${esc(hero.title)}</b>
                      <span>${esc(hero.seller?.name || "Verified seller")} · ${esc(
                    hero.shipsFrom
                  )}</span>
                    </span>
                    <span class="product-price">${peso0(hero.price)}</span>
                  </a>`
                : emptyState({
                    iconName: "box",
                    title: "Fresh stock is loading",
                    text: "Browse the marketplace to see current listings."
                  })
            }
            <div class="hero-flow">
              <div class="hero-flow-step">${icon("card")}<b>Buyer pays</b><span>GCash · card</span></div>
              <div class="hero-flow-step">${icon("lock")}<b>PSP holds</b><span>Licensed custody</span></div>
              <div class="hero-flow-step">${icon("truck")}<b>Ship &amp; test</b><span>72h window</span></div>
            </div>
            <div class="hero-panel-foot">
              <span>${icon("lock")}Funds never touch our account</span>
              <b>7-day DOA</b>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section class="trust-strip">
      <div class="container trust-strip-inner">
        <div class="trust-item">${icon("shield")}<div><b>Licensed PSP escrow</b><span>Released only after you validate.</span></div></div>
        <div class="trust-item">${icon("badge-check")}<div><b>Verified sellers</b><span>ID, address, and payout checks.</span></div></div>
        <div class="trust-item">${icon("clock")}<div><b>72-hour validation</b><span>Same window for every tier.</span></div></div>
        <div class="trust-item">${icon("alert")}<div><b>7-day DOA cover</b><span>Prepaid return label on us.</span></div></div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>Shop by category</h2>
            <p>Everything is graded, photographed, and shipped under the same escrow rules.</p>
          </div>
          <a class="link-arrow" href="marketplace.html">All listings ${icon("arrow-right")}</a>
        </div>
        <div class="category-grid">${categoryCards}</div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>Evidence-backed stock</h2>
            <p>Verified Pass listings carry a seller evidence pack, spot-audited by the platform.</p>
          </div>
          <a class="link-arrow" href="marketplace.html?pass=1">Verified Pass only ${icon(
            "arrow-right"
          )}</a>
        </div>
        <div class="product-grid">${featured
          .map((listing) => productCard(listing))
          .join("")}</div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>How a protected order works</h2>
            <p>Money and goods move on separate rails. The platform can only move money when the evidence says it should.</p>
          </div>
        </div>
        <div class="steps-grid">
          ${STEPS.map(
            (step, index) => `<article class="step-card">
              <span class="step-num">0${index + 1}</span>
              <h3>${esc(step.title)}</h3>
              <p>${esc(step.text)}</p>
            </article>`
          ).join("")}
        </div>
        <div class="policy-band">
          <article class="policy-card">
            <span class="action-icon">${icon("scan")}</span>
            <div>
              <h3>Compatibility checker</h3>
              <p>Pick a device. We show every listing tagged for it, with fit confidence visible on each listing.</p>
              <div class="field mt-16">
                <label class="label" for="compat-device">Device model</label>
                <select class="select" id="compat-device">
                  <option value="">Choose a model…</option>
                  ${DEVICES.map(
                    (device) =>
                      `<option value="${esc(device)}">${esc(device)}</option>`
                  ).join("")}
                </select>
              </div>
              <div id="compat-result" class="mt-16">
                <p class="small">Choose a device to see matching stock.</p>
              </div>
            </div>
          </article>
          <article class="policy-card">
            <span class="action-icon">${icon("badge-check")}</span>
            <div>
              <h3>Verified Pass, without shortcuts</h3>
              <p>Upload boot, serial, function, diagnostic, and marking evidence. Pass a spot audit and carry the badge for as long as the evidence holds.</p>
              <div class="summary-list mt-16">
                <div class="summary-row"><span>Single listing</span><b>₱49</b></div>
                <div class="summary-row"><span>Pro Workshop · 8 listings + 48h support</span><b>₱399 / mo</b></div>
              </div>
              <a class="btn btn-secondary mt-16" href="verified-pass.html">See Verified Pass ${icon(
                "arrow-right"
              )}</a>
            </div>
          </article>
        </div>
        <div class="home-cta banner">
          <div>
            <h2>Turn spare boards into verified stock.</h2>
            <p>List in minutes, get paid from licensed escrow, and keep a 10% reserve that protects both sides for 14 days.</p>
          </div>
          <a class="btn btn-secondary btn-lg" href="sell.html">Start selling ${icon(
            "arrow-right"
          )}</a>
        </div>
      </div>
    </section>`;

}

/* Compatibility checker stays interactive without a full repaint. */
document.addEventListener("change", (event) => {
  if (event.target.id !== "compat-device") return;
  const result = document.getElementById("compat-result");
  if (!result) return;
  const device = event.target.value;
  if (!device) {
    result.innerHTML = `<p class="small">Choose a device to see matching stock.</p>`;
    return;
  }
  const matches = publicListings().filter(
    (listing) =>
      listing.device === device || (listing.compat || []).includes(device)
  );
  if (!matches.length) {
    result.innerHTML = `<div class="alert alert--warn">${icon(
      "alert"
    )}<span>No tagged stock yet for <b>${esc(
      device
    )}</b>. Open a support ticket and we will watch for it.</span></div>`;
    return;
  }
  result.innerHTML = `
    <div class="alert alert--info">${icon("info")}<span><b>${plural(
    matches.length,
    "compatible part"
  )}</b> found for ${esc(device)}.</span></div>
    <div class="summary-list mt-16">
      ${matches
        .slice(0, 3)
        .map(
          (listing) => `<a class="summary-row" href="listing.html?id=${encodeURIComponent(
            listing.id
          )}"><span>${esc(listing.title)}</span><b>${peso0(
            listing.price
          )}</b></a>`
        )
        .join("")}
    </div>
    <a class="link-arrow mt-16" href="marketplace.html?q=${encodeURIComponent(
      device
    )}">See all matches ${icon("arrow-right")}</a>`;
});
