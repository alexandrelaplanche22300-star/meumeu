import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Boxes, i as Crosshair, n as Swords, r as Landmark } from "../_libs/lucide-react.mjs";
import { a as CartesianGrid, i as Line, n as YAxis, o as ResponsiveContainer, r as XAxis, s as Tooltip, t as LineChart } from "../_libs/recharts+[...].mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DcTd11xQ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Meumeu et Bê : 30 cm du crâne au sol. Toute la physique du bureau est à cette échelle. */
var BODY = {
	heightCm: 30,
	massG: 360,
	bloodMl: 26,
	incapMl: 8,
	femurMm: 4.4,
	arteryMm: .75,
	torsoCm: 7
};
var FEED_CAP = {
	single: 1,
	clip: 10,
	box: 25,
	tube: 8,
	belt: 40
};
var DENSITY = {
	lead: 11.2,
	jacket: 10.1,
	steel: 8.6,
	tungsten: 14.8,
	frangible: 5.4
};
var HARD = {
	lead: .72,
	jacket: 1,
	steel: 1.32,
	tungsten: 1.68,
	frangible: .34
};
var JACKET_RHO = {
	none: 8.7,
	tombac: 8.7,
	cuivre: 8.96,
	acier: 7.85
};
var BURN = {
	lente: .78,
	moyenne: 1,
	vive: 1.32
};
var WAGON_G = 1500;
var ZONE_META = {
	crane: {
		label: "Crâne / encéphale",
		kind: "cns",
		artery: .14,
		depth: 2.1,
		barrier: 1.05
	},
	cou: {
		label: "Cou / carotides",
		kind: "artery",
		artery: .8,
		depth: 1.05,
		barrier: .22
	},
	poumon: {
		label: "Poumon",
		kind: "organ",
		artery: .2,
		depth: 1.7,
		barrier: .32
	},
	coeur: {
		label: "Cœur",
		kind: "heart",
		artery: .58,
		depth: 2.15,
		barrier: .62
	},
	aorte: {
		label: "Aorte",
		kind: "artery",
		artery: .94,
		depth: 2.3,
		barrier: .78
	},
	foie: {
		label: "Foie",
		kind: "organ",
		artery: .5,
		depth: 1.9,
		barrier: .42
	},
	rate: {
		label: "Rate",
		kind: "organ",
		artery: .44,
		depth: 1.7,
		barrier: .38
	},
	intestin: {
		label: "Abdomen creux",
		kind: "gut",
		artery: .16,
		depth: 1.5,
		barrier: .28
	},
	colonne: {
		label: "Colonne",
		kind: "bone",
		artery: .24,
		depth: 2.6,
		barrier: 1.15
	},
	femoral: {
		label: "Artère fémorale",
		kind: "artery",
		artery: .86,
		depth: .95,
		barrier: .22
	}
};
function defaultDesign() {
	return {
		diameter: 1.6,
		caseLength: 11,
		caseDiameter: 2.55,
		bulletLength: 6.4,
		powderFill: .86,
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
		jacketMm: .08,
		burn: "moyenne",
		meplat: 0,
		boat: 0,
		pellets: 9
	};
}
var PRESETS = [
	{
		id: "marche",
		label: "Claire de marche",
		blurb: "Le fusil que les fourgons peuvent nourrir.",
		design: defaultDesign()
	},
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
			powderFill: .92,
			barrelLength: 108,
			twist: 38,
			nose: "spitzer",
			effect: "frag",
			filler: "void",
			cavity: .22,
			zero: 22,
			jacket: "tombac",
			jacketMm: .05,
			meplat: .02
		}
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
			powderFill: .8,
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
			jacketMm: .16,
			base: "boat",
			boat: .2
		}
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
			powderFill: .9,
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
			cavity: .48,
			burn: "vive",
			jacket: "cuivre",
			jacketMm: .05,
			meplat: .2
		}
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
			powderFill: .84,
			effect: "api",
			zero: 14,
			jacket: "acier",
			jacketMm: .1
		}
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
			powderFill: .78,
			barrelLength: 62,
			twist: 70,
			core: "lead",
			nose: "hollow",
			effect: "frag",
			filler: "burst",
			cavity: .42,
			magazine: 6,
			feed: "box",
			zero: 8,
			burn: "vive",
			jacketMm: .06
		}
	},
	{
		id: "filet",
		label: "Filet de queue",
		blurb: "Queue de bateau, chemise mince. Elle tient le vent, pas l’os.",
		design: {
			...defaultDesign(),
			base: "boat",
			boat: .36,
			jacket: "tombac",
			jacketMm: .05,
			meplat: .04,
			burn: "lente",
			barrelLength: 124,
			twist: 46,
			zero: 26,
			powderFill: .78,
			nose: "spitzer"
		}
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
			powderFill: .92,
			burn: "vive",
			action: "lever",
			feed: "tube",
			magazine: 5,
			zero: 6,
			sight: "iron",
			profile: "light",
			filler: "none"
		}
	},
	{
		id: "molle",
		label: "Pointe molle",
		blurb: "Méplat et chemise de cuivre. Elle s’ouvre sans se pulvériser.",
		design: {
			...defaultDesign(),
			nose: "soft",
			effect: "frag",
			meplat: .24,
			jacket: "cuivre",
			jacketMm: .07,
			filler: "void",
			cavity: .16,
			core: "lead",
			base: "flat"
		}
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
			caseLength: 12
		}
	}
];
function shellFrac(n) {
	if (n.jacket === "none" || n.effect === "shot") return 0;
	return Math.min(.46, 2.1 * n.jacketMm / Math.max(.6, n.diameter));
}
function pelletDiameter(d0) {
	const d = normalizeDesign(d0);
	if (d.effect !== "shot") return d.diameter;
	return Math.max(.32, d.diameter / Math.sqrt(d.pellets) * .92);
}
function formFactor(d0) {
	const n = normalizeDesign(d0);
	let f = {
		spitzer: .94,
		round: 1.4,
		flat: 1.65,
		hollow: 1.5,
		soft: 1.24
	}[n.nose];
	if (n.effect === "tracer") f += .12;
	if (n.effect === "api") f += .07;
	if (n.effect === "frag") f += .06;
	if (n.effect === "shot") f += .9;
	const meplat = n.nose === "flat" ? Math.max(n.meplat, .42) : n.nose === "round" ? Math.max(n.meplat, .28) : n.meplat;
	f += meplat * .62;
	if (n.base === "boat") f -= Math.min(.2, n.boat * .5);
	if (n.jacket === "acier") f += .03;
	return Math.max(.7, f);
}
function normalizeDesign(raw) {
	const b = defaultDesign();
	const feed = raw.feed ?? b.feed;
	const filler = raw.filler ?? b.filler;
	const caseMat = raw.caseMat ?? b.caseMat;
	const base = raw.base ?? b.base;
	const jacket = raw.jacket ?? b.jacket;
	const burn = raw.burn ?? b.burn;
	const effect = raw.effect ?? b.effect;
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
		magazine,
		cavity: filler === "none" ? 0 : Math.max(0, Math.min(.75, raw.cavity ?? b.cavity)),
		jacketMm: Math.max(.04, Math.min(.4, raw.jacketMm ?? b.jacketMm)),
		meplat: Math.max(0, Math.min(.6, raw.meplat ?? b.meplat)),
		boat: Math.max(0, Math.min(.45, raw.boat ?? b.boat)),
		pellets: Math.max(4, Math.min(18, Math.round(raw.pellets ?? b.pellets)))
	};
}
function bulletMassG(d0) {
	const n = normalizeDesign(d0);
	const r = n.diameter / 20;
	const lenCm = n.bulletLength / 10;
	const shape = n.nose === "spitzer" ? .68 : n.nose === "flat" ? .86 : n.nose === "hollow" ? .6 : n.nose === "soft" ? .74 : .76;
	const cav = n.filler === "none" || n.effect === "shot" ? 0 : n.cavity;
	const frac = shellFrac(n);
	const rho = DENSITY[n.core] * (1 - frac) + JACKET_RHO[n.jacket] * frac;
	return Math.PI * r * r * lenCm * shape * rho * (1 - cav * .62);
}
function powderMassG(d) {
	const r = d.caseDiameter / 20;
	const vol = Math.PI * r * r * (d.caseLength / 10) * .58;
	const seat = Math.max(0, (d.bulletLength - d.diameter * 1.2) / 10) * Math.PI * (d.diameter / 20) ** 2 * .4;
	return Math.max(.004, vol - seat) * .95 * d.powderFill;
}
function brassMassG(d) {
	const n = normalizeDesign(d);
	const r = n.caseDiameter / 20;
	const vol = Math.PI * r * r * (n.caseLength / 10);
	const shell = n.caseMat === "paper" ? .22 : n.caseMat === "steel" ? .92 : 1;
	return vol * 8.4 * .18 * shell;
}
function weaponParts(d0) {
	const n = normalizeDesign(d0);
	const stock = n.profile === "light" ? 42 : n.profile === "heavy" ? 58 : 72;
	const feedExtra = n.feed === "belt" ? 24 : n.feed === "box" ? 16 : n.feed === "tube" ? 10 : 0;
	const receiver = 32;
	return {
		stock,
		receiver,
		feedExtra,
		barrel: n.barrelLength,
		total: stock + receiver + feedExtra + n.barrelLength
	};
}
function weaponLengthMm(d) {
	return weaponParts(d).total;
}
function serviceOf(d, weaponGrams, recoil) {
	const n = normalizeDesign(d);
	const lengthMm = weaponLengthMm(n);
	let crew = 1;
	let why = "Une épaule suffit : l’arme reste à l’échelle d’un Meumeu de 30 cm.";
	if (n.feed === "belt" || lengthMm > 200 || weaponGrams > 85 || recoil === "lourd" && n.barrelLength > 100) {
		crew = 2;
		why = n.feed === "belt" ? "La bande veut un chargeur à côté du pointeur." : lengthMm > 200 ? "Plus longue que le corps. Le second tient le pied." : "Le recul arrache un seul Meumeu. Deux servants se partagent l’arme.";
	}
	if (n.feed === "belt" && weaponGrams > 110 || lengthMm > 260) {
		crew = 3;
		why = "Pointeur, chargeur, porte-pied. Trois Meumeu pour une bouche à feu.";
	}
	const mag = n.magazine;
	let reloadS = 1.6 + mag * .12;
	if (n.feed === "single") reloadS = 1.7;
	if (n.feed === "clip") reloadS = 1.05 + mag * .22;
	if (n.feed === "box") reloadS = (n.action === "blowback" ? .75 : 1.45) + mag * .06;
	if (n.feed === "tube") reloadS = .8 + mag * .42;
	if (n.feed === "belt") reloadS = crew >= 2 ? 3.2 + mag * .04 : 6.4 + mag * .08;
	return {
		crew,
		why,
		reloadS,
		lengthMm,
		magazine: mag
	};
}
function reloadSteps(d0, crew) {
	const d = normalizeDesign(d0);
	if (d.feed === "single") return [
		"Ouvrir la culasse",
		"Glisser le coup",
		"Fermer"
	];
	if (d.feed === "clip") return [
		"Ouvrir",
		"Engager la lame",
		"Pousser les coups",
		"Jeter la lame"
	];
	if (d.feed === "box") return [
		"Décrocher le boîtier",
		"Présenter le plein",
		"Verrouiller"
	];
	if (d.feed === "tube") {
		const n = Math.min(d.magazine, 4);
		return [...Array.from({ length: n }, (_, i) => `Grain ${i + 1} dans le tube`), "Refermer"];
	}
	if (crew >= 2) return [
		"Le chargeur amorce la bande",
		"Aligner le maillon",
		"Le pointeur reprend"
	];
	return ["La bande se tord", "Seul, on reprend trop tard"];
}
function dragCd(mach, form) {
	let cd;
	if (mach < .75) cd = .22 + mach * .08;
	else if (mach < 1.15) cd = .28 + (mach - .75) * 1.2;
	else if (mach < 1.6) cd = .76 - (mach - 1.15) * .38;
	else cd = .55 - Math.min(.14, (mach - 1.6) * .05);
	return cd * form;
}
function pressureIndex(d, massG, powderG) {
	const n = normalizeDesign(d);
	const r = n.caseDiameter / 20;
	const density = powderG / Math.max(.006, Math.PI * r * r * (n.caseLength / 10) * .5);
	const heavy = massG / (n.diameter * n.diameter * .028);
	const short = 90 / Math.max(36, n.barrelLength);
	return density * (.55 + heavy * .45) * (.8 + short * .28) * BURN[n.burn];
}
function millerSg(d, massG) {
	const mGr = massG * 15.432;
	const dIn = d.diameter / 25.4;
	const lCal = d.bulletLength / d.diameter;
	const tCal = d.twist / d.diameter;
	return 30 * mGr / (tCal * tCal * dIn ** 3 * lCal * (1 + lCal * lCal));
}
function weaponG(d) {
	const prof = d.profile === "light" ? .7 : d.profile === "heavy" ? 1.4 : 1;
	const action = d.action === "blowback" ? .62 : d.action === "straight" ? 1.18 : d.action === "lever" ? .95 : 1;
	const sight = d.sight === "optic" ? 14 : d.sight === "aperture" ? 2.2 : .8;
	const feed = d.feed === "belt" ? 18 : d.feed === "box" ? 6 : d.feed === "tube" ? 3 : 0;
	return 16 + d.barrelLength / 100 * 24 * prof * action + sight + feed;
}
function fly(d, v0, angle, massKg, form, wind, diamMm) {
	const A = Math.PI * (diamMm / 2e3) ** 2;
	let x = 0;
	let y = -.003;
	let vx = v0 * Math.cos(angle);
	let vy = v0 * Math.sin(angle);
	let t = 0;
	const dt = 35e-5;
	const raw = [{
		range: 0,
		drop: y,
		velocity: v0,
		energy: .5 * massKg * v0 * v0,
		drift: 0,
		tof: 0
	}];
	let next = 2;
	while (t < .55 && x < 70 && y > -.8 && vx > 25) {
		const v = Math.hypot(vx, vy) + 1e-4;
		const k = .6125 * dragCd(v / 340, form) * A / massKg;
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
				energy: .5 * massKg * vv * vv,
				drift: wind * lag,
				tof: t
			});
			next += 2;
		}
	}
	const yAt = (range) => {
		if (raw.length < 2) return y;
		let i = 0;
		while (i < raw.length - 1 && raw[i + 1].range < range) i++;
		const a = raw[i];
		const b = raw[Math.min(raw.length - 1, i + 1)];
		const u = b.range === a.range ? 0 : (range - a.range) / (b.range - a.range);
		return a.drop + (b.drop - a.drop) * Math.max(0, Math.min(1.4, u));
	};
	return {
		samples: raw,
		yAt
	};
}
function cartridgeName(d) {
	const n = normalizeDesign(d);
	const kind = n.effect === "shot" ? "grains" : n.filler === "burst" ? "éclat" : n.effect === "ap" ? "perf" : "";
	return `Mle ${n.diameter.toFixed(2)}×${n.caseLength.toFixed(1)}${kind ? " " + kind : ""}`;
}
function evaluate(d0, wind = 1.5) {
	const d = normalizeDesign(d0);
	const massG = bulletMassG(d);
	const powderG = powderMassG(d);
	const brassG = brassMassG(d);
	const shot = d.effect === "shot";
	const pelletN = shot ? d.pellets : 1;
	const pelletMm = pelletDiameter(d);
	const flyMassG = shot ? massG / pelletN : massG;
	const massKg = Math.max(2e-5, massG / 1e3);
	const flyKg = Math.max(8e-6, flyMassG / 1e3);
	const form = formFactor(d);
	const pressure = pressureIndex(d, massG, powderG);
	const burnLen = d.burn === "vive" ? .68 : d.burn === "lente" ? 1.42 : 1;
	const barrelFactor = 1 - Math.exp(-d.barrelLength / ((26 + d.caseLength * 2.4 + powderG * 500) * burnLen));
	const energyJ = .2 * Math.min(1, 1.12 - Math.max(0, pressure - 1.2) * .22) * barrelFactor * powderG * 3600;
	const velocity = Math.sqrt(2 * Math.max(.4, energyJ) / massKg);
	const sg = shot ? 1.6 : millerSg(d, massG);
	const wG = weaponG(d);
	const impulse = massKg * velocity + powderG / 1e3 * velocity * .55;
	const recoilJ = impulse * impulse / (2 * (wG / 1e3));
	const jf = shellFrac(d);
	let pressureLabel = "nominal";
	if (pressure < .62) pressureLabel = "sage";
	else if (pressure < 1.05) pressureLabel = "nominal";
	else if (pressure < 1.4) pressureLabel = "chaud";
	else pressureLabel = "dangereux";
	let stabilityLabel = "stable";
	if (!shot && sg < 1.2) stabilityLabel = "clé";
	else if (!shot && sg > 3.2) stabilityLabel = "surstable";
	let recoilLabel = "tenu";
	if (recoilJ > .085) recoilLabel = "lourd";
	else if (recoilJ > .045) recoilLabel = "sec";
	const blowbackOk = pressure < 1.25 && d.caseLength < 9 && d.barrelLength < 75;
	let buildable = true;
	let blockReason = null;
	if (d.action === "blowback" && !blowbackOk) {
		buildable = false;
		blockReason = "Culasse non calée : à cette pression, l’arme s’ouvre sur le tireur.";
	}
	if (d.caseDiameter < d.diameter + .15) {
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
	const reliable = buildable && pressureLabel !== "dangereux" && stabilityLabel !== "clé" && !(d.action === "lever" && (d.nose === "spitzer" || d.nose === "hollow") && !shot);
	let lo = -.04;
	let hi = .16;
	let angle = .01;
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
		drop: Math.round(s.drop * 1e3) / 1e3,
		drift: Math.round(s.drift * 1e3) / 1e3,
		tof: Math.round(s.tof * 1e3) / 1e3
	}));
	let usefulM = 0;
	const usefulE = shot ? 1.2 : 4.5;
	for (const s of samples) if (s.energy >= usefulE && Math.abs(s.drop) < .07) usefulM = s.range;
	let transonicM = null;
	for (let i = 1; i < samples.length; i++) if (samples[i].velocity < 340 && samples[i - 1].velocity >= 340) {
		transonicM = samples[i].range;
		break;
	}
	const roundG = massG + powderG + brassG + .02;
	const profWear = d.profile === "light" ? 1.5 : d.profile === "heavy" ? .68 : 1;
	const barrelLife = Math.round(9e3 / (profWear * (.45 + pressure * pressure) * (velocity / 480)));
	const rpm = d.action === "blowback" ? 22 : d.action === "straight" ? 14 : d.action === "lever" ? 11 : 8;
	const coreG = massG * (1 - jf);
	let leadG = 0;
	let steelG = 0;
	let tungstenG = 0;
	if (d.core === "lead") leadG = coreG;
	else if (d.core === "jacket") leadG = coreG * .82;
	else if (d.core === "steel") {
		steelG = coreG * .72;
		leadG = coreG * .28;
	} else if (d.core === "tungsten") {
		tungstenG = coreG * .74;
		leadG = coreG * .14;
		steelG = coreG * .12;
	} else leadG = coreG * .22;
	if (d.effect === "ap") steelG += coreG * .12;
	if (d.jacket === "acier") steelG += massG * jf;
	const jacketBrass = d.jacket === "cuivre" || d.jacket === "tombac" ? massG * jf : 0;
	const goods = [];
	const bads = [];
	const bodies = d.barrelLength / (BODY.heightCm * 10);
	if (velocity > 520) goods.push("Trajectoire tendue sur les premières longueurs de corps.");
	if (velocity < 320) bads.push("Lente à cette échelle : la chute arrive avant le Bê.");
	if (roundG < .22) goods.push(`Fret léger : ${Math.round(WAGON_G / roundG)} coups dans un fourgon de ${WAGON_G} g.`);
	if (roundG > .55) bads.push("La caisse de cartouches dispute la place au grain. La ligne se tait la première.");
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
	if (bodies > .45) bads.push("Canon plus long qu’un demi-corps : maladroit dans les terriers et sous 4 m.");
	if (d.barrelLength < 55 && !shot) bads.push("Canon court : la poudre brûle dehors, la balle naît déjà fatiguée.");
	if (d.action === "lever" && (d.nose === "spitzer" || d.nose === "hollow") && !shot) bads.push("Le levier accroche les pointes. Enrayage au moment de payer le fret.");
	if (d.core === "tungsten") bads.push("Le puits n’en donne que des miettes. Un noyau dense se mérite en journées.");
	if (d.filler === "void" && d.cavity > .15) {
		goods.push("Cavité : la balle s’ouvre et lâche des éclats dans l’organe, pas au-delà.");
		bads.push("Moins de masse, moins de fond. Un os de 4 mm l’arrête plus tôt.");
	}
	if (d.filler === "burst") {
		goods.push("Petite charge d’éclat, de l’ordre du centimètre — pas une grenade.");
		bads.push("La poudre de la cavité se paie, et la pénétration s’effondre dès qu’elle s’ouvre.");
	}
	if (d.base === "boat" && d.boat > .15) goods.push("Queue de bateau : elle tient mieux sa vitesse quand le vent traverse la clairière.");
	if (d.meplat > .3) bads.push("Méplat large : elle freine tôt et s’ouvre dès qu’elle trouve de la chair.");
	if (jf > .22) {
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
	const sd = (shot ? flyMassG : massG) / (pelletMm * pelletMm);
	return {
		name: cartridgeName(d),
		massG,
		powderG,
		brassG,
		roundG,
		roundsPerKg: Math.round(1e3 / roundG),
		roundsPerWagon: Math.round(WAGON_G / roundG),
		velocity,
		energyJ,
		pressure,
		pressureLabel,
		stability: sg,
		stabilityLabel,
		recoilJ,
		recoilLabel,
		weaponG: wG,
		barrelLife,
		rpm,
		reliable,
		buildable,
		blockReason,
		samples,
		zeroAngleDeg: angle * 180 / Math.PI,
		usefulM,
		barrelBodies: bodies,
		caliberOnArtery: d.diameter / BODY.arteryMm,
		cost: {
			lead: leadG,
			brass: (d.caseMat === "brass" ? brassG : brassG * .12) + jacketBrass,
			propellant: powderG * (d.effect === "api" ? 1.4 : 1) * (d.filler === "burst" ? 1 + d.cavity : 1),
			steel: steelG + (d.caseMat === "steel" ? brassG * .75 : 0),
			tungsten: tungstenG
		},
		rifleCost: {
			steel: (22 + d.barrelLength * .18) * (d.profile === "heavy" ? 1.35 : d.profile === "light" ? .72 : 1) + (d.sight === "optic" ? 10 : 1.5) + (d.feed === "belt" ? 14 : d.feed === "box" ? 4 : 0),
			timber: d.profile === "heavy" ? 6 : 9,
			labor: d.action === "straight" ? 1.4 : d.action === "blowback" ? .55 : 1
		},
		crew: served.crew,
		crewWhy: served.why,
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
		jacketFrac: jf
	};
}
function tissuesRaw(zone) {
	const peau = {
		id: "peau",
		label: "Peau et couture",
		cm: .14,
		resist: .4
	};
	const bourre = {
		id: "bourre",
		label: "Bourre",
		cm: .42,
		resist: .3
	};
	const muscle = (cm) => ({
		id: "muscle",
		label: "Muscle",
		cm,
		resist: .9
	});
	const fond = [{
		id: "fond",
		label: "Paroi du fond",
		cm: 1.35,
		resist: .85
	}, {
		id: "peau2",
		label: "Peau de sortie",
		cm: .14,
		resist: .4
	}];
	switch (zone) {
		case "crane": return [
			peau,
			bourre,
			{
				id: "os",
				label: "Voûte",
				cm: .32,
				resist: 2.5,
				bone: true
			},
			{
				id: "cerveau",
				label: "Encéphale",
				cm: 1.7,
				resist: .65,
				organ: true
			},
			{
				id: "os2",
				label: "Base du crâne",
				cm: .3,
				resist: 2.3,
				bone: true
			}
		];
		case "cou": return [
			peau,
			muscle(.45),
			{
				id: "carotide",
				label: "Carotides",
				cm: .5,
				resist: .55,
				organ: true
			},
			muscle(.5),
			{
				id: "vert",
				label: "Cervicales",
				cm: .42,
				resist: 2.2,
				bone: true
			}
		];
		case "poumon": return [
			peau,
			bourre,
			muscle(.4),
			{
				id: "cote",
				label: "Côte",
				cm: .18,
				resist: 1.9,
				bone: true
			},
			{
				id: "poumon",
				label: "Poumon",
				cm: 2.2,
				resist: .42,
				organ: true
			},
			{
				id: "mediastin",
				label: "Médiastin",
				cm: 1.2,
				resist: .75,
				organ: true
			},
			...fond
		];
		case "coeur": return [
			peau,
			bourre,
			muscle(.35),
			{
				id: "cote",
				label: "Côte",
				cm: .18,
				resist: 1.9,
				bone: true
			},
			{
				id: "poumon",
				label: "Poumon",
				cm: .7,
				resist: .45,
				organ: true
			},
			{
				id: "coeur",
				label: "Cœur",
				cm: 1.15,
				resist: .8,
				organ: true
			},
			...fond
		];
		case "aorte": return [
			peau,
			muscle(.55),
			{
				id: "aorte",
				label: "Aorte",
				cm: .55,
				resist: .7,
				organ: true
			},
			{
				id: "colonne",
				label: "Corps vertébral",
				cm: .7,
				resist: 2.7,
				bone: true
			},
			{
				id: "fond",
				label: "Chair du dos",
				cm: 1.1,
				resist: .85
			}
		];
		case "foie": return [
			peau,
			bourre,
			muscle(.4),
			{
				id: "cote",
				label: "Côte basse",
				cm: .16,
				resist: 1.7,
				bone: true
			},
			{
				id: "foie",
				label: "Foie",
				cm: 1.7,
				resist: .8,
				organ: true
			},
			...fond
		];
		case "rate": return [
			peau,
			muscle(.4),
			{
				id: "rate",
				label: "Rate",
				cm: .85,
				resist: .65,
				organ: true
			},
			{
				id: "flanc",
				label: "Flanc",
				cm: 1.1,
				resist: .7
			},
			...fond
		];
		case "intestin": return [
			peau,
			muscle(.5),
			{
				id: "intestin",
				label: "Abdomen creux",
				cm: 2.4,
				resist: .4,
				organ: true
			},
			{
				id: "colonne",
				label: "Colonne",
				cm: .55,
				resist: 2.5,
				bone: true
			},
			{
				id: "dos",
				label: "Dos",
				cm: 1.2,
				resist: .85
			}
		];
		case "colonne": return [
			peau,
			muscle(.7),
			{
				id: "colonne",
				label: "Vertèbre",
				cm: .75,
				resist: 2.8,
				bone: true
			},
			{
				id: "moelle",
				label: "Canal",
				cm: .35,
				resist: .6,
				organ: true
			},
			muscle(.6)
		];
		case "femoral": return [
			peau,
			muscle(.55),
			{
				id: "femoral",
				label: "Artère fémorale",
				cm: .3,
				resist: .5,
				organ: true
			},
			{
				id: "os",
				label: "Fémur",
				cm: .44,
				resist: 2.6,
				bone: true
			},
			muscle(.4)
		];
	}
}
function mulberry(seed) {
	let s = seed >>> 0;
	return () => {
		s = Math.imul(s, 1664525) + 1013904223 >>> 0;
		return s / 4294967296;
	};
}
function terminal(d0, velocity, zone, obliquity = 0) {
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
	if (d.meplat > .35) vOpen -= 40;
	const expand = !shot && (d.nose === "hollow" || d.nose === "soft" || d.effect === "frag" || d.filler === "void" && cavity > .12) && d.effect !== "ap" && d.core !== "tungsten" && v > vOpen || !shot && d.filler === "burst" && v > 220;
	const burst = !shot && d.filler === "burst" && cavity > .1 && v > 220;
	const frag = shot || (d.effect === "frag" || d.nose === "hollow" || cavity > .2) && expand && v > 250 || burst;
	const blastCm = burst ? Math.min(1.8, cavity * 1.35 * Math.min(1, v / 420)) : 0;
	const yaw = !shot && d.nose === "spitzer" && d.effect === "ball" && d.filler === "none" && v > 360 && d.core !== "tungsten" && !expand;
	let pen = 165 * sd * HARD[d.core] * Math.min(1.4, v / 480) * (v < 120 ? v / 120 : 1);
	if (d.effect === "ap") pen *= 1.48;
	if (d.core === "tungsten") pen *= 1.22;
	if (d.jacket === "acier") pen *= 1 + thick * .4;
	if (burst) pen *= .9;
	else if (expand && frag) pen *= .75;
	else if (expand) pen *= .82;
	if (d.effect === "api") pen *= .84;
	if (yaw && !expand) pen *= .82;
	if (shot) pen *= .45;
	const reached = pen > meta.barrier + meta.depth * .35;
	const tilt = Math.max(0, Math.min(55, obliquity));
	const cos = Math.cos(tilt * Math.PI / 180);
	const raw = tissuesRaw(zone);
	const tissues = [];
	let remain = pen;
	let traveled = 0;
	let stopped = false;
	let spawnCm = .35;
	let seenOrgan = false;
	for (const layer of raw) {
		const path = layer.cm / Math.max(.55, cos);
		const cost = path * layer.resist;
		if (!seenOrgan && layer.organ && !stopped) {
			spawnCm = traveled + Math.min(.55, path * .3);
			seenOrgan = true;
		}
		if (stopped) {
			tissues.push({
				id: layer.id,
				label: layer.label,
				cm: path,
				state: "intacte"
			});
			continue;
		}
		if (remain >= cost) {
			remain -= cost;
			traveled += path;
			tissues.push({
				id: layer.id,
				label: layer.label,
				cm: path,
				state: "franchie"
			});
		} else {
			const frac = cost <= 0 ? 1 : remain / cost;
			traveled += path * frac;
			remain = 0;
			stopped = true;
			tissues.push({
				id: layer.id,
				label: layer.label,
				cm: path,
				state: "arret"
			});
		}
	}
	const pathCm = raw.reduce((sum, layer) => sum + layer.cm / Math.max(.55, cos), 0);
	const exit = !stopped;
	const stopCm = traveled;
	const lines = [];
	lines.push(`Impact ${Math.round(v)} m/s, obliquité ${Math.round(tilt)}°. Capacité ${pen.toFixed(1)} cm de tissu — cette coupe en fait ${pathCm.toFixed(1)} en chemin, le torse de référence ${BODY.torsoCm}.`);
	const stopLayer = tissues.find((t) => t.state === "arret");
	if (stopLayer) lines.push(`Arrêt dans ${stopLayer.label.toLowerCase()}, à ${stopCm.toFixed(1)} cm de l’entrée.`);
	else lines.push("Elle a de quoi traverser cette coupe et sortir de l’autre couture.");
	if (!reached) lines.push("Ça n’atteint pas la structure. Plaie de paroi, ou l’os de cette bestiole suffit.");
	if (expand && seenOrgan && spawnCm < stopCm) lines.push("La pointe s’ouvre dans l’organe. Le canal s’élargit, la course meurt dedans.");
	else if (expand) lines.push("Elle veut s’ouvrir, mais elle n’a plus assez de chemin : les éclats naissent dans la paroi.");
	if (yaw && !expand) lines.push("Bascule tardive : dans 7 cm, elle a à peine le temps de se mettre en travers.");
	if ((d.effect === "ap" || d.core === "tungsten") && !expand) lines.push("Perforante : trou net, souvent de part en part. L’arrêt veut un vaisseau ou le crâne.");
	const incendiary = d.effect === "api" && v > 250;
	if (incendiary) lines.push("Incendiaire de matériel. Sur le vivant : berge brûlée, pas un arrêt.");
	const e = .5 * (massG / 1e3) * v * v;
	const dump = frag ? 1.8 : expand ? 1.55 : yaw ? 1.2 : d.effect === "ap" ? .6 : 1;
	let bleed = .15;
	let immediate = .02;
	if (reached) {
		if (meta.kind === "cns") immediate = .92;
		else if (meta.kind === "heart") immediate = .74 + (frag ? .12 : 0);
		else if (zone === "aorte") immediate = .88;
		else if (meta.kind === "artery") immediate = .16;
		else if (meta.kind === "bone") immediate = .42;
		else if (zone === "foie" || zone === "rate") immediate = .2;
		else immediate = .08;
		if (burst) immediate = Math.min(.95, immediate + blastCm * .22);
		if (shot && v > 200) immediate = Math.min(.9, immediate + .1);
		const energyFactor = Math.min(1.6, e / 10);
		bleed = meta.artery * (10 + 36 * energyFactor) * dump * (burst ? 1.25 : 1);
		if (zone === "poumon") bleed = Math.min(bleed, 3.2);
		if (zone === "intestin") bleed = Math.min(bleed, 2.8);
	}
	const seconds = bleed > .25 ? BODY.incapMl / bleed * 60 : null;
	let hors = "leger";
	if (!reached && v < 180) hors = "aucun";
	else if (immediate >= .6) hors = "immediat";
	else if (seconds !== null && seconds < 12) hors = "rapide";
	else if (seconds !== null && seconds < 100) hors = "differe";
	else if (!reached) hors = "leger";
	if (hors === "immediat") lines.push("Hors de combat dans l’instant. Un Meumeu ou un Bê, même sang, même 26 ml.");
	else if (hors === "rapide") lines.push(`Le vaisseau vide les ${BODY.incapMl} ml qui comptent en ~${Math.max(1, Math.round(seconds ?? 0))} s.`);
	else if (hors === "differe") lines.push("Encore debout. Sans caisse médicale au Seuil, il quitte la ligne dans la journée.");
	else if (hors === "leger") lines.push("Ça dégrade le pion. Ça n’enlève pas la compagnie.");
	else lines.push("Choc sans voie utile.");
	const thin = thick > 0 && thick < .09;
	let fragCount = 0;
	if (shot) fragCount = pelletN;
	else if (frag) fragCount = Math.min(14, Math.round(3 + cavity * 14 + (thin ? 3 : 0) + (burst ? 4 : 0) + (d.jacket === "none" ? 2 : 0)));
	else if (expand) fragCount = 2;
	const rnd = mulberry(Math.round(d.diameter * 100 + d.bulletLength * 10 + v + zone.length * 17));
	const payload = shot ? 1 : frag ? .62 : expand ? .2 : 0;
	const shares = Array.from({ length: fragCount }, () => .35 + rnd());
	const shareSum = shares.reduce((a, b) => a + b, 0) || 1;
	if (!seenOrgan || spawnCm > stopCm) spawnCm = Math.max(.12, stopCm * .45);
	spawnCm = Math.min(spawnCm, Math.max(.12, stopCm * .8));
	const room = Math.max(.12, stopCm - spawnCm);
	const layerAt = (cm) => {
		let acc = 0;
		for (const t of tissues) {
			acc += t.cm;
			if (cm <= acc + .001) return t;
		}
		return tissues[tissues.length - 1];
	};
	const frags = shares.map((share, i) => {
		const u = rnd();
		const ang = shot ? -72 + u * 144 : burst ? -78 + u * 156 : expand && !frag ? -24 + u * 48 : -52 + u * 104;
		let cm = (shot ? .25 + rnd() * .7 : .12 + rnd() * (.35 + blastCm * .5 + cavity * .4)) * Math.min(1.2, v / 400);
		cm = Math.min(cm, room * (.45 + rnd() * .55));
		if (burst) cm = Math.min(cm, Math.max(.15, blastCm));
		const end = layerAt(spawnCm + cm);
		const stop = end.id === "os" || end.id === "os2" || end.id === "colonne" || end.id === "cote" || end.id === "vert" ? "os" : spawnCm + cm >= pathCm * .96 ? "sortie" : "tissu";
		return {
			n: i + 1,
			ang: Math.round(ang),
			cm: Math.round(cm * 100) / 100,
			mg: Math.round(massG * payload * share / shareSum * 1e4) / 10,
			stop,
			where: end.label.toLowerCase()
		};
	});
	if (fragCount > 0) {
		const far = frags.reduce((m, f) => Math.max(m, f.cm), 0);
		const organIds = /* @__PURE__ */ new Set([
			"coeur",
			"poumon",
			"foie",
			"rate",
			"cerveau",
			"aorte",
			"carotide",
			"femoral",
			"intestin",
			"moelle",
			"mediastin"
		]);
		const inOrgan = tissues.some((t) => t.state !== "intacte" && organIds.has(t.id));
		lines.push(shot ? `${fragCount} grains. Le plus loin dans la chair : ${far.toFixed(1)} cm. Chacun est une blessure mince.` : inOrgan ? `${fragCount} éclats, le plus long ${far.toFixed(1)} cm. Ils restent dans l’organe — pas une gerbe hors du corps.` : `${fragCount} éclats, le plus long ${far.toFixed(1)} cm. Ils naissent avant l’organe.`);
	}
	if (burst) lines.push(`Petite charge : souffle ${blastCm.toFixed(1)} cm. Ce n’est pas une grenade, et ça ne le devient pas.`);
	else lines.push("Pas de charge. Rien ne détone.");
	const organs = /* @__PURE__ */ new Set();
	const organIds = /* @__PURE__ */ new Set([
		"coeur",
		"poumon",
		"foie",
		"rate",
		"cerveau",
		"aorte",
		"carotide",
		"femoral",
		"intestin",
		"moelle",
		"mediastin"
	]);
	for (const t of tissues) if (t.state !== "intacte" && organIds.has(t.id)) organs.add(t.label);
	for (const f of frags) {
		const end = layerAt(spawnCm + f.cm);
		if (organIds.has(end.id)) organs.add(end.label);
	}
	const tempCm = burst ? blastCm : expand || frag ? Math.min(1.6, .18 + e / 28 + cavity * .4) : yaw ? .32 : .1;
	const permMm = shot ? diam : expand ? diam * (1.35 + cavity * 1.8 + d.meplat) : yaw ? diam * 1.5 : diam;
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
		severity: hors === "immediat" ? 4 : hors === "rapide" ? 3 : hors === "differe" ? 2 : hors === "leger" ? 1 : 0,
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
		organs: [...organs]
	};
}
function sampleAt(report, range) {
	const s = report.samples;
	if (s.length === 0) return {
		range,
		drop: 0,
		velocity: 0,
		energy: 0,
		drift: 0,
		tof: 0
	};
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
		tof: a.tof + (b.tof - a.tof) * k
	};
}
function hitChance(d, report, range) {
	if (d.effect === "shot") {
		if (!report.buildable || report.pressureLabel === "dangereux") return .04;
		if (range <= 3) return .72;
		if (range <= 6) return .4;
		if (range <= 10) return .12;
		return .03;
	}
	if (!report.buildable || report.pressureLabel === "dangereux") return .03;
	const at = sampleAt(report, range);
	const sight = d.sight === "optic" ? 1.26 : d.sight === "aperture" ? 1.08 : .9;
	const stab = report.stabilityLabel === "clé" ? .42 : report.stabilityLabel === "surstable" ? .9 : 1;
	const energyKeep = Math.min(1, at.energy / 5);
	const dropPen = Math.min(1, Math.exp(-Math.abs(at.drop) * 22));
	const windPen = Math.min(1, Math.exp(-Math.abs(at.drift) * 18));
	const recoilPen = report.recoilLabel === "lourd" ? .62 : report.recoilLabel === "sec" ? .82 : 1;
	const awkward = range < 4 && d.barrelLength > 120 ? .7 : 1;
	const short = range > 16 && d.barrelLength < 55 ? .62 : 1;
	const falloff = Math.exp(-range / (d.sight === "optic" ? 30 : 17));
	const base = .58 * sight * stab * (.4 + .6 * energyKeep) * dropPen * windPen * recoilPen * awkward * short;
	return Math.max(.03, Math.min(.8, base * (.4 + .6 * falloff)));
}
function volleyCap(report) {
	let n = 1;
	if (report.reliable && report.recoilLabel !== "lourd") n = report.recoilLabel === "sec" ? 2 : report.rpm >= 20 ? 4 : 3;
	if (report.feed === "belt" && report.crew >= 2) n = Math.max(n, 6);
	if (report.feed === "single") n = 1;
	return Math.min(n, Math.max(1, report.magazine));
}
function chambers(rifle, ammo) {
	return Math.abs(rifle.diameter - ammo.diameter) < .08 && Math.abs(rifle.caseLength - ammo.caseLength) < .45;
}
function ammoKey(d0) {
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
		d.pellets
	].join("|");
}
function rifleKey(d0) {
	const d = normalizeDesign(d0);
	return [
		ammoKey(d),
		d.barrelLength,
		d.twist,
		d.action,
		d.sight,
		d.profile,
		d.feed,
		d.magazine
	].join("|");
}
var ENEMY_DESIGN = {
	...defaultDesign(),
	diameter: 1.55,
	caseLength: 10.5,
	caseDiameter: 2.4,
	bulletLength: 5.8,
	powderFill: .8,
	barrelLength: 88,
	twist: 58,
	nose: "round",
	effect: "ball",
	sight: "iron",
	zero: 12
};
var LABELS = {
	core: {
		lead: "Plomb nu",
		jacket: "Noyau plomb chemisé",
		steel: "Noyau acier",
		tungsten: "Noyau dense",
		frangible: "Frittée"
	},
	nose: {
		round: "Ronde",
		spitzer: "Pointue",
		flat: "Méplat",
		hollow: "Creuse",
		soft: "Pointe molle"
	},
	effect: {
		ball: "Balle",
		ap: "Perforante",
		api: "Incendiaire matériel",
		frag: "Fragmentable",
		tracer: "Traceuse",
		shot: "Chevrotine"
	},
	action: {
		bolt: "Verrou",
		lever: "Levier",
		straight: "Culasse droite",
		blowback: "Masse non calée"
	},
	sight: {
		iron: "Guidon",
		aperture: "Œilleton",
		optic: "Lunette"
	},
	profile: {
		light: "Mince",
		standard: "De guerre",
		heavy: "Lourd"
	},
	feed: {
		single: "Coup par coup",
		clip: "Lame",
		box: "Boîte",
		tube: "Tube",
		belt: "Bande"
	},
	caseMat: {
		brass: "Laiton",
		steel: "Acier",
		paper: "Papier"
	},
	filler: {
		none: "Pleine",
		void: "Cavité",
		burst: "Petite charge"
	},
	base: {
		flat: "Culot plat",
		boat: "Queue de bateau"
	},
	jacket: {
		none: "Sans chemise",
		tombac: "Tombac",
		cuivre: "Cuivre",
		acier: "Acier"
	},
	burn: {
		lente: "Poudre lente",
		moyenne: "Poudre de guerre",
		vive: "Poudre vive"
	},
	hors: {
		aucun: "Rien de net",
		leger: "Blessure légère",
		differe: "Hors de combat différé",
		rapide: "Hors de combat dans la foulée",
		immediat: "Hors de combat immédiat"
	}
};
var MOUTHS = {
	mines: 20,
	arsenal: 28
};
var ROADS = {
	"mines|arsenal": {
		km: 2.2,
		days: 1
	},
	"arsenal|mines": {
		km: 2.2,
		days: 1
	},
	"arsenal|front": {
		km: 5.4,
		days: 2
	},
	"front|arsenal": {
		km: 5.4,
		days: 2
	},
	"mines|front": {
		km: 8.1,
		days: 4
	},
	"front|mines": {
		km: 8.1,
		days: 4
	}
};
function road(a, b) {
	return ROADS[`${a}|${b}`];
}
function blank() {
	return {
		grain: 0,
		brass: 0,
		propellant: 0,
		lead: 0,
		steel: 0,
		tungsten: 0,
		medical: 0,
		timber: 0
	};
}
function depots() {
	return {
		mines: {
			id: "mines",
			name: "Puits-Meumeu",
			km: 0,
			stock: {
				...blank(),
				grain: 6e3,
				lead: 900,
				steel: 520,
				timber: 2200,
				brass: 180,
				propellant: 120,
				tungsten: 3
			},
			cartridges: [],
			rifles: []
		},
		arsenal: {
			id: "arsenal",
			name: "Arsenal de la Cale",
			km: 2.2,
			stock: {
				...blank(),
				grain: 3800,
				brass: 90,
				propellant: 45,
				lead: 80,
				steel: 180,
				timber: 90
			},
			cartridges: [],
			rifles: []
		},
		front: {
			id: "front",
			name: "Dépôt du Seuil",
			km: 7.6,
			stock: {
				...blank(),
				grain: 1400,
				medical: 1
			},
			cartridges: [],
			rifles: []
		}
	};
}
function fresh() {
	return {
		day: 1,
		wind: 1.5,
		design: defaultDesign(),
		zone: "coeur",
		depots: depots(),
		convoys: [],
		companies: [],
		labor: 8,
		wagons: 5,
		battle: null,
		log: [{
			day: 1,
			text: "Les Meumeu — bovins de peluche, 30 cm — tiennent les puits. Les Bê, chèvres de même taille, sont au-delà du fossé. Rien n’est encore armé."
		}],
		notice: "Le grain pèse plus lourd que les cartouches. Faites rouler un fourgon avant de rêver de feu."
	};
}
function uid() {
	return Math.random().toString(36).slice(2, 9);
}
function round2(n) {
	return Math.round(n * 100) / 100;
}
function pushLog(log, day, text) {
	return [{
		day,
		text
	}, ...log].slice(0, 16);
}
function mergeLot(lots, lot, keyOf) {
	const key = keyOf(lot.design);
	const hit = lots.find((l) => keyOf(l.design) === key);
	if (hit) hit.qty += lot.qty;
	else lots.push(lot);
}
function wagonsUsed(convoys) {
	return convoys.reduce((a, c) => a + c.wagons, 0);
}
function cargoGrams(cargo, amount, design) {
	if (cargo === "medical") return amount * 60;
	if (cargo === "cartridges" && design) return amount * evaluate(design).roundG;
	if (cargo === "rifles" && design) return amount * evaluate(design).weaponG;
	return amount;
}
var RAW = [
	"grain",
	"brass",
	"propellant",
	"lead",
	"steel",
	"tungsten",
	"medical",
	"timber"
];
function readiness(s) {
	const trained = s.companies.filter((c) => c.trainDays <= 0 && c.rifles >= 30);
	const hands = trained.reduce((a, c) => a + c.rifles, 0);
	const ammo = trained.reduce((a, c) => a + c.ammo, 0) + s.depots.front.cartridges.reduce((a, l) => a + l.qty, 0);
	const mouths = trained.reduce((a, c) => a + c.fit + c.wounded, 0) + 8;
	const days = s.depots.front.stock.grain / (mouths * 22);
	const checks = [
		{
			label: "Deux compagnies instruites",
			ok: trained.length >= 2,
			detail: `${trained.length} / 2`
		},
		{
			label: "Quarante coups par fusil, sur le dos ou au Seuil",
			ok: hands > 0 && ammo >= hands * 40,
			detail: `${ammo} coups pour ${hands} fusils`
		},
		{
			label: "Quatre jours de grain au Seuil",
			ok: days >= 4,
			detail: `${days.toFixed(1)} j`
		},
		{
			label: "Trois caisses médicales au Seuil",
			ok: s.depots.front.stock.medical >= 3,
			detail: `${s.depots.front.stock.medical} caisses`
		}
	];
	return {
		ok: checks.every((c) => c.ok),
		checks
	};
}
function pickZone(aim) {
	const table = {
		centre: [
			["poumon", .28],
			["coeur", .16],
			["aorte", .08],
			["foie", .14],
			["rate", .1],
			["intestin", .16],
			["colonne", .08]
		],
		tete: [["crane", .62], ["cou", .38]],
		jambe: [["femoral", .78], ["intestin", .22]]
	};
	let r = Math.random();
	for (const [z, p] of table[aim]) {
		r -= p;
		if (r <= 0) return z;
	}
	return table[aim][0][0];
}
var useGame = create()(persist((set, get) => ({
	...fresh(),
	setDesign: (patch) => set({ design: normalizeDesign({
		...get().design,
		...patch
	}) }),
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
		mines.grain += 2e3;
		mines.lead += 240;
		mines.steel += 170;
		mines.timber += 450;
		mines.brass += 80;
		mines.propellant += 50;
		mines.tungsten = round2(mines.tungsten + .7);
		const eat = (id, mouths, who) => {
			const need = mouths * 22;
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
		if (!eat("front", companies.reduce((a, c) => a + c.fit + c.wounded, 0), "Les compagnies du Seuil")) for (const c of companies) {
			const loss = Math.max(1, Math.round(c.fit * .1));
			const moved = Math.min(c.fit, loss);
			c.fit -= moved;
			c.wounded += moved;
			c.blood = Math.min(1, c.blood + .15);
		}
		const convoys = [];
		for (const c of s.convoys) if (c.daysLeft > 1) convoys.push({
			...c,
			daysLeft: c.daysLeft - 1
		});
		else {
			const dest = depots[c.to];
			if (c.cargo === "cartridges" && c.lot) mergeLot(dest.cartridges, {
				...c.lot,
				id: uid(),
				qty: c.amount
			}, ammoKey);
			else if (c.cargo === "rifles" && c.lot) mergeLot(dest.rifles, {
				...c.lot,
				id: uid(),
				qty: c.amount
			}, rifleKey);
			else if (RAW.includes(c.cargo)) {
				const key = c.cargo;
				dest.stock[key] = round2(dest.stock[key] + c.amount);
			}
			log = pushLog(log, day, `Fourgon arrivé à ${dest.name} : ${c.cargo} × ${Math.round(c.amount)}.`);
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
					c.blood = Math.max(0, c.blood - .2);
					log = pushLog(log, day, `${c.name} : ${heal} blessés repris, une caisse médicale consommée.`);
				} else {
					c.wounded -= 1;
					c.down += 1;
					c.blood = Math.min(1, c.blood + .1);
					log = pushLog(log, day, `${c.name} perd un blessé. Pas de caisse au Seuil.`);
				}
			}
		}
		set({
			day,
			depots,
			convoys,
			companies,
			labor: 8,
			log,
			notice: `Jour ${day}. Les forges ont encore 8 forgerons. Les puits ont produit.`
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
		let design;
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
			const key = cargo;
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
		const convoy = {
			id: uid(),
			from,
			to,
			cargo,
			amount: moved,
			lot: design ? {
				id: uid(),
				qty: moved,
				design,
				name: cartridgeName(design)
			} : void 0,
			daysLeft: link.days,
			daysTotal: link.days,
			wagons
		};
		set({
			depots,
			convoys: [...s.convoys, convoy],
			notice: `${wagons} fourgon(s) partis. ${link.km} km, ${link.days} j. Charge ${Math.round(grams)} g.`,
			log: pushLog(s.log, s.day, `Départ ${depots[from].name} → ${depots[to].name} : ${cargo} × ${Math.round(moved)}.`)
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
			tungsten: report.cost.tungsten * n
		};
		const labor = Math.max(1, Math.ceil(n / 240));
		if (labor > s.labor) {
			set({ notice: `Il reste ${s.labor} journée(s) de forge, il en faut ${labor}.` });
			return;
		}
		const depots = structuredClone(s.depots);
		const stock = depots.arsenal.stock;
		for (const [k, v] of Object.entries(need)) if (stock[k] + .001 < v) {
			set({ notice: `À la Cale, ${k} insuffisant : ${stock[k].toFixed(1)} g en caisse, ${v.toFixed(1)} g demandés.` });
			return;
		}
		for (const [k, v] of Object.entries(need)) stock[k] = round2(stock[k] - v);
		mergeLot(depots.arsenal.cartridges, {
			id: uid(),
			qty: n,
			design: { ...s.design },
			name: report.name
		}, ammoKey);
		set({
			depots,
			labor: s.labor - labor,
			notice: `${n} cartouches ${report.name} restent à la Cale. Un fourgon doit les prendre.`,
			log: pushLog(s.log, s.day, `Coulée : ${n} × ${report.name}. Elles ne sont pas au Seuil.`)
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
		mergeLot(depots.arsenal.rifles, {
			id: uid(),
			qty: n,
			design: { ...s.design },
			name: report.name
		}, rifleKey);
		set({
			depots,
			labor: s.labor - labor,
			notice: `${n} fusils (${Math.round(report.weaponG)} g pièce) à la Cale. Le Seuil ne les a pas encore.`,
			log: pushLog(s.log, s.day, `Forge : ${n} fusils ${report.name}.`)
		});
	},
	train: () => {
		const s = get();
		if (s.companies.length >= 3) {
			set({ notice: "Trois compagnies, pas une de plus. La république est petite." });
			return;
		}
		const depots = structuredClone(s.depots);
		const lot = depots.front.rifles.find((l) => l.qty >= 30);
		if (!lot) {
			set({ notice: `Il faut 30 fusils au Seuil, pas à la Cale. Le fret n’a pas fini son travail.` });
			return;
		}
		lot.qty -= 30;
		if (lot.qty <= 0) depots.front.rifles = depots.front.rifles.filter((l) => l.qty > 0);
		const company = {
			id: uid(),
			name: [
				"Première du Seuil",
				"Deuxième du Seuil",
				"Troisième du Seuil"
			][s.companies.length] ?? "Compagnie",
			men: 30,
			fit: 30,
			wounded: 0,
			down: 0,
			rifles: 30,
			rifle: { ...lot.design },
			ammo: 0,
			ammoDesign: null,
			trainDays: 2,
			blood: 0
		};
		set({
			depots,
			companies: [...s.companies, company],
			notice: `${company.name} s’instruit. Deux jours. Les cartouches ne sont pas encore dans les poches.`,
			log: pushLog(s.log, s.day, `${company.name} prend 30 fusils ${cartridgeName(lot.design)}.`)
		});
	},
	distribute: () => {
		const s = get();
		const depots = structuredClone(s.depots);
		const companies = s.companies.map((c) => ({
			...c,
			rifle: c.rifle ? { ...c.rifle } : null,
			ammoDesign: c.ammoDesign ? { ...c.ammoDesign } : null
		}));
		let moved = 0;
		for (const c of companies) {
			if (!c.rifle) continue;
			const want = c.men * 40 - c.ammo;
			if (want <= 0) continue;
			if (c.ammo > 0 && c.ammoDesign && !chambers(c.rifle, c.ammoDesign)) continue;
			const lot = depots.front.cartridges.find((l) => chambers(c.rifle, l.design) && l.qty > 0 && (!c.ammoDesign || ammoKey(c.ammoDesign) === ammoKey(l.design) || c.ammo === 0));
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
			notice: moved > 0 ? `${moved} cartouches passent des caisses aux poches. Celles qui ne chambrent pas restent en tas.` : "Aucune cartouche du Seuil ne chambre dans ces fusils."
		});
	},
	startBattle: () => {
		const s = get();
		if (!readiness(s).ok) {
			set({ notice: "Le Seuil n’est pas prêt. La guerre ne s’ouvre pas sur une caisse vide." });
			return;
		}
		if (s.battle && !s.battle.resolved) return;
		set({
			battle: {
				enemyFit: 56,
				enemyMen: 56,
				enemyAmmo: 1456,
				range: 12,
				resolved: false,
				outcome: "none",
				lastFx: "none",
				enemyBlood: 0
			},
			notice: "Les Bê sont à douze mètres. Chaque coup sort d’une poche, pas d’un registre.",
			log: pushLog(s.log, s.day, "Escarmouche au fossé. 56 Bê, autant de corps de 30 cm.")
		});
	},
	setRange: (range) => {
		const b = get().battle;
		if (!b || b.resolved) return;
		set({ battle: {
			...b,
			range
		} });
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
		const lines = [];
		for (const c of companies) {
			if (c.trainDays > 0 || c.fit <= 0 || !c.rifle || !c.ammoDesign || c.ammo <= 0) continue;
			if (!chambers(c.rifle, c.ammoDesign)) continue;
			const report = evaluate(c.ammoDesign, s.wind);
			const cap = volleyCap(report);
			const shots = Math.min(c.ammo, c.fit * cap);
			c.ammo -= shots;
			ourShots += shots;
			let p = hitChance(c.ammoDesign, report, b.range);
			if (aim === "tete") p *= .6;
			if (aim === "jambe") p *= .88;
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
		const ep = hitChance(ENEMY_DESIGN, enemyReport, b.range) * .92;
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
					c.blood = Math.min(1, c.blood + .18);
				}
			} else if (w.hors === "differe" && c.fit > 0) {
				c.fit -= 1;
				c.wounded += 1;
				ourDrops++;
				c.blood = Math.min(1, c.blood + .1);
			}
		}
		const ourFit = companies.reduce((a, c) => a + (c.trainDays <= 0 ? c.fit : 0), 0);
		const ourAmmo = companies.reduce((a, c) => a + c.ammo, 0);
		let outcome = "none";
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
			depots.front.stock.grain = Math.round(depots.front.stock.grain * .6);
			depots.front.stock.brass = Math.round(depots.front.stock.brass * .6);
			notice = "La ligne Meumeu est à terre. Le Seuil est pillé d’une part. On reconstruira, pas aujourd’hui.";
		} else if (outcome === "dry") notice = "Les deux poches sont vides. La bataille s’éteint faute de cartouches — le fret a eu le dernier mot.";
		const fx = ourDrops > 0 && theirDrops > 0 ? "both" : theirDrops > 0 ? "enemy" : ourDrops > 0 ? "player" : "none";
		set({
			companies,
			depots,
			battle: {
				...b,
				enemyFit,
				enemyAmmo,
				resolved,
				outcome,
				lastFx: fx,
				enemyBlood
			},
			notice,
			log: pushLog(s.log, s.day, notice)
		});
	}
}), {
	name: "meumeu-fret-v2",
	skipHydration: true,
	version: 3,
	migrate: (state) => {
		const s = state;
		if (s?.design) s.design = normalizeDesign(s.design);
		if (s?.depots) for (const depot of Object.values(s.depots)) {
			depot.cartridges?.forEach((lot) => {
				lot.design = normalizeDesign(lot.design);
			});
			depot.rifles?.forEach((lot) => {
				lot.design = normalizeDesign(lot.design);
			});
		}
		s?.companies?.forEach((c) => {
			if (c.rifle) c.rifle = normalizeDesign(c.rifle);
			if (c.ammoDesign) c.ammoDesign = normalizeDesign(c.ammoDesign);
		});
		return s;
	}
}));
function grams$1(n) {
	if (!Number.isFinite(n)) return "—";
	const a = Math.abs(n);
	if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e4 ? 1 : 2)} kg`;
	if (a >= 100) return `${Math.round(n)} g`;
	if (a >= 10) return `${n.toFixed(1)} g`;
	return `${n.toFixed(2)} g`;
}
function Panel({ title, aside, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "min-w-0 rounded-lg border border-line bg-surface p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-baseline justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-serif text-base text-brass",
				children: title
			}), aside && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-right text-xs text-muted",
				children: aside
			})]
		}), children]
	});
}
function Slider({ label, value, min, max, step, unit, disabled, onChange }) {
	const shown = step < 1 ? value.toFixed(2) : String(Math.round(value));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: `block text-sm ${disabled ? "opacity-40" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex justify-between gap-2 text-muted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "shrink-0 text-fg",
				children: [shown, unit ? ` ${unit}` : ""]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "range",
			min,
			max,
			step,
			disabled,
			value: Number.isFinite(value) ? value : min,
			onChange: (e) => onChange(Number(e.target.value))
		})]
	});
}
function Chips({ label, value, options, onPick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mb-1 text-xs text-muted",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-wrap gap-1",
		children: Object.keys(options).map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => onPick(id),
			className: `min-h-11 rounded-md px-2 text-sm ${value === id ? "bg-brass text-ink" : "bg-bg text-fg"}`,
			children: options[id]
		}, id))
	})] });
}
var ROLES = [
	"Pointeur",
	"Chargeur",
	"Porte-pied"
];
var HOTSPOTS = [
	{
		zone: "crane",
		x: 34,
		y: 12,
		w: 32,
		h: 20
	},
	{
		zone: "cou",
		x: 42,
		y: 32,
		w: 16,
		h: 6
	},
	{
		zone: "poumon",
		x: 33,
		y: 39,
		w: 15,
		h: 12
	},
	{
		zone: "poumon",
		x: 52,
		y: 39,
		w: 15,
		h: 12
	},
	{
		zone: "coeur",
		x: 43,
		y: 44,
		w: 14,
		h: 8
	},
	{
		zone: "aorte",
		x: 46,
		y: 41,
		w: 8,
		h: 12
	},
	{
		zone: "colonne",
		x: 46,
		y: 39,
		w: 8,
		h: 20
	},
	{
		zone: "foie",
		x: 33,
		y: 51,
		w: 15,
		h: 8
	},
	{
		zone: "rate",
		x: 53,
		y: 51,
		w: 13,
		h: 7
	},
	{
		zone: "intestin",
		x: 36,
		y: 57,
		w: 28,
		h: 8
	},
	{
		zone: "femoral",
		x: 36,
		y: 66,
		w: 12,
		h: 12
	},
	{
		zone: "femoral",
		x: 52,
		y: 66,
		w: 12,
		h: 12
	}
];
function Atelier() {
	const game = useGame();
	const report = (0, import_react.useMemo)(() => evaluate(game.design, game.wind), [game.design, game.wind]);
	const set = game.setDesign;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3 xl:grid-cols-[22rem_minmax(0,1fr)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid content-start gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Bureau de la pièce",
					aside: report.name,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							"Meumeu et Bê : ",
							BODY.heightCm,
							" cm, ",
							BODY.massG,
							" g. Fémur ",
							BODY.femurMm,
							" mm, artère ",
							BODY.arteryMm,
							" mm, sang utile ",
							BODY.incapMl,
							" ml sur ",
							BODY.bloodMl,
							". Ce bureau estime une peluche. Il ne fabrique pas une arme réelle."
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 flex gap-2 overflow-x-auto pb-1",
						children: PRESETS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => game.applyPreset(p.design),
							className: "min-h-11 shrink-0 rounded-md border border-line px-3 text-left text-sm hover:border-brass",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-brass",
								children: p.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block max-w-52 text-xs text-muted",
								children: p.blurb
							})]
						}, p.id))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "La cartouche",
					aside: `${grams$1(report.massG)} · forme ${report.form.toFixed(2)}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Calibre",
							value: game.design.diameter,
							min: .9,
							max: 3.2,
							step: .05,
							unit: "mm",
							onChange: (diameter) => set({ diameter })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Longueur de balle",
							value: game.design.bulletLength,
							min: 2.4,
							max: 12,
							step: .1,
							unit: "mm",
							onChange: (bulletLength) => set({ bulletLength })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Méplat",
							value: game.design.meplat,
							min: 0,
							max: .6,
							step: .02,
							onChange: (meplat) => set({ meplat })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Queue de bateau",
							value: game.design.boat,
							min: 0,
							max: .45,
							step: .02,
							disabled: game.design.base !== "boat",
							onChange: (boat) => set({ boat })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Cavité / charge",
							value: game.design.filler === "none" ? 0 : game.design.cavity,
							min: 0,
							max: .7,
							step: .02,
							disabled: game.design.filler === "none",
							onChange: (cavity) => set({ cavity })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Épaisseur de chemise",
							value: game.design.jacketMm,
							min: .04,
							max: .4,
							step: .01,
							unit: "mm",
							disabled: game.design.jacket === "none" || game.design.effect === "shot",
							onChange: (jacketMm) => set({ jacketMm })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Grains",
							value: game.design.pellets,
							min: 4,
							max: 18,
							step: 1,
							disabled: game.design.effect !== "shot",
							onChange: (pellets) => set({ pellets })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 grid gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Ogive",
									value: game.design.nose,
									options: LABELS.nose,
									onPick: (nose) => set({ nose })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Culot",
									value: game.design.base,
									options: LABELS.base,
									onPick: (base) => set({ base })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Noyau",
									value: game.design.core,
									options: LABELS.core,
									onPick: (core) => set({ core })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Chemise",
									value: game.design.jacket,
									options: LABELS.jacket,
									onPick: (jacket) => set({ jacket })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Genre",
									value: game.design.effect,
									options: LABELS.effect,
									onPick: (effect) => set({
										effect,
										filler: effect === "shot" ? "none" : game.design.filler
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Intérieur",
									value: game.design.filler,
									options: LABELS.filler,
									onPick: (filler) => set({
										filler,
										cavity: filler === "none" ? 0 : Math.max(.2, game.design.cavity)
									})
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "L’étui, la poudre, l’arme",
					aside: LABELS.burn[game.design.burn],
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Longueur d’étui",
							value: game.design.caseLength,
							min: 5,
							max: 18,
							step: .1,
							unit: "mm",
							onChange: (caseLength) => set({ caseLength })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Diamètre d’étui",
							value: game.design.caseDiameter,
							min: 1.4,
							max: 4.4,
							step: .05,
							unit: "mm",
							onChange: (caseDiameter) => set({ caseDiameter })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Tassement",
							value: game.design.powderFill,
							min: .4,
							max: 1.08,
							step: .01,
							onChange: (powderFill) => set({ powderFill })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Canon",
							value: game.design.barrelLength,
							min: 36,
							max: 170,
							step: 1,
							unit: "mm",
							onChange: (barrelLength) => set({ barrelLength })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Pas de rayure",
							value: game.design.twist,
							min: 24,
							max: 120,
							step: 1,
							unit: "mm/tr",
							onChange: (twist) => set({ twist })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Zéro de hausse",
							value: game.design.zero,
							min: 4,
							max: 36,
							step: 1,
							unit: "m",
							onChange: (zero) => set({ zero })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Coups dans l’arme",
							value: game.design.feed === "single" ? 1 : game.design.magazine,
							min: 1,
							max: FEED_CAP[game.design.feed],
							step: 1,
							disabled: game.design.feed === "single",
							onChange: (magazine) => set({ magazine })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 grid gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Vivacité — pas une recette, une allure de brûlage",
									value: game.design.burn,
									options: LABELS.burn,
									onPick: (burn) => set({ burn })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Étui",
									value: game.design.caseMat,
									options: LABELS.caseMat,
									onPick: (caseMat) => set({ caseMat })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Alimentation",
									value: game.design.feed,
									options: LABELS.feed,
									onPick: (feed) => set({
										feed,
										magazine: Math.min(game.design.magazine, FEED_CAP[feed])
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Culasse",
									value: game.design.action,
									options: LABELS.action,
									onPick: (action) => set({ action })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Hausse",
									value: game.design.sight,
									options: LABELS.sight,
									onPick: (sight) => set({ sight })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chips, {
									label: "Profil",
									value: game.design.profile,
									options: LABELS.profile,
									onPick: (profile) => set({ profile })
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Order, { report })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid min-w-0 content-start gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Piece, {
					report,
					design: game.design
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flight, {
					report,
					zero: game.design.zero,
					wind: game.wind,
					setWind: game.setWind
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Body, {
					design: game.design,
					wind: game.wind,
					zero: game.design.zero
				})
			]
		})]
	});
}
function Order({ report }) {
	const game = useGame();
	const [ammoN, setAmmoN] = (0, import_react.useState)(400);
	const [rifleN, setRifleN] = (0, import_react.useState)(30);
	const parts = [
		{
			k: "Plomb",
			g: report.cost.lead,
			cls: "bg-muted"
		},
		{
			k: "Laiton / chemise",
			g: report.cost.brass,
			cls: "bg-brass"
		},
		{
			k: "Poudre",
			g: report.cost.propellant,
			cls: "bg-oxide"
		},
		{
			k: "Acier",
			g: report.cost.steel,
			cls: "bg-fg"
		},
		{
			k: "Dense",
			g: report.cost.tungsten,
			cls: "bg-paper"
		}
	].filter((p) => p.g > .001);
	const sum = parts.reduce((a, p) => a + p.g, 0) || 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		title: "Ordonner — la caisse naît à la Cale",
		aside: `${game.labor} forgerons`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-2 flex h-3 overflow-hidden rounded-full bg-bg",
				children: parts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: p.cls,
					style: { width: `${p.g / sum * 100}%` }
				}, p.k))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mb-2 grid grid-cols-2 gap-1 text-xs text-muted",
				children: parts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
					p.k,
					" ",
					grams$1(p.g)
				] }, p.k))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mb-1 block text-muted",
						children: "Cartouches"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "min-h-11 w-full rounded-md border border-line bg-bg px-2",
						type: "number",
						min: 1,
						value: ammoN,
						onChange: (e) => setAmmoN(Number(e.target.value))
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mb-1 block text-muted",
						children: "Fusils"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: "min-h-11 w-full rounded-md border border-line bg-bg px-2",
						type: "number",
						min: 1,
						value: rifleN,
						onChange: (e) => setRifleN(Number(e.target.value))
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "min-h-11 rounded-md bg-brass px-3 text-sm text-ink",
					onClick: () => game.makeAmmo(ammoN),
					children: "Couler les cartouches"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "min-h-11 rounded-md border border-brass px-3 text-sm text-brass",
					onClick: () => game.makeRifles(rifleN),
					children: "Forger les fusils"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs text-muted",
				children: [
					"Acier du fusil ",
					grams$1(report.rifleCost.steel),
					" · bois ",
					grams$1(report.rifleCost.timber),
					". ",
					report.crewWhy
				]
			})
		]
	});
}
function Piece({ report, design }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		title: "Fenêtre 1 — la pièce",
		aside: `${Math.round(report.weaponLengthMm)} mm · ${report.crew} servant${report.crew > 1 ? "s" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scale, {
				report,
				design
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cartridge, { design }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Magazine, {
					report,
					design
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Balle",
						v: grams$1(report.massG)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Cartouche",
						v: grams$1(report.roundG)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Bouche",
						v: `${Math.round(report.velocity)} m/s`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Énergie",
						v: `${report.energyJ.toFixed(1)} J`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Pression",
						v: report.pressureLabel
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Stabilité",
						v: report.stabilityLabel
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Recul",
						v: report.recoilLabel
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Arme",
						v: grams$1(report.weaponG)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Section",
						v: report.sd.toFixed(3)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Rechargement",
						v: `${report.reloadS.toFixed(1)} s`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Dans l’arme",
						v: `${report.magazine} · ${LABELS.feed[report.feed]}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Fabricable",
						v: report.buildable ? "oui" : "non"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 space-y-1 text-sm text-brass",
				children: report.goods.slice(0, 4).map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["+ ", g] }, g))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 space-y-1 text-sm text-oxide",
				children: report.bads.slice(0, 5).map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["– ", g] }, g))
			})
		]
	});
}
function Stat({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "rounded-md bg-bg px-2 py-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "block text-xs text-muted",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: v })]
	});
}
function Scale({ report, design }) {
	const parts = weaponParts(design);
	const L = parts.total;
	const bracket = 12.5;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "overflow-x-auto",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-w-max items-end gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative h-80 w-36 shrink-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: "/plates/meumeu.jpg",
						alt: "Meumeu, bovin de peluche, 30 cm",
						className: "h-full w-full bg-paper object-contain"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute bottom-[16%] left-1 top-[14%] w-0.5 bg-brass" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "absolute bottom-[12%] left-3 text-xs text-brass",
						children: "300 mm"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: `0 0 ${L} 300`,
				className: "shrink-0 text-brass",
				style: {
					height: `${bracket}rem`,
					width: `${L / 300 * bracket}rem`
				},
				role: "img",
				"aria-label": `Arme de ${Math.round(L)} millimètres à côté d’un Meumeu de 300`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "0",
						y: "108",
						width: parts.stock,
						height: "46",
						className: "fill-raised stroke-brass",
						strokeWidth: "1.4"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: parts.stock,
						y: "102",
						width: parts.receiver,
						height: "54",
						className: "fill-surface stroke-brass",
						strokeWidth: "1.4"
					}),
					design.action === "bolt" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: parts.stock + 8,
						y: "96",
						width: "10",
						height: "8",
						className: "fill-brass"
					}),
					design.action === "lever" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: `M ${parts.stock + 12} 156 q 8 16 18 0`,
						className: "fill-none stroke-brass",
						strokeWidth: "1.6"
					}),
					design.action === "straight" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: parts.stock + parts.receiver - 6,
						y: "118",
						width: "8",
						height: "16",
						className: "fill-brass"
					}),
					design.sight === "optic" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: parts.stock + 4,
						y: "86",
						width: parts.receiver + 10,
						height: "12",
						rx: "3",
						className: "fill-bg stroke-brass",
						strokeWidth: "1.2"
					}),
					design.sight === "aperture" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: parts.stock + 8,
						cy: "118",
						r: "4",
						className: "fill-none stroke-brass",
						strokeWidth: "1.3"
					}),
					design.feed === "box" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: parts.stock + 10,
						y: "154",
						width: "14",
						height: 18 + design.magazine * .6,
						className: "fill-brass"
					}),
					design.feed === "clip" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: parts.stock + 12,
						y: "90",
						width: "6",
						height: "14",
						className: "fill-oxide"
					}),
					design.feed === "tube" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: parts.stock + parts.receiver,
						y: "148",
						width: parts.barrel * .7,
						height: "5",
						className: "fill-brass"
					}),
					design.feed === "belt" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: `M ${parts.stock + 16} 150 C ${parts.stock - 10} 190, ${parts.stock - 30} 120, ${parts.stock - 4} 210`,
						className: "fill-none stroke-oxide",
						strokeWidth: "2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: parts.stock + parts.receiver,
						y: "122",
						width: parts.feedExtra + parts.barrel,
						height: 4 + design.diameter * 1.3,
						className: "fill-brass"
					}),
					design.sight === "iron" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: L - 3,
						y: "112",
						width: "2",
						height: "12",
						className: "fill-fg"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
						x: "0",
						y: "250",
						className: "fill-muted",
						fontSize: "14",
						children: [
							Math.round(L),
							" mm · ",
							(L / 300).toFixed(2),
							" corps"
						]
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 flex flex-wrap items-end gap-3",
			children: [Array.from({ length: report.crew }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
				className: "w-16",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: "/plates/meumeu.jpg",
					alt: "",
					className: "h-16 w-full bg-paper object-contain"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", {
					className: "text-center text-xs text-brass",
					children: ROLES[i]
				})]
			}, ROLES[i])), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-sm pb-1 text-xs text-muted",
				children: report.crewWhy
			})]
		})]
	});
}
function Cartridge({ design }) {
	const n = design;
	const ppm = 8;
	const caseL = n.caseLength * ppm;
	const caseD = Math.max(8, n.caseDiameter * ppm);
	const bullL = n.bulletLength * ppm;
	const bullD = Math.max(4, n.diameter * ppm);
	const seat = Math.min(caseL * .42, bullL * .5);
	const x0 = 16;
	const y = 48;
	const nose = n.effect === "shot" ? "round" : n.nose;
	const tip = x0 + caseL - seat + bullL;
	const neck = x0 + caseL - seat;
	const top = y - bullD / 2;
	const bot = y + bullD / 2;
	let bullet = "";
	if (nose === "spitzer" || nose === "soft") bullet = `M ${neck} ${top} L ${tip} ${y} L ${neck} ${bot} Z`;
	else if (nose === "hollow") bullet = `M ${neck} ${top} L ${tip - bullD * .35} ${top} L ${tip - bullD * .7} ${y} L ${tip - bullD * .35} ${bot} L ${neck} ${bot} Z`;
	else if (nose === "flat") bullet = `M ${neck} ${top} L ${tip} ${top} L ${tip} ${bot} L ${neck} ${bot} Z`;
	else bullet = `M ${neck} ${top} Q ${tip + bullD * .2} ${y} ${neck} ${bot} Z`;
	const powderH = (caseD - 4) * Math.min(1, n.powderFill);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mb-1 text-xs text-muted",
			children: [
				"Coupe de la cartouche · artère ",
				BODY.arteryMm,
				" mm, fémur ",
				BODY.femurMm,
				" mm"
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 220 96",
			className: "h-28 w-full",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: x0,
					y: y - caseD / 2,
					width: caseL,
					height: caseD,
					className: n.caseMat === "paper" ? "fill-raised" : n.caseMat === "steel" ? "fill-fg" : "fill-brass"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: 19,
					y: y + caseD / 2 - 2 - powderH,
					width: Math.max(2, caseL - seat - 4),
					height: powderH,
					className: "fill-oxide",
					opacity: "0.85"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: bullet,
					className: n.core === "tungsten" ? "fill-paper" : n.core === "steel" ? "fill-fg" : n.core === "frangible" ? "fill-line" : "fill-muted"
				}),
				n.jacket !== "none" && n.effect !== "shot" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: bullet,
					className: "fill-none stroke-brass",
					strokeWidth: Math.max(.6, n.jacketMm * ppm * .45)
				}),
				n.filler !== "none" && n.effect !== "shot" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: neck + bullL * .45,
					cy: y,
					rx: bullD * .18 * (.4 + n.cavity),
					ry: bullD * .22 * (.4 + n.cavity),
					className: n.filler === "burst" ? "fill-oxide" : "fill-bg"
				}),
				n.effect === "shot" && Array.from({ length: Math.min(n.pellets, 8) }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: neck + 6 + i % 4 * (bullD * .28),
					cy: y - bullD * .2 + Math.floor(i / 4) * bullD * .35,
					r: Math.max(1.2, bullD / 7),
					className: "fill-muted"
				}, i)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "8",
					y1: "84",
					x2: 8 + BODY.arteryMm * ppm,
					y2: "84",
					className: "stroke-oxide",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "40",
					y1: "84",
					x2: 40 + BODY.femurMm * ppm,
					y2: "84",
					className: "stroke-brass",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "8",
					y: "78",
					className: "fill-muted",
					fontSize: "8",
					children: "artère"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "40",
					y: "78",
					className: "fill-muted",
					fontSize: "8",
					children: "fémur"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-xs text-muted",
			children: [
				LABELS.caseMat[n.caseMat],
				" · ",
				LABELS.core[n.core],
				" · ",
				LABELS.jacket[n.jacket],
				n.filler === "burst" ? " · petite charge dans la pointe" : n.filler === "void" ? " · cavité vide" : " · pleine",
				n.effect === "shot" ? ` · ${n.pellets} grains` : ""
			]
		})
	] });
}
function Magazine({ report, design }) {
	const cap = design.feed === "single" ? 1 : design.magazine;
	const [loaded, setLoaded] = (0, import_react.useState)(cap);
	const [phase, setPhase] = (0, import_react.useState)("pret");
	const [stepI, setStepI] = (0, import_react.useState)(0);
	const steps = reloadSteps(design, report.crew);
	const timer = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (timer.current) window.clearInterval(timer.current);
		setLoaded(cap);
		setPhase("pret");
		setStepI(0);
	}, [
		cap,
		design.feed,
		design.action
	]);
	(0, import_react.useEffect)(() => () => {
		if (timer.current) window.clearInterval(timer.current);
	}, []);
	function shoot() {
		if (phase === "recharge" || loaded <= 0) return;
		setLoaded((n) => Math.max(0, n - 1));
		setPhase("feu");
		window.setTimeout(() => setPhase((p) => p === "feu" ? "pret" : p), 160);
	}
	function reload() {
		if (phase === "recharge") return;
		if (timer.current) window.clearInterval(timer.current);
		setPhase("recharge");
		setLoaded(0);
		setStepI(0);
		let i = 0;
		const gap = Math.max(260, report.reloadS * 1e3 / Math.max(1, steps.length));
		timer.current = window.setInterval(() => {
			i += 1;
			setStepI(i);
			if (i >= steps.length) {
				if (timer.current) window.clearInterval(timer.current);
				setLoaded(cap);
				setPhase("pret");
			}
		}, gap);
	}
	const actor = design.feed === "belt" && report.crew >= 2 ? 1 : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mb-1 text-xs text-muted",
			children: [
				LABELS.feed[design.feed],
				" · ",
				report.reloadS.toFixed(1),
				" s pour remplir · ",
				phase === "recharge" ? steps[Math.min(stepI, steps.length - 1)] : phase === "feu" ? "Départ" : loaded === 0 ? "Vide" : "Prête"
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-wrap gap-1",
			children: Array.from({ length: cap }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-8 w-3 rounded-sm ${i < loaded ? "bg-brass" : "bg-bg"}` }, i))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-2 text-xs text-muted",
			children: [
				"Au rechargement, c’est le ",
				ROLES[actor].toLowerCase(),
				" qui travaille",
				report.crew === 1 && design.feed === "belt" ? " — et il est seul, la bande se tord" : "",
				"."
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2 flex flex-wrap gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "min-h-11 rounded-md bg-brass px-3 text-sm text-ink disabled:opacity-40",
				disabled: loaded <= 0 || phase === "recharge",
				onClick: shoot,
				children: "Tirer un coup"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "min-h-11 rounded-md border border-brass px-3 text-sm text-brass disabled:opacity-40",
				disabled: phase === "recharge" || loaded === cap,
				onClick: reload,
				children: "Recharger"
			})]
		}),
		phase === "recharge" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
			className: "mt-2 space-y-1 text-sm",
			children: steps.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: i < stepI ? "text-brass" : i === stepI ? "text-fg" : "text-muted",
				children: [
					i < stepI ? "Fait" : i === stepI ? "En cours" : "Ensuite",
					" — ",
					s
				]
			}, s))
		})
	] });
}
function Flight({ report, zero, wind, setWind }) {
	const chart = report.samples.map((s) => ({
		...s,
		chute: Math.round(s.drop * 1e3) / 10
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		title: "Fenêtre 2 — la trajectoire",
		aside: report.transonicM !== null ? `transsonique vers ${report.transonicM} m` : `zéro ${zero} m`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Arc, {
				report,
				zero
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
				label: "Vent de travers",
				value: wind,
				min: 0,
				max: 8,
				step: .1,
				unit: "m/s",
				onChange: setWind
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-xs text-muted",
				children: [
					"Portée utile ",
					report.usefulM,
					" m · hausse ",
					report.zeroAngleDeg.toFixed(2),
					"° · ",
					report.pelletN > 1 ? `${report.pelletN} grains de ${report.pelletMm.toFixed(2)} mm, l’énergie est celle du nuage` : "un seul projectile"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 h-52 w-full min-w-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
						data: chart,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, { stroke: "var(--color-line)" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "range",
								stroke: "var(--color-muted)",
								unit: " m"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								yAxisId: "v",
								stroke: "var(--color-brass)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								yAxisId: "e",
								orientation: "right",
								stroke: "var(--color-oxide)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: {
								background: "var(--color-surface)",
								border: "1px solid var(--color-line)"
							} }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								yAxisId: "v",
								type: "monotone",
								dataKey: "velocity",
								name: "vitesse m/s",
								stroke: "var(--color-brass)",
								dot: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								yAxisId: "e",
								type: "monotone",
								dataKey: "energy",
								name: "énergie J",
								stroke: "var(--color-oxide)",
								dot: false
							})
						]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "m" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "m/s" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "J" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "chute" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "dérive" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "s" })
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: report.samples.filter((_, i) => i % 2 === 0).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: s.range }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: s.velocity }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: s.energy.toFixed(1) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [(s.drop * 100).toFixed(1), " cm"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [(s.drift * 100).toFixed(1), " cm"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: s.tof.toFixed(2) })
						]
					}, s.range)) })]
				})
			})
		]
	});
}
function Arc({ report, zero }) {
	const w = 640;
	const h = 168;
	const last = report.samples[report.samples.length - 1]?.range ?? 40;
	const maxR = Math.max(36, zero, Math.min(60, last));
	const xOf = (m) => 32 + Math.min(maxR, m) / maxR * 592;
	const yOf = (dropM) => 46 - dropM * 100 * 2.1;
	const pts = report.samples.filter((s) => s.range <= maxR).map((s) => `${xOf(s.range)},${yOf(s.drop)}`).join(" ");
	const drift = report.samples.filter((s) => s.range <= maxR).map((s) => `${xOf(s.range)},${132 - s.drift * 100 * 1.4}`).join(" ");
	const zx = xOf(Math.min(zero, maxR));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: `0 0 ${w} ${h}`,
		className: "h-44 w-full",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "32",
				y1: "46",
				x2: 628,
				y2: "46",
				className: "stroke-line",
				strokeWidth: "1"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
				points: pts,
				fill: "none",
				className: "trace stroke-brass",
				strokeWidth: "1.8"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: zx,
				y1: 46 - 45.36,
				x2: zx,
				y2: 63.64,
				className: "stroke-oxide",
				strokeWidth: "3"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: zx + 6,
				y: 63.64,
				className: "fill-oxide",
				fontSize: "11",
				children: "Meumeu 30 cm au zéro"
			}),
			report.transonicM !== null && report.transonicM <= maxR && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: xOf(report.transonicM),
				y1: "18",
				x2: xOf(report.transonicM),
				y2: "100",
				className: "stroke-muted",
				strokeDasharray: "3 3"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("text", {
				x: "32",
				y: "16",
				className: "fill-muted",
				fontSize: "11",
				children: [
					"ligne de mire · chute réelle · 0 à ",
					Math.round(maxR),
					" m"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "32",
				y1: "132",
				x2: 628,
				y2: "132",
				className: "stroke-line",
				strokeWidth: "1"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
				points: drift,
				fill: "none",
				className: "stroke-fg",
				strokeWidth: "1.2"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
				x: "32",
				y: "124",
				className: "fill-muted",
				fontSize: "11",
				children: "vue dessus · dérive au vent"
			})
		]
	});
}
function Body({ design, wind, zero }) {
	const zone = useGame((s) => s.zone);
	const setZone = useGame((s) => s.setZone);
	const [range, setRange] = (0, import_react.useState)(zero);
	const [tilt, setTilt] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		setRange(zero);
	}, [zero]);
	const report = (0, import_react.useMemo)(() => evaluate(design, wind), [design, wind]);
	const at = sampleAt(report, range);
	const wound = (0, import_react.useMemo)(() => terminal(design, at.velocity || report.velocity, zone, tilt), [
		design,
		at.velocity,
		report.velocity,
		zone,
		tilt
	]);
	const spot = HOTSPOTS.find((h) => h.zone === zone) ?? HOTSPOTS[0];
	const cx = spot.x + spot.w / 2;
	const cy = spot.y + spot.h / 2;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		title: "Fenêtre 3 — dans le corps",
		aside: LABELS.hors[wound.hors],
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-2 text-sm text-muted",
				children: [
					"À ",
					range,
					" m il reste ",
					Math.round(at.velocity),
					" m/s et ",
					at.energy.toFixed(1),
					" J. Bouche : ",
					Math.round(report.velocity),
					" m/s. Touchez un organe, ou choisissez-le."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mx-auto aspect-[2/3] w-full max-w-sm overflow-hidden rounded-md bg-bg",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: "/plates/radiograph.jpg",
							alt: "Radiographie d’un Meumeu de 30 cm",
							className: "h-full w-full object-contain"
						}),
						HOTSPOTS.map((h, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": ZONE_META[h.zone].label,
							onClick: () => setZone(h.zone),
							className: `absolute rounded-sm border ${zone === h.zone ? "border-brass bg-brass/30" : "border-transparent"}`,
							style: {
								left: `${h.x}%`,
								top: `${h.y}%`,
								width: `${h.w}%`,
								height: `${h.h}%`
							}
						}, `${h.zone}-${i}`)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
							viewBox: "0 0 100 100",
							preserveAspectRatio: "none",
							className: "pointer-events-none absolute inset-0 h-full w-full",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
									cx,
									cy,
									r: Math.max(.7, wound.permMm * .28),
									className: "fill-brass",
									opacity: "0.85"
								}),
								wound.blastCm > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
									cx,
									cy,
									r: Math.max(1.4, wound.blastCm * 3.1),
									className: "fill-none stroke-oxide",
									strokeWidth: "0.45"
								}),
								wound.frags.map((f) => {
									const rad = f.ang * Math.PI / 180;
									const x2 = cx + Math.sin(rad) * f.cm * 6.5;
									const y2 = cy + Math.cos(rad) * f.cm * 2.4;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
										x1: cx,
										y1: cy,
										x2,
										y2,
										className: "trace stroke-oxide",
										strokeWidth: "0.45"
									}, f.n);
								}),
								wound.exit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
									cx: cx + 1.2,
									cy: cy + 1.4,
									r: "0.9",
									className: "fill-none stroke-brass",
									strokeWidth: "0.35"
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 flex flex-wrap gap-1",
					children: Object.keys(ZONE_META).map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setZone(id),
						className: `min-h-11 rounded-md px-2 text-sm ${zone === id ? "bg-brass text-ink" : "bg-bg text-fg"}`,
						children: ZONE_META[id].label.split(" / ")[0]
					}, id))
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cut, { wound })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
					label: "Distance du coup",
					value: range,
					min: 2,
					max: 36,
					step: 1,
					unit: "m",
					onChange: setRange
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
					label: "Obliquité",
					value: tilt,
					min: 0,
					max: 55,
					step: 1,
					unit: "°",
					onChange: setTilt
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Pénétration",
						v: `${wound.penCm.toFixed(1)} cm`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Chemin",
						v: `${wound.stopCm.toFixed(1)} / ${wound.pathCm.toFixed(1)} cm`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Éclats",
						v: String(wound.fragCount)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Souffle",
						v: wound.blastCm > 0 ? `${wound.blastCm.toFixed(1)} cm` : "aucun"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Cavité passagère",
						v: `${wound.tempCm.toFixed(2)} cm`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Canal",
						v: `${wound.permMm.toFixed(2)} mm`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Sortie",
						v: wound.exit ? "oui" : "non"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						k: "Saignement",
						v: `${wound.bleed.toFixed(1)} ml/min`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm",
				children: [
					"Organes touchés : ",
					wound.organs.length ? wound.organs.join(", ") : "aucun",
					".",
					wound.seconds ? ` Vidange utile ~${Math.round(wound.seconds)} s.` : " Pas de vaisseau ouvert."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 space-y-1 text-sm text-muted",
				children: wound.lines.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: l }, l))
			}),
			wound.frags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 overflow-x-auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "#" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "angle" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "course" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "masse" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "arrêt" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "vers" })
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: wound.frags.slice(0, 8).map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-line",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: f.n }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [f.ang, "°"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [f.cm.toFixed(2), " cm"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [f.mg.toFixed(1), " mg"] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: f.stop === "os" ? "os" : f.stop === "sortie" ? "sort" : "tissu" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: f.where })
						]
					}, f.n)) })]
				}), wound.frags.length > 8 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-xs text-muted",
					children: [
						"et ",
						wound.frags.length - 8,
						" autres, même nuage."
					]
				})]
			})
		]
	});
}
function Cut({ wound }) {
	const scale = 300 / Math.max(wound.pathCm, .8);
	let x = 8;
	const nodes = wound.tissues.map((t) => {
		const width = Math.max(2, t.cm * scale);
		const node = {
			...t,
			x,
			width
		};
		x += width;
		return node;
	});
	const stopX = 8 + wound.stopCm * scale;
	let spawnX = 20;
	for (const n of nodes) if ([
		"cerveau",
		"carotide",
		"poumon",
		"coeur",
		"aorte",
		"foie",
		"rate",
		"intestin",
		"moelle",
		"femoral",
		"mediastin"
	].includes(n.id)) {
		spawnX = n.x + Math.min(n.width * .35, 14);
		break;
	}
	const y0 = 36;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-1 text-xs text-muted",
			children: "Coupe en profondeur · 1 cm sur la règle · laiton = franchi, oxyde = arrêt"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: "0 0 340 150",
			className: "h-40 w-full",
			children: [
				nodes.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
					x: n.x,
					y: y0,
					width: n.width,
					height: "44",
					className: n.state === "arret" ? "fill-oxide" : n.state === "franchie" ? "fill-brass" : "fill-bg",
					opacity: n.state === "intacte" ? .45 : .8,
					stroke: "var(--color-line)",
					strokeWidth: "0.6"
				}), n.width > 26 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: n.x + 2,
					y: 52,
					className: "fill-paper",
					fontSize: "8",
					children: n.label
				})] }, n.id + n.x)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "8",
					y1: 58,
					x2: stopX,
					y2: 58,
					className: "trace stroke-ink",
					strokeWidth: "1.4"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
					cx: spawnX,
					cy: 58,
					rx: Math.max(3, wound.tempCm * scale * .45),
					ry: Math.max(4, wound.tempCm * scale * .7),
					className: "fill-none stroke-oxide",
					strokeWidth: "1"
				}),
				wound.blastCm > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: spawnX,
					cy: 58,
					r: Math.max(4, wound.blastCm * scale),
					className: "fill-none stroke-oxide",
					strokeDasharray: "2 2"
				}),
				wound.frags.map((f) => {
					const rad = f.ang * Math.PI / 180;
					const x2 = spawnX + Math.cos(rad) * f.cm * scale * .85;
					const y2 = 58 + Math.sin(rad) * f.cm * scale * .55;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
						x1: spawnX,
						y1: 58,
						x2,
						y2,
						className: "trace stroke-oxide",
						strokeWidth: "0.8"
					}, f.n);
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: "8",
					y1: "128",
					x2: 8 + scale,
					y2: "128",
					className: "stroke-brass",
					strokeWidth: "2"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "8",
					y: "122",
					className: "fill-muted",
					fontSize: "9",
					children: "1 cm"
				}),
				wound.exit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: Math.min(250, stopX),
					y: "18",
					className: "fill-brass",
					fontSize: "10",
					children: "sortie"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-1 space-y-0.5 text-xs text-muted",
			children: wound.tissues.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
				t.label,
				" · ",
				t.cm.toFixed(2),
				" cm · ",
				t.state === "franchie" ? "franchie" : t.state === "arret" ? "arrêt" : "intacte"
			] }, t.id))
		})
	] });
}
var TABS = [
	{
		id: "fret",
		label: "Fret",
		icon: Boxes
	},
	{
		id: "armes",
		label: "Armurerie",
		icon: Crosshair
	},
	{
		id: "qg",
		label: "Quartier",
		icon: Landmark
	},
	{
		id: "choc",
		label: "Escarmouche",
		icon: Swords
	}
];
var CARGO = [
	{
		id: "grain",
		label: "Grain (g)"
	},
	{
		id: "brass",
		label: "Laiton (g)"
	},
	{
		id: "propellant",
		label: "Poudre (g)"
	},
	{
		id: "lead",
		label: "Plomb (g)"
	},
	{
		id: "steel",
		label: "Acier (g)"
	},
	{
		id: "tungsten",
		label: "Dense (g)"
	},
	{
		id: "timber",
		label: "Bois (g)"
	},
	{
		id: "medical",
		label: "Caisses médicales"
	},
	{
		id: "cartridges",
		label: "Cartouches"
	},
	{
		id: "rifles",
		label: "Fusils"
	}
];
function grams(n) {
	if (!Number.isFinite(n)) return "—";
	const a = Math.abs(n);
	if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e4 ? 1 : 2)} kg`;
	if (a >= 100) return `${Math.round(n)} g`;
	if (a >= 10) return `${n.toFixed(1)} g`;
	return `${n.toFixed(2)} g`;
}
function GameApp() {
	const game = useGame();
	const [tab, setTab] = (0, import_react.useState)("armes");
	(0, import_react.useEffect)(() => {
		useGame.persist.rehydrate();
	}, []);
	const gate = readiness(game);
	const free = game.wagons - wagonsUsed(game.convoys);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-3 py-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: "/plates/meumeu.jpg",
							alt: "Meumeu, bovin de peluche",
							className: "h-14 w-11 rounded-sm bg-paper object-contain"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-serif text-lg leading-none text-brass",
								children: "MEUMEU"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "Fret & Feu · bovins de peluche, 30 cm · contre les Bê, chèvres"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-right text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-serif text-fg",
								children: ["Jour ", game.day]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-muted",
								children: [
									free,
									" fourgon",
									free > 1 ? "s" : "",
									" libre",
									free > 1 ? "s" : "",
									" · ",
									game.labor,
									" forges"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 rounded-md bg-brass px-3 text-sm font-medium text-ink disabled:opacity-40",
							onClick: () => game.advanceDay(),
							disabled: !!game.battle && !game.battle.resolved,
							children: "Clore la journée"
						})
					]
				}), game.notice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-auto max-w-6xl px-3 pb-3 text-sm text-paper",
					children: game.notice
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-6xl px-3 py-4 pb-24",
				children: [
					tab === "fret" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Freight, {}),
					tab === "armes" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Atelier, {}),
					tab === "qg" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quarter, { gate }),
					tab === "choc" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skirmish, { gate })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-auto grid max-w-6xl grid-cols-4",
					children: TABS.map((t) => {
						const Icon = t.icon;
						const on = tab === t.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setTab(t.id),
							className: `flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${on ? "text-brass" : "text-muted"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 18 }), t.label]
						}, t.id);
					})
				})
			})
		]
	});
}
function Card({ title, children, aside }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-surface p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-baseline justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-serif text-base text-brass",
				children: title
			}), aside && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: aside
			})]
		}), children]
	});
}
function Freight() {
	const game = useGame();
	const [from, setFrom] = (0, import_react.useState)("mines");
	const [to, setTo] = (0, import_react.useState)("arsenal");
	const [cargo, setCargo] = (0, import_react.useState)("grain");
	const [amount, setAmount] = (0, import_react.useState)(1500);
	const [lotId, setLotId] = (0, import_react.useState)("");
	const src = game.depots[from];
	const lots = cargo === "cartridges" ? src.cartridges : cargo === "rifles" ? src.rifles : [];
	const lot = lots.find((l) => l.id === lotId) ?? lots[0];
	const link = road(from, to);
	const loadG = cargoGrams(cargo, amount, lot?.design);
	const nodes = [
		{
			id: "mines",
			x: 12
		},
		{
			id: "arsenal",
			x: 50
		},
		{
			id: "front",
			x: 88
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "La carte tient dans une journée de pattes",
				aside: "fourgon 1,5 kg · corps 30 cm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 100 36",
					className: "h-28 w-full",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
							x1: "12",
							y1: "18",
							x2: "88",
							y2: "18",
							className: "stroke-line",
							strokeWidth: "1"
						}),
						nodes.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: n.x,
							cy: "18",
							r: "3.2",
							className: "fill-brass"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
							x: n.x,
							y: "10",
							textAnchor: "middle",
							className: "fill-fg",
							fontSize: "3.2",
							children: game.depots[n.id].name
						})] }, n.id)),
						game.convoys.map((c) => {
							const ax = nodes.find((n) => n.id === c.from)?.x ?? 0;
							const bx = nodes.find((n) => n.id === c.to)?.x ?? 0;
							const u = 1 - c.daysLeft / c.daysTotal;
							const x = ax + (bx - ax) * Math.min(.92, Math.max(.08, u));
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: x,
								cy: "18",
								r: "1.6",
								className: "fill-oxide"
							}, c.id);
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						"Puits → Cale 2,2 km, 1 jour. Cale → Seuil 5,4 km, 2 jours. La diagonale Puits → Seuil prend 4 jours et ne forge rien.",
						MOUTHS.mines + MOUTHS.arsenal,
						" bouches mangent ",
						22,
						" g chacune, chaque jour, là où elles vivent."
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 lg:grid-cols-3",
				children: Object.keys(game.depots).map((id) => {
					const d = game.depots[id];
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						title: d.name,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
								className: "grid grid-cols-2 gap-x-3 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stock, {
										k: "Grain",
										v: grams(d.stock.grain)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stock, {
										k: "Laiton",
										v: grams(d.stock.brass)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stock, {
										k: "Poudre",
										v: grams(d.stock.propellant)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stock, {
										k: "Plomb",
										v: grams(d.stock.lead)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stock, {
										k: "Acier",
										v: grams(d.stock.steel)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stock, {
										k: "Dense",
										v: grams(d.stock.tungsten)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stock, {
										k: "Bois",
										v: grams(d.stock.timber)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stock, {
										k: "Caisses",
										v: String(d.stock.medical)
									})
								]
							}),
							d.cartridges.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-sm text-paper",
								children: [
									l.qty,
									" cart. ",
									l.name
								]
							}, l.id)),
							d.rifles.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-paper",
								children: [
									l.qty,
									" fusils ",
									l.name
								]
							}, l.id)),
							d.cartridges.length + d.rifles.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xs text-muted",
								children: "Pas d’armes en caisse."
							})
						]
					}, id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Charger un fourgon",
				aside: link ? `${link.km} km · ${link.days} j · ${Math.round(loadG)} g` : "même dépôt",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Départ",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
									value: from,
									onChange: (v) => setFrom(v),
									options: [
										"mines",
										"arsenal",
										"front"
									].map((id) => ({
										id,
										label: game.depots[id].name
									}))
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Arrivée",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
									value: to,
									onChange: (v) => setTo(v),
									options: [
										"mines",
										"arsenal",
										"front"
									].map((id) => ({
										id,
										label: game.depots[id].name
									}))
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Charge",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
									value: cargo,
									onChange: (v) => setCargo(v),
									options: CARGO
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Quantité",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "min-h-11 w-full rounded-md border border-line bg-bg px-2 text-fg",
									type: "number",
									min: 1,
									value: amount,
									onChange: (e) => setAmount(Number(e.target.value))
								})
							}),
							lots.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Lot",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
									value: lot?.id ?? "",
									onChange: setLotId,
									options: lots.map((l) => ({
										id: l.id,
										label: `${l.name} · ${l.qty}`
									}))
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-3 min-h-11 rounded-md bg-brass px-4 text-sm font-medium text-ink",
						onClick: () => game.dispatch(from, to, cargo, amount, lot?.id),
						children: "Faire partir le fourgon"
					}),
					game.convoys.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 space-y-1 text-sm text-muted",
						children: game.convoys.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
							game.depots[c.from].name,
							" → ",
							game.depots[c.to].name,
							" · ",
							c.cargo,
							" × ",
							Math.round(c.amount),
							" · ",
							c.daysLeft,
							" j · ",
							c.wagons,
							" fourgon",
							c.wagons > 1 ? "s" : ""
						] }, c.id))
					})
				]
			})
		]
	});
}
function Stock({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "flex justify-between gap-2 border-b border-line/60 py-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: v })]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-1 block text-muted",
			children: label
		}), children]
	});
}
function Select({ value, onChange, options }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
		className: "min-h-11 w-full rounded-md border border-line bg-bg px-2 text-fg",
		value,
		onChange: (e) => onChange(e.target.value),
		children: options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
			value: o.id,
			children: o.label
		}, o.id))
	});
}
function Quarter({ gate }) {
	const game = useGame();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3 lg:grid-cols-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "On n’est pas prêts",
				aside: gate.ok ? "le fossé peut s’ouvrir" : "la guerre reste close",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-2 text-sm",
						children: gate.checks.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-start justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: c.ok ? "text-brass" : "text-fg",
								children: [
									c.ok ? "Tenu" : "Manque",
									" — ",
									c.label
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted",
								children: c.detail
							})]
						}, c.label))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "min-h-11 rounded-md bg-brass px-3 text-sm text-ink",
							onClick: () => game.train(),
							children: [
								"Instruire une compagnie (",
								30,
								")"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 rounded-md border border-brass px-3 text-sm text-brass",
							onClick: () => game.distribute(),
							children: "Poches : cartouches du Seuil"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted",
						children: "Les fusils doivent déjà être au Seuil. L’instruction dure deux jours. Une cartouche qui ne chambre pas reste en caisse."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Compagnies",
				aside: `8 forgerons repartent chaque aube`,
				children: [game.companies.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Aucune. Trente Meumeu, un fusil chacun, quand le fret aura porté l’acier."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-3",
					children: game.companies.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portrait, {
							src: "/plates/meumeu.jpg",
							blood: c.blood,
							alt: c.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-serif text-brass",
									children: c.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									c.fit,
									" debout · ",
									c.wounded,
									" blessés · ",
									c.down,
									" à terre"
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-muted",
									children: [
										c.trainDays > 0 ? `Instruction, ${c.trainDays} j` : "Instruite",
										" · ",
										c.ammo,
										" coups ",
										c.ammoDesign ? c.ammoDesign.diameter.toFixed(2) + " mm" : ""
									]
								})
							]
						})]
					}, c.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				title: "Registre",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-1 text-sm",
					children: game.log.map((l, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted",
							children: ["J", l.day]
						}),
						" ",
						l.text
					] }, `${l.day}-${i}`))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mt-3 min-h-11 text-sm text-oxide",
					onClick: () => game.reset(),
					children: "Recommencer la république"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				title: "Ce que pèse une journée",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						"Les puits donnent du grain, du métal, un peu de poudre, des miettes de noyau dense. La Cale ne crée des cartouches que si la matière est déjà dans ses murs. Le Seuil ne tire que ce qu’un fourgon a déposé. Une compagnie de ",
						30,
						" mange ",
						660,
						" g par jour, en plus des bouches civiles."
					]
				})
			})
		]
	});
}
function Portrait({ src, blood, alt }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-28 w-20 shrink-0 overflow-hidden rounded-md bg-paper",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src,
			alt,
			className: "h-full w-full object-contain"
		}), blood > .04 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: "/fx/blood-burst.png",
			alt: "",
			className: "pointer-events-none absolute inset-0 h-full w-full object-cover",
			style: { opacity: .25 + blood * .6 }
		})]
	});
}
var RANGES = [
	4,
	8,
	12,
	18,
	28
];
function Skirmish({ gate }) {
	const game = useGame();
	const b = game.battle;
	const [aim, setAim] = (0, import_react.useState)("centre");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Le fossé",
			aside: "même peluche, 30 cm : bovin contre chèvre",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-end gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portrait, {
							src: "/plates/meumeu.jpg",
							blood: game.companies.some((c) => c.blood > 0) ? Math.max(...game.companies.map((c) => c.blood), 0) : 0,
							alt: "Meumeu, bovin de peluche"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-center text-xs text-brass",
							children: [
								"Meumeu",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								"bovin"
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "pb-8 text-sm text-muted",
							children: b ? `${b.range} m` : "pas encore"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portrait, {
							src: "/plates/be.jpg?v=chevre",
							blood: b?.enemyBlood ?? 0,
							alt: "Bê, chèvre de peluche"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-center text-xs text-muted",
							children: [
								"Bê",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								"chèvre"
							]
						})] }),
						(b?.lastFx === "enemy" || b?.lastFx === "both") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: "/fx/muzzle.png",
							alt: "",
							className: "h-16 w-16 object-contain"
						})
					]
				}),
				!b && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: "Tant que le grain, les caisses et les poches ne tiennent pas, les Bê restent un bruit derrière le fossé."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-2 space-y-1 text-sm",
						children: gate.checks.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: c.ok ? "text-brass" : "text-fg",
							children: [
								c.ok ? "Tenu" : "Manque",
								" — ",
								c.label,
								" (",
								c.detail,
								")"
							]
						}, c.label))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: !gate.ok,
						className: "mt-3 min-h-11 rounded-md bg-oxide px-3 text-sm text-paper disabled:opacity-40",
						onClick: () => game.startBattle(),
						children: "Ouvrir le feu"
					})
				] }),
				b && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm",
							children: [
								b.enemyFit,
								" Bê debout sur ",
								b.enemyMen,
								" · ",
								b.enemyAmmo,
								" coups dans leurs poches"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: [
								"Nos poches : ",
								game.companies.reduce((a, c) => a + c.ammo, 0),
								" coups · ",
								game.companies.reduce((a, c) => a + c.fit, 0),
								" Meumeu debout"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 flex flex-wrap gap-2",
							children: RANGES.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: b.resolved,
								onClick: () => game.setRange(r),
								className: `min-h-11 rounded-md px-3 text-sm ${b.range === r ? "bg-brass text-ink" : "bg-bg text-fg"}`,
								children: [r, " m"]
							}, r))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 flex flex-wrap gap-2",
							children: [
								["centre", "Centre"],
								["tete", "Tête"],
								["jambe", "Jambes"]
							].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setAim(id),
								className: `min-h-11 rounded-md px-3 text-sm ${aim === id ? "bg-brass text-ink" : "border border-line"}`,
								children: label
							}, id))
						}),
						!b.resolved && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-3 min-h-11 rounded-md bg-oxide px-4 text-sm text-paper",
							onClick: () => game.fire(aim),
							children: "Volée"
						}),
						b.resolved && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 font-serif text-brass",
							children: b.outcome === "rout" ? "Les Bê cèdent." : b.outcome === "lost" ? "La ligne est tombée." : "Plus une cartouche. Le fret a tranché."
						})
					]
				})
			]
		}), game.companies.filter((c) => c.trainDays <= 0).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: c.name,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portrait, {
					src: "/plates/meumeu.jpg",
					blood: c.blood,
					alt: ""
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm",
					children: [
						c.fit,
						" debout, ",
						c.wounded,
						" blessés, ",
						c.down,
						" à terre, ",
						c.ammo,
						" coups. Un Meumeu trop atteint quitte la ligne dans la volée — ça dépend du calibre, de ce qu’il reste de vitesse, et de l’organe."
					]
				})]
			})
		}, c.id))]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameApp, {});
}
//#endregion
export { Home as component };
