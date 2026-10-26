/* ==========================================================================
   Account — buyer profile, verification, volume, saved stock
   ========================================================================== */

import { icon } from "../core/icons.js";
import { POLICY } from "../core/config.js";
import {
  esc,
  fmtDate,
  initials,
  pageRoot,
  pct,
  peso0,
  peso
} from "../core/utils.js";
import { getState } from "../core/store.js";
import {
  currentRole,
  isSignedIn,
  kycRemaining,
  monthlyVolume,
  profile as getProfile,
  savedListings,
  sellerForSession,
  tierOf
} from "../core/selectors.js";
import { badge, emptyState, meter, orderCard, savedItem, tierBadge } from "../components/ui.js";
import { PORTALS } from "../core/config.js";
import { roleHome } from "../components/shell.js";

function accountAvatar(profile, displayName, size = "avatar--lg") {
  const hasPhoto = Boolean(profile.avatar);
  return `<span class="avatar ${size} ${hasPhoto ? "" : "is-empty"}">
    ${hasPhoto ? `<img src="${esc(profile.avatar)}" alt="" />` : ""}
    <span class="avatar-fallback">${esc(initials(displayName))}</span>
  </span>`;
}

function verifyRow({ done, iconName, title, text, action, extra = "" }) {
  return `<div class="verify-row ${done ? "is-done" : ""}">
    ${icon(iconName)}
    <div><b>${esc(title)}</b><span>${esc(text)}</span></div>
    ${action || badge(done ? "Verified" : "Pending", done ? "ok" : "warn")}
    ${extra}
  </div>`;
}

