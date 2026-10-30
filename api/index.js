// server/app.ts
import { randomUUID as randomUUID2 } from "node:crypto";
import cookieParser from "cookie-parser";
import express from "express";
import { ZodError } from "zod";

// src/utils/date.ts
var VI_LOCALE = "vi-VN";
function toMs(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}
function addHours(base, hours) {
  return new Date(toMs(base) + hours * 36e5).toISOString();
}
function addDays(base, days) {
  return addHours(base, days * 24);
}
function dateTimeLabel(value) {
  const d = new Date(toMs(value));
  return new Intl.DateTimeFormat(VI_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(d);
}
function dateLabel(value) {
  const d = new Date(toMs(value));
  return new Intl.DateTimeFormat(VI_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(d);
}
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}

// src/data/services.ts
var pickup = {
  countryCode: "VN",
  search: "L\xF4 C2, Khu c\xF4ng nghi\u1EC7p Qu\u1EBF V\xF5",
  street: "L\xF4 C2, Khu c\xF4ng nghi\u1EC7p Qu\u1EBF V\xF5",
  postalCode: "220000",
  city: "B\u1EAFc Ninh",
  placeId: "demo-vn-bacninh-1",
  lat: 21.1861,
  lng: 106.0763
};
var delivery = {
  countryCode: "DE",
  search: "Bei den St. Pauli-Landungsbr\xFCcken 1",
  street: "Bei den St. Pauli-Landungsbr\xFCcken 1",
  postalCode: "20359",
  city: "Hamburg",
  placeId: "demo-de-hamburg-1",
  lat: 53.5461,
  lng: 9.9661
};
var SPECIAL_CARGO = [
  { id: "temperature", label: "H\xE0ng c\u1EA7n ki\u1EC3m so\xE1t nhi\u1EC7t \u0111\u1ED9" },
  { id: "dangerous", label: "H\xE0ng nguy hi\u1EC3m (DG)" },
  { id: "pharmaceutical", label: "D\u01B0\u1EE3c ph\u1EA9m, y t\u1EBF" },
  { id: "out-of-gauge", label: "H\xE0ng qu\xE1 kh\u1ED5 (OOG)" },
  { id: "heavy", label: "H\xE0ng n\u1EB7ng" },
  { id: "high-value", label: "H\xE0ng gi\xE1 tr\u1ECB cao" },
  { id: "perishable", label: "H\xE0ng d\u1EC5 h\u01B0 h\u1ECFng" },
  { id: "fragile", label: "H\xE0ng d\u1EC5 v\u1EE1" },
  { id: "live-animals", label: "\u0110\u1ED9ng v\u1EADt s\u1ED1ng" },
  { id: "other", label: "Y\xEAu c\u1EA7u \u0111\u1EB7c bi\u1EC7t kh\xE1c" }
];
var DEMO_READY = addDays(nowIso(), 1);
var DEMO_DEPARTURE = addDays(nowIso(), 6);
var departureDate = dateLabel(DEMO_DEPARTURE);
var SERVICES = [
  {
    id: "sea-lcl",
    name: "\u0110\u01B0\u1EDDng bi\u1EC3n LCL \u2014 h\xE0ng gh\xE9p",
    mode: "ocean",
    modeLabel: "\u0110\u01B0\u1EDDng bi\u1EC3n \xB7 LCL, gh\xE9p container",
    scope: "C\u1EA3ng \u0111i \u2192 C\u1EA3ng \u0111\u1EBFn (CFS \u2192 CFS), g\u1ED3m ph\xED n\xE2ng h\u1EA1 t\u1EA1i H\u1EA3i Ph\xF2ng.",
    customs: "Th\u1EE7 t\u1EE5c xu\u1EA5t kh\u1EA9u \u0111\xE3 bao g\u1ED3m; th\u1EE7 t\u1EE5c nh\u1EADp kh\u1EA9u t\u1EA1i EU b\u1EA1n t\u1EF1 th\u1EF1c hi\u1EC7n.",
    transitDays: [34, 38],
    emissionsKg: 620,
    emissionsNote: "CO\u2082e / 1.850 kg",
    priceVnd: 489e5,
    priceNote: "Gi\xE1 v\xED d\u1EE5, ch\u01B0a g\u1ED3m ph\u1EE5 ph\xED c\u1EA3ng. THC Hamburg 145 USD tr\u1EA3 t\u1EA1i c\u1EA3ng \u0111\u1EBFn.",
    eligible: true,
    badges: [
      { label: "Gi\xE1 th\u1EA5p nh\u1EA5t", tone: "success" },
      { label: "C\u1EA7n khai IMDG", tone: "warning" }
    ],
    conditions: [
      "Pin lithium nh\xF3m 9 ch\u1EC9 c\xF3 b\u1EA3n khi khai IMDG.",
      "Ph\u1EE5 ph\xED THC Hamburg 145 USD tr\u1EA3 t\u1EA1i c\u1EA3ng \u0111\u1EBFn."
    ],
    exclusions: ["Ch\u01B0a g\u1ED3m ph\xED c\u1EA3ng ph\xE1t sinh t\u1EA1i \u0111i\u1EC3m \u0111\u1EBFn ngo\xE0i THC."],
    departure: departureDate,
    arrival: dateLabel(addDays(DEMO_DEPARTURE, 36))
  },
  {
    id: "sea-fcl",
    name: "\u0110\u01B0\u1EDDng bi\u1EC3n FCL \u2014 container 20\u2019DC",
    mode: "ocean",
    modeLabel: "\u0110\u01B0\u1EDDng bi\u1EC3n \xB7 FCL, 1 \xD7 20\u2019DC",
    scope: "C\u1EA3ng \u0111i \u2192 C\u1EA3ng \u0111\u1EBFn (CY \u2192 CY), kh\xF4ng g\u1ED3m ph\xED n\xE2ng h\u1EA1 t\u1EA1i Hamburg.",
    customs: "Th\u1EE7 t\u1EE5c xu\u1EA5t kh\u1EA9u \u0111\xE3 bao g\u1ED3m; th\u1EE7 t\u1EE5c nh\u1EADp kh\u1EA9u t\u1EA1i EU b\u1EA1n t\u1EF1 th\u1EF1c hi\u1EC7n.",
    transitDays: [30, 34],
    emissionsKg: 480,
    emissionsNote: "CO\u2082e / 1.850 kg",
    priceVnd: 764e5,
    priceNote: "Gi\xE1 cho container \u0111\u1EA7y \u0111\u1EE7.",
    eligible: true,
    badges: [{ label: "\u0110\xF3ng nguy\xEAn container", tone: "accent" }],
    conditions: [
      "4,2 m\xB3 chi\u1EBFm kho\u1EA3ng 14% th\u1EC3 t\xEDch container 20\u2019DC \u2014 b\u1EA1n tr\u1EA3 cho ph\u1EA7n ch\u01B0a d\xF9ng."
    ],
    exclusions: ["Kh\xF4ng g\u1ED3m ph\xED n\xE2ng h\u1EA1 t\u1EA1i Hamburg."],
    departure: departureDate,
    arrival: dateLabel(addDays(DEMO_DEPARTURE, 32))
  },
  {
    id: "rail",
    name: "\u0110\u01B0\u1EDDng s\u1EAFt Trung Qu\u1ED1c \u2013 Ch\xE2u \xC2u",
    mode: "rail",
    modeLabel: "\u0110\u01B0\u1EDDng s\u1EAFt \xB7 Ga \u2192 Ga, qu\xE1 c\u1EA3nh Trung Qu\u1ED1c",
    scope: "Ga H\xE0 N\u1ED9i \u2192 Ga Hamburg, g\u1ED3m trung chuy\u1EC3n t\u1EA1i Tr\u1ECBnh Ch\xE2u.",
    customs: "Qu\xE1 c\u1EA3nh Trung Qu\u1ED1c \u0111\xE3 bao g\u1ED3m; th\u1EE7 t\u1EE5c nh\u1EADp kh\u1EA9u EU b\u1EA1n t\u1EF1 th\u1EF1c hi\u1EC7n.",
    transitDays: [22, 26],
    emissionsKg: 410,
    emissionsNote: "CO\u2082e / 1.850 kg",
    priceVnd: 632e5,
    priceNote: "Gi\xE1 v\xED d\u1EE5, ch\u01B0a g\u1ED3m l\u01B0u ga.",
    eligible: true,
    badges: [{ label: "Ph\xE1t th\u1EA3i th\u1EA5p nh\u1EA5t", tone: "success" }],
    conditions: [
      "C\xF3 th\u1EC3 l\u1EC7ch 3\u20135 ng\xE0y khi t\u1EAFc bi\xEAn.",
      "C\u1EA7n b\u1EA3n khai h\xE0ng nguy hi\u1EC3m nh\xF3m 9 v\xE0 ch\u1EE9ng t\u1EEB qu\xE1 c\u1EA3nh."
    ],
    exclusions: ["Ch\u01B0a g\u1ED3m l\u01B0u ga."],
    departure: departureDate,
    arrival: dateLabel(addDays(DEMO_DEPARTURE, 24))
  },
  {
    id: "air",
    name: "\u0110\u01B0\u1EDDng h\xE0ng kh\xF4ng \u2014 bay ti\u1EBFt ki\u1EC7m",
    mode: "air",
    modeLabel: "\u0110\u01B0\u1EDDng h\xE0ng kh\xF4ng \xB7 S\xE2n bay \u2192 S\xE2n bay",
    scope: "S\xE2n bay N\u1ED9i B\xE0i \u2192 S\xE2n bay Hamburg, trung chuy\u1EC3n t\u1EA1i Frankfurt.",
    customs: "Kh\xF4ng bao g\u1ED3m th\u1EE7 t\u1EE5c xu\u1EA5t kh\u1EA9u v\xE0 nh\u1EADp kh\u1EA9u.",
    transitDays: [4, 6],
    emissionsKg: 3120,
    emissionsNote: "CO\u2082e / 1.850 kg",
    priceVnd: 2145e5,
    priceNote: "Gi\xE1 v\xED d\u1EE5 theo c\xE2n n\u1EB7ng t\xEDnh ph\xED.",
    eligible: false,
    eligibilityNote: "Lo\u1EA1i tr\u1EEB: tuy\u1EBFn n\xE0y kh\xF4ng nh\u1EADn pin lithium nh\xF3m 9. N\u1EBFu v\u1EABn c\u1EA7n g\u1EEDi nhanh, h\xE3y t\xE1ch ki\u1EC7n ch\u1EE9a pin th\xE0nh l\xF4 ri\xEAng ho\u1EB7c d\xF9ng \u0111\u01B0\u1EDDng s\u1EAFt.",
    badges: [{ label: "Kh\xF4ng nh\u1EADn pin lithium nh\xF3m 9", tone: "danger" }],
    conditions: [],
    exclusions: ["Kh\xF4ng nh\u1EADn pin lithium nh\xF3m 9."],
    departure: departureDate,
    arrival: dateLabel(addDays(DEMO_DEPARTURE, 5))
  }
];
function serviceById(id) {
  return SERVICES.find((service) => service.id === id) ?? SERVICES[0];
}
var INITIAL_QUOTE = {
  handoff: "carrier-pickup",
  pickup,
  delivery,
  freightTerm: "prepaid",
  cargoType: "lcl",
  unitSystem: "metric",
  lines: [
    {
      id: "line-1",
      packageType: "Th\xF9ng carton",
      quantity: 12,
      weightKg: 154,
      lengthCm: 120,
      widthCm: 80,
      heightCm: 36
    }
  ],
  containerId: "LCL",
  handling: "special",
  specialTypes: ["dangerous"],
  customerType: "business",
  companyName: "An Ph\xE1t Logistics",
  contactName: "Nguy\u1EC5n Thu H\xE0",
  email: "ha.nguyen@anphatlog.vn",
  phone: "+84 912 448 703",
  marketingOptIn: true,
  termsAccepted: false
};

// server/auth.ts
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// server/config.ts
process.env.TZ = process.env.TZ || "Asia/Ho_Chi_Minh";
var SESSION_COOKIE = "vietra_session";
var SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
var isVercel = process.env.VERCEL === "1";
var isProduction = isVercel || process.env.NODE_ENV === "production";
var DEMO_EMAIL = "customer@vietra.vn";
var DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "VieTra@2026";
var DEMO_NAME = "Nguy\u1EC5n Thu H\xE0";
var DEMO_COMPANY = "An Ph\xE1t Logistics";
function authSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (isProduction) {
    throw new Error("AUTH_SECRET ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh cho m\xF4i tr\u01B0\u1EDDng production.");
  }
  return "vietra-local-dev-secret-change-me-32-chars";
}
function databaseUrl() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (url) return url;
  if (isProduction) {
    throw new Error("TURSO_DATABASE_URL ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh cho m\xF4i tr\u01B0\u1EDDng production.");
  }
  return "file:./.data/vietra.db";
}
function databaseAuthToken() {
  const token = process.env.TURSO_AUTH_TOKEN?.trim();
  if (token) return token;
  if (isProduction && databaseUrl().startsWith("libsql://")) {
    throw new Error("TURSO_AUTH_TOKEN ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh cho database Turso.");
  }
  return void 0;
}
function adminEmail() {
  return (process.env.ADMIN_EMAIL?.trim() || "admin@vietra.vn").toLowerCase();
}
function adminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (password) return password;
  if (isProduction) {
    throw new Error("ADMIN_PASSWORD ch\u01B0a \u0111\u01B0\u1EE3c c\u1EA5u h\xECnh cho t\xE0i kho\u1EA3n admin production.");
  }
  return "VieTra@2026";
}

