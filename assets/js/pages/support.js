/* ==========================================================================
   Support — ticket composer, evidence checklist, and policy timelines
   ========================================================================== */

import { icon } from "../core/icons.js";
import { POLICY } from "../core/config.js";
import { esc, fmtDate, pageRoot, param } from "../core/utils.js";
import { getState } from "../core/store.js";
import {
  currentRole,
  sellerForSession,
  supportSlaHours
} from "../core/selectors.js";
import { badge, emptyState, ticketCard } from "../components/ui.js";

const CATEGORIES = [
  "Order issue",
  "Dispute",
  "DOA claim",
  "Shipping",
  "Payment",
  "Account",
  "Other"
];

const DOA_STEPS = [
  {
    title: "Freeze escrow",
    text: "Open a DOA claim from the order page within 7 days of delivery. Escrow freezes immediately and the seller payout is held."
  },
  {
    title: "Upload evidence",
    text: "Record the failure on camera, keep the serial visible, and attach the listing snapshot. Support compares it with the seller's evidence pack."
  },
  {
    title: "Return label",
    text: "If the claim is upheld, the platform generates a prepaid return label. The refund clears after the first carrier scan."
  }
];

function orderOptions(selected) {
  const orders = getState().orders;
  return orders
    .map(
      (order) =>
        `<option value="${esc(order.id)}" ${
          order.id === selected ? "selected" : ""
        }>${esc(order.id)} — ${esc(order.title)}</option>`
    )
    .join("");
}

