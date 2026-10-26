/* ==========================================================================
   Silicon Trading — mutations
   Every state change lives here, so pages only describe intent.
   ========================================================================== */

import { POLICY } from "./config.js";
import { getState, commit, persist, findOrder } from "./store.js";
import {
  sellerById,
  supportSlaHours,
  profile,
  sellerOf,
  listingImage,
  monthlyVolume
} from "./selectors.js";
import {
  commissionFor,
  reserveFor,
  round2,
  uid,
  fmtDate
} from "./utils.js";

const HOUR = 3600e3;
const DAY = 864e5;

const now = () => Date.now();

function withOrder(id, mutate) {
  const order = findOrder(id);
  if (!order) return null;
  mutate(order);
  return order;
}

function addTimeline(order, label, detail, at = now()) {
  if (!Array.isArray(order.timeline)) order.timeline = [];
  order.timeline.push({ at, label, detail });
}

function newOrderId() {
  const year = new Date().getFullYear();
  let id;
  do {
    id = `ST-${year}-${String(Math.floor(100000 + Math.random() * 899999))}`;
  } while (findOrder(id));
  return id;
}

function trackingFor(courier) {
  const code = Math.random().toString().slice(2, 12);
  if (courier === "LBC Express") return `LBC${code}`;
  if (courier === "Ninja Van") return `NV${code}`;
  return `JT${code}`;
}

function openTicket(fields) {
  const state = getState();
  const sla = supportSlaHours();
  const ticket = {
    id: uid("T-2026-"),
    subject: fields.subject,
    category: fields.category || "Other",
    orderId: fields.orderId || "",
    sellerId: fields.sellerId || "",
    message: fields.message || "",
    status: "OPEN",
    createdAt: now(),
    slaHours: sla,
    dueAt: now() + sla * HOUR,
    resolvedAt: null
  };
  state.tickets.unshift(ticket);
  return ticket;
}

/* -------------------------------------------------------------- ordering */
export function createOrder({ listing, courier, address, paymentMethod }) {
  const state = getState();
  if (!listing || !courier) return null;

  const seller = sellerOf(listing);
  const subtotal = Number(listing.price);
  const shipping = Number(courier.fee);
  const commission = commissionFor(subtotal);
  const reserve = reserveFor(subtotal);
  const total = round2(subtotal + shipping);

  if (
    !state.profile.buyerKyc &&
    monthlyVolume() + total >= POLICY.kycMonthlyVolume
  ) {
    return null;
  }

  const order = {
    id: newOrderId(),
    listingId: listing.id,
    title: listing.title,
    image: listingImage(listing),
    sellerId: listing.sellerId,
    seller: seller?.name || "Independent seller",
    subtotal,
    shipping,
    total,
    commission,
    reserve,
    commissionFloorApplied: subtotal * POLICY.commissionRate < POLICY.commissionFloor,
    status: "PAID",
    escrow: "HELD",
    paymentMethod: paymentMethod || "GCash",
    psp: "Xendit (demo)",
    pspEscrowId: uid("esc_"),
    createdAt: now(),
    courier: courier.name,
    tracking: null,
    deliveredAt: null,
    validationEndsAt: null,
    doaEndsAt: null,
    extensionUsed: false,
    completedAt: null,
    address: { ...address },
    acknowledged: true,
    doaStatus: "NONE",
    returnLabel: null,
    timeline: [
      {
        at: now(),
        label: "Order placed",
        detail: "Payment received by the licensed PSP"
      },
      {
        at: now(),
        label: "Escrow held",
        detail: `${formatAmount(total)} held until the buyer validates the part`
      }
    ]
  };

  state.orders.unshift(order);

  const catalogItem = state.listings.find((item) => item.id === listing.id);
  if (catalogItem && Number(catalogItem.stock) > 0) {
    catalogItem.stock = Number(catalogItem.stock) - 1;
  }

  commit(["orders", "listings"]);
  return order;
}