// server/auth.ts
function secretKey() {
  return new TextEncoder().encode(authSecret());
}
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
async function verifyPassword(hash, password) {
  return bcrypt.compare(password, hash);
}
async function createSessionToken(user) {
  return new SignJWT({
    role: user.role,
    email: user.email,
    name: user.name,
    company: user.company
  }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setIssuer("vietra").setAudience("vietra-web").setExpirationTime(`${SESSION_TTL_SECONDS}s`).sign(secretKey());
}
function setSessionCookie(req, res, token) {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1e3
  });
}
function clearSessionCookie(req, res) {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/"
  });
}
function toAuthUser(row) {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    company: row.company == null ? null : String(row.company),
    role: String(row.role)
  };
}
async function readSessionUser(req, db) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "vietra",
      audience: "vietra-web"
    });
    if (!payload.sub) return null;
    const result = await db.execute({
      sql: "SELECT id, email, name, company, role FROM users WHERE id = ?",
      args: [payload.sub]
    });
    const row = result.rows[0];
    if (!row) return null;
    return toAuthUser(row);
  } catch {
    return null;
  }
}
function requireAuth(db) {
  return async (req, res, next) => {
    const user = await readSessionUser(req, db);
    if (!user) {
      res.status(401).json({
        error: { code: "UNAUTHENTICATED", message: "Phi\xEAn \u0111\u0103ng nh\u1EADp kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n." }
      });
      return;
    }
    ;
    req.user = user;
    next();
  };
}
function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user || user.role !== "admin") {
    res.status(403).json({
      error: { code: "FORBIDDEN", message: "Ch\u1EC9 t\xE0i kho\u1EA3n admin \u0111\u01B0\u1EE3c th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y." }
    });
    return;
  }
  next();
}

// server/bookingRules.ts
import { randomInt, randomUUID } from "node:crypto";

// src/sim/geo.ts
var EARTH_RADIUS_KM = 6371;
function toRad(deg) {
  return deg * Math.PI / 180;
}
function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
function preparePath(points) {
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumulative.push(cumulative[i - 1] + haversineKm(points[i - 1], points[i]));
  }
  return { points, cumulative, totalKm: cumulative[cumulative.length - 1] ?? 0 };
}

// src/data/routes.ts
var SPEED = { road: 38, ocean: 21, air: 700, rail: 17 };
function wp(name, code, kind, lat, lng) {
  return { name, code, kind, lat, lng };
}
function makeLegs(shipmentId, startAt, specs) {
  let cursor = startAt;
  return specs.map((spec, index) => {
    const points = spec.path.map(([lat, lng]) => ({ lat, lng }));
    const distanceKm = preparePath(points).totalKm;
    const speedKmh = SPEED[spec.mode];
    const plannedDeparture = cursor;
    const plannedArrival = addHours(cursor, distanceKm / speedKmh);
    const waitAfterHours = spec.waitAfterHours ?? 0;
    cursor = addHours(plannedArrival, waitAfterHours);
    return {
      id: `${shipmentId}-leg-${index + 1}`,
      mode: spec.mode,
      label: spec.label,
      from: spec.from,
      to: spec.to,
      path: points,
      plannedDeparture,
      plannedArrival,
      speedKmh,
      waitAfterHours
    };
  });
}
var PICKUP = wp("Kho B\u1EAFc Ninh", "WAREHOUSE-BN", "warehouse", 21.1861, 106.0763);
var CONSIGNEE = wp("Kho ng\u01B0\u1EDDi nh\u1EADn \u2014 Billbrook", "CONSIGNEE-HH", "consignee", 53.5292, 10.1012);
function oceanSpecs() {
  const haiPhong = wp("C\u1EA3ng H\u1EA3i Ph\xF2ng", "VNDDU", "port", 20.865, 106.7);
  const singapore = wp("C\u1EA3ng Singapore", "SGSIN", "hub", 1.2644, 103.8403);
  const hamburg = wp("C\u1EA3ng Hamburg", "DEHAM", "port", 53.5461, 9.9661);
  return [
    {
      mode: "road",
      label: "Ch\u1EB7ng n\u1ED9i \u0111\u1ECBa Vi\u1EC7t Nam",
      from: PICKUP,
      to: haiPhong,
      path: [
        [21.1861, 106.0763],
        [21.06, 106.32],
        [20.95, 106.55],
        [20.865, 106.7]
      ]
    },
    {
      mode: "ocean",
      label: "H\u1EA3i Ph\xF2ng \u2192 Singapore",
      from: haiPhong,
      to: singapore,
      waitAfterHours: 18,
      path: [
        [20.865, 106.7],
        [16.2, 108.6],
        [11.5, 107],
        [6, 105.5],
        [1.2644, 103.8403]
      ]
    },
    {
      mode: "ocean",
      label: "Singapore \u2192 Hamburg (Suez)",
      from: singapore,
      to: hamburg,
      waitAfterHours: 6,
      path: [
        [1.2644, 103.8403],
        [5.5, 95],
        [8, 78],
        [12.6, 43.5],
        [19.5, 37.5],
        [27.5, 34],
        [30.5, 32.5],
        [33, 31.5],
        [35.5, 24],
        [37, 12],
        [36, -5.6],
        [35.5, -9.5],
        [43, -9.5],
        [48, -6],
        [49.8, -4],
        [50, 0],
        [51, 2.5],
        [53.5, 8],
        [53.5461, 9.9661]
      ]
    },
    {
      mode: "road",
      label: "Giao h\xE0ng ch\u1EB7ng cu\u1ED1i",
      from: hamburg,
      to: CONSIGNEE,
      path: [
        [53.5461, 9.9661],
        [53.54, 10.03],
        [53.5292, 10.1012]
      ]
    }
  ];
}
function airSpecs() {
  const noiBai = wp("S\xE2n bay N\u1ED9i B\xE0i", "HAN", "airport", 21.2187, 105.8042);
  const frankfurt = wp("S\xE2n bay Frankfurt", "FRA", "hub", 50.0379, 8.5622);
  const hamburgAirport = wp("S\xE2n bay Hamburg", "HAM", "airport", 53.6304, 9.9882);
  return [
    {
      mode: "road",
      label: "Ch\u1EB7ng n\u1ED9i \u0111\u1ECBa Vi\u1EC7t Nam",
      from: PICKUP,
      to: noiBai,
      waitAfterHours: 60,
      path: [
        [21.1861, 106.0763],
        [21.21, 105.95],
        [21.2187, 105.8042]
      ]
    },
    {
      mode: "air",
      label: "N\u1ED9i B\xE0i \u2192 Frankfurt",
      from: noiBai,
      to: frankfurt,
      waitAfterHours: 4,
      path: [
        [21.2187, 105.8042],
        [27, 100],
        [34, 90],
        [41, 76],
        [46.5, 60],
        [49.5, 40],
        [50.5, 20],
        [50.0379, 8.5622]
      ]
    },
    {
      mode: "air",
      label: "Frankfurt \u2192 Hamburg",
      from: frankfurt,
      to: hamburgAirport,
      waitAfterHours: 3,
      path: [
        [50.0379, 8.5622],
        [51.8, 9.2],
        [52.8, 9.7],
        [53.6304, 9.9882]
      ]
    },
    {
      mode: "road",
      label: "Giao h\xE0ng ch\u1EB7ng cu\u1ED1i",
      from: hamburgAirport,
      to: CONSIGNEE,
      path: [
        [53.6304, 9.9882],
        [53.58, 10.05],
        [53.5292, 10.1012]
      ]
    }
  ];
}
function railSpecs() {
  const haNoiStation = wp("Ga H\xE0 N\u1ED9i", "VN-HAN", "hub", 21.0245, 105.8412);
  const zhengzhou = wp("Ga Tr\u1ECBnh Ch\xE2u", "CN-ZZ", "hub", 34.7466, 113.6254);
  const hamburgStation = wp("Ga Hamburg", "DE-HH", "hub", 53.5526, 10.0067);
  return [
    {
      mode: "road",
      label: "Ch\u1EB7ng n\u1ED9i \u0111\u1ECBa Vi\u1EC7t Nam",
      from: PICKUP,
      to: haNoiStation,
      waitAfterHours: 8,
      path: [
        [21.1861, 106.0763],
        [21.1, 105.95],
        [21.0245, 105.8412]
      ]
    },
    {
      mode: "rail",
      label: "H\xE0 N\u1ED9i \u2192 Tr\u1ECBnh Ch\xE2u",
      from: haNoiStation,
      to: zhengzhou,
      waitAfterHours: 10,
      path: [
        [21.0245, 105.8412],
        [23.5, 108.3],
        [26, 110.5],
        [30, 112],
        [34.7466, 113.6254]
      ]
    },
    {
      mode: "rail",
      label: "Tr\u1ECBnh Ch\xE2u \u2192 Hamburg",
      from: zhengzhou,
      to: hamburgStation,
      path: [
        [34.7466, 113.6254],
        [40, 105],
        [45, 98],
        [48, 85],
        [51, 70],
        [52.5, 50],
        [53, 30],
        [53.2, 15],
        [53.5526, 10.0067]
      ]
    },
    {
      mode: "road",
      label: "Giao h\xE0ng ch\u1EB7ng cu\u1ED1i",
      from: hamburgStation,
      to: CONSIGNEE,
      path: [
        [53.5526, 10.0067],
        [53.54, 10.06],
        [53.5292, 10.1012]
      ]
    }
  ];
}
function buildLegs(shipmentId, mode, startAt) {
  if (mode === "air") return makeLegs(shipmentId, startAt, airSpecs());
  if (mode === "rail") return makeLegs(shipmentId, startAt, railSpecs());
  return makeLegs(shipmentId, startAt, oceanSpecs());
}
function buildShipment(seed) {
  const legs = buildLegs(seed.id, seed.mode, seed.startAt);
  return {
    id: seed.id,
    code: seed.code,
    customer: seed.customer,
    serviceName: seed.serviceName,
    mode: seed.mode,
    handoff: seed.handoff,
    handoverNote: seed.handoff === "deliver-to-warehouse" ? `Cut-off nh\u1EADp kho: ${dateTimeLabel(seed.handoverAt)}` : `Xe ${seed.vehicleName} d\u1EF1 ki\u1EBFn \u0111\u1EBFn l\u1EA5y h\xE0ng: ${dateTimeLabel(seed.handoverAt)}`,
    handoverAt: seed.handoverAt,
    handoverConfirmedAt: seed.handoverConfirmedAt,
    status: seed.status,
    legs,
    origin: legs[0].from.name,
    destination: legs[legs.length - 1].to.name,
    cargoSummary: seed.cargoSummary,
    specialCargo: seed.specialCargo,
    vehicleName: seed.vehicleName,
    vehiclePlate: seed.vehiclePlate,
    createdAt: addDays(seed.startAt, -2)
  };
}

