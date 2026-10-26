/* ==========================================================================
   Silicon Trading — demo data
   Everything here is fictional and seeded into localStorage on first run.
   ========================================================================== */

import { CATEGORY_IMAGES, POLICY, PORTALS } from "../core/config.js";

const HOUR = 3600e3;
const DAY = 864e5;

const DIAG_BASE = {
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
};

const DONOR_DIAG = {
  "Powers on": false,
  "Boots to OS": false,
  "Face ID / Touch ID": false,
  Charging: "Not tested",
  "Display & touch": "Not tested",
  Cameras: "Not tested",
  "Wi-Fi & Bluetooth": "Not tested",
  "Battery health": "—",
  "Water damage indicator": "Clean",
  "Serial / part number": "Matches listing"
};

function diagnostics(overrides) {
  return { ...DIAG_BASE, ...(overrides || {}) };
}

function evidence(date) {
  return [
    { label: "Boot video", meta: `0:15 · ${date}` },
    { label: "Serial macro", meta: "matches listing" },
    { label: "Function matrix", meta: "9 / 9 clips" },
    { label: "Diagnostic screen", meta: `captured ${date}` },
    { label: "Board markings", meta: "revision verified" },
    { label: "Packing photo", meta: "anti-static + foam" }
  ];
}

function sellers() {
  return [
    {
      id: "S-01",
      name: "Cebu Boardworks",
      email: "ops@cebuboardworks.ph",
      city: "Cebu",
      rating: 4.9,
      orders: 128,
      verified: true,
      pass: true,
      pro: true,
      response: "2h",
      since: "2024",
      joined: "2024-03-12",
      kyc: "VERIFIED",
      status: "ACTIVE",
      payoutAccount: "BDO · •••• 2207",
      payoutMethod: "InstaPay",
      tagline: "Board-level pulls with full video evidence."
    },
    {
      id: "S-02",
      name: "Quiapo Silicon Co.",
      email: "seller@silicon.trading",
      city: "Manila",
      rating: 4.8,
      orders: 412,
      verified: true,
      pass: true,
      pro: false,
      response: "3h",
      since: "2023",
      joined: "2023-08-04",
      kyc: "VERIFIED",
      status: "ACTIVE",
      payoutAccount: "BPI · •••• 8814",
      payoutMethod: "InstaPay",
      tagline: "Repair-grade stock from Manila's parts district."
    },
    {
      id: "S-03",
      name: "Davao Parts Lab",
      email: "hello@davaoparts.ph",
      city: "Davao",
      rating: 4.7,
      orders: 86,
      verified: true,
      pass: false,
      pro: false,
      response: "5h",
      since: "2025",
      joined: "2025-01-19",
      kyc: "VERIFIED",
      status: "ACTIVE",
      payoutAccount: "Metrobank · •••• 4402",
      payoutMethod: "PESONet",
      tagline: "Mindanao donor stock, honestly graded."
    },
    {
      id: "S-04",
      name: "Baguio Microspares",
      email: "parts@baguiomicro.ph",
      city: "Baguio",
      rating: 4.6,
      orders: 54,
      verified: true,
      pass: false,
      pro: false,
      response: "6h",
      since: "2025",
      joined: "2025-04-02",
      kyc: "VERIFIED",
      status: "ACTIVE",
      payoutAccount: "Landbank · •••• 7710",
      payoutMethod: "InstaPay",
      tagline: "Small components and hard-to-find ICs."
    },
    {
      id: "S-05",
      name: "Bacolod Board Co.",
      email: "team@bacolodboard.ph",
      city: "Bacolod",
      rating: null,
      orders: 0,
      verified: false,
      pass: false,
      pro: false,
      response: "—",
      since: "2026",
      joined: "2026-09-21",
      kyc: "PENDING",
      status: "ACTIVE",
      payoutAccount: "Security Bank · •••• 1952",
      payoutMethod: "PESONet",
      tagline: "New Visayas seller awaiting platform review."
    }
  ];
}

