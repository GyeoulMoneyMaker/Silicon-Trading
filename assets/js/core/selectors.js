/* ==========================================================================
   Silicon Trading — derived state (selectors)
   Pure reads over the store. Pages use these instead of re-deriving policy.
   ========================================================================== */

import { POLICY, ORDER_STATUS, ESCROW_STATUS, LISTING_STATUS, CATEGORY_IMAGES } from "./config.js";
import { getState } from "./store.js";
import { monthKey, nowMonthKey, round2 } from "./utils.js";

export const session = () => getState().session;

export const currentRole = () => getState().session?.role || "guest";

export const isSignedIn = () => Boolean(getState().session);

export const profile = () => getState().profile;

export function sellerForSession() {
  const state = getState();
  const active = state.session;
  if (!active) return null;
  return (
    state.sellers.find((seller) => seller.email === active.email) ||
    state.sellers.find((seller) => seller.name === active.name) ||
    state.sellers.find((seller) => seller.id === "S-02") ||
    null
  );
}

export const sellerByName = (name) =>
  getState().sellers.find((seller) => seller.name === name) || null;

export const sellerById = (id) =>
  getState().sellers.find((seller) => seller.id === id) || null;

export const sellerOf = (listing) =>
  listing ? sellerById(listing.sellerId) : null;

export const listingImage = (listing) =>
  listing?.image || CATEGORY_IMAGES[listing?.category] || "assets/board-motherboard.svg";

export function tierOf(seller) {
  if (!seller) return "Registered";
  if (seller.pro) return "Pro Workshop";
  if (seller.pass) return "Verified Pass";
  if (seller.verified) return "Verified Seller";
  return "Registered";
}

export function tierTone(seller) {
  const tier = tierOf(seller);
  if (tier === "Pro Workshop") return "brand";
  if (tier === "Verified Pass") return "teal";
  if (tier === "Verified Seller") return "ok";
  return "neutral";
}

export const listingStatus = (listing) => listing?.status || "ACTIVE";

export const listingStatusMeta = (listing) =>
  LISTING_STATUS[listingStatus(listing)] || LISTING_STATUS.ACTIVE;

export const isListingLive = (listing) =>
  listingStatus(listing) === "ACTIVE" && Number(listing.stock) > 0;

export const orderStatusMeta = (order) =>
  ORDER_STATUS[order?.status] || ORDER_STATUS.PAID;

export const escrowMeta = (order) =>
  ESCROW_STATUS[order?.escrow] || ESCROW_STATUS.HELD;

export const buyerName = () => getState().profile.name;

/* Buyers are identified by username everywhere; legacy/seeded records that
   predate usernames still fall back to the full name. */
export const buyerIdentity = () => {
  const current = getState().profile;
  return current.username || current.name;
};

export const buyerAvatar = () => getState().profile.avatar || "";

export const buyerKycPending = () =>
  getState().profile.buyerKycRequest?.status === "PENDING";

export const passRequestPending = () =>
  getState().profile.passRequest?.status === "PENDING";

export function buyerAccounts() {
  return getState().accounts.filter((account) => account.role === "buyer");
}

export function accountForEmail(email) {
  const target = String(email || "").trim().toLowerCase();
  return (
    getState().accounts.find(
      (account) => String(account.email).trim().toLowerCase() === target
    ) || null
  );
}

export function netOf(order) {
  return round2(
    Math.max(
      0,
      Number(order.subtotal || 0) -
        Number(order.commission || 0) -
        Number(order.reserve || 0)
    )
  );
}

export function sellerOrders(sellerId) {
  return getState().orders.filter((order) => order.sellerId === sellerId);
}

