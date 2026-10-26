/* ==========================================================================
   Silicon Trading — page shells
   Public chrome, portal chrome, and role gates all live here.
   ========================================================================== */

import { icon } from "../core/icons.js";
import { esc, initials } from "../core/utils.js";
import { PORTALS } from "../core/config.js";
import {
  buyerAvatar,
  buyerIdentity,
  currentRole,
  isSignedIn,
  session,
  platformMetrics,
  sellerForSession,
  sellerMetrics,
  tierOf
} from "../core/selectors.js";

function avatarTag(name, src = "", size = "") {
  return `<span class="avatar ${size} ${src ? "" : "is-empty"}">
    ${src ? `<img src="${esc(src)}" alt="" />` : ""}
    <span class="avatar-fallback">${esc(initials(name))}</span>
  </span>`;
}

const PUBLIC_LINKS = [
  { key: "marketplace", label: "Marketplace", href: "marketplace.html" },
  { key: "support", label: "Support", href: "support.html" },
  { key: "account", label: "Account", href: "account.html" }
];

/* Every account sees the same public marketplace navigation. Workspace-only
   tools live inside the seller/admin portals, not in this header. */
const ROLE_LINKS = {
  guest: PUBLIC_LINKS,
  buyer: PUBLIC_LINKS,
  seller: PUBLIC_LINKS,
  admin: PUBLIC_LINKS
};

const MATCH = {
  home: [],
  marketplace: ["marketplace", "listing", "checkout"],
  listing: ["marketplace"],
  checkout: ["marketplace"],
  orders: ["orders"],
  sell: ["sell"],
  "verified-pass": ["verified-pass"],
  support: ["support"],
  account: ["account"],
  "seller-dashboard": ["seller-dashboard"],
  "admin-dashboard": ["admin-dashboard"]
};

export const roleHome = (role) => PORTALS[role]?.home || "account.html";

export function navFor(role) {
  return ROLE_LINKS[role] || ROLE_LINKS.guest;
}

function navLink(item, page) {
  const active = (MATCH[page] || []).includes(item.key);
  return `<a href="${item.href}" class="${active ? "is-active" : ""}" ${
    active ? 'aria-current="page"' : ""
  }>${esc(item.label)}</a>`;
}

function userMenu() {
  const active = session();
  if (!active) return "";
  const role = active.role;
  const portal = PORTALS[role];
  const display =
    role === "buyer"
      ? active.username || buyerIdentity()
      : String(active.name || "").split(" ")[0];
  const first = String(display || "").split(" ")[0];
  const photo = role === "buyer" ? active.avatar || buyerAvatar() : "";
  const links =
    role === "buyer"
      ? [
          { href: "orders.html", iconName: "box", label: "Orders" },
          { href: "account.html", iconName: "user", label: "Account" },
          { href: "support.html", iconName: "message", label: "Support" }
        ]
      : [
          { href: "account.html", iconName: "user", label: "Account" },
          { href: "support.html", iconName: "message", label: "Support" }
        ];
  return `<details class="user-menu">
    <summary aria-label="Account menu">
      ${avatarTag(display || active.name, photo)}
      <span class="user-menu-name">${esc(first)}</span>
      ${icon("chevron-down")}
    </summary>
    <div class="user-dropdown">
      <div class="user-dropdown-head">
        <b>${esc(display || active.name)}</b>
        <span>${esc(portal?.label || "Account")} · ${esc(active.email)}</span>
      </div>
      ${links
        .map(
          (link) =>
            `<a href="${link.href}">${icon(link.iconName)}${esc(link.label)}</a>`
        )
        .join("")}
      <button type="button" class="is-danger" data-action="sign-out">${icon(
        "logout"
      )}Sign out</button>
    </div>
  </details>`;
}