function listings() {
  const now = Date.now();

  return [
    {
      id: "L-1001",
      title: "iPhone 13 Pro Logic Board — A2638",
      category: "Motherboards",
      device: "iPhone 13 Pro",
      alias: "A2638",
      partNumber: "820-02941",
      price: 4850,
      grade: "B",
      condition: "OEM Pull",
      sellerId: "S-01",
      pass: true,
      auditedAt: "12 Oct 2026",
      evidence: evidence("12 Oct 2026"),
      notes: ["True Tone disabled", "Face ID paired and tested", "Minor shield cover scuff"],
      description:
        "Pulled from a working iPhone 13 Pro with a cracked display. Board is clean, boots to iOS, and passes the full function matrix. Ideal donor for a board-level repair or a straight swap.",
      diagnostics: diagnostics({ "Battery health": "89%" }),
      compat: ["iPhone 13 Pro"],
      water: false,
      stock: 1,
      shipsFrom: "Cebu",
      shipsIn: "2–4 days",
      views: 342,
      status: "ACTIVE",
      createdAt: now - 2 * DAY
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
      condition: "OEM Pull",
      sellerId: "S-02",
      pass: true,
      auditedAt: "09 Oct 2026",
      evidence: evidence("09 Oct 2026"),
      notes: ["No iCloud lock", "Battery health 91%", "Face ID matched to board"],
      description:
        "Clean OEM pull from a water-free unit. iCloud removed and verified. Every function in the listing diagnostics was tested before packing.",
      diagnostics: diagnostics({ "Battery health": "91%" }),
      compat: ["iPhone 12"],
      water: false,
      stock: 1,
      shipsFrom: "Manila",
      shipsIn: "2–3 days",
      views: 511,
      status: "ACTIVE",
      createdAt: now - 3 * DAY
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
      condition: "Used-Tested",
      sellerId: "S-02",
      pass: false,
      auditedAt: null,
      evidence: null,
      notes: ["Dual SIM tray included", "No water damage", "Fingerprint reader not included"],
      description:
        "Tested board pulled from a donor S22. Powers on, charges, and reads both SIM slots. Fingerprint calibration is not included — plan for a paired reader.",
      diagnostics: diagnostics({
        "Face ID / Touch ID": "Not included",
        "Battery health": "—"
      }),
      compat: ["Samsung Galaxy S22"],
      water: false,
      stock: 1,
      shipsFrom: "Manila",
      shipsIn: "3–5 days",
      views: 187,
      status: "ACTIVE",
      createdAt: now - 5 * DAY
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
      condition: "Used-Tested",
      sellerId: "S-03",
      pass: false,
      auditedAt: null,
      evidence: null,
      notes: ["Boots and charges", "No Google account lock", "Light oxidation near shield"],
      description:
        "Working 4G board with light oxidation near the shield. All core functions pass; cosmetic condition is reflected in the grade. Priced for volume repair work.",
      diagnostics: diagnostics({ "Battery health": "84%" }),
      compat: ["Redmi Note 11"],
      water: false,
      stock: 2,
      shipsFrom: "Davao",
      shipsIn: "3–5 days",
      views: 96,
      status: "ACTIVE",
      createdAt: now - 7 * DAY
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
      condition: "For Parts",
      sellerId: "S-01",
      pass: false,
      auditedAt: null,
      evidence: null,
      notes: ["Face ID not paired", "No boot — sold for harvest", "NAND and PMIC intact"],
      description:
        "Sold strictly for parts. Board does not boot, but the NAND, PMIC, and charging IC are intact and suitable for harvest. No returns for functional issues beyond the 7-day DOA cover.",
      diagnostics: { ...DONOR_DIAG },
      compat: ["iPhone 13 Pro Max"],
      water: false,
      stock: 1,
      shipsFrom: "Cebu",
      shipsIn: "2–4 days",
      views: 204,
      status: "ACTIVE",
      createdAt: now - 8 * DAY
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
      condition: "For Parts",
      sellerId: "S-04",
      pass: false,
      auditedAt: null,
      evidence: null,
      notes: ["Liquid damage history", "Good housing and connectors", "No boot"],
      description:
        "Liquid-damaged board with no boot. Useful for connectors, shields, and small passives. Photographed as-is so you know exactly what arrives.",
      diagnostics: { ...DONOR_DIAG, "Water damage indicator": "Triggered" },
      compat: ["iPhone 11"],
      water: true,
      stock: 1,
      shipsFrom: "Baguio",
      shipsIn: "3–6 days",
      views: 78,
      status: "ACTIVE",
      createdAt: now - 10 * DAY
    },
    {
      id: "L-1007",
      title: "Huawei P30 Pro Donor Board",
      category: "Donor Boards",
      device: "Huawei P30 Pro",
      alias: "VOG-L29",
      partNumber: "02352BNB",
      price: 980,
      grade: "C",
      condition: "For Parts",
      sellerId: "S-03",
      pass: false,
      auditedAt: null,
      evidence: null,
      notes: ["No power", "Display connector intact", "Useful for camera and charging assembly"],
      description:
        "Non-booting P30 Pro board. Sold for component harvest only. Connectors and camera assemblies are intact; the board itself is not a repair candidate.",
      diagnostics: { ...DONOR_DIAG, "Face ID / Touch ID": "Not tested" },
      compat: ["Huawei P30 Pro"],
      water: false,
      stock: 1,
      shipsFrom: "Davao",
      shipsIn: "3–5 days",
      views: 63,
      status: "ACTIVE",
      createdAt: now - 11 * DAY
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
      condition: "OEM Pull",
      sellerId: "S-02",
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
        Markings: "338S00509",
        Packaging: "Anti-static"
      },
      compat: ["iPhone 13 Pro", "iPhone 13 Pro Max"],
      water: false,
      stock: 4,
      shipsFrom: "Manila",
      shipsIn: "2–4 days",
      views: 421,
      status: "ACTIVE",
      createdAt: now - 1 * DAY
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
      condition: "OEM Pull",
      sellerId: "S-01",
      pass: true,
      auditedAt: "14 Oct 2026",
      evidence: evidence("14 Oct 2026"),
      notes: ["Underfill intact", "Pulled with thermal profile", "No bent balls"],
      description:
        "A15 Bionic pull with intact underfill, removed using a controlled thermal profile. Photographed under magnification before packing. For experienced reball/install work.",
      diagnostics: {
        "Visual inspection": "Passed under 10×",
        Underfill: "Intact",
        "Ball condition": "Original, straight",
        "Pulled from": "Working board",
        Markings: "APL1W07"
      },
      compat: ["iPhone 13 Pro", "iPhone 13 Pro Max"],
      water: false,
      stock: 1,
      shipsFrom: "Cebu",
      shipsIn: "2–4 days",
      views: 289,
      status: "ACTIVE",
      createdAt: now - 4 * DAY
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
      condition: "New",
      sellerId: "S-04",
      pass: false,
      auditedAt: null,
      evidence: null,
      notes: ["New old stock", "Tray sealed", "Tested for continuity"],
      description:
        "New old-stock Tristar charging IC for iPhone 11 / 12 repairs. Tray-sealed, continuity-checked, and stored dry. A staple for charging-fault diagnostics.",
      diagnostics: {
        "Visual inspection": "Passed",
        Condition: "New old stock",
        Continuity: "Checked",
        Markings: "1610A3",
        Packaging: "Sealed tray"
      },
      compat: ["iPhone 11", "iPhone 12"],
      water: false,
      stock: 12,
      shipsFrom: "Baguio",
      shipsIn: "3–6 days",
      views: 308,
      status: "ACTIVE",
      createdAt: now - 6 * DAY
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
      condition: "OEM Pull",
      sellerId: "S-01",
      pass: true,
      auditedAt: "11 Oct 2026",
      evidence: evidence("11 Oct 2026"),
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
      status: "ACTIVE",
      createdAt: now - 5 * DAY
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
      condition: "OEM Pull",
      sellerId: "S-02",
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
        OIS: true,
        "Lens condition": "Clean, micro-scuff on ring",
        Flash: "N/A",
        "Serial / part number": "Matches listing"
      },
      compat: ["iPhone 13 Pro"],
      water: false,
      stock: 1,
      shipsFrom: "Manila",
      shipsIn: "3–5 days",
      views: 153,
      status: "ACTIVE",
      createdAt: now - 9 * DAY
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
      condition: "OEM Pull",
      sellerId: "S-03",
      pass: false,
      auditedAt: null,
      evidence: null,
      notes: ["Face ID paired", "No iCloud lock", "Battery health 87%"],
      description:
        "OEM pull from a working 12 mini with a cracked rear glass. Boots, charges, and passes the core function matrix. Submitted for platform review before going live.",
      diagnostics: diagnostics({ "Battery health": "87%" }),
      compat: ["iPhone 12 mini"],
      water: false,
      stock: 1,
      shipsFrom: "Davao",
      shipsIn: "3–5 days",
      views: 0,
      status: "PENDING",
      createdAt: now - 1 * DAY
    }
  ];
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