// src/features/bookings/documents.ts
var TRANSPORT_SLOT = {
  ocean: {
    id: "transport",
    label: "V\u1EADn \u0111\u01A1n \u0111\u01B0\u1EDDng bi\u1EC3n (B/L)",
    hint: "B\u1EA3n nh\xE1p B/L ho\u1EB7c booking confirmation c\u1EE7a h\xE3ng t\xE0u."
  },
  air: {
    id: "transport",
    label: "V\u1EADn \u0111\u01A1n h\xE0ng kh\xF4ng (AWB)",
    hint: "AWB ho\u1EB7c x\xE1c nh\u1EADn ch\u1ED7 c\u1EE7a h\xE3ng bay."
  },
  rail: {
    id: "transport",
    label: "V\u1EADn \u0111\u01A1n \u0111\u01B0\u1EDDng s\u1EAFt (CIM/SMGS)",
    hint: "Ch\u1EE9ng t\u1EEB v\u1EADn t\u1EA3i \u0111\u01B0\u1EDDng s\u1EAFt ho\u1EB7c x\xE1c nh\u1EADn booking."
  }
};
function requiredDocumentSlots(input) {
  const slots = [
    {
      id: "invoice",
      label: "H\xF3a \u0111\u01A1n th\u01B0\u01A1ng m\u1EA1i",
      hint: "Commercial invoice c\xF3 ch\u1EEF k\xFD ho\u1EB7c \u0111\xF3ng d\u1EA5u c\u1EE7a ng\u01B0\u1EDDi b\xE1n.",
      required: true
    },
    {
      id: "packing",
      label: "Packing list",
      hint: "Danh s\xE1ch ki\u1EC7n, tr\u1ECDng l\u01B0\u1EE3ng v\xE0 th\u1EC3 t\xEDch t\u1EEBng d\xF2ng h\xE0ng.",
      required: true
    },
    {
      ...TRANSPORT_SLOT[input.mode],
      required: true
    }
  ];
  if (input.specialTypes.includes("dangerous")) {
    slots.push(
      {
        id: "msds",
        label: "MSDS pin lithium",
        hint: "B\u1EA3n MSDS \u0111\u1EA7y \u0111\u1EE7 cho h\xE0ng nguy hi\u1EC3m nh\xF3m 9.",
        required: true
      },
      {
        id: "dg-declaration",
        label: "Khai b\xE1o h\xE0ng nguy hi\u1EC3m",
        hint: "B\u1EA3n khai IMDG/IATA k\xFD b\u1EDFi ng\u01B0\u1EDDi g\u1EEDi.",
        required: true
      }
    );
  }
  if (input.cargoInsurance) {
    slots.push({
      id: "insurance",
      label: "Ch\u1EE9ng nh\u1EADn b\u1EA3o hi\u1EC3m h\xE0ng h\xF3a",
      hint: "Gi\u1EA5y ch\u1EE9ng nh\u1EADn b\u1EA3o hi\u1EC3m theo gi\xE1 tr\u1ECB \u0111\xE3 khai b\xE1o.",
      required: true
    });
  }
  return slots;
}
function documentForSlot(documents, slotId) {
  return documents.find((document) => document.slotId === slotId);
}
function documentState(documents, slots) {
  const requiredSlots = slots.filter((slot) => slot.required);
  const files = requiredSlots.map((slot) => documentForSlot(documents, slot.id)).filter((document) => Boolean(document));
  const missing = requiredSlots.filter((slot) => !documentForSlot(documents, slot.id));
  const needsFix = files.filter((document) => document.status === "needs-fix");
  const verified = files.filter((document) => document.status === "verified").length;
  const pending = files.filter((document) => document.status === "pending").length;
  return {
    required: requiredSlots.length,
    verified,
    pending,
    missing,
    needsFix,
    ready: requiredSlots.length > 0 && missing.length === 0 && needsFix.length === 0 && verified === requiredSlots.length
  };
}

// src/utils/format.ts
var vnd = new Intl.NumberFormat("vi-VN", {
  style: "decimal",
  maximumFractionDigits: 0
});
function lineVolumeM3(line) {
  const perUnit = line.lengthCm * line.widthCm * line.heightCm / 1e6;
  return perUnit * line.quantity;
}
function totalVolume(lines) {
  return lines.reduce((sum, line) => sum + lineVolumeM3(line), 0);
}
function totalWeight(lines) {
  return lines.reduce((sum, line) => sum + line.weightKg * line.quantity, 0);
}

// server/bookingRules.ts
var CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function bookingDocumentSlots(booking) {
  const service = serviceById(booking.serviceId);
  return requiredDocumentSlots({
    mode: service.mode,
    specialTypes: booking.quote.specialTypes,
    cargoInsurance: booking.addons.cargoInsurance
  });
}
function cargoSummaryFor(booking) {
  const count = booking.quote.lines.reduce((sum, line) => sum + line.quantity, 0);
  return `${count} ki\u1EC7n \xB7 ${totalVolume(booking.quote.lines).toFixed(1).replace(".", ",")} m\xB3 \xB7 ${Math.round(totalWeight(booking.quote.lines)).toLocaleString("vi-VN")} kg`;
}
function buildShipmentForBooking(booking, code, shipmentId = `shp-${randomUUID()}`) {
  const service = serviceById(booking.serviceId);
  const startAt = booking.route.pickupDate || addDays(nowIso(), 2);
  const handoverAt = addHours(
    startAt,
    booking.quote.handoff === "deliver-to-warehouse" ? -6 : -2
  );
  const special = booking.quote.specialTypes.map((id) => SPECIAL_CARGO.find((item) => item.id === id)?.label).filter((label) => Boolean(label));
  return buildShipment({
    id: shipmentId,
    code,
    customer: booking.contact.companyName || booking.contact.fullName,
    serviceName: service.name,
    mode: service.mode,
    handoff: booking.quote.handoff,
    startAt,
    handoverAt,
    handoverConfirmedAt: null,
    status: "awaiting-handover",
    cargoSummary: cargoSummaryFor(booking),
    specialCargo: special,
    vehicleName: "Xe t\u1EA3i 8T \u2014 \u0111\u1ED9i Mi\u1EC1n B\u1EAFc",
    vehiclePlate: "15C-228.14"
  });
}
async function createTrackingCode(db) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const suffix = Array.from(
      { length: 6 },
      () => CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]
    ).join("");
    const code = `VIE${suffix}`;
    const result = await db.execute({
      sql: "SELECT 1 FROM shipments WHERE code = ? LIMIT 1",
      args: [code]
    });
    if (result.rows.length === 0) return code;
  }
  throw new Error("Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c m\xE3 v\u1EADn t\u1EA3i duy nh\u1EA5t.");
}
function makeNotification(input) {
  return {
    ...input,
    id: `notif-${randomUUID()}`,
    createdAt: nowIso(),
    read: false
  };
}
async function insertNotification(db, userId, notification, dedupeKey = null) {
  const result = await db.execute({
    sql: "INSERT OR IGNORE INTO notifications (id, user_id, type, dedupe_key, read, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [
      notification.id,
      userId,
      notification.type,
      dedupeKey,
      notification.read ? 1 : 0,
      JSON.stringify(notification),
      notification.createdAt
    ]
  });
  return result.rowsAffected > 0;
}
async function insertShipment(db, ownerId, shipment) {
  await db.execute({
    sql: "INSERT INTO shipments (id, user_id, code, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [
      shipment.id,
      ownerId,
      shipment.code,
      JSON.stringify(shipment),
      shipment.createdAt,
      nowIso()
    ]
  });
}
async function updateBooking(db, booking) {
  await db.execute({
    sql: "UPDATE bookings SET status = ?, tracking_code = ?, shipment_id = ?, data = ?, updated_at = ? WHERE id = ?",
    args: [
      booking.status,
      booking.code ?? null,
      booking.shipmentId ?? null,
      JSON.stringify(booking),
      nowIso(),
      booking.id
    ]
  });
}
async function syncBookingDocuments(db, booking, documents, ownerId) {
  const next = { ...booking, documents, ownerId };
  if (next.code) return { booking: next, notifications: [] };
  const state = documentState(documents, bookingDocumentSlots(next));
  const notifications = [];
  let shipment;
  if (state.ready) {
    const code = await createTrackingCode(db);
    shipment = buildShipmentForBooking(next, code);
    next.status = "confirmed";
    next.code = code;
    next.shipmentId = shipment.id;
    await insertShipment(db, ownerId, shipment);
    const service = serviceById(next.serviceId);
    notifications.push(
      makeNotification({
        type: "code-issued",
        title: `\u0110\xE3 c\u1EA5p m\xE3 ${code}`,
        detail: `${service.name} \xB7 ${next.quote.pickup.city} \u2192 ${next.quote.delivery.city}. M\u1EDF Theo d\xF5i \u0111\u1EC3 xem l\xF4 h\xE0ng.`,
        bookingId: next.id,
        shipmentCode: code
      })
    );
  } else {
    const status = state.needsFix.length > 0 || state.missing.length > 0 ? "needs-docs" : "awaiting-documents";
    next.status = status;
  }
  await updateBooking(db, next);
  for (const notification of notifications) {
    await insertNotification(db, ownerId, notification);
  }
  return { booking: next, shipment, notifications };
}

