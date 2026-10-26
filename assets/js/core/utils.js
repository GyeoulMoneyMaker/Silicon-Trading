/* ==========================================================================
   Silicon Trading — shared utilities
   ========================================================================== */

import { POLICY } from "./config.js";

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

/* Public pages mount into #page, portals and auth mount into #app. */
export const pageRoot = () =>
  document.getElementById("page") || document.getElementById("app");

export function esc(value) {
  return String(value == null ? "" : value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]
  );
}

export const clone = (value) => JSON.parse(JSON.stringify(value));

export const round2 = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function peso(value, decimals = 2) {
  return (
    "₱" +
    Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  );
}

export const peso0 = (value) => peso(value, 0);

export const commissionFor = (subtotal) =>
  Math.max(
    round2(Number(subtotal) * POLICY.commissionRate),
    POLICY.commissionFloor
  );

export const reserveFor = (subtotal) =>
  round2(
    Math.max(0, Number(subtotal) - commissionFor(subtotal)) * POLICY.reserveRate
  );

export const netFor = (subtotal) =>
  round2(
    Math.max(0, Number(subtotal) - commissionFor(subtotal) - reserveFor(subtotal))
  );

export const uid = (prefix = "") =>
  prefix + Math.random().toString(36).slice(2, 8).toUpperCase();

export const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const dateFmt = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric"
});

const shortFmt = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric"
});

const timeFmt = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

export const fmtDate = (timestamp) =>
  timestamp ? dateFmt.format(new Date(timestamp)) : "—";

export const fmtShort = (timestamp) =>
  timestamp ? shortFmt.format(new Date(timestamp)) : "—";

export const fmtDateTime = (timestamp) =>
  timestamp ? timeFmt.format(new Date(timestamp)) : "—";

export function clockLeft(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(
    seconds
  ).padStart(2, "0")}s`;
}

export function daysLeft(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  return `${days}d ${String(hours).padStart(2, "0")}h`;
}

export const monthKey = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const nowMonthKey = () => monthKey(Date.now());

export const param = (name) => new URLSearchParams(location.search).get(name);

export function setParams(values) {
  const url = new URL(location.href);
  Object.entries(values).forEach(([key, value]) => {
    if (value === "" || value == null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  try {
    history.replaceState(null, "", url);
  } catch (error) {
    /* file:// can refuse history updates — the demo still works. */
  }
}

export const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, Number(value) || 0));

export function debounce(fn, wait = 180) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export const pct = (part, whole) =>
  whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0;

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : clone(fallback);
  } catch (error) {
    return clone(fallback);
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    /* ignore */
  }
}

/* Read a picked image, crop/resize it in the browser, and return a compact
   data URL. Keeps localStorage writes small enough for the demo. */
export function readImageFile(file, { max = 640, quality = 0.82, square = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type || "")) {
      reject(new Error("Choose an image file."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("The image could not be opened."));
      image.onload = () => {
        const naturalWidth = image.naturalWidth || image.width;
        const naturalHeight = image.naturalHeight || image.height;
        if (!naturalWidth || !naturalHeight) {
          reject(new Error("The image is empty."));
          return;
        }

        let sx = 0;
        let sy = 0;
        let sourceWidth = naturalWidth;
        let sourceHeight = naturalHeight;
        if (square) {
          const side = Math.min(naturalWidth, naturalHeight);
          sx = (naturalWidth - side) / 2;
          sy = (naturalHeight - side) / 2;
          sourceWidth = side;
          sourceHeight = side;
        }

        const scale = Math.min(1, max / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("This browser cannot process the image."));
          return;
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(
          image,
          sx,
          sy,
          sourceWidth,
          sourceHeight,
          0,
          0,
          width,
          height
        );
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start"
  });
}

export const plural = (count, singular, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;
