/* ==========================================================================
   Silicon Trading — local demo application
   No backend, no real payments. Everything persists in localStorage.
   ========================================================================== */
(function () {
  "use strict";

  /* ----------------------------------------------------------------------
     Policy constants (single source of truth for the demo)
     ---------------------------------------------------------------------- */
  const POLICY = {
    commissionRate: 0.08,
    commissionFloor: 20,
    kycMonthlyVolume: 15000,
    autoReleaseHours: 72,
    doaDays: 7,
    reserveRate: 0.1,
    reserveDays: 14,
    singlePass: 49,
    proPass: 399
  };

  const K = {
    profile: "st.profile.v1",
    listings: "st.listings.v1",
    orders: "st.orders.v1",
    tickets: "st.tickets.v1",
    saved: "st.saved.v1",
    sellers: "st.sellers.v1",
    session: "st.session.v1",
    seeded: "st.seeded.v1",
    version: "st.version.v1"
  };

  const APP_SCHEMA = 2;

  const PORTALS = {
    buyer: {
      label: "Buyer account",
      email: "demo@silicon.trading",
      password: "demo1234",
      name: "Juan Dela Cruz",
      home: "account.html",
      blurb: "Shop with escrow, track orders, and open claims."
    },
    seller: {
      label: "Seller dashboard",
      email: "seller@silicon.trading",
      password: "demo1234",
      name: "Quiapo Silicon Co.",
      home: "seller-dashboard.html",
      blurb: "Manage stock, fulfil orders, and follow payouts."
    },
    admin: {
      label: "Admin console",
      email: "admin@silicon.trading",
      password: "demo1234",
      name: "Silicon Trading Ops",
      home: "admin-dashboard.html",
      blurb: "Oversee escrow, moderate listings, and clear disputes."
    }
  };

  const CATEGORIES = ["Donor Boards", "Motherboards", "ICs", "Phone Parts"];

  const COURIERS = [
    { id: "jnt", name: "J&T Express", fee: 180, eta: "2–4 days" },
    { id: "lbc", name: "LBC Express", fee: 220, eta: "3–5 days" },
    { id: "ninja", name: "Ninja Van", fee: 160, eta: "2–5 days" }
  ];

  const DEVICES = [
    "iPhone 13 Pro",
    "iPhone 13 Pro Max",
    "iPhone 12",
    "iPhone 11",
    "Samsung Galaxy S22",
    "Redmi Note 11",
    "Huawei P30 Pro"
  ];

  const PARAMS = new URLSearchParams(location.search);

  /* ----------------------------------------------------------------------
     Utilities
     ---------------------------------------------------------------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (value) =>
    String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  const peso = (n) =>
    "₱" +
    Number(n || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const peso0 = (n) =>
    "₱" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 });

  const commissionFor = (subtotal) =>
    Math.max(round2(Number(subtotal) * POLICY.commissionRate), POLICY.commissionFloor);

  const reserveFor = (subtotal) =>
    round2(Math.max(0, Number(subtotal) - commissionFor(subtotal)) * POLICY.reserveRate);

  const uid = (prefix) => prefix + Math.random().toString(36).slice(2, 8).toUpperCase();

  const initials = (name) =>
    String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  const fmtDate = (ts) =>
    new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(ts)
    );

  const fmtShort = (ts) =>
    new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(new Date(ts));

  const fmtDateTime = (ts) =>
    new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(ts));

  const clockLeft = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h + "h " + String(m).padStart(2, "0") + "m " + String(s).padStart(2, "0") + "s";
  };

  const daysLeft = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    return d + "d " + String(h).padStart(2, "0") + "h";
  };

  const monthKey = (ts) => {
    const d = new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  };

  const nowMonthKey = () => monthKey(Date.now());

  const toast = (message, type) => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.className = "toast is-show" + (type ? " is-" + type : "");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      el.className = "toast";
    }, 3400);
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  /* ----------------------------------------------------------------------
     Inline icon set
     ---------------------------------------------------------------------- */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
    shield:
      '<path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6l7-3z"/><path d="M9.2 12.1l1.9 1.9 3.8-3.9"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    heart:
      '<path d="M12 20s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.6 12 20 12 20z"/>',
    truck:
      '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    arrow: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
    chevron: '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    star: '<path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9L12 3.6z"/>',
    alert: '<path d="M12 3.5L22 20H2L12 3.5z"/><path d="M12 9.5v4.5M12 17.2v.1"/>',
    box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.8-3.5 3.8-5.5 7.5-5.5s6.7 2 7.5 5.5"/>',
    refresh:
      '<path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20 4v4.5h-4.5"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    camera:
      '<path d="M3.5 8.5h4l1.5-2h6l1.5 2h4v11h-17z"/><circle cx="12" cy="13.5" r="3.5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3.5h16V16"/>',
    pin: '<path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10z"/><circle cx="12" cy="11" r="2.2"/>',
    phone:
      '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 7 8.5-7"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5H5V5h5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.1"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',
    grid:
      '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'
  };

  function icon(name, cls) {
    return (
      '<svg class="' +
      (cls || "") +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || "") +
      "</svg>"
    );
  }

  /* ----------------------------------------------------------------------
     Seed data
     ---------------------------------------------------------------------- */
  const SELLERS = {
    cebu: {
      name: "Cebu Boardworks",
      city: "Cebu",
      rating: 4.9,
      orders: 128,
      verified: true,
      pass: true,
      pro: true,
      response: "2h",
      since: "2024"
    },
    manila: {
      name: "Quiapo Silicon Co.",
      city: "Manila",
      rating: 4.8,
      orders: 412,
      verified: true,
      pass: true,
      pro: false,
      response: "3h",
      since: "2023"
    },
    davao: {
      name: "Davao Parts Lab",
      city: "Davao",
      rating: 4.7,
      orders: 86,
      verified: true,
      pass: false,
      pro: false,
      response: "5h",
      since: "2025"
    },
    baguio: {
      name: "Baguio Microspares",
      city: "Baguio",
      rating: 4.6,
      orders: 54,
      verified: true,
      pass: false,
      pro: false,
      response: "6h",
      since: "2025"
    }
  };

  function seedSellers() {
    return [
      {
        id: "S-01",
        name: "Cebu Boardworks",
        email: "ops@cebuboardworks.ph",
        city: "Cebu",
        tier: "Pro Workshop",
        kyc: "VERIFIED",
        joined: "2024-03-12",
        status: "ACTIVE",
        payoutAccount: "BDO · •••• 2207"
      },
      {
        id: "S-02",
        name: "Quiapo Silicon Co.",
        email: "seller@silicon.trading",
        city: "Manila",
        tier: "Verified Pass",
        kyc: "VERIFIED",
        joined: "2023-08-04",
        status: "ACTIVE",
        payoutAccount: "BDO · •••• 8841",
        demo: true
      },
      {
        id: "S-03",
        name: "Davao Parts Lab",
        email: "hello@davaopartslab.ph",
        city: "Davao",
        tier: "Verified Seller",
        kyc: "VERIFIED",
        joined: "2025-01-19",
        status: "ACTIVE",
        payoutAccount: "GCash · •••• 6710"
      },
      {
        id: "S-04",
        name: "Baguio Microspares",
        email: "desk@baguiomicrospares.ph",
        city: "Baguio",
        tier: "Verified Seller",
        kyc: "VERIFIED",
        joined: "2025-06-02",
        status: "ACTIVE",
        payoutAccount: "Maya · •••• 3392"
      },
      {
        id: "S-05",
        name: "Bacolod Board Co.",
        email: "ops@bacolodboard.co",
        city: "Bacolod",
        tier: "Registered",
        kyc: "PENDING",
        joined: "2026-10-21",
        status: "ACTIVE",
        payoutAccount: ""
      }
    ];
  }

  function diag(overrides) {
    return Object.assign(
      {
        "Powers on": true,
        "Boots to OS": true,
        "Face ID / Touch ID": true,
        "Charging": true,
        "Display & touch": true,
        "Cameras": true,
        "Wi-Fi & Bluetooth": true,
        "Battery health": "—",
        "Water damage indicator": "Clean",
        "Serial / part number": "Matches listing"
      },
      overrides || {}
    );
  }

  function evPack(date) {
    return [
      { label: "Boot video", meta: "0:15 · " + date },
      { label: "Serial macro", meta: "matches listing" },
      { label: "Function matrix", meta: "9 / 9 clips" },
      { label: "Diagnostic screen", meta: "captured " + date },
      { label: "Board markings", meta: "revision verified" }
    ];
  }

  const IMG = {
    "Donor Boards": "assets/board-donor.svg",
    "Motherboards": "assets/board-motherboard.svg",
    "ICs": "assets/ic.svg",
    "Phone Parts": "assets/phone-part.svg"
  };

  function seedListings() {
    const out = [];
    const day = 864e5;
    const base = Date.now();

    out.push(
      {
        id: "L-1001",
        title: "iPhone 13 Pro Logic Board — A2638",
        category: "Motherboards",
        device: "iPhone 13 Pro",
        alias: "A2638",
        partNumber: "820-02941",
        price: 4850,
        grade: "B",
        type: "OEM Pull",
        seller: SELLERS.cebu,
        image: IMG.Motherboards,
        pass: true,
        auditedAt: "12 Oct 2026",
        evidence: evPack("12 Oct 2026"),
        notes: ["True Tone disabled", "Face ID paired and tested", "Minor shield cover scuff"],
        description:
          "Pulled from a working iPhone 13 Pro with a cracked display. Board is clean, boots to iOS, and passes the full function matrix. Ideal donor for a board-level repair or a straight swap.",
        diagnostics: diag({ "Battery health": "89%" }),
        compat: ["iPhone 13 Pro"],
        water: false,
        stock: 1,
        shipsFrom: "Cebu",
        shipsIn: "2–4 days",
        views: 342,
        mine: false,
        createdAt: base - 2 * day
      },
      {
        id: "L-1002",
        title: "iPhone 12 Logic Board — A2402",
        category: "Motherboards",
        device: "iPhone 12",
        alias: "A2402",
        partNumber: "820-02016",
        price: 2950,
        grade: "A",
        type: "OEM Pull",
        seller: SELLERS.manila,
        image: IMG.Motherboards,
        pass: true,
        auditedAt: "09 Oct 2026",
        evidence: evPack("09 Oct 2026"),
        notes: ["No iCloud lock", "Battery health 91%", "Face ID matched to board"],
        description:
          "Clean OEM pull from a water-free unit. iCloud removed and verified. Every function in the listing diagnostics was tested before packing.",
        diagnostics: diag({ "Battery health": "91%" }),
        compat: ["iPhone 12"],
        water: false,
        stock: 1,
        shipsFrom: "Manila",
        shipsIn: "2–3 days",
        views: 511,
        mine: false,
        createdAt: base - 3 * day
      },
      {
        id: "L-1003",
        title: "Galaxy S22 Motherboard — SM-S901B",
        category: "Motherboards",
        device: "Samsung Galaxy S22",
        alias: "SM-S901B",
        partNumber: "GH82-27421A",
        price: 3400,
        grade: "B",
        type: "Used-Tested",
        seller: SELLERS.manila,
        image: IMG.Motherboards,
        pass: false,
        auditedAt: null,
        evidence: null,
        notes: ["Dual SIM tray included", "No water damage", "Fingerprint reader not included"],
        description:
          "Tested board pulled from a donor S22. Powers on, charges, and reads both SIM slots. Fingerprint calibration is not included — plan for a paired reader.",
        diagnostics: diag({
          "Face ID / Touch ID": "Not included",
          "Battery health": "—",
          "Water damage indicator": "Clean"
        }),
        compat: ["Samsung Galaxy S22"],
        water: false,
        stock: 1,
        shipsFrom: "Manila",
        shipsIn: "3–5 days",
        views: 187,
        mine: false,
        createdAt: base - 5 * day
      },
      {
        id: "L-1004",
        title: "Redmi Note 11 Logic Board — 4G",
        category: "Motherboards",
        device: "Redmi Note 11",
        alias: "2201117TG",
        partNumber: "5600010J3C00",
        price: 1450,
        grade: "B",
        type: "Used-Tested",
        seller: SELLERS.davao,
        image: IMG.Motherboards,
        pass: false,
        auditedAt: null,
        evidence: null,
        notes: ["Boots and charges", "No Google account lock", "Light oxidation near shield"],
        description:
          "Working 4G board with light oxidation near the shield. All core functions pass; cosmetic condition is reflected in the grade. Priced for volume repair work.",
        diagnostics: diag({ "Battery health": "84%" }),
        compat: ["Redmi Note 11"],
        water: false,
        stock: 2,
        shipsFrom: "Davao",
        shipsIn: "3–5 days",
        views: 96,
        mine: false,
        createdAt: base - 7 * day
      },
      {
        id: "L-1005",
        title: "iPhone 13 Pro Max Donor Board",
        category: "Donor Boards",
        device: "iPhone 13 Pro Max",
        alias: "A2643",
        partNumber: "820-02942",
        price: 1890,
        grade: "C",
        type: "For Parts",
        seller: SELLERS.cebu,
        image: IMG["Donor Boards"],
        pass: false,
        auditedAt: null,
        evidence: null,
        notes: ["Face ID not paired", "No boot — sold for harvest", "NAND and PMIC intact"],
        description:
          "Sold strictly for parts. Board does not boot, but the NAND, PMIC, and charging IC are intact and suitable for harvest. No returns for functional issues beyond the 7-day DOA cover.",
        diagnostics: {
          "Powers on": false,
          "Boots to OS": false,
          "Face ID / Touch ID": false,
          "Charging": "Not tested",
          "Display & touch": "Not tested",
          "Cameras": "Not tested",
          "Wi-Fi & Bluetooth": "Not tested",
          "Battery health": "—",
          "Water damage indicator": "Clean",
          "Serial / part number": "Matches listing"
        },
        compat: ["iPhone 13 Pro Max"],
        water: false,
        stock: 1,
        shipsFrom: "Cebu",
        shipsIn: "2–4 days",
        views: 204,
        mine: false,
        createdAt: base - 8 * day
      },
      {
        id: "L-1006",
        title: "iPhone 11 Donor Board",
        category: "Donor Boards",
        device: "iPhone 11",
        alias: "A2111",
        partNumber: "820-01700",
        price: 1250,
        grade: "C",
        type: "For Parts",
        seller: SELLERS.baguio,
        image: IMG["Donor Boards"],
        pass: false,
        auditedAt: null,
        evidence: null,
        notes: ["Liquid damage history", "Good housing and connectors", "No boot"],
        description:
          "Liquid-damaged board with no boot. Useful for connectors, shields, and small passives. Photographed as-is so you know exactly what arrives.",
        diagnostics: {
          "Powers on": false,
          "Boots to OS": false,
          "Face ID / Touch ID": false,
          "Charging": "Not tested",
          "Display & touch": "Not tested",
          "Cameras": "Not tested",
          "Wi-Fi & Bluetooth": "Not tested",
          "Battery health": "—",
          "Water damage indicator": "Triggered",
          "Serial / part number": "Matches listing"
        },
        compat: ["iPhone 11"],
        water: true,
        stock: 1,
        shipsFrom: "Baguio",
        shipsIn: "3–6 days",
        views: 78,
        mine: false,
        createdAt: base - 10 * day
      }
    );

    out.push(
      {
        id: "L-1007",
        title: "Huawei P30 Pro Donor Board",
        category: "Donor Boards",
        device: "Huawei P30 Pro",
        alias: "VOG-L29",
        partNumber: "02352BNB",
        price: 980,
        grade: "C",
        type: "For Parts",
        seller: SELLERS.davao,
        image: IMG["Donor Boards"],
        pass: false,
        auditedAt: null,
        evidence: null,
        notes: ["No power", "Display connector intact", "Useful for camera and charging assembly"],
        description:
          "Non-booting P30 Pro board. Sold for component harvest only. Connectors and camera assemblies are intact; the board itself is not a repair candidate.",
        diagnostics: {
          "Powers on": false,
          "Boots to OS": false,
          "Face ID / Touch ID": "Not tested",
          "Charging": "Not tested",
          "Display & touch": "Not tested",
          "Cameras": "Not tested",
          "Wi-Fi & Bluetooth": "Not tested",
          "Battery health": "—",
          "Water damage indicator": "Clean",
          "Serial / part number": "Matches listing"
        },
        compat: ["Huawei P30 Pro"],
        water: false,
        stock: 1,
        shipsFrom: "Davao",
        shipsIn: "3–5 days",
        views: 63,
        mine: false,
        createdAt: base - 11 * day
      },
      {
        id: "L-1008",
        title: "PMIC 338S00509 — iPhone 13 Series",
        category: "ICs",
        device: "iPhone 13 Pro",
        alias: "338S00509",
        partNumber: "338S00509",
        price: 320,
        grade: "A",
        type: "OEM Pull",
        seller: SELLERS.manila,
        image: IMG.ICs,
        pass: false,
        auditedAt: null,
        evidence: null,
        notes: ["Pulled from a tested board", "Balls reballed and inspected", "Anti-static packaging"],
        description:
          "OEM PMIC pulled from a working iPhone 13 series board. Balls are dressed for reflow. Shipped in anti-static packaging with a matching serial photo on request.",
        diagnostics: {
          "Visual inspection": "Passed",
          "Ball condition": "Reballed",
          "Pulled from": "Tested iPhone 13 board",
          "Markings": "338S00509",
          "Packaging": "Anti-static"
        },
        compat: ["iPhone 13 Pro", "iPhone 13 Pro Max"],
        water: false,
        stock: 4,
        shipsFrom: "Manila",
        shipsIn: "2–4 days",
        views: 421,
        mine: false,
        createdAt: base - 1 * day
      },
      {
        id: "L-1009",
        title: "A15 Bionic CPU Pull — iPhone 13 Pro",
        category: "ICs",
        device: "iPhone 13 Pro",
        alias: "A15",
        partNumber: "APL1W07",
        price: 1750,
        grade: "A",
        type: "OEM Pull",
        seller: SELLERS.cebu,
        image: IMG.ICs,
        pass: true,
        auditedAt: "14 Oct 2026",
        evidence: evPack("14 Oct 2026"),
        notes: ["Underfill intact", "Pulled with thermal profile", "No bent balls"],
        description:
          "A15 Bionic pull with intact underfill, removed using a controlled thermal profile. Photographed under magnification before packing. For experienced reball/install work.",
        diagnostics: {
          "Visual inspection": "Passed under 10×",
          "Underfill": "Intact",
          "Ball condition": "Original, straight",
          "Pulled from": "Working board",
          "Markings": "APL1W07"
        },
        compat: ["iPhone 13 Pro", "iPhone 13 Pro Max"],
        water: false,
        stock: 1,
        shipsFrom: "Cebu",
        shipsIn: "2–4 days",
        views: 289,
        mine: false,
        createdAt: base - 4 * day
      },
      {
        id: "L-1010",
        title: "Tristar U2 IC 1610A3 — Charging",
        category: "ICs",
        device: "iPhone 11",
        alias: "1610A3",
        partNumber: "1610A3",
        price: 450,
        grade: "A",
        type: "New",
        seller: SELLERS.baguio,
        image: IMG.ICs,
        pass: false,
        auditedAt: null,
        evidence: null,
        notes: ["New old stock", "Tray sealed", "Tested for continuity"],
        description:
          "New old-stock Tristar charging IC for iPhone 11 / 12 repairs. Tray-sealed, continuity-checked, and stored dry. A staple for charging-fault diagnostics.",
        diagnostics: {
          "Visual inspection": "Passed",
          "Condition": "New old stock",
          "Continuity": "Checked",
          "Markings": "1610A3",
          "Packaging": "Sealed tray"
        },
        compat: ["iPhone 11", "iPhone 12"],
        water: false,
        stock: 12,
        shipsFrom: "Baguio",
        shipsIn: "3–6 days",
        views: 308,
        mine: false,
        createdAt: base - 6 * day
      },
      {
        id: "L-1011",
        title: "iPhone 13 Pro OLED Assembly — OEM Pull",
        category: "Phone Parts",
        device: "iPhone 13 Pro",
        alias: "A2638",
        partNumber: "821-03121",
        price: 6900,
        grade: "A",
        type: "OEM Pull",
        seller: SELLERS.cebu,
        image: IMG["Phone Parts"],
        pass: true,
        auditedAt: "11 Oct 2026",
        evidence: evPack("11 Oct 2026"),
        notes: ["True Tone preserved", "No dead pixels", "Original flex and shield"],
        description:
          "Genuine OLED assembly pulled from a low-use unit. True Tone data preserved, no dead pixels or burn-in. Original flex and shield included. Packed in a rigid foam tray.",
        diagnostics: {
          "Display output": true,
          "Touch grid": true,
          "True Tone": true,
          "Dead pixels": "None",
          "Burn-in": "None",
          "3D Touch / Haptics": "N/A",
          "Face ID flex": "Included",
          "Serial / part number": "Matches listing"
        },
        compat: ["iPhone 13 Pro"],
        water: false,
        stock: 1,
        shipsFrom: "Cebu",
        shipsIn: "2–4 days",
        views: 367,
        mine: false,
        createdAt: base - 5 * day
      },
      {
        id: "L-1012",
        title: "iPhone 13 Pro Rear Camera Module",
        category: "Phone Parts",
        device: "iPhone 13 Pro",
        alias: "A2638",
        partNumber: "821-03065",
        price: 2150,
        grade: "B",
        type: "OEM Pull",
        seller: SELLERS.manila,
        image: IMG["Phone Parts"],
        pass: false,
        auditedAt: null,
        evidence: null,
        notes: ["All three lenses clean", "OIS tested", "Lens ring micro-scuff"],
        description:
          "Complete rear camera module with clean lenses and working OIS. Lens ring has a micro-scuff visible at an angle; optics are unaffected. Tested on a known-good board.",
        diagnostics: {
          "Wide camera": true,
          "Ultra-wide camera": true,
          "Telephoto camera": true,
          "OIS": true,
          "Lens condition": "Clean, micro-scuff on ring",
          "Flash": "N/A",
          "Serial / part number": "Matches listing"
        },
        compat: ["iPhone 13 Pro"],
        water: false,
        stock: 1,
        shipsFrom: "Manila",
        shipsIn: "3–5 days",
        views: 153,
        mine: false,
        createdAt: base - 9 * day
      },
      {
        id: "L-1013",
        title: "iPhone 12 mini Logic Board — A2176",
        category: "Motherboards",
        device: "iPhone 12 mini",
        alias: "A2176",
        partNumber: "820-02018",
        price: 2600,
        grade: "B",
        type: "OEM Pull",
        seller: SELLERS.davao,
        image: IMG.Motherboards,
        pass: false,
        auditedAt: null,
        evidence: null,
        notes: ["Face ID paired", "No iCloud lock", "Battery health 87%"],
        description:
          "OEM pull from a working 12 mini with a cracked rear glass. Boots, charges, and passes the core function matrix. Submitted for platform review before going live.",
        diagnostics: diag({ "Battery health": "87%" }),
        compat: ["iPhone 12 mini"],
        water: false,
        stock: 1,
        shipsFrom: "Davao",
        shipsIn: "3–5 days",
        views: 0,
        mine: false,
        createdAt: base - 1 * day,
        status: "PENDING"
      }
    );

    return out;
  }

  /* ----------------------------------------------------------------------
     Default account, seeded orders, tickets
     ---------------------------------------------------------------------- */
  function defaultProfile() {
    return {
      signedIn: true,
      name: "Juan Dela Cruz",
      email: "demo@silicon.trading",
      phone: "+63 917 555 0142",
      business: "Dela Cruz Repair Shop",
      city: "Quezon City",
      emailVerified: true,
      phoneVerified: true,
      buyerKyc: false,
      sellerKyc: false,
      payoutVerified: false,
      payoutAccount: "",
      twoFactor: false,
      passPlan: "NONE",
      passStartedAt: null,
      passExpires: null,
      demoVolumeBase: 8950,
      memberSince: Date.now() - 200 * 864e5
    };
  }

  const DEMO_ADDRESS = {
    recipient: "Juan Dela Cruz",
    phone: "+63 917 555 0142",
    region: "NCR",
    city: "Quezon City",
    barangay: "Poblacion",
    landmark: "Dela Cruz Repair Shop, 2nd floor",
    postal: "1100"
  };

  function seedOrders() {
    const now = Date.now();
    const h = 3600e3;
    const d = 864e5;

    return [
      {
        id: "ST-2026-004184",
        listingId: "L-1008",
        title: "PMIC 338S00509 — iPhone 13 Series",
        image: IMG.ICs,
        seller: "Quiapo Silicon Co.",
        subtotal: 320,
        shipping: 180,
        total: 500,
        commission: 25.6,
        commissionFloorApplied: false,
        reserve: 32,
        status: "PAID",
        escrow: "HELD",
        paymentMethod: "GCash",
        psp: "Xendit (demo)",
        pspEscrowId: "esc_demo_1c04",
        createdAt: now - 20 * h,
        courier: "J&T Express",
        tracking: null,
        deliveredAt: null,
        validationEndsAt: null,
        doaEndsAt: null,
        extensionUsed: false,
        completedAt: null,
        address: DEMO_ADDRESS,
        acknowledged: true,
        doaStatus: "NONE",
        returnLabel: null,
        timeline: [
          { at: now - 20 * h, label: "Order placed", detail: "Payment received by the licensed PSP" },
          { at: now - 20 * h, label: "Escrow held", detail: "₱500.00 held until the buyer validates the part" }
        ]
      },
      {
        id: "ST-2026-004182",
        listingId: "L-1002",
        title: "iPhone 12 Logic Board — A2402",
        image: IMG.Motherboards,
        seller: "Quiapo Silicon Co.",
        subtotal: 2950,
        shipping: 180,
        total: 3130,
        commission: 236,
        commissionFloorApplied: false,
        reserve: 271.4,
        status: "DELIVERED",
        escrow: "HELD",
        paymentMethod: "GCash",
        psp: "Xendit (demo)",
        pspEscrowId: "esc_demo_9f21",
        createdAt: now - 2 * d,
        courier: "J&T Express",
        tracking: "JT8823190045",
        deliveredAt: now - 20 * h,
        validationEndsAt: now + 52 * h,
        doaEndsAt: now + (7 * d - 20 * h),
        extensionUsed: false,
        completedAt: null,
        address: DEMO_ADDRESS,
        acknowledged: true,
        doaStatus: "NONE",
        returnLabel: null,
        timeline: [
          { at: now - 2 * d, label: "Order placed", detail: "Payment received by the licensed PSP" },
          { at: now - 2 * d, label: "Escrow held", detail: "₱3,130.00 held until you validate the part" },
          { at: now - 2 * d + 4 * h, label: "Picked up by courier", detail: "J&T Express · JT8823190045" },
          { at: now - 20 * h, label: "Delivered", detail: "72-hour validation window started" }
        ]
      },
      {
        id: "ST-2026-004183",
        listingId: "L-1004",
        title: "Redmi Note 11 Logic Board — 4G",
        image: IMG.Motherboards,
        seller: "Davao Parts Lab",
        subtotal: 1450,
        shipping: 180,
        total: 1630,
        commission: 116,
        commissionFloorApplied: false,
        reserve: 163,
        status: "DISPUTED",
        escrow: "FROZEN",
        paymentMethod: "GCash",
        psp: "Xendit (demo)",
        pspEscrowId: "esc_demo_7a35",
        createdAt: now - 5 * d,
        courier: "J&T Express",
        tracking: "JT7712045588",
        deliveredAt: now - 4 * d,
        validationEndsAt: now - 1 * d,
        doaEndsAt: now + 3 * d,
        extensionUsed: false,
        completedAt: null,
        address: DEMO_ADDRESS,
        acknowledged: true,
        doaStatus: "NONE",
        disputeReason: "Board powers on but there is no display output — the documented boot test does not match.",
        returnLabel: null,
        timeline: [
          { at: now - 5 * d, label: "Order placed", detail: "Payment received by the licensed PSP" },
          { at: now - 5 * d, label: "Escrow held", detail: "₱1,630.00 held until you validate the part" },
          { at: now - 4.6 * d, label: "Picked up by courier", detail: "J&T Express · JT7712045588" },
          { at: now - 4 * d, label: "Delivered", detail: "72-hour validation window started" },
          { at: now - 1.2 * d, label: "Dispute opened", detail: "Escrow frozen · evidence review started" }
        ]
      },
      {
        id: "ST-2026-004181",
        listingId: "L-1010",
        title: "Tristar U2 IC 1610A3 — Charging",
        image: IMG.ICs,
        seller: "Baguio Microspares",
        subtotal: 450,
        shipping: 180,
        total: 630,
        commission: 36,
        commissionFloorApplied: false,
        reserve: 41.4,
        status: "COMPLETED",
        escrow: "RELEASED",
        paymentMethod: "Maya",
        psp: "Xendit (demo)",
        pspEscrowId: "esc_demo_4b77",
        createdAt: now - 7 * d,
        courier: "LBC Express",
        tracking: "LBC4471209831",
        deliveredAt: now - 5 * d,
        validationEndsAt: now - 2 * d,
        doaEndsAt: now + 2 * d,
        extensionUsed: false,
        completedAt: now - 2 * d,
        address: DEMO_ADDRESS,
        acknowledged: true,
        doaStatus: "NONE",
        returnLabel: null,
        timeline: [
          { at: now - 7 * d, label: "Order placed", detail: "Payment received by the licensed PSP" },
          { at: now - 7 * d, label: "Escrow held", detail: "₱630.00 held until validation" },
          { at: now - 5 * d, label: "Delivered", detail: "72-hour validation window started" },
          { at: now - 2 * d, label: "Escrow released", detail: "Buyer validated · seller payable queued" }
        ]
      },
      {
        id: "ST-2026-004180",
        listingId: "L-1003",
        title: "Galaxy S22 Motherboard — SM-S901B",
        image: IMG.Motherboards,
        seller: "Quiapo Silicon Co.",
        subtotal: 3400,
        shipping: 220,
        total: 3620,
        commission: 272,
        commissionFloorApplied: false,
        reserve: 340,
        status: "COMPLETED",
        escrow: "RELEASED",
        paymentMethod: "Card",
        psp: "Xendit (demo)",
        pspEscrowId: "esc_demo_2d88",
        createdAt: now - 49 * d,
        courier: "LBC Express",
        tracking: "LBC7712004412",
        deliveredAt: now - 46 * d,
        validationEndsAt: now - 43 * d,
        doaEndsAt: now - 39 * d,
        extensionUsed: false,
        completedAt: now - 44 * d,
        address: DEMO_ADDRESS,
        acknowledged: true,
        doaStatus: "NONE",
        returnLabel: null,
        timeline: [
          { at: now - 49 * d, label: "Order placed", detail: "Payment received by the licensed PSP" },
          { at: now - 49 * d, label: "Escrow held", detail: "₱3,620.00 held until the buyer validated the part" },
          { at: now - 48 * d, label: "Picked up by courier", detail: "LBC Express · LBC7712004412" },
          { at: now - 46 * d, label: "Delivered", detail: "72-hour validation window started" },
          { at: now - 44 * d, label: "Escrow released", detail: "Buyer validated in 48 hours · seller paid" }
        ]
      }
    ];
  }

  function seedTickets() {
    const now = Date.now();
    const d = 864e5;
    return [
      {
        id: "T-2026-0913",
        subject: "Dispute — Redmi Note 11 board has no display output",
        category: "Dispute",
        orderId: "ST-2026-004183",
        message:
          "Buyer reports the board powers on but produces no display output. Escrow is frozen; evidence review is waiting on the seller's function-matrix upload.",
        status: "OPEN",
        createdAt: now - 1.2 * d,
        slaHours: 72,
        dueAt: now - 1.2 * d + 72 * 3600e3,
        resolvedAt: null
      },
      {
        id: "T-2026-0912",
        subject: "Courier delay — Cebu to Manila",
        category: "Shipping",
        orderId: "ST-2026-004181",
        message: "Parcel sat at the Cebu hub for two days. Support confirmed the delay and rebooked the pickup.",
        status: "RESOLVED",
        createdAt: now - 4 * d,
        slaHours: 72,
        dueAt: now - 4 * d + 72 * 3600e3,
        resolvedAt: now - 3.5 * d
      }
    ];
  }

  /* ----------------------------------------------------------------------
     Store
     ---------------------------------------------------------------------- */
  let state = null;

  function readKey(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : clone(fallback);
    } catch (err) {
      return clone(fallback);
    }
  }

  function writeKey(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* storage may be unavailable in private mode */
    }
  }

  function migrate(version) {
    if (version >= APP_SCHEMA) return;

    const listings = readKey(K.listings, []);
    seedListings().forEach(function (seed) {
      if (!listings.some((l) => l.id === seed.id)) listings.push(seed);
    });
    writeKey(K.listings, listings);

    const orders = readKey(K.orders, []);
    seedOrders().forEach(function (seed) {
      if (!orders.some((o) => o.id === seed.id)) orders.push(seed);
    });
    writeKey(K.orders, orders);

    const tickets = readKey(K.tickets, []);
    seedTickets().forEach(function (seed) {
      if (!tickets.some((t) => t.id === seed.id)) tickets.push(seed);
    });
    writeKey(K.tickets, tickets);

    if (!localStorage.getItem(K.sellers)) writeKey(K.sellers, seedSellers());
    writeKey(K.version, String(APP_SCHEMA));
  }

  function loadState() {
    if (!localStorage.getItem(K.seeded)) {
      writeKey(K.listings, seedListings());
      writeKey(K.orders, seedOrders());
      writeKey(K.tickets, seedTickets());
      writeKey(K.saved, ["L-1001", "L-1011"]);
      writeKey(K.profile, defaultProfile());
      writeKey(K.sellers, seedSellers());
      writeKey(K.version, String(APP_SCHEMA));
      writeKey(K.seeded, "1");
    } else {
      migrate(Number(localStorage.getItem(K.version) || 1));
    }

    const sellers = readKey(K.sellers, []);
    state = {
      profile: Object.assign(defaultProfile(), readKey(K.profile, {})),
      listings: readKey(K.listings, []),
      orders: readKey(K.orders, []),
      tickets: readKey(K.tickets, []),
      saved: readKey(K.saved, []),
      sellers: sellers.length ? sellers : seedSellers(),
      session: readKey(K.session, null)
    };
    if (!state.session) {
      state.session = { role: "buyer", email: state.profile.email, name: state.profile.name };
    }
  }

  function persist(key) {
    writeKey(K[key], state[key]);
  }

  function monthlyVolume() {
    const period = nowMonthKey();
    const orderVolume = state.orders
      .filter((o) => monthKey(o.createdAt) === period && o.status !== "CANCELLED")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    return round2(Number(state.profile.demoVolumeBase || 0) + orderVolume);
  }

  function createTicket(fields) {
    const slaHours = state.profile.passPlan === "PRO" ? 48 : 72;
    const ticket = {
      id: uid("T-2026-"),
      subject: fields.subject,
      category: fields.category || "Other",
      orderId: fields.orderId || "",
      message: fields.message || "",
      status: "OPEN",
      createdAt: Date.now(),
      slaHours: slaHours,
      dueAt: Date.now() + slaHours * 3600e3,
      resolvedAt: null,
      proWorkshop: state.profile.passPlan === "PRO"
    };
    state.tickets.unshift(ticket);
    persist("tickets");
    return ticket;
  }

  function tierOf(seller) {
    if (seller.pro) return "Pro Workshop";
    if (seller.pass) return "Verified Pass";
    if (seller.verified) return "Verified Seller";
    return "Registered";
  }

  function listingStatusOf(listing) {
    return listing.status || "ACTIVE";
  }

  function listingStatusBadge(listing) {
    const map = {
      ACTIVE: ["Live", "badge-success"],
      PAUSED: ["Paused", "badge-warn"],
      PENDING: ["Pending review", "badge-warn"],
      REMOVED: ["Removed", "badge-neutral"]
    };
    const item = map[listingStatusOf(listing)] || ["Live", "badge-success"];
    return '<span class="badge ' + item[1] + '">' + item[0] + "</span>";
  }

  function sellerById(id) {
    return state.sellers.find((s) => s.id === id) || null;
  }

  function currentRole() {
    return (state.session && state.session.role) || "buyer";
  }

  function sessionName() {
    if (state.session && state.session.role !== "buyer") return state.session.name;
    return state.profile.name;
  }

  function roleHome(role) {
    return (PORTALS[role] || PORTALS.buyer).home;
  }

  function netOf(order) {
    return round2(Math.max(0, Number(order.subtotal || 0) - Number(order.commission || 0) - Number(order.reserve || 0)));
  }

  function orderNet(order) {
    return netOf(order);
  }

  function sellerOrders(name) {
    return state.orders.filter((o) => o.seller === name);
  }

  function sellerListings(name) {
    return state.listings.filter((l) => l.seller && l.seller.name === name);
  }

  function sellerMetrics(name) {
    const listings = sellerListings(name);
    const orders = sellerOrders(name);
    const live = listings.filter((l) => listingStatusOf(l) === "ACTIVE");
    const paid = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED");
    const held = orders.filter((o) => o.escrow === "HELD");
    const frozen = orders.filter((o) => o.escrow === "FROZEN");
    const released = orders.filter((o) => o.escrow === "RELEASED");
    const sum = (arr, fn) => round2(arr.reduce((s, item) => s + Number(fn(item) || 0), 0));
    return {
      listings: listings,
      live: live,
      orders: orders,
      pendingShip: orders.filter((o) => o.status === "PAID"),
      disputes: orders.filter((o) => o.status === "DISPUTED" || o.status === "DOA_CLAIM"),
      gross: sum(paid, (o) => o.subtotal),
      inEscrow: sum(held, netOf),
      frozenValue: sum(frozen, netOf),
      reserveHeld: sum(held.concat(frozen), (o) => o.reserve),
      releasedNet: sum(released, netOf),
      views: round2(listings.reduce((s, l) => s + Number(l.views || 0), 0)),
      rating: listings.length ? listings[0].seller.rating : null
    };
  }

  function platformMetrics() {
    const valid = state.orders.filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED");
    const held = state.orders.filter((o) => o.escrow === "HELD");
    const frozen = state.orders.filter((o) => o.escrow === "FROZEN");
    const released = state.orders.filter((o) => o.escrow === "RELEASED");
    const sum = (arr, fn) => round2(arr.reduce((s, item) => s + Number(fn(item) || 0), 0));
    const activeListings = state.listings.filter((l) => listingStatusOf(l) === "ACTIVE");
    return {
      gmv: sum(valid, (o) => o.total),
      held: sum(held, (o) => o.total),
      frozen: sum(frozen, (o) => o.total),
      commission: sum(released, (o) => o.commission),
      reserveHeld: sum(held.concat(frozen), (o) => o.reserve),
      orders: state.orders.length,
      activeListings: activeListings.length,
      pendingListings: state.listings.filter((l) => listingStatusOf(l) === "PENDING"),
      disputes: state.orders.filter((o) => o.status === "DISPUTED" || o.status === "DOA_CLAIM"),
      openTickets: state.tickets.filter((t) => t.status === "OPEN")
    };
  }

  function categoryVolume() {
    const totals = {};
    state.orders.forEach(function (order) {
      if (order.status === "CANCELLED" || order.status === "REFUNDED") return;
      const listing = state.listings.find((l) => l.id === order.listingId);
      const key = listing ? listing.category : "Other";
      totals[key] = round2((totals[key] || 0) + Number(order.total || 0));
    });
    return Object.keys(totals)
      .map((key) => ({ key: key, value: totals[key] }))
      .sort((a, b) => b.value - a.value);
  }

  /* ----------------------------------------------------------------------
     Chrome: logo, header, footer
     ---------------------------------------------------------------------- */
  const NAV = [
    { key: "marketplace", href: "marketplace.html", label: "Marketplace", match: ["marketplace", "listing", "checkout"], roles: ["buyer", "seller", "admin"] },
    { key: "sell", href: "sell.html", label: "Sell a Board", match: ["sell"], roles: ["seller", "admin"] },
    { key: "verified-pass", href: "verified-pass.html", label: "Verified Pass", match: ["verified-pass"], roles: ["seller"] },
    { key: "orders", href: "orders.html", label: "Orders", match: ["orders"], roles: ["seller", "admin"] },
    { key: "support", href: "support.html", label: "Support", match: ["support"], roles: ["buyer", "seller", "admin"] },
    { key: "account", href: "account.html", label: "Account", match: ["account"], roles: ["buyer", "seller", "admin"] }
  ];

  function navFor(role) {
    return NAV.filter((item) => item.roles.indexOf(role) !== -1);
  }

  function mountLogo(host) {
    if (!host) return;
    const candidates = ["assets/Silicon Logo.jpg", "Silicon Logo.jpg", "assets/logo.svg"];
    let index = 0;
    const img = document.createElement("img");
    img.alt = "Silicon Trading";
    img.onerror = function () {
      index += 1;
      if (index < candidates.length) img.src = encodeURI(candidates[index]);
    };
    img.src = encodeURI(candidates[0]);
    host.appendChild(img);
  }

  function renderHeader() {
    const page = document.body.dataset.page || "home";
    const role = currentRole();
    const home = roleHome(role);
    const items = navFor(role);
    const active = (items.find((item) => item.match.indexOf(page) !== -1) || {}).key;
    const links = items.map(
      (item) =>
        '<a href="' +
        item.href +
        '" class="' +
        (active === item.key ? "active" : "") +
        '">' +
        item.label +
        "</a>"
    ).join("");
    const portalLinks =
      '<a href="account.html">' + icon("user") + "Buyer account</a>" +
      (role === "seller" ? '<a href="seller-dashboard.html">' + icon("box") + "Seller dashboard</a>" : "") +
      (role === "admin" ? '<a href="admin-dashboard.html">' + icon("shield") + "Admin console</a>" : "");

    $("#site-header").innerHTML =
      '<div class="wrap header-inner">' +
      '<a class="brand" href="index.html" aria-label="Silicon Trading — home">' +
      '<span class="brand-mark" id="brand-mark"></span>' +
      '<span class="brand-text"><strong>Silicon</strong> Trading<span>Escrow marketplace</span></span>' +
      "</a>" +
      '<nav class="nav" id="nav" aria-label="Primary">' +
      links +
      "</nav>" +
      '<div class="header-actions">' +
      '<a class="icon-btn" href="marketplace.html" aria-label="Browse marketplace" title="Browse marketplace">' +
      icon("search") +
      "</a>" +
      '<a class="icon-btn" href="account.html#saved" aria-label="Saved listings" title="Saved listings">' +
      icon("heart") +
      '<span class="dot" id="saved-count" style="display:none">0</span>' +
      "</a>" +
      '<details class="portal-menu">' +
      '<summary class="icon-btn" aria-label="Switch portal" title="Portals">' + icon("grid") + "</summary>" +
      '<div class="portal-pop">' +
      '<div class="pop-label">Signed in · ' + esc(PORTALS[role].label) + "</div>" +
      portalLinks +
      '<hr>' +
      '<a href="login.html">' + icon("lock") + "Sign in / switch role</a>" +
      "</div></details>" +
      '<a class="avatar" href="' + home + '" id="header-avatar" aria-label="Your account">' +
      initials(sessionName()) +
      "</a>" +
      '<button class="menu-btn" id="menu-btn" type="button" aria-label="Open menu" aria-expanded="false">' +
      icon("menu") +
      "</button>" +
      "</div>" +
      "</div>";

    mountLogo($("#brand-mark"));

    const menuBtn = $("#menu-btn");
    const nav = $("#nav");
    if (menuBtn && nav) {
      menuBtn.addEventListener("click", function () {
        const open = nav.classList.toggle("is-open");
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      $$("a", nav).forEach((link) =>
        link.addEventListener("click", function () {
          nav.classList.remove("is-open");
          menuBtn.setAttribute("aria-expanded", "false");
        })
      );
    }
  }

  function renderFooter() {
    const year = new Date().getFullYear();
    const role = currentRole();
    const sellerCol =
      '<div class="footer-col"><h4>Sell</h4>' +
      '<a href="sell.html">List a board</a>' +
      (role === "seller"
        ? '<a href="seller-dashboard.html">Seller dashboard</a>' +
          '<a href="verified-pass.html">Verified Pass</a>' +
          '<a href="account.html#payouts">Payouts &amp; reserve</a>'
        : '<a href="admin-dashboard.html">Admin console</a>' +
          '<a href="admin-dashboard.html#listings">Moderation queue</a>') +
      "</div>";
    const trustCol =
      '<div class="footer-col"><h4>Trust</h4>' +
      '<a href="orders.html">Orders &amp; escrow</a>' +
      '<a href="support.html">Support &amp; disputes</a>' +
      '<a href="support.html">7-day DOA</a>' +
      '<a href="account.html#verification">Escrow protection</a>' +
      "</div>";
    const buyerCols =
      '<div class="footer-col"><h4>Support</h4>' +
      '<a href="support.html">Support &amp; disputes</a>' +
      '<a href="support.html">7-day DOA</a>' +
      '<a href="marketplace.html">Escrow protection</a>' +
      "</div>" +
      '<div class="footer-col"><h4>Account</h4>' +
      '<a href="account.html">Account &amp; verification</a>' +
      '<a href="account.html#volume">Monthly volume</a>' +
      '<a href="account.html#saved">Saved parts</a>' +
      "</div>";

    $("#site-footer").innerHTML =
      '<div class="wrap">' +
      '<div class="footer-grid">' +
      '<div class="footer-brand">' +
      '<a class="brand" href="index.html"><span class="brand-mark" id="footer-brand-mark"></span>' +
      '<span class="brand-text"><strong>Silicon</strong> Trading<span>Escrow marketplace</span></span></a>' +
      "<p>Repair-grade silicon, verified and held in licensed escrow until the part proves itself. Built for Philippine repair shops, refurbishers, and scrappers.</p>" +
      "</div>" +
      '<div class="footer-col"><h4>Marketplace</h4>' +
      '<a href="marketplace.html">Browse all parts</a>' +
      '<a href="marketplace.html?category=Donor%20Boards">Donor boards</a>' +
      '<a href="marketplace.html?category=Motherboards">Motherboards</a>' +
      '<a href="marketplace.html?category=ICs">ICs</a>' +
      '<a href="marketplace.html?category=Phone%20Parts">Phone parts</a>' +
      "</div>" +
      (role === "buyer" ? buyerCols : sellerCol + trustCol) +
      "</div>" +
      '<div class="footer-bottom"><span>© ' + year + ' Silicon Trading. Demo build.</span>' +
      '<span class="demo-note">' + icon("alert") + "Payments, escrow, courier tracking, and verification are simulated. No real money moves.</span>" +
      "</div></div>";
    mountLogo($("#footer-brand-mark"));
  }

  function updateChrome() {
    const count = $("#saved-count");
    if (count) {
      count.textContent = String(state.saved.length);
      count.style.display = state.saved.length ? "grid" : "none";
    }
    const avatar = $("#header-avatar");
    if (avatar) {
      avatar.textContent = initials(sessionName());
      avatar.title = sessionName() + " · " + PORTALS[currentRole()].label;
      avatar.href = roleHome(currentRole());
    }
  }

  /* ----------------------------------------------------------------------
     Shared fragments
     ---------------------------------------------------------------------- */
  const ORDER_STATUS = {
    PAID: ["Paid — awaiting shipment", "badge-verified"],
    SHIPPED: ["In transit", "badge-warn"],
    DELIVERED: ["Delivered — validate", "badge-warn"],
    COMPLETED: ["Completed", "badge-success"],
    DISPUTED: ["Disputed — escrow frozen", "badge-danger"],
    DOA_CLAIM: ["DOA claim open", "badge-danger"],
    REFUNDED: ["Refunded", "badge-neutral"],
    CANCELLED: ["Cancelled", "badge-neutral"]
  };

  function statusBadge(status) {
    const item = ORDER_STATUS[status] || ["Unknown", "badge-neutral"];
    return '<span class="badge ' + item[1] + '">' + item[0] + "</span>";
  }

  function escrowPill(order) {
    const map = {
      HELD: ["Held by licensed PSP", ""],
      FROZEN: ["Escrow frozen", "is-frozen"],
      RELEASED: ["Released to seller", "is-released"],
      REFUNDED: ["Refunded", "is-refunded"],
      DOA_REFUNDED: ["DOA refund issued", "is-refunded"]
    };
    const item = map[order.escrow] || [order.escrow, ""];
    return (
      '<span class="escrow-pill ' + item[1] + '">' + icon("shield") + item[0] + "</span>"
    );
  }

  function listingCard(listing) {
    const saved = state.saved.indexOf(listing.id) !== -1;
    return (
      '<article class="listing-card">' +
      '<a class="listing-media" href="listing.html?id=' + listing.id + '" aria-label="' + esc(listing.title) + '">' +
      '<img src="' + listing.image + '" alt="' + esc(listing.title) + '" loading="lazy">' +
      (listing.pass ? '<span class="badge badge-pass">' + icon("shield") + " Verified Pass</span>" : "") +
      "</a>" +
      '<button class="fav ' + (saved ? "is-on" : "") + '" type="button" data-action="toggle-saved" data-id="' +
      listing.id + '" aria-label="Save listing" title="Save listing">' + icon("heart") + "</button>" +
      '<div class="listing-body">' +
      '<div class="listing-meta"><span class="badge badge-grade">Grade ' + esc(listing.grade) + "</span>" +
      '<span class="small muted">' + esc(listing.type) + "</span></div>" +
      '<h3><a href="listing.html?id=' + listing.id + '">' + esc(listing.title) + "</a></h3>" +
      '<p class="listing-sub">Fits ' + esc(listing.device) + " · " + esc(listing.alias) + "</p>" +
      '<div class="listing-foot"><span class="price">' + peso0(listing.price) + "</span>" +
      '<span class="rating">' + icon("star") + " " + Number(listing.seller.rating).toFixed(1) + " · " +
      esc(listing.seller.city) + "</span></div>" +
      '<div class="listing-trust">' + icon("shield") + "Escrow · 72h validation · 7-day DOA</div>" +
      "</div></article>"
    );
  }

  function emptyState(title, text, cta) {
    return (
      '<div class="empty"><div class="ico">' + icon("box") + "</div><h3>" + esc(title) +
      "</h3><p>" + esc(text) + "</p>" + (cta || "") + "</div>"
    );
  }

  function notFound(title, text) {
    $("#page").innerHTML =
      '<div class="wrap" style="padding:60px 0 80px">' +
      emptyState(title || "Not found", text || "We could not find that page.", '<a class="btn btn-primary" href="marketplace.html">Browse marketplace</a>') +
      "</div>";
  }

  function renderSignInGate() {
    $("#page").innerHTML =
      '<div class="wrap" style="padding:56px 0 80px">' +
      '<div class="gate">' +
      '<div class="ico">' + icon("user") + "</div>" +
      "<h2>Sign in to continue</h2>" +
      "<p>This demo stores everything in your browser. Continue as the demo buyer to test checkout, escrow, sellers, and the 7-day DOA flow.</p>" +
      '<button class="btn btn-primary btn-lg" type="button" data-action="sign-in">Continue as demo buyer</button>' +
      '<p class="small muted" style="margin-top:14px">No email or password required in the demo.</p>' +
      "</div></div>";
  }

  /* ----------------------------------------------------------------------
     Home
     ---------------------------------------------------------------------- */
  function renderHome() {
    const featured = state.listings
      .filter((l) => l.pass && listingStatusOf(l) === "ACTIVE")
      .slice(0, 4);
    const counts = {};
    CATEGORIES.forEach(function (cat) {
      counts[cat] = state.listings.filter(
        (l) => l.category === cat && listingStatusOf(l) === "ACTIVE"
      ).length;
    });
    const categoryCards = CATEGORIES.map(function (cat) {
      return (
        '<a class="cat-card" href="marketplace.html?category=' + encodeURIComponent(cat) + '">' +
        '<span class="cat-thumb"><img src="' + IMG[cat] + '" alt=""></span>' +
        "<span><b>" + cat + '</b><span>' + counts[cat] + " listings</span></span>" +
        '<span class="arrow">' + icon("arrow") + "</span></a>"
      );
    }).join("");

    $("#page").innerHTML =
      '<section class="hero"><div class="wrap hero-inner">' +
      '<div><span class="eyebrow">' + icon("spark") + "Donor boards · ICs · Reclaimed parts</span>" +
      "<h1>Silicon you can <em>trust</em>.</h1>" +
      '<p class="hero-sub">Buy repair-grade boards and ICs with the money held in licensed escrow until you verify the part. Every order gets a 72-hour validation window and 7-day DOA cover.</p>' +
      '<form class="hero-search" id="home-search" role="search">' +
      '<div class="search-wrap">' + icon("search") +
      '<input id="home-q" type="search" placeholder="Search iPhone 13 Pro, A2638, or PMIC 338S00509…" aria-label="Search parts">' +
      "</div>" +
      '<button class="btn btn-primary" type="submit">Search</button>' +
      "</form>" +
      '<div class="popular"><span>Popular:</span>' +
      '<a href="marketplace.html?q=iPhone%2013%20Pro">iPhone 13 Pro</a>' +
      '<a href="marketplace.html?q=A2638">A2638</a>' +
      '<a href="marketplace.html?q=PMIC">PMIC</a>' +
      '<a href="marketplace.html?category=Donor%20Boards">Donor boards</a>' +
      "</div>" +
      '<div class="hero-stats">' +
      '<div class="stat"><b>₱12.4M</b><span>PROTECTED IN ESCROW</span></div>' +
      '<div class="stat"><b>1,842</b><span>DISPUTES RESOLVED</span></div>' +
      '<div class="stat"><b>72h</b><span>VALIDATION, EVERY TIER</span></div>' +
      "</div></div>" +
      '<aside class="hero-panel"><div class="escrow-visual">' +
      '<div class="escrow-visual-head"><div><div class="label">Order ST-2026-004182</div>' +
      '<div class="amount">₱3,130.00</div></div><span class="badge badge-verified">' + icon("shield") + " Held</span></div>" +
      '<div class="escrow-flow">' +
      '<div class="flow-step done"><span class="flow-ico">' + icon("card") + "</span><div><b>Buyer pays</b><small>GCash · Maya · card · bank</small></div></div>" +
      '<div class="flow-step now"><span class="flow-ico">' + icon("lock") + "</span><div><b>PSP holds the funds</b><small>BSP-licensed escrow · not the platform</small></div></div>" +
      '<div class="flow-step"><span class="flow-ico">' + icon("truck") + "</span><div><b>Seller ships · you validate</b><small>72-hour window after delivery</small></div></div>" +
      '<div class="flow-step"><span class="flow-ico">' + icon("check") + "</span><div><b>Seller is paid</b><small>7-day DOA cover continues</small></div></div>" +
      "</div>" +
      '<div class="escrow-visual-foot">' + icon("lock") + "Funds never touch a Silicon Trading account.</div>" +
      "</div></aside></div></section>" +

      '<section class="trust-strip"><div class="wrap"><div class="trust-grid">' +
      '<div class="trust-item"><span class="ico">' + icon("shield") + "</span><div><b>Licensed PSP escrow</b><span>Released only after you validate, or 72h after delivery.</span></div></div>" +
      '<div class="trust-item"><span class="ico">' + icon("check") + "</span><div><b>Verified sellers</b><span>ID, address, and payout checks before a listing goes live.</span></div></div>" +
      '<div class="trust-item"><span class="ico">' + icon("clock") + "</span><div><b>72-hour validation</b><span>The same window for every seller tier — no paid shortcuts.</span></div></div>" +
      '<div class="trust-item"><span class="ico">' + icon("alert") + "</span><div><b>7-day DOA cover</b><span>Dead on arrival? A prepaid return label is on us.</span></div></div>" +
      "</div></div></section>" +

      '<section class="section"><div class="wrap">' +
      '<div class="section-head"><div><h2>Shop by category</h2><p>Everything is graded, photographed, and shipped under the same escrow rules.</p></div>' +
      '<a class="link" href="marketplace.html">All listings ' + icon("arrow") + "</a></div>" +
      '<div class="grid grid-4">' + categoryCards + "</div>" +
      "</div></section>" +

      '<section class="section-tight"><div class="wrap">' +
      '<div class="section-head"><div><h2>Evidence-backed stock</h2><p>Verified Pass listings carry a seller evidence pack, spot-audited by the platform.</p></div>' +
      '<a class="link" href="marketplace.html?pass=1">Verified Pass only ' + icon("arrow") + "</a></div>" +
      '<div class="listing-grid">' + featured.map(listingCard).join("") + "</div>" +
      "</div></section>" +

      '<section class="section"><div class="wrap">' +
      '<div class="section-head"><div><h2>How a protected order works</h2><p>Money and goods move on separate rails. The platform can only move money when the evidence says it should.</p></div></div>' +
      '<div class="how-grid">' +
      '<div class="how-card"><div class="num">01</div><h3>Find the exact part</h3><p>Search by device, part number, or IC marking. Check fit confidence before you buy.</p></div>' +
      '<div class="how-card"><div class="num">02</div><h3>Pay into escrow</h3><p>The PSP holds your payment. The seller sees a paid order, not your money.</p></div>' +
      '<div class="how-card"><div class="num">03</div><h3>Validate in 72 hours</h3><p>Boot it, test the documented functions, and release only when it matches.</p></div>' +
      '<div class="how-card"><div class="num">04</div><h3>Covered for 7 days</h3><p>If it dies on arrival after release, the platform funds the refund and return label.</p></div>' +
      "</div></div></section>" +

      '<section class="section-tight"><div class="wrap"><div class="split">' +
      '<div class="compat-card"><span class="eyebrow">Compatibility checker</span>' +
      "<h3 style=\"margin-top:10px\">Will this part fit my phone?</h3>" +
      '<p class="sub">Pick a device. We show every listing tagged for it, with the fit confidence visible on the listing.</p>' +
      '<div class="field"><label for="compat-device">Device model</label>' +
      '<select class="select" id="compat-device"><option value="">Choose a model…</option>' +
      DEVICES.map((d) => '<option value="' + esc(d) + '">' + esc(d) + "</option>").join("") +
      "</select></div>" +
      '<div class="compat-result" id="compat-result"><div class="note">Compatibility is based on — choose a device to see matching stock.</div></div>' +
      "</div>" +
      '<div class="pass-promo"><span class="eyebrow" style="color:#ffe3cc">Verified Pass</span>' +
      "<h3>Evidence on file. Spot-audited. Ranked higher.</h3>" +
      "<p>Upload boot, serial, function, diagnostic, and marking evidence. Pass a spot audit and carry the copper badge.</p>" +
      '<div class="price-line"><b>₱399</b><span>/ month · 8 listings + 48h support</span></div>' +
      '<a class="btn btn-lg" href="verified-pass.html">See Verified Pass ' + icon("arrow") + "</a>" +
      "</div></div></div></section>" +

      '<section class="section-tight"><div class="wrap"><div class="stats-band">' +
      '<div class="kpi"><b>₱12.4M</b><span>Protected in licensed escrow</span></div>' +
      '<div class="kpi"><b>1,842</b><span>Disputes resolved with evidence</span></div>' +
      '<div class="kpi"><b>98.2%</b><span>Validation success rate</span></div>' +
      '<div class="kpi"><b>72h</b><span>Auto-release · all tiers</span></div>' +
      "</div></div></section>" +

      '<section class="section"><div class="wrap"><div class="cta">' +
      "<div><h2>Turn spare boards into verified stock.</h2>" +
      "<p>List in minutes, get paid from licensed escrow, and keep a 10% reserve that protects both sides for 14 days.</p></div>" +
      '<a class="btn btn-lg" href="sell.html">Start selling ' + icon("arrow") + "</a>" +
      "</div></div></section>";

    const form = $("#home-search");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        const value = $("#home-q").value.trim();
        location.href = "marketplace.html" + (value ? "?q=" + encodeURIComponent(value) : "");
      });
    }

    const compat = $("#compat-device");
    if (compat) {
      compat.addEventListener("change", function () {
        const device = compat.value;
        const result = $("#compat-result");
        if (!device) {
          result.innerHTML = '<div class="note">Compatibility is based on — choose a device to see matching stock.</div>';
          return;
        }
        const matches = state.listings.filter(
          (l) => l.device === device || (l.compat || []).indexOf(device) !== -1
        );
        if (!matches.length) {
          result.innerHTML =
            '<div class="note note-amber">No tagged stock yet for ' + esc(device) +
            '. Open a support ticket and we will watch for it.</div>';
          return;
        }
        result.innerHTML =
          '<div class="note note-teal"><b>' + matches.length + " compatible part" +
          (matches.length === 1 ? "" : "s") + " found</b> for " + esc(device) + ".</div>" +
          '<div class="compat-list">' +
          matches.slice(0, 3).map(function (l) {
            return (
              '<a class="compat-item" href="listing.html?id=' + l.id + '"><span>' +
              esc(l.title) + "</span><span class=\"price\">" + peso0(l.price) + "</span></a>"
            );
          }).join("") +
          "</div><a class=\"link\" style=\"margin-top:10px\" href=\"marketplace.html?q=" +
          encodeURIComponent(device) + '">See all matches ' + icon("arrow") + "</a>";
      });
    }
  }

  /* ----------------------------------------------------------------------
     Marketplace
     ---------------------------------------------------------------------- */
  let mkt = { q: "", category: "All", grade: "All", max: "", pass: false, sort: "relevance" };

  function initMktFilters() {
    mkt = {
      q: PARAMS.get("q") || "",
      category: PARAMS.get("category") || "All",
      grade: PARAMS.get("grade") || "All",
      max: PARAMS.get("max") || "",
      pass: PARAMS.get("pass") === "1",
      sort: PARAMS.get("sort") || "relevance"
    };
    if (CATEGORIES.indexOf(mkt.category) === -1) mkt.category = "All";
  }

  function mktFiltered() {
    let list = state.listings.filter((l) => listingStatusOf(l) === "ACTIVE");
    if (mkt.category !== "All") list = list.filter((l) => l.category === mkt.category);
    if (mkt.q) {
      const q = mkt.q.toLowerCase();
      list = list.filter(function (l) {
        return [l.title, l.device, l.alias, l.partNumber, l.category, l.seller.name]
          .join(" ")
          .toLowerCase()
          .indexOf(q) !== -1;
      });
    }
    if (mkt.grade !== "All") list = list.filter((l) => l.grade === mkt.grade);
    if (mkt.max && Number(mkt.max) < 8000) list = list.filter((l) => l.price <= Number(mkt.max));
    if (mkt.pass) list = list.filter((l) => l.pass);

    if (mkt.sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (mkt.sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (mkt.sort === "newest") list.sort((a, b) => b.createdAt - a.createdAt);
    else {
      list.sort(function (a, b) {
        if (a.pass !== b.pass) return a.pass ? -1 : 1;
        return b.seller.rating - a.seller.rating;
      });
    }
    return list;
  }

  function mktChips() {
    const chips = [];
    if (mkt.q) chips.push({ key: "q", label: "Search: " + mkt.q });
    if (mkt.category !== "All") chips.push({ key: "category", label: mkt.category });
    if (mkt.grade !== "All") chips.push({ key: "grade", label: "Grade " + mkt.grade });
    if (mkt.max && Number(mkt.max) < 8000) chips.push({ key: "max", label: "Under " + peso0(mkt.max) });
    if (mkt.pass) chips.push({ key: "pass", label: "Verified Pass only" });
    return chips
      .map(function (c) {
        return (
          '<span class="chip-x">' + esc(c.label) +
          '<button type="button" data-action="remove-chip" data-chip="' + c.key + '" aria-label="Remove filter">' +
          icon("close") + "</button></span>"
        );
      })
      .join("");
  }

  function syncMktUrl() {
    const params = new URLSearchParams();
    if (mkt.q) params.set("q", mkt.q);
    if (mkt.category !== "All") params.set("category", mkt.category);
    if (mkt.grade !== "All") params.set("grade", mkt.grade);
    if (mkt.max && Number(mkt.max) < 8000) params.set("max", mkt.max);
    if (mkt.pass) params.set("pass", "1");
    if (mkt.sort !== "relevance") params.set("sort", mkt.sort);
    const qs = params.toString();
    const file = location.pathname.split("/").pop() || "marketplace.html";
    try {
      history.replaceState(null, "", file + (qs ? "?" + qs : "") + location.hash);
    } catch (err) {
      /* history API can be blocked on file:// */
    }
  }

  function refreshMkt() {
    const list = mktFiltered();
    const count = $("#result-count");
    if (count) {
      count.innerHTML =
        "<b>" + list.length + "</b> listing" + (list.length === 1 ? "" : "s") + " found";
    }
    const results = $("#mkt-results");
    if (results) {
      results.innerHTML = list.length
        ? '<div class="mkt-grid">' + list.map(listingCard).join("") + "</div>"
        : emptyState(
            "No parts match those filters",
            "Try a broader category or clear the price cap. New donor stock is added daily.",
            '<button class="btn btn-primary" type="button" data-action="mkt-reset">Reset filters</button>'
          );
    }
    const chips = $("#active-chips");
    if (chips) chips.innerHTML = mktChips();
    $$('.filter-list button[data-cat]').forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.cat === mkt.category);
    });
    syncMktUrl();
    updateChrome();
  }

  function resetMkt() {
    mkt = { q: "", category: "All", grade: "All", max: "", pass: false, sort: "relevance" };
    renderMarketplace(true);
    scrollTop();
  }

  function renderMarketplace(keepFilters) {
    if (!keepFilters) initMktFilters();
    const counts = {};
    CATEGORIES.forEach(function (cat) {
      counts[cat] = state.listings.filter((l) => l.category === cat).length;
    });

    const catButtons = ["All"]
      .concat(CATEGORIES)
      .map(function (cat) {
        const n = cat === "All" ? state.listings.length : counts[cat];
        return (
          '<button type="button" data-cat="' + esc(cat) + '" class="' +
          (mkt.category === cat ? "is-active" : "") + '">' + esc(cat) +
          '<span class="n">' + n + "</span></button>"
        );
      })
      .join("");

    $("#page").innerHTML =
      '<div class="wrap"><div class="page-head">' +
      "<h1>Marketplace</h1>" +
      "<p>Repair-grade boards, ICs, and assemblies. Every listing is escrow-protected, every order carries a 72-hour validation window and 7-day DOA cover.</p>" +
      "</div></div>" +
      '<div class="wrap"><div class="mkt-layout">' +
      '<aside class="filters" aria-label="Filters">' +
      '<div class="filter-group"><h4>Category</h4><div class="filter-list">' + catButtons + "</div></div>" +
      '<div class="filter-group"><h4>Condition grade</h4>' +
      '<select class="select" id="f-grade" aria-label="Condition grade">' +
      '<option value="All">Any grade</option>' +
      ["A", "B", "C", "D"].map(function (g) {
        return '<option value="' + g + '"' + (mkt.grade === g ? " selected" : "") + ">Grade " + g + "</option>";
      }).join("") +
      "</select></div>" +
      '<div class="filter-group"><h4>Max price</h4>' +
      '<input type="range" id="f-max" min="0" max="8000" step="100" value="' +
      (mkt.max && Number(mkt.max) < 8000 ? mkt.max : 8000) +
      '" style="width:100%;accent-color:var(--teal)" aria-label="Maximum price">' +
      '<div class="spread small muted" style="margin-top:6px"><span>₱0</span><b id="f-max-label" style="color:var(--ink)">' +
      (mkt.max && Number(mkt.max) < 8000 ? peso0(mkt.max) : "Any") +
      "</b></div></div>" +
      '<div class="filter-group"><h4>Trust</h4>' +
      '<label class="check"><input type="checkbox" id="f-pass"' + (mkt.pass ? " checked" : "") +
      "> Verified Pass only</label>" +
      '<p class="small muted" style="margin-top:8px;line-height:1.45">Evidence on file and spot-audited by the platform.</p>' +
      "</div>" +
      '<button class="btn btn-ghost btn-sm btn-block" type="button" data-action="mkt-reset">Reset filters</button>' +
      "</aside>" +
      "<div>" +
      '<div class="mkt-toolbar">' +
      '<div class="mkt-search">' + icon("search") +
      '<input id="mkt-q" type="search" placeholder="Search title, device, part number, or IC marking…" value="' +
      esc(mkt.q) + '" aria-label="Search listings"></div>' +
      '<div class="mkt-sort"><label class="small muted" for="mkt-sort">Sort</label>' +
      '<select id="mkt-sort" aria-label="Sort results">' +
      '<option value="relevance"' + (mkt.sort === "relevance" ? " selected" : "") + ">Relevance</option>" +
      '<option value="price-asc"' + (mkt.sort === "price-asc" ? " selected" : "") + ">Price: low to high</option>" +
      '<option value="price-desc"' + (mkt.sort === "price-desc" ? " selected" : "") + ">Price: high to low</option>" +
      '<option value="newest"' + (mkt.sort === "newest" ? " selected" : "") + ">Newest first</option>" +
      "</select></div></div>" +
      '<div class="active-chips" id="active-chips"></div>' +
      '<div class="mkt-toolbar" style="margin-bottom:14px"><span class="result-count" id="result-count"></span></div>' +
      '<div id="mkt-results"></div>' +
      "</div></div></div>";

    refreshMkt();

    $("#mkt-q").addEventListener("input", function (e) {
      mkt.q = e.target.value.trim();
      refreshMkt();
    });
    $("#mkt-sort").addEventListener("change", function (e) {
      mkt.sort = e.target.value;
      refreshMkt();
    });
    $$(".filter-list button[data-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        mkt.category = btn.dataset.cat;
        refreshMkt();
      });
    });
    $("#f-grade").addEventListener("change", function (e) {
      mkt.grade = e.target.value;
      refreshMkt();
    });
    $("#f-max").addEventListener("input", function (e) {
      const value = Number(e.target.value);
      mkt.max = value >= 8000 ? "" : String(value);
      $("#f-max-label").textContent = value >= 8000 ? "Any" : peso0(value);
      refreshMkt();
    });
    $("#f-pass").addEventListener("change", function (e) {
      mkt.pass = e.target.checked;
      refreshMkt();
    });
  }

  /* ----------------------------------------------------------------------
     Listing detail
     ---------------------------------------------------------------------- */
  function diagValue(value) {
    if (value === true) return '<span class="diag-ok">' + icon("check") + "Pass</span>";
    if (value === false) return '<span class="diag-no">' + icon("close") + "No</span>";
    return "<span>" + esc(value) + "</span>";
  }

  function renderListing() {
    const listing = state.listings.find((l) => l.id === PARAMS.get("id"));
    const listingStatus = listing ? listingStatusOf(listing) : "REMOVED";
    if (!listing || listingStatus === "PENDING" || listingStatus === "REMOVED") {
      notFound("Listing not found", "This listing may have sold or been removed. Browse current stock instead.");
      return;
    }

    const saved = state.saved.indexOf(listing.id) !== -1;
    const related = state.listings
      .filter(
        (l) =>
          l.category === listing.category &&
          l.id !== listing.id &&
          listingStatusOf(l) === "ACTIVE"
      )
      .slice(0, 4);
    const diagRows = Object.keys(listing.diagnostics)
      .map(function (key) {
        return "<tr><td>" + esc(key) + "</td><td>" + diagValue(listing.diagnostics[key]) + "</td></tr>";
      })
      .join("");
    const notes = (listing.notes || [])
      .map((n) => '<span class="badge badge-neutral">' + esc(n) + "</span>")
      .join(" ");
    const compat = (listing.compat || [])
      .map(function (device) {
        return (
          '<div class="evidence-row"><span class="tick">' + icon("check") + "</span>" +
          "<span><b>" + esc(device) + "</b> · " + (listing.pass ? "verified fit" : "tagged fit") +
          '</span><span class="meta">' + (listing.pass ? "evidence on file" : "catalog") + "</span></div>"
        );
      })
      .join("");
    const evidence = listing.evidence
      ? listing.evidence
          .map(function (item) {
            return (
              '<div class="evidence-row"><span class="tick">' + icon("check") + "</span>" +
              "<span><b>" + esc(item.label) + "</b></span>" +
              '<span class="meta">' + esc(item.meta) + "</span></div>"
            );
          })
          .join("")
      : '<div class="note note-amber">This listing has no Verified Pass evidence pack. The copper badge is not shown.</div>';

    $("#page").innerHTML =
      (listingStatus === "PAUSED"
        ? '<div class="wrap" style="padding-top:18px"><div class="note note-amber">' + icon("alert") +
          " This listing is paused and hidden from the marketplace. It is visible here for the seller preview.</div></div>"
        : "") +
      '<div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb">' +
      '<a href="marketplace.html">Marketplace</a>' + icon("chevron") +
      '<a href="marketplace.html?category=' + encodeURIComponent(listing.category) + '">' +
      esc(listing.category) + "</a>" + icon("chevron") +
      "<span>" + esc(listing.device) + "</span></nav></div>" +
      '<div class="wrap"><div class="pdp-layout">' +
      "<div>" +
      '<div class="gallery">' +
      '<div class="gallery-main"><img id="gallery-main-img" src="' + listing.image + '" alt="' +
      esc(listing.title) + '">' +
      (listing.pass
        ? '<span class="badge badge-pass">' + icon("shield") + " Verified Pass · spot-audited " +
          esc(listing.auditedAt || "—") + "</span>"
        : '<span class="badge badge-grade">Grade ' + esc(listing.grade) + "</span>") +
      '<span class="gallery-angle" id="gallery-angle">TOP VIEW</span></div>' +
      '<div class="gallery-thumbs">' +
      ["TOP", "CONNECTORS", "MARKINGS", "DIAGNOSTIC"]
        .map(function (label, i) {
          return (
            '<button type="button" class="' + (i === 0 ? "is-active" : "") + '" data-angle="' + label +
            '" aria-label="' + label + ' view"><img src="' + listing.image + '" alt="' + label + ' view"></button>'
          );
        })
        .join("") +
      "</div></div>" +

      '<section class="pdp-section"><h2>About this part</h2>' +
      "<p class=\"muted\" style=\"line-height:1.65\">" + esc(listing.description) + "</p>" +
      '<div class="chips" style="margin-top:14px">' + notes + "</div>" +
      '<dl class="kv" style="margin-top:20px">' +
      "<dt>Part number</dt><dd>" + esc(listing.partNumber) + "</dd>" +
      "<dt>Device / alias</dt><dd>" + esc(listing.device) + " · " + esc(listing.alias) + "</dd>" +
      "<dt>Condition</dt><dd>Grade " + esc(listing.grade) + " · " + esc(listing.type) + "</dd>" +
      "<dt>Water damage</dt><dd>" + (listing.water ? "Disclosed" : "None indicated") + "</dd>" +
      "<dt>Stock</dt><dd>" + listing.stock + " available</dd>" +
      "</dl></section>" +

      '<section class="pdp-section"><h2>Diagnostics</h2>' +
      '<p class="sub">' + (listing.pass
        ? "Tested by the seller · evidence on file · spot-audited " + esc(listing.auditedAt)
        : "Seller-declared condition. No Verified Pass evidence pack on file.") + "</p>" +
      '<table class="diag-table"><thead><tr><th>Check</th><th>Result</th></tr></thead><tbody>' +
      diagRows + "</tbody></table></section>" +

      '<section class="pdp-section"><h2>Verified Pass evidence</h2>' +
      '<p class="sub">A Pass badge is only rendered after the seller uploads all five evidence items. A 10% weekly sample is spot-audited.</p>' +
      '<div class="evidence-list">' + evidence + "</div></section>" +

      '<section class="pdp-section"><h2>Compatibility</h2>' +
      '<p class="sub">Fit confidence is shown per device. "Verified" requires evidence; "Tagged" is catalog-derived.</p>' +
      '<div class="evidence-list">' + compat + "</div>" +
      '<div class="note" style="margin-top:12px">' + icon("info") +
      " Cross-model fits are not assumed. If your exact revision is not listed, open a support ticket before buying.</div>" +
      "</section>" +

      '<section class="pdp-section"><h2>Seller</h2>' +
      '<div class="seller-mini" style="margin-top:0">' +
      '<span class="seller-avatar">' + initials(listing.seller.name) + "</span>" +
      "<div><b>" + esc(listing.seller.name) + "</b>" +
      "<span>⭐ " + Number(listing.seller.rating).toFixed(1) + " · " + listing.seller.orders +
      " orders · " + esc(listing.seller.city) + " · replies in " + esc(listing.seller.response) + "</span></div>" +
      '<span class="badge ' + (listing.seller.pass ? "badge-pass" : "badge-verified") + '" style="margin-left:auto">' +
      esc(tierOf(listing.seller)) + "</span></div>" +
      '<p class="small muted" style="margin-top:12px">Member since ' + esc(listing.seller.since) +
      " · ID verified · payout account verified. Dispute rate is shown in the support console during a claim.</p>" +
      "</section>" +

      '<section class="pdp-section"><h2>Shipping &amp; returns</h2>' +
      '<dl class="kv">' +
      "<dt>Ships from</dt><dd>" + esc(listing.shipsFrom) + "</dd>" +
      "<dt>Estimated delivery</dt><dd>" + esc(listing.shipsIn) + "</dd>" +
      "<dt>Validation window</dt><dd>72 hours from delivery — every seller tier</dd>" +
      "<dt>DOA cover</dt><dd>7 days from delivery, including after escrow release</dd>" +
      "<dt>Return label</dt><dd>Platform-generated prepaid label for upheld claims</dd>" +
      "<dt>Payment</dt><dd>Escrow only · no COD</dd>" +
      "</dl>" +
      '<div class="note note-teal" style="margin-top:14px">' + icon("shield") +
      " If the part does not match the listing, freeze escrow from the order page and open a dispute. Evidence is required.</div>" +
      "</section>" +
      "</div>" +

      '<aside class="card buybox">' +
      '<div class="listing-meta"><span class="badge badge-grade">Grade ' + esc(listing.grade) + "</span>" +
      '<span class="badge badge-neutral">' + esc(listing.type) + "</span>" +
      (listing.pass ? '<span class="badge badge-pass">' + icon("shield") + " Verified Pass</span>" : "") +
      "</div>" +
      "<h1>" + esc(listing.title) + "</h1>" +
      '<p class="listing-sub">Fits ' + esc(listing.device) + " · " + esc(listing.alias) + " · Part " +
      esc(listing.partNumber) + "</p>" +
      '<div class="price-row"><span class="price-xl">' + peso(listing.price) + "</span>" +
      '<span class="small muted">+ shipping from ' + peso0(160) + "</span></div>" +
      '<div class="escrow-note">' + icon("shield") +
      "<span>Your payment is held in licensed escrow until you validate the part — or 72 hours after delivery.</span></div>" +
      '<div class="buy-actions">' +
      '<a class="btn btn-primary btn-lg" href="checkout.html?id=' + listing.id + '">Buy with escrow</a>' +
      '<button class="btn btn-ghost btn-lg" type="button" data-action="toggle-saved" data-id="' +
      listing.id + '" aria-pressed="' + saved + '">' + icon("heart") + (saved ? "Saved" : "Save") + "</button>" +
      "</div>" +
      '<ul class="assurance">' +
      "<li>" + icon("clock") + "72-hour validation window</li>" +
      "<li>" + icon("shield") + "7-day DOA guarantee</li>" +
      "<li>" + icon("truck") + "Prepaid return label if something is wrong</li>" +
      "<li>" + icon("lock") + "No COD — escrow protects both sides</li>" +
      "</ul>" +
      '<div class="seller-mini">' +
      '<span class="seller-avatar">' + initials(listing.seller.name) + "</span>" +
      "<div><b>" + esc(listing.seller.name) + "</b>" +
      "<span>⭐ " + Number(listing.seller.rating).toFixed(1) + " · " + listing.seller.orders + " orders · " +
      esc(listing.seller.city) + "</span></div>" +
      '<span class="badge ' + (listing.seller.pass ? "badge-pass" : "badge-verified") + '">' +
      esc(tierOf(listing.seller)) + "</span></div>" +
      '<p class="small muted" style="margin-top:14px">Seller pays the 8% commission (₱20 minimum). You pay the listed price plus shipping — no buyer platform fee.</p>' +
      '<p class="small muted" style="margin-top:8px"><a class="link" href="support.html?order=">Report listing or ask a question ' +
      icon("arrow") + "</a></p>" +
      "</aside></div></div>" +

      (related.length
        ? '<section class="section" style="padding-top:12px"><div class="wrap">' +
          '<div class="section-head"><div><h2>More ' + esc(listing.category).toLowerCase() + "</h2></div>" +
          '<a class="link" href="marketplace.html?category=' + encodeURIComponent(listing.category) +
          '">See all ' + icon("arrow") + "</a></div>" +
          '<div class="listing-grid">' + related.map(listingCard).join("") + "</div></div></section>"
        : "");

    const main = $("#gallery-main-img");
    const angle = $("#gallery-angle");
    $$(".gallery-thumbs button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".gallery-thumbs button").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        if (angle) angle.textContent = btn.dataset.angle + " VIEW";
        if (main) {
          main.style.filter =
            btn.dataset.angle === "CONNECTORS"
              ? "saturate(1.15) brightness(1.05)"
              : btn.dataset.angle === "MARKINGS"
              ? "contrast(1.1) brightness(0.96)"
              : btn.dataset.angle === "DIAGNOSTIC"
              ? "saturate(0.8) brightness(1.08)"
              : "none";
        }
      });
    });
  }

  /* ----------------------------------------------------------------------
     Checkout
     ---------------------------------------------------------------------- */
  let co = null;

  const courierOf = () =>
    COURIERS.find((c) => c.id === (co && co.courierId)) || COURIERS[0];

  function checkoutTotals(listing) {
    const courier = courierOf();
    const subtotal = listing.price;
    const shipping = courier.fee;
    return {
      subtotal: subtotal,
      shipping: shipping,
      total: round2(subtotal + shipping),
      commission: commissionFor(subtotal),
      reserve: reserveFor(subtotal),
      courier: courier
    };
  }

  function renderCheckout() {
    if (!state.profile.signedIn) {
      renderSignInGate();
      return;
    }
    const listing = state.listings.find((l) => l.id === PARAMS.get("id"));
    if (!listing) {
      notFound("Choose a part first", "Checkout needs a listing. Browse the marketplace and pick a part.");
      return;
    }
    const volume = monthlyVolume();
    const totals = checkoutTotals(listing);
    const projected = round2(volume + totals.total);
    if (projected >= POLICY.kycMonthlyVolume && !state.profile.buyerKyc) {
      renderKycGate(volume, projected);
      return;
    }
    if (!co || co.listingId !== listing.id) {
      co = {
        listingId: listing.id,
        step: 1,
        courierId: "jnt",
        method: "GCash",
        checks: [false, false, false, false, false],
        ack: false,
        paying: false,
        address: Object.assign({}, DEMO_ADDRESS, {
          recipient: state.profile.name,
          phone: state.profile.phone,
          city: state.profile.city || DEMO_ADDRESS.city
        })
      };
    }
    renderCheckoutShell(listing);
  }

  function renderKycGate(volume, projected) {
    $("#page").innerHTML =
      '<div class="wrap" style="padding:56px 0 80px">' +
      '<div class="gate"><div class="ico">' + icon("shield") + "</div>" +
      "<h2>Identity verification required</h2>" +
      "<p>Your paid volume this month is <b>" + peso(volume) + "</b>. This order would bring you to <b>" +
      peso(projected) + "</b>, at or above the " + peso(POLICY.kycMonthlyVolume) +
      " threshold. Complete a one-step demo KYC to continue checkout. Existing orders, returns, and DOA claims are unaffected.</p>" +
      '<button class="btn btn-primary btn-lg" type="button" data-action="verify" data-field="buyerKyc">Complete demo KYC</button>' +
      '<div style="margin-top:16px"><a class="link" href="orders.html">View my orders ' + icon("arrow") + "</a></div>" +
      "</div></div>";
  }

  function captureDelivery() {
    const get = (sel) => ($(sel) ? $(sel).value.trim() : "");
    if (!$("#d-recipient")) return;
    co.address = {
      recipient: get("#d-recipient"),
      phone: get("#d-phone"),
      region: get("#d-region"),
      city: get("#d-city"),
      barangay: get("#d-barangay"),
      landmark: get("#d-landmark"),
      postal: get("#d-postal")
    };
  }

  function checkoutChecklist(listing) {
    const totals = checkoutTotals(listing);
    return [
      {
        title: "Compatibility checked",
        detail:
          "Fits " + listing.device + " (" + listing.alias + ") — " +
          (listing.pass ? "verified fit" : "tagged fit, confirm your revision")
      },
      {
        title: "Component condition reviewed",
        detail:
          "Grade " + listing.grade + " · " + listing.type +
          ((listing.notes || []).length ? " · " + listing.notes[0] : "")
      },
      {
        title: "Seller verification checked",
        detail:
          tierOf(listing.seller) + " · ID verified · ★" + Number(listing.seller.rating).toFixed(1) +
          " · " + listing.seller.orders + " orders"
      },
      {
        title: "Transaction details reviewed",
        detail:
          peso(listing.price) + " + " + peso(totals.shipping) + " shipping · held by licensed PSP · 7-day DOA"
      },
      {
        title: "Delivery information confirmed",
        detail:
          co.address.city + " · " + totals.courier.name + " · " + totals.courier.eta
      }
    ];
  }

  function summaryHtml(listing) {
    const totals = checkoutTotals(listing);
    return (
      '<aside class="card summary"><div class="card-head"><h3>Order summary</h3>' +
      '<span class="badge badge-verified">' + icon("lock") + " Escrow</span></div>" +
      '<div class="card-body">' +
      '<div class="summary-item"><img src="' + listing.image + '" alt="">' +
      "<div><b>" + esc(listing.title) + "</b><span>" + esc(listing.seller.name) + " · " +
      esc(listing.shipsFrom) + "</span></div></div>" +
      '<div class="summary-lines">' +
      '<div class="line"><span>Item</span><span>' + peso(totals.subtotal) + "</span></div>" +
      '<div class="line"><span>' + esc(totals.courier.name) + " (" + esc(totals.courier.eta) + ")</span><span>" +
      peso(totals.shipping) + "</span></div>" +
      '<div class="line"><span>Buyer platform fee</span><span>' + peso(0) + "</span></div>" +
      '<div class="line total"><span>Total held in escrow</span><span>' + peso(totals.total) + "</span></div>" +
      "</div>" +
      '<div class="note note-teal" style="margin-top:16px;font-size:12px">' + icon("shield") +
      " Released only when you validate the part, or automatically 72 hours after delivery.</div>" +
      '<hr class="divider">' +
      '<div class="summary-lines small muted">' +
      '<div class="line"><span>Seller commission (8%, ₱20 min)</span><span>' + peso(totals.commission) + "</span></div>" +
      '<div class="line"><span>Seller reserve (10%, 14 days)</span><span>' + peso(totals.reserve) + "</span></div>" +
      "</div>" +
      '<p class="small muted" style="margin-top:8px">Deducted from the seller payout — not charged to you.</p>' +
      '<div class="note" style="margin-top:14px;font-size:12px">' + icon("alert") +
      " 7-day DOA cover starts on delivery. Prepaid return labels are platform-generated.</div>" +
      "</div></aside>"
    );
  }

  function stepperHtml(step) {
    return (
      '<div class="stepper">' +
      '<div class="step ' + (step === 1 ? "is-active" : "is-done") + '"><span class="n">' +
      (step > 1 ? "✓" : "1") + '</span><span>Delivery</span></div>' +
      '<div class="step-line"></div>' +
      '<div class="step ' + (step === 2 ? "is-active" : step > 2 ? "is-done" : "") + '"><span class="n">' +
      (step > 2 ? "✓" : "2") + '</span><span>Review</span></div>' +
      '<div class="step-line"></div>' +
      '<div class="step ' + (step === 3 ? "is-active" : "") + '"><span class="n">3</span><span>Payment</span></div>' +
      "</div>"
    );
  }

  function renderCheckoutShell(listing) {
    const totals = checkoutTotals(listing);
    let content = "";

    if (co.paying) {
      content =
        '<div class="checkout-card"><div class="processing"><div class="spinner"></div>' +
        "<b>Contacting the licensed PSP…</b>" +
        '<p class="small muted">Creating an escrow intent and confirming the hold. Demo only — no money moves.</p>' +
        "</div></div>";
    } else if (co.step === 1) {
      content =
        '<form class="checkout-card" id="delivery-form">' +
        "<h2>Delivery details</h2>" +
        '<p class="sub">Where should the seller ship the part? This address is used for the return label too.</p>' +
        '<div class="form-grid">' +
        '<div class="field"><label for="d-recipient">Recipient</label><input class="input" id="d-recipient" required value="' +
        esc(co.address.recipient) + '"></div>' +
        '<div class="field"><label for="d-phone">Mobile</label><input class="input" id="d-phone" required value="' +
        esc(co.address.phone) + '"></div>' +
        '<div class="field"><label for="d-region">Region</label><input class="input" id="d-region" value="' +
        esc(co.address.region) + '"></div>' +
        '<div class="field"><label for="d-city">City / municipality</label><input class="input" id="d-city" required value="' +
        esc(co.address.city) + '"></div>' +
        '<div class="field"><label for="d-barangay">Barangay</label><input class="input" id="d-barangay" value="' +
        esc(co.address.barangay) + '"></div>' +
        '<div class="field"><label for="d-postal">Postal code</label><input class="input" id="d-postal" value="' +
        esc(co.address.postal) + '"></div>' +
        '<div class="field span-2"><label for="d-landmark">Landmark / unit</label><input class="input" id="d-landmark" value="' +
        esc(co.address.landmark) + '"></div>' +
        "</div>" +
        "<h3 style=\"font-size:14px;margin:24px 0 10px\">Courier</h3>" +
        '<div class="stack">' +
        COURIERS.map(function (c) {
          return (
            '<label class="radio-card"><input type="radio" name="courier" value="' + c.id + '"' +
            (co.courierId === c.id ? " checked" : "") + ">" +
            "<span style=\"flex:1\"><b style=\"font-size:13.5px\">" + c.name + "</b>" +
            '<span class="small muted" style="display:block">' + c.eta + " · tracked · escrow-protected</span></span>" +
            '<b style="font-size:13.5px">' + peso(c.fee) + "</b></label>"
          );
        }).join("") +
        "</div>" +
        '<div class="row" style="justify-content:space-between;margin-top:22px">' +
        '<a class="btn btn-ghost" href="listing.html?id=' + listing.id + '">Back to listing</a>' +
        '<button class="btn btn-primary" type="submit">Continue to review ' + icon("arrow") + "</button>" +
        "</div></form>";
    } else if (co.step === 2) {
      const items = checkoutChecklist(listing);
      content =
        '<div class="checkout-card">' +
        "<h2>Review &amp; Before You Buy</h2>" +
        '<p class="sub">Five checks protect both sides. Payment unlocks at 5/5.</p>' +
        '<div class="spread" style="margin-bottom:10px"><span class="small muted">Checklist</span>' +
        '<span class="check-counter" id="check-counter">0 / 5</span></div>' +
        '<div class="checklist" id="checklist">' +
        items.map(function (item, i) {
          return (
            '<label class="check-item"><input type="checkbox" data-check="' + i + '"' +
            (co.checks[i] ? " checked" : "") + ">" +
            "<span><b>" + (i + 1) + ". " + esc(item.title) + "</b>" +
            "<span>" + esc(item.detail) + "</span></span></label>"
          );
        }).join("") +
        "</div>" +
        '<label class="check" style="margin-top:16px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--surface)">' +
        '<input type="checkbox" id="co-ack"' + (co.ack ? " checked" : "") + ">" +
        "<span>I confirm I reviewed the five checks above and the listing snapshot shown at checkout.</span></label>" +
        '<div class="row" style="justify-content:space-between;margin-top:20px">' +
        '<button class="btn btn-ghost" type="button" data-nav="back">Back</button>' +
        '<button class="btn btn-primary" type="button" id="to-payment">Continue to payment ' + icon("arrow") + "</button>" +
        "</div></div>";
    } else {
      content =
        '<div class="checkout-card">' +
        "<h2>Payment</h2>" +
        '<p class="sub">Demo checkout — the licensed PSP is simulated locally. No real money moves.</p>' +
        '<div class="pay-methods">' +
        ["GCash", "Maya", "Card"].map(function (method) {
          return (
            '<label class="radio-card"><input type="radio" name="paymethod" value="' + method + '"' +
            (co.method === method ? " checked" : "") + ">" +
            '<span style="flex:1"><b style="font-size:13.5px">' + method + "</b>" +
            '<span class="small muted" style="display:block">' +
            (method === "Card" ? "Visa / Mastercard" : "Instantly confirmed in the demo") +
            "</span></span>" + icon("card") + "</label>"
          );
        }).join("") +
        "</div>" +
        '<div class="note note-teal" style="margin-top:16px;font-size:12.5px">' + icon("shield") +
        "<span><b>Escrow consent.</b> Your payment is held in escrow by a BSP-licensed payment provider — not by Silicon Trading. Funds are released after you validate the part, or automatically <b>72 hours after delivery</b>. A <b>7-day DOA guarantee</b> applies to every component.</span></div>" +
        '<div class="row" style="justify-content:space-between;margin-top:22px">' +
        '<button class="btn btn-ghost" type="button" data-nav="back">Back</button>' +
        '<button class="btn btn-primary btn-lg" type="button" id="pay-btn">Pay ' + peso(totals.total) + " with escrow</button>" +
        "</div>" +
        '<p class="pay-note">' + icon("lock") +
        "No COD. The redirect return is treated as UX only — in production the signed PSP webhook is the sole authority that moves the order to paid.</p>" +
        "</div>";
    }

    $("#page").innerHTML =
      '<div class="wrap"><div class="page-head"><h1>Secure checkout</h1>' +
      '<p>Escrow-protected payment. 72-hour validation. 7-day DOA cover on every component.</p></div>' +
      '<div class="checkout-layout"><div>' + stepperHtml(co.step) + content + "</div>" +
      summaryHtml(listing) + "</div></div>";

    if (co.paying) return;

    if (co.step === 1) {
      $("#delivery-form").addEventListener("submit", function (e) {
        e.preventDefault();
        captureDelivery();
        if (!co.address.recipient || !co.address.phone || !co.address.city) {
          toast("Add a recipient, mobile number, and city.", "error");
          return;
        }
        co.step = 2;
        renderCheckoutShell(listing);
        scrollTop();
      });
      $$('input[name="courier"]').forEach(function (radio) {
        radio.addEventListener("change", function () {
          captureDelivery();
          co.courierId = radio.value;
          renderCheckoutShell(listing);
        });
      });
    }

    if (co.step === 2) {
      const updateChecks = function () {
        $$('input[data-check]').forEach(function (box) {
          co.checks[Number(box.dataset.check)] = box.checked;
        });
        const n = co.checks.filter(Boolean).length;
        const counter = $("#check-counter");
        if (counter) counter.textContent = n + " / 5";
        const btn = $("#to-payment");
        if (btn) btn.disabled = !(n === 5 && co.ack);
      };
      $$('input[data-check]').forEach(function (box) {
        box.addEventListener("change", updateChecks);
      });
      $("#co-ack").addEventListener("change", function (e) {
        co.ack = e.target.checked;
        updateChecks();
      });
      $("#to-payment").addEventListener("click", function () {
        if (!(co.checks.filter(Boolean).length === 5 && co.ack)) return;
        co.step = 3;
        renderCheckoutShell(listing);
        scrollTop();
      });
      $$('[data-nav="back"]').forEach(function (btn) {
        btn.addEventListener("click", function () {
          co.step = 1;
          renderCheckoutShell(listing);
          scrollTop();
        });
      });
      updateChecks();
    }

    if (co.step === 3) {
      $$('input[name="paymethod"]').forEach(function (radio) {
        radio.addEventListener("change", function () {
          co.method = radio.value;
        });
      });
      $$('[data-nav="back"]').forEach(function (btn) {
        btn.addEventListener("click", function () {
          co.step = 2;
          renderCheckoutShell(listing);
          scrollTop();
        });
      });
      const payBtn = $("#pay-btn");
      if (payBtn) {
        payBtn.addEventListener("click", function () {
          if (co.paying) return;
          co.paying = true;
          renderCheckoutShell(listing);
          setTimeout(function () {
            const order = createOrder(listing);
            co = null;
            location.href = "orders.html?order=" + order.id + "&new=1";
          }, 1150);
        });
      }
    }
  }

  function createOrder(listing) {
    const now = Date.now();
    const totals = checkoutTotals(listing);
    const id = "ST-2026-" + String(Math.floor(100000 + Math.random() * 899999));
    const distributor = totals.commission;
    const order = {
      id: id,
      listingId: listing.id,
      title: listing.title,
      image: listing.image,
      seller: listing.seller.name,
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      total: totals.total,
      commission: distributor,
      commissionFloorApplied: distributor === POLICY.commissionFloor,
      reserve: totals.reserve,
      status: "PAID",
      escrow: "HELD",
      paymentMethod: co.method,
      psp: "Xendit (demo)",
      pspEscrowId: "esc_" + Math.random().toString(36).slice(2, 10),
      createdAt: now,
      courier: totals.courier.name,
      tracking: null,
      deliveredAt: null,
      validationEndsAt: null,
      doaEndsAt: null,
      extensionUsed: false,
      completedAt: null,
      address: Object.assign({}, co.address),
      acknowledged: true,
      checks: co.checks.slice(),
      doaStatus: "NONE",
      returnLabel: null,
      timeline: [
        { at: now, label: "Order placed", detail: "Payment authorized through the licensed PSP" },
        { at: now, label: "Escrow held", detail: peso(totals.total) + " held until you validate the part" }
      ]
    };
    state.orders.unshift(order);
    persist("orders");
    return order;
  }

  /* ----------------------------------------------------------------------
     Orders
     ---------------------------------------------------------------------- */
  let ordersTab = "all";

  const ORDER_TABS = [
    { id: "all", label: "All orders" },
    { id: "transit", label: "In transit" },
    { id: "validate", label: "To validate" },
    { id: "completed", label: "Completed" },
    { id: "claims", label: "Claims" }
  ];

  function orderById(id) {
    return state.orders.find((o) => o.id === id);
  }

  function saveOrder(order) {
    persist("orders");
  }

  function pushTimeline(order, label, detail) {
    order.timeline.push({ at: Date.now(), label: label, detail: detail });
  }

  function tabMatch(order, tab) {
    if (tab === "transit") return order.status === "PAID" || order.status === "SHIPPED";
    if (tab === "validate") return order.status === "DELIVERED";
    if (tab === "completed") return order.status === "COMPLETED";
    if (tab === "claims")
      return order.status === "DISPUTED" || order.status === "DOA_CLAIM" || order.status === "REFUNDED";
    return true;
  }

  function renderOrders() {
    if (!state.profile.signedIn) {
      renderSignInGate();
      return;
    }
    if (PARAMS.get("order")) {
      renderOrderDetail(PARAMS.get("order"));
      return;
    }

    const list = state.orders.filter((o) => tabMatch(o, ordersTab));
    const tabButtons = ORDER_TABS.map(function (tab) {
      const n = state.orders.filter((o) => tabMatch(o, tab.id)).length;
      return (
        '<button type="button" data-tab="' + tab.id + '" class="' +
        (ordersTab === tab.id ? "is-active" : "") + '">' + tab.label +
        ' <span class="muted">' + n + "</span></button>"
      );
    }).join("");

    const rows = list
      .map(function (o) {
        return (
          '<a class="order-row" href="orders.html?order=' + o.id + '">' +
          '<img class="order-thumb" src="' + o.image + '" alt="">' +
          '<div class="order-main"><b>' + esc(o.title) + "</b>" +
          '<div class="meta"><span>' + o.id + "</span><span>" + esc(o.seller) +
          "</span><span>" + fmtDate(o.createdAt) + "</span></div>" +
          '<div style="margin-top:7px">' + statusBadge(o.status) + "</div></div>" +
          '<div class="order-side"><div class="price">' + peso(o.total) + "</div>" +
          '<div class="small muted">' + esc(o.escrow === "HELD" ? "In escrow" : o.escrow.toLowerCase()) +
          ' · ' + icon("chevron") + "</div></div></a>"
        );
      })
      .join("");

    $("#page").innerHTML =
      '<div class="wrap"><div class="page-head"><div class="spread">' +
      "<div><h1>Orders</h1>" +
      "<p>Every order is escrow-protected. Validate within 72 hours of delivery, and keep 7-day DOA cover after release.</p></div>" +
      '<a class="btn btn-ghost" href="marketplace.html">' + icon("search") + "Browse parts</a></div></div>" +
      '<div class="tabs" id="order-tabs">' + tabButtons + "</div>" +
      '<div class="order-list">' +
      (list.length
        ? rows
        : emptyState(
            "No orders in this view",
            "Orders you place will appear here with their escrow state and validation countdown.",
            '<a class="btn btn-primary" href="marketplace.html">Find a part</a>'
          )) +
      "</div>" +
      '<div class="note" style="margin-top:20px">' + icon("alert") +
      " Demo build: use the order detail page to move an order through shipment, delivery, validation, dispute, and the 7-day DOA flow.</div>" +
      "</div>";

    $$("#order-tabs button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        ordersTab = btn.dataset.tab;
        renderOrders();
      });
    });
  }

  function countdownBlock(order) {
    const now = Date.now();
    if (order.status === "DELIVERED" && order.validationEndsAt) {
      return (
        '<div class="countdown-box">' + icon("clock") +
        '<div><div class="big" data-countdown="' + order.validationEndsAt + '" data-format="clock">' +
        clockLeft(order.validationEndsAt - now) + "</div>" +
        '<div class="lbl">VALIDATION WINDOW · ESCROW AUTO-RELEASES AT ZERO</div></div></div>'
      );
    }
    if (order.doaEndsAt && (order.status === "COMPLETED" || order.status === "DOA_CLAIM") && now < order.doaEndsAt) {
      return (
        '<div class="countdown-box is-doa">' + icon("shield") +
        '<div><div class="big" data-countdown="' + order.doaEndsAt + '" data-format="days">' +
        daysLeft(order.doaEndsAt - now) + "</div>" +
        '<div class="lbl">7-DAY DOA COVER REMAINING</div></div></div>'
      );
    }
    return "";
  }

  function timelineHtml(order) {
    const terminal = ["COMPLETED", "REFUNDED", "CANCELLED"].indexOf(order.status) !== -1;
    return (
      '<div class="timeline">' +
      order.timeline
        .map(function (item, i) {
          const last = i === order.timeline.length - 1;
          return (
            '<div class="tl-item ' + (last && !terminal ? "is-now" : "is-done") + '"><span class="tl-dot"></span>' +
            "<div><b>" + esc(item.label) + "</b><span>" + esc(item.detail) + "</span>" +
            "<time>" + fmtDateTime(item.at) + "</time></div></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function demoControlsHtml(order) {
    const buttons = [];
    const add = (action, label, style) =>
      buttons.push(
        '<button class="btn btn-sm ' + (style || "btn-ghost") + '" type="button" data-action="order" data-op="' +
        action + '" data-id="' + order.id + '">' + label + "</button>"
      );

    if (order.status === "PAID") {
      add("ship", "Seller ships", "btn-primary");
      add("cancel", "Cancel & refund", "btn-danger");
    }
    if (order.status === "SHIPPED") add("deliver", "Mark delivered", "btn-primary");
    if (order.status === "DELIVERED") {
      add("release", "Release escrow", "btn-primary");
      add("auto", "Simulate 72h auto-release");
      if (!order.extensionUsed) add("extend", "Extend +24h");
      add("dispute", "Raise dispute", "btn-danger");
    }
    if (order.status === "COMPLETED" && order.doaEndsAt && Date.now() < order.doaEndsAt) {
      add("doa", "Claim DOA", "btn-copper");
    }
    if (order.status === "DOA_CLAIM" || order.status === "DISPUTED") {
      add("resolve-refund", "Resolve · refund buyer", "btn-danger");
      add("resolve-release", "Resolve · release to seller");
      if (order.returnLabel && !order.returnLabel.scanned) add("return-scan", "Simulate return scan");
    }

    if (!buttons.length) return "";

    return (
      '<div class="demo-controls"><h4>Demo controls</h4><div class="btns">' +
      buttons.join("") +
      "</div></div>"
    );
  }

  function returnLabelHtml(order) {
    if (!order.returnLabel) return "";
    const label = order.returnLabel;
    return (
      '<div class="return-label"><h4>' + icon("truck") + "Platform-generated return label</h4>" +
      '<div class="label-code"><span>' + esc(label.code) + '</span><div class="barcode"></div>' +
      '<button class="btn btn-sm btn-ghost" type="button" data-action="copy-label">Copy</button></div>' +
      '<div class="spread small" style="color:#8c5128"><span>' + esc(label.courier) +
      " · prepaid by the platform</span><span>" +
      (label.scanned ? "Scanned by courier" : "Awaiting drop-off") + "</span></div>" +
      '<p class="small" style="color:#9a6a44;margin-top:8px">Print and attach. The refund is processed after the first carrier scan.</p>' +
      "</div>"
    );
  }

  function renderOrderDetail(id) {
    const order = orderById(id);
    if (!order) {
      notFound("Order not found", "That order ID is not in this demo store. Check your order list.");
      return;
    }
    const listing = state.listings.find((l) => l.id === order.listingId);
    const seller = listing ? listing.seller : null;
    const canValidate = order.status === "DELIVERED";
    const claimed = order.status === "DOA_CLAIM" || order.status === "DISPUTED";

    $("#page").innerHTML =
      '<div class="wrap"><nav class="breadcrumb"><a href="orders.html">Orders</a>' + icon("chevron") +
      "<span>" + order.id + "</span></nav>" +
      '<div class="order-detail-head"><div><h1>' + order.id + "</h1>" +
      '<div class="meta">' + statusBadge(order.status) + escrowPill(order) +
      "<span>Placed " + fmtDate(order.createdAt) + "</span></div></div>" +
      '<div class="row"><a class="btn btn-ghost btn-sm" href="support.html?order=' + order.id +
      '">' + icon("phone") + 'Get help</a><a class="btn btn-ghost btn-sm" href="listing.html?id=' +
      order.listingId + '">View listing</a></div></div>' +
      '<div class="split" style="padding-bottom:56px">' +
      "<div>" +
      (countdownBlock(order)
        ? '<div style="margin-bottom:18px">' + countdownBlock(order) + "</div>"
        : "") +
      '<div class="card"><div class="card-head"><h3>Item</h3>' + statusBadge(order.status) + "</div>" +
      '<div class="card-body"><div class="summary-item" style="margin:0;padding:0;border:0">' +
      '<img src="' + order.image + '" alt="">' +
      "<div><b>" + esc(order.title) + "</b><span>" + esc(order.seller) + " · " +
      "Qty 1 · " + esc(order.courier) + "</span></div></div></div></div>" +

      '<div class="card" style="margin-top:18px"><div class="card-head"><h3>Escrow timeline</h3></div>' +
      '<div class="card-body">' + timelineHtml(order) + "</div></div>" +

      (order.returnLabel
        ? '<div class="card" style="margin-top:18px"><div class="card-head"><h3>Return</h3></div>' +
          '<div class="card-body">' + returnLabelHtml(order) + "</div></div>"
        : "") +

      (canValidate
        ? '<div class="note note-amber" style="margin-top:18px">' + icon("clock") +
          " <b>Validate the part.</b> Boot it, test every documented function, and release escrow when it matches. If it does not, raise a dispute before the countdown ends — escrow will freeze.</div>"
        : "") +

      (claimed
        ? '<div class="note note-danger" style="margin-top:18px">' + icon("alert") +
          " <b>Escrow frozen.</b> Support reviews the listing snapshot, diagnostics, and your evidence. A ruling releases or refunds the full amount — the platform never keeps disputed funds.</div>"
        : "") +
      "</div>" +

      '<aside class="stack">' +
      demoControlsHtml(order) +
      '<div class="card"><div class="card-head"><h3>Payment</h3>' +
      '<span class="badge badge-neutral">' + esc(order.psp) + "</span></div>" +
      '<div class="card-body"><div class="summary-lines">' +
      '<div class="line"><span>Item</span><span>' + peso(order.subtotal) + "</span></div>" +
      '<div class="line"><span>' + esc(order.courier) + " shipping</span><span>" + peso(order.shipping) + "</span></div>" +
      '<div class="line total"><span>Total</span><span>' + peso(order.total) + "</span></div></div>" +
      '<dl class="kv" style="margin-top:16px;grid-template-columns:110px 1fr">' +
      "<dt>Method</dt><dd>" + esc(order.paymentMethod) + "</dd>" +
      "<dt>Escrow ID</dt><dd><span class=\"upi\">" + esc(order.pspEscrowId) + "</span></dd>" +
      "<dt>Seller fee</dt><dd>" + peso(order.commission) +
      (order.commissionFloorApplied ? " (₱20 floor)" : " (8%)") + "</dd>" +
      "<dt>Seller reserve</dt><dd>" + peso(order.reserve) + " · 14 days</dd>" +
      "</dl></div></div>" +

      '<div class="card"><div class="card-head"><h3>Delivery</h3></div><div class="card-body">' +
      '<dl class="kv" style="grid-template-columns:96px 1fr">' +
      "<dt>Recipient</dt><dd>" + esc(order.address.recipient) + "</dd>" +
      "<dt>Mobile</dt><dd>" + esc(order.address.phone) + "</dd>" +
      "<dt>Address</dt><dd>" + esc(order.address.landmark) + ", " + esc(order.address.barangay) +
      ", " + esc(order.address.city) + " " + esc(order.address.postal) + "</dd>" +
      "<dt>Courier</dt><dd>" + esc(order.courier) + "</dd>" +
      "<dt>Tracking</dt><dd>" + (order.tracking ? '<span class="upi">' + esc(order.tracking) + "</span>" : "Not yet assigned") + "</dd>" +
      "</dl></div></div>" +

      (seller
        ? '<div class="card"><div class="card-head"><h3>Seller</h3></div><div class="card-body">' +
          '<div class="seller-mini" style="margin:0"><span class="seller-avatar">' + initials(seller.name) + "</span>" +
          "<div><b>" + esc(seller.name) + "</b><span>⭐ " + Number(seller.rating).toFixed(1) + " · " +
          seller.orders + " orders · " + esc(seller.city) + "</span></div>" +
          '<span class="badge ' + (seller.pass ? "badge-pass" : "badge-verified") + '">' + esc(tierOf(seller)) +
          "</span></div></div></div>"
        : "") +
      "</aside></div></div>";
  }

  const ORDER_OPS = {
    ship: function (order) {
      order.status = "SHIPPED";
      order.tracking = "JT" + Math.floor(1000000000 + Math.random() * 8999999999);
      pushTimeline(order, "Picked up by courier", order.courier + " · " + order.tracking);
      toast("Seller marked the order shipped.", "success");
    },
    deliver: function (order) {
      const now = Date.now();
      order.status = "DELIVERED";
      order.deliveredAt = now;
      order.validationEndsAt = now + POLICY.autoReleaseHours * 3600e3;
      order.doaEndsAt = now + POLICY.doaDays * 864e5;
      pushTimeline(order, "Delivered", "72-hour validation window started · 7-day DOA cover active");
      toast("Delivered — 72 hours to validate.", "success");
    },
    release: function (order) {
      order.status = "COMPLETED";
      order.escrow = "RELEASED";
      order.completedAt = Date.now();
      pushTimeline(order, "Escrow released", "Buyer validated the part · seller payable queued");
      toast("Escrow released to the seller.", "success");
    },
    auto: function (order) {
      order.status = "COMPLETED";
      order.escrow = "RELEASED";
      order.completedAt = Date.now();
      pushTimeline(order, "Escrow released automatically", "72-hour validation window expired with no dispute");
      toast("Simulated auto-release completed.", "success");
    },
    extend: function (order) {
      order.extensionUsed = true;
      order.validationEndsAt = order.validationEndsAt + 24 * 3600e3;
      pushTimeline(order, "Validation extended", "One-time +24 hours added to the window");
      toast("Validation window extended by 24 hours.", "success");
    },
    dispute: function (order) {
      order.status = "DISPUTED";
      order.escrow = "FROZEN";
      pushTimeline(order, "Dispute opened", "Escrow frozen · support evidence review started");
      createTicket({
        subject: "Dispute for " + order.id + " — " + order.title,
        category: "Dispute",
        orderId: order.id,
        message:
          "Buyer opened a dispute before the validation window closed. Escrow is frozen pending evidence review."
      });
      toast("Dispute opened — escrow frozen.", "error");
    },
    doa: function (order) {
      order.status = "DOA_CLAIM";
      order.escrow = "FROZEN";
      order.doaStatus = "OPEN";
      order.returnLabel = {
        code: "RET-" + order.id.slice(-6) + "-" + Math.random().toString(36).slice(2, 5).toUpperCase(),
        courier: order.courier,
        createdAt: Date.now(),
        scanned: false
      };
      pushTimeline(order, "DOA claim opened", "7-day cover invoked · prepaid return label generated");
      createTicket({
        subject: "DOA claim for " + order.id + " — " + order.title,
        category: "DOA",
        orderId: order.id,
        message:
          "Dead-on-arrival claim filed within the 7-day cover. Prepaid return label " +
          order.returnLabel.code + " generated."
      });
      toast("DOA claim opened — return label ready.", "success");
    },
    "return-scan": function (order) {
      if (!order.returnLabel) return;
      order.returnLabel.scanned = true;
      pushTimeline(order, "Return scanned", order.returnLabel.courier + " accepted the prepaid parcel");
      toast("Return scan recorded.", "success");
    },
    "resolve-refund": function (order) {
      if (order.doaStatus === "OPEN" && order.returnLabel && !order.returnLabel.scanned) {
        toast("Simulate the return scan before issuing the refund.", "error");
        return;
      }
      order.status = "REFUNDED";
      order.escrow = order.doaStatus === "OPEN" ? "DOA_REFUNDED" : "REFUNDED";
      if (order.doaStatus === "OPEN") order.doaStatus = "UPHELD";
      order.completedAt = Date.now();
      pushTimeline(order, "Refund issued", "Full amount returned to the buyer's original payment method");
      toast("Demo refund issued to the buyer.", "success");
    },
    "resolve-release": function (order) {
      order.status = "COMPLETED";
      order.escrow = "RELEASED";
      if (order.doaStatus === "OPEN") order.doaStatus = "REJECTED";
      order.completedAt = Date.now();
      pushTimeline(order, "Claim closed · escrow released", "Evidence supported the listing snapshot");
      toast("Claim closed — escrow released.", "success");
    },
    cancel: function (order) {
      order.status = "CANCELLED";
      order.escrow = "REFUNDED";
      order.completedAt = Date.now();
      pushTimeline(order, "Order cancelled", "Payment voided before shipment · full refund");
      toast("Order cancelled and refunded.", "success");
    }
  };

  function runOrderOp(op, id, after) {
    const order = orderById(id);
    const fn = ORDER_OPS[op];
    if (!order || !fn) return;
    fn(order);
    saveOrder(order);
    if (typeof after === "function") after();
    else renderOrderDetail(id);
  }

  function setListingStatus(id, status) {
    const listing = state.listings.find((l) => l.id === id);
    if (!listing) return;
    listing.status = status;
    persist("listings");
    const labels = {
      ACTIVE: "Listing is live.",
      PAUSED: "Listing paused and hidden from the marketplace.",
      PENDING: "Listing sent for platform review.",
      REMOVED: "Listing removed from the marketplace."
    };
    toast(labels[status] || "Listing updated.", status === "REMOVED" ? "error" : "success");
  }

  function updateSeller(id, patch) {
    const seller = sellerById(id);
    if (!seller) return;
    Object.assign(seller, patch);
    persist("sellers");
  }

  /* ----------------------------------------------------------------------
     Sell
     ---------------------------------------------------------------------- */
  const EVIDENCE_ITEMS = [
    { key: "boot", label: "Boot video", hint: "Device powers on and reaches the home screen" },
    { key: "serial", label: "Serial / part-number macro", hint: "Marking matches the listing" },
    { key: "function", label: "Function matrix photos", hint: "Every documented function shown working" },
    { key: "diagnostic", label: "Diagnostic screen capture", hint: "Battery, charging, cameras, radios" },
    { key: "markings", label: "Board revision & markings", hint: "Revision and shield labels visible" }
  ];

  let sellForm = null;

  function sellingIdentity() {
    if (currentRole() === "seller") {
      const seller = sellerById(state.session.sellerId);
      if (seller) {
        return {
          name: seller.name,
          business: seller.name,
          city: seller.city,
          sellerKyc: seller.kyc === "VERIFIED",
          passPlan: seller.tier === "Pro Workshop" ? "PRO" : seller.tier === "Verified Pass" ? "SINGLE" : "NONE",
          tier: seller.tier
        };
      }
    }
    if (currentRole() === "admin") {
      return {
        name: PORTALS.admin.name,
        business: PORTALS.admin.name,
        city: "Manila",
        sellerKyc: true,
        passPlan: "PRO",
        tier: "Pro Workshop"
      };
    }
    return {
      name: state.profile.name,
      business: state.profile.business || state.profile.name,
      city: state.profile.city,
      sellerKyc: state.profile.sellerKyc,
      passPlan: state.profile.passPlan,
      tier: state.profile.passPlan === "PRO" ? "Pro Workshop" : state.profile.passPlan === "SINGLE" ? "Verified Pass" : "Verified Seller"
    };
  }

  function sellerStats() {
    const ident = sellingIdentity();
    const mine = state.listings.filter((l) => l.seller.name === ident.name);
    const held = state.orders.filter((o) => o.seller === ident.name && o.escrow === "HELD");
    return {
      listings: mine.length,
      held: held.reduce((s, o) => s + o.total, 0),
      reserve: held.reduce((s, o) => s + Number(o.reserve || 0), 0),
      pass: ident.passPlan
    };
  }

  function sellPayout(price) {
    const n = Math.max(0, Number(price) || 0);
    const commission = commissionFor(n);
    const reserve = reserveFor(n);
    return {
      commission: commission,
      reserve: reserve,
      payout: round2(Math.max(0, n - commission - reserve)),
      floor: commission === POLICY.commissionFloor && n * POLICY.commissionRate < POLICY.commissionFloor
    };
  }

  function renderSell() {
    if (currentRole() === "buyer") {
      $("#page").innerHTML =
        '<div class="wrap" style="padding:48px 0 80px"><div class="gate">' +
        '<div class="ico">' + icon("box") + "</div>" +
        "<h2>Seller access required</h2>" +
        "<p>Listing boards is available to seller and admin accounts. Sign in with the demo seller to publish stock, or keep browsing as a buyer.</p>" +
        '<div class="row" style="justify-content:center">' +
        '<a class="btn btn-primary btn-lg" href="login.html?role=seller">Sign in as seller</a>' +
        '<a class="btn btn-ghost" href="marketplace.html">Back to marketplace</a>' +
        "</div></div></div>";
      return;
    }
    const ident = sellingIdentity();
    if (!ident.sellerKyc) {
      $("#page").innerHTML =
        '<div class="wrap" style="padding:48px 0 80px"><div class="gate">' +
        '<div class="ico">' + icon("shield") + "</div>" +
        "<h2>Seller verification required</h2>" +
        "<p>Before your first listing goes live, complete the demo seller check: identity, address, and payout account. This is a local simulation — no documents leave your browser.</p>" +
        '<button class="btn btn-primary btn-lg" type="button" data-action="verify" data-field="sellerKyc">Complete demo seller verification</button>' +
        '<p class="small muted" style="margin-top:14px">You can browse and buy without this step.</p>' +
        "</div></div>";
      return;
    }

    const stats = sellerStats();
    const mine = state.listings.filter((l) => l.seller.name === ident.name);

    $("#page").innerHTML =
      '<div class="wrap"><div class="page-head"><div class="spread">' +
      "<div><h1>Sell a board</h1>" +
      "<p>Listing as <b>" + esc(ident.name) + "</b> · " + esc(ident.city) +
      ". List a part, upload the evidence pack, and get paid from licensed escrow after the buyer validates.</p></div>" +
      (currentRole() === "admin"
        ? '<a class="btn btn-ghost" href="admin-dashboard.html">' + icon("grid") + "Admin console</a>"
        : '<a class="btn btn-ghost" href="seller-dashboard.html">' + icon("grid") + "Seller dashboard</a>") +
      "</div></div>" +
      '<div class="stat-cards">' +
      '<div class="stat-card"><span>Active listings</span><b>' + stats.listings + "</b></div>" +
      '<div class="stat-card"><span>In escrow</span><b>' + peso0(stats.held) + "</b></div>" +
      '<div class="stat-card"><span>Reserve held</span><b>' + peso0(stats.reserve) + "</b></div>" +
      '<div class="stat-card"><span>Seller tier</span><b style="font-size:15px;padding-top:6px">' +
      (stats.pass === "PRO" ? "Pro Workshop" : stats.pass === "SINGLE" ? "Verified Pass" : "Verified Seller") +
      "</b></div></div>" +
      '<div class="sell-layout"><div>' +
      '<form class="card card-pad" id="sell-form" novalidate>' +
      "<h2 style=\"font-size:19px\">New listing</h2>" +
      '<p class="small muted" style="margin:4px 0 20px">Listing details are frozen at checkout, so buyers get exactly the snapshot you published.</p>' +
      '<div class="form-grid">' +
      '<div class="field span-2"><label for="s-title">Listing title</label>' +
      '<input class="input" id="s-title" required maxlength="80" placeholder="iPhone 13 Pro Logic Board — A2638"></div>' +
      '<div class="field"><label for="s-category">Category</label><select class="select" id="s-category">' +
      CATEGORIES.map((c) => '<option value="' + esc(c) + '">' + esc(c) + "</option>").join("") +
      "</select></div>" +
      '<div class="field"><label for="s-grade">Condition grade</label><select class="select" id="s-grade">' +
      ["A", "B", "C"].map((g) => '<option value="' + g + '">Grade ' + g + "</option>").join("") +
      "</select></div>" +
      '<div class="field"><label for="s-device">Device model</label><input class="input" id="s-device" required list="device-list" placeholder="iPhone 13 Pro">' +
      '<datalist id="device-list">' + DEVICES.map((d) => '<option value="' + esc(d) + '">').join("") + "</datalist></div>" +
      '<div class="field"><label for="s-alias">Model / alias</label><input class="input" id="s-alias" placeholder="A2638"></div>' +
      '<div class="field"><label for="s-part">Part number</label><input class="input" id="s-part" placeholder="820-02941"></div>' +
      '<div class="field"><label for="s-price">Price (₱)</label><input class="input" id="s-price" type="number" min="50" step="1" value="4850" required></div>' +
      '<div class="field"><label for="s-type">Condition type</label><select class="select" id="s-type">' +
      ["OEM Pull", "Used-Tested", "For Parts", "New"].map((t) => '<option value="' + esc(t) + '">' + esc(t) + "</option>").join("") +
      "</select></div>" +
      '<div class="field"><label for="s-stock">Stock on hand</label><input class="input" id="s-stock" type="number" min="1" max="50" value="1"></div>' +
      '<div class="field"><label for="s-ships-from">Ships from</label><input class="input" id="s-ships-from" value="' + esc(ident.city) + '"></div>' +
      '<div class="field"><label for="s-ships-in">Delivery estimate</label><input class="input" id="s-ships-in" value="2–4 days"></div>' +
      '<div class="field span-2"><label for="s-notes">Disclosure notes (comma separated)</label>' +
      '<input class="input" id="s-notes" placeholder="True Tone disabled, minor shield scuff"></div>' +
      '<div class="field span-2"><label for="s-desc">Description</label>' +
      '<textarea class="textarea" id="s-desc" placeholder="Where the part came from, what was tested, and anything a buyer should know before install."></textarea></div>' +
      "</div>" +

      '<h3 style="font-size:14px;margin:26px 0 4px">Evidence pack</h3>' +
      '<p class="small muted" style="margin-bottom:12px">All five items are required for the copper Verified Pass badge. Without them the listing goes live as a standard verified listing.</p>' +
      '<div class="stack" id="evidence-toggles">' +
      EVIDENCE_ITEMS.map(function (item) {
        return (
          '<label class="check evidence-toggle"><input type="checkbox" data-evidence="' + item.key + '"' +
          ((sellForm && sellForm.evidence[item.key]) ? " checked" : "") + ">" +
          "<span><b>" + item.label + "</b><span class=\"small muted\" style=\"display:block\">" + item.hint + "</span></span></label>"
        );
      }).join("") +
      "</div>" +
      '<label class="check" style="margin-top:16px"><input type="checkbox" id="s-ack">' +
      "<span>I confirm the evidence is real, the part is mine to sell, and the 7-day DOA guarantee applies.</span></label>" +
      '<div class="row" style="margin-top:22px"><button class="btn btn-primary btn-lg" type="submit" id="s-submit">Publish listing</button>' +
      '<span class="small muted">Seller pays 8% (₱20 min) + 10% reserve for 14 days.</span></div>' +
      "</form>" +

      (mine.length
        ? '<div class="card" style="margin-top:18px"><div class="card-head"><h3>Your listings</h3><span class="badge badge-neutral">' +
          mine.length + "</span></div><div class=\"card-body\"><div class=\"stack\">" +
          mine.map(function (l) {
            return (
              '<div class="spread" style="gap:12px"><div class="row" style="gap:10px">' +
              '<img src="' + l.image + '" alt="" style="width:42px;height:42px;object-fit:contain;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:3px">' +
              "<div><b style=\"font-size:13px\">" + esc(l.title) + "</b>" +
              '<div class="small muted">' + l.id + " · " + peso0(l.price) + " · " + l.stock + " in stock</div></div></div>" +
              '<div class="row" style="gap:6px">' +
              (l.pass ? '<span class="badge badge-pass">Pass</span>' : '<span class="badge badge-neutral">Standard</span>') +
              '<a class="btn btn-ghost btn-sm" href="listing.html?id=' + l.id + '">View</a></div></div>'
            );
          }).join("") +
          "</div></div></div>"
        : "") +
      "</div>" +

      '<aside class="payout-preview"><h3>Payout preview</h3>' +
      '<div class="payout-line"><span>Buyer pays</span><b id="p-gross">₱4,850.00</b></div>' +
      '<div class="payout-line"><span>Commission (8%, ₱20 min)</span><b id="p-commission">−₱388.00</b></div>' +
      '<div class="payout-line"><span>Reserve (10%, 14 days)</span><b id="p-reserve">−₱446.20</b></div>' +
      '<div class="payout-line total"><span>Payout on release</span><b id="p-payout">₱4,015.80</b></div>' +
      '<div class="foot">Commission is charged on the item price. Shipping is passed through at cost. The reserve is released 14 days after delivery, minus upheld claims.</div>' +
      '<div class="foot" id="p-note" style="color:#5ee0cd">Commission floor not applied at this price.</div>' +
      '<div class="foot" style="margin-top:10px">' + icon("shield") + " Paid from licensed escrow after the buyer validates, or 72h after delivery.</div>" +
      "</aside></div></div>";

    const priceInput = $("#s-price");
    const updatePayout = function () {
      const p = sellPayout(priceInput.value);
      $("#p-gross").textContent = peso(Number(priceInput.value) || 0);
      $("#p-commission").textContent = "−" + peso(p.commission);
      $("#p-reserve").textContent = "−" + peso(p.reserve);
      $("#p-payout").textContent = peso(p.payout);
      $("#p-note").textContent = p.floor
        ? "₱20 minimum commission applied at this price."
        : "Commission floor not applied at this price.";
    };
    priceInput.addEventListener("input", updatePayout);
    updatePayout();

    if (!sellForm) {
      sellForm = {
        evidence: { boot: false, serial: false, function: false, diagnostic: false, markings: false }
      };
    }
    $$("input[data-evidence]").forEach(function (box) {
      box.addEventListener("change", function () {
        sellForm.evidence[box.dataset.evidence] = box.checked;
      });
    });

    $("#sell-form").addEventListener("submit", function (e) {
      e.preventDefault();
      publishListing();
    });
  }

  function publishListing() {
    const value = (id) => ($(id) ? $(id).value.trim() : "");
    const price = Number(value("#s-price"));
    const title = value("#s-title");
    const device = value("#s-device");

    if (!title || !device) {
      toast("Add a title and device model.", "error");
      return;
    }
    if (!price || price < 50) {
      toast("Set a price of at least ₱50.", "error");
      return;
    }
    if (!$("#s-ack").checked) {
      toast("Confirm the evidence and DOA terms.", "error");
      return;
    }

    const category = value("#s-category");
    const ident = sellingIdentity();
    const evidenceOn = EVIDENCE_ITEMS.every((item) => sellForm.evidence[item.key]);
    const hasPass = evidenceOn && ident.passPlan !== "NONE";
    const notes = value("#s-notes")
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    const stock = Math.max(1, Number(value("#s-stock")) || 1);
    const nextNum =
      2000 +
      state.listings.filter((l) => String(l.id).indexOf("L-2") === 0).length +
      1;

    const listing = {
      id: "L-" + nextNum,
      title: title,
      category: category,
      device: device,
      alias: value("#s-alias") || "—",
      partNumber: value("#s-part") || "—",
      price: price,
      grade: value("#s-grade"),
      type: value("#s-type"),
      seller: {
        name: ident.name,
        city: ident.city || "Manila",
        rating: 5,
        orders: 0,
        verified: true,
        pass: hasPass,
        pro: ident.passPlan === "PRO",
        response: "1h",
        since: String(new Date().getFullYear())
      },
      image: IMG[category] || IMG.Motherboards,
      pass: hasPass,
      auditedAt: hasPass ? fmtDate(Date.now()) : null,
      evidence: hasPass
        ? EVIDENCE_ITEMS.map(function (item) {
            return { label: item.label, meta: "uploaded " + fmtDate(Date.now()) };
          })
        : null,
      notes: notes,
      description: value("#s-desc") || "No additional description supplied.",
      diagnostics: diag({ "Battery health": "—" }),
      compat: [device],
      water: false,
      stock: stock,
      shipsFrom: value("#s-ships-from") || "Manila",
      shipsIn: value("#s-ships-in") || "2–4 days",
      views: 0,
      mine: true,
      createdAt: Date.now()
    };

    state.listings.unshift(listing);
    persist("listings");
    toast("Listing published as " + listing.id + ".", "success");
    sellForm = null;
    setTimeout(function () {
      location.href = "listing.html?id=" + listing.id;
    }, 600);
  }

  /* ----------------------------------------------------------------------
     Verified Pass
     ---------------------------------------------------------------------- */
  const PLANS = {
    FREE: {
      id: "FREE",
      name: "Standard Seller",
      price: "Free",
      sub: "ID + payout verified. No evidence pack.",
      badge: "badge-neutral",
      listings: "Unlimited standard listings"
    },
    SINGLE: {
      id: "SINGLE",
      name: "Verified Pass",
      price: "₱49",
      sub: "one listing, 30 days",
      badge: "badge-pass",
      listings: "1 evidence-backed listing"
    },
    PRO: {
      id: "PRO",
      name: "Pro Workshop",
      price: "₱399",
      sub: "per month · cancel anytime",
      badge: "badge-pass",
      listings: "8 evidence-backed listings"
    }
  };

  const PASS_FEATURES = {
    FREE: [
      "Standard listing placement",
      "Escrow protection on every order",
      "72-hour validation window",
      "7-day DOA cover",
      "72-hour support SLA"
    ],
    SINGLE: [
      "Copper Pass badge on one listing",
      "Evidence pack: boot, serial, function, diagnostics, markings",
      "Higher marketplace placement",
      "72-hour validation window",
      "7-day DOA cover",
      "72-hour support SLA"
    ],
    PRO: [
      "Copper Pass badge on up to 8 listings",
      "Full evidence pack on every listing",
      "Top marketplace placement",
      "48-hour support SLA",
      "Priority dispute evidence review",
      "72-hour validation window · 7-day DOA cover"
    ]
  };

  function passStatusText() {
    const p = state.profile;
    if (p.passPlan === "PRO") return "Pro Workshop active · " + PLANS.PRO.listings;
    if (p.passPlan === "SINGLE") return "Verified Pass active · " + PLANS.SINGLE.listings;
    return "No active pass — standard verified seller";
  }

  function planCardHtml(key) {
    const plan = PLANS[key];
    const active = state.profile.passPlan === key;
    const isPro = key === "PRO";
    return (
      '<article class="plan-card ' + (isPro ? "featured" : "") + '">' +
      (isPro ? '<span class="tag">Best for shops</span>' : "") +
      "<h3>" + plan.name + "</h3>" +
      '<div class="plan-price"><b>' + plan.price + "</b><span>" + plan.sub + "</span></div>" +
      '<p class="plan-sub">' + plan.listings + "</p>" +
      '<ul class="plan-features">' +
      PASS_FEATURES[key]
        .map((f) => "<li>" + icon("check") + "<span>" + f + "</span></li>")
        .join("") +
      "</ul>" +
      (active
        ? '<button class="btn btn-ghost btn-block" type="button" disabled>Current plan</button>'
        : '<button class="btn ' + (isPro ? "btn-copper" : "btn-primary") + ' btn-block" type="button" data-action="plan" data-plan="' +
          key + '">' + (isPro ? "Activate Pro Workshop" : "Activate Verified Pass") + "</button>") +
      "</article>"
    );
  }

  function renderPass() {
    const p = state.profile;
    const compareRows = [
      ["Evidence pack required", "No", "Yes — 5 items", "Yes — 5 items"],
      ["Copper Pass badge", "No", "1 listing", "Up to 8 listings"],
      ["Marketplace placement", "Standard", "Higher", "Top"],
      ["Validation window", "72 hours", "72 hours", "72 hours"],
      ["7-day DOA cover", "Yes", "Yes", "Yes"],
      ["Support SLA", "72 hours", "72 hours", "48 hours"],
      ["Dispute evidence review", "Standard", "Standard", "Priority"],
      ["Price", "Free", "₱49 / listing", "₱399 / month"]
    ];

    $("#page").innerHTML =
      '<section class="pass-hero"><div class="wrap">' +
      '<span class="eyebrow">' + icon("shield") + "Verified Pass</span>" +
      "<h1>Evidence on file. Spot-audited. Ranked higher.</h1>" +
      "<p>A Pass badge is earned, not bought. Upload all five evidence items, pass the platform spot audit, and carry the copper badge. The validation window and DOA cover stay identical for every seller tier.</p>" +
      '<div class="row" style="margin-top:20px">' +
      '<span class="badge ' + (p.passPlan === "NONE" ? "badge-warn" : "badge-pass") + '">' +
      icon("shield") + esc(passStatusText()) + "</span>" +
      (p.passPlan !== "NONE"
        ? '<button class="btn btn-sm btn-ghost" type="button" data-action="cancel-plan" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff">Cancel plan</button>'
        : "") +
      "</div></div></section>" +

      '<section class="section"><div class="wrap">' +
      '<div class="section-head"><div><h2>Choose a pass</h2><p>One-off for a single board, or a monthly workshop plan. No pass ever changes the buyer protection terms.</p></div></div>' +
      '<div class="plan-grid">' + planCardHtml("SINGLE") + planCardHtml("PRO") + "</div>" +
      '<div class="note note-copper" style="margin-top:18px">' + icon("info") +
      " Demo billing: activating a plan is instant and local. No charge is made and no card is collected.</div>" +
      "</div></section>" +

      '<section class="section-tight"><div class="wrap">' +
      '<div class="section-head"><div><h2>What goes in the evidence pack</h2><p>All five items are mandatory. A missing item keeps the listing at standard tier.</p></div></div>' +
      '<div class="grid grid-3">' +
      EVIDENCE_ITEMS.map(function (item, i) {
        return (
          '<div class="card card-pad"><div class="row" style="gap:10px;align-items:flex-start">' +
          '<span class="verify-ico is-done">' + icon("check") + "</span>" +
          "<div><b style=\"font-size:13.5px\">" + (i + 1) + ". " + item.label + "</b>" +
          '<p class="small muted" style="margin-top:3px">' + item.hint + "</p></div></div></div>"
        );
      }).join("") +
      "</div></div></section>" +

      '<section class="section-tight"><div class="wrap">' +
      '<div class="section-head"><div><h2>Spot-audit outcomes</h2><p>10% of Pass listings are sampled each week. Buyers see the badge only while the evidence holds up.</p></div></div>' +
      '<div class="audit-flow">' +
      '<div class="audit-step"><b>Upload</b><span>Five evidence items on the listing</span></div>' +
      '<div class="audit-step"><b>Completeness</b><span>Automatic check that all five exist</span></div>' +
      '<div class="audit-step"><b>Spot sample</b><span>10% pulled for manual review</span></div>' +
      '<div class="audit-step"><b>Pass</b><span>Badge stays · ranking boosted</span></div>' +
      '<div class="audit-step is-danger"><b>Fail</b><span>Badge removed · listing flagged</span></div>' +
      "</div>" +
      '<div class="note note-danger" style="margin-top:16px">' + icon("alert") +
      " <b>Falsified evidence is a ban-and-hold event.</b> The listing is delisted, open orders move to manual review, and the payout reserve is held while the audit is completed.</div>" +
      "</div></section>" +

      '<section class="section"><div class="wrap">' +
      '<div class="section-head"><div><h2>Compare tiers</h2><p>Buyer protection is identical across every row. What changes is seller visibility and support speed.</p></div></div>' +
      '<div class="card" style="overflow:auto"><table class="compare"><thead><tr>' +
      "<th>Feature</th><th>Standard</th><th>Verified Pass</th><th>Pro Workshop</th></tr></thead><tbody>" +
      compareRows
        .map(function (row) {
          return (
            "<tr><td><b>" + row[0] + "</b></td><td>" + row[1] + "</td><td>" + row[2] + "</td><td>" + row[3] + "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div></div></section>" +

      '<section class="section-tight"><div class="wrap"><div class="cta">' +
      "<div><h2>Ready to list with evidence?</h2>" +
      "<p>Activate a pass, upload the five items, and publish. Reviews are completed before the badge is shown.</p></div>" +
      '<a class="btn btn-lg" href="sell.html">Start a listing ' + icon("arrow") + "</a>" +
      "</div></div></section>";
  }

  function activatePlan(plan) {
    if (plan !== "SINGLE" && plan !== "PRO") return;
    state.profile.passPlan = plan;
    state.profile.passStartedAt = Date.now();
    state.profile.passExpires = Date.now() + 30 * 864e5;
    persist("profile");
    if (currentRole() === "seller") {
      updateSeller(state.session.sellerId, { tier: plan === "PRO" ? "Pro Workshop" : "Verified Pass" });
    }
    toast(plan === "PRO" ? "Pro Workshop activated (demo)." : "Verified Pass activated (demo).", "success");
    renderPage();
  }

  /* ----------------------------------------------------------------------
     Support
     ---------------------------------------------------------------------- */
  const TICKET_CATEGORIES = ["Order", "Payment", "Shipping", "DOA", "Dispute", "Account", "Other"];

  function slaHours() {
    if (currentRole() === "seller") {
      const seller = sellerById(state.session.sellerId);
      if (seller) return seller.tier === "Pro Workshop" ? 48 : 72;
    }
    return state.profile.passPlan === "PRO" ? 48 : 72;
  }

  function ticketHtml(ticket) {
    const open = ticket.status === "OPEN";
    return (
      '<div class="ticket"><div class="ticket-top"><div><b>' + esc(ticket.subject) + "</b>" +
      '<div class="meta"><span>' + ticket.id + "</span><span>" + esc(ticket.category) + "</span>" +
      (ticket.orderId ? "<span>" + esc(ticket.orderId) + "</span>" : "") +
      "<span>" + fmtDate(ticket.createdAt) + "</span></div></div>" +
      '<span class="badge ' + (open ? "badge-warn" : "badge-success") + '">' +
      (open ? "Open" : "Resolved") + "</span></div>" +
      '<p>' + esc(ticket.message) + "</p>" +
      (open
        ? '<div class="spread" style="margin-top:10px"><span class="small muted">SLA ' + ticket.slaHours +
          "h · due " + fmtDateTime(ticket.dueAt) + "</span>" +
          '<button class="btn btn-ghost btn-sm" type="button" data-action="resolve-ticket" data-id="' +
          ticket.id + '">Mark resolved</button></div>'
        : '<div class="small muted" style="margin-top:10px">Resolved ' + fmtDateTime(ticket.resolvedAt) + "</div>") +
      "</div>"
    );
  }

  function renderSupport() {
    const orderOptions = state.orders
      .map(function (o) {
        return '<option value="' + o.id + '"' + (PARAMS.get("order") === o.id ? " selected" : "") + ">" +
          o.id + " — " + esc(o.title.slice(0, 42)) + "</option>";
      })
      .join("");
    const openTickets = state.tickets.filter((t) => t.status === "OPEN");
    const sla = slaHours();

    $("#page").innerHTML =
      '<div class="wrap"><div class="page-head"><h1>Support &amp; disputes</h1>' +
      "<p>Open a ticket for order issues, payment questions, or a DOA claim. Disputes freeze escrow until a ruling is issued.</p></div></div>" +
      '<div class="wrap"><div class="support-layout"><div>' +

      '<div class="sla-banner"><span class="ico">' + icon("clock") + "</span>" +
      "<div><b>" + sla + "-hour first-response target</b>" +
      "<span>" + (state.profile.passPlan === "PRO"
        ? "Pro Workshop active · priority queue included."
        : "Standard queue. Pro Workshop reduces this to 48 hours — buyer protection terms do not change.") +
      "</span></div></div>" +

      '<form class="card card-pad" id="ticket-form" style="margin-top:18px">' +
      "<h2 style=\"font-size:18px\">New ticket</h2>" +
      '<p class="small muted" style="margin:4px 0 18px">Include the order ID and a clear description. For DOA claims, attach the same evidence used in the order dispute.</p>' +
      '<div class="form-grid">' +
      '<div class="field span-2"><label for="t-subject">Subject</label>' +
      '<input class="input" id="t-subject" required maxlength="90" placeholder="Part arrived with no display output"></div>' +
      '<div class="field"><label for="t-category">Category</label><select class="select" id="t-category">' +
      TICKET_CATEGORIES.map((c) => '<option value="' + esc(c) + '">' + esc(c) + "</option>").join("") +
      "</select></div>" +
      '<div class="field"><label for="t-order">Related order (optional)</label><select class="select" id="t-order">' +
      '<option value="">— none —</option>' + orderOptions + "</select></div>" +
      '<div class="field span-2"><label for="t-message">What happened?</label>' +
      '<textarea class="textarea" id="t-message" required placeholder="Order ID, what you tested, what failed, and what you have already tried."></textarea></div>' +
      "</div>" +
      '<div class="row" style="justify-content:space-between;margin-top:18px">' +
      '<span class="small muted">Target first response: ' + sla + " hours</span>" +
      '<button class="btn btn-primary" type="submit">Open ticket</button></div>' +
      "</form>" +

      '<div style="margin-top:24px"><div class="section-head" style="margin-bottom:12px">' +
      "<div><h2 style=\"font-size:17px\">Your tickets</h2>" +
      '<p class="small muted">' + openTickets.length + " open · " + state.tickets.length + " total</p></div></div>" +
      (state.tickets.length
        ? '<div class="ticket-list">' + state.tickets.map(ticketHtml).join("") + "</div>"
        : emptyState("No tickets yet", "Open one above and it will appear here with its SLA clock.")) +
      "</div></div>" +

      '<aside class="stack">' +
      '<div class="card"><div class="card-head"><h3>Disputes &amp; DOA</h3></div><div class="card-body">' +
      '<div class="stack" style="gap:14px">' +
      '<div><b style="font-size:13px">1. Freeze escrow</b><p class="small muted">Open the order, raise a dispute before the 72-hour window ends, and escrow freezes immediately.</p></div>' +
      '<div><b style="font-size:13px">2. Submit evidence</b><p class="small muted">Function failure clip, serial macro, diagnostics screen, and photos of what arrived.</p></div>' +
      '<div><b style="font-size:13px">3. Return or release</b><p class="small muted">A ruling refunds the buyer or releases to the seller. Upheld DOA claims get a platform-generated prepaid label.</p></div>' +
      "</div>" +
      '<div class="note note-amber" style="margin-top:14px;font-size:12px">' + icon("alert") +
      " The platform never keeps disputed funds. Escrow is held by a licensed PSP.</div>" +
      "</div></div>" +

      '<div class="card"><div class="card-head"><h3>Fast answers</h3></div><div class="card-body"><div class="faq">' +
      [
        ["How long does validation take?", "72 hours from delivery, for every seller tier. A one-time +24 hour extension is available from the order page."],
        ["What happens if I miss the window?", "Escrow auto-releases to the seller. The 7-day DOA cover still applies after release."],
        ["Can I cancel before shipment?", "Yes. Open the order and cancel while it is still in the Paid state for a full refund."],
        ["Is there buyer-side COD?", "No. Escrow only, and the platform never holds the money itself."],
        ["How do I pay the seller commission?", "It is deducted from the seller payout — 8% with a ₱20 minimum — not charged to the buyer."]
      ]
        .map(function (item) {
          return "<details><summary>" + item[0] + "</summary><p>" + item[1] + "</p></details>";
        })
        .join("") +
      "</div></div></div></aside></div></div>";

    $("#ticket-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const subject = $("#t-subject").value.trim();
      const message = $("#t-message").value.trim();
      if (subject.length < 5) {
        toast("Add a subject with at least 5 characters.", "error");
        return;
      }
      if (message.length < 10) {
        toast("Describe the issue in at least 10 characters.", "error");
        return;
      }
      const ticket = createTicket({
        subject: subject,
        category: $("#t-category").value,
        orderId: $("#t-order").value,
        message: message
      });
      toast("Ticket " + ticket.id + " opened.", "success");
      renderSupport();
    });
  }

  /* ----------------------------------------------------------------------
     Account
     ---------------------------------------------------------------------- */
  function savedListings() {
    return state.listings.filter((l) => state.saved.indexOf(l.id) !== -1);
  }

  function verifyRow(field, label, detail, done) {
    return (
      '<div class="verify-row"><span class="verify-ico ' + (done ? "is-done" : "") + '">' +
      icon(done ? "check" : "shield") + "</span>" +
      "<div><b>" + label + "</b><span>" + detail + "</span></div>" +
      '<div class="right">' +
      (done
        ? '<span class="badge badge-success">Verified</span>'
        : '<button class="btn btn-soft btn-sm" type="button" data-action="verify" data-field="' + field + '">Verify (demo)</button>') +
      "</div></div>"
    );
  }

  function payoutTotals() {
    const mine = state.orders.filter((o) => o.seller === state.profile.business);
    const released = mine
      .filter((o) => o.escrow === "RELEASED")
      .reduce((s, o) => s + (o.subtotal - o.commission - o.reserve), 0);
    const reserve = mine
      .filter((o) => o.escrow === "HELD" || o.escrow === "FROZEN")
      .reduce((s, o) => s + Number(o.reserve || 0), 0);
    return { released: round2(released), reserve: round2(reserve), count: mine.length };
  }

  function renderAccount() {
    if (!state.profile.signedIn) {
      renderSignInGate();
      return;
    }
    const p = state.profile;
    const volume = monthlyVolume();
    const pct = Math.min(100, (volume / POLICY.kycMonthlyVolume) * 100);
    const over = volume >= POLICY.kycMonthlyVolume;
    const saved = savedListings();
    const payouts = payoutTotals();
    const plan = PLANS[p.passPlan === "PRO" ? "PRO" : p.passPlan === "SINGLE" ? "SINGLE" : "FREE"];

    $("#page").innerHTML =
      '<div class="wrap"><div class="page-head"><h1>Account</h1>' +
      "<p>Identity, verification, escrow volume, payouts, and saved parts — all stored locally in this demo.</p></div>" +
      '<div class="account-layout">' +

      '<aside class="profile-card"><div class="profile-avatar">' + initials(p.name) + "</div>" +
      "<h2>" + esc(p.name) + "</h2>" +
      '<p class="email">' + esc(p.email) + "</p>" +
      '<div style="margin-top:10px"><span class="badge ' + plan.badge + '">' + icon("shield") + esc(plan.name) + "</span></div>" +
      '<div class="profile-meta">' +
      '<div class="row-line"><span>Business</span><b>' + esc(p.business || "—") + "</b></div>" +
      '<div class="row-line"><span>City</span><b>' + esc(p.city) + "</b></div>" +
      '<div class="row-line"><span>Member since</span><b>' + fmtDate(p.memberSince) + "</b></div>" +
      '<div class="row-line"><span>Buyer KYC</span><b>' + (p.buyerKyc ? "Verified" : "Not started") + "</b></div>" +
      '<div class="row-line"><span>Seller KYC</span><b>' + (p.sellerKyc ? "Verified" : "Not started") + "</b></div>" +
      '<div class="row-line"><span>Pass</span><b>' + esc(p.passPlan === "NONE" ? "None" : plan.name) + "</b></div>" +
      "</div>" +
      '<a class="btn btn-ghost btn-sm btn-block" style="margin-top:16px" href="marketplace.html#saved">' +
      icon("heart") + "Saved (" + saved.length + ")</a>" +
      (currentRole() === "seller"
        ? '<a class="btn btn-ghost btn-sm btn-block" style="margin-top:8px" href="seller-dashboard.html">' +
          icon("box") + "Seller dashboard</a>"
        : currentRole() === "admin"
          ? '<a class="btn btn-ghost btn-sm btn-block" style="margin-top:8px" href="admin-dashboard.html">' +
            icon("shield") + "Admin console</a>"
          : "") +
      "</aside>" +

      "<div>" +

      '<section class="account-section" id="identity"><div class="head"><h3>Identity</h3>' +
      '<span class="badge badge-neutral">Demo profile</span></div><div class="body">' +
      '<form id="identity-form" class="form-grid">' +
      '<div class="field"><label for="a-name">Full name</label><input class="input" id="a-name" value="' + esc(p.name) + '"></div>' +
      '<div class="field"><label for="a-email">Email</label><input class="input" id="a-email" type="email" value="' + esc(p.email) + '"></div>' +
      '<div class="field"><label for="a-phone">Mobile</label><input class="input" id="a-phone" value="' + esc(p.phone) + '"></div>' +
      '<div class="field"><label for="a-city">City</label><input class="input" id="a-city" value="' + esc(p.city) + '"></div>' +
      '<div class="field span-2"><label for="a-business">Business name (used on listings)</label>' +
      '<input class="input" id="a-business" value="' + esc(p.business) + '"></div>' +
      '<div class="span-2 row" style="justify-content:space-between"><span class="small muted">Changes apply to future orders and listings.</span>' +
      '<button class="btn btn-primary" type="submit">Save changes</button></div>' +
      "</form></div></section>" +

      '<section class="account-section" id="verification"><div class="head"><h3>Verification</h3>' +
      '<span class="small muted">Required for payouts and high-volume buying</span></div><div class="body">' +
      verifyRow("emailVerified", "Email address", "Order updates and dispute notices", p.emailVerified) +
      verifyRow("phoneVerified", "Mobile number", "Courier and delivery coordination", p.phoneVerified) +
      verifyRow("buyerKyc", "Buyer identity (KYC)", "Required above " + peso0(POLICY.kycMonthlyVolume) + " monthly paid volume", p.buyerKyc) +
      verifyRow("sellerKyc", "Seller identity (KYC)", "Required before your first listing goes live", p.sellerKyc) +
      verifyRow("payoutVerified", "Payout account", p.payoutAccount || "GCash / bank account for seller payouts", p.payoutVerified) +
      verifyRow("twoFactor", "Two-factor authentication", "Extra layer on sign-in (demo toggle)", p.twoFactor) +
      "</div></section>" +

      '<section class="account-section" id="volume"><div class="head"><h3>Monthly escrow volume</h3>' +
      '<span class="badge ' + (over ? "badge-warn" : "badge-neutral") + '">' + nowMonthKey() + "</span></div>" +
      '<div class="body"><div class="volume-head"><b>' + peso(volume) + "</b>" +
      "<span>of " + peso(POLICY.kycMonthlyVolume) + " before KYC</span></div>" +
      '<div class="meter ' + (over ? "is-over" : "") + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<p class="small muted" style="margin-top:10px">' +
      (over
        ? "Threshold reached. The next checkout requires buyer KYC — existing orders, returns, and DOA claims are unaffected."
        : "Cumulative paid volume this month. Once you cross the threshold, checkout asks for a one-step demo KYC.") +
      "</p>" +
      '<div class="note" style="margin-top:14px;font-size:12px">' + icon("info") +
      " The demo profile includes a ₱10,500 starting volume so the threshold is reachable in one purchase.</div>" +
      "</div></section>" +

      '<section class="account-section" id="pass"><div class="head"><h3>Verified Pass</h3>' +
      (p.passPlan === "NONE"
        ? '<a class="link" href="verified-pass.html">See plans ' + icon("arrow") + "</a>"
        : '<button class="btn btn-ghost btn-sm" type="button" data-action="cancel-plan">Cancel plan</button>') +
      "</div><div class=\"body\">" +
      '<div class="spread" style="gap:16px;flex-wrap:wrap">' +
      '<div><div class="row" style="gap:9px"><span class="badge ' + plan.badge + '">' + icon("shield") + esc(plan.name) + "</span>" +
      (p.passExpires ? '<span class="small muted">renews ' + fmtDate(p.passExpires) + "</span>" : "") + "</div>" +
      '<p class="small muted" style="margin-top:8px">' + esc(plan.listings) + " · " + slaHours() + "-hour support SLA</p></div>" +
      '<a class="btn ' + (p.passPlan === "NONE" ? "btn-copper" : "btn-ghost") + '" href="verified-pass.html">' +
      (p.passPlan === "NONE" ? "Activate Pass" : "Manage plan") + "</a></div>" +
      "</div></section>" +

      '<section class="account-section" id="payouts"><div class="head"><h3>Payouts &amp; reserve</h3>' +
      '<a class="link" href="sell.html">List a board ' + icon("arrow") + "</a></div><div class=\"body\">" +
      '<div class="stat-cards" style="margin:0 0 16px">' +
      '<div class="stat-card"><span>Released</span><b>' + peso0(payouts.released) + "</b></div>" +
      '<div class="stat-card"><span>Reserve held</span><b>' + peso0(payouts.reserve) + "</b></div>" +
      '<div class="stat-card"><span>Seller orders</span><b>' + payouts.count + "</b></div>" +
      '<div class="stat-card"><span>Payout account</span><b style="font-size:14px;padding-top:7px">' +
      (p.payoutVerified ? "Verified" : "Not set") + "</b></div></div>" +
      '<dl class="kv"><dt>Commission</dt><dd>8% per order, ₱20 minimum</dd>' +
      "<dt>Reserve</dt><dd>10% of the seller payout, held 14 days after delivery</dd>" +
      "<dt>Release rule</dt><dd>Buyer validation or 72 hours after delivery</dd>" +
      "<dt>Disputes</dt><dd>Frozen escrow; reserve held until the ruling</dd></dl>" +
      (payouts.count === 0
        ? '<div class="note" style="margin-top:14px">' + icon("info") +
          " No seller payouts yet. Publish a listing and complete a sale to see the ledger populated.</div>"
        : "") +
      "</div></section>" +

      '<section class="account-section" id="saved"><div class="head"><h3>Saved parts</h3>' +
      '<span class="small muted">' + saved.length + " saved</span></div><div class=\"body\">" +
      (saved.length
        ? '<div class="saved-grid">' + saved.map(listingCard).join("") + "</div>"
        : '<div class="note">' + icon("heart") + " Nothing saved yet. Tap the heart on any listing.</div>") +
      "</div></section>" +

      '<section class="account-section" id="security"><div class="head"><h3>Session &amp; demo data</h3></div>' +
      '<div class="body"><div class="stack">' +
      '<div class="spread" style="gap:12px"><div><b style="font-size:13px">Active portal</b>' +
      '<p class="small muted">' + esc(PORTALS[currentRole()].label) + " · " + esc(state.session.email) + "</p></div>" +
      '<a class="btn btn-ghost btn-sm" href="login.html">Switch role</a></div>' +
      '<div class="spread" style="gap:12px;padding-top:12px;border-top:1px solid var(--line-2)"><div><b style="font-size:13px">Sign out</b>' +
      '<p class="small muted">Return to the demo sign-in gate.</p></div>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-action="sign-out">Sign out</button></div>' +
      '<div class="spread" style="gap:12px;padding-top:12px;border-top:1px solid var(--line-2)"><div><b style="font-size:13px">Reset demo</b>' +
      '<p class="small muted">Clear listings, orders, tickets, saves, and the profile from this browser.</p></div>' +
      '<button class="btn btn-danger btn-sm" type="button" data-action="reset-demo">Reset demo data</button></div>' +
      "</div></div></section>" +

      "</div></div></div>";

    $("#identity-form").addEventListener("submit", function (e) {
      e.preventDefault();
      state.profile.name = $("#a-name").value.trim() || state.profile.name;
      state.profile.email = $("#a-email").value.trim() || state.profile.email;
      state.profile.phone = $("#a-phone").value.trim() || state.profile.phone;
      state.profile.city = $("#a-city").value.trim() || state.profile.city;
      state.profile.business = $("#a-business").value.trim() || state.profile.business;
      persist("profile");
      toast("Profile saved.", "success");
      renderAccount();
      updateChrome();
    });
  }

  /* ----------------------------------------------------------------------
     Portals: login, seller dashboard, admin console
     ---------------------------------------------------------------------- */
  let loginRole = null;

  function escrowText(order) {
    const map = {
      HELD: "Held",
      FROZEN: "Frozen",
      RELEASED: "Released",
      REFUNDED: "Refunded",
      DOA_REFUNDED: "DOA refund"
    };
    return map[order.escrow] || order.escrow;
  }

  function buyerOf(order) {
    return (order.address && order.address.recipient) || "Demo buyer";
  }

  function dashPanel(id, title, sub, actions, body, flush) {
    return (
      '<section class="dash-panel" id="' + id + '">' +
      '<div class="dash-panel-head"><div><h2>' + title + "</h2>" +
      (sub ? "<p>" + sub + "</p>" : "") + "</div>" +
      '<div class="row" style="gap:8px">' + (actions || "") + "</div></div>" +
      '<div class="dash-panel-body' + (flush ? " flush" : "") + '">' + body + "</div></section>"
    );
  }

  function dashEmpty(text, cta) {
    return (
      '<div class="dash-empty">' + icon("info") +
      "<div><b>" + text + "</b>" + (cta ? "<span>" + cta + "</span>" : "") + "</div></div>"
    );
  }

  function renderRoleGate(role) {
    const p = PORTALS[role];
    $("#page").innerHTML =
      '<div class="wrap" style="padding:56px 0 88px"><div class="gate">' +
      '<div class="ico">' + icon("lock") + "</div>" +
      "<h2>" + esc(p.label) + " sign-in required</h2>" +
      "<p>This area is role-protected. Sign in with the demo " + role +
      " account to continue. Everything stays in this browser.</p>" +
      '<div class="row" style="justify-content:center">' +
      '<a class="btn btn-primary btn-lg" href="login.html?role=' + role + '">Go to sign in</a>' +
      '<button class="btn btn-ghost" type="button" data-action="demo-login" data-role="' + role + '">Use demo ' + role + "</button>" +
      "</div></div></div>";
  }

  function attemptLogin(role, email, password) {
    const p = PORTALS[role];
    if (String(email).trim().toLowerCase() !== p.email || password !== p.password) {
      return { ok: false, error: "Email or password does not match the demo credentials below." };
    }
    const seller = role === "seller" ? state.sellers.find((s) => s.email === p.email) : null;
    state.session = {
      role: role,
      email: p.email,
      name: p.name,
      sellerId: seller ? seller.id : null,
      at: Date.now()
    };
    writeKey(K.session, state.session);
    state.profile.signedIn = true;
    if (role === "buyer") {
      state.profile.email = p.email;
    }
    persist("profile");
    return { ok: true, home: p.home };
  }

  function demoSignIn(role) {
    const p = PORTALS[role];
    if (!p) return;
    const result = attemptLogin(role, p.email, p.password);
    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast("Signed in as " + p.label + ".", "success");
    location.href = result.home;
  }

  function renderLogin() {
    if (!loginRole) {
      const requested = PARAMS.get("role");
      loginRole = requested && PORTALS[requested] ? requested : "seller";
    }
    const p = PORTALS[loginRole];
    const tabs = ["buyer", "seller", "admin"]
      .map(function (role) {
        return (
          '<button type="button" data-action="login-role" data-role="' + role + '" class="' +
          (loginRole === role ? "is-active" : "") + '">' + PORTALS[role].label.split(" ")[0] + "</button>"
        );
      })
      .join("");
    const roleList = ["buyer", "seller", "admin"]
      .map(function (role) {
        const item = PORTALS[role];
        return (
          '<div class="auth-role' + (loginRole === role ? " is-active" : "") + '">' +
          "<span>" + icon(role === "buyer" ? "user" : role === "seller" ? "box" : "shield") + "</span>" +
          "<div><b>" + item.label + "</b><small>" + item.blurb + "</small></div></div>"
        );
      })
      .join("");

    $("#page").innerHTML =
      '<div class="wrap"><div class="auth-layout">' +
      '<aside class="auth-brand">' +
      '<span class="eyebrow" style="color:#5ee0cd">Role-based demo access</span>' +
      "<h1>One marketplace.<br>Three control rooms.</h1>" +
      "<p>Buyers get escrow protection. Sellers get a fulfilment and payout desk. Admins get the escrow, moderation, and dispute controls in one queue.</p>" +
      '<div class="auth-role-list">' + roleList + "</div>" +
      '<div class="auth-foot">' + icon("lock") +
      " Demo accounts only. Credentials are validated locally and no data leaves this browser.</div>" +
      "</aside>" +
      '<div class="auth-card">' +
      '<div class="auth-tabs" role="tablist">' + tabs + "</div>" +
      "<h2>Sign in to " + esc(p.label.toLowerCase()) + "</h2>" +
      '<p class="small muted" style="margin-top:6px">' + esc(p.blurb) + "</p>" +
      '<form id="login-form" style="margin-top:22px" novalidate>' +
      '<div class="field"><label for="login-email">Email</label>' +
      '<input class="input" id="login-email" type="email" autocomplete="username" placeholder="' +
      esc(p.email) + '" required></div>' +
      '<div class="field" style="margin-top:14px"><label for="login-password">Password</label>' +
      '<input class="input" id="login-password" type="password" autocomplete="current-password" placeholder="demo1234" required></div>' +
      '<div class="auth-error" id="login-error" hidden></div>' +
      '<button class="btn btn-primary btn-lg btn-block" type="submit" style="margin-top:18px">Sign in as ' +
      loginRole + "</button>" +
      "</form>" +
      '<div class="demo-creds"><div class="spread"><b>Demo credentials</b>' +
      '<span class="badge badge-neutral">Local only</span></div>' +
      '<div class="cred-row"><span>Email</span><code>' + esc(p.email) + "</code></div>" +
      '<div class="cred-row"><span>Password</span><code>demo1234</code></div>' +
      '<button class="btn btn-ghost btn-sm btn-block" type="button" data-action="login-fill" style="margin-top:10px">Fill demo credentials</button>' +
      "</div>" +
      '<p class="small muted" style="margin-top:16px">Buyer browsing stays open without sign-in. ' +
      '<a class="link" href="index.html">Continue to the marketplace ' + icon("arrow") + "</a></p>" +
      "</div></div></div>";

    $("#login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const email = $("#login-email").value;
      const password = $("#login-password").value;
      const result = attemptLogin(loginRole, email, password);
      const error = $("#login-error");
      if (!result.ok) {
        error.hidden = false;
        error.textContent = result.error;
        toast("Sign-in failed — check the demo credentials.", "error");
        return;
      }
      toast("Signed in as " + PORTALS[loginRole].label + ".", "success");
      location.href = result.home;
    });
  }

  function renderSellerDash() {
    if (currentRole() !== "seller") {
      renderRoleGate("seller");
      return;
    }
    const seller = sellerById(state.session.sellerId);
    if (!seller) {
      renderRoleGate("seller");
      return;
    }

    const m = sellerMetrics(seller.name);
    const orders = m.orders.slice().sort((a, b) => b.createdAt - a.createdAt);
    const listings = m.listings
      .slice()
      .sort(function (a, b) {
        const rank = { ACTIVE: 0, PENDING: 1, PAUSED: 2, REMOVED: 3 };
        return (rank[listingStatusOf(a)] || 0) - (rank[listingStatusOf(b)] || 0) || b.createdAt - a.createdAt;
      });
    const openTickets = state.tickets.filter(
      (t) => t.status === "OPEN" && m.orders.some((o) => o.id === t.orderId)
    );
    const tierClass =
      seller.tier === "Pro Workshop" || seller.tier === "Verified Pass"
        ? "badge-pass"
        : seller.tier === "Verified Seller"
          ? "badge-verified"
          : "badge-neutral";
    const sla = seller.tier === "Pro Workshop" ? 48 : 72;

    const attention = [];
    m.pendingShip.forEach(function (o) {
      attention.push(
        '<div class="attention-row"><div class="row" style="gap:10px"><span class="att-ico">' + icon("truck") + "</span>" +
        "<div><b>Ship " + o.id + "</b><span>" + esc(o.title) + " · buyer " + esc(buyerOf(o)) + "</span></div></div>" +
        '<button class="btn btn-primary btn-sm" type="button" data-action="seller-ship" data-id="' + o.id + '">Mark shipped</button></div>'
      );
    });
    m.disputes.forEach(function (o) {
      attention.push(
        '<div class="attention-row is-danger"><div class="row" style="gap:10px"><span class="att-ico">' + icon("alert") + "</span>" +
        "<div><b>Dispute open · " + o.id + "</b><span>Escrow frozen · platform review in progress</span></div></div>" +
        '<a class="btn btn-ghost btn-sm" href="orders.html?order=' + o.id + '">View order</a></div>'
      );
    });
    openTickets.forEach(function (t) {
      attention.push(
        '<div class="attention-row"><div class="row" style="gap:10px"><span class="att-ico">' + icon("doc") + "</span>" +
        "<div><b>" + esc(t.subject) + "</b><span>" + t.id + " · " + esc(t.category) + " · due " + fmtDateTime(t.dueAt) + "</span></div></div>" +
        '<a class="btn btn-ghost btn-sm" href="support.html">Open ticket</a></div>'
      );
    });
    const attentionHtml = attention.length
      ? attention.join("")
      : dashEmpty("You are all caught up.", "New orders, disputes, and tickets will appear here.");

    const orderRows = orders.length
      ? orders
          .map(function (o) {
            return (
              "<tr><td><b>" + o.id + "</b><span class=\"sub\">" + fmtDate(o.createdAt) + "</span></td>" +
              '<td><div class="cell-main"><img class="thumb" src="' + o.image + '" alt=""><div><b>' +
              esc(o.title) + '</b><span class="sub">' + esc(buyerOf(o)) + "</span></div></div></td>" +
              '<td class="num">' + peso(o.total) + "</td>" +
              "<td>" + statusBadge(o.status) + "</td>" +
              '<td><span class="escrow-mini">' + esc(escrowText(o)) + "</span></td>" +
              '<td class="row-actions">' +
              (o.status === "PAID"
                ? '<button class="btn btn-primary btn-sm" type="button" data-action="seller-ship" data-id="' + o.id + '">Ship</button>'
                : '<a class="btn btn-ghost btn-sm" href="orders.html?order=' + o.id + '">View</a>') +
              "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="6">' + dashEmpty("No orders yet.", "Publish a listing and share the storefront to get your first order.") + "</td></tr>";

    const listingRows = listings.length
      ? listings
          .map(function (l) {
            const status = listingStatusOf(l);
            return (
              '<tr><td><div class="cell-main"><img class="thumb" src="' + l.image + '" alt=""><div><b>' +
              esc(l.title) + '</b><span class="sub">' + l.id + " · " + esc(l.category) + "</span></div></div></td>" +
              '<td class="num">' + peso(l.price) + "</td>" +
              '<td class="num">' + l.stock + "</td>" +
              '<td class="num">' + Number(l.views || 0) + "</td>" +
              "<td>" + listingStatusBadge(l) + "</td>" +
              '<td class="row-actions">' +
              (status === "ACTIVE"
                ? '<a class="btn btn-ghost btn-sm" href="listing.html?id=' + l.id + '">Preview</a>' +
                  '<button class="btn btn-ghost btn-sm" type="button" data-action="seller-listing" data-op="pause" data-id="' + l.id + '">Pause</button>'
                : status === "PAUSED"
                  ? '<button class="btn btn-soft btn-sm" type="button" data-action="seller-listing" data-op="resume" data-id="' + l.id + '">Resume</button>'
                  : '<span class="sub">Awaiting platform review</span>') +
              "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="6">' + dashEmpty("No listings yet.", "Use New listing to publish your first part.") + "</td></tr>";

    const ledgerRows = orders.length
      ? orders
          .map(function (o) {
            const net = orderNet(o);
            return (
              "<tr><td><b>" + o.id + "</b><span class=\"sub\">" + fmtDate(o.createdAt) + "</span></td>" +
              '<td class="num">' + peso(o.subtotal) + "</td>" +
              '<td class="num neg">−' + peso(o.commission) + "</td>" +
              '<td class="num neg">−' + peso(o.reserve) + "</td>" +
              '<td class="num"><b>' + peso(net) + "</b></td>" +
              "<td>" + statusBadge(o.status) + "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="6">' + dashEmpty("No payout activity yet.", "Released and in-escrow orders will be itemised here.") + "</td></tr>";

    const topListings = listings
      .filter((l) => listingStatusOf(l) === "ACTIVE")
      .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
      .slice(0, 4);
    const maxViews = Math.max(1, ...topListings.map((l) => Number(l.views || 0)));
    const bars = topListings.length
      ? topListings
          .map(function (l) {
            const pct = Math.max(4, (Number(l.views || 0) / maxViews) * 100);
            return (
              '<div class="bar-row"><span title="' + esc(l.title) + '">' + esc(l.title.slice(0, 26)) + "</span>" +
              '<span class="bar-track"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
              "<b>" + Number(l.views || 0) + "</b></div>"
            );
          })
          .join("")
      : dashEmpty("No live listings to measure yet.");

    $("#page").innerHTML =
      '<div class="wrap"><div class="page-head dash-page-head"><div>' +
      '<span class="eyebrow">' + icon("box") + "Seller portal</span>" +
      "<h1>" + esc(seller.name) + "</h1>" +
      '<p>Signed in as ' + esc(state.session.email) + " · " + esc(seller.city) + " · joined " + esc(seller.joined) +
      ' · <span class="badge ' + tierClass + '">' + esc(seller.tier) + "</span></p></div>" +
      '<div class="row">' +
      '<a class="btn btn-ghost" href="marketplace.html?q=' + encodeURIComponent(seller.name) + '">View storefront</a>' +
      '<a class="btn btn-primary" href="sell.html">' + icon("plus") + "New listing</a>" +
      '<button class="btn btn-ghost" type="button" data-action="sign-out">Sign out</button>' +
      "</div></div>" +

      '<div class="dash-kpis">' +
      '<div class="dash-kpi is-accent"><span>Net released</span><b>' + peso(m.releasedNet) + "</b><small>After commission and reserve</small></div>" +
      '<div class="dash-kpi"><span>In escrow</span><b>' + peso(m.inEscrow) + "</b><small>Releases on buyer validation</small></div>" +
      '<div class="dash-kpi"><span>Reserve held</span><b>' + peso(m.reserveHeld) + "</b><small>Released 14 days after delivery</small></div>" +
      '<div class="dash-kpi"><span>Gross sales</span><b>' + peso(m.gross) + "</b><small>" + orders.length + " orders · " + m.views + " store views</small></div>" +
      "</div>" +

      '<div class="dash-layout">' +
      '<aside class="dash-side">' +
      '<div class="side-card dash-profile"><div class="dash-avatar">' + initials(seller.name) + "</div>" +
      "<b>" + esc(seller.name) + "</b>" +
      '<span class="side-sub">' + esc(seller.city) + " · since " + esc(seller.joined) + "</span>" +
      '<span class="badge ' + tierClass + '">' + esc(seller.tier) + "</span>" +
      '<div class="side-rows">' +
      '<div><span>Live listings</span><b>' + m.live.length + "</b></div>" +
      '<div><span>Orders</span><b>' + orders.length + "</b></div>" +
      '<div><span>Rating</span><b>' + (m.rating ? "★ " + Number(m.rating).toFixed(1) : "—") + "</b></div>" +
      '<div><span>KYC</span><b>' + (seller.kyc === "VERIFIED" ? "Verified" : "Pending") + "</b></div>" +
      '<div><span>Payout</span><b>' + esc(seller.payoutAccount || "Not set") + "</b></div>" +
      "</div>" +
      (seller.kyc !== "VERIFIED"
        ? '<button class="btn btn-soft btn-sm btn-block" type="button" data-action="seller-verify" style="margin-top:10px">Complete demo verification</button>'
        : "") +
      "</div>" +

      '<nav class="side-card dash-nav"><div class="side-title">Sections</div>' +
      '<a href="#overview">Overview</a>' +
      '<a href="#orders">Orders <span class="n">' + orders.length + "</span></a>" +
      '<a href="#listings">Listings <span class="n">' + listings.length + "</span></a>" +
      '<a href="#payouts">Payouts <span class="n">' + orders.length + "</span></a>" +
      '<a href="#performance">Performance</a>' +
      "</nav>" +

      '<div class="side-card"><div class="side-title">Seller support</div>' +
      '<p class="small muted">' + (openTickets.length ? openTickets.length + " open ticket" + (openTickets.length === 1 ? "" : "s") : "No open tickets") + "</p>" +
      '<p class="small muted" style="margin-top:4px">' + sla + "-hour first-response target on " + esc(seller.tier) + ".</p>" +
      '<a class="btn btn-ghost btn-sm btn-block" href="support.html" style="margin-top:10px">Open support</a></div>' +
      "</aside>" +

      '<div class="dash-main">' +
      dashPanel("overview", "Needs your attention",
        "Orders to ship, frozen escrow, and open support threads.",
        '<a class="btn btn-ghost btn-sm" href="orders.html">All orders</a>',
        '<div class="attention">' + attentionHtml + "</div>") +

      dashPanel("orders", "Orders", "Fulfil paid orders and track escrow release.",
        '<a class="btn btn-ghost btn-sm" href="orders.html">Buyer view</a>',
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Item</th><th>Total</th><th>Status</th><th>Escrow</th><th></th></tr></thead><tbody>' +
        orderRows + "</tbody></table></div>", true) +

      dashPanel("listings", "Listings", "Pause stock without losing the listing snapshot.",
        '<a class="btn btn-primary btn-sm" href="sell.html">' + icon("plus") + "New listing</a>",
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Listing</th><th>Price</th><th>Stock</th><th>Views</th><th>Status</th><th></th></tr></thead><tbody>' +
        listingRows + "</tbody></table></div>", true) +

      dashPanel("payouts", "Payout ledger", "Commission 8% (₱20 min) · reserve 10% for 14 days.",
        '<a class="btn btn-ghost btn-sm" href="account.html#payouts">Payout settings</a>',
        '<div class="ledger-strip">' +
        '<div><span>Released</span><b>' + peso(m.releasedNet) + "</b></div>" +
        '<div><span>In escrow</span><b>' + peso(m.inEscrow) + "</b></div>" +
        '<div><span>Reserve</span><b>' + peso(m.reserveHeld) + "</b></div>" +
        "</div>" +
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Gross</th><th>Commission</th><th>Reserve</th><th>Net</th><th>Status</th></tr></thead><tbody>' +
        ledgerRows + "</tbody></table></div>", true) +

      dashPanel("performance", "Listing performance", "Store views by listing, highest first.",
        '<a class="btn btn-ghost btn-sm" href="verified-pass.html">Improve visibility</a>',
        '<div class="bar-list">' + bars + "</div>") +
      "</div></div></div>";
  }

  function renderAdminDash() {
    if (currentRole() !== "admin") {
      renderRoleGate("admin");
      return;
    }
    const m = platformMetrics();
    const orders = state.orders.slice().sort((a, b) => b.createdAt - a.createdAt);
    const disputes = m.disputes.slice().sort((a, b) => b.createdAt - a.createdAt);
    const listings = state.listings
      .slice()
      .sort(function (a, b) {
        const rank = { PENDING: 0, ACTIVE: 1, PAUSED: 2, REMOVED: 3 };
        return (rank[listingStatusOf(a)] || 0) - (rank[listingStatusOf(b)] || 0) || b.createdAt - a.createdAt;
      });
    const openTickets = state.tickets
      .filter((t) => t.status === "OPEN")
      .sort((a, b) => a.dueAt - b.dueAt);
    const resolvedTickets = state.tickets.filter((t) => t.status !== "OPEN").length;
    const sellers = state.sellers
      .map(function (s) {
        const so = sellerOrders(s.name).filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED");
        return Object.assign({}, s, {
          listings: sellerListings(s.name).length,
          gmv: round2(so.reduce((sum, o) => sum + Number(o.total || 0), 0)),
          orders: so.length
        });
      })
      .sort((a, b) => b.gmv - a.gmv);

    const alertParts = [];
    if (disputes.length) alertParts.push(disputes.length + " dispute" + (disputes.length === 1 ? "" : "s"));
    if (m.pendingListings.length) alertParts.push(m.pendingListings.length + " listing" + (m.pendingListings.length === 1 ? "" : "s") + " pending");
    if (openTickets.length) alertParts.push(openTickets.length + " open ticket" + (openTickets.length === 1 ? "" : "s"));
    const alertHtml = alertParts.length
      ? '<div class="admin-alert">' + icon("alert") +
        "<div><b>" + alertParts.join(" · ") + " need attention</b>" +
        "<span>Escrow decisions, listing approvals, and support responses are queued below.</span></div></div>"
      : "";

    const disputeHtml = disputes.length
      ? disputes
          .map(function (o) {
            const label = o.status === "DOA_CLAIM" ? "DOA claim" : "Disputed";
            const reason =
              o.disputeReason ||
              (o.status === "DOA_CLAIM"
                ? "Dead-on-arrival claim filed inside the 7-day cover."
                : "Buyer reported the part did not match the listing snapshot.");
            return (
              '<div class="dispute-card"><div class="spread"><div class="row" style="gap:10px">' +
              '<span class="badge badge-danger">' + label + "</span><b>" + o.id + "</b>" +
              '<span class="small muted">' + esc(escrowText(o)) + " escrow</span></div>" +
              '<b class="num">' + peso(o.total) + "</b></div>" +
              '<p class="dispute-reason">' + esc(reason) + "</p>" +
              '<div class="dispute-meta">' +
              "<span>Seller · " + esc(o.seller) + "</span>" +
              "<span>Buyer · " + esc(buyerOf(o)) + "</span>" +
              "<span>Opened · " + fmtDate(o.createdAt) + "</span>" +
              "<span>Window · " + (o.validationEndsAt ? fmtDateTime(o.validationEndsAt) : "—") + "</span>" +
              "</div>" +
              (o.returnLabel
                ? '<div class="note note-amber" style="font-size:12px;margin-top:10px">' + icon("truck") +
                  " Return label " + esc(o.returnLabel.code) + " · " +
                  (o.returnLabel.scanned ? "scanned by courier" : "awaiting drop-off") + "</div>"
                : "") +
              '<div class="dispute-actions">' +
              (o.returnLabel && !o.returnLabel.scanned
                ? '<button class="btn btn-ghost btn-sm" type="button" data-action="admin-return-scan" data-id="' + o.id + '">Simulate return scan</button>'
                : "") +
              '<button class="btn btn-danger btn-sm" type="button" data-action="admin-refund" data-id="' + o.id + '">Refund buyer</button>' +
              '<button class="btn btn-primary btn-sm" type="button" data-action="admin-release" data-id="' + o.id + '">Release to seller</button>' +
              '<a class="btn btn-ghost btn-sm" href="orders.html?order=' + o.id + '">View timeline</a>' +
              "</div></div>"
            );
          })
          .join("")
      : dashEmpty("No open disputes.", "Any dispute or DOA claim raised from an order will land in this queue.");

    const orderRows = orders.length
      ? orders
          .map(function (o) {
            return (
              "<tr><td><b>" + o.id + "</b><span class=\"sub\">" + fmtDate(o.createdAt) + "</span></td>" +
              '<td><div class="cell-main"><img class="thumb" src="' + o.image + '" alt=""><div><b>' +
              esc(o.title) + '</b><span class="sub">' + esc(o.seller) + "</span></div></div></td>" +
              "<td>" + esc(buyerOf(o)) + "</td>" +
              '<td class="num">' + peso(o.total) + "</td>" +
              '<td><span class="escrow-mini">' + esc(escrowText(o)) + "</span></td>" +
              "<td>" + statusBadge(o.status) + "</td>" +
              '<td><a class="btn btn-ghost btn-sm" href="orders.html?order=' + o.id + '">Open</a></td></tr>'
            );
          })
          .join("")
      : '<tr><td colspan="7">' + dashEmpty("No orders on the platform yet.") + "</td></tr>";

    const listingRows = listings.length
      ? listings
          .map(function (l) {
            const status = listingStatusOf(l);
            return (
              '<tr><td><div class="cell-main"><img class="thumb" src="' + l.image + '" alt=""><div><b>' +
              esc(l.title) + '</b><span class="sub">' + l.id + " · " + esc(l.category) + "</span></div></div></td>" +
              '<td><div><b style="font-size:12.5px">' + esc(l.seller.name) + '</b><span class="sub">' + esc(l.seller.city) + "</span></div></td>" +
              '<td class="num">' + peso(l.price) + "</td>" +
              "<td>" + listingStatusBadge(l) + "</td>" +
              '<td class="row-actions">' +
              (status === "PENDING"
                ? '<button class="btn btn-primary btn-sm" type="button" data-action="admin-listing" data-op="approve" data-id="' + l.id + '">Approve</button>' +
                  '<button class="btn btn-ghost btn-sm" type="button" data-action="admin-listing" data-op="remove" data-id="' + l.id + '">Reject</button>'
                : status === "ACTIVE"
                  ? '<button class="btn btn-ghost btn-sm" type="button" data-action="admin-listing" data-op="pause" data-id="' + l.id + '">Pause</button>' +
                    '<a class="btn btn-ghost btn-sm" href="listing.html?id=' + l.id + '">View</a>'
                  : '<button class="btn btn-soft btn-sm" type="button" data-action="admin-listing" data-op="restore" data-id="' + l.id + '">Restore</button>') +
              "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="5">' + dashEmpty("No listings to moderate.") + "</td></tr>";

    const ticketRows = openTickets.length
      ? openTickets
          .map(function (t) {
            const overdue = t.dueAt < Date.now();
            return (
              '<div class="ticket-row"><div><b>' + esc(t.subject) + "</b>" +
              '<div class="meta"><span>' + t.id + "</span><span>" + esc(t.category) + "</span>" +
              (t.orderId ? "<span>" + esc(t.orderId) + "</span>" : "") +
              "<span>SLA " + t.slaHours + "h</span></div></div>" +
              '<div class="row" style="gap:8px">' +
              '<span class="badge ' + (overdue ? "badge-danger" : "badge-warn") + '">' +
              (overdue ? "Overdue" : "Due " + fmtDateTime(t.dueAt)) + "</span>" +
              '<button class="btn btn-primary btn-sm" type="button" data-action="admin-ticket-resolve" data-id="' + t.id + '">Resolve</button>' +
              "</div></div>"
            );
          })
          .join("")
      : dashEmpty("Support queue is clear.", resolvedTickets + " ticket" + (resolvedTickets === 1 ? "" : "s") + " resolved in this demo.");

    const sellerRows = sellers.length
      ? sellers
          .map(function (s) {
            return (
              "<tr><td><div class=\"cell-main\"><span class=\"seller-avatar\" style=\"width:34px;height:34px;font-size:11px\">" +
              initials(s.name) + '</span><div><b>' + esc(s.name) + '</b><span class="sub">' + esc(s.email) + "</span></div></div></td>" +
              "<td>" + esc(s.city) + "</td>" +
              "<td>" + esc(s.tier) + "</td>" +
              "<td>" + (s.kyc === "VERIFIED"
                ? '<span class="badge badge-success">Verified</span>'
                : '<span class="badge badge-warn">Pending</span>') + "</td>" +
              '<td class="num">' + s.listings + "</td>" +
              '<td class="num">' + peso(s.gmv) + "</td>" +
              '<td class="row-actions">' +
              (s.kyc !== "VERIFIED"
                ? '<button class="btn btn-primary btn-sm" type="button" data-action="admin-seller-verify" data-id="' + s.id + '">Verify KYC</button>'
                : "") +
              (s.status === "SUSPENDED"
                ? '<button class="btn btn-soft btn-sm" type="button" data-action="admin-seller-status" data-status="ACTIVE" data-id="' + s.id + '">Restore</button>'
                : '<button class="btn btn-ghost btn-sm" type="button" data-action="admin-seller-status" data-status="SUSPENDED" data-id="' + s.id + '">Suspend</button>') +
              "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="7">' + dashEmpty("No sellers registered.") + "</td></tr>";

    const mix = categoryVolume();
    const maxMix = Math.max(1, ...mix.map((x) => x.value));
    const mixHtml = mix.length
      ? mix
          .map(function (x) {
            const pct = Math.max(4, (x.value / maxMix) * 100);
            return (
              '<div class="bar-row"><span>' + esc(x.key) + "</span>" +
              '<span class="bar-track"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
              "<b>" + peso0(x.value) + "</b></div>"
            );
          })
          .join("")
      : dashEmpty("No paid volume yet.");

    $("#page").innerHTML =
      '<div class="wrap"><div class="page-head dash-page-head"><div>' +
      '<span class="eyebrow">' + icon("shield") + "Admin console</span>" +
      "<h1>Platform operations</h1>" +
      '<p>Signed in as ' + esc(state.session.email) + " · escrow, moderation, disputes, and support.</p></div>" +
      '<div class="row">' +
      '<a class="btn btn-ghost" href="marketplace.html">Open marketplace</a>' +
      '<a class="btn btn-ghost" href="login.html">Switch role</a>' +
      '<button class="btn btn-ghost" type="button" data-action="sign-out">Sign out</button>' +
      "</div></div>" +

      '<div class="dash-kpis">' +
      '<div class="dash-kpi is-accent"><span>Platform GMV</span><b>' + peso(m.gmv) + "</b><small>" + m.orders + " orders · net of refunds</small></div>" +
      '<div class="dash-kpi"><span>Held in escrow</span><b>' + peso(m.held) + "</b><small>Licensed PSP · awaiting validation</small></div>" +
      '<div class="dash-kpi"><span>Frozen exposure</span><b>' + peso(m.frozen) + "</b><small>" + disputes.length + " open dispute" + (disputes.length === 1 ? "" : "s") + "</small></div>" +
      '<div class="dash-kpi"><span>Commission earned</span><b>' + peso(m.commission) + "</b><small>8% · ₱20 minimum</small></div>" +
      "</div>" +

      alertHtml +

      '<div class="dash-layout">' +
      '<aside class="dash-side">' +
      '<div class="side-card dash-profile"><div class="dash-avatar is-admin">' + icon("shield") + "</div>" +
      "<b>Silicon Trading Ops</b>" +
      '<span class="side-sub">Demo administrator</span>' +
      '<span class="badge badge-verified">Full console</span>' +
      '<div class="side-rows">' +
      '<div><span>Active listings</span><b>' + m.activeListings + "</b></div>" +
      '<div><span>Pending review</span><b>' + m.pendingListings.length + "</b></div>" +
      '<div><span>Open disputes</span><b>' + disputes.length + "</b></div>" +
      '<div><span>Open tickets</span><b>' + openTickets.length + "</b></div>" +
      '<div><span>Reserve held</span><b>' + peso(m.reserveHeld) + "</b></div>" +
      "</div></div>" +

      '<nav class="side-card dash-nav"><div class="side-title">Queues</div>' +
      '<a href="#disputes">Disputes <span class="n">' + disputes.length + "</span></a>" +
      '<a href="#orders">Orders <span class="n">' + orders.length + "</span></a>" +
      '<a href="#listings">Moderation <span class="n">' + m.pendingListings.length + "</span></a>" +
      '<a href="#support">Support <span class="n">' + openTickets.length + "</span></a>" +
      '<a href="#sellers">Sellers <span class="n">' + sellers.length + "</span></a>" +
      '<a href="#mix">Market mix</a>' +
      "</nav>" +

      '<div class="side-card"><div class="side-title">Escrow posture</div>' +
      '<div class="escrow-posture"><div><span>Held</span><b>' + peso0(m.held) + "</b></div>" +
      '<div class="posture-track"><i style="width:' +
      ((m.held / Math.max(1, m.held + m.frozen)) * 100).toFixed(1) + '%"></i></div></div>' +
      '<div class="escrow-posture is-danger"><div><span>Frozen</span><b>' + peso0(m.frozen) + "</b></div>" +
      '<div class="posture-track"><i style="width:' +
      ((m.frozen / Math.max(1, m.held + m.frozen)) * 100).toFixed(1) + '%"></i></div></div>' +
      '<p class="small muted" style="margin-top:10px">Disputed funds stay with the licensed PSP until a ruling.</p></div>' +
      "</aside>" +

      '<div class="dash-main">' +
      dashPanel("disputes", "Disputes &amp; claims", "Refund or release — the platform never keeps disputed funds.",
        '<a class="btn btn-ghost btn-sm" href="support.html">Support desk</a>',
        '<div class="stack">' + disputeHtml + "</div>") +

      dashPanel("orders", "Escrow orders", "Every order and its current escrow state.",
        "",
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Item</th><th>Buyer</th><th>Total</th><th>Escrow</th><th>Status</th><th></th></tr></thead><tbody>' +
        orderRows + "</tbody></table></div>", true) +

      dashPanel("listings", "Listing moderation", "Approve new stock, pause suspect listings, restore appeals.",
        "",
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Listing</th><th>Seller</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>' +
        listingRows + "</tbody></table></div>", true) +

      dashPanel("support", "Support queue", openTickets.length + " open · " + resolvedTickets + " resolved",
        '<a class="btn btn-ghost btn-sm" href="support.html">Open desk</a>',
        '<div class="ticket-rows">' + ticketRows + "</div>") +

      dashPanel("sellers", "Sellers", "KYC, catalogue size, and lifetime GMV per seller.",
        '<a class="btn btn-ghost btn-sm" href="sell.html">Seller flow</a>',
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>Seller</th><th>City</th><th>Tier</th><th>KYC</th><th>Listings</th><th>GMV</th><th></th></tr></thead><tbody>' +
        sellerRows + "</tbody></table></div>", true) +

      dashPanel("mix", "Marketplace mix", "Paid GMV by category and the policy guardrails behind it.",
        "",
        '<div class="dash-split"><div class="bar-list">' + mixHtml + "</div>" +
        '<div class="policy-box"><div class="side-title">Policy guardrails</div>' +
        '<dl class="kv"><dt>Commission</dt><dd>8% · ₱20 minimum</dd>' +
        "<dt>Reserve</dt><dd>10% held 14 days</dd>" +
        "<dt>Validation</dt><dd>72 hours · every tier</dd>" +
        "<dt>DOA cover</dt><dd>7 days from delivery</dd>" +
        "<dt>Buyer KYC</dt><dd>Above ₱15,000 / month</dd>" +
        "<dt>Verified Pass</dt><dd>₱49 single · ₱399 Pro</dd></dl></div></div>") +
      "</div></div></div>";
  }

  /* ----------------------------------------------------------------------
     Global actions, routing, and boot
     ---------------------------------------------------------------------- */
  function toggleSaved(id) {
    const index = state.saved.indexOf(id);
    if (index === -1) {
      state.saved.push(id);
      toast("Saved to your account.", "success");
    } else {
      state.saved.splice(index, 1);
      toast("Removed from saved.");
    }
    persist("saved");
    const on = state.saved.indexOf(id) !== -1;
    $$('[data-action="toggle-saved"][data-id="' + id + '"]').forEach(function (btn) {
      btn.classList.toggle("is-on", on);
      if (btn.classList.contains("fav")) {
        btn.setAttribute("aria-label", on ? "Unsave listing" : "Save listing");
      } else {
        btn.innerHTML = icon("heart") + (on ? "Saved" : "Save");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
    });
    updateChrome();
    if (document.body.dataset.page === "account") renderAccount();
  }

  function removeChip(key) {
    if (key === "q") {
      mkt.q = "";
      const input = $("#mkt-q");
      if (input) input.value = "";
    }
    if (key === "category") mkt.category = "All";
    if (key === "grade") {
      mkt.grade = "All";
      const select = $("#f-grade");
      if (select) select.value = "All";
    }
    if (key === "max") {
      mkt.max = "";
      const range = $("#f-max");
      if (range) range.value = 8000;
      const label = $("#f-max-label");
      if (label) label.textContent = "Any";
    }
    if (key === "pass") {
      mkt.pass = false;
      const box = $("#f-pass");
      if (box) box.checked = false;
    }
    refreshMkt();
  }

  function handleGlobalClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === "toggle-saved") {
      e.preventDefault();
      toggleSaved(btn.dataset.id);
      return;
    }
    if (action === "sign-in") {
      state.profile.signedIn = true;
      state.session = { role: "buyer", email: state.profile.email, name: state.profile.name, at: Date.now() };
      writeKey(K.session, state.session);
      persist("profile");
      toast("Signed in as the demo buyer.", "success");
      renderPage();
      return;
    }
    if (action === "sign-out") {
      const wasRole = currentRole();
      state.session = null;
      writeKey(K.session, null);
      if (wasRole !== "buyer") {
        toast("Signed out of the " + PORTALS[wasRole].label + ".");
        location.href = "login.html";
        return;
      }
      state.profile.signedIn = false;
      persist("profile");
      toast("Signed out.");
      renderPage();
      return;
    }
    if (action === "verify") {
      const field = btn.dataset.field;
      if (!field) return;
      state.profile[field] = true;
      if (field === "payoutVerified" && !state.profile.payoutAccount) {
        state.profile.payoutAccount = "GCash · •••• 0142 (demo)";
      }
      persist("profile");
      toast("Demo verification complete.", "success");
      renderPage();
      return;
    }
    if (action === "plan") {
      activatePlan(btn.dataset.plan);
      return;
    }
    if (action === "cancel-plan") {
      state.profile.passPlan = "NONE";
      state.profile.passStartedAt = null;
      state.profile.passExpires = null;
      persist("profile");
      if (currentRole() === "seller") {
        updateSeller(state.session.sellerId, { tier: "Verified Seller" });
      }
      toast("Plan cancelled. Existing badges remain on published listings.");
      renderPage();
      return;
    }
    if (action === "resolve-ticket") {
      const ticket = state.tickets.find((t) => t.id === btn.dataset.id);
      if (!ticket) return;
      ticket.status = "RESOLVED";
      ticket.resolvedAt = Date.now();
      persist("tickets");
      toast("Ticket marked resolved.", "success");
      renderPage();
      return;
    }
    if (action === "order") {
      runOrderOp(btn.dataset.op, btn.dataset.id);
      return;
    }
    if (action === "mkt-reset") {
      resetMkt();
      return;
    }
    if (action === "remove-chip") {
      removeChip(btn.dataset.chip);
      return;
    }
    if (action === "copy-label") {
      const wrap = btn.closest(".label-code");
      const codeEl = wrap ? wrap.querySelector("span") : null;
      const code = codeEl ? codeEl.textContent.trim() : "";
      if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code).then(
          function () {
            toast("Return label code copied.", "success");
          },
          function () {
            toast("Copy blocked. Select the code manually.", "error");
          }
        );
      } else {
        toast("Copy blocked. Select the code manually.", "error");
      }
      return;
    }
    if (action === "reset-demo") {
      if (!window.confirm("Reset all demo data in this browser?")) return;
      Object.keys(K).forEach(function (key) {
        try {
          localStorage.removeItem(K[key]);
        } catch (err) {
          /* ignore */
        }
      });
      location.href = "index.html";
      return;
    }

    /* ---- portals ---- */
    if (action === "login-role") {
      loginRole = btn.dataset.role;
      renderLogin();
      return;
    }
    if (action === "login-fill") {
      if ($("#login-email") && $("#login-password") && PORTALS[loginRole]) {
        $("#login-email").value = PORTALS[loginRole].email;
        $("#login-password").value = PORTALS[loginRole].password;
        $("#login-error").hidden = true;
        toast("Demo credentials filled.", "success");
      }
      return;
    }
    if (action === "demo-login") {
      demoSignIn(btn.dataset.role);
      return;
    }

    /* ---- seller dashboard ---- */
    if (action === "seller-ship") {
      runOrderOp("ship", btn.dataset.id, renderSellerDash);
      return;
    }
    if (action === "seller-listing") {
      setListingStatus(btn.dataset.id, btn.dataset.op === "pause" ? "PAUSED" : "ACTIVE");
      renderSellerDash();
      return;
    }
    if (action === "seller-verify") {
      updateSeller(state.session.sellerId, {
        kyc: "VERIFIED",
        payoutAccount: sellerById(state.session.sellerId).payoutAccount || "GCash · •••• 0142 (demo)"
      });
      toast("Seller verification complete (demo).", "success");
      renderSellerDash();
      return;
    }

    /* ---- admin console ---- */
    if (action === "admin-listing") {
      const op = btn.dataset.op;
      setListingStatus(
        btn.dataset.id,
        op === "approve" ? "ACTIVE" : op === "pause" ? "PAUSED" : op === "remove" ? "REMOVED" : "ACTIVE"
      );
      renderAdminDash();
      return;
    }
    if (action === "admin-refund") {
      runOrderOp("resolve-refund", btn.dataset.id, renderAdminDash);
      return;
    }
    if (action === "admin-release") {
      runOrderOp("resolve-release", btn.dataset.id, renderAdminDash);
      return;
    }
    if (action === "admin-return-scan") {
      runOrderOp("return-scan", btn.dataset.id, renderAdminDash);
      return;
    }
    if (action === "admin-ticket-resolve") {
      const ticket = state.tickets.find((t) => t.id === btn.dataset.id);
      if (!ticket) return;
      ticket.status = "RESOLVED";
      ticket.resolvedAt = Date.now();
      persist("tickets");
      toast("Ticket marked resolved.", "success");
      renderAdminDash();
      return;
    }
    if (action === "admin-seller-verify") {
      updateSeller(btn.dataset.id, {
        kyc: "VERIFIED",
        payoutAccount: (sellerById(btn.dataset.id) || {}).payoutAccount || "GCash · •••• 0142 (demo)"
      });
      toast("Seller KYC approved (demo).", "success");
      renderAdminDash();
      return;
    }
    if (action === "admin-seller-status") {
      updateSeller(btn.dataset.id, { status: btn.dataset.status });
      toast("Seller " + (btn.dataset.status === "SUSPENDED" ? "suspended." : "restored."), "success");
      renderAdminDash();
      return;
    }
  }

  function sweepAutoRelease() {
    let changed = false;
    const now = Date.now();
    state.orders.forEach(function (order) {
      if (
        order.status === "DELIVERED" &&
        order.escrow === "HELD" &&
        order.validationEndsAt &&
        order.validationEndsAt <= now
      ) {
        order.status = "COMPLETED";
        order.escrow = "RELEASED";
        order.completedAt = now;
        order.timeline.push({
          at: now,
          label: "Escrow released automatically",
          detail: "72-hour validation window expired with no dispute"
        });
        changed = true;
      }
    });
    if (changed) persist("orders");
  }

  function tickCountdowns() {
    $$("[data-countdown]").forEach(function (el) {
      const end = Number(el.dataset.countdown);
      if (!end) return;
      const left = end - Date.now();
      el.textContent = el.dataset.format === "days" ? daysLeft(left) : clockLeft(left);
    });
  }

  function renderPage() {
    const page = document.body.dataset.page || "home";
    if (page === "marketplace") renderMarketplace();
    else if (page === "listing") renderListing();
    else if (page === "checkout") renderCheckout();
    else if (page === "orders") renderOrders();
    else if (page === "sell") renderSell();
    else if (page === "verified-pass") renderPass();
    else if (page === "support") renderSupport();
    else if (page === "account") renderAccount();
    else if (page === "login") renderLogin();
    else if (page === "seller-dashboard") renderSellerDash();
    else if (page === "admin") renderAdminDash();
    else renderHome();
    updateChrome();
  }

  function init() {
    loadState();
    sweepAutoRelease();
    renderHeader();
    renderFooter();
    renderPage();
    updateChrome();
    tickCountdowns();
    setInterval(tickCountdowns, 1000);
    document.addEventListener("click", handleGlobalClick);
    document.addEventListener("click", function (e) {
      $$("details.portal-menu[open]").forEach(function (menu) {
        if (!menu.contains(e.target)) menu.open = false;
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      $$("details.portal-menu[open]").forEach(function (menu) {
        menu.open = false;
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
