/* ==========================================================================
   Checkout — address, courier, payment, escrow summary
   ========================================================================== */

import { icon } from "../core/icons.js";
import { COURIERS, PAYMENT_METHODS, POLICY } from "../core/config.js";
import { esc, pageRoot, param, peso } from "../core/utils.js";
import { getState } from "../core/store.js";
import {
  isListingLive,
  listingImage,
  monthlyVolume,
  sellerOf,
  session,
  tierOf
} from "../core/selectors.js";
import { badge, emptyState, tierBadge } from "../components/ui.js";

const courierById = (id) => COURIERS.find((courier) => courier.id === id);

function addressFields(address) {
  const fields = [
    ["recipient", "Recipient name", "text", "field--full", true],
    ["phone", "Mobile number", "tel", "", true],
    ["region", "Region", "text", "", true],
    ["city", "City / municipality", "text", "", true],
    ["barangay", "Barangay", "text", "", true],
    ["postal", "Postal code", "text", "", true],
    ["landmark", "Street, unit, landmark", "text", "field--full", true]
  ];

  return fields
    .map(
      ([name, label, type, modifier, required]) => `<div class="field ${modifier}">
        <label class="label" for="co-${name}">${label}</label>
        <input class="input" id="co-${name}" name="${name}" type="${type}" value="${esc(
        address?.[name] || ""
      )}" ${required ? "required" : ""} autocomplete="shipping ${name}" />
      </div>`
    )
    .join("");
}

