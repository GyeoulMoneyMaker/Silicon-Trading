/* ==========================================================================
   Marketplace — faceted catalogue with URL-synced filters
   ========================================================================== */

import { icon } from "../core/icons.js";
import { CATEGORIES, GRADES } from "../core/config.js";
import { esc, pageRoot, param, peso0 } from "../core/utils.js";
import { marketplaceFacets, publicListings } from "../core/selectors.js";
import { emptyState, productCard } from "../components/ui.js";
import { getState } from "../core/store.js";

let filters = {
  q: param("q") || "",
  category: param("category") || "All",
  grade: param("grade") || "All",
  max: param("max") || "",
  pass: param("pass") === "1",
  sort: param("sort") || "relevance"
};

if (!CATEGORIES.includes(filters.category)) filters.category = "All";
if (![...GRADES, "All"].includes(filters.grade)) filters.grade = "All";

const activeFilters = () => {
  const chips = [];
  if (filters.q) chips.push({ key: "q", label: `Search: ${filters.q}` });
  if (filters.category !== "All")
    chips.push({ key: "category", label: filters.category });
  if (filters.grade !== "All")
    chips.push({ key: "grade", label: `Grade ${filters.grade}` });
  if (filters.max && Number(filters.max) < 8000)
    chips.push({ key: "max", label: `Under ${peso0(filters.max)}` });
  if (filters.pass) chips.push({ key: "pass", label: "Verified Pass only" });
  return chips;
};

