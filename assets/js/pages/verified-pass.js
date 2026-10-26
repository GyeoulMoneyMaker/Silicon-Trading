/* ==========================================================================
   Verified Pass — evidence programme, plans, and rules
   ========================================================================== */

import { icon } from "../core/icons.js";
import { POLICY } from "../core/config.js";
import { esc, fmtDate, pageRoot, peso } from "../core/utils.js";
import { getState } from "../core/store.js";
import { sellerForSession, tierOf } from "../core/selectors.js";
import { badge, tierBadge } from "../components/ui.js";

const RULES = [
  {
    iconName: "camera",
    title: "Five evidence items, every listing",
    text: "Boot video, serial macro, function matrix, diagnostic screen, and board markings. A missing item means no badge — no exceptions."
  },
  {
    iconName: "scan",
    title: "10% weekly spot audit",
    text: "The platform re-checks one in ten Pass listings against the evidence pack. A failed audit removes the badge and pauses the listing."
  },
  {
    iconName: "alert",
    title: "Evidence must match the exact unit",
    text: "Stock photos, other revisions, or another device's diagnostics void the Pass. Evidence is tied to the serial shown in the listing."
  },
  {
    iconName: "shield",
    title: "Pass never overrides escrow",
    text: "Every order still gets 72-hour validation and 7-day DOA cover. The badge is evidence, not a substitute for buyer inspection."
  }
];

const INCLUDED = [
  "Evidence pack review before the badge renders",
  "Verified Pass badge on every eligible listing",
  "72-hour validation and 7-day DOA on your sales",
  "Dispute evidence workspace with listing snapshots"
];

const PRO_INCLUDED = [
  "Everything in single listing coverage",
  "Up to 8 live listings under one plan",
  "48-hour support SLA (vs 72 hours)",
  "Priority placement in category results",
  "Monthly evidence audit report"
];

function planLabel(plan) {
  if (plan === "PRO") return "Pro Workshop";
  if (plan === "SINGLE") return "Single listing";
  if (plan === "CANCEL") return "Cancellation";
  return "Plan change";
}

function planStatus(profile, seller) {
  const pending = profile.passRequest?.status === "PENDING" ? profile.passRequest : null;
  const pendingNote = pending
    ? `<div class="alert alert--warn mt-16">${icon(
        "shield"
      )}<span><b>${esc(planLabel(pending.plan))} request is waiting for admin approval.</b> Your current plan does not change until an admin approves it.</span></div>`
    : "";

  if (profile.passPlan === "NONE") {
    return `<div class="pass-status">
      <span class="action-icon">${icon("badge-check")}</span>
      <div>
        <b>No Verified Pass coverage</b>
        <span>Listings publish without the badge until a plan is active and all five evidence items are attached.</span>
      </div>
      ${badge(pending ? "Approval pending" : "Not active", pending ? "warn" : "neutral")}
    </div>${pendingNote}`;
  }

  const pro = profile.passPlan === "PRO";
  return `<div class="pass-status">
    <span class="action-icon">${icon("badge-check")}</span>
    <div>
      <b>${pro ? "Pro Workshop" : "Single listing"} coverage is active</b>
      <span>Started ${fmtDate(profile.passStartedAt)} · renews ${fmtDate(
    profile.passExpires
  )} · seller tier ${esc(tierOf(seller))}</span>
      ${
        pending
          ? `<span class="small mt-8">Current plan stays active until the admin decides.</span>`
          : `<button class="btn btn-ghost btn-sm mt-8" type="button" data-action="cancel-plan">Request cancellation</button>`
      }
    </div>
    ${badge(pending ? "Approval pending" : pro ? "Pro" : "Pass", pending ? "warn" : "teal")}
  </div>${pendingNote}`;
}

