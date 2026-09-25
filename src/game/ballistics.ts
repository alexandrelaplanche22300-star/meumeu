import type { Armor, BaseShape, Burn, CaseMat, CoreMat, Design, Effect, Feed, Filler, Foregrip, Jacket, Mount, Muzzle, Nose, ZoneId } from "./types";

/** Meumeu et Bê : 30 cm du crâne au sol. Toute la physique du bureau est à cette échelle. */
export const BODY = {
  heightCm: 30,
  massG: 360,
  bloodMl: 26,
  incapMl: 8,
  femurMm: 4.4,
  arteryMm: 0.75,
  torsoCm: 7,
};

export const FEED_CAP: Record<Feed, number> = { single: 1, clip: 12, box: 40, tube: 10, belt: 80 };

export type Sample = {
  range: number;
  drop: number;
  velocity: number;
  energy: number;
  drift: number;
  tof: number;
};

export type Report = {
  name: string;
  massG: number;
  powderG: number;
  brassG: number;
  roundG: number;
  roundsPerKg: number;
  roundsPerWagon: number;
  velocity: number;
  energyJ: number;
  pressure: number;
  pressureLabel: "sage" | "nominal" | "chaud" | "dangereux";
  stability: number;
  stabilityLabel: "clé" | "stable" | "surstable";
  recoilJ: number;
  recoilLabel: "tenu" | "sec" | "lourd";
  weaponG: number;
  barrelLife: number;
  rpm: number;
  reliable: boolean;
  buildable: boolean;
  blockReason: string | null;
  samples: Sample[];
  zeroAngleDeg: number;
  usefulM: number;
  barrelBodies: number;
  caliberOnArtery: number;
  cost: { lead: number; brass: number; propellant: number; steel: number; tungsten: number };
  rifleCost: { steel: number; timber: number; labor: number };
  crew: number;
  crewWhy: string;
  crewRoles: string[];
  mount: Mount;
  mountAsked: Mount;
  mountForced: boolean;
  reloadS: number;
  weaponLengthMm: number;
  magazine: number;
  feed: Feed;
  goods: string[];
  bads: string[];
  form: number;
  sd: number;
  pelletN: number;
  pelletMm: number;
  transonicM: number | null;
  jacketFrac: number;
};

const DENSITY: Record<CoreMat, number> = {
  lead: 11.2,
  jacket: 10.1,
  steel: 8.6,
  tungsten: 14.8,
  frangible: 5.4,
};

const HARD: Record<CoreMat, number> = {
  lead: 0.72,
  jacket: 1,
  steel: 1.32,
  tungsten: 1.68,
  frangible: 0.34,
};

const JACKET_RHO: Record<Jacket, number> = { none: 8.7, tombac: 8.7, cuivre: 8.96, acier: 7.85 };
const BURN: Record<Burn, number> = { lente: 0.78, moyenne: 1, vive: 1.32 };

export const WAGON_G = 1500;

export const ZONE_META: Record<
  ZoneId,
  { label: string; kind: "cns" | "heart" | "artery" | "organ" | "gut" | "bone"; artery: number; depth: number; barrier: number }
> = {
  crane: { label: "Crâne / encéphale", kind: "cns", artery: 0.14, depth: 2.1, barrier: 1.05 },
  cou: { label: "Cou / carotides", kind: "artery", artery: 0.8, depth: 1.05, barrier: 0.22 },
  poumon: { label: "Poumon", kind: "organ", artery: 0.2, depth: 1.7, barrier: 0.32 },
  coeur: { label: "Cœur", kind: "heart", artery: 0.58, depth: 2.15, barrier: 0.62 },
  aorte: { label: "Aorte", kind: "artery", artery: 0.94, depth: 2.3, barrier: 0.78 },
  foie: { label: "Foie", kind: "organ", artery: 0.5, depth: 1.9, barrier: 0.42 },
  rate: { label: "Rate", kind: "organ", artery: 0.44, depth: 1.7, barrier: 0.38 },
  intestin: { label: "Abdomen creux", kind: "gut", artery: 0.16, depth: 1.5, barrier: 0.28 },
  colonne: { label: "Colonne", kind: "bone", artery: 0.24, depth: 2.6, barrier: 1.15 },
  femoral: { label: "Artère fémorale", kind: "artery", artery: 0.86, depth: 0.95, barrier: 0.22 },
};

export function defaultDesign(): Design {
  return {
    diameter: 1.6,
    caseLength: 11,
    caseDiameter: 2.55,
    bulletLength: 6.4,
    powderFill: 0.86,
    barrelLength: 95,
    twist: 62,
    core: "jacket",
    nose: "spitzer",
    effect: "ball",
    action: "bolt",
    sight: "aperture",
    profile: "standard",
    zero: 16,
    magazine: 5,
    feed: "clip",
    caseMat: "brass",
    filler: "none",
    cavity: 0,
    base: "flat",
    jacket: "tombac",
    jacketMm: 0.08,
    burn: "moyenne",
    meplat: 0,
    boat: 0,
    pellets: 9,
    muzzle: "none",
    mount: "epaule",
    foregrip: "none",
  };
}

export const PRESETS: { id: string; label: string; blurb: string; design: Design }[] = [
  { id: "marche", label: "Claire de marche", blurb: "Le fusil que les fourgons peuvent nourrir.", design: defaultDesign() },
  {
    id: "aiguille",
    label: "Aiguille",
    blurb: "Plate, légère, mauvaise au vent et sur l’os.",
    design: {
      ...defaultDesign(),
      diameter: 1.15,
      caseLength: 9.2,
      caseDiameter: 1.95,
      bulletLength: 5.1,
      powderFill: 0.92,
      barrelLength: 108,
      twist: 38,
      nose: "spitzer",
      effect: "frag",
      filler: "void",
      cavity: 0.22,
      zero: 22,
      jacket: "tombac",
      jacketMm: 0.05,
      meplat: 0.02,
    },
  },
  {
    id: "seuil",
    label: "Lourde de seuil",
    blurb: "Perfore un Bê de face. Vide un fourgon plus vite que le grain.",
    design: {
      ...defaultDesign(),
      diameter: 2.35,
      caseLength: 14,
      caseDiameter: 3.35,
      bulletLength: 8.4,
      powderFill: 0.8,
      barrelLength: 128,
      twist: 62,
      core: "steel",
      nose: "spitzer",
      effect: "ap",
      profile: "heavy",
      sight: "optic",
      zero: 18,
      magazine: 4,
      feed: "clip",
      jacket: "acier",
      jacketMm: 0.16,
      base: "boat",
      boat: 0.2,
    },
  },
  {
    id: "brisante",
    label: "Brisante courte",
    blurb: "S’ouvre dans les trois mètres. Après, ce n’est qu’un bruit.",
    design: {
      ...defaultDesign(),
      diameter: 1.85,
      caseLength: 7.2,
      caseDiameter: 2.65,
      bulletLength: 4.2,
      powderFill: 0.9,
      barrelLength: 48,
      twist: 92,
      core: "lead",
      nose: "hollow",
      effect: "frag",
      action: "blowback",
      profile: "light",
      sight: "iron",
      zero: 6,
      magazine: 12,
      feed: "box",
      filler: "void",
      cavity: 0.48,
      burn: "vive",
      jacket: "cuivre",
      jacketMm: 0.05,
      meplat: 0.2,
    },
  },
  {
    id: "feu",
    label: "Feu de matériel",
    blurb: "Pour la paille, la toile, le fourgon adverse. Pas pour l’arrêt.",
    design: {
      ...defaultDesign(),
      diameter: 1.7,
      caseLength: 11,
      caseDiameter: 2.6,
      bulletLength: 6.6,
      powderFill: 0.84,
      effect: "api",
      zero: 14,
      jacket: "acier",
      jacketMm: 0.1,
    },
  },
  {
    id: "eclat",
    label: "Éclat de poche",
    blurb: "Une petite charge, pas une grenade. Elle s’ouvre dans l’organe.",
    design: {
      ...defaultDesign(),
      diameter: 2.05,
      caseLength: 8.2,
      caseDiameter: 2.7,
      bulletLength: 5.4,
      powderFill: 0.78,
      barrelLength: 62,
      twist: 70,
      core: "lead",
      nose: "hollow",
      effect: "frag",
      filler: "burst",
      cavity: 0.42,
      magazine: 6,
      feed: "box",
      zero: 8,
      burn: "vive",
      jacketMm: 0.06,
    },
  },
  {
    id: "filet",
    label: "Filet de queue",
    blurb: "Queue de bateau, chemise mince. Elle tient le vent, pas l’os.",
    design: {
      ...defaultDesign(),
      base: "boat",
      boat: 0.36,
      jacket: "tombac",
      jacketMm: 0.05,
      meplat: 0.04,
      burn: "lente",
      barrelLength: 124,
      twist: 46,
      zero: 26,
      powderFill: 0.78,
      nose: "spitzer",
    },
  },
  {
    id: "grains",
    label: "Grains de seuil",
    blurb: "Chevrotine. Sous quatre mètres elle compte, puis le vent emporte les grains.",
    design: {
      ...defaultDesign(),
      effect: "shot",
      pellets: 12,
      nose: "round",
      core: "lead",
      jacket: "none",
      barrelLength: 50,
      caseLength: 8,
      caseDiameter: 2.7,
      bulletLength: 4.4,
      powderFill: 0.92,
      burn: "vive",
      action: "lever",
      feed: "tube",
      magazine: 5,
      zero: 6,
      sight: "iron",
      profile: "light",
      filler: "none",
    },
  },
  {
    id: "molle",
    label: "Pointe molle",
    blurb: "Méplat et chemise de cuivre. Elle s’ouvre sans se pulvériser.",
    design: {
      ...defaultDesign(),
      nose: "soft",
      effect: "frag",
      meplat: 0.24,
      jacket: "cuivre",
      jacketMm: 0.07,
      filler: "void",
      cavity: 0.16,
      core: "lead",
      base: "flat",
    },
  },
  {
    id: "bande",
    label: "Bande à trois",
    blurb: "Plus longue qu’un corps. Pointeur, chargeur, porte-pied.",
    design: {
      ...defaultDesign(),
      feed: "belt",
      magazine: 32,
      profile: "heavy",
      barrelLength: 170,
      action: "straight",
      sight: "aperture",
      effect: "tracer",
      core: "jacket",
      zero: 18,
      caseLength: 12,
      mount: "trepied",
    },
  },
  {
    id: "piece",
    label: "Pièce de fossé",
    blurb: "Gros calibre. L’épaule ne suffit plus : trépied et plusieurs Meumeu.",
    design: {
      ...defaultDesign(),
      diameter: 6.5,
      caseLength: 28,
      caseDiameter: 8.2,
      bulletLength: 22,
      powderFill: 0.78,
      barrelLength: 260,
      twist: 180,
      core: "steel",
      nose: "spitzer",
      effect: "ap",
      action: "bolt",
      sight: "optic",
      profile: "heavy",
      zero: 24,
      magazine: 4,
      feed: "box",
      mount: "trepied",
      muzzle: "frein",
      foregrip: "none",
    },
  },
];