export function renderPublicChrome(page) {
  const role = currentRole();
  const links = navFor(role);
  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");
  if (!header || !footer) return;

  header.innerHTML = `<div class="container header-inner">
    <a class="brand" href="index.html" aria-label="Silicon Trading home">
      <img class="brand-logo" src="assets/Silicon Logo.jpg" alt="" />
      <span class="brand-text">
        <span class="brand-name">Silicon Trading</span>
        <span class="brand-tag">Repair-grade marketplace</span>
      </span>
    </a>
    <nav class="site-nav" aria-label="Primary">
      ${links.map((item) => navLink(item, page)).join("")}
    </nav>
    <div class="header-actions">
      <span class="header-escrow">${icon("shield")}Escrow protected</span>
      ${
        isSignedIn()
          ? userMenu()
          : `<a class="btn btn-secondary btn-sm" href="login.html">Sign in</a>
             <a class="btn btn-primary btn-sm" href="marketplace.html"><span class="btn-label">Browse</span>${icon(
               "search"
             )}</a>`
      }
      <button class="btn btn-secondary btn-icon mobile-toggle" type="button" data-action="toggle-mobile-nav" aria-label="Open menu" aria-expanded="false">
        ${icon("menu")}
      </button>
    </div>
  </div>
  <nav class="mobile-nav" aria-label="Mobile">
    ${links.map((item) => navLink(item, page)).join("")}
    <a href="login.html" class="${isSignedIn() ? "hide" : ""}">${icon(
      "lock"
    )}Sign in or create an account</a>
  </nav>`;

  const year = new Date().getFullYear();
  footer.innerHTML = `<div class="container footer-inner">
    <div class="footer-brand">
      <a class="brand" href="index.html">
        <img class="brand-logo" src="assets/Silicon Logo.jpg" alt="" />
        <span class="brand-text">
          <span class="brand-name">Silicon Trading</span>
          <span class="brand-tag">Repair-grade marketplace</span>
        </span>
      </a>
      <p>Escrowed parts for Philippine repair shops. Licensed PSP custody, 72-hour validation, and 7-day DOA cover on every order.</p>
    </div>
    <div class="footer-col">
      <h4>Marketplace</h4>
      <a href="marketplace.html">Browse parts</a>
      <a href="marketplace.html?cat=Motherboards">Motherboards</a>
      <a href="marketplace.html?cat=ICs">ICs</a>
      <a href="marketplace.html?cat=Phone%20Parts">Phone parts</a>
    </div>
    <div class="footer-col">
      <h4>Account</h4>
      <a href="login.html">Sign in</a>
      <a href="login.html?mode=register">Create buyer account</a>
      <a href="login.html?demo=seller">Seller workspace</a>
      <a href="login.html?demo=admin">Admin console</a>
    </div>
    <div class="footer-col">
      <h4>Trust &amp; policy</h4>
      <a href="support.html">Support &amp; disputes</a>
      <a href="support.html#doa">7-day DOA process</a>
      <a href="account.html">Identity &amp; KYC</a>
      <a href="support.html#escrow">Escrow protection</a>
    </div>
  </div>
  <div class="container footer-bottom">
    <span>&copy; ${year} Silicon Trading · Demo build for Philippine repair shops.</span>
    <span class="footer-demo">${icon("info")}Local demo — no real payments or shipments</span>
  </div>`;

  /* A persistent bottom-left return control for seller/admin sessions while
     they browse the public marketplace. */
  let returnLink = document.getElementById("workspaceReturn");
  if (role === "seller" || role === "admin") {
    if (!returnLink) {
      returnLink = document.createElement("a");
      returnLink.id = "workspaceReturn";
      returnLink.className = "workspace-return";
      document.body.appendChild(returnLink);
    }
    returnLink.href = roleHome(role);
    returnLink.innerHTML = `${icon("arrow-left")}<span>Back to ${
      role === "admin" ? "admin console" : "seller dashboard"
    }</span>`;
  } else if (returnLink) {
    returnLink.remove();
  }
}

/* ---------------------------------------------------------------- portals */
const SELLER_NAV = [
  {
    key: "overview",
    label: "Overview",
    iconName: "gauge",
    href: "#overview",
    view: true
  },
  {
    key: "payouts",
    label: "Payouts & reserve",
    iconName: "wallet",
    href: "#payouts",
    view: true
  }
];