export function passMarkup({ embedded = false } = {}) {
  const state = getState();
  const profile = state.profile;
  const seller = sellerForSession();
  const evidenceListings = state.listings.filter(
    (listing) => listing.pass && listing.sellerId === (seller?.id || "S-02")
  );
  const auditedCount = evidenceListings.filter((listing) => listing.auditedAt)
    .length;
  const pending = profile.passRequest?.status === "PENDING";

  return `
      <div class="stack">
        ${planStatus(profile, seller)}

        <div class="plan-grid">
          <article class="plan-card">
            <p class="eyebrow">${icon("tag")}Pay as you list</p>
            <h2>Single listing</h2>
            <div class="plan-price"><b>${peso(POLICY.singlePass, 0)}</b><span>/ listing · 30 days</span></div>
            <p class="small">For occasional sellers who want the badge on one part at a time.</p>
            <ul class="plan-list">
              ${INCLUDED.map((item) => `<li>${icon("check")}${esc(item)}</li>`).join(
                ""
              )}
              <li>${icon("check")}One active Pass listing at a time</li>
            </ul>
            <button class="btn btn-secondary" type="button" data-action="activate-plan" data-plan="SINGLE" ${
              pending ? "disabled" : ""
            }>${icon("badge-check")}${
              pending ? "Awaiting admin approval" : "Request single listing"
            }</button>
          </article>

          <article class="plan-card plan-card--featured">
            <span class="plan-flag">Best for shops</span>
            <p class="eyebrow">${icon("store")}Workshop plan</p>
            <h2>Pro Workshop</h2>
            <div class="plan-price"><b>${peso(POLICY.proPass, 0)}</b><span>/ month · 8 listings</span></div>
            <p class="small">For repair shops turning donor stock into a trusted storefront.</p>
            <ul class="plan-list">
              ${PRO_INCLUDED.map(
                (item) => `<li>${icon("check")}${esc(item)}</li>`
              ).join("")}
            </ul>
            <button class="btn btn-primary" type="button" data-action="activate-plan" data-plan="PRO" ${
              pending ? "disabled" : ""
            }>${icon("spark")}${
              pending ? "Awaiting admin approval" : "Request Pro Workshop"
            }</button>
          </article>
        </div>

        <div class="dash-split">
          <section class="card">
            <div class="card-head">
              <div>
                <h2 class="card-title">What the badge promises</h2>
                <p>Rendered only after the full evidence pack is uploaded and accepted.</p>
              </div>
              ${badge("Evidence-backed", "teal")}
            </div>
            <div class="dash-grid dash-grid--halves" style="display:grid;gap:12px">
              ${[
                ["Boot video", "Powers on and reaches the home screen in one continuous clip."],
                ["Serial macro", "Serial and part number legible, matching the listing text."],
                ["Function matrix", "Every documented function demonstrated on camera."],
                ["Diagnostic screen", "Battery health and service warnings visible, not cropped."],
                ["Board markings", "Revision and shield markings captured before packing."]
              ]
                .map(
                  ([title, text]) => `<div class="dash-stat" style="align-items:flex-start">
                    <span class="action-icon">${icon("camera")}</span>
                    <span><b>${esc(title)}</b><span>${esc(text)}</span></span>
                  </div>`
                )
                .join("")}
            </div>
          </section>

          <aside class="stack">
            <div class="card">
              <div class="card-head"><h3>Your evidence</h3></div>
              <div class="summary-list">
                <div class="summary-row"><span>Pass listings</span><b>${evidenceListings.length}</b></div>
                <div class="summary-row"><span>Audited</span><b>${auditedCount}</b></div>
                <div class="summary-row"><span>Plan</span><b>${esc(
                  profile.passPlan === "NONE"
                    ? "None"
                    : profile.passPlan === "PRO"
                    ? "Pro Workshop"
                    : "Single listing"
                )}</b></div>
                <div class="summary-row"><span>Seller tier</span><b>${esc(
                  tierOf(seller)
                )}</b></div>
              </div>
              <div class="mt-16">${tierBadge(seller)}</div>
              <p class="small mt-16">Evidence is reviewed against the exact serial in each listing. Spot audits run every week.</p>
            </div>

            <div class="alert alert--info">${icon("info")}<span><b>Approval required.</b> Plan changes are sent to the admin console. The active plan and badge stay unchanged until an admin approves the request. No payment is charged in this demo.</span></div>
          </aside>
        </div>

        <section class="card" id="rules">
          <div class="card-head">
            <div>
              <h2 class="card-title">Evidence rules</h2>
              <p>These rules apply to every category and every seller tier.</p>
            </div>
            ${badge("10% weekly audit", "warn")}
          </div>
          <div class="pass-rules">
            ${RULES.map(
              (rule) => `<article class="rule-card">
                <span class="action-icon">${icon(rule.iconName)}</span>
                <h3>${esc(rule.title)}</h3>
                <p>${esc(rule.text)}</p>
              </article>`
            ).join("")}
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <div>
              <h2 class="card-title">Pass versus no Pass</h2>
              <p>Same escrow protection either way — the difference is what the buyer can verify before paying.</p>
            </div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Buyer sees</th><th>No Pass</th><th>Verified Pass</th></tr>
              </thead>
              <tbody>
                <tr><td>Escrow + 72h validation</td><td>${badge("Included", "ok")}</td><td>${badge("Included", "ok")}</td></tr>
                <tr><td>7-day DOA cover</td><td>${badge("Included", "ok")}</td><td>${badge("Included", "ok")}</td></tr>
                <tr><td>Badge on listing card</td><td>${badge("No", "neutral")}</td><td>${badge("Yes", "teal")}</td></tr>
                <tr><td>Boot + function evidence</td><td>${badge("Seller-declared", "warn")}</td><td>${badge("On file", "teal")}</td></tr>
                <tr><td>Spot-audited serial</td><td>${badge("No", "neutral")}</td><td>${badge("10% weekly", "ok")}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>`;
}

export function render() {
  const root = pageRoot();
  if (!root) return;

  root.innerHTML = `
    <div class="container">
      <header class="page-head">
        <div>
          <p class="eyebrow">${icon("badge-check")}Trust programme</p>
          <h1>Verified Pass</h1>
          <p>A badge that means something: five evidence items per listing, a 10% weekly sample audit, and the same escrow protection on every order.</p>
        </div>
        <div class="page-head-actions">
          <a class="btn btn-secondary" href="#rules">${icon("doc")}Evidence rules</a>
          <a class="btn btn-primary" href="sell.html">${icon("plus")}List with evidence</a>
        </div>
      </header>
      ${passMarkup()}
    </div>`;
}