function shellFrac(n: Design): number {
  if (n.jacket === "none" || n.effect === "shot") return 0;
  return Math.min(0.46, (2.1 * n.jacketMm) / Math.max(0.6, n.diameter));
}

export function jacketFrac(d0: Design): number {
  return shellFrac(normalizeDesign(d0));
}

export function pelletCount(d0: Design): number {
  const d = normalizeDesign(d0);
  return d.effect === "shot" ? d.pellets : 1;
}

export function pelletDiameter(d0: Design): number {
  const d = normalizeDesign(d0);
  if (d.effect !== "shot") return d.diameter;
  return Math.max(0.32, (d.diameter / Math.sqrt(d.pellets)) * 0.92);
}

function formFactor(d0: Design): number {
  const n = normalizeDesign(d0);
  const base: Record<Nose, number> = { spitzer: 0.94, round: 1.4, flat: 1.65, hollow: 1.5, soft: 1.24 };
  let f = base[n.nose];
  if (n.effect === "tracer") f += 0.12;
  if (n.effect === "api") f += 0.07;
  if (n.effect === "frag") f += 0.06;
  if (n.effect === "shot") f += 0.9;
  const meplat = n.nose === "flat" ? Math.max(n.meplat, 0.42) : n.nose === "round" ? Math.max(n.meplat, 0.28) : n.meplat;
  f += meplat * 0.62;
  if (n.base === "boat") f -= Math.min(0.2, n.boat * 0.5);
  if (n.jacket === "acier") f += 0.03;
  return Math.max(0.7, f);
}

export function normalizeDesign(raw: Partial<Design> | Design): Design {
  const b = defaultDesign();
  const feed = (raw.feed ?? b.feed) as Feed;
  const filler = (raw.filler ?? b.filler) as Filler;
  const caseMat = (raw.caseMat ?? b.caseMat) as CaseMat;
  const base = (raw.base ?? b.base) as BaseShape;
  const jacket = (raw.jacket ?? b.jacket) as Jacket;
  const burn = (raw.burn ?? b.burn) as Burn;
  const effect = (raw.effect ?? b.effect) as Effect;
  const muzzle = (raw.muzzle ?? b.muzzle) as Muzzle;
  const mount = (raw.mount ?? b.mount) as Mount;
  const foregrip = (raw.foregrip ?? b.foregrip) as Foregrip;
  const magazine = feed === "single" ? 1 : Math.max(1, Math.min(FEED_CAP[feed], raw.magazine ?? b.magazine));
  return {
    ...b,
    ...raw,
    feed,
    filler,
    caseMat,
    base,
    jacket,
    burn,
    effect,
    muzzle,
    mount,
    foregrip,
    magazine,
    diameter: Math.max(0.5, Math.min(14, raw.diameter ?? b.diameter)),
    bulletLength: Math.max(2, Math.min(48, raw.bulletLength ?? b.bulletLength)),
    caseLength: Math.max(4, Math.min(52, raw.caseLength ?? b.caseLength)),
    caseDiameter: Math.max(1, Math.min(18, raw.caseDiameter ?? b.caseDiameter)),
    barrelLength: Math.max(24, Math.min(480, raw.barrelLength ?? b.barrelLength)),
    twist: Math.max(12, Math.min(420, raw.twist ?? b.twist)),
    zero: Math.max(2, Math.min(90, raw.zero ?? b.zero)),
    powderFill: Math.max(0.35, Math.min(1.12, raw.powderFill ?? b.powderFill)),
    cavity: filler === "none" ? 0 : Math.max(0, Math.min(0.75, raw.cavity ?? b.cavity)),
    jacketMm: Math.max(0.03, Math.min(0.6, raw.jacketMm ?? b.jacketMm)),
    meplat: Math.max(0, Math.min(0.65, raw.meplat ?? b.meplat)),
    boat: Math.max(0, Math.min(0.45, raw.boat ?? b.boat)),
    pellets: Math.max(4, Math.min(24, Math.round(raw.pellets ?? b.pellets))),
  };
}

export function bulletMassG(d0: Design): number {
  const n = normalizeDesign(d0);
  const r = n.diameter / 20;
  const lenCm = n.bulletLength / 10;
  const shape = n.nose === "spitzer" ? 0.68 : n.nose === "flat" ? 0.86 : n.nose === "hollow" ? 0.6 : n.nose === "soft" ? 0.74 : 0.76;
  const cav = n.filler === "none" || n.effect === "shot" ? 0 : n.cavity;
  const frac = shellFrac(n);
  const rho = DENSITY[n.core] * (1 - frac) + JACKET_RHO[n.jacket] * frac;
  return Math.PI * r * r * lenCm * shape * rho * (1 - cav * 0.62);
}

export function powderMassG(d: Design): number {
  const r = d.caseDiameter / 20;
  const vol = Math.PI * r * r * (d.caseLength / 10) * 0.58;
  const seat = Math.max(0, (d.bulletLength - d.diameter * 1.2) / 10) * Math.PI * (d.diameter / 20) ** 2 * 0.4;
  return Math.max(0.004, vol - seat) * 0.95 * d.powderFill;
}