const SELLER_GROUPS = [
  {
    title: "Storefront",
    links: [
      {
        key: "marketplace",
        label: "View marketplace",
        iconName: "store",
        href: "marketplace.html"
      },
      {
        key: "new-listing",
        label: "List new product",
        iconName: "plus",
        href: "#new-listing",
        view: true
      },
      {
        key: "orders",
        label: "Orders",
        iconName: "box",
        href: "#orders",
        view: true
      },
      {
        key: "listings",
        label: "Listings",
        iconName: "layers",
        href: "#listings",
        view: true
      }
    ]
  },
  {
    title: "Account",
    links: [
      {
        key: "pass",
        label: "Verified Pass",
        iconName: "badge-check",
        href: "#pass",
        view: true
      },
      {
        key: "support",
        label: "Support",
        iconName: "message",
        href: "support.html"
      },
      {
        key: "account",
        label: "Account settings",
        iconName: "user",
        href: "account.html"
      }
    ]
  }
];

const ADMIN_NAV = [
  { key: "dashboard", label: "Dashboard", iconName: "gauge", href: "#dashboard" },
  { key: "disputes", label: "Dispute queue", iconName: "gavel", href: "#disputes" },
  { key: "escrow", label: "Escrow orders", iconName: "shield", href: "#escrow" },
  { key: "moderation", label: "Moderation", iconName: "layers", href: "#moderation" },
  { key: "users", label: "Users", iconName: "users", href: "#users" },
  { key: "policy", label: "Policy guardrails", iconName: "lock", href: "#policy" }
];

const ADMIN_GROUPS = [
  {
    title: "Platform",
    links: [
      {
        key: "marketplace",
        label: "Marketplace",
        iconName: "store",
        href: "marketplace.html"
      },
      { key: "account", label: "Buyer account", iconName: "user", href: "account.html" }
    ]
  }
];

function portalNav(role, active) {
  const metrics = platformMetrics();
  const seller = role === "seller" ? sellerForSession() : null;
  const badges =
    role === "seller"
      ? {
          orders: seller ? sellerMetrics(seller.id).pendingShip.length : 0
        }
      : {
          disputes: metrics.disputes.length,
          moderation: metrics.pendingListings.length,
          users:
            metrics.pendingKyc.length +
            metrics.pendingBuyerKyc +
            metrics.pendingPass
        };
  const links = role === "admin" ? ADMIN_NAV : SELLER_NAV;
  const groups = role === "admin" ? ADMIN_GROUPS : SELLER_GROUPS;

  const renderLink = (link) => `<a class="portal-link ${
    active === link.key ? "is-active" : ""
  }" href="${link.href}" ${
    link.href.startsWith("#") && !link.view
      ? `data-scroll="${link.href.slice(1)}"`
      : ""
  } ${active === link.key ? 'aria-current="page"' : ""}>
    ${icon(link.iconName)}
    <span>${esc(link.label)}</span>
    ${badges[link.key] ? `<span class="portal-link-badge">${badges[link.key]}</span>` : ""}
  </a>`;

  return `<nav class="portal-nav" aria-label="${role === "admin" ? "Admin" : "Seller"} navigation">
    ${links.map(renderLink).join("")}
    ${groups
      .map(
        (group) => `<details class="portal-group" open>
          <summary>${esc(group.title)}${icon("chevron-right")}</summary>
          ${group.links.map(renderLink).join("")}
        </details>`
      )
      .join("")}
  </nav>`;
}

