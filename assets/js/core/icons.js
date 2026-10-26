/* ==========================================================================
   Silicon Trading — inline icon set
   A single 24×24 stroke family keeps every page visually consistent.
   ========================================================================== */

const PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
  shield:
    '<path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6l7-3z"/><path d="M9.2 12.1l1.9 1.9 3.8-3.9"/>',
  "badge-check":
    '<path d="M12 2.8l2.3 1.7 2.8-.3 1.1 2.6 2.5 1.4-.8 2.7.8 2.7-2.5 1.4-1.1 2.6-2.8-.3L12 21.2l-2.3-1.7-2.8.3-1.1-2.6-2.5-1.4.8-2.7-.8-2.7 2.5-1.4 1.1-2.6 2.8.3L12 2.8z"/><path d="m8.8 12.2 2.1 2.1 4.3-4.4"/>',
  check: '<path d="M4.5 12.5l5 5L20 6.5"/>',
  "check-circle":
    '<circle cx="12" cy="12" r="9"/><path d="m8.4 12.2 2.4 2.4 4.8-4.9"/>',
  heart:
    '<path d="M12 20s-7-4.4-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.6 12 20 12 20z"/>',
  truck:
    '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  lock:
    '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  unlock:
    '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 7.4-2.1"/>',
  "arrow-right": '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  "arrow-left": '<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>',
  "arrow-up-right": '<path d="M7 17 17 7M8 7h9v9"/>',
  "chevron-right": '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
  "chevron-left": '<path d="m15 5.5-6.5 6.5L15 18.5"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  star:
    '<path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.6z"/>',
  alert:
    '<path d="M12 3.5 22 20H2L12 3.5z"/><path d="M12 9.5v4.5M12 17.4v.1"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.1"/>',
  box:
    '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  layers:
    '<path d="m12 3 9 4.5-9 4.5-9-4.5L12 3z"/><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/>',
  wallet:
    '<path d="M4 6.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/><path d="M16 12.5h4v4h-4a2 2 0 0 1 0-4z"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.8-3.5 3.8-5.5 7.5-5.5s6.7 2 7.5 5.5"/>',
  users:
    '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.7-3 3.2-4.6 5.5-4.6s4.8 1.6 5.5 4.6"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17 14.6c2 .5 3.3 2 3.7 4.4"/>',
  refresh:
    '<path d="M20 12a8 8 0 1 1-2.5-5.8"/><path d="M20 4v4.5h-4.5"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  camera:
    '<path d="M3.5 8.5h4l1.5-2h6l1.5 2h4v11h-17z"/><circle cx="12" cy="13.5" r="3.5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3.5h16V16"/>',
  pin:
    '<path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10z"/><circle cx="12" cy="11" r="2.2"/>',
  phone:
    '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 7 8.5-7"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5H5V5h5"/>',
  spark:
    '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',
  grid:
    '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  home:
    '<path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z"/>',
  store:
    '<path d="M4 9.5V20h16V9.5"/><path d="M3 9.5 5 4h14l2 5.5a2.5 2.5 0 0 1-4.4 1.8 2.5 2.5 0 0 1-4.2 0 2.5 2.5 0 0 1-4.2 0A2.5 2.5 0 0 1 3 9.5z"/><path d="M9.5 20v-5h5v5"/>',
  tag: '<path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5-8.5-8.5z"/><circle cx="8" cy="8" r="1.4"/>',
  cart:
    '<circle cx="9.5" cy="19" r="1.5"/><circle cx="17.5" cy="19" r="1.5"/><path d="M3 4h2.4l2.6 10.5h10.3L21 7H6"/>',
  chart:
    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  message:
    '<path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 9h8M8 12h5"/>',
  logout:
    '<path d="M10 4H4v16h6"/><path d="M14 8l4 4-4 4M9 12h9"/>',
  receipt:
    '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  filter: '<path d="M3.5 5h17l-6.5 7.5V20l-4-2v-5.5L3.5 5z"/>',
  eye:
    '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  "eye-off":
    '<path d="M4 4l16 16"/><path d="M9.9 5.7A10.8 10.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 4M6.3 7.8A17.4 17.4 0 0 0 2.5 12S6 18.5 12 18.5a10 10 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r=".8"/><circle cx="4" cy="12" r=".8"/><circle cx="4" cy="18" r=".8"/>',
  gauge:
    '<path d="M4.5 18a8 8 0 1 1 15 0"/><path d="M12 14l3.5-3.5"/><circle cx="12" cy="14" r="1.4"/>',
  gavel:
    '<path d="M4 20h8M6.5 16.5l5-5M8.5 4.5l4 4-2 2-4-4z"/><path d="m14 6 4 4 2-2-4-4zM12 8l5 5-2 2-5-5z"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
  package:
    '<path d="M4 8 12 4l8 4v8l-8 4-8-4V8z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  bank:
    '<path d="M3 9.5 12 4l9 5.5M4.5 9.5V19M9.5 9.5V19M14.5 9.5V19M19.5 9.5V19M3 21h18"/>',
  help:
    '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.1 1-1.1 1.9M12 17.2v.1"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  trash:
    '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
  play: '<path d="M8 5.5 18 12 8 18.5v-13z"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  sliders:
    '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  "chevron-up": '<path d="m6 15 6-6 6 6"/>',
  flame:
    '<path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3 1-6 1-7.5z"/>',
  globe:
    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5z"/>'
};

export function icon(name, className = "") {
  const path = PATHS[name] || PATHS.info;
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

export const hasIcon = (name) => Object.prototype.hasOwnProperty.call(PATHS, name);
