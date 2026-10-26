/* ==========================================================================
   Silicon Trading — application bootstrap
   One entry point for public pages, portal workspaces, and auth.
   ========================================================================== */

import { AUTO_RELEASE_MS, COURIERS, POLICY, PORTALS, TICKER_MS } from "./core/config.js";
import { on } from "./core/bus.js";
import { clockLeft, daysLeft, esc, param, readImageFile } from "./core/utils.js";
import {
  clearSession,
  getState,
  resetDemo,
  setSession
} from "./core/store.js";
import {
  adminRelease,
  approveListing,
  authenticate,
  createOrder,
  createTicket,
  disputeOrder,
  extendValidation,
  fileDoa,
  markDelivered,
  pauseListing,
  publishListing,
  refundOrder,
  registerBuyer,
  releaseOrder,
  requestBuyerKyc,
  requestPlan,
  resolveBuyerKyc,
  resolvePassRequest,
  resolveTicket,
  resumeListing,
  returnScan,
  saveProfile,
  setSellerKyc,
  shipOrder,
  suspendSeller,
  sweepAutoRelease,
  toggleSaved,
  toggleTwoFactor,
  verifyPayout
} from "./core/actions.js";
import { icon } from "./core/icons.js";
import { monthlyVolume } from "./core/selectors.js";
import {
  renderPublicChrome,
  roleHome,
  wirePortalChrome
} from "./components/shell.js";
import * as home from "./pages/home.js";
import * as marketplace from "./pages/marketplace.js";
import * as listing from "./pages/listing.js";
import * as checkout from "./pages/checkout.js";
import * as orders from "./pages/orders.js";
import * as sell from "./pages/sell.js";
import * as verifiedPass from "./pages/verified-pass.js";
import * as support from "./pages/support.js";
import * as account from "./pages/account.js";
import * as login from "./pages/login.js";
import * as sellerDashboard from "./pages/seller-dashboard.js";
import * as adminDashboard from "./pages/admin-dashboard.js";

const PAGES = {
  home,
  marketplace,
  listing,
  checkout,
  orders,
  sell,
  "verified-pass": verifiedPass,
  support,
  account,
  login,
  "seller-dashboard": sellerDashboard,
  "admin-dashboard": adminDashboard
};

const PAGE = document.body.dataset.page || "home";
const PUBLIC = document.body.dataset.shell === "public";

function nextTarget(fallback) {
  const next = param("next");
  if (!next) return fallback;
  try {
    const url = new URL(next, location.href);
    if (url.origin !== location.origin) return fallback;
    return `${url.pathname.replace(/^\//, "")}${url.search}${url.hash}`;
  } catch (error) {
    return fallback;
  }
}

/* ------------------------------------------------------------------ toast */
let toastTimer;

function toast(message, tone = "info") {
  const node = document.getElementById("toast");
  if (!node) return;
  clearTimeout(toastTimer);
  node.className = `toast is-show${
    tone === "error" ? " is-error" : tone === "success" ? " is-success" : ""
  }`;
  node.innerHTML = `${icon(
    tone === "error" ? "alert" : tone === "success" ? "check-circle" : "info"
  )}<span>${esc(message)}</span>`;
  toastTimer = setTimeout(() => node.classList.remove("is-show"), 3400);
}

/* ----------------------------------------------------------------- render */
function render() {
  if (PUBLIC) renderPublicChrome(PAGE);
  const page = PAGES[PAGE];
  if (!page || typeof page.render !== "function") {
    console.warn(`[silicon] no renderer for page "${PAGE}"`);
    return;
  }
  page.render();
  if (document.querySelector(".portal-layout")) wirePortalChrome();
  paintTime();
}

/* -------------------------------------------------------------- time ticker */
const timeFmt = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit"
});