// server/db.ts
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import bcrypt2 from "bcryptjs";
import { createClient } from "@libsql/client";

// src/data/seed.ts
var anchor = nowIso();
function seedQuote(overrides = {}) {
  return {
    ...structuredClone(INITIAL_QUOTE),
    termsAccepted: true,
    ...overrides
  };
}
function seedDocument(slotId, name, sizeBytes, status = "verified", note) {
  return {
    id: `doc-${slotId}`,
    slotId,
    name,
    sizeBytes,
    status,
    note,
    uploadedAt: addDays(anchor, -1),
    verifiedAt: status === "verified" ? addDays(anchor, -1) : void 0
  };
}
function seedBooking(overrides) {
  const base = {
    id: overrides.id,
    status: "confirmed",
    createdAt: addDays(anchor, -16),
    quote: seedQuote(),
    contact: {
      customerType: "business",
      companyName: "An Ph\xE1t Logistics",
      fullName: "Nguy\u1EC5n Thu H\xE0",
      email: "ha.nguyen@anphatlog.vn",
      phone: "+84 912 448 703",
      marketingOptIn: true,
      termsAccepted: true
    },
    serviceId: "sea-lcl",
    addons: {
      exportCustoms: true,
      importCustoms: false,
      declarationLines: 2,
      cargoInsurance: true,
      insuredValue: 48e3,
      insuredCurrency: "USD",
      sustainability: "fuel",
      incoterm: "CIF"
    },
    route: {
      shipperSameAsPickup: true,
      consigneeSameAsDelivery: true,
      shipperAddress: structuredClone(INITIAL_QUOTE.pickup),
      consigneeAddress: structuredClone(INITIAL_QUOTE.delivery),
      pickupDate: addDays(anchor, -14)
    },
    billing: {
      companyName: "An Ph\xE1t Logistics",
      reference: "PO-2026-118",
      invoiceEmail: "invoice@anphatlog.vn",
      taxId: "0109876543",
      addressMode: "shipper",
      billingCompanyName: "",
      billingStreet: "",
      billingCity: "",
      billingState: "",
      billingPostalCode: "",
      billingCountry: "VN",
      recipients: ["procurement@anphatlog.vn"],
      shareConfirmed: true
    },
    documents: [
      seedDocument("invoice", "Hoa-don-thuong-mai.pdf", 311e3),
      seedDocument("packing", "Packing-list.pdf", 268e3),
      seedDocument("transport", "BL-draft.pdf", 118e4),
      seedDocument("msds", "MSDS-pin-lithium.pdf", 842e3),
      seedDocument("dg-declaration", "Khai-bao-hang-nguy-hiem.pdf", 41e4),
      seedDocument("insurance", "Chung-nhan-bao-hiem.pdf", 196e3)
    ]
  };
  return { ...base, ...overrides };
}
function createSeedState() {
  const oceanStart = addDays(anchor, -14);
  const oceanShipment = buildShipment({
    id: "shp-ocean-1",
    code: "VIE7K2M4A",
    customer: "An Ph\xE1t Logistics",
    serviceName: "\u0110\u01B0\u1EDDng bi\u1EC3n LCL \u2014 h\xE0ng gh\xE9p",
    mode: "ocean",
    handoff: "carrier-pickup",
    startAt: oceanStart,
    handoverAt: addHours(oceanStart, -3),
    handoverConfirmedAt: addHours(oceanStart, -3),
    status: "in-transit",
    cargoSummary: "12 ki\u1EC7n \xB7 4,2 m\xB3 \xB7 1.850 kg",
    specialCargo: ["Pin lithium UN3481 \u2014 nh\xF3m 9"],
    vehicleName: "Xe t\u1EA3i 8T \u2014 \u0111\u1ED9i Mi\u1EC1n B\u1EAFc",
    vehiclePlate: "15C-228.14"
  });
  const airStart = addDays(anchor, -7);
  const airShipment = buildShipment({
    id: "shp-air-1",
    code: "VIE5R8T1C",
    customer: "An Ph\xE1t Logistics",
    serviceName: "\u0110\u01B0\u1EDDng h\xE0ng kh\xF4ng \u2014 bay ti\u1EBFt ki\u1EC7m",
    mode: "air",
    handoff: "deliver-to-warehouse",
    startAt: airStart,
    handoverAt: addHours(airStart, -8),
    handoverConfirmedAt: addHours(airStart, -8),
    status: "delivered",
    cargoSummary: "6 ki\u1EC7n \xB7 1,1 m\xB3 \xB7 410 kg",
    specialCargo: [],
    vehicleName: "Xe t\u1EA3i 5T \u2014 \u0111\u1ED9i H\xE0 N\u1ED9i",
    vehiclePlate: "29C-664.03"
  });
  const awaitingStart = addHours(anchor, 22);
  const awaitingShipment = buildShipment({
    id: "shp-ocean-2",
    code: "VIE3N6B9D",
    customer: "An Ph\xE1t Logistics",
    serviceName: "\u0110\u01B0\u1EDDng bi\u1EC3n FCL \u2014 container 20\u2019DC",
    mode: "ocean",
    handoff: "deliver-to-warehouse",
    startAt: awaitingStart,
    handoverAt: addHours(anchor, 6),
    handoverConfirmedAt: null,
    status: "awaiting-handover",
    cargoSummary: "1 container 20\u2019DC \xB7 4,2 m\xB3 \xB7 1.850 kg",
    specialCargo: ["Pin lithium UN3481 \u2014 nh\xF3m 9"],
    vehicleName: "Xe t\u1EA3i 8T \u2014 \u0111\u1ED9i Mi\u1EC1n B\u1EAFc",
    vehiclePlate: "15C-228.14"
  });
  const bookings = [
    seedBooking({
      id: "bk-1",
      code: "VIE7K2M4A",
      shipmentId: oceanShipment.id,
      createdAt: addDays(anchor, -16),
      serviceId: "sea-lcl",
      route: {
        shipperSameAsPickup: true,
        consigneeSameAsDelivery: true,
        shipperAddress: structuredClone(INITIAL_QUOTE.pickup),
        consigneeAddress: structuredClone(INITIAL_QUOTE.delivery),
        pickupDate: oceanStart
      }
    }),
    seedBooking({
      id: "bk-2",
      code: "VIE5R8T1C",
      shipmentId: airShipment.id,
      createdAt: addDays(anchor, -9),
      serviceId: "air",
      quote: seedQuote({ handoff: "deliver-to-warehouse", handling: "general", specialTypes: [] }),
      documents: [
        seedDocument("invoice", "Hoa-don-thuong-mai-air.pdf", 288e3),
        seedDocument("packing", "Packing-list-air.pdf", 174e3),
        seedDocument("transport", "AWB-738-2211.pdf", 54e4),
        seedDocument("insurance", "Chung-nhan-bao-hiem-air.pdf", 202e3)
      ],
      route: {
        shipperSameAsPickup: true,
        consigneeSameAsDelivery: true,
        shipperAddress: structuredClone(INITIAL_QUOTE.pickup),
        consigneeAddress: structuredClone(INITIAL_QUOTE.delivery),
        pickupDate: airStart
      }
    }),
    seedBooking({
      id: "bk-3",
      code: "VIE3N6B9D",
      shipmentId: awaitingShipment.id,
      createdAt: addDays(anchor, -3),
      serviceId: "sea-fcl",
      quote: seedQuote({ handoff: "deliver-to-warehouse", cargoType: "fcl", containerId: "20GP" }),
      route: {
        shipperSameAsPickup: true,
        consigneeSameAsDelivery: true,
        shipperAddress: structuredClone(INITIAL_QUOTE.pickup),
        consigneeAddress: structuredClone(INITIAL_QUOTE.delivery),
        pickupDate: awaitingStart
      }
    }),
    seedBooking({
      id: "bk-4",
      status: "needs-docs",
      createdAt: addHours(anchor, -2),
      serviceId: "rail",
      quote: seedQuote({ handoff: "carrier-pickup" }),
      documents: [
        seedDocument("invoice", "Hoa-don-thuong-mai-rail.pdf", 301e3),
        seedDocument("packing", "Packing-list-rail.pdf", 212e3, "pending"),
        seedDocument("transport", "SMGS-draft.pdf", 78e4, "pending"),
        seedDocument(
          "msds",
          "MSDS-pin-lithium.pdf",
          842e3,
          "needs-fix",
          "Thi\u1EBFu trang 4 m\xF4 t\u1EA3 ph\xE2n lo\u1EA1i UN3481 \u2014 c\u1EA7n b\u1EA3n MSDS \u0111\u1EA7y \u0111\u1EE7."
        )
      ],
      route: {
        shipperSameAsPickup: true,
        consigneeSameAsDelivery: true,
        shipperAddress: structuredClone(INITIAL_QUOTE.pickup),
        consigneeAddress: structuredClone(INITIAL_QUOTE.delivery),
        pickupDate: addDays(anchor, 6)
      }
    })
  ];
  const scenarios = [
    {
      id: "sc-1",
      shipmentId: oceanShipment.id,
      legId: `${oceanShipment.id}-leg-1`,
      mode: "road",
      type: "congestion",
      label: "\xD9n t\u1EAFc gi\u1EDD cao \u0111i\u1EC3m t\u1EA1i H\u1EA3i Ph\xF2ng",
      severity: "medium",
      startAt: addHours(oceanStart, 1),
      endAt: addHours(oceanStart, 4),
      speedFactor: 0.45,
      extraWaitHours: 0,
      detourKm: 0,
      center: { lat: 20.95, lng: 106.55 },
      radiusKm: 22,
      active: true,
      createdAt: addDays(anchor, -17)
    },
    {
      id: "sc-2",
      shipmentId: oceanShipment.id,
      legId: `${oceanShipment.id}-leg-3`,
      mode: "ocean",
      type: "storm",
      label: "B\xE3o g\u1EA7n Bi\u1EC3n \u0110\u1ECF \u2014 gi\u1EA3m t\u1ED1c 40%",
      severity: "high",
      startAt: addHours(anchor, -24),
      endAt: addHours(anchor, 168),
      speedFactor: 0.6,
      extraWaitHours: 0,
      detourKm: 0,
      center: { lat: 23, lng: 39 },
      radiusKm: 2600,
      active: true,
      createdAt: addHours(anchor, -40)
    },
    {
      id: "sc-3",
      shipmentId: oceanShipment.id,
      legId: `${oceanShipment.id}-leg-3`,
      mode: "ocean",
      type: "port-congestion",
      label: "\xD9n c\u1EA3ng Hamburg \u2014 ch\u1EDD c\u1EADp c\u1EA3ng",
      severity: "medium",
      startAt: addHours(anchor, 456),
      endAt: addHours(anchor, 500),
      speedFactor: 0.75,
      extraWaitHours: 18,
      detourKm: 0,
      center: { lat: 53.5461, lng: 9.9661 },
      radiusKm: 120,
      active: true,
      createdAt: addHours(anchor, -20)
    },
    {
      id: "sc-4",
      shipmentId: oceanShipment.id,
      legId: `${oceanShipment.id}-leg-4`,
      mode: "road",
      type: "reroute",
      label: "\u0110\xF3ng \u0111\u01B0\u1EDDng A7 \u2014 \u0111i tuy\u1EBFn v\xF2ng",
      severity: "medium",
      startAt: addHours(anchor, 500),
      endAt: addHours(anchor, 514),
      speedFactor: 0.8,
      extraWaitHours: 0,
      detourKm: 28,
      center: { lat: 53.54, lng: 10.03 },
      radiusKm: 12,
      active: true,
      createdAt: addHours(anchor, -10)
    },
    {
      id: "sc-5",
      shipmentId: airShipment.id,
      legId: `${airShipment.id}-leg-2`,
      mode: "air",
      type: "air-delay",
      label: "Ho\xE3n chuy\u1EBFn bay sau khi \u0111\xE3 c\u1EA5t c\xE1nh",
      severity: "medium",
      startAt: addHours(airStart, 8),
      endAt: addHours(airStart, 12),
      speedFactor: 0.9,
      extraWaitHours: 0,
      detourKm: 0,
      radiusKm: 500,
      active: true,
      createdAt: addDays(anchor, -8)
    }
  ];
  const notifications = [
    {
      id: "notif-seed-docfix",
      type: "document-fix",
      title: "C\u1EA7n b\u1ED5 sung: MSDS pin lithium",
      detail: "Thi\u1EBFu trang 4 m\xF4 t\u1EA3 ph\xE2n lo\u1EA1i UN3481 \u2014 c\u1EA7n b\u1EA3n MSDS \u0111\u1EA7y \u0111\u1EE7.",
      createdAt: addHours(anchor, -2),
      read: false,
      bookingId: "bk-4"
    },
    {
      id: "notif-seed-alert-storm",
      type: "transport-alert",
      title: "B\xE3o g\u1EA7n Bi\u1EC3n \u0110\u1ECF \u2014 gi\u1EA3m t\u1ED1c 40%",
      detail: "Ch\u1EB7ng Singapore \u2192 Hamburg (Suez) gi\u1EA3m t\u1ED1c 40% do b\xE3o. ETA to\xE0n h\xE0nh tr\xECnh \u0111\u01B0\u1EE3c t\xEDnh l\u1EA1i theo t\xECnh hu\u1ED1ng \u0111ang hi\u1EC7u l\u1EF1c.",
      createdAt: addHours(anchor, -24),
      read: false,
      severity: "critical",
      shipmentCode: "VIE7K2M4A",
      legId: `${oceanShipment.id}-leg-3`,
      legLabel: "Singapore \u2192 Hamburg (Suez)",
      alertId: "alert-sc-2",
      simAt: addHours(anchor, -24)
    },
    {
      id: "notif-seed-code",
      type: "code-issued",
      title: "\u0110\xE3 c\u1EA5p m\xE3 VIE3N6B9D",
      detail: "\u0110\u01B0\u1EDDng bi\u1EC3n FCL \u2014 container 20\u2019DC \xB7 B\u1EAFc Ninh \u2192 Hamburg.",
      createdAt: addDays(anchor, -3),
      read: true,
      bookingId: "bk-3",
      shipmentCode: "VIE3N6B9D"
    },
    {
      id: "notif-seed-handover",
      type: "handover",
      title: "\u0110\xE3 b\xE0n giao t\u1EF1 \u0111\u1ED9ng \xB7 VIE7K2M4A",
      detail: "Xe t\u1EA3i 8T \u0111\xE3 l\u1EA5y h\xE0ng theo m\u1ED1c b\xE0n giao c\u1EE7a l\u1ECBch m\xF4 ph\u1ECFng.",
      createdAt: addHours(oceanStart, -3),
      read: true,
      bookingId: "bk-1",
      shipmentCode: "VIE7K2M4A"
    },
    {
      id: "notif-seed-alert-congestion",
      type: "transport-alert",
      title: "\xD9n t\u1EAFc gi\u1EDD cao \u0111i\u1EC3m t\u1EA1i H\u1EA3i Ph\xF2ng",
      detail: "Ch\u1EB7ng n\u1ED9i \u0111\u1ECBa Vi\u1EC7t Nam quanh H\u1EA3i Ph\xF2ng gi\u1EA3m t\u1ED1c c\xF2n 45% trong 3 gi\u1EDD. Xe v\xE0o v\xF9ng \xF9n t\u1EAFc n\xEAn ETA \u0111\u01B0\u1EE3c t\xEDnh l\u1EA1i.",
      createdAt: addHours(oceanStart, 1),
      read: true,
      severity: "warning",
      shipmentCode: "VIE7K2M4A",
      legId: `${oceanShipment.id}-leg-1`,
      legLabel: "Ch\u1EB7ng n\u1ED9i \u0111\u1ECBa Vi\u1EC7t Nam",
      alertId: "alert-sc-1",
      simAt: addHours(oceanStart, 1)
    }
  ];
  return {
    bookings,
    shipments: [oceanShipment, airShipment, awaitingShipment],
    scenarios,
    notifications
  };
}

