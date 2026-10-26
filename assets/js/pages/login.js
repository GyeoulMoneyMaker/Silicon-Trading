/* ==========================================================================
   Login — one account form for buyers, sellers, and admin
   The account determines the workspace; there are no role tabs.
   ========================================================================== */

import { icon } from "../core/icons.js";
import { PORTALS } from "../core/config.js";
import {
  esc,
  pageRoot,
  param,
  setParams,
  initials
} from "../core/utils.js";
import { isSignedIn, session } from "../core/selectors.js";
import { getState } from "../core/store.js";
import { roleHome } from "../components/shell.js";
import { badge } from "../components/ui.js";

const ROLES = ["buyer", "seller", "admin"];
let mode = param("mode") === "register" ? "register" : "login";
let demoKey = param("demo");
if (!ROLES.includes(demoKey)) demoKey = "";
if (mode === "login" && !demoKey) demoKey = "buyer";

const nextParam = param("next");
const nextQuery = nextParam ? `&next=${encodeURIComponent(nextParam)}` : "";

function modeTab(key, label) {
  return `<button class="auth-tab ${
    mode === key ? "is-active" : ""
  }" type="button" data-auth-mode="${key}" aria-pressed="${mode === key}">
    ${esc(label)}
  </button>`;
}

function loginFields() {
  const portal = demoKey ? PORTALS[demoKey] : PORTALS.buyer;
  return `
    <div class="field">
      <label class="label" for="login-email">Email</label>
      <input class="input" id="login-email" name="email" type="email" value="${esc(
        portal.email
      )}" required autocomplete="username" />
    </div>
    <div class="field">
      <label class="label" for="login-password">Password</label>
      <div class="input-group">
        ${icon("lock")}
        <input class="input" id="login-password" name="password" type="password" value="${esc(
          portal.password
        )}" required autocomplete="current-password" />
      </div>
    </div>`;
}

function registerFields() {
  return `
    <div class="field">
      <label class="label" for="register-name">Full name</label>
      <input class="input" id="register-name" name="name" type="text" placeholder="Juan Dela Cruz" required autocomplete="name" pattern="[A-Za-z\\s.'-]+" title="Letters only — numbers are not allowed." />
      <span class="field-hint">Letters only. Numbers are not allowed.</span>
    </div>
    <div class="field">
      <label class="label" for="register-username">Username</label>
      <input class="input" id="register-username" name="username" type="text" placeholder="juandc" required minlength="3" maxlength="20" pattern="[A-Za-z0-9._]{3,20}" title="3–20 letters, numbers, dots, or underscores." autocomplete="username" />
      <span class="field-hint">This is the name shown on your buyer profile.</span>
    </div>
    <div class="field">
      <label class="label" for="register-email">Email</label>
      <input class="input" id="register-email" name="email" type="email" placeholder="you@shop.ph" required autocomplete="email" />
    </div>
    <div class="field">
      <label class="label" for="register-password">Password</label>
      <div class="input-group">
        ${icon("lock")}
        <input class="input" id="register-password" name="password" type="password" minlength="6" placeholder="At least 6 characters" required autocomplete="new-password" />
      </div>
    </div>
    <div class="field">
      <label class="label" for="register-confirm">Confirm password</label>
      <div class="input-group">
        ${icon("lock")}
        <input class="input" id="register-confirm" name="confirm" type="password" minlength="6" placeholder="Repeat your password" required autocomplete="new-password" />
      </div>
    </div>`;
}

function demoAccounts() {
  return `<div class="auth-demo">
    <b>Demo accounts</b>
    <div class="stack stack--sm mt-8">
      ${ROLES.map((key) => {
        const portal = PORTALS[key];
        return `<button class="auth-demo-account" type="button" data-demo-account="${key}">
          <span>${icon(
            key === "admin" ? "shield" : key === "seller" ? "store" : "user"
          )}${esc(portal.short)}</span>
          <code>${esc(portal.email)}</code>
        </button>`;
      }).join("")}
    </div>
    <span class="auth-demo-note">All demo passwords are <code>demo1234</code>. Click an account to fill the form.</span>
  </div>`;
}

