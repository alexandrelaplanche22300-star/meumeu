import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BODY,
  ENEMY_DESIGN,
  WAGON_G,
  ammoKey,
  cartridgeName,
  chambers,
  evaluate,
  hitChance,
  rifleKey,
  sampleAt,
  terminal,
  volleyCap,
  defaultDesign,
  normalizeDesign,
} from "./ballistics";
import type { Battle, CargoKind, Company, Convoy, Depot, DepotId, Design, Lot, LogLine, RawStock, ZoneId } from "./types";

export const WAGONS = 5;
export const RATION_G = 22;
export const MOUTHS = { mines: 20, arsenal: 28 } as const;
export const SMITHS = 8;
export const SQUAD = 30;
export const WAGON = WAGON_G;

const ROADS: Record<string, { km: number; days: number }> = {
  "mines|arsenal": { km: 2.2, days: 1 },
  "arsenal|mines": { km: 2.2, days: 1 },
  "arsenal|front": { km: 5.4, days: 2 },
  "front|arsenal": { km: 5.4, days: 2 },
  "mines|front": { km: 8.1, days: 4 },
  "front|mines": { km: 8.1, days: 4 },
};

export function road(a: DepotId, b: DepotId) {
  return ROADS[`${a}|${b}`];
}

function blank(): RawStock {
  return { grain: 0, brass: 0, propellant: 0, lead: 0, steel: 0, tungsten: 0, medical: 0, timber: 0 };
}

function depots(): Record<DepotId, Depot> {
  return {
    mines: {
      id: "mines",
      name: "Puits-Meumeu",
      km: 0,
      stock: { ...blank(), grain: 6000, lead: 900, steel: 520, timber: 2200, brass: 180, propellant: 120, tungsten: 3 },
      cartridges: [],
      rifles: [],
    },
    arsenal: {
      id: "arsenal",
      name: "Arsenal de la Cale",
      km: 2.2,
      stock: { ...blank(), grain: 3800, brass: 90, propellant: 45, lead: 80, steel: 180, timber: 90 },
      cartridges: [],
      rifles: [],
    },
    front: {
      id: "front",
      name: "Dépôt du Seuil",
      km: 7.6,
      stock: { ...blank(), grain: 1400, medical: 1 },
      cartridges: [],
      rifles: [],
    },
  };
}

export type Aim = "centre" | "tete" | "jambe";

type Snapshot = {
  day: number;
  wind: number;
  design: Design;
  zone: ZoneId;
  depots: Record<DepotId, Depot>;
  convoys: Convoy[];
  companies: Company[];
  labor: number;
  wagons: number;
  battle: Battle | null;
  log: LogLine[];
  notice: string;
};