function filtered() {
  let list = publicListings();
  if (filters.category !== "All")
    list = list.filter((listing) => listing.category === filters.category);
  if (filters.q) {
    const query = filters.q.trim().toLowerCase();
    if (query) {
      list = list.filter((listing) =>
        [
          listing.title,
          listing.device,
          listing.alias,
          listing.partNumber,
          listing.category,
          listing.description
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }
  }
  if (filters.grade !== "All")
    list = list.filter((listing) => listing.grade === filters.grade);
  if (filters.max && Number(filters.max) < 8000)
    list = list.filter((listing) => Number(listing.price) <= Number(filters.max));
  if (filters.pass) list = list.filter((listing) => listing.pass);

  if (filters.sort === "price-asc")
    list.sort((a, b) => Number(a.price) - Number(b.price));
  else if (filters.sort === "price-desc")
    list.sort((a, b) => Number(b.price) - Number(a.price));
  else if (filters.sort === "newest")
    list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  else
    list.sort((a, b) => {
      if (Boolean(a.pass) !== Boolean(b.pass)) return a.pass ? -1 : 1;
      return Number(b.views || 0) - Number(a.views || 0);
    });
  return list;
}

function syncUrl() {
  const url = new URL(location.href);
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.category !== "All") query.set("category", filters.category);
  if (filters.grade !== "All") query.set("grade", filters.grade);
  if (filters.max && Number(filters.max) < 8000) query.set("max", filters.max);
  if (filters.pass) query.set("pass", "1");
  if (filters.sort !== "relevance") query.set("sort", filters.sort);
  const search = query.toString();
  try {
    history.replaceState(null, "", url.pathname + (search ? `?${search}` : ""));
  } catch (error) {
    /* file:// can refuse history updates — filters still work. */
  }
}

function refresh() {
  const results = document.getElementById("mkt-results");
  if (!results) return;

  const list = filtered();
  const saved = getState().saved;
  const count = document.getElementById("result-count");
  if (count)
    count.innerHTML = `<b>${list.length}</b> ${
      list.length === 1 ? "listing" : "listings"
    } found`;

  results.innerHTML = list.length
    ? `<div class="product-grid">${list
        .map((listing) =>
          productCard(listing, { saved: saved.includes(listing.id) })
        )
        .join("")}</div>`
    : emptyState({
        iconName: "search",
        title: "No parts match those filters",
        text: "Try a broader category or clear the price cap. New donor stock is added daily.",
        cta: `<button class="btn btn-primary mt-16" type="button" data-action="reset-filters">Reset filters</button>`
      });

  const chips = document.getElementById("active-filters");
  if (chips)
    chips.innerHTML = activeFilters()
      .map(
        (chip) => `<span class="chip is-active">${esc(chip.label)}
          <button type="button" data-chip="${esc(chip.key)}" aria-label="Remove filter">${icon(
          "close"
          )}</button></span>`
      )
      .join("");

  syncUrl();
}

function resetFilters() {
  filters = {
    q: "",
    category: "All",
    grade: "All",
    max: "",
    pass: false,
    sort: "relevance"
  };
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function render() {
  const root = pageRoot();
  if (!root) return;
  const facets = marketplaceFacets();
  const list = filtered();

  const categoryOptions = ["All", ...CATEGORIES]
    .map((category) => {
      const count =
        category === "All"
          ? facets.total
          : facets.byCategory[category] || 0;
      return `<label class="filter-option">
        <input type="radio" name="category" value="${esc(category)}" data-filter="category" ${
        filters.category === category ? "checked" : ""
      } />
        <span>${esc(category)}</span>
        <span class="count">${count}</span>
      </label>`;
    })
    .join("");

  const gradeOptions = ["All", ...GRADES]
    .map(
      (grade) => `<label class="filter-option">
        <input type="radio" name="grade" value="${esc(grade)}" data-filter="grade" ${
        filters.grade === grade ? "checked" : ""
      } />
        <span>${grade === "All" ? "Any grade" : `Grade ${grade}`}</span>
        ${
          grade === "All"
            ? ""
            : `<span class="count">${facets.byGrade[grade] || 0}</span>`
        }
      </label>`
    )
    .join("");

  root.innerHTML = `
    <div class="container">
      <header class="page-head">
        <div>
          <p class="eyebrow">${icon("store")}Escrow-protected catalogue</p>
          <h1>Marketplace</h1>
          <p>Repair-grade boards, ICs, and assemblies. Every listing is escrow-protected, every order carries a 72-hour validation window and 7-day DOA cover.</p>
        </div>
        <div class="page-head-actions">
          <a class="btn btn-secondary" href="sell.html">${icon("plus")}Sell a part</a>
        </div>
      </header>

      <div class="market-layout">
        <aside class="filter-panel" id="filterPanel" aria-label="Filters">
          <div class="filter-group">
            <p class="filter-title">Category</p>
            <div class="filter-options">${categoryOptions}</div>
          </div>
          <div class="filter-group">
            <p class="filter-title">Condition grade</p>
            <div class="filter-options">${gradeOptions}</div>
          </div>
          <div class="filter-group">
            <p class="filter-title">Max price</p>
            <div class="price-range">
              <input class="input" id="f-max" type="number" min="0" max="8000" step="50" placeholder="Any" value="${esc(
                filters.max
              )}" aria-label="Maximum price" />
              <span>PHP</span>
            </div>
          </div>
          <div class="filter-group">
            <p class="filter-title">Trust</p>
            <label class="filter-switch">
              <span><b>Verified Pass only</b><span>Evidence on file, spot-audited.</span></span>
              <span class="switch">
                <input type="checkbox" id="f-pass" ${
                  filters.pass ? "checked" : ""
                } />
                <span class="switch-track"></span>
              </span>
            </label>
          </div>
          <button class="btn btn-ghost btn-sm btn-block" type="button" data-action="reset-filters">${icon(
            "refresh"
          )}Reset filters</button>
        </aside>

        <div class="market-main">
          <div class="market-search input-group">
            ${icon("search")}
            <input class="input" id="mkt-q" type="search" placeholder="Search title, device, part number, or IC marking…" value="${esc(
              filters.q
            )}" aria-label="Search listings" />
          </div>

          <div class="market-toolbar">
            <span class="market-count" id="result-count"><b>${
              list.length
            }</b> ${list.length === 1 ? "listing" : "listings"} found</span>
            <div class="row">
              <button class="btn btn-secondary btn-sm filter-toggle" type="button" data-action="toggle-filters" aria-expanded="false">${icon(
                "filter"
              )}Filters</button>
              <label class="market-sort">
                <span>Sort</span>
                <select class="select" id="mkt-sort" aria-label="Sort results">
                  <option value="relevance" ${
                    filters.sort === "relevance" ? "selected" : ""
                  }>Relevance</option>
                  <option value="price-asc" ${
                    filters.sort === "price-asc" ? "selected" : ""
                  }>Price: low to high</option>
                  <option value="price-desc" ${
                    filters.sort === "price-desc" ? "selected" : ""
                  }>Price: high to low</option>
                  <option value="newest" ${
                    filters.sort === "newest" ? "selected" : ""
                  }>Newest first</option>
                </select>
              </label>
            </div>
          </div>

          <div class="active-filters" id="active-filters"></div>
          <div id="mkt-results"></div>
        </div>
      </div>
    </div>`;

  refresh();
}

/* ------------------------------------------------------------- interactions */
document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.id === "mkt-q") {
    filters.q = target.value;
    refresh();
  }
  if (target.id === "f-max") {
    filters.max = target.value;
    refresh();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.dataset.filter === "category") {
    filters.category = target.value;
    refresh();
  }
  if (target.dataset.filter === "grade") {
    filters.grade = target.value;
    refresh();
  }
  if (target.id === "f-pass") {
    filters.pass = target.checked;
    refresh();
  }
  if (target.id === "mkt-sort") {
    filters.sort = target.value;
    refresh();
  }
});

document.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-chip]");
  if (chip) {
    const key = chip.dataset.chip;
    if (key === "q") filters.q = "";
    if (key === "category") filters.category = "All";
    if (key === "grade") filters.grade = "All";
    if (key === "max") filters.max = "";
    if (key === "pass") filters.pass = false;
    render();
    return;
  }

  const reset = event.target.closest('[data-action="reset-filters"]');
  if (reset) {
    resetFilters();
    return;
  }

  const toggle = event.target.closest('[data-action="toggle-filters"]');
  if (toggle) {
    const panel = document.getElementById("filterPanel");
    if (!panel) return;
    panel.classList.toggle("is-open");
    toggle.setAttribute(
      "aria-expanded",
      panel.classList.contains("is-open") ? "true" : "false"
    );
  }
});