export function brassMassG(d: Design): number {
  const n = normalizeDesign(d);
  const r = n.caseDiameter / 20;
  const vol = Math.PI * r * r * (n.caseLength / 10);
  const shell = n.caseMat === "paper" ? 0.22 : n.caseMat === "steel" ? 0.92 : 1;
  return vol * 8.4 * 0.18 * shell;
}

export function weaponParts(d0: Design) {
  const n = normalizeDesign(d0);
  const stock = n.profile === "light" ? 42 : n.profile === "heavy" ? 58 : 72;
  const feedExtra = n.feed === "belt" ? 24 : n.feed === "box" ? 16 : n.feed === "tube" ? 10 : 0;
  const receiver = 32 + (n.diameter > 4 ? 10 : 0);
  const muzzle = n.muzzle === "manchon" ? 28 : n.muzzle === "frein" ? 14 : n.muzzle === "cache" ? 8 : 0;
  return { stock, receiver, feedExtra, barrel: n.barrelLength, muzzle, total: stock + receiver + feedExtra + n.barrelLength + muzzle };
}

export function weaponLengthMm(d: Design): number {
  return weaponParts(d).total;
}

export function serviceOf(d: Design, weaponGrams: number, recoil: Report["recoilLabel"]) {
  const n = normalizeDesign(d);
  const lengthMm = weaponLengthMm(n);
  const rank: Record<Mount, number> = { epaule: 0, bipied: 1, trepied: 2 };
  let need: Mount = "epaule";
  if (n.diameter >= 7 || weaponGrams > 175 || lengthMm > 380) need = "trepied";
  else if (n.diameter >= 4.2 || weaponGrams > 100 || lengthMm > 240 || (recoil === "lourd" && n.diameter >= 2.6)) need = "bipied";
  else if (recoil === "lourd") need = "bipied";
  const asked = n.mount;
  const mount: Mount = rank[asked] >= rank[need] ? asked : need;
  const forced = mount !== asked;
  let crew = 1;
  let why = "Une épaule suffit : l’arme reste à l’échelle d’un Meumeu de 30 cm.";
  if (n.feed === "belt") {
    crew = 2;
    why = "La bande veut un chargeur à côté du pointeur.";
  }
  if (mount === "bipied") {
    crew = Math.max(crew, 2);
    why = forced
      ? "Calibre, poids ou recul : le bipied s’impose, avec un servant au pied."
      : "Bipied. Le pointeur tient la crosse, l’autre cale le pied.";
  }
  if (mount === "trepied") {
    crew = n.diameter >= 7 || n.feed === "belt" ? 4 : 3;
    why = forced
      ? "Trop lourd, trop long ou trop gros pour une épaule. Trépied, et plusieurs opérateurs."
      : "Trépied choisi. Personne ne porte cette bouche à feu seul.";
  }
  const roles = ["Pointeur", "Chargeur", "Porte-pied", "Second pied"].slice(0, crew);
  const mag = n.magazine;
  let reloadS = 1.6 + mag * 0.12;
  if (n.feed === "single") reloadS = 1.7;
  if (n.feed === "clip") reloadS = 1.05 + mag * 0.22;
  if (n.feed === "box") reloadS = (n.action === "blowback" ? 0.75 : 1.45) + mag * 0.06;
  if (n.feed === "tube") reloadS = 0.8 + mag * 0.42;
  if (n.feed === "belt") reloadS = crew >= 2 ? 3.2 + mag * 0.04 : 6.4 + mag * 0.08;
  if (mount === "trepied") reloadS += 0.6;
  return { crew, why, reloadS, lengthMm, magazine: mag, mount, asked, forced, roles };
}

export function reloadSteps(d0: Design, crew: number): string[] {
  const d = normalizeDesign(d0);
  if (d.feed === "single") return ["Ouvrir la culasse", "Glisser le coup", "Fermer"];
  if (d.feed === "clip") return ["Ouvrir", "Engager la lame", "Pousser les coups", "Jeter la lame"];
  if (d.feed === "box") return ["Décrocher le boîtier", "Présenter le plein", "Verrouiller"];
  if (d.feed === "tube") {
    const n = Math.min(d.magazine, 4);
    return [...Array.from({ length: n }, (_, i) => `Grain ${i + 1} dans le tube`), "Refermer"];
  }
  if (crew >= 2) return ["Le chargeur amorce la bande", "Aligner le maillon", "Le pointeur reprend"];
  return ["La bande se tord", "Seul, on reprend trop tard"];
}

function dragCd(mach: number, form: number): number {
  let cd: number;
  if (mach < 0.75) cd = 0.22 + mach * 0.08;
  else if (mach < 1.15) cd = 0.28 + (mach - 0.75) * 1.2;
  else if (mach < 1.6) cd = 0.76 - (mach - 1.15) * 0.38;
  else cd = 0.55 - Math.min(0.14, (mach - 1.6) * 0.05);
  return cd * form;
}

export function pressureIndex(d: Design, massG: number, powderG: number): number {
  const n = normalizeDesign(d);
  const r = n.caseDiameter / 20;
  const usable = Math.max(0.006, Math.PI * r * r * (n.caseLength / 10) * 0.5);
  const density = powderG / usable;
  const heavy = massG / (n.diameter * n.diameter * 0.028);
  const short = 90 / Math.max(36, n.barrelLength);
  return density * (0.55 + heavy * 0.45) * (0.8 + short * 0.28) * BURN[n.burn];
}

function millerSg(d: Design, massG: number): number {
  const mGr = massG * 15.432;
  const dIn = d.diameter / 25.4;
  const lCal = d.bulletLength / d.diameter;
  const tCal = d.twist / d.diameter;
  return (30 * mGr) / (tCal * tCal * dIn ** 3 * lCal * (1 + lCal * lCal));
}

function weaponG(d: Design): number {
  const prof = d.profile === "light" ? 0.7 : d.profile === "heavy" ? 1.4 : 1;
  const action = d.action === "blowback" ? 0.62 : d.action === "straight" ? 1.18 : d.action === "lever" ? 0.95 : 1;
  const sight = d.sight === "optic" ? 14 : d.sight === "aperture" ? 2.2 : 0.8;
  const feed = d.feed === "belt" ? 18 : d.feed === "box" ? 6 : d.feed === "tube" ? 3 : 0;
  const muzzle = d.muzzle === "manchon" ? 11 : d.muzzle === "frein" ? 6 : d.muzzle === "cache" ? 3 : 0;
  const mount = d.mount === "trepied" ? 36 : d.mount === "bipied" ? 14 : 0;
  const grip = d.foregrip === "poignee" ? 4 : 0;
  const bore = Math.max(0, d.diameter - 1.4) * 4.2;
  return 16 + (d.barrelLength / 100) * 24 * prof * action + sight + feed + muzzle + mount + grip + bore;
}

function fly(d: Design, v0: number, angle: number, massKg: number, form: number, wind: number, diamMm: number) {
  const A = Math.PI * (diamMm / 2000) ** 2;
  let x = 0;
  let y = -0.003;
  let vx = v0 * Math.cos(angle);
  let vy = v0 * Math.sin(angle);
  let t = 0;
  const dt = 0.00035;
  const raw: Sample[] = [{ range: 0, drop: y, velocity: v0, energy: 0.5 * massKg * v0 * v0, drift: 0, tof: 0 }];
  let next = 2;
  while (t < 0.55 && x < 70 && y > -0.8 && vx > 25) {
    const v = Math.hypot(vx, vy) + 0.0001;
    const k = (0.5 * 1.225 * dragCd(v / 340, form) * A) / massKg;
    vx += -k * v * vx * dt;
    vy += (-k * v * vy - 9.806) * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
    if (x >= next) {
      const vv = Math.hypot(vx, vy);
      const lag = Math.max(0, t - x / v0);
      raw.push({
        range: Math.round(x),
        drop: y,
        velocity: vv,
        energy: 0.5 * massKg * vv * vv,
        drift: wind * lag,
        tof: t,
      });
      next += 2;
    }
  }
  const yAt = (range: number) => {
    if (raw.length < 2) return y;
    let i = 0;
    while (i < raw.length - 1 && raw[i + 1].range < range) i++;
    const a = raw[i];
    const b = raw[Math.min(raw.length - 1, i + 1)];
    const u = b.range === a.range ? 0 : (range - a.range) / (b.range - a.range);
    return a.drop + (b.drop - a.drop) * Math.max(0, Math.min(1.4, u));
  };
  return { samples: raw, yAt };
}