export function render() {
  const root = pageRoot();
  if (!root) return;

  const current = session();
  const signedIn = isSignedIn() && current;
  const buyerProfile = getState().profile;
  const display =
    current?.role === "buyer"
      ? current.username || buyerProfile.username || current.name
      : current?.name;
  const photo =
    current?.role === "buyer" ? current.avatar || buyerProfile.avatar || "" : "";

  root.innerHTML = `
    <div class="auth-card">
      <a class="auth-brand" href="index.html">
        <img class="auth-brand-logo" src="assets/Silicon Logo.jpg" alt="" />
        <span class="auth-brand-text">
          <span class="auth-brand-name">Silicon Trading</span>
          <span class="auth-brand-sub">Escrow marketplace · one account</span>
        </span>
      </a>

      ${
        signedIn && mode === "login"
          ? `<div class="auth-session mb-16">
              <span class="avatar ${photo ? "" : "is-empty"}">
                ${photo ? `<img src="${esc(photo)}" alt="" />` : ""}
                <span class="avatar-fallback">${esc(initials(display))}</span>
              </span>
              <div style="flex:1;min-width:0">
                <b>${esc(display)}</b>
                <span>${esc(PORTALS[current.role]?.label || "Account")} · ${esc(
              current.email
            )}</span>
              </div>
              ${badge("Signed in", "ok")}
            </div>
            <a class="btn btn-primary btn-block mb-16" href="${roleHome(
              current.role
            )}">${icon("grid")}Continue to ${esc(
              PORTALS[current.role]?.short || "workspace"
            )}</a>
            <div class="auth-divider">or use another account</div>`
          : ""
      }

      <h1 class="auth-title">${
        mode === "register" ? "Create a buyer account" : "Sign in"
      }</h1>
      <p class="auth-subtitle">${
        mode === "register"
          ? "Buyers need an account to check out. Register once with your email and password, then return to the part you were buying."
          : "Enter your email and password. We check the account and open the buyer account, seller workspace, or admin console it belongs to."
      }</p>

      <div class="auth-tabs auth-tabs--two" role="tablist" aria-label="Account access">
        ${modeTab("login", "Sign in")}
        ${modeTab("register", "Create account")}
      </div>

      <form class="auth-form" data-form="${
        mode === "register" ? "register" : "login"
      }">
        ${mode === "register" ? registerFields() : loginFields()}
        <div class="auth-meta">
          <span>${icon("shield")}${
            mode === "register"
              ? "Buyer accounts can check out and track escrow orders."
              : "One sign-in. Your account chooses the workspace."
          }</span>
          <a href="support.html">Need help?</a>
        </div>
        <button class="btn btn-primary btn-block" type="submit">${icon(
          mode === "register" ? "user" : "lock"
        )}${
          mode === "register" ? "Create buyer account" : "Sign in"
        }</button>
      </form>

      ${
        mode === "login"
          ? `<div class="auth-switch">
              New buyer? <a href="login.html?mode=register${nextQuery}">Create an account</a>
            </div>
            <div class="auth-divider">demo account</div>
            ${demoAccounts()}`
          : `<div class="auth-switch">
              Already have an account? <a href="login.html${nextQuery ? `?next=${encodeURIComponent(
                nextParam
              )}` : ""}">Sign in</a>
            </div>
            <div class="auth-foot">
              <span>${icon("info")}Seller and admin accounts are provisioned by the platform. Buyer registration is instant in this demo.</span>
            </div>`
      }

      <a class="btn btn-ghost btn-block mt-16" href="index.html">${icon(
        "arrow-left"
      )}Back to marketplace</a>
    </div>

    <a class="auth-back" href="index.html">Continue browsing as a guest</a>`;

  root.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.authMode;
      setParams({ mode: mode === "login" ? "" : mode, demo: "" });
      render();
    });
  });

  root.querySelectorAll("[data-demo-account]").forEach((button) => {
    button.addEventListener("click", () => {
      demoKey = button.dataset.demoAccount;
      mode = "login";
      setParams({ mode: "", demo: demoKey });
      render();
    });
  });
}
