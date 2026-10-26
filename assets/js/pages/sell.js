/* ==========================================================================
   Sell — listing composer with payout preview and evidence pack
   ========================================================================== */

import { icon } from "../core/icons.js";
import {
  CATEGORIES,
  CONDITIONS,
  DEVICES,
  GRADES,
  POLICY
} from "../core/config.js";
import {
  commissionFor,
  esc,
  netFor,
  pageRoot,
  peso,
  reserveFor
} from "../core/utils.js";
import { getState } from "../core/store.js";
import {
  currentRole,
  listingImage,
  sellerForSession,
  tierOf
} from "../core/selectors.js";
import { badge, tierBadge } from "../components/ui.js";
import { roleGate } from "../components/shell.js";

const EVIDENCE_PACK = [
  {
    value: "Boot video",
    meta: "Continuous clip showing the part powering on and reaching the home screen."
  },
  {
    value: "Serial macro",
    meta: "Close-up of the serial or part number, matching the listing exactly."
  },
  {
    value: "Function matrix",
    meta: "One clip per documented function: display, touch, cameras, charging, radios."
  },
  {
    value: "Diagnostic screen",
    meta: "Battery health, True Tone state, and any service warnings captured on screen."
  },
  {
    value: "Board markings",
    meta: "Revision and shield markings, plus anti-static packing before hand-over."
  }
];

function optionList(values, selected) {
  return values
    .map(
      (value) =>
        `<option value="${esc(value)}" ${
          value === selected ? "selected" : ""
        }>${esc(value)}</option>`
    )
    .join("");
}

function sellerGate(root) {
  const role = currentRole();
  if (role !== "seller" && role !== "admin") {
    root.innerHTML = roleGate({
      role: "seller",
      title: "Seller access required",
      text: "Listing boards is available to seller and admin accounts. Sign in with the demo seller to publish stock, or keep browsing as a buyer.",
      iconName: "store"
    });
    return true;
  }

  const seller = sellerForSession();
  if (seller && seller.kyc !== "VERIFIED") {
    root.innerHTML = `<div class="container"><div class="gate">
      <div class="gate-card">
        <span class="gate-icon">${icon("shield", "icon--lg")}</span>
        <h1>Seller verification required</h1>
        <p>Before your first listing goes live, complete identity and payout verification. The demo admin console can approve seller KYC.</p>
        <div class="row">
          <a class="btn btn-primary" href="account.html">${icon(
            "badge-check"
          )}Open account verification</a>
          <a class="btn btn-secondary" href="login.html?demo=admin">${icon(
            "lock"
          )}Demo admin console</a>
        </div>
        <p class="small mt-16">Current status: ${badge("KYC pending", "warn")}</p>
      </div>
    </div></div>`;
    return true;
  }
  return false;
}