export function cartridgeName(d: Design): string {
  const n = normalizeDesign(d);
  const kind = n.effect === "shot" ? "grains" : n.filler === "burst" ? "éclat" : n.effect === "ap" ? "perf" : "";
  return `Mle ${n.diameter.toFixed(2)}×${n.caseLength.toFixed(1)}${kind ? " " + kind : ""}`;
}

export function evaluate(d0: Design, wind = 1.5): Report {
  const d = normalizeDesign(d0);
  const massG = bulletMassG(d);
  const powderG = powderMassG(d);
  const brassG = brassMassG(d);
  const shot = d.effect === "shot";
  const pelletN = shot ? d.pellets : 1;
  const pelletMm = pelletDiameter(d);
  const flyMassG = shot ? massG / pelletN : massG;
  const massKg = Math.max(0.00002, massG / 1000);
  const flyKg = Math.max(0.000008, flyMassG / 1000);
  const form = formFactor(d);
  const pressure = pressureIndex(d, massG, powderG);
  const burnLen = d.burn === "vive" ? 0.68 : d.burn === "lente" ? 1.42 : 1;
  const barrelFactor = 1 - Math.exp(-d.barrelLength / ((26 + d.caseLength * 2.4 + powderG * 500) * burnLen));
  const eta = 0.2 * Math.min(1, 1.12 - Math.max(0, pressure - 1.2) * 0.22);
  const energyJ = eta * barrelFactor * powderG * 3600;
  const velocity = Math.sqrt((2 * Math.max(0.4, energyJ)) / massKg);
  const sg = shot ? 1.6 : millerSg(d, massG);
  const wG = weaponG(d);
  const impulse = massKg * velocity + (powderG / 1000) * velocity * 0.55;
  let recoilJ = (impulse * impulse) / (2 * (wG / 1000));
  if (d.muzzle === "frein") recoilJ *= 0.8;
  const jf = shellFrac(d);

  let pressureLabel: Report["pressureLabel"] = "nominal";
  if (pressure < 0.62) pressureLabel = "sage";
  else if (pressure < 1.05) pressureLabel = "nominal";
  else if (pressure < 1.4) pressureLabel = "chaud";
  else pressureLabel = "dangereux";

  let stabilityLabel: Report["stabilityLabel"] = "stable";
  if (!shot && sg < 1.2) stabilityLabel = "clé";
  else if (!shot && sg > 3.2) stabilityLabel = "surstable";

  let recoilLabel: Report["recoilLabel"] = "tenu";
  if (recoilJ > 0.085) recoilLabel = "lourd";
  else if (recoilJ > 0.045) recoilLabel = "sec";

  const blowbackOk = pressure < 1.25 && d.caseLength < 9 && d.barrelLength < 75;
  let buildable = true;
  let blockReason: string | null = null;
  if (d.action === "blowback" && !blowbackOk) {
    buildable = false;
    blockReason = "Culasse non calée : à cette pression, l’arme s’ouvre sur le tireur.";
  }
  if (d.caseDiameter < d.diameter + 0.15) {
    buildable = false;
    blockReason = "L’étui est plus étroit que la balle. Rien ne chambre dans un Meumeu.";
  }
  if (!shot && d.bulletLength < d.diameter * 1.15) {
    buildable = false;
    blockReason = "Balle trop courte pour son calibre : elle ne tient pas l’axe.";
  }
  if (shot && d.filler === "burst") {
    buildable = false;
    blockReason = "Les grains n’emportent pas de charge. On choisit l’un ou l’autre.";
  }

  const reliable =
    buildable &&
    pressureLabel !== "dangereux" &&
    stabilityLabel !== "clé" &&
    !(d.action === "lever" && (d.nose === "spitzer" || d.nose === "hollow") && !shot);

  let lo = -0.04;
  let hi = 0.16;
  let angle = 0.01;
  let flown = fly(d, velocity, angle, flyKg, form, wind, pelletMm);
  for (let i = 0; i < 12; i++) {
    angle = (lo + hi) / 2;
    flown = fly(d, velocity, angle, flyKg, form, wind, pelletMm);
    if (flown.yAt(d.zero) > 0) hi = angle;
    else lo = angle;
  }
  flown = fly(d, velocity, angle, flyKg, form, wind, pelletMm);
  const samples = flown.samples.map((s) => ({
    ...s,
    velocity: Math.round(s.velocity),
    energy: Math.round(s.energy * pelletN * 100) / 100,
    drop: Math.round(s.drop * 1000) / 1000,
    drift: Math.round(s.drift * 1000) / 1000,
    tof: Math.round(s.tof * 1000) / 1000,
  }));

  let usefulM = 0;
  const usefulE = shot ? 1.2 : 4.5;
  for (const s of samples) {
    if (s.energy >= usefulE && Math.abs(s.drop) < 0.07) usefulM = s.range;
  }
  let transonicM: number | null = null;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].velocity < 340 && samples[i - 1].velocity >= 340) {
      transonicM = samples[i].range;
      break;
    }
  }

  const roundG = massG + powderG + brassG + 0.02;
  const profWear = d.profile === "light" ? 1.5 : d.profile === "heavy" ? 0.68 : 1;
  const barrelLife = Math.round(9000 / (profWear * (0.45 + pressure * pressure) * (velocity / 480)));
  const rpm = d.action === "blowback" ? 22 : d.action === "straight" ? 14 : d.action === "lever" ? 11 : 8;

  const coreG = massG * (1 - jf);
  let leadG = 0;
  let steelG = 0;
  let tungstenG = 0;
  if (d.core === "lead") leadG = coreG;
  else if (d.core === "jacket") leadG = coreG * 0.82;
  else if (d.core === "steel") {
    steelG = coreG * 0.72;
    leadG = coreG * 0.28;
  } else if (d.core === "tungsten") {
    tungstenG = coreG * 0.74;
    leadG = coreG * 0.14;
    steelG = coreG * 0.12;
  } else leadG = coreG * 0.22;
  if (d.effect === "ap") steelG += coreG * 0.12;
  if (d.jacket === "acier") steelG += massG * jf;
  const jacketBrass = d.jacket === "cuivre" || d.jacket === "tombac" ? massG * jf : 0;

  const goods: string[] = [];
  const bads: string[] = [];
  const bodies = d.barrelLength / (BODY.heightCm * 10);
  if (velocity > 520) goods.push("Trajectoire tendue sur les premières longueurs de corps.");
  if (velocity < 320) bads.push("Lente à cette échelle : la chute arrive avant le Bê.");
  if (roundG < 0.22) goods.push(`Fret léger : ${Math.round(WAGON_G / roundG)} coups dans un fourgon de ${WAGON_G} g.`);
  if (roundG > 0.55) bads.push("La caisse de cartouches dispute la place au grain. La ligne se tait la première.");
  if (d.effect === "ap" || d.core === "steel" || d.core === "tungsten") {
    goods.push("Traverse mieux l’os — un fémur de Meumeu ne fait que 4,4 mm.");
    bads.push("Canal étroit si elle ne bascule pas : elle sort de l’autre côté sans vider le corps.");
  }
  if (d.nose === "hollow" || d.nose === "soft" || d.effect === "frag") {
    goods.push("De près, elle cède son énergie dans 7 cm de torse.");
    bads.push("Une brindille, une planchette, et elle n’arrive plus.");
  }
  if (d.effect === "api") {
    goods.push("Allume paille, toile, graisse de fourgon — le matériel des Bê.");
    bads.push("Moins de métal, caisses à tenir au sec, et le feu n’arrête pas un cœur.");
  }
  if (d.effect === "tracer") {
    goods.push("La compagnie voit sa ligne de tir.");
    bads.push("Les Bê la voient aussi. Trente centimètres, ça ne se cache pas longtemps.");
  }
  if (d.effect === "shot") {
    goods.push("Le nuage couvre un torse sous quatre mètres.");
    bads.push("Chaque grain est trop menu : passé la clairière proche, il ne reste qu’un souffle.");
  }
  if (stabilityLabel === "surstable") bads.push("Trop stable : la balle pleine ne bascule pas dans un corps si court.");
  if (stabilityLabel === "clé") bads.push("Sous-stabilisée : elle part en clé avant d’avoir franchi la clairière.");
  if (pressureLabel === "chaud") bads.push("Charge chaude : le canon, déjà petit, se mange en acier de rechange.");
  if (pressureLabel === "dangereux") bads.push("Charge refusée au feu de compagnie : étuis fendus, faces brûlées.");
  if (pressureLabel === "sage") bads.push("Poudre trop sage : la vitesse reste dans les 30 cm du canon.");
  if (d.burn === "vive" && d.barrelLength > 110) bads.push("Poudre vive dans un long tube : elle a fini de brûler avant la bouche.");
  if (d.burn === "lente" && d.barrelLength < 70) bads.push("Poudre lente, canon court : la flamme sort avec la balle.");
  if (d.burn === "vive" && d.barrelLength < 70 && pressureLabel !== "dangereux") goods.push("Poudre vive : le canon court lui suffit.");
  if (recoilLabel === "lourd") bads.push("Le recul arrache un tireur de 360 g. Un coup, puis on reprend la ligne.");
  if (recoilLabel === "tenu") goods.push("Recul tenu par une épaule de Meumeu : le feu peut se répéter.");
  if (bodies > 0.45) bads.push("Canon plus long qu’un demi-corps : maladroit dans les terriers et sous 4 m.");
  if (d.barrelLength < 55 && !shot) bads.push("Canon court : la poudre brûle dehors, la balle naît déjà fatiguée.");
  if (d.action === "lever" && (d.nose === "spitzer" || d.nose === "hollow") && !shot) bads.push("Le levier accroche les pointes. Enrayage au moment de payer le fret.");
  if (d.core === "tungsten") bads.push("Le puits n’en donne que des miettes. Un noyau dense se mérite en journées.");
  if (d.filler === "void" && d.cavity > 0.15) {
    goods.push("Cavité : la balle s’ouvre et lâche des éclats dans l’organe, pas au-delà.");
    bads.push("Moins de masse, moins de fond. Un os de 4 mm l’arrête plus tôt.");
  }
  if (d.filler === "burst") {
    goods.push("Petite charge d’éclat, de l’ordre du centimètre — pas une grenade.");
    bads.push("La poudre de la cavité se paie, et la pénétration s’effondre dès qu’elle s’ouvre.");
  }
  if (d.base === "boat" && d.boat > 0.15) goods.push("Queue de bateau : elle tient mieux sa vitesse quand le vent traverse la clairière.");
  if (d.meplat > 0.3) bads.push("Méplat large : elle freine tôt et s’ouvre dès qu’elle trouve de la chair.");
  if (jf > 0.22) {
    goods.push("Chemise épaisse : le noyau reste entier plus longtemps.");
    bads.push("Elle perce en trou d’aiguille et s’ouvre mal.");
  }
  if (d.jacket === "none" && !shot) bads.push("Sans chemise, le plomb s’écaille dans les rayures.");
  if (d.caseMat === "paper") bads.push("Étui papier : léger au fourgon, fichu dès que le fossé est mouillé.");
  if (d.caseMat === "steel") bads.push("Étui acier : économise le laiton, use l’extracteur.");
  if (d.feed === "single") bads.push("Coup par coup. Le chargeur n’existe pas : on recharge après chaque départ.");
  if (d.feed === "belt") bads.push("La bande est lourde et veut un servant. Sans lui, le feu s’étouffe.");
  if (d.feed === "tube") bads.push("Magasin tubulaire : lent à remplir, les pointes molles s’y poussent.");
  if (d.sight === "optic") {
    goods.push("L’œil tient le groupement tant que la balle est encore vive.");
    bads.push("Verre fragile dans un fourgon qui saute sur des racines.");
  }
  if (transonicM !== null && transonicM < d.zero) bads.push(`Elle passe le mur vers ${transonicM} m : le groupement s’ouvre avant le zéro.`);
  if (!buildable && blockReason) bads.unshift(blockReason);

  const served = serviceOf(d, wG, recoilLabel);
  if (served.crew > 1) bads.push(served.why);
  if (d.muzzle === "frein") goods.push("Frein de bouche : une part du recul part sur les côtés, pas dans l’épaule.");
  if (d.muzzle === "manchon") bads.push("Le manchon allonge la pièce et chauffe. Il ne fait pas une autre arme.");
  if (d.foregrip === "poignee") goods.push("Poignée avant : le second Meumeu, ou le pointeur, tient plus court.");
  if (d.diameter >= 4.2) bads.push("Au-delà de ce calibre, le poids et le recul quittent l’échelle d’une seule épaule.");
  let shownG = wG;
  if (served.mount === "trepied" && d.mount === "epaule") shownG += 36;
  else if (served.mount === "trepied" && d.mount === "bipied") shownG += 22;
  else if (served.mount === "bipied" && d.mount === "epaule") shownG += 14;

  const sd = (shot ? flyMassG : massG) / (pelletMm * pelletMm);

  return {
    name: cartridgeName(d),
    massG,
    powderG,
    brassG,
    roundG,
    roundsPerKg: Math.round(1000 / roundG),
    roundsPerWagon: Math.round(WAGON_G / roundG),
    velocity,
    energyJ,
    pressure,
    pressureLabel,
    stability: sg,
    stabilityLabel,
    recoilJ,
    recoilLabel,
    weaponG: shownG,
    barrelLife,
    rpm,
    reliable,
    buildable,
    blockReason,
    samples,
    zeroAngleDeg: (angle * 180) / Math.PI,
    usefulM,
    barrelBodies: bodies,
    caliberOnArtery: d.diameter / BODY.arteryMm,
    cost: {
      lead: leadG,
      brass: (d.caseMat === "brass" ? brassG : brassG * 0.12) + jacketBrass,
      propellant: powderG * (d.effect === "api" ? 1.4 : 1) * (d.filler === "burst" ? 1 + d.cavity : 1),
      steel: steelG + (d.caseMat === "steel" ? brassG * 0.75 : 0),
      tungsten: tungstenG,
    },
    rifleCost: {
      steel: (22 + d.barrelLength * 0.18) * (d.profile === "heavy" ? 1.35 : d.profile === "light" ? 0.72 : 1) + (d.sight === "optic" ? 10 : 1.5) + (d.feed === "belt" ? 14 : d.feed === "box" ? 4 : 0),
      timber: d.profile === "heavy" ? 6 : 9,
      labor: d.action === "straight" ? 1.4 : d.action === "blowback" ? 0.55 : 1,
    },
    crew: served.crew,
    crewWhy: served.why,
    crewRoles: served.roles,
    mount: served.mount,
    mountAsked: served.asked,
    mountForced: served.forced,
    reloadS: Math.round(served.reloadS * 10) / 10,
    weaponLengthMm: served.lengthMm,
    magazine: served.magazine,
    feed: d.feed,
    goods,
    bads,
    form,
    sd,
    pelletN,
    pelletMm,
    transonicM,
    jacketFrac: jf,
  };
}