function fresh(): Snapshot {
  return {
    day: 1,
    wind: 1.5,
    design: defaultDesign(),
    zone: "coeur",
    depots: depots(),
    convoys: [],
    companies: [],
    labor: SMITHS,
    wagons: WAGONS,
    battle: null,
    log: [{ day: 1, text: "Les Meumeu — bovins de peluche, 30 cm — tiennent les puits. Les Bê, chèvres de même taille, sont au-delà du fossé. Rien n’est encore armé." }],
    notice: "Le grain pèse plus lourd que les cartouches. Faites rouler un fourgon avant de rêver de feu.",
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function pushLog(log: LogLine[], day: number, text: string) {
  return [{ day, text }, ...log].slice(0, 16);
}

function mergeLot(lots: Lot[], lot: Lot, keyOf: (d: Design) => string) {
  const key = keyOf(lot.design);
  const hit = lots.find((l) => keyOf(l.design) === key);
  if (hit) hit.qty += lot.qty;
  else lots.push(lot);
}

export function wagonsUsed(convoys: Convoy[]) {
  return convoys.reduce((a, c) => a + c.wagons, 0);
}

export function cargoGrams(cargo: CargoKind, amount: number, design?: Design) {
  if (cargo === "medical") return amount * 60;
  if (cargo === "cartridges" && design) return amount * evaluate(design).roundG;
  if (cargo === "rifles" && design) return amount * evaluate(design).weaponG;
  return amount;
}

const RAW: (keyof RawStock)[] = ["grain", "brass", "propellant", "lead", "steel", "tungsten", "medical", "timber"];

export function readiness(s: Snapshot) {
  const trained = s.companies.filter((c) => c.trainDays <= 0 && c.rifles >= SQUAD);
  const hands = trained.reduce((a, c) => a + c.rifles, 0);
  const ammo = trained.reduce((a, c) => a + c.ammo, 0) + s.depots.front.cartridges.reduce((a, l) => a + l.qty, 0);
  const mouths = trained.reduce((a, c) => a + c.fit + c.wounded, 0) + 8;
  const days = s.depots.front.stock.grain / (mouths * RATION_G);
  const checks = [
    { label: "Deux compagnies instruites", ok: trained.length >= 2, detail: `${trained.length} / 2` },
    { label: "Quarante coups par fusil, sur le dos ou au Seuil", ok: hands > 0 && ammo >= hands * 40, detail: `${ammo} coups pour ${hands} fusils` },
    { label: "Quatre jours de grain au Seuil", ok: days >= 4, detail: `${days.toFixed(1)} j` },
    { label: "Trois caisses médicales au Seuil", ok: s.depots.front.stock.medical >= 3, detail: `${s.depots.front.stock.medical} caisses` },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

function pickZone(aim: Aim) {
  const table: Record<Aim, [ZoneId, number][]> = {
    centre: [
      ["poumon", 0.28],
      ["coeur", 0.16],
      ["aorte", 0.08],
      ["foie", 0.14],
      ["rate", 0.1],
      ["intestin", 0.16],
      ["colonne", 0.08],
    ],
    tete: [
      ["crane", 0.62],
      ["cou", 0.38],
    ],
    jambe: [
      ["femoral", 0.78],
      ["intestin", 0.22],
    ],
  };
  let r = Math.random();
  for (const [z, p] of table[aim]) {
    r -= p;
    if (r <= 0) return z;
  }
  return table[aim][0][0];
}

type Game = Snapshot & {
  setDesign: (patch: Partial<Design>) => void;
  setWind: (wind: number) => void;
  setZone: (zone: ZoneId) => void;
  applyPreset: (design: Design) => void;
  advanceDay: () => void;
  dispatch: (from: DepotId, to: DepotId, cargo: CargoKind, amount: number, lotId?: string) => void;
  makeAmmo: (qty: number) => void;
  makeRifles: (qty: number) => void;
  train: () => void;
  distribute: () => void;
  startBattle: () => void;
  setRange: (range: number) => void;
  fire: (aim: Aim) => void;
  reset: () => void;
};

export const useGame = create<Game>()(
  persist(
    (set, get) => ({
      ...fresh(),
      setDesign: (patch) => set({ design: normalizeDesign({ ...get().design, ...patch }) }),
      setWind: (wind) => set({ wind }),
      setZone: (zone) => set({ zone }),
      applyPreset: (design) => set({ design: normalizeDesign(design) }),
      reset: () => set(fresh()),
      advanceDay: () => {
        const s = get();
        if (s.battle && !s.battle.resolved) {
          set({ notice: "L’escarmouche n’est pas finie. Le jour ne se clôt pas au milieu du feu." });
          return;
        }
        const depots = structuredClone(s.depots);
        const companies = s.companies.map((c) => ({ ...c }));
        let log = s.log;
        const day = s.day + 1;
        const mines = depots.mines.stock;
        mines.grain += 2000;
        mines.lead += 240;
        mines.steel += 170;
        mines.timber += 450;
        mines.brass += 80;
        mines.propellant += 50;
        mines.tungsten = round2(mines.tungsten + 0.7);

        const eat = (id: DepotId, mouths: number, who: string) => {
          const need = mouths * RATION_G;
          if (mouths <= 0) return true;
          if (depots[id].stock.grain >= need) {
            depots[id].stock.grain = round2(depots[id].stock.grain - need);
            return true;
          }
          depots[id].stock.grain = 0;
          log = pushLog(log, day, `${who} ont jeûné. ${need} g manquaient.`);
          return false;
        };
        eat("mines", MOUTHS.mines, "Les bouches des Puits");
        eat("arsenal", MOUTHS.arsenal, "Les bouches de la Cale");
        const frontMouths = companies.reduce((a, c) => a + c.fit + c.wounded, 0);
        const fed = eat("front", frontMouths, "Les compagnies du Seuil");
        if (!fed) {
          for (const c of companies) {
            const loss = Math.max(1, Math.round(c.fit * 0.1));
            const moved = Math.min(c.fit, loss);
            c.fit -= moved;
            c.wounded += moved;
            c.blood = Math.min(1, c.blood + 0.15);
          }
        }

        const convoys: Convoy[] = [];
        for (const c of s.convoys) {
          if (c.daysLeft > 1) convoys.push({ ...c, daysLeft: c.daysLeft - 1 });
          else {
            const dest = depots[c.to];
            if (c.cargo === "cartridges" && c.lot) mergeLot(dest.cartridges, { ...c.lot, id: uid(), qty: c.amount }, ammoKey);
            else if (c.cargo === "rifles" && c.lot) mergeLot(dest.rifles, { ...c.lot, id: uid(), qty: c.amount }, rifleKey);
            else if (RAW.includes(c.cargo as keyof RawStock)) {
              const key = c.cargo as keyof RawStock;
              dest.stock[key] = round2(dest.stock[key] + c.amount);
            }
            log = pushLog(log, day, `Fourgon arrivé à ${dest.name} : ${c.cargo} × ${Math.round(c.amount)}.`);
          }
        }

        for (const c of companies) {
          if (c.trainDays > 0) {
            c.trainDays -= 1;
            if (c.trainDays <= 0) log = pushLog(log, day, `${c.name} est instruite. ${c.men} Meumeu, fusil en main.`);
          }
          if (c.wounded > 0 && c.trainDays <= 0) {
            if (depots.front.stock.medical >= 1) {
              const heal = Math.min(6, c.wounded);
              c.wounded -= heal;
              c.fit += heal;
              depots.front.stock.medical -= 1;
              c.blood = Math.max(0, c.blood - 0.2);
              log = pushLog(log, day, `${c.name} : ${heal} blessés repris, une caisse médicale consommée.`);
            } else {
              c.wounded -= 1;
              c.down += 1;
              c.blood = Math.min(1, c.blood + 0.1);
              log = pushLog(log, day, `${c.name} perd un blessé. Pas de caisse au Seuil.`);
            }
          }
        }

        set({
          day,
          depots,
          convoys,
          companies,
          labor: SMITHS,
          log,
          notice: `Jour ${day}. Les forges ont encore ${SMITHS} forgerons. Les puits ont produit.`,
        });
      },
      dispatch: (from, to, cargo, amount, lotId) => {
        const s = get();
        const link = road(from, to);
        if (!link) {
          set({ notice: "Pas de chemin entre ces deux dépôts." });
          return;
        }
        const qty = Math.floor(amount);
        if (qty <= 0) {
          set({ notice: "Quantité nulle." });
          return;
        }
        const depots = structuredClone(s.depots);
        const src = depots[from];
        let design: Design | undefined;
        let moved = qty;
        if (cargo === "cartridges" || cargo === "rifles") {
          const pile = cargo === "cartridges" ? src.cartridges : src.rifles;
          const lot = pile.find((l) => l.id === lotId) ?? pile[0];
          if (!lot) {
            set({ notice: "Rien de ce genre à charger." });
            return;
          }
          moved = Math.min(qty, lot.qty);
          lot.qty -= moved;
          design = lot.design;
          if (lot.qty <= 0) {
            const i = pile.findIndex((l) => l.id === lot.id);
            pile.splice(i, 1);
          }
        } else {
          const key = cargo as keyof RawStock;
          if (src.stock[key] < qty) {
            set({ notice: `${src.name} n’a pas assez de ${cargo}.` });
            return;
          }
          moved = qty;
          src.stock[key] = round2(src.stock[key] - qty);
        }
        const grams = cargoGrams(cargo, moved, design);
        const wagons = Math.max(1, Math.ceil(grams / WAGON_G));
        const free = s.wagons - wagonsUsed(s.convoys);
        if (wagons > free) {
          set({ notice: `Il faut ${wagons} fourgon(s), il en reste ${free}. ${Math.round(grams)} g à porter.` });
          return;
        }
        const convoy: Convoy = {
          id: uid(),
          from,
          to,
          cargo,
          amount: moved,
          lot: design ? { id: uid(), qty: moved, design, name: cartridgeName(design) } : undefined,
          daysLeft: link.days,
          daysTotal: link.days,
          wagons,
        };
        set({
          depots,
          convoys: [...s.convoys, convoy],
          notice: `${wagons} fourgon(s) partis. ${link.km} km, ${link.days} j. Charge ${Math.round(grams)} g.`,
          log: pushLog(s.log, s.day, `Départ ${depots[from].name} → ${depots[to].name} : ${cargo} × ${Math.round(moved)}.`),
        });
      },
      makeAmmo: (qty) => {
        const s = get();
        const report = evaluate(s.design, s.wind);
        if (!report.buildable) {
          set({ notice: report.blockReason ?? "Cette pièce ne se fabrique pas." });
          return;
        }
        const n = Math.max(1, Math.floor(qty));
        const need = {
          lead: report.cost.lead * n,
          brass: report.cost.brass * n,
          propellant: report.cost.propellant * n,
          steel: report.cost.steel * n,
          tungsten: report.cost.tungsten * n,
        };
        const labor = Math.max(1, Math.ceil(n / 240));
        if (labor > s.labor) {
          set({ notice: `Il reste ${s.labor} journée(s) de forge, il en faut ${labor}.` });
          return;
        }
        const depots = structuredClone(s.depots);
        const stock = depots.arsenal.stock;
        for (const [k, v] of Object.entries(need) as [keyof typeof need, number][]) {
          if (stock[k] + 0.001 < v) {
            set({ notice: `À la Cale, ${k} insuffisant : ${stock[k].toFixed(1)} g en caisse, ${v.toFixed(1)} g demandés.` });
            return;
          }
        }
        for (const [k, v] of Object.entries(need) as [keyof typeof need, number][]) stock[k] = round2(stock[k] - v);
        mergeLot(
          depots.arsenal.cartridges,
          { id: uid(), qty: n, design: { ...s.design }, name: report.name },
          ammoKey,
        );
        set({
          depots,
          labor: s.labor - labor,
          notice: `${n} cartouches ${report.name} restent à la Cale. Un fourgon doit les prendre.`,
          log: pushLog(s.log, s.day, `Coulée : ${n} × ${report.name}. Elles ne sont pas au Seuil.`),
        });
      },
      makeRifles: (qty) => {
        const s = get();
        const report = evaluate(s.design, s.wind);
        if (!report.buildable) {
          set({ notice: report.blockReason ?? "Cette arme ne se forge pas." });
          return;
        }
        const n = Math.max(1, Math.floor(qty));
        const steel = report.rifleCost.steel * n;
        const timber = report.rifleCost.timber * n;
        const labor = Math.max(1, Math.ceil(report.rifleCost.labor * n));
        if (labor > s.labor) {
          set({ notice: `Forge trop courte : ${labor} journées voulues, ${s.labor} restent.` });
          return;
        }
        const depots = structuredClone(s.depots);
        const stock = depots.arsenal.stock;
        if (stock.steel < steel || stock.timber < timber) {
          set({ notice: `Acier ${stock.steel.toFixed(0)} g / bois ${stock.timber.toFixed(0)} g. Il faut ${steel.toFixed(0)} g et ${timber.toFixed(0)} g.` });
          return;
        }
        stock.steel = round2(stock.steel - steel);
        stock.timber = round2(stock.timber - timber);
        mergeLot(depots.arsenal.rifles, { id: uid(), qty: n, design: { ...s.design }, name: report.name }, rifleKey);
        set({
          depots,
          labor: s.labor - labor,
          notice: `${n} fusils (${Math.round(report.weaponG)} g pièce) à la Cale. Le Seuil ne les a pas encore.`,
          log: pushLog(s.log, s.day, `Forge : ${n} fusils ${report.name}.`),
        });
      },
      train: () => {
        const s = get();
        if (s.companies.length >= 3) {
          set({ notice: "Trois compagnies, pas une de plus. La république est petite." });
          return;
        }
        const depots = structuredClone(s.depots);
        const lot = depots.front.rifles.find((l) => l.qty >= SQUAD);
        if (!lot) {
          set({ notice: `Il faut ${SQUAD} fusils au Seuil, pas à la Cale. Le fret n’a pas fini son travail.` });
          return;
        }
        lot.qty -= SQUAD;
        if (lot.qty <= 0) depots.front.rifles = depots.front.rifles.filter((l) => l.qty > 0);
        const names = ["Première du Seuil", "Deuxième du Seuil", "Troisième du Seuil"];
        const company: Company = {
          id: uid(),
          name: names[s.companies.length] ?? "Compagnie",
          men: SQUAD,
          fit: SQUAD,
          wounded: 0,
          down: 0,
          rifles: SQUAD,
          rifle: { ...lot.design },
          ammo: 0,
          ammoDesign: null,
          trainDays: 2,
          blood: 0,
        };
        set({
          depots,
          companies: [...s.companies, company],
          notice: `${company.name} s’instruit. Deux jours. Les cartouches ne sont pas encore dans les poches.`,
          log: pushLog(s.log, s.day, `${company.name} prend ${SQUAD} fusils ${cartridgeName(lot.design)}.`),
        });
      },
      distribute: () => {
        const s = get();
        const depots = structuredClone(s.depots);
        const companies = s.companies.map((c) => ({ ...c, rifle: c.rifle ? { ...c.rifle } : null, ammoDesign: c.ammoDesign ? { ...c.ammoDesign } : null }));
        let moved = 0;
        for (const c of companies) {
          if (!c.rifle) continue;
          const want = c.men * 40 - c.ammo;
          if (want <= 0) continue;
          if (c.ammo > 0 && c.ammoDesign && !chambers(c.rifle, c.ammoDesign)) continue;
          const lot = depots.front.cartridges.find((l) => chambers(c.rifle!, l.design) && l.qty > 0 && (!c.ammoDesign || ammoKey(c.ammoDesign) === ammoKey(l.design) || c.ammo === 0));
          if (!lot) continue;
          const take = Math.min(want, lot.qty);
          lot.qty -= take;
          c.ammo += take;
          c.ammoDesign = { ...lot.design };
          moved += take;
        }
        depots.front.cartridges = depots.front.cartridges.filter((l) => l.qty > 0);
        set({
          depots,
          companies,
          notice: moved > 0 ? `${moved} cartouches passent des caisses aux poches. Celles qui ne chambrent pas restent en tas.` : "Aucune cartouche du Seuil ne chambre dans ces fusils.",
        });
      },
      startBattle: () => {
        const s = get();
        const gate = readiness(s);
        if (!gate.ok) {
          set({ notice: "Le Seuil n’est pas prêt. La guerre ne s’ouvre pas sur une caisse vide." });
          return;
        }
        if (s.battle && !s.battle.resolved) return;
        const battle: Battle = {
          enemyFit: 56,
          enemyMen: 56,
          enemyAmmo: 56 * 26,
          range: 12,
          resolved: false,
          outcome: "none",
          lastFx: "none",
          enemyBlood: 0,
        };
        set({
          battle,
          notice: "Les Bê sont à douze mètres. Chaque coup sort d’une poche, pas d’un registre.",
          log: pushLog(s.log, s.day, "Escarmouche au fossé. 56 Bê, autant de corps de 30 cm."),
        });
      },
      setRange: (range) => {
        const b = get().battle;
        if (!b || b.resolved) return;
        set({ battle: { ...b, range } });
      },
      fire: (aim) => {
        const s = get();
        const b = s.battle;
        if (!b || b.resolved) return;
        const companies = s.companies.map((c) => ({ ...c }));
        let enemyFit = b.enemyFit;
        let enemyAmmo = b.enemyAmmo;
        let enemyBlood = b.enemyBlood;
        let ourShots = 0;
        let ourHits = 0;
        let theirDrops = 0;
        let ourDrops = 0;
        const lines: string[] = [];
        for (const c of companies) {
          if (c.trainDays > 0 || c.fit <= 0 || !c.rifle || !c.ammoDesign || c.ammo <= 0) continue;
          if (!chambers(c.rifle, c.ammoDesign)) continue;
          const report = evaluate(c.ammoDesign, s.wind);
          const cap = volleyCap(report);
          const shots = Math.min(c.ammo, c.fit * cap);
          c.ammo -= shots;
          ourShots += shots;
          let p = hitChance(c.ammoDesign, report, b.range);
          if (aim === "tete") p *= 0.6;
          if (aim === "jambe") p *= 0.88;
          const at = sampleAt(report, b.range);
          for (let i = 0; i < shots; i++) {
            if (Math.random() > p) continue;
            ourHits++;
            const w = terminal(c.ammoDesign, at.velocity, pickZone(aim));
            if (w.hors === "immediat" || w.hors === "rapide" || w.hors === "differe") theirDrops++;
          }
        }
        theirDrops = Math.min(enemyFit, theirDrops);
        enemyFit -= theirDrops;
        if (theirDrops > 0) enemyBlood = Math.min(1, enemyBlood + theirDrops / b.enemyMen);
        const enemyReport = evaluate(ENEMY_DESIGN, s.wind);
        const eShots = Math.min(enemyAmmo, enemyFit * 2);
        enemyAmmo -= eShots;
        const ep = hitChance(ENEMY_DESIGN, enemyReport, b.range) * 0.92;
        const ev = sampleAt(enemyReport, b.range).velocity;
        const living = companies.filter((c) => c.fit > 0 && c.trainDays <= 0);
        for (let i = 0; i < eShots; i++) {
          if (living.length === 0 || Math.random() > ep) continue;
          const c = living[Math.floor(Math.random() * living.length)];
          const w = terminal(ENEMY_DESIGN, ev, pickZone("centre"));
          if (w.hors === "immediat" || w.hors === "rapide") {
            if (c.fit > 0) {
              c.fit -= 1;
              c.down += 1;
              ourDrops++;
              c.blood = Math.min(1, c.blood + 0.18);
            }
          } else if (w.hors === "differe" && c.fit > 0) {
            c.fit -= 1;
            c.wounded += 1;
            ourDrops++;
            c.blood = Math.min(1, c.blood + 0.1);
          }
        }
        const ourFit = companies.reduce((a, c) => a + (c.trainDays <= 0 ? c.fit : 0), 0);
        const ourAmmo = companies.reduce((a, c) => a + c.ammo, 0);
        let outcome: Battle["outcome"] = "none";
        let resolved = false;
        if (enemyFit <= 10) {
          outcome = "rout";
          resolved = true;
        } else if (ourFit <= 0) {
          outcome = "lost";
          resolved = true;
        } else if (ourShots === 0 && eShots === 0) {
          outcome = "dry";
          resolved = true;
        } else if (ourAmmo <= 0 && enemyAmmo <= 0) {
          outcome = "dry";
          resolved = true;
        }
        const depots = structuredClone(s.depots);
        let notice = `${ourShots} coups Meumeu, ${ourHits} au but, ${theirDrops} Bê hors de combat. Retour : ${eShots} coups, ${ourDrops} Meumeu quittent la ligne.`;
        if (aim === "tete") notice += " La tête se paie : beaucoup de balles dans le vide.";
        lines.push(notice);
        if (outcome === "rout") {
          depots.front.stock.grain += 900;
          depots.front.stock.brass += 60;
          notice = `Les Bê lâchent le fossé. Butin : 900 g de grain, 60 g de laiton. Il reste ${enemyFit} debout.`;
        } else if (outcome === "lost") {
          depots.front.stock.grain = Math.round(depots.front.stock.grain * 0.6);
          depots.front.stock.brass = Math.round(depots.front.stock.brass * 0.6);
          notice = "La ligne Meumeu est à terre. Le Seuil est pillé d’une part. On reconstruira, pas aujourd’hui.";
        } else if (outcome === "dry") {
          notice = "Les deux poches sont vides. La bataille s’éteint faute de cartouches — le fret a eu le dernier mot.";
        }
        const fx: Battle["lastFx"] = ourDrops > 0 && theirDrops > 0 ? "both" : theirDrops > 0 ? "enemy" : ourDrops > 0 ? "player" : "none";
        set({
          companies,
          depots,
          battle: { ...b, enemyFit, enemyAmmo, resolved, outcome, lastFx: fx, enemyBlood },
          notice,
          log: pushLog(s.log, s.day, notice),
        });
      },
    }),
    { name: "meumeu-fret-v2", skipHydration: true, version: 4, migrate: (state) => {
      const s = state as Snapshot;
      if (s?.design) s.design = normalizeDesign(s.design);
      if (s?.depots) {
        for (const depot of Object.values(s.depots)) {
          depot.cartridges?.forEach((lot) => {
            lot.design = normalizeDesign(lot.design);
          });
          depot.rifles?.forEach((lot) => {
            lot.design = normalizeDesign(lot.design);
          });
        }
      }
      s?.companies?.forEach((c) => {
        if (c.rifle) c.rifle = normalizeDesign(c.rifle);
        if (c.ammoDesign) c.ammoDesign = normalizeDesign(c.ammoDesign);
      });
      return s as never;
    } },
  ),
);

export { BODY };