export function listingComposerMarkup({ embedded = false } = {}) {
  const seller = sellerForSession();
  const profile = getState().profile;
  const hasPlan = Boolean(seller?.pass);
  const price = 4850;
  const commission = commissionFor(price);
  const reserve = reserveFor(price);
  const net = netFor(price);

  return `
    <div class="sell-layout${embedded ? " sell-layout--embedded" : ""}">
        <form class="stack" data-form="publish">
          ${embedded ? `<input type="hidden" name="returnTo" value="workspace" />` : ""}
          <section class="card">
            <div class="card-head">
              <div>
                <h2 class="card-title">Part details</h2>
                <p>Buyers search by device, alias, and part number.</p>
              </div>
              ${badge(tierOf(seller), seller?.pass ? "teal" : "neutral")}
            </div>
            <div class="form-grid">
              <div class="field field--full">
                <label class="label" for="pub-image">Product picture</label>
                <div class="image-upload">
                  <div class="image-upload-preview">
                    <img id="pub-image-preview" class="is-empty" alt="" />
                    <span>${icon("camera")}No photo yet</span>
                  </div>
                  <div class="image-upload-body">
                    <b>Upload your own product photo</b>
                    <span class="small">Use a clear photo of the exact part, serial, or board. It is resized before saving and shown on your storefront.</span>
                    <div class="row mt-8">
                      <label class="btn btn-secondary btn-sm" for="pub-image">${icon(
                        "upload"
                      )}Choose photo</label>
                      <input class="sr-only" id="pub-image" type="file" accept="image/*" data-image-input data-image-target="pub-image-data" data-image-preview="pub-image-preview" data-image-secondary="preview-image" />
                      <input type="hidden" id="pub-image-data" name="image" value="" />
                    </div>
                  </div>
                </div>
              </div>
              <div class="field field--full">
                <label class="label" for="pub-title">Listing title</label>
                <input class="input" id="pub-title" name="title" required maxlength="90" placeholder="iPhone 13 Pro Logic Board — A2638" data-preview="title" />
              </div>
              <div class="field">
                <label class="label" for="pub-category">Category</label>
                <select class="select" id="pub-category" name="category" required data-preview="category">
                  ${optionList(CATEGORIES, "Motherboards")}
                </select>
              </div>
              <div class="field">
                <label class="label" for="pub-device">Device</label>
                <select class="select" id="pub-device" name="device" required>
                  ${optionList(DEVICES, "iPhone 13 Pro")}
                </select>
              </div>
              <div class="field">
                <label class="label" for="pub-alias">Model alias</label>
                <input class="input" id="pub-alias" name="alias" placeholder="A2638" />
              </div>
              <div class="field">
                <label class="label" for="pub-part">Part number</label>
                <input class="input" id="pub-part" name="partNumber" placeholder="820-02941" />
              </div>
              <div class="field">
                <label class="label" for="pub-price">Price (PHP)</label>
                <input class="input" id="pub-price" name="price" type="number" min="20" step="1" required value="${price}" data-preview="price" />
                <span class="field-hint">Commission is 8% with a ₱20 minimum.</span>
              </div>
              <div class="field">
                <label class="label" for="pub-stock">Stock</label>
                <input class="input" id="pub-stock" name="stock" type="number" min="1" max="99" value="1" required />
              </div>
              <div class="field">
                <label class="label" for="pub-grade">Condition grade</label>
                <select class="select" id="pub-grade" name="grade" data-preview="grade">
                  ${optionList(GRADES, "B")}
                </select>
              </div>
              <div class="field">
                <label class="label" for="pub-condition">Condition</label>
                <select class="select" id="pub-condition" name="condition">
                  ${optionList(CONDITIONS, "OEM Pull")}
                </select>
              </div>
              <div class="field">
                <label class="label" for="pub-ships">Ships from</label>
                <input class="input" id="pub-ships" name="shipsFrom" value="${esc(
                  seller?.city || "Manila"
                )}" required />
              </div>
              <div class="field field--full">
                <label class="label" for="pub-description">Description</label>
                <textarea class="textarea" id="pub-description" name="description" required placeholder="What was the donor device? What was tested? What is missing or disabled?"></textarea>
                <span class="field-hint">Describe the part exactly as a repair tech would need it. Disclose True Tone, Face ID pairing, and any prior repair.</span>
              </div>
              <div class="field field--full">
                <label class="label" for="pub-notes">Condition notes (one per line)</label>
                <textarea class="textarea" id="pub-notes" name="notes" placeholder="Battery health 89%&#10;Minor shield cover scuff&#10;Face ID paired and tested"></textarea>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <h2 class="card-title">Verified Pass evidence</h2>
                <p>Check each item you can upload. All five are required before the badge is rendered.</p>
              </div>
              ${hasPlan ? badge("Plan active", "teal") : badge("No pass plan", "warn")}
            </div>
            <div class="sell-checks">
              ${EVIDENCE_PACK.map(
                (item) => `<label class="check">
                  <input type="checkbox" name="evidence" value="${esc(
                    item.value
                  )}" />
                  <span><b>${esc(item.value)}</b> — ${esc(item.meta)}</span>
                </label>`
              ).join("")}
            </div>
            ${
              hasPlan
                ? `<div class="alert alert--success mt-16">${icon(
                    "badge-check"
                  )}<span>Your ${esc(
                    tierOf(seller)
                  )} plan is active. Check all five items to publish with the Verified Pass badge.</span></div>`
                : `<div class="alert alert--warn mt-16">${icon(
                    "alert"
                  )}<span>Your listing can go live without a Pass, but no badge is shown. Activate single-listing or Pro coverage to attach evidence.</span>
                    <a class="btn btn-secondary btn-sm" href="${
                      embedded ? "#pass" : "verified-pass.html"
                    }">${icon("badge-check")}See plans</a></div>`
            }
          </section>

          <div class="alert">${icon("info")}<span>Demo build: the listing is stored in this browser and appears in the marketplace immediately. Admin moderation sees pending stock.</span></div>

          <div class="row">
            <button class="btn btn-primary btn-lg" type="submit">${icon(
              "upload"
            )}Publish listing</button>
            <a class="btn btn-ghost" href="${
              embedded ? "#overview" : "marketplace.html"
            }">Cancel</a>
          </div>
        </form>

        <aside class="sell-preview">
          <div class="card">
            <p class="eyebrow">${icon("eye")}Live preview</p>
            <div class="product" style="margin-top:12px">
              <div class="product-media">
                <img id="preview-image" src="${esc(
                  listingImage({ category: "Motherboards" })
                )}" alt="" />
                <span class="pill pill--neutral" id="preview-badge">Grade B</span>
              </div>
              <div class="product-body">
                <div class="product-meta">
                  <span id="preview-category">Motherboards</span>
                  <span>OEM Pull</span>
                </div>
                <h3 class="product-title" id="preview-title">Your listing title appears here</h3>
                <p class="product-seller">${esc(
                  seller?.name || "Your store"
                )} · ${esc(seller?.city || "PH")}</p>
                <div class="product-foot">
                  <p class="product-price" id="preview-price">${peso(price, 0)}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="payout-preview mt-16">
            <h3>${icon("wallet")} Payout preview</h3>
            <div class="summary-list">
              <div class="summary-row"><span>Buyer pays</span><b id="payout-price">${peso(
                price
              )}</b></div>
              <div class="summary-row"><span>Commission (8%, ₱20 floor)</span><b id="payout-commission">${peso(
                commission
              )}</b></div>
              <div class="summary-row"><span>Reserve (10%, 14 days)</span><b id="payout-reserve">${peso(
                reserve
              )}</b></div>
              <div class="summary-row summary-row--total"><span>Net payout</span><b id="payout-net">${peso(
                net
              )}</b></div>
            </div>
            <p class="small mt-8">Commission and reserve are deducted from the payout. Shipping is paid by the buyer.</p>
          </div>

          <div class="sell-aside-card">
            <h3>What the platform checks</h3>
            <ul>
              <li>${icon("check")}Serial and part number match the photos.</li>
              <li>${icon("check")}Diagnostics are consistent across evidence clips.</li>
              <li>${icon("check")}10% of Pass listings are spot-audited weekly.</li>
              <li>${icon("check")}Disputes freeze payout until evidence review closes.</li>
            </ul>
          </div>

          <div class="sell-aside-card">
            <h3>Seller coverage</h3>
            <div class="row row--between">
              <span class="small">Support SLA</span>
              <b>${profile.passPlan === "PRO" ? POLICY.supportProSlaHours : POLICY.supportSlaHours}h</b>
            </div>
            <div class="row row--between mt-8">
              <span class="small">Validated tier</span>
              ${tierBadge(seller)}
            </div>
            <a class="link-arrow mt-16" href="${
              embedded ? "#pass" : "verified-pass.html"
            }">Compare Pass plans ${icon("arrow-right")}</a>
          </div>
        </aside>
    </div>`;
}

export function wireListingComposer(root) {
  const form = root.querySelector('form[data-form="publish"]');
  if (!form) return;

  const preview = {
    title: root.querySelector("#preview-title"),
    category: root.querySelector("#preview-category"),
    grade: root.querySelector("#preview-badge"),
    price: root.querySelector("#preview-price"),
    image: root.querySelector("#preview-image"),
    payoutPrice: root.querySelector("#payout-price"),
    payoutCommission: root.querySelector("#payout-commission"),
    payoutReserve: root.querySelector("#payout-reserve"),
    payoutNet: root.querySelector("#payout-net")
  };

  form.addEventListener("input", (event) => {
    if (event.target.dataset.preview === "title" && preview.title) {
      preview.title.textContent =
        event.target.value.trim() || "Your listing title appears here";
    }
    if (event.target.dataset.preview === "category" && preview.category) {
      preview.category.textContent = event.target.value;
      if (preview.image && preview.image.dataset.custom !== "true")
        preview.image.src = listingImage({ category: event.target.value });
    }
    if (event.target.dataset.preview === "grade" && preview.grade) {
      preview.grade.textContent = `Grade ${event.target.value}`;
    }
    if (event.target.dataset.preview === "price") {
      const value = Math.max(20, Number(event.target.value) || 0);
      if (preview.price) preview.price.textContent = peso(value, 0);
      if (preview.payoutPrice) preview.payoutPrice.textContent = peso(value);
      if (preview.payoutCommission)
        preview.payoutCommission.textContent = peso(commissionFor(value));
      if (preview.payoutReserve)
        preview.payoutReserve.textContent = peso(reserveFor(value));
      if (preview.payoutNet) preview.payoutNet.textContent = peso(netFor(value));
    }
  });
}

export function render() {
  const root = pageRoot();
  if (!root) return;
  if (sellerGate(root)) return;

  root.innerHTML = `
    <div class="container">
      <header class="page-head">
        <div>
          <p class="eyebrow">${icon("plus")}New listing</p>
          <h1>List a part</h1>
          <p>Describe the exact part, set an honest grade, and attach the evidence pack if you want the Verified Pass badge.</p>
        </div>
        <div class="page-head-actions">
          <a class="btn btn-secondary" href="seller-dashboard.html">${icon(
            "grid"
          )}Seller dashboard</a>
        </div>
      </header>

      ${listingComposerMarkup()}
    </div>`;

  wireListingComposer(root);
}