export type Tissue = { id: string; label: string; cm: number; state: "franchie" | "arret" | "intacte" };
export type Frag = { n: number; ang: number; cm: number; mg: number; stop: "tissu" | "os" | "sortie"; where: string };

export type Wound = {
  zone: ZoneId;
  reached: boolean;
  penCm: number;
  expanded: boolean;
  fragmented: boolean;
  incendiary: boolean;
  immediate: number;
  bleed: number;
  seconds: number | null;
  hors: "aucun" | "leger" | "differe" | "rapide" | "immediat";
  severity: 0 | 1 | 2 | 3 | 4;
  lines: string[];
  fragCount: number;
  blastCm: number;
  exit: boolean;
  pathCm: number;
  stopCm: number;
  tempCm: number;
  permMm: number;
  obliquity: number;
  tissues: Tissue[];
  frags: Frag[];
  organs: string[];
  armorStop: boolean;
  armorLabel: string;
};

type RawTissue = { id: string; label: string; cm: number; resist: number; bone?: boolean; organ?: boolean };

function tissuesRaw(zone: ZoneId): RawTissue[] {
  const peau: RawTissue = { id: "peau", label: "Peau et couture", cm: 0.14, resist: 0.4 };
  const bourre: RawTissue = { id: "bourre", label: "Bourre", cm: 0.42, resist: 0.3 };
  const muscle = (cm: number): RawTissue => ({ id: "muscle", label: "Muscle", cm, resist: 0.9 });
  const fond: RawTissue[] = [
    { id: "fond", label: "Paroi du fond", cm: 1.35, resist: 0.85 },
    { id: "peau2", label: "Peau de sortie", cm: 0.14, resist: 0.4 },
  ];
  switch (zone) {
    case "crane":
      return [
        peau,
        bourre,
        { id: "os", label: "Voûte", cm: 0.32, resist: 2.5, bone: true },
        { id: "cerveau", label: "Encéphale", cm: 1.7, resist: 0.65, organ: true },
        { id: "os2", label: "Base du crâne", cm: 0.3, resist: 2.3, bone: true },
      ];
    case "cou":
      return [
        peau,
        muscle(0.45),
        { id: "carotide", label: "Carotides", cm: 0.5, resist: 0.55, organ: true },
        muscle(0.5),
        { id: "vert", label: "Cervicales", cm: 0.42, resist: 2.2, bone: true },
      ];
    case "poumon":
      return [
        peau,
        bourre,
        muscle(0.4),
        { id: "cote", label: "Côte", cm: 0.18, resist: 1.9, bone: true },
        { id: "poumon", label: "Poumon", cm: 2.2, resist: 0.42, organ: true },
        { id: "mediastin", label: "Médiastin", cm: 1.2, resist: 0.75, organ: true },
        ...fond,
      ];
    case "coeur":
      return [
        peau,
        bourre,
        muscle(0.35),
        { id: "cote", label: "Côte", cm: 0.18, resist: 1.9, bone: true },
        { id: "poumon", label: "Poumon", cm: 0.7, resist: 0.45, organ: true },
        { id: "coeur", label: "Cœur", cm: 1.15, resist: 0.8, organ: true },
        ...fond,
      ];
    case "aorte":
      return [
        peau,
        muscle(0.55),
        { id: "aorte", label: "Aorte", cm: 0.55, resist: 0.7, organ: true },
        { id: "colonne", label: "Corps vertébral", cm: 0.7, resist: 2.7, bone: true },
        { id: "fond", label: "Chair du dos", cm: 1.1, resist: 0.85 },
      ];
    case "foie":
      return [
        peau,
        bourre,
        muscle(0.4),
        { id: "cote", label: "Côte basse", cm: 0.16, resist: 1.7, bone: true },
        { id: "foie", label: "Foie", cm: 1.7, resist: 0.8, organ: true },
        ...fond,
      ];
    case "rate":
      return [
        peau,
        muscle(0.4),
        { id: "rate", label: "Rate", cm: 0.85, resist: 0.65, organ: true },
        { id: "flanc", label: "Flanc", cm: 1.1, resist: 0.7 },
        ...fond,
      ];
    case "intestin":
      return [
        peau,
        muscle(0.5),
        { id: "intestin", label: "Abdomen creux", cm: 2.4, resist: 0.4, organ: true },
        { id: "colonne", label: "Colonne", cm: 0.55, resist: 2.5, bone: true },
        { id: "dos", label: "Dos", cm: 1.2, resist: 0.85 },
      ];
    case "colonne":
      return [
        peau,
        muscle(0.7),
        { id: "colonne", label: "Vertèbre", cm: 0.75, resist: 2.8, bone: true },
        { id: "moelle", label: "Canal", cm: 0.35, resist: 0.6, organ: true },
        muscle(0.6),
      ];
    case "femoral":
      return [
        peau,
        muscle(0.55),
        { id: "femoral", label: "Artère fémorale", cm: 0.3, resist: 0.5, organ: true },
        { id: "os", label: "Fémur", cm: 0.44, resist: 2.6, bone: true },
        muscle(0.4),
      ];
  }
}

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const ARMOR_META: Record<Armor, { label: string; hold: number; note: string }> = {
  none: { label: "Sans protection", hold: 0, note: "La couture est nue." },
  toile: { label: "Toile", hold: 0.18, note: "Une chemise. Un grain fatigué, pas une balle vive." },
  cuir: { label: "Cuir", hold: 0.48, note: "Peau épaisse. Les pointes molles s’y prennent." },
  lin: { label: "Lames de lin", hold: 0.95, note: "Toiles pressées. Ça casse ce qui s’ouvre." },
  plaque: { label: "Plaque mince", hold: 1.7, note: "Acier devant le thorax. Tête, cou et jambes restent nus." },
  ceramique: { label: "Céramique", hold: 2.5, note: "Elle se fend en buvant le coup. Le suivant passe mieux." },
  composite: { label: "Composite", hold: 2.15, note: "Fibres et plaque légère. Tient mieux l’éclat que l’aiguille." },
};