function formatAmount(value) {
  return "₱" + Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* ---------------------------------------------------------- fulfilment ops */
export function shipOrder(orderId) {
  const order = withOrder(orderId, (item) => {
    if (item.status !== "PAID") return;
    item.status = "SHIPPED";
    item.tracking = trackingFor(item.courier);
    addTimeline(
      item,
      "Picked up by courier",
      `${item.courier} · ${item.tracking}`
    );
  });
  if (order) commit("orders");
  return order;
}

export function markDelivered(orderId) {
  const order = withOrder(orderId, (item) => {
    if (item.status !== "SHIPPED" && item.status !== "PAID") return;
    if (!item.tracking) item.tracking = trackingFor(item.courier);
    item.status = "DELIVERED";
    item.deliveredAt = now();
    item.validationEndsAt = now() + POLICY.autoReleaseHours * HOUR;
    item.doaEndsAt = now() + POLICY.doaDays * DAY;
    addTimeline(item, "Delivered", "72-hour validation window started");
  });
  if (order) commit("orders");
  return order;
}

export function releaseOrder(orderId) {
  const order = withOrder(orderId, (item) => {
    if (item.escrow !== "HELD") return;
    item.escrow = "RELEASED";
    item.status = "COMPLETED";
    item.completedAt = now();
    addTimeline(
      item,
      "Escrow released",
      "Buyer validated the part · seller payable queued"
    );
  });
  if (order) commit("orders");
  return order;
}

export function extendValidation(orderId) {
  const order = withOrder(orderId, (item) => {
    if (item.extensionUsed || !item.validationEndsAt) return;
    item.extensionUsed = true;
    item.validationEndsAt += 48 * HOUR;
    addTimeline(item, "Validation extended", "Buyer added 48 hours to the window");
  });
  if (order) commit("orders");
  return order;
}

export function disputeOrder(orderId, reason) {
  const order = withOrder(orderId, (item) => {
    if (item.escrow !== "HELD") return;
    item.status = "DISPUTED";
    item.escrow = "FROZEN";
    item.disputeReason =
      reason ||
      "Buyer reports a functional mismatch with the listing diagnostics.";
    addTimeline(
      item,
      "Dispute opened",
      "Escrow frozen · evidence review started"
    );
    openTicket({
      subject: `Dispute — ${item.title}`,
      category: "Dispute",
      orderId: item.id,
      sellerId: item.sellerId,
      message: item.disputeReason
    });
  });
  if (order) commit(["orders", "tickets"]);
  return order;
}

export function fileDoa(orderId, note) {
  const order = withOrder(orderId, (item) => {
    if (item.status === "REFUNDED" || item.status === "CANCELLED") return;
    item.status = "DOA_CLAIM";
    item.escrow = "FROZEN";
    item.doaStatus = "CLAIMED";
    item.doaNote =
      note || "Buyer reports the part is dead on arrival. Return requested.";
    addTimeline(item, "DOA claim filed", "7-day cover · evidence requested");
    openTicket({
      subject: `DOA claim — ${item.title}`,
      category: "DOA",
      orderId: item.id,
      sellerId: item.sellerId,
      message: item.doaNote
    });
  });
  if (order) commit(["orders", "tickets"]);
  return order;
}

/* ---------------------------------------------------------------- admin ops */
export function refundOrder(orderId) {
  const order = withOrder(orderId, (item) => {
    item.escrow = "REFUNDED";
    item.status = "REFUNDED";
    item.completedAt = now();
    item.doaStatus = item.doaStatus === "CLAIMED" ? "UPHELD" : item.doaStatus;
    item.returnLabel =
      item.returnLabel || `RET-${new Date().getFullYear()}-${uid("").slice(0, 6)}`;
    addTimeline(
      item,
      "Refund approved",
      "Buyer refunded in full · prepaid return label issued"
    );
  });
  if (order) commit("orders");
  return order;
}

export function adminRelease(orderId) {
  const order = withOrder(orderId, (item) => {
    if (item.escrow === "RELEASED") return;
    item.escrow = "RELEASED";
    item.status = "COMPLETED";
    item.completedAt = now();
    addTimeline(
      item,
      "Escrow released by platform",
      "Evidence review closed in the seller's favour"
    );
  });
  if (order) commit("orders");
  return order;
}

export function returnScan(orderId) {
  const order = withOrder(orderId, (item) => {
    item.doaStatus = "RETURN_IN_TRANSIT";
    item.returnLabel =
      item.returnLabel || `RET-${new Date().getFullYear()}-${uid("").slice(0, 6)}`;
    addTimeline(
      item,
      "Return scanned",
      `Courier accepted the parcel · ${item.returnLabel}`
    );
  });
  if (order) commit("orders");
  return order;
}

export function resolveTicket(ticketId) {
  const state = getState();
  const ticket = state.tickets.find((item) => item.id === ticketId);
  if (!ticket || ticket.status === "RESOLVED") return null;
  ticket.status = "RESOLVED";
  ticket.resolvedAt = now();
  commit("tickets");
  return ticket;
}

export function approveListing(listingId) {
  const state = getState();
  const listing = state.listings.find((item) => item.id === listingId);
  if (!listing) return null;
  listing.status = "ACTIVE";
  listing.approvedAt = now();
  commit("listings");
  return listing;
}

export function pauseListing(listingId) {
  const state = getState();
  const listing = state.listings.find((item) => item.id === listingId);
  if (!listing || listing.status !== "ACTIVE") return null;
  listing.status = "PAUSED";
  commit("listings");
  return listing;
}

export function resumeListing(listingId) {
  const state = getState();
  const listing = state.listings.find((item) => item.id === listingId);
  if (!listing || listing.status !== "PAUSED") return null;
  listing.status = "ACTIVE";
  commit("listings");
  return listing;
}

export function setSellerKyc(sellerId, status) {
  const state = getState();
  const seller = state.sellers.find((item) => item.id === sellerId);
  if (!seller) return null;
  seller.kyc = status;
  if (status === "VERIFIED") seller.verified = true;
  commit("sellers");
  return seller;
}

export function suspendSeller(sellerId) {
  const state = getState();
  const seller = state.sellers.find((item) => item.id === sellerId);
  if (!seller) return null;
  seller.status = seller.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
  commit("sellers");
  return seller;
}

/* --------------------------------------------------------------- catalogue */
export function publishListing(fields) {
  const state = getState();
  const seller = sellerById(fields.sellerId);
  if (!seller) return null;

  const evidenceLabels = Array.isArray(fields.evidence)
    ? fields.evidence.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const pass = Boolean(seller.pass) && evidenceLabels.length >= 5;

  const listing = {
    id: `L-${Math.floor(1100 + Math.random() * 8000)}`,
    title: fields.title,
    ...(fields.image ? { image: fields.image } : {}),
    category: fields.category,
    device: fields.device || fields.title,
    alias: fields.alias || "-",
    partNumber: fields.partNumber || "-",
    price: round2(fields.price),
    grade: fields.grade || "B",
    condition: fields.condition || "OEM Pull",
    sellerId: seller.id,
    pass,
    auditedAt: pass ? fmtDate(now()) : null,
    evidence: pass
      ? evidenceLabels.map((label) => ({ label, meta: "uploaded with listing" }))
      : null,
    notes: fields.notes
      ? fields.notes
          .split("\n")
          .map((note) => note.trim())
          .filter(Boolean)
      : [],
    description: fields.description || "",
    diagnostics: {
      "Powers on": true,
      "Boots to OS": true,
      "Face ID / Touch ID": true,
      Charging: true,
      "Display & touch": true,
      Cameras: true,
      "Wi-Fi & Bluetooth": true,
      "Battery health": "—",
      "Water damage indicator": "Clean",
      "Serial / part number": "Matches listing"
    },
    compat: [fields.device].filter(Boolean),
    water: false,
    stock: Math.max(1, Number(fields.stock) || 1),
    shipsFrom: fields.shipsFrom || seller.city,
    shipsIn: "2–5 days",
    views: 0,
    status: seller.verified ? "ACTIVE" : "PENDING",
    createdAt: now()
  };

  state.listings.unshift(listing);
  commit("listings");
  return listing;
}

export function addListingView(listingId) {
  const state = getState();
  const listing = state.listings.find((item) => item.id === listingId);
  if (!listing) return;
  listing.views = Number(listing.views || 0) + 1;
  persist("listings");
}

/* -------------------------------------------------------------- buyer side */
export function findAccount(email) {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return null;
  return (
    getState().accounts.find(
      (account) => String(account.email).trim().toLowerCase() === target
    ) || null
  );
}

export function authenticate(email, password) {
  const account = findAccount(email);
  if (!account || account.password !== String(password || "")) return null;
  return account;
}

export function findUsername(username, excludeEmail = "") {
  const target = String(username || "").trim().toLowerCase();
  if (!target) return null;
  return (
    getState().accounts.find(
      (account) =>
        String(account.username || "").trim().toLowerCase() === target &&
        String(account.email || "").trim().toLowerCase() !==
          String(excludeEmail || "").trim().toLowerCase()
    ) || null
  );
}

export function registerBuyer({ name, username, email, password }) {
  const state = getState();
  const cleanName = String(name || "").trim();
  const cleanUsername = String(username || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanName || !cleanUsername || !cleanEmail || !password) return null;
  if (findAccount(cleanEmail) || findUsername(cleanUsername)) return null;
  if (!/^[A-Za-z0-9._]{3,20}$/.test(cleanUsername)) return null;

  const account = {
    id: uid("A-"),
    role: "buyer",
    name: cleanName,
    username: cleanUsername,
    avatar: "",
    email: cleanEmail,
    password: String(password),
    createdAt: now(),
    demo: false
  };

  state.accounts.push(account);
  state.profile = {
    ...state.profile,
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    avatar: "",
    buyerKyc: false,
    buyerKycRequest: null,
    emailVerified: true,
    memberSince: now()
  };
  commit(["accounts", "profile"]);
  return account;
}

export function toggleSaved(listingId) {
  const state = getState();
  const index = state.saved.indexOf(listingId);
  if (index >= 0) {
    state.saved.splice(index, 1);
    commit("saved");
    return false;
  }
  state.saved.push(listingId);
  commit("saved");
  return true;
}

/* Buyer KYC is now a two-step flow: the buyer requests a higher limit and an
   admin approves it. Orders stay blocked until that approval lands. */
export function requestBuyerKyc() {
  const state = getState();
  if (state.profile.buyerKyc) return null;
  if (state.profile.buyerKycRequest?.status === "PENDING") {
    return state.profile.buyerKycRequest;
  }
  state.profile.buyerKycRequest = {
    status: "PENDING",
    requestedAt: now(),
    volume: monthlyVolume()
  };
  commit("profile");
  return state.profile.buyerKycRequest;
}

export function resolveBuyerKyc(status = "VERIFIED") {
  const state = getState();
  const request = state.profile.buyerKycRequest;
  state.profile.buyerKyc = status === "VERIFIED";
  state.profile.buyerKycRequest = request
    ? { ...request, status, resolvedAt: now() }
    : { status, requestedAt: null, resolvedAt: now() };
  commit("profile");
  return state.profile;
}

/* Kept as the direct admin action; the demo UI uses the request above. */
export function verifyBuyerKyc() {
  return resolveBuyerKyc("VERIFIED");
}

export function verifyPayout() {
  const state = getState();
  state.profile.payoutVerified = true;
  state.profile.payoutAccount =
    state.profile.payoutAccount || "BPI · •••• 4412";
  commit("profile");
  return state.profile;
}

export function toggleTwoFactor() {
  const state = getState();
  state.profile.twoFactor = !state.profile.twoFactor;
  commit("profile");
  return state.profile.twoFactor;
}

export function saveProfile(patch) {
  const state = getState();
  state.profile = { ...state.profile, ...patch };
  const account = state.accounts.find(
    (item) =>
      String(item.email).trim().toLowerCase() ===
      String(state.profile.email).trim().toLowerCase()
  );
  if (account) {
    if (patch.username) account.username = patch.username;
    if (patch.avatar !== undefined) account.avatar = patch.avatar;
    if (patch.name) account.name = patch.name;
  }
  commit(["profile", "accounts"]);
  return state.profile;
}

function applyPlan(state, plan) {
  const isPro = plan === "PRO";
  state.profile.passPlan = isPro ? "PRO" : "SINGLE";
  state.profile.passStartedAt = now();
  state.profile.passExpires = now() + 30 * DAY;
  const seller =
    state.sellers.find((item) => item.id === "S-02") ||
    state.sellers.find((item) => item.email === state.profile.email);
  if (seller) {
    seller.pass = true;
    seller.pro = isPro;
  }
}

function clearPlan(state) {
  state.profile.passPlan = "NONE";
  state.profile.passStartedAt = null;
  state.profile.passExpires = null;
  const seller =
    state.sellers.find((item) => item.id === "S-02") ||
    state.sellers.find((item) => item.email === state.profile.email);
  if (seller) {
    seller.pass = false;
    seller.pro = false;
  }
}

/* Pass changes are queued for admin approval. The active plan does not move
   until an admin resolves the request. */
export function requestPlan(plan) {
  const state = getState();
  const requested = plan === "CANCEL" ? "CANCEL" : plan === "PRO" ? "PRO" : "SINGLE";
  if (state.profile.passRequest?.status === "PENDING") {
    return state.profile.passRequest;
  }
  if (requested === "CANCEL" && state.profile.passPlan === "NONE") return null;
  state.profile.passRequest = {
    status: "PENDING",
    plan: requested,
    fromPlan: state.profile.passPlan,
    requestedAt: now()
  };
  commit("profile");
  return state.profile.passRequest;
}

export function resolvePassRequest(status = "APPROVED") {
  const state = getState();
  const request = state.profile.passRequest;
  if (!request || request.status !== "PENDING") return null;
  if (status === "APPROVED") {
    if (request.plan === "CANCEL") clearPlan(state);
    else applyPlan(state, request.plan);
  }
  state.profile.passRequest = { ...request, status, resolvedAt: now() };
  commit(["profile", "sellers"]);
  return state.profile.passRequest;
}

export function activatePlan(plan) {
  const state = getState();
  applyPlan(state, plan);
  commit(["profile", "sellers"]);
  return state.profile;
}

export function cancelPlan() {
  const state = getState();
  clearPlan(state);
  commit(["profile", "sellers"]);
  return state.profile;
}

export function createTicket(fields) {
  const ticket = openTicket(fields);
  commit("tickets");
  return ticket;
}

/* ---------------------------------------------------------------- housekeeping */
export function sweepAutoRelease() {
  const state = getState();
  let released = 0;
  state.orders.forEach((order) => {
    if (
      order.escrow === "HELD" &&
      order.status === "DELIVERED" &&
      order.validationEndsAt &&
      order.validationEndsAt <= now()
    ) {
      order.escrow = "RELEASED";
      order.status = "COMPLETED";
      order.completedAt = now();
      addTimeline(
        order,
        "Escrow auto-released",
        "Validation window ended without a dispute"
      );
      released += 1;
    }
  });
  if (released) commit("orders");
  return released;
}

export function sellerOfListing(listing) {
  return sellerOf(listing);
}

export function todayLabel(timestamp = now()) {
  return fmtDate(timestamp);
}

export { profile };
