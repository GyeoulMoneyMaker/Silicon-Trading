/* ==========================================================================
   Silicon Trading — persistence layer
   The demo has no backend. Every mutation runs through here so storage and
   the live in-memory state never drift apart.
   ========================================================================== */

import { SCHEMA_VERSION, STORAGE } from "./config.js";
import { emit } from "./bus.js";
import { buildSeed } from "../data/seed.js";
import { clone, readJson, removeKey, writeJson } from "./utils.js";

const PARTS = [
  "profile",
  "sellers",
  "listings",
  "orders",
  "tickets",
  "saved",
  "accounts",
  "session"
];

let state = load();

function seedAll() {
  const seeded = buildSeed();
  PARTS.forEach((part) => writeJson(STORAGE[part], seeded[part]));
  writeJson(STORAGE.version, SCHEMA_VERSION);
  return seeded;
}

function load() {
  const version = readJson(STORAGE.version, 0);
  if (Number(version) !== SCHEMA_VERSION) {
    return seedAll();
  }

  const seeded = buildSeed();
  return {
    profile: { ...seeded.profile, ...readJson(STORAGE.profile, {}) },
    sellers: readJson(STORAGE.sellers, seeded.sellers),
    listings: readJson(STORAGE.listings, seeded.listings),
    orders: readJson(STORAGE.orders, seeded.orders),
    tickets: readJson(STORAGE.tickets, seeded.tickets),
    saved: readJson(STORAGE.saved, seeded.saved),
    accounts: readJson(STORAGE.accounts, seeded.accounts),
    session: readJson(STORAGE.session, null)
  };
}

export function getState() {
  return state;
}

export function persist(parts) {
  const list = Array.isArray(parts) ? parts : [parts];
  list.forEach((part) => {
    if (PARTS.includes(part)) writeJson(STORAGE[part], state[part]);
  });
  return state;
}

export function commit(parts) {
  persist(parts);
  emit("state:change", { parts: Array.isArray(parts) ? parts : [parts] });
  return state;
}

export function replaceState(next) {
  state = { ...state, ...clone(next) };
  return state;
}

export function resetDemo() {
  PARTS.forEach((part) => removeKey(STORAGE[part]));
  removeKey(STORAGE.version);
  state = seedAll();
  emit("state:change", { parts: PARTS, reset: true });
  return state;
}

export function setSession(session) {
  state.session = session;
  return commit("session");
}

export function clearSession() {
  state.session = null;
  return commit("session");
}

export function updateProfile(patch) {
  state.profile = { ...state.profile, ...patch };
  return commit("profile");
}

export function replaceListings(listings) {
  state.listings = listings;
  return commit("listings");
}

export function replaceOrders(orders) {
  state.orders = orders;
  return commit("orders");
}

export function replaceTickets(tickets) {
  state.tickets = tickets;
  return commit("tickets");
}

export function replaceSellers(sellers) {
  state.sellers = sellers;
  return commit("sellers");
}

export function replaceAccounts(accounts) {
  state.accounts = accounts;
  return commit("accounts");
}

export function replaceSaved(saved) {
  state.saved = saved;
  return commit("saved");
}

export function findOrder(id) {
  return state.orders.find((order) => order.id === id) || null;
}

export function findListing(id) {
  return state.listings.find((listing) => listing.id === id) || null;
}

export function findSeller(id) {
  return state.sellers.find((seller) => seller.id === id) || null;
}