const THORAX: ZoneId[] = ["poumon", "coeur", "aorte", "foie", "rate", "colonne"];

export function terminal(d0: Design, velocity: number, zone: ZoneId, obliquity = 0, armor: Armor = "none"): Wound {
  const d = normalizeDesign(d0);
  const shot = d.effect === "shot";
  const pelletN = shot ? d.pellets : 1;
  const massAll = bulletMassG(d);
  const massG = shot ? massAll / pelletN : massAll;
  const diam = pelletDiameter(d);
  const sd = massG / (diam * diam);
  const meta = ZONE_META[zone];
  const v = velocity;
  const cavity = d.filler === "none" || shot ? 0 : d.cavity;
  const thick = d.jacket === "none" || shot ? 0 : d.jacketMm;
  let vOpen = d.nose === "hollow" || d.filler !== "none" ? 260 : d.nose === "soft" ? 300 : 340;
  vOpen += thick * 420;
  if (d.jacket === "acier") vOpen += 40;
  if (d.meplat > 0.35) vOpen -= 40;
  const expand =
    !shot &&
    ((d.nose === "hollow" || d.nose === "soft" || d.effect === "frag" || (d.filler === "void" && cavity > 0.12)) &&
      d.effect !== "ap" &&
      d.core !== "tungsten" &&
      v > vOpen) ||
    (!shot && d.filler === "burst" && v > 220);
  const burst = !shot && d.filler === "burst" && cavity > 0.1 && v > 220;
  const frag = shot || ((d.effect === "frag" || d.nose === "hollow" || cavity > 0.2) && expand && v > 250) || burst;
  const blastCm = burst ? Math.min(1.8, cavity * 1.35 * Math.min(1, v / 420)) : 0;
  const yaw = !shot && d.nose === "spitzer" && d.effect === "ball" && d.filler === "none" && v > 360 && d.core !== "tungsten" && !expand;
  let pen = 165 * sd * HARD[d.core] * Math.min(1.4, v / 480) * (v < 120 ? v / 120 : 1);
  if (d.effect === "ap") pen *= 1.48;
  if (d.core === "tungsten") pen *= 1.22;
  if (d.jacket === "acier") pen *= 1 + thick * 0.4;
  if (burst) pen *= 0.9;
  else if (expand && frag) pen *= 0.75;
  else if (expand) pen *= 0.82;
  if (d.effect === "api") pen *= 0.84;
  if (yaw && !expand) pen *= 0.82;
  if (shot) pen *= 0.45;
  const tilt = Math.max(0, Math.min(55, obliquity));
  const cos = Math.cos((tilt * Math.PI) / 180);
  const covered = armor !== "none" && THORAX.includes(zone);
  let armorStop = false;
  if (covered) {
    let hold = ARMOR_META[armor].hold;
    if (d.effect === "ap" || d.core === "tungsten") hold *= 0.42;
    else if (d.core === "steel") hold *= 0.62;
    if (shot) hold *= 2.6;
    else if (expand || d.nose === "hollow" || d.nose === "soft") hold *= 1.35;
    hold /= Math.max(0.5, cos);
    if (pen <= hold) {
      armorStop = true;
      pen = 0.05;
    } else pen = Math.max(0.04, pen - hold);
  }
  const reached = !armorStop && pen > meta.barrier + meta.depth * 0.35;
  const raw = tissuesRaw(zone);
  const tissues: Tissue[] = [];
  let remain = pen;
  let traveled = 0;
  let stopped = false;
  let spawnCm = 0.35;
  let seenOrgan = false;
  for (const layer of raw) {
    const path = layer.cm / Math.max(0.55, cos);
    const cost = path * layer.resist;
    if (!seenOrgan && layer.organ && !stopped) {
      spawnCm = traveled + Math.min(0.55, path * 0.3);
      seenOrgan = true;
    }
    if (stopped) {
      tissues.push({ id: layer.id, label: layer.label, cm: path, state: "intacte" });
      continue;
    }
    if (remain >= cost) {
      remain -= cost;
      traveled += path;
      tissues.push({ id: layer.id, label: layer.label, cm: path, state: "franchie" });
    } else {
      const frac = cost <= 0 ? 1 : remain / cost;
      traveled += path * frac;
      remain = 0;
      stopped = true;
      tissues.push({ id: layer.id, label: layer.label, cm: path, state: "arret" });
    }
  }
  const pathCm = raw.reduce((sum, layer) => sum + layer.cm / Math.max(0.55, cos), 0);
  const exit = !stopped;
  const stopCm = traveled;

  const lines: string[] = [];
  lines.push(
    `Impact ${Math.round(v)} m/s, obliquité ${Math.round(tilt)}°. Capacité ${pen.toFixed(1)} cm de tissu — cette coupe en fait ${pathCm.toFixed(1)} en chemin, le torse de référence ${BODY.torsoCm}.`,
  );
  const stopLayer = tissues.find((t) => t.state === "arret");
  if (armorStop) lines.push(`${ARMOR_META[armor].label} : le coup s’arrête dans la protection. Le thorax ne s’ouvre pas.`);
  else if (covered) lines.push(`${ARMOR_META[armor].label} traversée. ${ARMOR_META[armor].note}`);
  if (stopLayer) lines.push(`Arrêt dans ${stopLayer.label.toLowerCase()}, à ${stopCm.toFixed(1)} cm de l’entrée.`);
  else lines.push("Elle a de quoi traverser cette coupe et sortir de l’autre couture.");
  if (!reached) lines.push("Ça n’atteint pas la structure. Plaie de paroi, ou l’os de cette bestiole suffit.");
  if (expand && seenOrgan && spawnCm < stopCm) lines.push("La pointe s’ouvre dans l’organe. Le canal s’élargit, la course meurt dedans.");
  else if (expand) lines.push("Elle veut s’ouvrir, mais elle n’a plus assez de chemin : les éclats naissent dans la paroi.");
  if (yaw && !expand) lines.push("Bascule tardive : dans 7 cm, elle a à peine le temps de se mettre en travers.");
  if ((d.effect === "ap" || d.core === "tungsten") && !expand) {
    lines.push("Perforante : trou net, souvent de part en part. L’arrêt veut un vaisseau ou le crâne.");
  }
  const incendiary = d.effect === "api" && v > 250;
  if (incendiary) lines.push("Incendiaire de matériel. Sur le vivant : berge brûlée, pas un arrêt.");

  const e = 0.5 * (massG / 1000) * v * v;
  const dump = frag ? 1.8 : expand ? 1.55 : yaw ? 1.2 : d.effect === "ap" ? 0.6 : 1;
  let bleed = 0.15;
  let immediate = 0.02;
  if (reached) {
    if (meta.kind === "cns") immediate = 0.92;
    else if (meta.kind === "heart") immediate = 0.74 + (frag ? 0.12 : 0);
    else if (zone === "aorte") immediate = 0.88;
    else if (meta.kind === "artery") immediate = 0.16;
    else if (meta.kind === "bone") immediate = 0.42;
    else if (zone === "foie" || zone === "rate") immediate = 0.2;
    else immediate = 0.08;
    if (burst) immediate = Math.min(0.95, immediate + blastCm * 0.22);
    if (shot && v > 200) immediate = Math.min(0.9, immediate + 0.1);
    const energyFactor = Math.min(1.6, e / 10);
    bleed = meta.artery * (10 + 36 * energyFactor) * dump * (burst ? 1.25 : 1);
    if (zone === "poumon") bleed = Math.min(bleed, 3.2);
    if (zone === "intestin") bleed = Math.min(bleed, 2.8);
  }
  const seconds = bleed > 0.25 ? (BODY.incapMl / bleed) * 60 : null;
  let hors: Wound["hors"] = "leger";
  if (!reached && v < 180) hors = "aucun";
  else if (immediate >= 0.6) hors = "immediat";
  else if (seconds !== null && seconds < 12) hors = "rapide";
  else if (seconds !== null && seconds < 100) hors = "differe";
  else if (!reached) hors = "leger";

  if (hors === "immediat") lines.push("Hors de combat dans l’instant. Un Meumeu ou un Bê, même sang, même 26 ml.");
  else if (hors === "rapide") lines.push(`Le vaisseau vide les ${BODY.incapMl} ml qui comptent en ~${Math.max(1, Math.round(seconds ?? 0))} s.`);
  else if (hors === "differe") lines.push("Encore debout. Sans caisse médicale au Seuil, il quitte la ligne dans la journée.");
  else if (hors === "leger") lines.push("Ça dégrade le pion. Ça n’enlève pas la compagnie.");
  else lines.push("Choc sans voie utile.");

  const thin = thick > 0 && thick < 0.09;
  let fragCount = 0;
  if (shot) fragCount = pelletN;
  else if (frag) fragCount = Math.min(14, Math.round(3 + cavity * 14 + (thin ? 3 : 0) + (burst ? 4 : 0) + (d.jacket === "none" ? 2 : 0)));
  else if (expand) fragCount = 2;

  const seed = Math.round(d.diameter * 100 + d.bulletLength * 10 + v + zone.length * 17);
  const rnd = mulberry(seed);
  const payload = shot ? 1 : frag ? 0.62 : expand ? 0.2 : 0;
  const shares = Array.from({ length: fragCount }, () => 0.35 + rnd());
  const shareSum = shares.reduce((a, b) => a + b, 0) || 1;
  if (!seenOrgan || spawnCm > stopCm) spawnCm = Math.max(0.12, stopCm * 0.45);
  spawnCm = Math.min(spawnCm, Math.max(0.12, stopCm * 0.8));
  const room = Math.max(0.12, stopCm - spawnCm);
  const layerAt = (cm: number) => {
    let acc = 0;
    for (const t of tissues) {
      acc += t.cm;
      if (cm <= acc + 0.001) return t;
    }
    return tissues[tissues.length - 1];
  };
  const frags: Frag[] = shares.map((share, i) => {
    const u = rnd();
    const ang = shot ? -72 + u * 144 : burst ? -78 + u * 156 : expand && !frag ? -24 + u * 48 : -52 + u * 104;
    const cmBase = shot ? 0.25 + rnd() * 0.7 : 0.12 + rnd() * (0.35 + blastCm * 0.5 + cavity * 0.4);
    let cm = cmBase * Math.min(1.2, v / 400);
    cm = Math.min(cm, room * (0.45 + rnd() * 0.55));
    if (burst) cm = Math.min(cm, Math.max(0.15, blastCm));
    const end = layerAt(spawnCm + cm);
    const stop: Frag["stop"] = end.id === "os" || end.id === "os2" || end.id === "colonne" || end.id === "cote" || end.id === "vert" ? "os" : spawnCm + cm >= pathCm * 0.96 ? "sortie" : "tissu";
    return {
      n: i + 1,
      ang: Math.round(ang),
      cm: Math.round(cm * 100) / 100,
      mg: Math.round(((massG * payload * share) / shareSum) * 10000) / 10,
      stop,
      where: end.label.toLowerCase(),
    };
  });

  if (fragCount > 0) {
    const far = frags.reduce((m, f) => Math.max(m, f.cm), 0);
    const organIds = new Set(["coeur", "poumon", "foie", "rate", "cerveau", "aorte", "carotide", "femoral", "intestin", "moelle", "mediastin"]);
    const inOrgan = tissues.some((t) => t.state !== "intacte" && organIds.has(t.id));
    lines.push(
      shot
        ? `${fragCount} grains. Le plus loin dans la chair : ${far.toFixed(1)} cm. Chacun est une blessure mince.`
        : inOrgan
          ? `${fragCount} éclats, le plus long ${far.toFixed(1)} cm. Ils restent dans l’organe — pas une gerbe hors du corps.`
          : `${fragCount} éclats, le plus long ${far.toFixed(1)} cm. Ils naissent avant l’organe.`,
    );
  }
  if (burst) lines.push(`Petite charge : souffle ${blastCm.toFixed(1)} cm. Ce n’est pas une grenade, et ça ne le devient pas.`);
  else lines.push("Pas de charge. Rien ne détone.");

  const organs = new Set<string>();
  const organIds = new Set(["coeur", "poumon", "foie", "rate", "cerveau", "aorte", "carotide", "femoral", "intestin", "moelle", "mediastin"]);
  for (const t of tissues) {
    if (t.state !== "intacte" && organIds.has(t.id)) organs.add(t.label);
  }
  for (const f of frags) {
    const end = layerAt(spawnCm + f.cm);
    if (organIds.has(end.id)) organs.add(end.label);
  }

  const tempCm = burst ? blastCm : expand || frag ? Math.min(1.6, 0.18 + e / 28 + cavity * 0.4) : yaw ? 0.32 : 0.1;
  const permMm = shot ? diam : expand ? diam * (1.35 + cavity * 1.8 + d.meplat) : yaw ? diam * 1.5 : diam;

  const severity = (hors === "immediat" ? 4 : hors === "rapide" ? 3 : hors === "differe" ? 2 : hors === "leger" ? 1 : 0) as Wound["severity"];
  return {
    zone,
    reached,
    penCm: pen,
    expanded: expand,
    fragmented: frag,
    incendiary,
    immediate,
    bleed,
    seconds,
    hors,
    severity,
    lines,
    fragCount,
    blastCm,
    exit,
    pathCm,
    stopCm,
    tempCm,
    permMm,
    obliquity: tilt,
    tissues,
    frags,
    organs: armorStop ? [] : [...organs],
    armorStop,
    armorLabel: ARMOR_META[armor].label,
  };
}