export function render() {
  const root = pageRoot();
  if (!root) return;

  const state = getState();
  const profile = getProfile();
  const saved = savedListings();
  const volume = monthlyVolume();
  const remaining = kycRemaining();
  const role = currentRole();
  const seller = sellerForSession();
  const orders = [...state.orders].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt)
  );
  const activeOrders = orders.filter(
    (order) => order.status !== "COMPLETED" && order.status !== "REFUNDED"
  );
  const displayName = profile.username || profile.name;
  const kycPending = profile.buyerKycRequest?.status === "PENDING";
  const overLimit = volume >= POLICY.kycMonthlyVolume;
  const buyerSession = state.session?.role === "buyer";
  const sessionName = buyerSession
    ? profile.username || state.session.name
    : state.session?.name;
  const sessionAvatar = buyerSession ? profile.avatar : "";

  root.innerHTML = `
    <div class="container">
      <header class="page-head">
        <div>
          <p class="eyebrow">${icon("user")}Account</p>
          <h1>Your account</h1>
          <p>Buyer profile, identity checks, payout readiness, and saved stock. Everything is stored locally for this demo.</p>
        </div>
        <div class="page-head-actions">
          ${
            isSignedIn()
              ? `<a class="btn btn-secondary" href="${roleHome(role)}">${icon(
                  "grid"
                )}${esc(PORTALS[role]?.label || "Dashboard")}</a>`
              : `<a class="btn btn-primary" href="login.html">${icon(
                  "lock"
                )}Sign in or create account</a>`
          }
          <a class="btn btn-secondary" href="orders.html">${icon(
            "box"
          )}Orders</a>
        </div>
      </header>

      ${
        !isSignedIn()
          ? `<div class="alert alert--info">${icon(
              "info"
            )}<span><b>Guest session.</b> You can browse the marketplace without an account. Create a buyer account with email, password, and password confirmation to check out; seller and admin accounts open their own workspaces.</span>
            <a class="btn btn-primary btn-sm" href="login.html?mode=register">${icon(
              "user"
            )}Create buyer account</a></div>`
          : ""
      }

      <div class="account-layout mt-16">
        <div class="stack">
          <section class="card">
            <div class="account-profile">
              ${accountAvatar(profile, displayName, "avatar--lg")}
              <div style="flex:1;min-width:0">
                <h2>@${esc(displayName)}</h2>
                <p>${esc(profile.name)} · ${esc(profile.city)}, ${esc(
    profile.region
  )} · member since ${fmtDate(profile.memberSince)}</p>
              </div>
              ${badge(
                profile.buyerKyc
                  ? "KYC verified"
                  : kycPending
                  ? "Verification pending"
                  : "KYC optional",
                profile.buyerKyc ? "ok" : kycPending ? "warn" : "neutral"
              )}
            </div>

            <form class="mt-24" data-form="profile">
              <div class="avatar-upload">
                <span class="avatar avatar--xl ${profile.avatar ? "" : "is-empty"}" id="acc-avatar-preview">
                  ${profile.avatar ? `<img src="${esc(profile.avatar)}" alt="" />` : ""}
                  <span class="avatar-fallback">${esc(initials(displayName))}</span>
                </span>
                <div class="avatar-upload-body">
                  <b>Profile picture</b>
                  <span class="small">Shown on your buyer profile and header. Images are resized before saving.</span>
                  <div class="avatar-upload-actions">
                    <label class="btn btn-secondary btn-sm" for="acc-avatar-file">${icon(
                      "camera"
                    )}Upload photo</label>
                    <input class="sr-only" id="acc-avatar-file" type="file" accept="image/*" data-image-input data-image-target="acc-avatar-data" data-image-preview="acc-avatar-preview" data-image-shape="square" />
                    <input type="hidden" id="acc-avatar-data" name="avatar" value="${esc(
                      profile.avatar || ""
                    )}" />
                    ${
                      profile.avatar
                        ? `<button class="btn btn-ghost btn-sm" type="button" data-action="remove-avatar">${icon(
                            "close"
                          )}Remove</button>`
                        : ""
                    }
                  </div>
                </div>
              </div>

              <div class="form-grid mt-16">
                <div class="field">
                  <label class="label" for="acc-name">Full name</label>
                  <input class="input" id="acc-name" name="name" value="${esc(
                    profile.name
                  )}" pattern="[A-Za-z\\s.'-]+" title="Letters only — numbers are not allowed." required />
                  <span class="field-hint">Letters only. Numbers are not allowed.</span>
                </div>
                <div class="field">
                  <label class="label" for="acc-username">Username</label>
                  <input class="input" id="acc-username" name="username" value="${esc(
                    profile.username || ""
                  )}" minlength="3" maxlength="20" pattern="[A-Za-z0-9._]{3,20}" required />
                  <span class="field-hint">Your primary buyer identity.</span>
                </div>
                <div class="field">
                  <label class="label" for="acc-email">Email</label>
                  <input class="input" id="acc-email" name="email" type="email" value="${esc(
                    profile.email
                  )}" required />
                </div>
                <div class="field">
                  <label class="label" for="acc-phone">Mobile</label>
                  <input class="input" id="acc-phone" name="phone" value="${esc(
                    profile.phone
                  )}" />
                </div>
                <div class="field">
                  <label class="label" for="acc-city">City</label>
                  <input class="input" id="acc-city" name="city" value="${esc(
                    profile.city
                  )}" />
                </div>
                <div class="field">
                  <label class="label" for="acc-region">Region</label>
                  <input class="input" id="acc-region" name="region" value="${esc(
                    profile.region
                  )}" />
                </div>
                <div class="field field--full">
                  <button class="btn btn-primary" type="submit">${icon(
                    "check"
                  )}Save profile</button>
                </div>
              </div>
            </form>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <h2 class="card-title">Verification</h2>
                <p>Identity checks unlock higher-volume checkout and seller payouts.</p>
              </div>
              ${badge(
                `₱${POLICY.kycMonthlyVolume.toLocaleString("en-PH")} threshold`,
                "neutral"
              )}
            </div>

            <div class="verify-list">
              ${verifyRow({
                done: profile.emailVerified,
                iconName: "mail",
                title: "Email address",
                text: profile.email
              })}
              ${verifyRow({
                done: profile.phoneVerified,
                iconName: "phone",
                title: "Mobile number",
                text: profile.phone
              })}
              ${verifyRow({
                done: profile.buyerKyc,
                iconName: "badge-check",
                title: "Buyer identity (KYC)",
                text: profile.buyerKyc
                  ? "Admin-approved. Volume cap lifted."
                  : kycPending
                  ? "Request sent. Checkout stays blocked until an admin approves it."
                  : overLimit
                  ? `Limit reached. Request approval to raise your ${peso0(
                      POLICY.kycMonthlyVolume
                    )} rolling cap.`
                  : `Not required below ${peso0(
                      POLICY.kycMonthlyVolume
                    )} rolling volume.`,
                action: profile.buyerKyc
                  ? ""
                  : kycPending
                  ? badge("Awaiting admin", "warn")
                  : `<button class="btn btn-secondary btn-sm" type="button" data-action="request-buyer-kyc">${icon(
                      "shield"
                    )}${overLimit ? "Request higher limit" : "Request verification"}</button>`
              })}
              ${verifyRow({
                done: profile.payoutVerified,
                iconName: "bank",
                title: "Payout account",
                text:
                  profile.payoutAccount ||
                  "Required before seller payouts can be released.",
                action: profile.payoutVerified
                  ? ""
                  : `<button class="btn btn-secondary btn-sm" type="button" data-action="verify-payout">${icon(
                      "plus"
                    )}Add account</button>`
              })}
              ${verifyRow({
                done: profile.twoFactor,
                iconName: "lock",
                title: "Two-factor authentication",
                text: profile.twoFactor
                  ? "Enabled for sign-in on this demo account."
                  : "Add a second factor to protect payouts and saved cards.",
                action: `<button class="btn btn-secondary btn-sm" type="button" data-action="toggle-2fa">${icon(
                  profile.twoFactor ? "eye-off" : "lock"
                )}${profile.twoFactor ? "Disable" : "Enable"}</button>`
              })}
            </div>
          </section>

          <section class="card">
            <div class="card-head card-head--row">
              <div>
                <h2 class="card-title">30-day purchase volume</h2>
                <p>KYC is required once rolling volume reaches the threshold.</p>
              </div>
              ${badge(
                profile.buyerKyc
                  ? "Cap lifted"
                  : kycPending
                  ? "Awaiting admin"
                  : overLimit
                  ? "Limit reached"
                  : `${peso0(remaining)} left`,
                profile.buyerKyc ? "ok" : overLimit || kycPending ? "warn" : "neutral"
              )}
            </div>
            <div class="volume-box">
              <div class="row">
                <b>${peso(volume)}</b>
                <span>of ${peso0(POLICY.kycMonthlyVolume)} threshold</span>
              </div>
              ${meter(
                Math.min(volume, POLICY.kycMonthlyVolume),
                POLICY.kycMonthlyVolume,
                volume >= POLICY.kycMonthlyVolume ? "warn" : ""
              )}
              <div class="row row--between mt-8">
                <span>${pct(volume, POLICY.kycMonthlyVolume)}% of threshold</span>
                <span>${activeOrders.length} active orders</span>
              </div>
            </div>
            ${
              profile.buyerKyc
                ? ""
                : kycPending
                ? `<div class="alert alert--warn mt-16">${icon(
                    "shield"
                  )}<span><b>Waiting for admin approval.</b> Your verification request was sent ${fmtDate(
                    profile.buyerKycRequest?.requestedAt
                  )}. Purchases above the ${peso0(
                    POLICY.kycMonthlyVolume
                  )} cap stay blocked until it is approved.</span></div>`
                : `<div class="alert alert--warn mt-16">${icon(
                    "shield"
                  )}<span><b>Need a higher buy amount?</b> Request verification and an admin will review it. Checkout above the cap stays blocked until approval.</span>
                    <button class="btn btn-primary btn-sm" type="button" data-action="request-buyer-kyc">${icon(
                      "shield"
                    )}Request higher limit</button></div>`
            }
            <p class="small mt-16">Volume includes demo orders placed in this browser plus the seeded history base. KYC is a policy gate, not a credit check.</p>
          </section>

          <section class="card">
            <div class="card-head card-head--row">
              <div>
                <h2 class="card-title">Saved stock</h2>
                <p>${saved.length} saved ${saved.length === 1 ? "part" : "parts"}</p>
              </div>
              <a class="link-arrow" href="marketplace.html">Browse more ${icon(
                "arrow-right"
              )}</a>
            </div>
            ${
              saved.length
                ? `<div class="saved-grid">${saved
                    .map((listing) => savedItem(listing))
                    .join("")}</div>`
                : emptyState({
                    iconName: "heart",
                    title: "Nothing saved yet",
                    text: "Tap the heart on a listing to keep it here for later.",
                    cta: `<a class="btn btn-primary mt-16" href="marketplace.html">Browse marketplace</a>`
                  })
            }
          </section>

          <section class="card">
            <div class="card-head card-head--row">
              <div>
                <h2 class="card-title">Recent orders</h2>
                <p>Escrow state and validation windows.</p>
              </div>
              <a class="link-arrow" href="orders.html">All orders ${icon(
                "arrow-right"
              )}</a>
            </div>
            <div class="orders-list">
              ${orders
                .slice(0, 3)
                .map((order) => orderCard(order))
                .join("")}
            </div>
          </section>
        </div>

        <aside class="stack">
          <div class="card">
            <div class="card-head"><h3>Session</h3></div>
            ${
              isSignedIn()
                ? `<div class="side-profile">
                    <span class="avatar avatar--lg ${sessionAvatar ? "" : "is-empty"}">
                      ${sessionAvatar ? `<img src="${esc(sessionAvatar)}" alt="" />` : ""}
                      <span class="avatar-fallback">${esc(initials(sessionName))}</span>
                    </span>
                    <div>
                      <b>${esc(sessionName)}</b>
                      <p class="small">${esc(
                        PORTALS[state.session.role]?.label || "Account"
                      )} · ${esc(state.session.email)}</p>
                    </div>
                  </div>
                  <div class="stack stack--sm mt-16">
                    <a class="btn btn-secondary btn-block" href="${roleHome(
                      state.session.role
                    )}">${icon("grid")}Open portal</a>
                    <button class="btn btn-ghost btn-block" type="button" data-action="sign-out">${icon(
                      "logout"
                    )}Sign out</button>
                  </div>`
                : `<p class="small">Browsing as a guest. Create a buyer account to check out; marketplace browsing and support stay open.</p>
                  <div class="stack stack--sm mt-16">
                    <a class="btn btn-primary btn-block" href="login.html?mode=register">${icon(
                      "user"
                    )}Create buyer account</a>
                    <a class="btn btn-secondary btn-block" href="login.html">${icon(
                      "lock"
                    )}Sign in</a>
                  </div>`
            }
          </div>

          <div class="card">
            <div class="card-head"><h3>Demo accounts</h3></div>
            <p class="small">One sign-in form checks the account and opens the right workspace. All passwords are <code>demo1234</code>.</p>
            <div class="stack stack--sm mt-16">
              ${["buyer", "seller", "admin"]
                .map(
                  (key) => `<a class="action-card" href="login.html?demo=${key}">
                    <span class="action-icon">${icon(
                      key === "admin" ? "shield" : key === "seller" ? "store" : "user"
                    )}</span>
                    <span class="action-body">
                      <b>${esc(PORTALS[key].label)}</b>
                      <span>${esc(PORTALS[key].blurb)}</span>
                    </span>
                    ${icon("chevron-right")}
                  </a>`
                )
                .join("")}
            </div>
          </div>

          ${
            seller
              ? `<div class="card">
                  <div class="card-head card-head--row">
                    <div><h3>Seller profile</h3><p>${esc(seller.name)}</p></div>
                    ${tierBadge(seller)}
                  </div>
                  <div class="summary-list">
                    <div class="summary-row"><span>KYC</span><b>${esc(seller.kyc)}</b></div>
                    <div class="summary-row"><span>Rating</span><b>★ ${Number(
                      seller.rating || 0
                    ).toFixed(1)}</b></div>
                    <div class="summary-row"><span>Tier</span><b>${esc(
                      tierOf(seller)
                    )}</b></div>
                  </div>
                  <a class="btn btn-secondary btn-block mt-16" href="seller-dashboard.html">${icon(
                    "gauge"
                  )}Seller dashboard</a>
                </div>`
              : ""
          }

          <div class="card">
            <div class="card-head"><h3>Demo data</h3></div>
            <p class="small">Reset clears every local change and reseeds the five sellers, thirteen listings, orders, and tickets.</p>
            <button class="btn btn-danger-soft btn-block mt-16" type="button" data-action="reset-demo">${icon(
              "refresh"
            )}Reset demo data</button>
          </div>
        </aside>
      </div>
    </div>`;
}