export function sellerListings(sellerId) {
  return getState()
    .listings.filter((listing) => listing.sellerId === sellerId)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

export function sellerTickets(sellerId) {
  return getState().tickets.filter((ticket) => ticket.sellerId === sellerId);
}

const sum = (items, fn) =>
  round2(items.reduce((total, item) => total + Number(fn(item) || 0), 0));

export function sellerMetrics(sellerId) {
  const listings = sellerListings(sellerId);
  const orders = sellerOrders(sellerId);
  const live = listings.filter((listing) => listingStatus(listing) === "ACTIVE");
  const valid = orders.filter(
    (order) => order.status !== "CANCELLED" && order.status !== "REFUNDED"
  );
  const held = orders.filter((order) => order.escrow === "HELD");
  const frozen = orders.filter((order) => order.escrow === "FROZEN");
  const released = orders.filter((order) => order.escrow === "RELEASED");
  const seller = sellerById(sellerId);

  return {
    listings,
    live,
    orders,
    seller,
    pendingShip: orders.filter((order) => order.status === "PAID"),
    disputes: orders.filter(
      (order) => order.status === "DISPUTED" || order.status === "DOA_CLAIM"
    ),
    gross: sum(valid, (order) => order.subtotal),
    inEscrow: sum(held, (order) => netOf(order)),
    frozenValue: sum(frozen, (order) => netOf(order)),
    reserveHeld: sum(held.concat(frozen), (order) => order.reserve),
    releasedNet: sum(released, (order) => netOf(order)),
    views: listings.reduce((total, listing) => total + Number(listing.views || 0), 0),
    rating: seller?.rating ?? null,
    openTickets: sellerTickets(sellerId).filter((ticket) => ticket.status === "OPEN")
      .length
  };
}

export function platformMetrics() {
  const state = getState();
  const valid = state.orders.filter(
    (order) => order.status !== "CANCELLED" && order.status !== "REFUNDED"
  );
  const held = state.orders.filter((order) => order.escrow === "HELD");
  const frozen = state.orders.filter((order) => order.escrow === "FROZEN");
  const released = state.orders.filter((order) => order.escrow === "RELEASED");

  return {
    gmv: sum(valid, (order) => order.total),
    held: sum(held, (order) => order.total),
    frozen: sum(frozen, (order) => order.total),
    commission: sum(released, (order) => order.commission),
    reserveHeld: sum(held.concat(frozen), (order) => order.reserve),
    orders: state.orders.length,
    activeListings: state.listings.filter(
      (listing) => listingStatus(listing) === "ACTIVE"
    ).length,
    pendingListings: state.listings.filter(
      (listing) => listingStatus(listing) === "PENDING"
    ),
    disputes: state.orders.filter(
      (order) => order.status === "DISPUTED" || order.status === "DOA_CLAIM"
    ),
    openTickets: state.tickets.filter((ticket) => ticket.status === "OPEN"),
    pendingKyc: state.sellers.filter((seller) => seller.kyc === "PENDING"),
    pendingBuyerKyc: buyerKycPending() ? 1 : 0,
    pendingPass: passRequestPending() ? 1 : 0,
    buyers: buyerAccounts(),
    sellers: state.sellers
  };
}

export function categoryVolume() {
  const state = getState();
  const totals = new Map();
  state.orders.forEach((order) => {
    if (order.status === "CANCELLED" || order.status === "REFUNDED") return;
    const listing = state.listings.find((item) => item.id === order.listingId);
    const key = listing?.category || "Other";
    totals.set(key, round2((totals.get(key) || 0) + Number(order.total || 0)));
  });
  return Array.from(totals.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

export function monthlyVolume() {
  const state = getState();
  const period = nowMonthKey();
  const orderVolume = state.orders
    .filter(
      (order) =>
        monthKey(order.createdAt) === period && order.status !== "CANCELLED"
    )
    .reduce((total, order) => total + Number(order.total || 0), 0);
  return round2(Number(state.profile.demoVolumeBase || 0) + orderVolume);
}

export const kycRemaining = () =>
  Math.max(0, POLICY.kycMonthlyVolume - monthlyVolume());

export const supportSlaHours = () =>
  getState().profile.passPlan === "PRO"
    ? POLICY.supportProSlaHours
    : POLICY.supportSlaHours;

export function publicListings() {
  return getState()
    .listings.filter((listing) => isListingLive(listing))
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

export function marketplaceFacets() {
  const live = publicListings();
  const byCategory = {};
  const byGrade = {};
  live.forEach((listing) => {
    byCategory[listing.category] = (byCategory[listing.category] || 0) + 1;
    byGrade[listing.grade] = (byGrade[listing.grade] || 0) + 1;
  });
  return { byCategory, byGrade, total: live.length };
}

export function savedListings() {
  const state = getState();
  return state.saved
    .map((id) => state.listings.find((listing) => listing.id === id))
    .filter(Boolean);
}

export function ordersForTab(tab) {
  const orders = getState().orders;
  const sorted = [...orders].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt)
  );
  switch (tab) {
    case "escrow":
      return sorted.filter((order) => order.escrow === "HELD");
    case "shipped":
      return sorted.filter((order) => order.status === "SHIPPED");
    case "delivered":
      return sorted.filter((order) => order.status === "DELIVERED");
    case "claims":
      return sorted.filter(
        (order) => order.status === "DISPUTED" || order.status === "DOA_CLAIM"
      );
    case "closed":
      return sorted.filter(
        (order) =>
          order.status === "COMPLETED" ||
          order.status === "REFUNDED" ||
          order.status === "CANCELLED"
      );
    default:
      return sorted;
  }
}

export const tabCounts = () => ({
  all: getState().orders.length,
  escrow: ordersForTab("escrow").length,
  shipped: ordersForTab("shipped").length,
  delivered: ordersForTab("delivered").length,
  claims: ordersForTab("claims").length,
  closed: ordersForTab("closed").length
});