function orders() {
  const now = Date.now();

  return [
    {
      id: "ST-2026-004184",
      listingId: "L-1008",
      title: "PMIC 338S00509 — iPhone 13 Series",
      image: CATEGORY_IMAGES.ICs,
      sellerId: "S-02",
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
      createdAt: now - 20 * HOUR,
      courier: "J&T Express",
      tracking: null,
      deliveredAt: null,
      validationEndsAt: null,
      doaEndsAt: null,
      extensionUsed: false,
      completedAt: null,
      address: { ...DEMO_ADDRESS },
      acknowledged: true,
      doaStatus: "NONE",
      returnLabel: null,
      timeline: [
        { at: now - 20 * HOUR, label: "Order placed", detail: "Payment received by the licensed PSP" },
        { at: now - 20 * HOUR, label: "Escrow held", detail: "₱500.00 held until the buyer validates the part" }
      ]
    },
    {
      id: "ST-2026-004182",
      listingId: "L-1002",
      title: "iPhone 12 Logic Board — A2402",
      image: CATEGORY_IMAGES.Motherboards,
      sellerId: "S-02",
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
      createdAt: now - 2 * DAY,
      courier: "J&T Express",
      tracking: "JT8823190045",
      deliveredAt: now - 20 * HOUR,
      validationEndsAt: now + 52 * HOUR,
      doaEndsAt: now + (7 * DAY - 20 * HOUR),
      extensionUsed: false,
      completedAt: null,
      address: { ...DEMO_ADDRESS },
      acknowledged: true,
      doaStatus: "NONE",
      returnLabel: null,
      timeline: [
        { at: now - 2 * DAY, label: "Order placed", detail: "Payment received by the licensed PSP" },
        { at: now - 2 * DAY, label: "Escrow held", detail: "₱3,130.00 held until you validate the part" },
        { at: now - 2 * DAY + 4 * HOUR, label: "Picked up by courier", detail: "J&T Express · JT8823190045" },
        { at: now - 20 * HOUR, label: "Delivered", detail: "72-hour validation window started" }
      ]
    },
    {
      id: "ST-2026-004183",
      listingId: "L-1004",
      title: "Redmi Note 11 Logic Board — 4G",
      image: CATEGORY_IMAGES.Motherboards,
      sellerId: "S-03",
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
      createdAt: now - 5 * DAY,
      courier: "J&T Express",
      tracking: "JT7712045588",
      deliveredAt: now - 4 * DAY,
      validationEndsAt: now - 1 * DAY,
      doaEndsAt: now + 3 * DAY,
      extensionUsed: false,
      completedAt: null,
      address: { ...DEMO_ADDRESS },
      acknowledged: true,
      doaStatus: "NONE",
      disputeReason:
        "Board powers on but there is no display output — the documented boot test does not match.",
      returnLabel: null,
      timeline: [
        { at: now - 5 * DAY, label: "Order placed", detail: "Payment received by the licensed PSP" },
        { at: now - 5 * DAY, label: "Escrow held", detail: "₱1,630.00 held until the buyer validates the part" },
        { at: now - 4.6 * DAY, label: "Picked up by courier", detail: "J&T Express · JT7712045588" },
        { at: now - 4 * DAY, label: "Delivered", detail: "72-hour validation window started" },
        { at: now - 1.2 * DAY, label: "Dispute opened", detail: "Escrow frozen · evidence review started" }
      ]
    },
    {
      id: "ST-2026-004181",
      listingId: "L-1010",
      title: "Tristar U2 IC 1610A3 — Charging",
      image: CATEGORY_IMAGES.ICs,
      sellerId: "S-04",
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
      createdAt: now - 7 * DAY,
      courier: "LBC Express",
      tracking: "LBC4471209831",
      deliveredAt: now - 5 * DAY,
      validationEndsAt: now - 2 * DAY,
      doaEndsAt: now + 2 * DAY,
      extensionUsed: false,
      completedAt: now - 2 * DAY,
      address: { ...DEMO_ADDRESS },
      acknowledged: true,
      doaStatus: "NONE",
      returnLabel: null,
      timeline: [
        { at: now - 7 * DAY, label: "Order placed", detail: "Payment received by the licensed PSP" },
        { at: now - 7 * DAY, label: "Escrow held", detail: "₱630.00 held until validation" },
        { at: now - 5 * DAY, label: "Delivered", detail: "72-hour validation window started" },
        { at: now - 2 * DAY, label: "Escrow released", detail: "Buyer validated · seller payable queued" }
      ]
    },
    {
      id: "ST-2026-004180",
      listingId: "L-1003",
      title: "Galaxy S22 Motherboard — SM-S901B",
      image: CATEGORY_IMAGES.Motherboards,
      sellerId: "S-02",
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
      createdAt: now - 49 * DAY,
      courier: "LBC Express",
      tracking: "LBC7712004412",
      deliveredAt: now - 46 * DAY,
      validationEndsAt: now - 43 * DAY,
      doaEndsAt: now - 39 * DAY,
      extensionUsed: false,
      completedAt: now - 44 * DAY,
      address: { ...DEMO_ADDRESS },
      acknowledged: true,
      doaStatus: "NONE",
      returnLabel: null,
      timeline: [
        { at: now - 49 * DAY, label: "Order placed", detail: "Payment received by the licensed PSP" },
        { at: now - 49 * DAY, label: "Escrow held", detail: "₱3,620.00 held until the buyer validated the part" },
        { at: now - 48 * DAY, label: "Picked up by courier", detail: "LBC Express · LBC7712004412" },
        { at: now - 46 * DAY, label: "Delivered", detail: "72-hour validation window started" },
        { at: now - 44 * DAY, label: "Escrow released", detail: "Buyer validated in 48 hours · seller paid" }
      ]
    }
  ];
}