export function sampleAt(report: Report, range: number): Sample {
  const s = report.samples;
  if (s.length === 0) return { range, drop: 0, velocity: 0, energy: 0, drift: 0, tof: 0 };
  let i = 0;
  while (i < s.length - 1 && s[i + 1].range < range) i++;
  const a = s[i];
  const b = s[Math.min(s.length - 1, i + 1)];
  const u = b.range === a.range ? 0 : (range - a.range) / (b.range - a.range);
  const k = Math.max(0, Math.min(1, u));
  return {
    range,
    drop: a.drop + (b.drop - a.drop) * k,
    velocity: a.velocity + (b.velocity - a.velocity) * k,
    energy: a.energy + (b.energy - a.energy) * k,
    drift: a.drift + (b.drift - a.drift) * k,
    tof: a.tof + (b.tof - a.tof) * k,
  };
}

export function hitChance(d: Design, report: Report, range: number): number {
  if (d.effect === "shot") {
    if (!report.buildable || report.pressureLabel === "dangereux") return 0.04;
    if (range <= 3) return 0.72;
    if (range <= 6) return 0.4;
    if (range <= 10) return 0.12;
    return 0.03;
  }
  if (!report.buildable || report.pressureLabel === "dangereux") return 0.03;
  const at = sampleAt(report, range);
  const sight = d.sight === "optic" ? 1.26 : d.sight === "aperture" ? 1.08 : 0.9;
  const stab = report.stabilityLabel === "clé" ? 0.42 : report.stabilityLabel === "surstable" ? 0.9 : 1;
  const energyKeep = Math.min(1, at.energy / 5);
  const dropPen = Math.min(1, Math.exp(-Math.abs(at.drop) * 22));
  const windPen = Math.min(1, Math.exp(-Math.abs(at.drift) * 18));
  const recoilPen = report.recoilLabel === "lourd" ? 0.62 : report.recoilLabel === "sec" ? 0.82 : 1;
  const awkward = range < 4 && d.barrelLength > 120 ? 0.7 : 1;
  const short = range > 16 && d.barrelLength < 55 ? 0.62 : 1;
  const falloff = Math.exp(-range / (d.sight === "optic" ? 30 : 17));
  const base = 0.58 * sight * stab * (0.4 + 0.6 * energyKeep) * dropPen * windPen * recoilPen * awkward * short;
  return Math.max(0.03, Math.min(0.8, base * (0.4 + 0.6 * falloff)));
}