// server/db.ts
var singleton = null;
function fileDirectory(url) {
  if (!url.startsWith("file:") || url.startsWith("file::memory:")) return null;
  const path = decodeURIComponent(url.slice("file:".length).split("?")[0]);
  if (!path) return null;
  return dirname(resolve(path));
}
function createDatabase(url = databaseUrl(), authToken = databaseAuthToken()) {
  const directory = fileDirectory(url);
  if (directory) mkdirSync(directory, { recursive: true });
  return createClient({ url, authToken });
}
function getDatabase() {
  if (!singleton) singleton = createDatabase();
  return singleton;
}
var SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
    created_at TEXT NOT NULL
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)",
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    tracking_code TEXT,
    shipment_id TEXT,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_code ON bookings(tracking_code)",
  "CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)",
  `CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_code ON shipments(code)",
  "CREATE INDEX IF NOT EXISTS idx_shipments_user ON shipments(user_id)",
  `CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    shipment_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  "CREATE INDEX IF NOT EXISTS idx_scenarios_user ON scenarios(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_scenarios_shipment ON scenarios(shipment_id)",
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    dedupe_key TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications(user_id, dedupe_key)",
  "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)"
];
async function migrateDatabase(db) {
  await db.batch(SCHEMA.map((sql) => ({ sql })), "write");
}
async function seedUsers(db) {
  const statements = [];
  const admin = await db.execute({
    sql: "SELECT id FROM users WHERE id = ?",
    args: ["usr-admin"]
  });
  if (admin.rows.length === 0) {
    statements.push({
      sql: "INSERT OR IGNORE INTO users (id, email, password_hash, name, company, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        "usr-admin",
        adminEmail(),
        await bcrypt2.hash(adminPassword(), 10),
        "Qu\u1EA3n tr\u1ECB VieTra",
        "VieTra Operations",
        "admin",
        (/* @__PURE__ */ new Date()).toISOString()
      ]
    });
  }
  const customer = await db.execute({
    sql: "SELECT id FROM users WHERE id = ?",
    args: ["usr-customer"]
  });
  if (customer.rows.length === 0) {
    statements.push({
      sql: "INSERT OR IGNORE INTO users (id, email, password_hash, name, company, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        "usr-customer",
        DEMO_EMAIL,
        await bcrypt2.hash(DEMO_PASSWORD, 10),
        DEMO_NAME,
        DEMO_COMPANY,
        "customer",
        (/* @__PURE__ */ new Date()).toISOString()
      ]
    });
  }
  if (statements.length > 0) await db.batch(statements, "write");
}
async function seedDatabase(db) {
  await seedUsers(db);
  const seed = createSeedState();
  const statements = [];
  for (const booking of seed.bookings) {
    statements.push({
      sql: "INSERT OR IGNORE INTO bookings (id, user_id, status, tracking_code, shipment_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        booking.id,
        "usr-customer",
        booking.status,
        booking.code ?? null,
        booking.shipmentId ?? null,
        JSON.stringify(booking),
        booking.createdAt,
        booking.createdAt
      ]
    });
  }
  for (const shipment of seed.shipments) {
    statements.push({
      sql: "INSERT OR IGNORE INTO shipments (id, user_id, code, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [
        shipment.id,
        "usr-customer",
        shipment.code,
        JSON.stringify(shipment),
        shipment.createdAt,
        shipment.createdAt
      ]
    });
  }
  for (const scenario of seed.scenarios) {
    statements.push({
      sql: "INSERT OR IGNORE INTO scenarios (id, user_id, shipment_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [
        scenario.id,
        "usr-customer",
        scenario.shipmentId,
        JSON.stringify(scenario),
        scenario.createdAt,
        scenario.createdAt
      ]
    });
  }
  for (const notification of seed.notifications) {
    statements.push({
      sql: "INSERT OR IGNORE INTO notifications (id, user_id, type, dedupe_key, read, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        notification.id,
        "usr-customer",
        notification.type,
        null,
        notification.read ? 1 : 0,
        JSON.stringify(notification),
        notification.createdAt
      ]
    });
  }
  if (statements.length > 0) await db.batch(statements, "write");
}
async function initDatabase(db) {
  await migrateDatabase(db);
  await seedDatabase(db);
}
async function resetDemoData(db) {
  await db.batch(
    [
      { sql: "DELETE FROM notifications" },
      { sql: "DELETE FROM scenarios" },
      { sql: "DELETE FROM shipments" },
      { sql: "DELETE FROM bookings" }
    ],
    "write"
  );
  await seedDatabase(db);
}
function parse(value) {
  return JSON.parse(String(value));
}
function rowToBooking(row) {
  const data = parse(row.data);
  return {
    ...data,
    id: String(row.id),
    ownerId: String(row.user_id),
    status: String(row.status),
    code: row.tracking_code == null ? void 0 : String(row.tracking_code),
    shipmentId: row.shipment_id == null ? void 0 : String(row.shipment_id),
    createdAt: String(row.created_at)
  };
}
function rowToShipment(row) {
  const data = parse(row.data);
  return {
    ...data,
    id: String(row.id),
    code: String(row.code),
    createdAt: String(row.created_at)
  };
}
function rowToScenario(row) {
  const data = parse(row.data);
  return { ...data, id: String(row.id) };
}
function rowToNotification(row) {
  const data = parse(row.data);
  return {
    ...data,
    id: String(row.id),
    read: Number(row.read) === 1,
    createdAt: String(row.created_at)
  };
}