function paintTime() {
  const now = Date.now();
  document.querySelectorAll("[data-clock]").forEach((node) => {
    node.textContent = timeFmt.format(new Date(now));
  });

  document.querySelectorAll("[data-countdown]").forEach((node) => {
    const end = Number(node.dataset.countdown);
    if (!end) return;
    const left = end - now;
    const format = node.dataset.countdownFormat || "clock";
    const text = node.querySelector("[data-countdown-text]") ||
      node.querySelector("span") ||
      node;
    if (left <= 0) {
      text.textContent =
        format === "sla" ? "SLA breached" : format === "days" ? "Cover ended" : "Window ended";
      node.classList.add("is-urgent");
      return;
    }
    if (format === "days") text.textContent = daysLeft(left);
    else if (format === "sla") text.textContent = `SLA · ${clockLeft(left)}`;
    else text.textContent = clockLeft(left);
    node.classList.toggle("is-urgent", left < 12 * 3600e3);
  });
}

/* ------------------------------------------------------------------ dialog */
let sheet = null;

function ensureSheet() {
  if (sheet) return sheet;
  sheet = document.createElement("dialog");
  sheet.className = "sheet";
  sheet.id = "actionSheet";
  sheet.innerHTML = "";
  document.body.appendChild(sheet);

  sheet.addEventListener("click", (event) => {
    if (event.target === sheet) sheet.close();
  });

  sheet.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target.closest("[data-sheet-form]");
    if (!form) return;
    const kind = form.dataset.sheetForm;
    const data = Object.fromEntries(new FormData(form));
    const id = form.dataset.id;

    if (kind === "dispute") {
      disputeOrder(id, data.reason);
      toast("Dispute opened — escrow frozen.", "error");
    }
    if (kind === "doa") {
      fileDoa(id, data.note);
      toast("DOA claim filed — escrow frozen.", "error");
    }
    if (kind === "refund") {
      refundOrder(id);
      toast("Refund approved — return label generated.", "success");
    }
    if (kind === "plan") {
      const plan = form.dataset.plan || "SINGLE";
      requestPlan(plan);
      toast(
        `${plan === "PRO" ? "Pro Workshop" : "Single listing"} change sent to admin for approval.`,
        "success"
      );
    }
    if (kind === "reset") {
      resetDemo();
      sheet.close();
      location.href = "index.html";
      return;
    }
    sheet.close();
  });

  return sheet;
}

function closeButton() {
  return `<button class="btn btn-secondary" type="button" data-sheet-close>Cancel</button>`;
}