export function render() {
  const root = pageRoot();
  if (!root) return;

  const state = getState();
  const orderParam = param("order") || "";
  const sla = supportSlaHours();
  const role = currentRole();
  const seller = sellerForSession();

  const tickets = [...state.tickets]
    .filter((ticket) =>
      role === "seller" && seller ? ticket.sellerId === seller.id : true
    )
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

  const open = tickets.filter((ticket) => ticket.status === "OPEN");
  const order = orderParam
    ? state.orders.find((item) => item.id === orderParam)
    : null;

  root.innerHTML = `
    <div class="container">
      <header class="page-head">
        <div>
          <p class="eyebrow">${icon("message")}Human support</p>
          <h1>Support &amp; disputes</h1>
          <p>Open a ticket for an order, a courier problem, a claim, or an account question. Disputes freeze escrow until evidence review closes.</p>
        </div>
        <div class="page-head-actions">
          <span class="support-sla">${icon("clock")}${sla}-hour first response${
    state.profile.passPlan === "PRO" ? " · Pro Workshop" : ""
  }</span>
        </div>
      </header>

      ${
        order
          ? `<div class="alert alert--info">${icon("info")}<span>Writing about <b>${esc(
              order.id
            )}</b> · ${esc(order.title)}. The order is pre-filled below.</span></div>`
          : ""
      }

      <div class="support-layout mt-16">
        <section class="card">
          <div class="card-head">
            <div>
              <h2 class="card-title">Open a ticket</h2>
              <p>Tickets are stored locally and visible in the dashboards.</p>
            </div>
            ${badge("Open", "info")}
          </div>

          <form class="stack stack--sm" data-form="support">
            <div class="field">
              <label class="label" for="sup-subject">Subject</label>
              <input class="input" id="sup-subject" name="subject" required maxlength="120" placeholder="Short summary of the issue" />
            </div>
            <div class="field">
              <label class="label" for="sup-category">Category</label>
              <select class="select" id="sup-category" name="category">
                ${CATEGORIES.map(
                  (category) => `<option value="${esc(category)}">${esc(
                    category
                  )}</option>`
                ).join("")}
              </select>
            </div>
            <div class="field">
              <label class="label" for="sup-order">Related order</label>
              <select class="select" id="sup-order" name="orderId">
                <option value="">Not order-specific</option>
                ${orderOptions(orderParam)}
              </select>
            </div>
            <div class="field">
              <label class="label" for="sup-message">What happened?</label>
              <textarea class="textarea" id="sup-message" name="message" required placeholder="Describe the issue, what you tested, and what outcome you need. Include serial numbers or tracking where relevant."></textarea>
            </div>
            <label class="check">
              <input type="checkbox" name="evidence" />
              <span>I can provide photos, video, or diagnostic screenshots when support asks.</span>
            </label>
            <button class="btn btn-primary" type="submit">${icon(
              "message"
            )}Submit ticket</button>
            <p class="small">First response target: ${sla} hours. Disputes and DOA claims are prioritised.</p>
          </form>

          <div class="alert alert--warn mt-16">${icon("alert")}<span><b>Do not ship anything back</b> until support issues a return label. Unlabelled returns cannot be tracked or refunded.</span></div>
        </section>

        <div class="stack">
          <div class="card">
            <div class="card-head card-head--row">
              <div>
                <h2 class="card-title">Your tickets</h2>
                <p>${open.length} open · ${tickets.length - open.length} resolved</p>
              </div>
              ${badge(`${sla}h SLA`, "brand")}
            </div>
            <div class="ticket-list">
              ${
                tickets.length
                  ? tickets.map((ticket) => ticketCard(ticket)).join("")
                  : emptyState({
                      iconName: "message",
                      title: "No tickets yet",
                      text: "When you open a ticket it appears here with its SLA countdown."
                    })
              }
            </div>
          </div>

          <div class="card">
            <div class="card-head"><h3>Escrow dispute rules</h3></div>
            <ul class="policy-list">
              <li>${icon("check")}Disputes must be opened before the 72-hour validation window ends.</li>
              <li>${icon("check")}Escrow freezes the moment a dispute or DOA claim is filed.</li>
              <li>${icon("check")}Support reviews the listing snapshot, diagnostics, and both sides' evidence.</li>
              <li>${icon("check")}The full amount is released or refunded — the platform never keeps disputed funds.</li>
            </ul>
            <p class="small mt-16">Listing misrepresentation is a policy violation. Repeated findings remove the Verified Pass badge and can suspend the seller.</p>
          </div>
        </div>
      </div>

      <section class="card mt-24" id="doa">
        <div class="card-head">
          <div>
            <h2 class="card-title">7-day DOA process</h2>
            <p>Dead-on-arrival cover continues after escrow release, for ${POLICY.doaDays} days from delivery.</p>
          </div>
          ${badge("Cover after release", "teal")}
        </div>
        <div class="steps-grid">
          ${DOA_STEPS.map(
            (step, index) => `<article class="step-card">
              <span class="step-num">0${index + 1}</span>
              <h3>${esc(step.title)}</h3>
              <p>${esc(step.text)}</p>
            </article>`
          ).join("")}
        </div>
        <div class="order-facts mt-24">
          <div class="order-fact"><span>DOA window</span><b>${POLICY.doaDays} days</b></div>
          <div class="order-fact"><span>Validation window</span><b>${POLICY.autoReleaseHours} hours</b></div>
          <div class="order-fact"><span>First response</span><b>${sla} hours</b></div>
          <div class="order-fact"><span>Return label</span><b>Platform paid</b></div>
        </div>
        <p class="small mt-16">This demo build stores tickets in localStorage. Use the seller or admin dashboard to resolve them and see the SLA change.</p>
      </section>

      <section class="card mt-24">
        <div class="card-head"><h3>Recent platform activity</h3></div>
        <ul class="policy-list">
          ${state.tickets
            .slice(0, 4)
            .map(
              (ticket) =>
                `<li>${icon(
                  ticket.status === "OPEN" ? "clock" : "check"
                )}<span><b>${esc(ticket.id)}</b> · ${esc(
                  ticket.subject
                )} · ${fmtDate(ticket.createdAt)}</span></li>`
            )
            .join("")}
        </ul>
      </section>
    </div>`;
}