export function portalShell({
  role = "seller",
  active = "overview",
  topbarTitle = "Workspace",
  eyebrow = "",
  heading = "",
  sub = "",
  actions = "",
  content = "",
  user = ""
}) {
  const portal = PORTALS[role] || PORTALS.seller;
  const seller = role === "seller" ? sellerForSession() : null;
  const name = user || session()?.name || seller?.name || portal.name;
  const brandSub = seller ? tierOf(seller) : "Operations workspace";

  return `<div class="portal-layout">
    <aside class="portal-sidebar" id="portalSidebar" aria-label="Portal sidebar">
      <div class="portal-brand">
        <img class="portal-brand-logo" src="assets/Silicon Logo.jpg" alt="" />
        <div class="portal-brand-text">
          <span class="portal-brand-title">Silicon Trading</span>
          <span class="portal-brand-sub">${esc(brandSub)}</span>
        </div>
        <button class="sidebar-close" type="button" data-action="close-sidebar" aria-label="Close menu">&times;</button>
      </div>
      ${portalNav(role, active)}
      <div class="portal-sidebar-footer">
        <div class="portal-user">
          ${avatarTag(name)}
          <span class="portal-user-meta">
            <span class="portal-user-label">Active session</span>
            <span class="portal-user-name">${esc(name)}</span>
          </span>
        </div>
        <div class="portal-user-actions">
          <a class="portal-footer-btn" href="marketplace.html">${icon("store")}Storefront</a>
          <button class="portal-footer-btn portal-footer-btn--logout" type="button" data-action="sign-out">${icon("logout")}Sign out</button>
        </div>
      </div>
    </aside>
    <div class="sidebar-backdrop" data-action="close-sidebar"></div>
    <div class="portal-main">
      <header class="portal-topbar">
        <div class="portal-topbar-left">
          <button class="sidebar-toggle" type="button" data-action="open-sidebar" aria-label="Open navigation">
            <i></i><i></i><i></i>
          </button>
          <h1 class="portal-topbar-title">${esc(topbarTitle)}</h1>
        </div>
        <div class="portal-topbar-meta">
          <span class="portal-clock">${icon("clock")}<span data-clock>—</span></span>
          <span class="portal-role">${icon(role === "admin" ? "shield" : "store")}${esc(
    portal.short
  )}</span>
          <a class="portal-topbar-link" href="index.html">${icon("external")}<span>View site</span></a>
        </div>
      </header>
      <main class="portal-content">
        <div class="portal-content-inner">
          <header class="portal-page-head">
            <div>
              ${eyebrow ? `<p class="eyebrow">${icon(role === "admin" ? "shield" : "store")}${esc(eyebrow)}</p>` : ""}
              <h1>${esc(heading)}</h1>
              ${sub ? `<p>${sub}</p>` : ""}
            </div>
            ${actions ? `<div class="portal-page-actions">${actions}</div>` : ""}
          </header>
          ${content}
        </div>
      </main>
    </div>
  </div>`;
}

export function roleGate({ role = "seller", title, text, iconName = "lock" }) {
  const label = PORTALS[role]?.label || "Workspace";
  return `<div class="gate">
    <div class="gate-card">
      <span class="gate-icon">${icon(iconName, "icon--lg")}</span>
      <h1>${esc(title || `${label} access`)}</h1>
      <p>${esc(
        text ||
          "This workspace is role-protected for the demo. Sign in with the demo credentials to continue."
      )}</p>
      <div class="row">
        <a class="btn btn-primary" href="login.html?demo=${encodeURIComponent(
          role
        )}">${icon("lock")}Sign in to ${esc(PORTALS[role]?.short || "demo")}</a>
        <a class="btn btn-secondary" href="marketplace.html">Back to marketplace</a>
      </div>
      <p class="small" style="margin-top:16px">Use <b>${esc(
        PORTALS[role]?.email
      )}</b> with password <b>${esc(PORTALS[role]?.password)}</b>.</p>
    </div>
  </div>`;
}

export function signInHint(role) {
  const portal = PORTALS[role];
  return `<div class="auth-demo">
    <b>Demo ${esc(portal.short)} login</b><br />
    Email <code>${esc(portal.email)}</code> · password <code>${esc(
    portal.password
  )}</code>
  </div>`;
}

export function wirePortalChrome() {
  const sidebar = document.getElementById("portalSidebar");
  const backdrop = document.querySelector(".sidebar-backdrop");
  if (!sidebar) return;

  const close = () => {
    sidebar.classList.remove("is-open");
    backdrop?.classList.remove("is-open");
  };

  document.querySelectorAll('[data-action="open-sidebar"]').forEach((button) => {
    button.addEventListener("click", () => {
      sidebar.classList.add("is-open");
      backdrop?.classList.add("is-open");
    });
  });

  document.querySelectorAll('[data-action="close-sidebar"]').forEach((button) => {
    button.addEventListener("click", close);
  });

  sidebar.querySelectorAll("[data-scroll]").forEach((link) => {
    link.addEventListener("click", () => {
      sidebar.querySelectorAll(".portal-link").forEach((item) => {
        item.classList.remove("is-active");
        item.removeAttribute("aria-current");
      });
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
      close();
    });
  });
}