function openSheet({ title, sub = "", body, submitLabel, kind, id = "", plan = "", tone = "primary" }) {
  const dialog = ensureSheet();
  dialog.innerHTML = `<form data-sheet-form="${kind}" data-id="${esc(id)}" data-plan="${esc(
    plan
  )}">
    <div class="sheet-head">
      <div>
        <h2>${esc(title)}</h2>
        ${sub ? `<p>${esc(sub)}</p>` : ""}
      </div>
      <button class="btn btn-icon btn-ghost" type="button" data-sheet-close aria-label="Close">${icon(
        "close"
      )}</button>
    </div>
    <div class="sheet-body">${body}</div>
    <div class="sheet-actions">
      ${closeButton()}
      <button class="btn btn-${tone}" type="submit">${esc(submitLabel)}</button>
    </div>
  </form>`;
  dialog.querySelectorAll("[data-sheet-close]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
  dialog.showModal();
}

function openDispute(id) {
  const order = getState().orders.find((item) => item.id === id);
  if (!order) return;
  openSheet({
    title: "Open a dispute",
    sub: `${order.id} · ${order.title}`,
    kind: "dispute",
    id,
    tone: "danger",
    submitLabel: "Freeze escrow & open dispute",
    body: `<div class="alert alert--warn">${icon(
      "alert"
    )}<span>Escrow freezes immediately and the seller payout is held. Support reviews the listing snapshot, diagnostics, and both sides' evidence.</span></div>
      <div class="field mt-16">
        <label class="label" for="sheet-reason">What does not match the listing?</label>
        <textarea class="textarea" id="sheet-reason" name="reason" required placeholder="Describe the functional mismatch and what you tested."></textarea>
      </div>`
  });
}

function openDoa(id) {
  const order = getState().orders.find((item) => item.id === id);
  if (!order) return;
  openSheet({
    title: "File a DOA claim",
    sub: `${order.id} · ${order.title}`,
    kind: "doa",
    id,
    tone: "danger",
    submitLabel: "File DOA claim",
    body: `<div class="alert alert--warn">${icon(
      "shield"
    )}<span>7-day DOA cover applies after delivery, including after escrow release. A prepaid return label is generated if the claim is upheld.</span></div>
      <div class="field mt-16">
        <label class="label" for="sheet-doa">Failure description</label>
        <textarea class="textarea" id="sheet-doa" name="note" required placeholder="What failed? Keep the serial visible in your evidence."></textarea>
      </div>`
  });
}

function openRefund(id) {
  const order = getState().orders.find((item) => item.id === id);
  if (!order) return;
  openSheet({
    title: "Refund the buyer",
    sub: `${order.id} · ${order.title}`,
    kind: "refund",
    id,
    tone: "danger",
    submitLabel: `Refund ${new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(order.total)}`,
    body: `<div class="alert alert--danger">${icon(
      "alert"
    )}<span>The full escrow amount is returned and a prepaid return label is generated. This closes the order.</span></div>
      <dl class="kv mt-16">
        <dt>Order total</dt><dd>₱${Number(order.total).toLocaleString("en-PH", {
          minimumFractionDigits: 2
        })}</dd>
        <dt>Seller</dt><dd>${esc(order.seller)}</dd>
        <dt>Courier</dt><dd>${esc(order.courier)}</dd>
      </dl>`
  });
}

function openPlan(plan) {
  const pro = plan === "PRO";
  openSheet({
    title: pro ? "Request Pro Workshop" : "Request single listing",
    sub: "An admin must approve this plan change. Your current plan stays active until then.",
    kind: "plan",
    plan,
    submitLabel: pro ? "Send Pro request · ₱399 / mo" : "Send pass request · ₱49",
    body: `<div class="alert alert--warn">${icon(
      "shield"
    )}<span>Plan changes are reviewed by the platform admin. Nothing is charged and no badge changes until the request is approved.</span></div>
      <div class="alert alert--info mt-16">${icon(
        "badge-check"
      )}<span>${pro
        ? "Covers up to eight live listings, 48-hour support, and priority placement."
        : "Covers one listing for 30 days with the full five-item evidence pack."}</span></div>
      <ul class="plan-list mt-16">
        <li>${icon("check")}Badge renders only when all five evidence items are attached.</li>
        <li>${icon("check")}10% weekly sample audit applies to every Pass listing.</li>
        <li>${icon("check")}72-hour validation and 7-day DOA cover still apply.</li>
      </ul>`
  });
}

function openReset() {
  openSheet({
    title: "Reset demo data",
    sub: "This clears every local change in this browser.",
    kind: "reset",
    tone: "danger",
    submitLabel: "Reset everything",
    body: `<div class="alert alert--danger">${icon(
      "alert"
    )}<span>All orders, listings, tickets, saved parts, and the current session will be removed, then the five-seller seed is restored.</span></div>`
  });
}

/* ------------------------------------------------------------------ actions */
const SIMPLE_ACTIONS = {
  "request-buyer-kyc": [
    () => requestBuyerKyc(),
    "Verification request sent — an admin must approve it before checkout continues."
  ],
  "remove-avatar": [() => saveProfile({ avatar: "" }), "Profile picture removed."],
  "verify-payout": [
    () => verifyPayout(),
    "Payout account verified."
  ],
  "toggle-2fa": [() => toggleTwoFactor(), "Two-factor setting updated."],
  "ship-order": [(id) => shipOrder(id), "Order marked as shipped."],
  "deliver-order": [
    (id) => markDelivered(id),
    "Delivered — 72-hour validation started."
  ],
  "release-order": [(id) => releaseOrder(id), "Escrow released to the seller."],
  "admin-release": [
    (id) => adminRelease(id),
    "Escrow released after evidence review."
  ],
  "extend-validation": [
    (id) => extendValidation(id),
    "Validation window extended by 48 hours."
  ],
  "return-scan": [(id) => returnScan(id), "Return scanned — refund will clear."],
  "cancel-plan": [
    () => requestPlan("CANCEL"),
    "Cancellation request sent to admin for approval."
  ],
  "force-auto-release": [
    (id) => {
      const order = getState().orders.find((item) => item.id === id);
      if (!order) return 0;
      order.validationEndsAt = Date.now() - 1000;
      return sweepAutoRelease();
    },
    "Simulated 72-hour auto-release completed."
  ],
  "pause-listing": [
    (id) => pauseListing(id),
    "Listing paused and hidden from the marketplace."
  ],
  "resume-listing": [(id) => resumeListing(id), "Listing is live again."],
  "approve-listing": [(id) => approveListing(id), "Listing approved and published."],
  "suspend-seller": [(id) => suspendSeller(id), "Seller status updated."],
  "resolve-ticket": [(id) => resolveTicket(id), "Ticket resolved."]
};

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) {
    document
      .querySelectorAll("details.user-menu[open]")
      .forEach((menu) => (menu.open = false));
    return;
  }

  const action = trigger.dataset.action;
  const id = trigger.dataset.id;

  if (action === "toggle-saved") {
    const saved = toggleSaved(id);
    toast(saved ? "Saved for later." : "Removed from saved.", "success");
    return;
  }

  if (action === "sign-out") {
    clearSession();
    toast("Signed out.");
    setTimeout(() => {
      location.href = "index.html";
    }, 240);
    return;
  }

  if (action === "toggle-mobile-nav") {
    const open = document.body.classList.toggle("nav-open");
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    return;
  }

  if (action === "close-mobile-nav") {
    document.body.classList.remove("nav-open");
    return;
  }

  if (action === "reset-demo") {
    openReset();
    return;
  }

  if (action === "activate-plan") {
    openPlan(trigger.dataset.plan);
    return;
  }

  if (action === "open-dispute") return openDispute(id);
  if (action === "open-doa") return openDoa(id);
  if (action === "open-refund") return openRefund(id);

  if (action === "seller-kyc") {
    const status = trigger.dataset.status || "VERIFIED";
    setSellerKyc(id, status);
    toast(
      status === "VERIFIED"
        ? "Seller KYC verified — listings can go live."
        : "Seller KYC rejected.",
      status === "VERIFIED" ? "success" : "error"
    );
    return;
  }

  if (action === "buyer-kyc") {
    const status = trigger.dataset.status || "VERIFIED";
    resolveBuyerKyc(status);
    toast(
      status === "VERIFIED"
        ? "Buyer identity approved — volume cap lifted."
        : "Buyer verification request rejected.",
      status === "VERIFIED" ? "success" : "error"
    );
    return;
  }

  if (action === "pass-request") {
    const status = trigger.dataset.status || "APPROVED";
    const request = resolvePassRequest(status);
    toast(
      status === "APPROVED"
        ? "Pass request approved — the seller plan is now active."
        : "Pass request rejected — the current plan was kept.",
      status === "APPROVED" ? "success" : "error"
    );
    if (!request) toast("There is no pending Pass request.", "error");
    return;
  }

  if (action === "copy-text") {
    const text = trigger.dataset.text || "";
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast("Copied to clipboard.", "success"))
      .catch(() => toast("Copy failed in this browser.", "error"));
    return;
  }

  if (action === "scroll-top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const simple = SIMPLE_ACTIONS[action];
  if (simple) {
    simple[0](id);
    toast(simple[1], "success");
  }
});