// server/http.ts
var HttpError = class extends Error {
  status;
  code;
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
};
function wrap(handler2) {
  return (req, res, next) => {
    Promise.resolve(handler2(req, res, next)).catch(next);
  };
}
function invalidInput(res, error) {
  res.status(400).json({
    error: {
      code: "INVALID_INPUT",
      message: "D\u1EEF li\u1EC7u g\u1EEDi l\xEAn kh\xF4ng h\u1EE3p l\u1EC7.",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    }
  });
}
function notFound(res, message = "Kh\xF4ng t\xECm th\u1EA5y d\u1EEF li\u1EC7u.") {
  res.status(404).json({ error: { code: "NOT_FOUND", message } });
}

// server/validation.ts
import { z } from "zod";
var addressSchema = z.object({
  countryCode: z.string().min(1).max(2),
  search: z.string().max(300),
  street: z.string().min(1).max(300),
  postalCode: z.string().min(1).max(30),
  city: z.string().min(1).max(120),
  placeId: z.string().max(200).optional(),
  lat: z.number().optional(),
  lng: z.number().optional()
});
var cargoLineSchema = z.object({
  id: z.string().min(1).max(80),
  packageType: z.string().min(1).max(80),
  quantity: z.number().int().min(1).max(1e5),
  weightKg: z.number().min(0).max(1e6),
  lengthCm: z.number().min(0).max(1e5),
  widthCm: z.number().min(0).max(1e5),
  heightCm: z.number().min(0).max(1e5)
});
var quoteSchema = z.object({
  handoff: z.enum(["deliver-to-warehouse", "carrier-pickup"]),
  pickup: addressSchema,
  delivery: addressSchema,
  freightTerm: z.enum(["prepaid", "collect"]),
  cargoType: z.enum(["quick-estimation", "fcl", "lcl"]),
  unitSystem: z.enum(["metric", "imperial"]),
  lines: z.array(cargoLineSchema).min(1).max(30),
  containerId: z.string().max(80),
  handling: z.enum(["general", "special"]),
  specialTypes: z.array(z.string().max(80)).max(20),
  customerType: z.enum(["business", "individual"]),
  companyName: z.string().max(200),
  contactName: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().min(1).max(40),
  marketingOptIn: z.boolean(),
  termsAccepted: z.boolean()
});
var contactSchema = z.object({
  customerType: z.enum(["business", "individual"]),
  companyName: z.string().max(200),
  fullName: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().min(1).max(40),
  marketingOptIn: z.boolean(),
  termsAccepted: z.boolean()
});
var addonsSchema = z.object({
  exportCustoms: z.boolean(),
  importCustoms: z.boolean(),
  declarationLines: z.number().int().min(0).max(1e3),
  cargoInsurance: z.boolean(),
  insuredValue: z.number().min(0).max(1e12),
  insuredCurrency: z.enum(["VND", "USD", "EUR"]),
  sustainability: z.enum(["none", "fuel", "offset"]),
  incoterm: z.string().max(30)
});
var routeSchema = z.object({
  shipperSameAsPickup: z.boolean(),
  consigneeSameAsDelivery: z.boolean(),
  shipperAddress: addressSchema,
  consigneeAddress: addressSchema,
  pickupDate: z.string().max(40)
});
var billingSchema = z.object({
  companyName: z.string().max(200),
  reference: z.string().max(120),
  invoiceEmail: z.string().email().max(200),
  taxId: z.string().max(80),
  addressMode: z.enum(["shipper", "new"]),
  billingCompanyName: z.string().max(200),
  billingStreet: z.string().max(300),
  billingCity: z.string().max(120),
  billingState: z.string().max(120),
  billingPostalCode: z.string().max(30),
  billingCountry: z.string().max(2),
  recipients: z.array(z.string().email().max(200)).max(20),
  shareConfirmed: z.boolean()
});
var documentInputSchema = z.object({
  id: z.string().max(120).optional(),
  slotId: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(0).max(10 * 1024 * 1024),
  status: z.enum(["pending", "verified", "needs-fix"]).optional(),
  note: z.string().max(500).optional(),
  uploadedAt: z.string().max(40).optional(),
  verifiedAt: z.string().max(40).optional()
});
var bookingPayloadSchema = z.object({
  quote: quoteSchema,
  contact: contactSchema,
  serviceId: z.string().min(1).max(80),
  addons: addonsSchema,
  route: routeSchema,
  billing: billingSchema,
  documents: z.array(documentInputSchema).max(20)
});
var documentUploadSchema = z.object({
  name: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(0).max(10 * 1024 * 1024)
});
var documentFixSchema = z.object({
  note: z.string().trim().min(1).max(500)
});
var loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(72)
});
var registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(72)
});
var scenarioSchema = z.object({
  id: z.string().max(120).optional(),
  shipmentId: z.string().min(1).max(120),
  legId: z.string().min(1).max(160),
  mode: z.enum(["road", "ocean", "air", "rail"]),
  type: z.enum([
    "congestion",
    "accident",
    "road-closure",
    "reroute",
    "storm",
    "port-congestion",
    "security",
    "air-delay",
    "air-reschedule"
  ]),
  label: z.string().min(1).max(240),
  severity: z.enum(["low", "medium", "high"]),
  startAt: z.string().min(1).max(40),
  endAt: z.string().min(1).max(40),
  speedFactor: z.number().min(0).max(1),
  extraWaitHours: z.number().min(0).max(720),
  detourKm: z.number().min(0).max(1e4),
  center: z.object({ lat: z.number(), lng: z.number() }).optional(),
  radiusKm: z.number().min(0).max(5e3),
  active: z.boolean(),
  createdAt: z.string().max(40).optional()
});
var scenarioToggleSchema = z.object({
  active: z.boolean()
});
var transportAlertsSchema = z.object({
  alerts: z.array(
    z.object({
      shipmentCode: z.string().min(1).max(40),
      alertId: z.string().min(1).max(160),
      legId: z.string().min(1).max(160),
      legLabel: z.string().min(1).max(240),
      title: z.string().min(1).max(240),
      detail: z.string().min(1).max(800),
      severity: z.enum(["warning", "critical"]),
      simAt: z.string().min(1).max(40)
    })
  ).max(20)
});