export function volleyCap(report: Report): number {
  let n = 1;
  if (report.reliable && report.recoilLabel !== "lourd") n = report.recoilLabel === "sec" ? 2 : report.rpm >= 20 ? 4 : 3;
  if (report.feed === "belt" && report.crew >= 2) n = Math.max(n, 6);
  if (report.feed === "single") n = 1;
  return Math.min(n, Math.max(1, report.magazine));
}

export function chambers(rifle: Design, ammo: Design): boolean {
  return Math.abs(rifle.diameter - ammo.diameter) < 0.08 && Math.abs(rifle.caseLength - ammo.caseLength) < 0.45;
}

export function ammoKey(d0: Design): string {
  const d = normalizeDesign(d0);
  return [
    d.diameter,
    d.caseLength,
    d.caseDiameter,
    d.bulletLength,
    d.powderFill.toFixed(2),
    d.core,
    d.nose,
    d.effect,
    d.filler,
    d.cavity.toFixed(2),
    d.jacket,
    d.jacketMm.toFixed(2),
    d.base,
    d.burn,
    d.meplat.toFixed(2),
    d.boat.toFixed(2),
    d.caseMat,
    d.pellets,
  ].join("|");
}

export function rifleKey(d0: Design): string {
  const d = normalizeDesign(d0);
  return [ammoKey(d), d.barrelLength, d.twist, d.action, d.sight, d.profile, d.feed, d.magazine].join("|");
}

export const ENEMY_DESIGN: Design = {
  ...defaultDesign(),
  diameter: 1.55,
  caseLength: 10.5,
  caseDiameter: 2.4,
  bulletLength: 5.8,
  powderFill: 0.8,
  barrelLength: 88,
  twist: 58,
  nose: "round",
  effect: "ball",
  sight: "iron",
  zero: 12,
};

export const LABELS = {
  core: { lead: "Plomb nu", jacket: "Noyau plomb chemisé", steel: "Noyau acier", tungsten: "Noyau dense", frangible: "Frittée" },
  nose: { round: "Ronde", spitzer: "Pointue", flat: "Méplat", hollow: "Creuse", soft: "Pointe molle" },
  effect: { ball: "Balle", ap: "Perforante", api: "Incendiaire matériel", frag: "Fragmentable", tracer: "Traceuse", shot: "Chevrotine" },
  action: { bolt: "Verrou", lever: "Levier", straight: "Culasse droite", blowback: "Masse non calée" },
  sight: { iron: "Guidon", aperture: "Œilleton", optic: "Lunette" },
  profile: { light: "Mince", standard: "De guerre", heavy: "Lourd" },
  feed: { single: "Coup par coup", clip: "Lame", box: "Boîte", tube: "Tube", belt: "Bande" },
  caseMat: { brass: "Laiton", steel: "Acier", paper: "Papier" },
  filler: { none: "Pleine", void: "Cavité", burst: "Petite charge" },
  base: { flat: "Culot plat", boat: "Queue de bateau" },
  jacket: { none: "Sans chemise", tombac: "Tombac", cuivre: "Cuivre", acier: "Acier" },
  burn: { lente: "Poudre lente", moyenne: "Poudre de guerre", vive: "Poudre vive" },
  muzzle: { none: "Bouche nue", frein: "Frein", cache: "Cache-flamme", manchon: "Manchon" },
  mount: { epaule: "Épaule", bipied: "Bipied", trepied: "Trépied" },
  foregrip: { none: "Sans poignée", poignee: "Poignée avant" },
  armor: {
    none: "Sans protection",
    toile: "Toile",
    cuir: "Cuir",
    lin: "Lames de lin",
    plaque: "Plaque mince",
    ceramique: "Céramique",
    composite: "Composite",
  },
  hors: {
    aucun: "Rien de net",
    leger: "Blessure légère",
    differe: "Hors de combat différé",
    rapide: "Hors de combat dans la foulée",
    immediat: "Hors de combat immédiat",
  },
} as const;