/* smooth scrolling for portal section links */
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-scroll]");
  if (!link) return;
  event.preventDefault();
  const target = document.getElementById(link.dataset.scroll);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ------------------------------------------------------------------- forms */
document.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();

  const kind = form.dataset.form;
  const data = Object.fromEntries(new FormData(form));
  const formData = new FormData(form);

  if (kind === "home-search") {
    const query = String(data.q || "").trim();
    location.href = `marketplace.html${query ? `?q=${encodeURIComponent(query)}` : ""}`;
    return;
  }

  if (kind === "login") {
    const account = authenticate(data.email, data.password);
    if (!account) {
      toast("That email and password do not match an account.", "error");
      return;
    }
    const buyerProfile = getState().profile;
    const isBuyerAccount =
      account.role === "buyer" &&
      String(account.email).trim().toLowerCase() ===
        String(buyerProfile.email).trim().toLowerCase();
    setSession({
      role: account.role,
      name: account.name,
      username: account.username || (isBuyerAccount ? buyerProfile.username : ""),
      avatar: isBuyerAccount ? buyerProfile.avatar || account.avatar || "" : "",
      email: account.email,
      signedInAt: Date.now()
    });
    toast(`Signed in as ${PORTALS[account.role]?.short || "account"}.`, "success");
    const next = nextTarget(roleHome(account.role));
    setTimeout(() => {
      location.href = next;
    }, 220);
    return;
  }

  if (kind === "register") {
    const name = String(data.name || "").trim();
    const username = String(data.username || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");
    const confirm = String(data.confirm || "");

    if (name.length < 2) {
      toast("Enter your full name.", "error");
      return;
    }
    if (/[0-9]/.test(name)) {
      toast("Full name cannot contain numbers.", "error");
      return;
    }
    if (!/^[\p{L}\s.'’-]+$/u.test(name)) {
      toast("Use letters only in your full name.", "error");
      return;
    }
    if (!/^[A-Za-z0-9._]{3,20}$/.test(username)) {
      toast("Username must be 3–20 letters, numbers, dots, or underscores.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast("Enter a valid email address.", "error");
      return;
    }
    if (password.length < 6) {
      toast("Use a password with at least 6 characters.", "error");
      return;
    }
    if (password !== confirm) {
      toast("The passwords do not match.", "error");
      return;
    }
    const account = registerBuyer({ name, username, email, password });
    if (!account) {
      toast(
        "That email or username is already in use. Sign in or choose another username.",
        "error"
      );
      return;
    }
    setSession({
      role: account.role,
      name: account.name,
      username: account.username,
      avatar: "",
      email: account.email,
      signedInAt: Date.now()
    });
    toast("Buyer account created — you are signed in.", "success");
    const next = nextTarget("account.html");
    setTimeout(() => {
      location.href = next;
    }, 240);
    return;
  }

  if (kind === "checkout") {
    if (!getState().session) {
      toast("Create a buyer account to check out.", "error");
      setTimeout(() => {
        location.href = `login.html?mode=register&next=${encodeURIComponent(
          `checkout.html?id=${data.listingId || ""}`
        )}`;
      }, 240);
      return;
    }
    const state = getState();
    const listingItem = state.listings.find((item) => item.id === data.listingId);
    const courier = COURIERS.find((item) => item.id === data.courier);
    const profile = state.profile;
    if (!listingItem || !courier) {
      toast("That listing is no longer available.", "error");
      return;
    }
    if (!formData.get("acknowledged")) {
      toast("Acknowledge the escrow terms to continue.", "error");
      return;
    }
    if (
      !profile.buyerKyc &&
      monthlyVolume() + listingItem.price + courier.fee >=
        POLICY.kycMonthlyVolume
    ) {
      toast(
        profile.buyerKycRequest?.status === "PENDING"
          ? "Identity verification is pending admin approval."
          : "Request the identity check before paying.",
        "error"
      );
      return;
    }
    const address = {
      recipient: data.recipient,
      phone: data.phone,
      region: data.region,
      city: data.city,
      barangay: data.barangay,
      landmark: data.landmark,
      postal: data.postal
    };
    saveProfile({ address });
    const order = createOrder({
      listing: listingItem,
      courier,
      address,
      paymentMethod: data.payment
    });
    if (!order) {
      toast("Could not create the order. Try again.", "error");
      return;
    }
    toast("Payment held in escrow — order created.", "success");
    setTimeout(() => {
      location.href = `orders.html?order=${encodeURIComponent(order.id)}`;
    }, 260);
    return;
  }

  if (kind === "publish") {
    const seller = getState().sellers.find(
      (item) => item.email === getState().session?.email
    );
    const fields = {
      sellerId: seller?.id || "S-02",
      title: data.title,
      category: data.category,
      device: data.device,
      alias: data.alias,
      partNumber: data.partNumber,
      price: data.price,
      grade: data.grade,
      condition: data.condition,
      stock: data.stock,
      shipsFrom: data.shipsFrom,
      description: data.description,
      notes: data.notes,
      image: data.image || "",
      evidence: formData.getAll("evidence").filter(Boolean)
    };
    if (fields.evidence.length > 0 && fields.evidence.length < 5) {
      toast("Evidence pack incomplete — the Pass badge will not render.", "error");
    }
    const listingItem = publishListing(fields);
    if (!listingItem) {
      toast("Could not publish the listing.", "error");
      return;
    }
    toast(
      listingItem.status === "PENDING"
        ? "Listing submitted — pending admin review."
        : listingItem.pass
        ? "Listing published with Verified Pass."
        : "Listing published without the badge.",
      "success"
    );
    setTimeout(() => {
      if (data.returnTo === "workspace") {
        location.href = "seller-dashboard.html#listings";
      } else if (listingItem.status === "PENDING") {
        location.href = "seller-dashboard.html";
      } else {
        location.href = `listing.html?id=${encodeURIComponent(listingItem.id)}`;
      }
    }, 260);
    return;
  }

  if (kind === "support") {
    const order = data.orderId
      ? getState().orders.find((item) => item.id === data.orderId)
      : null;
    createTicket({
      subject: data.subject,
      category: data.category,
      orderId: data.orderId || "",
      sellerId: order?.sellerId || "",
      message: data.message
    });
    toast("Ticket opened — support will respond in the SLA window.", "success");
    return;
  }

  if (kind === "profile") {
    const name = String(data.name || "").trim();
    const username = String(data.username || "").trim();
    const email = String(data.email || "").trim().toLowerCase();

    if (/[0-9]/.test(name)) {
      toast("Full name cannot contain numbers.", "error");
      return;
    }
    if (!/^[\p{L}\s.'’-]+$/u.test(name)) {
      toast("Use letters only in your full name.", "error");
      return;
    }
    if (!/^[A-Za-z0-9._]{3,20}$/.test(username)) {
      toast("Username must be 3–20 letters, numbers, dots, or underscores.", "error");
      return;
    }
    const clash = getState().accounts.find(
      (account) =>
        String(account.username || "").trim().toLowerCase() ===
          username.toLowerCase() &&
        String(account.email || "").trim().toLowerCase() !== email
    );
    if (clash) {
      toast("That username is already taken.", "error");
      return;
    }

    saveProfile({
      name,
      username,
      email,
      phone: data.phone,
      city: data.city,
      region: data.region,
      avatar: data.avatar || ""
    });
    if (getState().session) {
      setSession({
        ...getState().session,
        username,
        avatar: data.avatar || "",
        name,
        email
      });
    }
    toast("Profile saved.", "success");
  }
});

/* ------------------------------------------------------------ image uploads */
document.addEventListener("change", async (event) => {
  const input = event.target.closest("[data-image-input]");
  if (!input || !input.files || !input.files[0]) return;

  const file = input.files[0];
  const targetId = input.dataset.imageTarget;
  const previewId = input.dataset.imagePreview;
  const secondaryId = input.dataset.imageSecondary;
  const square = input.dataset.imageShape === "square";
  const target = targetId ? document.getElementById(targetId) : null;
  const preview = previewId ? document.getElementById(previewId) : null;
  const secondary = secondaryId ? document.getElementById(secondaryId) : null;

  try {
    const dataUrl = await readImageFile(file, {
      max: square ? 512 : 1000,
      quality: square ? 0.86 : 0.82,
      square
    });
    if (target) target.value = dataUrl;
    if (preview) {
      preview.src = dataUrl;
      preview.classList.remove("is-empty");
      preview.closest(".avatar")?.classList.remove("is-empty");
      preview.closest(".avatar-upload")?.classList.add("has-photo");
    }
    if (secondary) {
      secondary.src = dataUrl;
      secondary.dataset.custom = "true";
    }
    toast(square ? "Profile picture ready — save to apply." : "Product photo attached.", "success");
  } catch (error) {
    toast(error.message || "Could not use that image.", "error");
  } finally {
    input.value = "";
  }
});

/* -------------------------------------------------------------------- boot */
function boot() {
  ensureSheet();
  render();

  setInterval(paintTime, TICKER_MS);

  on("state:change", () => {
    render();
  });

  /* The seller workspace routes between views with the URL hash. */
  window.addEventListener("hashchange", () => {
    if (PAGE === "seller-dashboard") {
      render();
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  });

  setInterval(() => {
    const released = sweepAutoRelease();
    if (released) {
      toast(
        `${released} order${released === 1 ? "" : "s"} auto-released after validation.`,
        "success"
      );
    }
  }, AUTO_RELEASE_MS);

  /* Escape closes the mobile nav. */
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") document.body.classList.remove("nav-open");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