// server/app.ts
function userOf(req) {
  return req.user;
}
function canAccess(user, ownerId) {
  return user.role === "admin" || user.id === ownerId;
}
function originGuard(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  try {
    if (new URL(origin).host !== host) {
      res.status(403).json({
        error: { code: "ORIGIN_NOT_ALLOWED", message: "Ngu\u1ED3n y\xEAu c\u1EA7u kh\xF4ng h\u1EE3p l\u1EC7." }
      });
      return;
    }
  } catch {
    res.status(403).json({
      error: { code: "INVALID_ORIGIN", message: "Origin kh\xF4ng h\u1EE3p l\u1EC7." }
    });
    return;
  }
  next();
}
function createApp(options = {}) {
  const db = options.db ?? getDatabase();
  const ready = options.initialize === false ? Promise.resolve() : initDatabase(db);
  const app2 = express();
  app2.set("trust proxy", 1);
  app2.disable("x-powered-by");
  app2.use(express.json({ limit: "1mb" }));
  app2.use(cookieParser());
  app2.use((req, _res, next) => {
    const forwardedPath = typeof req.query.path === "string" ? req.query.path.replace(/^\/+/, "") : null;
    if (forwardedPath !== null) {
      const queryIndex = req.url.indexOf("?");
      const originalQuery = queryIndex >= 0 ? req.url.slice(queryIndex) : "";
      const cleanedQuery = originalQuery.replace(/([?&])path=[^&]*/g, "$1").replace(/[?&]$/, "");
      req.url = `/api/${forwardedPath}${cleanedQuery}`;
    } else if (!req.url.startsWith("/api")) {
      req.url = `/api${req.url}`;
    }
    next();
  });
  app2.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Cookie");
    next();
  });
  app2.use(async (_req, _res, next) => {
    try {
      await ready;
      next();
    } catch (error) {
      next(error);
    }
  });
  if (process.env.VERCEL === "1") app2.use(originGuard);
  const auth = requireAuth(db);
  app2.get(
    "/api/health",
    wrap(async (_req, res) => {
      await db.execute("SELECT 1");
      res.json({
        ok: true,
        database: process.env.TURSO_DATABASE_URL ? "turso" : "local-file"
      });
    })
  );
  app2.post(
    "/api/auth/register",
    wrap(async (req, res) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) return invalidInput(res, parsed.error);
      const email = parsed.data.email.toLowerCase();
      const existing = await db.execute({
        sql: "SELECT 1 FROM users WHERE email = ? LIMIT 1",
        args: [email]
      });
      if (existing.rows.length > 0) {
        throw new HttpError(409, "EMAIL_IN_USE", "Email n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c \u0111\u0103ng k\xFD.");
      }
      const user = {
        id: `usr-${randomUUID2()}`,
        email,
        name: parsed.data.name,
        company: parsed.data.company?.trim() || null,
        role: "customer",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const passwordHash = await hashPassword(parsed.data.password);
      await db.execute({
        sql: "INSERT INTO users (id, email, password_hash, name, company, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [
          user.id,
          user.email,
          passwordHash,
          user.name,
          user.company,
          user.role,
          user.createdAt
        ]
      });
      const authUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company ?? null,
        role: "customer"
      };
      setSessionCookie(req, res, await createSessionToken(authUser));
      res.status(201).json({ user: authUser });
    })
  );
  app2.post(
    "/api/auth/login",
    wrap(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) return invalidInput(res, parsed.error);
      const email = parsed.data.email.toLowerCase();
      const result = await db.execute({
        sql: "SELECT id, email, name, company, role, password_hash FROM users WHERE email = ? LIMIT 1",
        args: [email]
      });
      const row = result.rows[0];
      if (!row) {
        throw new HttpError(401, "INVALID_CREDENTIALS", "Email ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng \u0111\xFAng.");
      }
      const valid = await verifyPassword(String(row.password_hash), parsed.data.password);
      if (!valid) {
        throw new HttpError(401, "INVALID_CREDENTIALS", "Email ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng \u0111\xFAng.");
      }
      const user = {
        id: String(row.id),
        email: String(row.email),
        name: String(row.name),
        company: row.company == null ? null : String(row.company),
        role: String(row.role)
      };
      setSessionCookie(req, res, await createSessionToken(user));
      res.json({ user });
    })
  );
  app2.post("/api/auth/logout", (req, res) => {
    clearSessionCookie(req, res);
    res.status(204).end();
  });
  app2.get(
    "/api/auth/me",
    requireAuth(db),
    wrap((req, res) => {
      res.json({ user: sessionUser(req) });
    })
  );
  app2.get(
    "/api/state",
    auth,
    wrap(async (req, res) => {
      const user = sessionUser(req);
      const scoped = user.role !== "admin";
      const where = scoped ? " WHERE user_id = ?" : "";
      const args = scoped ? [user.id] : [];
      const [bookings, shipments, scenarios, notifications] = await Promise.all([
        db.execute({
          sql: `SELECT * FROM bookings${where} ORDER BY created_at DESC`,
          args
        }),
        db.execute({
          sql: `SELECT * FROM shipments${where} ORDER BY created_at DESC`,
          args
        }),
        db.execute({
          sql: `SELECT * FROM scenarios${where} ORDER BY created_at DESC`,
          args
        }),
        db.execute({
          sql: "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
          args: [user.id]
        })
      ]);
      res.json({
        bookings: bookings.rows.map((row) => rowToBooking(asRow(row))),
        shipments: shipments.rows.map((row) => rowToShipment(asRow(row))),
        scenarios: scenarios.rows.map((row) => rowToScenario(asRow(row))),
        notifications: notifications.rows.map((row) => rowToNotification(asRow(row)))
      });
    })
  );
  app2.post(
    "/api/bookings",
    auth,
    wrap(async (req, res) => {
      const parsed = bookingPayloadSchema.safeParse(req.body);
      if (!parsed.success) return invalidInput(res, parsed.error);
      if (!SERVICES.some((service) => service.id === parsed.data.serviceId)) {
        throw new HttpError(400, "UNKNOWN_SERVICE", "D\u1ECBch v\u1EE5 v\u1EADn chuy\u1EC3n kh\xF4ng h\u1EE3p l\u1EC7.");
      }
      const user = userOf(req);
      const bookingId = `bk-${randomUUID2()}`;
      const createdAt = nowIso();
      const base = {
        id: bookingId,
        status: "awaiting-documents",
        createdAt,
        quote: parsed.data.quote,
        contact: parsed.data.contact,
        serviceId: parsed.data.serviceId,
        addons: parsed.data.addons,
        route: parsed.data.route,
        billing: parsed.data.billing,
        documents: [],
        ownerId: user.id
      };
      const slots = bookingDocumentSlots(base);
      const validSlots = new Set(slots.map((slot) => slot.id));
      const documents = parsed.data.documents.map((document) => {
        if (!validSlots.has(document.slotId)) {
          throw new HttpError(
            400,
            "UNKNOWN_DOCUMENT_SLOT",
            `M\u1EE5c ch\u1EE9ng t\u1EEB "${document.slotId}" kh\xF4ng thu\u1ED9c h\u1ED3 s\u01A1 n\xE0y.`
          );
        }
        return {
          id: `doc-${randomUUID2()}-${document.slotId}`,
          slotId: document.slotId,
          name: document.name,
          sizeBytes: document.sizeBytes,
          status: "pending",
          uploadedAt: document.uploadedAt ?? createdAt
        };
      });
      const booking = {
        ...base,
        documents
      };
      await db.execute({
        sql: "INSERT INTO bookings (id, user_id, status, tracking_code, shipment_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [
          booking.id,
          user.id,
          booking.status,
          null,
          null,
          JSON.stringify(booking),
          booking.createdAt,
          booking.createdAt
        ]
      });
      res.status(201).json(booking);
    })
  );
  app2.get(
    "/api/bookings/:id",
    auth,
    wrap(async (req, res) => {
      const row = await bookingRow(db, req.params.id);
      if (!row) return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n \u0111\u1EB7t ch\u1ED7.");
      const booking = rowToBooking(row);
      if (!canAccess(userOf(req), String(row.user_id))) {
        return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n \u0111\u1EB7t ch\u1ED7.");
      }
      res.json(booking);
    })
  );
  app2.post(
    "/api/bookings/:id/documents/:slotId",
    auth,
    wrap(async (req, res) => {
      const parsed = documentUploadSchema.safeParse(req.body);
      if (!parsed.success) return invalidInput(res, parsed.error);
      const user = userOf(req);
      const result = await withTransaction(db, async (tx) => {
        const row = await bookingRow(tx, req.params.id);
        if (!row) throw new HttpError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n \u0111\u1EB7t ch\u1ED7.");
        if (String(row.user_id) !== user.id) {
          throw new HttpError(403, "FORBIDDEN", "B\u1EA1n kh\xF4ng s\u1EDF h\u1EEFu \u0111\u01A1n \u0111\u1EB7t ch\u1ED7 n\xE0y.");
        }
        const booking = rowToBooking(row);
        if (booking.code) {
          throw new HttpError(409, "CODE_ISSUED", "H\u1ED3 s\u01A1 \u0111\xE3 c\u1EA5p m\xE3 n\xEAn kh\xF4ng th\u1EC3 thay ch\u1EE9ng t\u1EEB.");
        }
        const slotExists = bookingDocumentSlots(booking).some(
          (slot) => slot.id === req.params.slotId
        );
        if (!slotExists) {
          throw new HttpError(400, "UNKNOWN_DOCUMENT_SLOT", "M\u1EE5c ch\u1EE9ng t\u1EEB kh\xF4ng h\u1EE3p l\u1EC7.");
        }
        const existing = booking.documents.find(
          (document) => document.slotId === req.params.slotId
        );
        const nextDocument = {
          id: existing?.id ?? `doc-${randomUUID2()}-${req.params.slotId}`,
          slotId: req.params.slotId,
          name: parsed.data.name,
          sizeBytes: parsed.data.sizeBytes,
          status: "pending",
          uploadedAt: nowIso()
        };
        const documents = existing ? booking.documents.map(
          (document) => document.slotId === req.params.slotId ? nextDocument : document
        ) : [...booking.documents, nextDocument];
        const synced = await syncBookingDocuments(
          tx,
          booking,
          documents,
          String(row.user_id)
        );
        return synced.booking;
      });
      res.json(result);
    })
  );
  app2.post(
    "/api/bookings/:id/documents/:documentId/verify",
    auth,
    requireAdmin,
    wrap(async (req, res) => {
      const result = await withTransaction(db, async (tx) => {
        const row = await bookingRow(tx, req.params.id);
        if (!row) throw new HttpError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n \u0111\u1EB7t ch\u1ED7.");
        const booking = rowToBooking(row);
        if (booking.code) {
          throw new HttpError(409, "CODE_ISSUED", "H\u1ED3 s\u01A1 \u0111\xE3 c\u1EA5p m\xE3 n\xEAn kh\xF4ng th\u1EC3 x\xE1c minh th\xEAm.");
        }
        const document = booking.documents.find((item) => item.id === req.params.documentId);
        if (!document) throw new HttpError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y ch\u1EE9ng t\u1EEB.");
        const documents = booking.documents.map(
          (item) => item.id === document.id ? {
            ...item,
            status: "verified",
            verifiedAt: nowIso(),
            note: void 0
          } : item
        );
        const synced = await syncBookingDocuments(
          tx,
          booking,
          documents,
          String(row.user_id)
        );
        return synced.booking;
      });
      res.json(result);
    })
  );
  app2.post(
    "/api/bookings/:id/documents/:documentId/request-fix",
    auth,
    requireAdmin,
    wrap(async (req, res) => {
      const parsed = documentFixSchema.safeParse(req.body);
      if (!parsed.success) return invalidInput(res, parsed.error);
      const result = await withTransaction(db, async (tx) => {
        const row = await bookingRow(tx, req.params.id);
        if (!row) throw new HttpError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n \u0111\u1EB7t ch\u1ED7.");
        const booking = rowToBooking(row);
        if (booking.code) {
          throw new HttpError(409, "CODE_ISSUED", "H\u1ED3 s\u01A1 \u0111\xE3 c\u1EA5p m\xE3 n\xEAn kh\xF4ng th\u1EC3 y\xEAu c\u1EA7u b\u1ED5 sung.");
        }
        const document = booking.documents.find((item) => item.id === req.params.documentId);
        if (!document) throw new HttpError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y ch\u1EE9ng t\u1EEB.");
        const documents = booking.documents.map(
          (item) => item.id === document.id ? {
            ...item,
            status: "needs-fix",
            note: parsed.data.note,
            verifiedAt: void 0
          } : item
        );
        const synced = await syncBookingDocuments(
          tx,
          booking,
          documents,
          String(row.user_id)
        );
        const slot = bookingDocumentSlots(booking).find(
          (item) => item.id === document.slotId
        );
        const notification = makeNotification({
          type: "document-fix",
          title: `C\u1EA7n b\u1ED5 sung: ${slot?.label ?? document.name}`,
          detail: parsed.data.note,
          bookingId: booking.id
        });
        await insertNotification(tx, String(row.user_id), notification);
        return synced.booking;
      });
      res.json(result);
    })
  );
  app2.post(
    "/api/shipments/:id/handover",
    auth,
    wrap(async (req, res) => {
      const user = userOf(req);
      const result = await withTransaction(db, async (tx) => {
        const row = await shipmentRowById(tx, req.params.id);
        if (!row) throw new HttpError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y l\xF4 h\xE0ng.");
        if (!canAccess(user, String(row.user_id))) {
          throw new HttpError(404, "NOT_FOUND", "Kh\xF4ng t\xECm th\u1EA5y l\xF4 h\xE0ng.");
        }
        const shipment = rowToShipment(row);
        if (shipment.handoverConfirmedAt) return shipment;
        const next = {
          ...shipment,
          handoverConfirmedAt: shipment.handoverAt,
          status: "in-transit"
        };
        await tx.execute({
          sql: "UPDATE shipments SET data = ?, updated_at = ? WHERE id = ?",
          args: [JSON.stringify(next), nowIso(), next.id]
        });
        await insertNotification(
          tx,
          String(row.user_id),
          makeNotification({
            type: "handover",
            title: `\u0110\xE3 b\xE0n giao t\u1EF1 \u0111\u1ED9ng \xB7 ${next.code}`,
            detail: `${next.handoff === "deliver-to-warehouse" ? "H\xE0ng \u0111\xE3 \u0111\u01B0\u1EE3c x\xE1c nh\u1EADn v\xE0o kho" : "Xe \u0111\xE3 l\u1EA5y h\xE0ng"} l\xFAc ${dateTimeLabel(next.handoverAt)} theo gi\u1EDD m\xF4 ph\u1ECFng.`,
            shipmentCode: next.code
          })
        );
        return next;
      });
      res.json(result);
    })
  );
  app2.get(
    "/api/shipments/:code",
    auth,
    wrap(async (req, res) => {
      const row = await shipmentRowByCode(db, req.params.code);
      if (!row) return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y m\xE3 v\u1EADn t\u1EA3i.");
      if (!canAccess(userOf(req), String(row.user_id))) {
        return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y m\xE3 v\u1EADn t\u1EA3i.");
      }
      res.json(rowToShipment(row));
    })
  );
  app2.post(
    "/api/scenarios",
    auth,
    wrap(async (req, res) => {
      const parsed = scenarioSchema.safeParse(req.body);
      if (!parsed.success) return invalidInput(res, parsed.error);
      const shipmentRow = await shipmentRowById(db, parsed.data.shipmentId);
      if (!shipmentRow) return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y l\xF4 h\xE0ng.");
      if (!canAccess(userOf(req), String(shipmentRow.user_id))) {
        return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y l\xF4 h\xE0ng.");
      }
      const scenario = {
        ...parsed.data,
        id: `sc-${randomUUID2()}`,
        shipmentId: String(shipmentRow.id),
        createdAt: nowIso()
      };
      await db.execute({
        sql: "INSERT INTO scenarios (id, user_id, shipment_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [
          scenario.id,
          String(shipmentRow.user_id),
          scenario.shipmentId,
          JSON.stringify(scenario),
          scenario.createdAt,
          scenario.createdAt
        ]
      });
      res.status(201).json(scenario);
    })
  );
  app2.patch(
    "/api/scenarios/:id",
    auth,
    wrap(async (req, res) => {
      const parsed = scenarioSchema.safeParse(req.body);
      if (!parsed.success) return invalidInput(res, parsed.error);
      const row = await scenarioRow(db, req.params.id);
      if (!row) return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y t\xECnh hu\u1ED1ng.");
      const existing = rowToScenario(row);
      const shipmentRow = await shipmentRowById(db, existing.shipmentId);
      if (!shipmentRow) return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y l\xF4 h\xE0ng.");
      if (!canAccess(userOf(req), String(shipmentRow.user_id))) {
        return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y t\xECnh hu\u1ED1ng.");
      }
      const scenario = {
        ...existing,
        ...parsed.data,
        id: existing.id,
        shipmentId: existing.shipmentId,
        createdAt: existing.createdAt
      };
      await db.execute({
        sql: "UPDATE scenarios SET data = ?, updated_at = ? WHERE id = ?",
        args: [JSON.stringify(scenario), nowIso(), scenario.id]
      });
      res.json(scenario);
    })
  );
  app2.post(
    "/api/scenarios/:id/toggle",
    auth,
    wrap(async (req, res) => {
      const parsed = scenarioToggleSchema.safeParse(req.body);
      if (!parsed.success) return invalidInput(res, parsed.error);
      const row = await scenarioRow(db, req.params.id);
      if (!row) return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y t\xECnh hu\u1ED1ng.");
      const existing = rowToScenario(row);
      const shipmentRow = await shipmentRowById(db, existing.shipmentId);
      if (!shipmentRow) return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y l\xF4 h\xE0ng.");
      if (!canAccess(userOf(req), String(shipmentRow.user_id))) {
        return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y t\xECnh hu\u1ED1ng.");
      }
      const scenario = { ...existing, active: parsed.data.active };
      await db.execute({
        sql: "UPDATE scenarios SET data = ?, updated_at = ? WHERE id = ?",
        args: [JSON.stringify(scenario), nowIso(), scenario.id]
      });
      res.json(scenario);
    })
  );
  app2.delete(
    "/api/scenarios/:id",
    auth,
    wrap(async (req, res) => {
      const row = await scenarioRow(db, req.params.id);
      if (!row) return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y t\xECnh hu\u1ED1ng.");
      const existing = rowToScenario(row);
      const shipmentRow = await shipmentRowById(db, existing.shipmentId);
      if (!shipmentRow) return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y l\xF4 h\xE0ng.");
      if (!canAccess(userOf(req), String(shipmentRow.user_id))) {
        return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y t\xECnh hu\u1ED1ng.");
      }
      await db.execute({
        sql: "DELETE FROM scenarios WHERE id = ?",
        args: [existing.id]
      });
      res.status(204).end();
    })
  );
  app2.post(
    "/api/notifications/transport-alert",
    auth,
    wrap(async (req, res) => {
      const parsed = transportAlertsSchema.safeParse(req.body);
      if (!parsed.success) return invalidInput(res, parsed.error);
      const user = userOf(req);
      let created = 0;
      for (const alert of parsed.data.alerts) {
        const row = await shipmentRowByCode(db, alert.shipmentCode);
        if (!row || !canAccess(user, String(row.user_id))) continue;
        const notification = makeNotification({
          type: "transport-alert",
          title: alert.title,
          detail: alert.detail,
          shipmentCode: alert.shipmentCode.toUpperCase(),
          severity: alert.severity,
          legId: alert.legId,
          legLabel: alert.legLabel,
          alertId: alert.alertId,
          simAt: alert.simAt
        });
        const inserted = await insertNotification(
          db,
          user.id,
          notification,
          `${alert.shipmentCode.toUpperCase()}::${alert.alertId}`
        );
        if (inserted) created += 1;
      }
      res.json({ created });
    })
  );
  app2.patch(
    "/api/notifications/:id/read",
    auth,
    wrap(async (req, res) => {
      const user = userOf(req);
      const result = await db.execute({
        sql: "UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?",
        args: [req.params.id, user.id]
      });
      if (result.rowsAffected === 0) return notFound(res, "Kh\xF4ng t\xECm th\u1EA5y th\xF4ng b\xE1o.");
      res.status(204).end();
    })
  );
  app2.post(
    "/api/notifications/read-all",
    auth,
    wrap(async (req, res) => {
      await db.execute({
        sql: "UPDATE notifications SET read = 1 WHERE user_id = ?",
        args: [userOf(req).id]
      });
      res.status(204).end();
    })
  );
  app2.post(
    "/api/demo/reset",
    auth,
    requireAdmin,
    wrap(async (_req, res) => {
      await resetDemoData(db);
      res.json({ ok: true });
    })
  );
  app2.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "API kh\xF4ng t\u1ED3n t\u1EA1i." } });
  });
  app2.use((error, _req, res, _next) => {
    if (res.headersSent) return;
    if (error instanceof ZodError) {
      invalidInput(res, error);
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({
        error: { code: error.code, message: error.message }
      });
      return;
    }
    console.error(error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "M\xE1y ch\u1EE7 g\u1EB7p l\u1ED7i khi x\u1EED l\xFD y\xEAu c\u1EA7u." }
    });
  });
  return app2;
}
function sessionUser(req) {
  return req.user;
}
function asRow(row) {
  return row;
}
async function bookingRow(db, id) {
  const result = await db.execute({
    sql: "SELECT * FROM bookings WHERE id = ? LIMIT 1",
    args: [id]
  });
  return result.rows[0] ? asRow(result.rows[0]) : null;
}
async function shipmentRowById(db, id) {
  const result = await db.execute({
    sql: "SELECT * FROM shipments WHERE id = ? LIMIT 1",
    args: [id]
  });
  return result.rows[0] ? asRow(result.rows[0]) : null;
}
async function shipmentRowByCode(db, code) {
  const result = await db.execute({
    sql: "SELECT * FROM shipments WHERE code = ? LIMIT 1",
    args: [code.toUpperCase()]
  });
  return result.rows[0] ? asRow(result.rows[0]) : null;
}
async function scenarioRow(db, id) {
  const result = await db.execute({
    sql: "SELECT * FROM scenarios WHERE id = ? LIMIT 1",
    args: [id]
  });
  return result.rows[0] ? asRow(result.rows[0]) : null;
}
async function withTransaction(db, run) {
  const tx = await db.transaction("write");
  try {
    const result = await run(tx);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

// server/entry.ts
var app = null;
function getApp() {
  if (!app) app = createApp();
  return app;
}
function handler(req, res) {
  try {
    getApp()(
      req,
      res
    );
  } catch (error) {
    console.error(error);
    if (res.headersSent) return;
    const message = error instanceof Error && error.message ? error.message : "Kh\xF4ng kh\u1EDFi t\u1EA1o \u0111\u01B0\u1EE3c API.";
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(JSON.stringify({ error: { code: "API_INIT_FAILED", message } }));
  }
}
export {
  handler as default
};
