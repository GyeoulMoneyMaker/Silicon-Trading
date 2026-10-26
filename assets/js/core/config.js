/* ==========================================================================
   Silicon Trading — configuration
   Single source of truth for demo policy, storage keys, roles, and catalogue.
   ========================================================================== */

export const POLICY = Object.freeze({
  commissionRate: 0.08,
  commissionFloor: 20,
  reserveRate: 0.1,
  reserveDays: 14,
  kycMonthlyVolume: 15000,
  autoReleaseHours: 72,
  doaDays: 7,
  singlePass: 49,
  proPass: 399,
  supportSlaHours: 72,
  supportProSlaHours: 48
});

export const SCHEMA_VERSION = 3;

export const STORAGE = Object.freeze({
  root: "silicon.v3",
  profile: "silicon.v3.profile",
  listings: "silicon.v3.listings",
  orders: "silicon.v3.orders",
  tickets: "silicon.v3.tickets",
  saved: "silicon.v3.saved",
  sellers: "silicon.v3.sellers",
  accounts: "silicon.v3.accounts",
  session: "silicon.v3.session",
  version: "silicon.v3.version"
});

export const PORTALS = Object.freeze({
  buyer: {
    role: "buyer",
    label: "Buyer account",
    short: "Buyer",
    email: "demo@silicon.trading",
    password: "demo1234",
    name: "Juan Dela Cruz",
    home: "account.html",
    blurb: "Track escrow orders, validation windows, and claims."
  },
  seller: {
    role: "seller",
    label: "Seller dashboard",
    short: "Seller",
    email: "seller@silicon.trading",
    password: "demo1234",
    name: "Quiapo Silicon Co.",
    home: "seller-dashboard.html",
    blurb: "Manage stock, fulfil orders, and follow payouts."
  },
  admin: {
    role: "admin",
    label: "Admin console",
    short: "Admin",
    email: "admin@silicon.trading",
    password: "demo1234",
    name: "Silicon Trading Ops",
    home: "admin-dashboard.html",
    blurb: "Oversee escrow, moderate listings, and clear disputes."
  }
});

export const CATEGORIES = Object.freeze([
  "Donor Boards",
  "Motherboards",
  "ICs",
  "Phone Parts"
]);

export const CATEGORY_IMAGES = Object.freeze({
  "Donor Boards": "assets/board-donor.svg",
  Motherboards: "assets/board-motherboard.svg",
  ICs: "assets/ic.svg",
  "Phone Parts": "assets/phone-part.svg"
});

export const CATEGORY_BLURBS = Object.freeze({
  "Donor Boards": "Harvest parts from tested, honest donors.",
  Motherboards: "Boot-tested boards with a full function matrix.",
  ICs: "Reballed, inspected, and packed anti-static.",
  "Phone Parts": "Displays, cameras, and assemblies with evidence."
});

export const GRADES = Object.freeze(["A", "B", "C"]);

export const CONDITIONS = Object.freeze([
  "OEM Pull",
  "Used-Tested",
  "For Parts",
  "New",
  "New Old Stock"
]);

export const DEVICES = Object.freeze([
  "iPhone 13 Pro",
  "iPhone 13 Pro Max",
  "iPhone 12",
  "iPhone 12 mini",
  "iPhone 11",
  "Samsung Galaxy S22",
  "Redmi Note 11",
  "Huawei P30 Pro"
]);

export const COURIERS = Object.freeze([
  { id: "jnt", name: "J&T Express", fee: 180, eta: "2–4 days" },
  { id: "lbc", name: "LBC Express", fee: 220, eta: "3–5 days" },
  { id: "ninja", name: "Ninja Van", fee: 160, eta: "2–5 days" }
]);

export const PAYMENT_METHODS = Object.freeze(["GCash", "Maya", "Card"]);

export const ORDER_TABS = Object.freeze([
  { key: "all", label: "All orders" },
  { key: "escrow", label: "In escrow" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "claims", label: "Claims" },
  { key: "closed", label: "Closed" }
]);

export const LISTING_STATUS = Object.freeze({
  ACTIVE: { label: "Live", tone: "ok" },
  PAUSED: { label: "Paused", tone: "warn" },
  PENDING: { label: "Pending review", tone: "warn" },
  REMOVED: { label: "Removed", tone: "neutral" }
});

export const ORDER_STATUS = Object.freeze({
  PAID: { label: "Paid · to ship", tone: "info" },
  SHIPPED: { label: "In transit", tone: "info" },
  DELIVERED: { label: "Delivered", tone: "brand" },
  DISPUTED: { label: "Disputed", tone: "bad" },
  DOA_CLAIM: { label: "DOA claim", tone: "bad" },
  COMPLETED: { label: "Completed", tone: "ok" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "neutral" }
});

export const ESCROW_STATUS = Object.freeze({
  HELD: { label: "In escrow", tone: "info" },
  FROZEN: { label: "Frozen", tone: "bad" },
  RELEASED: { label: "Released", tone: "ok" },
  REFUNDED: { label: "Refunded", tone: "neutral" }
});

export const ROLE_HOME = Object.freeze({
  buyer: "account.html",
  seller: "seller-dashboard.html",
  admin: "admin-dashboard.html"
});

export const TICKER_MS = 1000;
export const AUTO_RELEASE_MS = 30000;