export function render() {
  const root = pageRoot();
  if (!root) return;

  const state = getState();
  const listing = state.listings.find((item) => item.id === param("id"));
  if (!listing || !isListingLive(listing)) {
    root.innerHTML = `<div class="container">${emptyState({
      iconName: "box",
      title: "This part is not available",
      text: "It may have sold or been paused. Pick another listing to check out.",
      cta: `<a class="btn btn-primary mt-16" href="marketplace.html">Browse marketplace</a>`
    })}</div>`;
    return;
  }

  const seller = sellerOf(listing);
  const profile = state.profile;
  const checkoutHref = `checkout.html?id=${encodeURIComponent(listing.id)}`;

  if (!session()) {
    root.innerHTML = `<div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="marketplace.html">Marketplace</a>${icon("chevron-right")}
        <a href="listing.html?id=${encodeURIComponent(listing.id)}">${esc(
      listing.device
    )}</a>${icon("chevron-right")}
        <span>Checkout</span>
      </nav>
      <div class="gate">
        <div class="gate-card">
          <span class="gate-icon">${icon("lock", "icon--lg")}</span>
          <h1>Create a buyer account to check out</h1>
          <p>You can browse the marketplace as a guest, but escrow purchases need a registered buyer account. Register with your email, password, and password confirmation — then you will come straight back to this part.</p>
          <div class="checkout-gate-item">
            <img src="${esc(listingImage(listing))}" alt="" />
            <div>
              <b>${esc(listing.title)}</b>
              <span>${esc(listing.condition)} · Grade ${esc(
      listing.grade
    )} · ${peso(listing.price)}</span>
              <span>${esc(listing.shipsFrom)} · sold by ${esc(
      seller?.name || "independent seller"
    )}</span>
            </div>
            ${tierBadge(seller)}
          </div>
          <div class="row mt-24">
            <a class="btn btn-primary" href="login.html?mode=register&next=${encodeURIComponent(
              checkoutHref
            )}">${icon("user")}Create buyer account</a>
            <a class="btn btn-secondary" href="login.html?next=${encodeURIComponent(
              checkoutHref
            )}">${icon("lock")}Sign in</a>
          </div>
          <a class="btn btn-ghost btn-block mt-16" href="listing.html?id=${encodeURIComponent(
            listing.id
          )}">${icon("arrow-left")}Back to listing</a>
        </div>
      </div>
    </div>`;
    return;
  }

  const courier = COURIERS[0];
  const total = Number(listing.price) + Number(courier.fee);
  const projected = monthlyVolume() + total;
  const needsKyc =
    !profile.buyerKyc && projected >= POLICY.kycMonthlyVolume;
  const kycPending = profile.buyerKycRequest?.status === "PENDING";

  root.innerHTML = `
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="marketplace.html">Marketplace</a>${icon("chevron-right")}
        <a href="listing.html?id=${encodeURIComponent(listing.id)}">${esc(
    listing.device
  )}</a>${icon("chevron-right")}
        <span>Checkout</span>
      </nav>

      <header class="page-head">
        <div>
          <p class="eyebrow">${icon("lock")}Escrow checkout</p>
          <h1>Pay into escrow</h1>
          <p>Your payment is held by a licensed PSP. The seller is only paid after you validate the part, or 72 hours after delivery.</p>
        </div>
        <div class="page-head-actions">
          <a class="btn btn-secondary" href="listing.html?id=${encodeURIComponent(
            listing.id
          )}">${icon("arrow-left")}Back to listing</a>
        </div>
      </header>

      <div class="checkout-layout">
        <form class="stack" data-form="checkout">
          <input type="hidden" name="listingId" value="${esc(listing.id)}" />

          <div class="alert alert--warn kyc-gate ${
            needsKyc ? "" : "hide"
          }" data-kyc-gate>${icon("shield")}
            <div>
              <b>Identity check required for this order.</b>
              <p>Your rolling 30-day volume would reach <span data-kyc-projected>${peso(
                projected,
                0
              )}</span>, above the ${peso(
                POLICY.kycMonthlyVolume,
                0
              )} KYC threshold. ${
                kycPending
                  ? "Your request is waiting for admin approval — checkout stays blocked until then."
                  : "Request verification and an admin will review it."
              }</p>
              ${
                kycPending
                  ? badge("Verification pending", "warn")
                  : `<button class="btn btn-primary btn-sm mt-8" type="button" data-action="request-buyer-kyc">${icon(
                      "shield"
                    )}Request verification</button>`
              }
            </div>
          </div>

          <section class="checkout-step">
            <div class="checkout-step-head">
              <span class="checkout-step-num">1</span>
              <div>
                <h2>Delivery address</h2>
                <p>Saved to your buyer profile for the next order.</p>
              </div>
            </div>
            <div class="delivery-grid">${addressFields(profile.address)}</div>
          </section>

          <section class="checkout-step">
            <div class="checkout-step-head">
              <span class="checkout-step-num">2</span>
              <div>
                <h2>Courier</h2>
                <p>Tracking is assigned when the seller hands the parcel over.</p>
              </div>
            </div>
            <div class="choice-grid">
              ${COURIERS.map(
                (option, index) => `<label class="choice">
                  <input type="radio" name="courier" value="${esc(option.id)}" ${
                  index === 0 ? "checked" : ""
                } />
                  <span class="choice-body">
                    <span class="choice-title">${esc(option.name)}</span>
                    <span class="choice-meta">${esc(option.eta)} · insured</span>
                  </span>
                  <span class="choice-price">${peso(option.fee)}</span>
                </label>`
              ).join("")}
            </div>
          </section>

          <section class="checkout-step">
            <div class="checkout-step-head">
              <span class="checkout-step-num">3</span>
              <div>
                <h2>Payment method</h2>
                <p>Funds move straight to the PSP escrow account — never to the seller.</p>
              </div>
            </div>
            <div class="choice-grid">
              ${PAYMENT_METHODS.map(
                (method, index) => `<label class="choice">
                  <input type="radio" name="payment" value="${esc(method)}" ${
                  index === 0 ? "checked" : ""
                } />
                  <span class="choice-body">
                    <span class="choice-title">${esc(method)}</span>
                    <span class="choice-meta">${icon(
                      method === "Card" ? "card" : "phone"
                    )}Instant confirmation · demo</span>
                  </span>
                  <span class="choice-price">No fee</span>
                </label>`
              ).join("")}
            </div>
          </section>

          <section class="checkout-step">
            <div class="checkout-step-head">
              <span class="checkout-step-num">4</span>
              <div>
                <h2>Confirm</h2>
                <p>Escrow protects the full amount until you validate the part.</p>
              </div>
            </div>
            <div class="stack stack--sm">
              <label class="check check--required">
                <input type="checkbox" name="acknowledged" required />
                <span>I understand the 72-hour validation window starts on delivery, that the 7-day DOA cover requires evidence, and that the platform does not accept cash on delivery.</span>
              </label>
              <div class="alert alert--warn ${
                needsKyc ? "" : "hide"
              }" data-kyc-warning>${icon(
                "alert"
              )}<span>${
                kycPending
                  ? "Verification is pending admin approval. You cannot pay above the cap yet."
                  : "Request the identity check above before paying."
              }</span></div>
              <div class="alert alert--success ${
                needsKyc ? "hide" : ""
              }" data-kyc-ready>${icon(
                "shield"
              )}<span>This order is eligible for escrow protection and 7-day DOA cover.</span></div>
              <button class="btn btn-primary btn-lg btn-block" type="submit" data-checkout-submit ${
                needsKyc ? "disabled" : ""
              }>
                ${icon("lock")}Pay <span data-checkout-total>${peso(
                  total
                )}</span> into escrow
              </button>
              <p class="small text-center">Demo payment — no real money or shipment is involved.</p>
            </div>
          </section>
        </form>

        <aside class="checkout-summary">
          <div class="card">
            <div class="checkout-item">
              <img src="${esc(listingImage(listing))}" alt="" />
              <div>
                <b>${esc(listing.title)}</b>
                <span>${esc(listing.condition)} · Grade ${esc(
    listing.grade
  )} · Qty 1</span>
                <span>${esc(listing.shipsFrom)} → ${esc(
    profile.address?.city || "your address"
  )}</span>
              </div>
            </div>

            <div class="summary-list mt-16">
              <div class="summary-row"><span>Item</span><b>${peso(
                listing.price
              )}</b></div>
              <div class="summary-row"><span>Shipping · <span data-summary-courier>${esc(
                courier.name
              )}</span></span><b data-summary-shipping>${peso(
                courier.fee
              )}</b></div>
              <div class="summary-row"><span>Buyer platform fee</span><b>${peso(
                0
              )}</b></div>
            </div>

            <div class="checkout-total">
              <span>Held in escrow</span>
              <b data-summary-total>${peso(total)}</b>
            </div>

            <div class="alert alert--info">${icon("shield")}<span><b>Released only when you validate.</b> Dispute before the window ends and escrow freezes. After release, the 7-day DOA cover still applies.</span></div>

            <div class="summary-list mt-16">
              <div class="summary-row"><span>Seller commission (8%, ₱20 floor)</span><b>${peso(
                listing.price * POLICY.commissionRate <
                  POLICY.commissionFloor
                  ? POLICY.commissionFloor
                  : listing.price * POLICY.commissionRate
              )}</b></div>
              <div class="summary-row"><span>Seller reserve (10%, 14 days)</span><b>${peso(
                (listing.price -
                  (listing.price * POLICY.commissionRate <
                  POLICY.commissionFloor
                    ? POLICY.commissionFloor
                    : listing.price * POLICY.commissionRate)) *
                  POLICY.reserveRate
              )}</b></div>
            </div>
            <p class="small mt-8">Deducted from the seller payout — never added to your price.</p>
          </div>

          <div class="card mt-16">
            <div class="seller-card" style="margin:0;padding:0;border:0">
              <span class="avatar">${esc(
                (seller?.name || "?")
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()
              )}</span>
              <div>
                <b>${esc(seller?.name || "Independent seller")}</b>
                <span>${esc(tierOf(seller))} · ★ ${Number(
    seller?.rating || 0
  ).toFixed(1)} · ${esc(seller?.city || "PH")}</span>
              </div>
              ${tierBadge(seller)}
            </div>
            <ul class="policy-list mt-16">
              <li>${icon("check")}ID and payout account verified before listing.</li>
              <li>${icon("check")}Evidence pack on file for Verified Pass stock.</li>
              <li>${icon("check")}Prepaid return label if a claim is upheld.</li>
            </ul>
          </div>

          <div class="alert mt-16">${icon("alert")}<span>7-day DOA cover starts on delivery. Prepaid return labels are platform-generated.</span></div>
        </aside>
      </div>
    </div>`;

  const form = root.querySelector('form[data-form="checkout"]');
  const totals = {
    shipping: root.querySelector("[data-summary-shipping]"),
    total: root.querySelector("[data-summary-total]"),
    submit: root.querySelector("[data-checkout-total]"),
    courier: root.querySelector("[data-summary-courier]")
  };
  const gate = root.querySelector("[data-kyc-gate]");
  const gateProjected = root.querySelector("[data-kyc-projected]");
  const kycWarning = root.querySelector("[data-kyc-warning]");
  const kycReady = root.querySelector("[data-kyc-ready]");
  const payButton = root.querySelector("[data-checkout-submit]");

  form?.addEventListener("change", (event) => {
    if (event.target.name !== "courier") return;
    const option = courierById(event.target.value);
    if (!option) return;
    const sum = Number(listing.price) + Number(option.fee);
    if (totals.shipping) totals.shipping.textContent = peso(option.fee);
    if (totals.total) totals.total.textContent = peso(sum);
    if (totals.submit) totals.submit.textContent = peso(sum);
    if (totals.courier) totals.courier.textContent = option.name;

    const nextProjected = monthlyVolume() + sum;
    const blocked =
      !profile.buyerKyc && nextProjected >= POLICY.kycMonthlyVolume;
    if (gateProjected) gateProjected.textContent = peso(nextProjected, 0);
    gate?.classList.toggle("hide", !blocked);
    kycWarning?.classList.toggle("hide", !blocked);
    kycReady?.classList.toggle("hide", blocked);
    if (payButton) payButton.disabled = blocked;
  });
}