function tickets() {
  const now = Date.now();
  return [
    {
      id: "T-2026-0913",
      subject: "Dispute — Redmi Note 11 board has no display output",
      category: "Dispute",
      orderId: "ST-2026-004183",
      sellerId: "S-03",
      message:
        "Buyer reports the board powers on but produces no display output. Escrow is frozen; evidence review is waiting on the seller's function-matrix upload.",
      status: "OPEN",
      createdAt: now - 1.2 * DAY,
      slaHours: POLICY.supportSlaHours,
      dueAt: now - 1.2 * DAY + POLICY.supportSlaHours * HOUR,
      resolvedAt: null
    },
    {
      id: "T-2026-0912",
      subject: "Courier delay — Cebu to Manila",
      category: "Shipping",
      orderId: "ST-2026-004181",
      sellerId: "S-04",
      message:
        "Parcel sat at the Cebu hub for two days. Support confirmed the delay and rebooked the pickup.",
      status: "RESOLVED",
      createdAt: now - 4 * DAY,
      slaHours: POLICY.supportSlaHours,
      dueAt: now - 4 * DAY + POLICY.supportSlaHours * HOUR,
      resolvedAt: now - 3.5 * DAY
    }
  ];
}

export function defaultProfile() {
  return {
    name: "Juan Dela Cruz",
    username: "juandc",
    avatar: "",
    email: "demo@silicon.trading",
    phone: "+63 917 555 0142",
    city: "Quezon City",
    region: "NCR",
    emailVerified: true,
    phoneVerified: true,
    buyerKyc: false,
    sellerKyc: false,
    payoutVerified: false,
    payoutAccount: "",
    twoFactor: false,
    buyerKycRequest: null,
    passRequest: null,
    passPlan: "NONE",
    passStartedAt: null,
    passExpires: null,
    demoVolumeBase: 8950,
    memberSince: Date.now() - 200 * DAY,
    address: { ...DEMO_ADDRESS }
  };
}

function accounts() {
  const created = Date.now() - 200 * DAY;
  const usernames = {
    buyer: "juandc",
    seller: "quiaposilicon",
    admin: "siliconops"
  };
  return Object.values(PORTALS).map((portal, index) => ({
    id: `A-${String(index + 1).padStart(2, "0")}`,
    role: portal.role,
    name: portal.name,
    username: usernames[portal.role] || "",
    avatar: "",
    email: portal.email,
    password: portal.password,
    createdAt: created,
    demo: true
  }));
}

export function buildSeed() {
  return {
    profile: defaultProfile(),
    sellers: sellers(),
    listings: listings(),
    orders: orders(),
    tickets: tickets(),
    saved: ["L-1001", "L-1011"],
    accounts: accounts(),
    session: null
  };
}

export { DEMO_ADDRESS };
