import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BODY,
  FEED_CAP,
  LABELS,
  PRESETS,
  ZONE_META,
  evaluate,
  reloadSteps,
  sampleAt,
  terminal,
  weaponParts,
  type Report,
  type Wound,
} from "@/game/ballistics";
import { Cinema } from "@/components/game/cinema";
import { useGame } from "@/game/store";
import type { Armor, BaseShape, Burn, CaseMat, CoreMat, Design, Effect, Feed, Filler, Foregrip, Jacket, Mount, Muzzle, Nose, ZoneId } from "@/game/types";

function grams(n: number) {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1000) return `${(n / 1000).toFixed(a >= 10000 ? 1 : 2)} kg`;
  if (a >= 100) return `${Math.round(n)} g`;
  if (a >= 10) return `${n.toFixed(1)} g`;
  return `${n.toFixed(2)} g`;
}

function Panel({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-line bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-base text-brass">{title}</h2>
        {aside && <p className="text-right text-xs text-muted">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  const shown = step < 1 ? value.toFixed(2) : String(Math.round(value));
  return (
    <label className={`block text-sm ${disabled ? "opacity-40" : ""}`}>
      <span className="flex justify-between gap-2 text-muted">
        <span>{label}</span>
        <span className="shrink-0 text-fg">
          {shown}
          {unit ? ` ${unit}` : ""}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={Number.isFinite(value) ? value : min}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Chips<T extends string>({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: T;
  options: Record<T, string>;
  onPick: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{label}</p>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(options) as T[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            className={`min-h-11 rounded-md px-2 text-sm ${value === id ? "bg-brass text-ink" : "bg-bg text-fg"}`}
          >
            {options[id]}
          </button>
        ))}
      </div>
    </div>
  );
}

const FACINGS = ["S", "SE", "E", "NE", "N", "NO", "O", "SO"];

function Formation({ report, design }: { report: Report; design: Design }) {
  const [who, setWho] = useState<"meumeu" | "be">("meumeu");
  const [dir, setDir] = useState(1);
  const [run, setRun] = useState(false);
  const ang = (dir / 8) * Math.PI * 2;
  const x = 50 + Math.sin(ang) * 18;
  const y = 54 + Math.cos(ang) * 12;
  const reach = 10 + Math.min(28, report.weaponLengthMm / 18);
  const x2 = 50 + Math.sin(ang) * (18 + reach);
  const y2 = 54 + Math.cos(ang) * (12 + reach * 0.62);
  const src = who === "meumeu" ? "/plates/meumeu.jpg" : "/plates/be.jpg";
  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className={`min-h-11 rounded-md px-3 text-sm ${who === "meumeu" ? "bg-brass text-ink" : "bg-bg"}`} onClick={() => setWho("meumeu")}>Meumeu</button>
        <button type="button" className={`min-h-11 rounded-md px-3 text-sm ${who === "be" ? "bg-brass text-ink" : "bg-bg"}`} onClick={() => setWho("be")}>Bê</button>
        <button type="button" className={`min-h-11 rounded-md px-3 text-sm ${run ? "bg-brass text-ink" : "bg-bg"}`} onClick={() => setRun((v) => !v)}>{run ? "Course" : "Tenue"}</button>
        {FACINGS.map((label, i) => (
          <button key={label} type="button" className={`min-h-11 rounded-md px-2 text-sm ${dir === i ? "bg-brass text-ink" : "bg-bg text-muted"}`} onClick={() => setDir(i)}>{label}</button>
        ))}
      </div>
      <div className="relative mx-auto h-56 max-w-lg overflow-hidden rounded-md bg-bg">
        <div className="absolute left-1/2 top-1/2 h-28 w-64 -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-[50%] border border-line bg-raised" />
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <line x1={x} y1={y} x2={x2} y2={y2} className="stroke-brass" strokeWidth={0.6 + design.diameter * 0.08} />
          {report.mount !== "epaule" && <circle cx={x2} cy={y2} r="1.4" className="fill-none stroke-brass" />}
        </svg>
        <img
          src={src}
          alt={who === "meumeu" ? "Meumeu, portrait de référence" : "Bê, portrait de référence"}
          className={`absolute h-24 w-16 -translate-x-1/2 -translate-y-full bg-paper object-contain ${run ? "bob" : ""}`}
          style={{ left: `${x}%`, top: `${y}%` }}
        />
        {report.crewRoles.slice(1).map((role, i) => (
          <img
            key={role}
            src="/plates/meumeu.jpg"
            alt={role}
            className="absolute h-14 w-10 -translate-x-1/2 bg-paper object-contain"
            style={{ left: `${x - 10 - i * 8}%`, top: `${y + 8}%` }}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        Le portrait que tu as donné reste de face : les huit feuilles gravées ne sont pas encore là. L’arme du bureau, {Math.round(report.weaponLengthMm)} mm, se pose dans la direction choisie. {LABELS.mount[report.mount]}.
      </p>
    </div>
  );
}

const HOTSPOTS: { zone: ZoneId; x: number; y: number; w: number; h: number }[] = [
  { zone: "crane", x: 34, y: 12, w: 32, h: 20 },
  { zone: "cou", x: 42, y: 32, w: 16, h: 6 },
  { zone: "poumon", x: 33, y: 39, w: 15, h: 12 },
  { zone: "poumon", x: 52, y: 39, w: 15, h: 12 },
  { zone: "coeur", x: 43, y: 44, w: 14, h: 8 },
  { zone: "aorte", x: 46, y: 41, w: 8, h: 12 },
  { zone: "colonne", x: 46, y: 39, w: 8, h: 20 },
  { zone: "foie", x: 33, y: 51, w: 15, h: 8 },
  { zone: "rate", x: 53, y: 51, w: 13, h: 7 },
  { zone: "intestin", x: 36, y: 57, w: 28, h: 8 },
  { zone: "femoral", x: 36, y: 66, w: 12, h: 12 },
  { zone: "femoral", x: 52, y: 66, w: 12, h: 12 },
];

export function Atelier() {
  const game = useGame();
  const report = useMemo(() => evaluate(game.design, game.wind), [game.design, game.wind]);
  const set = game.setDesign;

  return (
    <div className="grid gap-3 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="grid content-start gap-3">
        <Panel title="Bureau de la pièce" aside={report.name}>
          <p className="text-sm text-muted">
            Meumeu et Bê : {BODY.heightCm} cm, {BODY.massG} g. Fémur {BODY.femurMm} mm, artère {BODY.arteryMm} mm, sang utile {BODY.incapMl} ml sur {BODY.bloodMl}. Ce bureau estime une peluche. Il ne fabrique pas une arme réelle.
          </p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => game.applyPreset(p.design)} className="min-h-11 shrink-0 rounded-md border border-line px-3 text-left text-sm hover:border-brass">
                <span className="block text-brass">{p.label}</span>
                <span className="block max-w-52 text-xs text-muted">{p.blurb}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="La cartouche" aside={`${grams(report.massG)} · forme ${report.form.toFixed(2)}`}>
          <Slider label="Calibre" value={game.design.diameter} min={0.5} max={14} step={0.05} unit="mm" onChange={(diameter) => set({ diameter })} />
          <Slider label="Longueur de balle" value={game.design.bulletLength} min={2} max={48} step={0.1} unit="mm" onChange={(bulletLength) => set({ bulletLength })} />
          <Slider label="Méplat" value={game.design.meplat} min={0} max={0.6} step={0.02} onChange={(meplat) => set({ meplat })} />
          <Slider label="Queue de bateau" value={game.design.boat} min={0} max={0.45} step={0.02} disabled={game.design.base !== "boat"} onChange={(boat) => set({ boat })} />
          <Slider label="Cavité / charge" value={game.design.filler === "none" ? 0 : game.design.cavity} min={0} max={0.7} step={0.02} disabled={game.design.filler === "none"} onChange={(cavity) => set({ cavity })} />
          <Slider label="Épaisseur de chemise" value={game.design.jacketMm} min={0.04} max={0.4} step={0.01} unit="mm" disabled={game.design.jacket === "none" || game.design.effect === "shot"} onChange={(jacketMm) => set({ jacketMm })} />
          <Slider label="Grains" value={game.design.pellets} min={4} max={24} step={1} disabled={game.design.effect !== "shot"} onChange={(pellets) => set({ pellets })} />
          <div className="mt-2 grid gap-2">
            <Chips<Nose> label="Ogive" value={game.design.nose} options={LABELS.nose} onPick={(nose) => set({ nose })} />
            <Chips<BaseShape> label="Culot" value={game.design.base} options={LABELS.base} onPick={(base) => set({ base })} />
            <Chips<CoreMat> label="Noyau" value={game.design.core} options={LABELS.core} onPick={(core) => set({ core })} />
            <Chips<Jacket> label="Chemise" value={game.design.jacket} options={LABELS.jacket} onPick={(jacket) => set({ jacket })} />
            <Chips<Effect> label="Genre" value={game.design.effect} options={LABELS.effect} onPick={(effect) => set({ effect, filler: effect === "shot" ? "none" : game.design.filler })} />
            <Chips<Filler> label="Intérieur" value={game.design.filler} options={LABELS.filler} onPick={(filler) => set({ filler, cavity: filler === "none" ? 0 : Math.max(0.2, game.design.cavity) })} />
          </div>
        </Panel>

        <Panel title="L’étui, la poudre, l’arme" aside={LABELS.burn[game.design.burn]}>
          <Slider label="Longueur d’étui" value={game.design.caseLength} min={4} max={52} step={0.1} unit="mm" onChange={(caseLength) => set({ caseLength })} />
          <Slider label="Diamètre d’étui" value={game.design.caseDiameter} min={1} max={18} step={0.05} unit="mm" onChange={(caseDiameter) => set({ caseDiameter })} />
          <Slider label="Tassement" value={game.design.powderFill} min={0.35} max={1.12} step={0.01} onChange={(powderFill) => set({ powderFill })} />
          <Slider label="Canon" value={game.design.barrelLength} min={24} max={480} step={1} unit="mm" onChange={(barrelLength) => set({ barrelLength })} />
          <Slider label="Pas de rayure" value={game.design.twist} min={12} max={420} step={1} unit="mm/tr" onChange={(twist) => set({ twist })} />
          <Slider label="Zéro de hausse" value={game.design.zero} min={2} max={90} step={1} unit="m" onChange={(zero) => set({ zero })} />
          <Slider
            label="Coups dans l’arme"
            value={game.design.feed === "single" ? 1 : game.design.magazine}
            min={1}
            max={FEED_CAP[game.design.feed]}
            step={1}
            disabled={game.design.feed === "single"}
            onChange={(magazine) => set({ magazine })}
          />
          <div className="mt-2 grid gap-2">
            <Chips<Burn> label="Vivacité — pas une recette, une allure de brûlage" value={game.design.burn} options={LABELS.burn} onPick={(burn) => set({ burn })} />
            <Chips<CaseMat> label="Étui" value={game.design.caseMat} options={LABELS.caseMat} onPick={(caseMat) => set({ caseMat })} />
            <Chips<Feed> label="Alimentation" value={game.design.feed} options={LABELS.feed} onPick={(feed) => set({ feed, magazine: Math.min(game.design.magazine, FEED_CAP[feed]) })} />
            <Chips<Muzzle> label="Bouche" value={game.design.muzzle} options={LABELS.muzzle} onPick={(muzzle) => set({ muzzle })} />
            <Chips<Mount> label="Appui" value={game.design.mount} options={LABELS.mount} onPick={(mount) => set({ mount })} />
            <Chips<Foregrip> label="Devant" value={game.design.foregrip} options={LABELS.foregrip} onPick={(foregrip) => set({ foregrip })} />
            <Chips label="Culasse" value={game.design.action} options={LABELS.action} onPick={(action) => set({ action })} />
            <Chips label="Hausse" value={game.design.sight} options={LABELS.sight} onPick={(sight) => set({ sight })} />
            <Chips label="Profil" value={game.design.profile} options={LABELS.profile} onPick={(profile) => set({ profile })} />
          </div>
        </Panel>

        <Order report={report} />
      </div>

      <div className="grid min-w-0 content-start gap-3">
        <Piece report={report} design={game.design} />
        <Flight report={report} zero={game.design.zero} wind={game.wind} setWind={game.setWind} />
        <Body design={game.design} wind={game.wind} zero={game.design.zero} />
      </div>
    </div>
  );
}

function Order({ report }: { report: Report }) {
  const game = useGame();
  const [ammoN, setAmmoN] = useState(400);
  const [rifleN, setRifleN] = useState(30);
  const parts = [
    { k: "Plomb", g: report.cost.lead, cls: "bg-muted" },
    { k: "Laiton / chemise", g: report.cost.brass, cls: "bg-brass" },
    { k: "Poudre", g: report.cost.propellant, cls: "bg-oxide" },
    { k: "Acier", g: report.cost.steel, cls: "bg-fg" },
    { k: "Dense", g: report.cost.tungsten, cls: "bg-paper" },
  ].filter((p) => p.g > 0.001);
  const sum = parts.reduce((a, p) => a + p.g, 0) || 1;
  return (
    <Panel title="Ordonner — la caisse naît à la Cale" aside={`${game.labor} forgerons`}>
      <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-bg">
        {parts.map((p) => (
          <div key={p.k} className={p.cls} style={{ width: `${(p.g / sum) * 100}%` }} />
        ))}
      </div>
      <ul className="mb-2 grid grid-cols-2 gap-1 text-xs text-muted">
        {parts.map((p) => (
          <li key={p.k}>
            {p.k} {grams(p.g)}
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Cartouches</span>
          <input className="min-h-11 w-full rounded-md border border-line bg-bg px-2" type="number" min={1} value={ammoN} onChange={(e) => setAmmoN(Number(e.target.value))} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Fusils</span>
          <input className="min-h-11 w-full rounded-md border border-line bg-bg px-2" type="number" min={1} value={rifleN} onChange={(e) => setRifleN(Number(e.target.value))} />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-md bg-brass px-3 text-sm text-ink" onClick={() => game.makeAmmo(ammoN)}>
          Couler les cartouches
        </button>
        <button type="button" className="min-h-11 rounded-md border border-brass px-3 text-sm text-brass" onClick={() => game.makeRifles(rifleN)}>
          Forger les fusils
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Acier du fusil {grams(report.rifleCost.steel)} · bois {grams(report.rifleCost.timber)}. {report.crewWhy}
      </p>
    </Panel>
  );
}

function Piece({ report, design }: { report: Report; design: Design }) {
  return (
    <Panel title="Fenêtre 1 — la pièce" aside={`${Math.round(report.weaponLengthMm)} mm · ${report.crew} servant${report.crew > 1 ? "s" : ""}`}>
      <Scale report={report} design={design} />
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Cartridge design={design} />
        <Magazine report={report} design={design} />
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <Stat k="Balle" v={grams(report.massG)} />
        <Stat k="Cartouche" v={grams(report.roundG)} />
        <Stat k="Bouche" v={`${Math.round(report.velocity)} m/s`} />
        <Stat k="Énergie" v={`${report.energyJ.toFixed(1)} J`} />
        <Stat k="Pression" v={report.pressureLabel} />
        <Stat k="Stabilité" v={report.stabilityLabel} />
        <Stat k="Recul" v={report.recoilLabel} />
        <Stat k="Arme" v={grams(report.weaponG)} />
        <Stat k="Section" v={report.sd.toFixed(3)} />
        <Stat k="Rechargement" v={`${report.reloadS.toFixed(1)} s`} />
        <Stat k="Dans l’arme" v={`${report.magazine} · ${LABELS.feed[report.feed]}`} />
        <Stat k="Appui" v={LABELS.mount[report.mount]} />
        <Stat k="Servants" v={report.crewRoles.join(", ")} />
      </ul>
      <ul className="mt-3 space-y-1 text-sm text-brass">
        {report.goods.slice(0, 4).map((g) => (
          <li key={g}>+ {g}</li>
        ))}
      </ul>
      <ul className="mt-2 space-y-1 text-sm text-oxide">
        {report.bads.slice(0, 5).map((g) => (
          <li key={g}>– {g}</li>
        ))}
      </ul>
    </Panel>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <li className="rounded-md bg-bg px-2 py-1">
      <span className="block text-xs text-muted">{k}</span>
      <span>{v}</span>
    </li>
  );
}

function Scale({ report, design }: { report: Report; design: Design }) {
  const parts = weaponParts(design);
  const L = parts.total;
  const bracket = 12.5;
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-end gap-4">
        <div className="relative h-80 w-36 shrink-0">
          <img src="/plates/meumeu.jpg" alt="Meumeu, bovin de peluche, 30 cm" className="h-full w-full bg-paper object-contain" />
          <span className="absolute bottom-[16%] left-1 top-[14%] w-0.5 bg-brass" />
          <span className="absolute bottom-[12%] left-3 text-xs text-brass">300 mm</span>
        </div>
        <svg
          viewBox={`0 0 ${L} 300`}
          className="shrink-0 text-brass"
          style={{ height: `${bracket}rem`, width: `${(L / 300) * bracket}rem` }}
          role="img"
          aria-label={`Arme de ${Math.round(L)} millimètres à côté d’un Meumeu de 300`}
        >
          <rect x="0" y="108" width={parts.stock} height="46" className="fill-raised stroke-brass" strokeWidth="1.4" />
          <rect x={parts.stock} y="102" width={parts.receiver} height="54" className="fill-surface stroke-brass" strokeWidth="1.4" />
          {design.action === "bolt" && <rect x={parts.stock + 8} y="96" width="10" height="8" className="fill-brass" />}
          {design.action === "lever" && <path d={`M ${parts.stock + 12} 156 q 8 16 18 0`} className="fill-none stroke-brass" strokeWidth="1.6" />}
          {design.action === "straight" && <rect x={parts.stock + parts.receiver - 6} y="118" width="8" height="16" className="fill-brass" />}
          {design.sight === "optic" && <rect x={parts.stock + 4} y="86" width={parts.receiver + 10} height="12" rx="3" className="fill-bg stroke-brass" strokeWidth="1.2" />}
          {design.sight === "aperture" && <circle cx={parts.stock + 8} cy="118" r="4" className="fill-none stroke-brass" strokeWidth="1.3" />}
          {design.feed === "box" && <rect x={parts.stock + 10} y="154" width="14" height={18 + design.magazine * 0.6} className="fill-brass" />}
          {design.feed === "clip" && <rect x={parts.stock + 12} y="90" width="6" height="14" className="fill-oxide" />}
          {design.feed === "tube" && <rect x={parts.stock + parts.receiver} y="148" width={parts.barrel * 0.7} height="5" className="fill-brass" />}
          {design.feed === "belt" && (
            <path
              d={`M ${parts.stock + 16} 150 C ${parts.stock - 10} 190, ${parts.stock - 30} 120, ${parts.stock - 4} 210`}
              className="fill-none stroke-oxide"
              strokeWidth="2"
            />
          )}
          <rect x={parts.stock + parts.receiver} y="122" width={parts.feedExtra + parts.barrel} height={4 + design.diameter * 1.3} className="fill-brass" />
          {design.sight === "iron" && <rect x={L - 3} y="112" width="2" height="12" className="fill-fg" />}
          {parts.muzzle > 0 && <rect x={L - parts.muzzle} y="116" width={parts.muzzle} height={10 + design.diameter * 0.6} className="fill-fg" />}
          {design.foregrip === "poignee" && <rect x={parts.stock + parts.receiver + 6} y="148" width="5" height="18" className="fill-brass" />}
          {report.mount !== "epaule" && (
            <path
              d={`M ${parts.stock + parts.receiver + 8} 156 l -14 48 m 14 -48 l 16 48 ${report.mount === "trepied" ? "m -16 -48 l 2 52" : ""}`}
              className="fill-none stroke-brass"
              strokeWidth="1.6"
            />
          )}
          <text x="0" y="250" className="fill-muted" fontSize="14">
            {Math.round(L)} mm · {(L / 300).toFixed(2)} corps
          </text>
        </svg>
      </div>
      <Formation report={report} design={design} />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        {report.crewRoles.map((role, i) => (
          <figure key={role} className="w-16">
            <img src={i === 0 ? "/plates/meumeu.jpg" : "/plates/be.jpg"} alt="" className="h-16 w-full bg-paper object-contain" />
            <figcaption className="text-center text-xs text-brass">{role}</figcaption>
          </figure>
        ))}
        <p className="max-w-sm pb-1 text-xs text-muted">{report.crewWhy}{report.mountForced ? " L’appui demandé ne tenait pas : il a été relevé." : ""}</p>
      </div>
    </div>
  );
}

function Cartridge({ design }: { design: Design }) {
  const n = design;
  const ppm = 8;
  const caseL = n.caseLength * ppm;
  const caseD = Math.max(8, n.caseDiameter * ppm);
  const bullL = n.bulletLength * ppm;
  const bullD = Math.max(4, n.diameter * ppm);
  const seat = Math.min(caseL * 0.42, bullL * 0.5);
  const x0 = 16;
  const y = 48;
  const nose = n.effect === "shot" ? "round" : n.nose;
  const tip = x0 + caseL - seat + bullL;
  const neck = x0 + caseL - seat;
  const top = y - bullD / 2;
  const bot = y + bullD / 2;
  let bullet = "";
  if (nose === "spitzer" || nose === "soft") bullet = `M ${neck} ${top} L ${tip} ${y} L ${neck} ${bot} Z`;
  else if (nose === "hollow") bullet = `M ${neck} ${top} L ${tip - bullD * 0.35} ${top} L ${tip - bullD * 0.7} ${y} L ${tip - bullD * 0.35} ${bot} L ${neck} ${bot} Z`;
  else if (nose === "flat") bullet = `M ${neck} ${top} L ${tip} ${top} L ${tip} ${bot} L ${neck} ${bot} Z`;
  else bullet = `M ${neck} ${top} Q ${tip + bullD * 0.2} ${y} ${neck} ${bot} Z`;
  const powderH = (caseD - 4) * Math.min(1, n.powderFill);
  return (
    <div>
      <p className="mb-1 text-xs text-muted">Coupe de la cartouche · artère {BODY.arteryMm} mm, fémur {BODY.femurMm} mm</p>
      <svg viewBox="0 0 220 96" className="h-28 w-full">
        <rect x={x0} y={y - caseD / 2} width={caseL} height={caseD} className={n.caseMat === "paper" ? "fill-raised" : n.caseMat === "steel" ? "fill-fg" : "fill-brass"} />
        <rect x={x0 + 3} y={y + caseD / 2 - 2 - powderH} width={Math.max(2, caseL - seat - 4)} height={powderH} className="fill-oxide" opacity="0.85" />
        <path d={bullet} className={n.core === "tungsten" ? "fill-paper" : n.core === "steel" ? "fill-fg" : n.core === "frangible" ? "fill-line" : "fill-muted"} />
        {n.jacket !== "none" && n.effect !== "shot" && (
          <path d={bullet} className="fill-none stroke-brass" strokeWidth={Math.max(0.6, n.jacketMm * ppm * 0.45)} />
        )}
        {n.filler !== "none" && n.effect !== "shot" && (
          <ellipse cx={neck + bullL * 0.45} cy={y} rx={bullD * 0.18 * (0.4 + n.cavity)} ry={bullD * 0.22 * (0.4 + n.cavity)} className={n.filler === "burst" ? "fill-oxide" : "fill-bg"} />
        )}
        {n.effect === "shot" &&
          Array.from({ length: Math.min(n.pellets, 8) }, (_, i) => (
            <circle key={i} cx={neck + 6 + (i % 4) * (bullD * 0.28)} cy={y - bullD * 0.2 + Math.floor(i / 4) * bullD * 0.35} r={Math.max(1.2, bullD / 7)} className="fill-muted" />
          ))}
        <line x1="8" y1="84" x2={8 + BODY.arteryMm * ppm} y2="84" className="stroke-oxide" strokeWidth="2" />
        <line x1="40" y1="84" x2={40 + BODY.femurMm * ppm} y2="84" className="stroke-brass" strokeWidth="2" />
        <text x="8" y="78" className="fill-muted" fontSize="8">
          artère
        </text>
        <text x="40" y="78" className="fill-muted" fontSize="8">
          fémur
        </text>
      </svg>
      <p className="text-xs text-muted">
        {LABELS.caseMat[n.caseMat]} · {LABELS.core[n.core]} · {LABELS.jacket[n.jacket]}
        {n.filler === "burst" ? " · petite charge dans la pointe" : n.filler === "void" ? " · cavité vide" : " · pleine"}
        {n.effect === "shot" ? ` · ${n.pellets} grains` : ""}
      </p>
    </div>
  );
}

function Magazine({ report, design }: { report: Report; design: Design }) {
  const cap = design.feed === "single" ? 1 : design.magazine;
  const [loaded, setLoaded] = useState(cap);
  const [phase, setPhase] = useState<"pret" | "feu" | "recharge">("pret");
  const [stepI, setStepI] = useState(0);
  const steps = reloadSteps(design, report.crew);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearInterval(timer.current);
    setLoaded(cap);
    setPhase("pret");
    setStepI(0);
  }, [cap, design.feed, design.action]);

  useEffect(
    () => () => {
      if (timer.current) window.clearInterval(timer.current);
    },
    [],
  );

  function shoot() {
    if (phase === "recharge" || loaded <= 0) return;
    setLoaded((n) => Math.max(0, n - 1));
    setPhase("feu");
    window.setTimeout(() => setPhase((p) => (p === "feu" ? "pret" : p)), 160);
  }

  function reload() {
    if (phase === "recharge") return;
    if (timer.current) window.clearInterval(timer.current);
    setPhase("recharge");
    setLoaded(0);
    setStepI(0);
    let i = 0;
    const gap = Math.max(260, (report.reloadS * 1000) / Math.max(1, steps.length));
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
  return (
    <div>
      <p className="mb-1 text-xs text-muted">
        {LABELS.feed[design.feed]} · {report.reloadS.toFixed(1)} s pour remplir · {phase === "recharge" ? steps[Math.min(stepI, steps.length - 1)] : phase === "feu" ? "Départ" : loaded === 0 ? "Vide" : "Prête"}
      </p>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: cap }, (_, i) => (
          <span key={i} className={`h-8 w-3 rounded-sm ${i < loaded ? "bg-brass" : "bg-bg"}`} />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Au rechargement, c’est le {(report.crewRoles[actor] ?? "pointeur").toLowerCase()} qui travaille{report.crew === 1 && design.feed === "belt" ? " — et il est seul, la bande se tord" : ""}.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-md bg-brass px-3 text-sm text-ink disabled:opacity-40" disabled={loaded <= 0 || phase === "recharge"} onClick={shoot}>
          Tirer un coup
        </button>
        <button type="button" className="min-h-11 rounded-md border border-brass px-3 text-sm text-brass disabled:opacity-40" disabled={phase === "recharge" || loaded === cap} onClick={reload}>
          Recharger
        </button>
      </div>
      {phase === "recharge" && (
        <ol className="mt-2 space-y-1 text-sm">
          {steps.map((s, i) => (
            <li key={s} className={i < stepI ? "text-brass" : i === stepI ? "text-fg" : "text-muted"}>
              {i < stepI ? "Fait" : i === stepI ? "En cours" : "Ensuite"} — {s}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Flight({ report, zero, wind, setWind }: { report: Report; zero: number; wind: number; setWind: (n: number) => void }) {
  const chart = report.samples.map((s) => ({ ...s, chute: Math.round(s.drop * 1000) / 10 }));
  const [play, setPlay] = useState(false);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!play) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setT((v) => (v + dt * 0.15) % 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [play]);
  return (
    <Panel title="Fenêtre 2 — la trajectoire" aside={report.transonicM !== null ? `transsonique vers ${report.transonicM} m` : `zéro ${zero} m`}>
      <Arc report={report} zero={zero} t={t} />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-md bg-brass px-3 text-sm text-ink" onClick={() => setPlay((p) => !p)}>
          {play ? "Pause du vol" : "Ralenti du vol"}
        </button>
      </div>
      <Slider label="Vent de travers" value={wind} min={0} max={8} step={0.1} unit="m/s" onChange={setWind} />
      <p className="mt-1 text-xs text-muted">
        Portée utile {report.usefulM} m · hausse {report.zeroAngleDeg.toFixed(2)}° · {report.pelletN > 1 ? `${report.pelletN} grains de ${report.pelletMm.toFixed(2)} mm, l’énergie est celle du nuage` : "un seul projectile"}
      </p>
      <div className="mt-2 h-52 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart}>
            <CartesianGrid stroke="var(--color-line)" />
            <XAxis dataKey="range" stroke="var(--color-muted)" unit=" m" />
            <YAxis yAxisId="v" stroke="var(--color-brass)" />
            <YAxis yAxisId="e" orientation="right" stroke="var(--color-oxide)" />
            <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-line)" }} />
            <Line yAxisId="v" type="monotone" dataKey="velocity" name="vitesse m/s" stroke="var(--color-brass)" dot={false} />
            <Line yAxisId="e" type="monotone" dataKey="energy" name="énergie J" stroke="var(--color-oxide)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th>m</th>
              <th>m/s</th>
              <th>J</th>
              <th>chute</th>
              <th>dérive</th>
              <th>s</th>
            </tr>
          </thead>
          <tbody>
            {report.samples
              .filter((_, i) => i % 2 === 0)
              .map((s) => (
                <tr key={s.range} className="border-t border-line">
                  <td>{s.range}</td>
                  <td>{s.velocity}</td>
                  <td>{s.energy.toFixed(1)}</td>
                  <td>{(s.drop * 100).toFixed(1)} cm</td>
                  <td>{(s.drift * 100).toFixed(1)} cm</td>
                  <td>{s.tof.toFixed(2)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Arc({ report, zero, t }: { report: Report; zero: number; t: number }) {
  const w = 640;
  const h = 168;
  const last = report.samples[report.samples.length - 1]?.range ?? 40;
  const maxR = Math.max(36, zero, Math.min(60, last));
  const xOf = (m: number) => 32 + (Math.min(maxR, m) / maxR) * (w - 48);
  const yOf = (dropM: number) => 46 - dropM * 100 * 2.1;
  const pts = report.samples
    .filter((s) => s.range <= maxR)
    .map((s) => `${xOf(s.range)},${yOf(s.drop)}`)
    .join(" ");
  const drift = report.samples
    .filter((s) => s.range <= maxR)
    .map((s) => `${xOf(s.range)},${132 - s.drift * 100 * 1.4}`)
    .join(" ");
  const zx = xOf(Math.min(zero, maxR));
  const body = 30 * 2.1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
      <line x1="32" y1="46" x2={w - 12} y2="46" className="stroke-line" strokeWidth="1" />
      <polyline points={pts} fill="none" className="trace stroke-brass" strokeWidth="1.8" />
      <line x1={zx} y1={46 - body * 0.72} x2={zx} y2={46 + body * 0.28} className="stroke-oxide" strokeWidth="3" />
      <text x={zx + 6} y={46 + body * 0.28} className="fill-oxide" fontSize="11">
        Meumeu 30 cm au zéro
      </text>
      {report.transonicM !== null && report.transonicM <= maxR && (
        <line x1={xOf(report.transonicM)} y1="18" x2={xOf(report.transonicM)} y2="100" className="stroke-muted" strokeDasharray="3 3" />
      )}
      <text x="32" y="16" className="fill-muted" fontSize="11">
        ligne de mire · chute réelle · 0 à {Math.round(maxR)} m
      </text>
      <line x1="32" y1="132" x2={w - 12} y2="132" className="stroke-line" strokeWidth="1" />
      <polyline points={drift} fill="none" className="stroke-fg" strokeWidth="1.2" />
      {t > 0 && (
        <circle cx={xOf(t * maxR)} cy={yOf(sampleAt(report, t * maxR).drop)} r="3.2" className="fill-paper" />
      )}
      <text x="32" y="124" className="fill-muted" fontSize="11">
        vue dessus · dérive au vent
      </text>
    </svg>
  );
}

function Body({ design, wind, zero }: { design: Design; wind: number; zero: number }) {
  const zone = useGame((s) => s.zone);
  const setZone = useGame((s) => s.setZone);
  const [range, setRange] = useState(zero);
  const [tilt, setTilt] = useState(0);
  const [armor, setArmor] = useState<Armor>("none");
  useEffect(() => {
    setRange(zero);
  }, [zero]);
  const report = useMemo(() => evaluate(design, wind), [design, wind]);
  const at = sampleAt(report, range);
  const wound = useMemo(() => terminal(design, at.velocity || report.velocity, zone, tilt, armor), [design, at.velocity, report.velocity, zone, tilt, armor]);
  const spot = HOTSPOTS.find((h) => h.zone === zone) ?? HOTSPOTS[0];
  const cx = spot.x + spot.w / 2;
  const cy = spot.y + spot.h / 2;

  return (
    <Panel title="Fenêtre 3 — dans le corps" aside={LABELS.hors[wound.hors]}>
      <p className="mb-2 text-sm text-muted">
        À {range} m il reste {Math.round(at.velocity)} m/s et {at.energy.toFixed(1)} J. Bouche : {Math.round(report.velocity)} m/s. La protection ne couvre que le thorax.
      </p>
      <Chips<Armor> label="Protection" value={armor} options={LABELS.armor} onPick={setArmor} />
      <Cinema design={design} zone={zone} range={range} tilt={tilt} armor={armor} velocity={at.velocity} report={report} />
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <div className="relative mx-auto aspect-[2/3] w-full max-w-sm overflow-hidden rounded-md bg-bg">
            <img src="/plates/radiograph.jpg" alt="Radiographie d’un Meumeu de 30 cm" className="h-full w-full object-contain" />
            {HOTSPOTS.map((h, i) => (
              <button
                key={`${h.zone}-${i}`}
                type="button"
                aria-label={ZONE_META[h.zone].label}
                onClick={() => setZone(h.zone)}
                className={`absolute rounded-sm border ${zone === h.zone ? "border-brass bg-brass/30" : "border-transparent"}`}
                style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
              />
            ))}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              <circle cx={cx} cy={cy} r={Math.max(0.7, wound.permMm * 0.28)} className="fill-brass" opacity="0.85" />
              {wound.blastCm > 0 && (
                <circle cx={cx} cy={cy} r={Math.max(1.4, wound.blastCm * 3.1)} className="fill-none stroke-oxide" strokeWidth="0.45" />
              )}
              {wound.frags.map((f) => {
                const rad = (f.ang * Math.PI) / 180;
                const x2 = cx + Math.sin(rad) * f.cm * 6.5;
                const y2 = cy + Math.cos(rad) * f.cm * 2.4;
                return <line key={f.n} x1={cx} y1={cy} x2={x2} y2={y2} className="trace stroke-oxide" strokeWidth="0.45" />;
              })}
              {wound.exit && <circle cx={cx + 1.2} cy={cy + 1.4} r="0.9" className="fill-none stroke-brass" strokeWidth="0.35" />}
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(Object.keys(ZONE_META) as ZoneId[]).map((id) => (
              <button key={id} type="button" onClick={() => setZone(id)} className={`min-h-11 rounded-md px-2 text-sm ${zone === id ? "bg-brass text-ink" : "bg-bg text-fg"}`}>
                {ZONE_META[id].label.split(" / ")[0]}
              </button>
            ))}
          </div>
        </div>
        <Cut wound={wound} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Slider label="Distance du coup" value={range} min={2} max={36} step={1} unit="m" onChange={setRange} />
        <Slider label="Obliquité" value={tilt} min={0} max={55} step={1} unit="°" onChange={setTilt} />
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat k="Pénétration" v={`${wound.penCm.toFixed(1)} cm`} />
        <Stat k="Chemin" v={`${wound.stopCm.toFixed(1)} / ${wound.pathCm.toFixed(1)} cm`} />
        <Stat k="Éclats" v={String(wound.fragCount)} />
        <Stat k="Souffle" v={wound.blastCm > 0 ? `${wound.blastCm.toFixed(1)} cm` : "aucun"} />
        <Stat k="Cavité passagère" v={`${wound.tempCm.toFixed(2)} cm`} />
        <Stat k="Canal" v={`${wound.permMm.toFixed(2)} mm`} />
        <Stat k="Sortie" v={wound.exit ? "oui" : "non"} />
        <Stat k="Saignement" v={`${wound.bleed.toFixed(1)} ml/min`} />
      </ul>
      <p className="mt-2 text-sm">
        Organes touchés : {wound.organs.length ? wound.organs.join(", ") : "aucun"}.
        {wound.seconds ? ` Vidange utile ~${Math.round(wound.seconds)} s.` : " Pas de vaisseau ouvert."}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        {wound.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {wound.frags.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th>#</th>
                <th>angle</th>
                <th>course</th>
                <th>masse</th>
                <th>arrêt</th>
                <th>vers</th>
              </tr>
            </thead>
            <tbody>
              {wound.frags.slice(0, 8).map((f) => (
                <tr key={f.n} className="border-t border-line">
                  <td>{f.n}</td>
                  <td>{f.ang}°</td>
                  <td>{f.cm.toFixed(2)} cm</td>
                  <td>{f.mg.toFixed(1)} mg</td>
                  <td>{f.stop === "os" ? "os" : f.stop === "sortie" ? "sort" : "tissu"}</td>
                  <td>{f.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {wound.frags.length > 8 && <p className="mt-1 text-xs text-muted">et {wound.frags.length - 8} autres, même nuage.</p>}
        </div>
      )}
    </Panel>
  );
}

function Cut({ wound }: { wound: Wound }) {
  const scale = 300 / Math.max(wound.pathCm, 0.8);
  let x = 8;
  const nodes = wound.tissues.map((t) => {
    const width = Math.max(2, t.cm * scale);
    const node = { ...t, x, width };
    x += width;
    return node;
  });
  const stopX = 8 + wound.stopCm * scale;
  let spawnX = 8 + 12;
  for (const n of nodes) {
    if (["cerveau", "carotide", "poumon", "coeur", "aorte", "foie", "rate", "intestin", "moelle", "femoral", "mediastin"].includes(n.id)) {
      spawnX = n.x + Math.min(n.width * 0.35, 14);
      break;
    }
  }
  const y0 = 36;
  return (
    <div>
      <p className="mb-1 text-xs text-muted">Coupe en profondeur · 1 cm sur la règle · laiton = franchi, oxyde = arrêt</p>
      <svg viewBox="0 0 340 150" className="h-40 w-full">
        {nodes.map((n) => (
          <g key={n.id + n.x}>
            <rect
              x={n.x}
              y={y0}
              width={n.width}
              height="44"
              className={n.state === "arret" ? "fill-oxide" : n.state === "franchie" ? "fill-brass" : "fill-bg"}
              opacity={n.state === "intacte" ? 0.45 : 0.8}
              stroke="var(--color-line)"
              strokeWidth="0.6"
            />
            {n.width > 26 && (
              <text x={n.x + 2} y={y0 + 16} className="fill-paper" fontSize="8">
                {n.label}
              </text>
            )}
          </g>
        ))}
        <line x1="8" y1={y0 + 22} x2={stopX} y2={y0 + 22} className="trace stroke-ink" strokeWidth="1.4" />
        <ellipse
          cx={spawnX}
          cy={y0 + 22}
          rx={Math.max(3, wound.tempCm * scale * 0.45)}
          ry={Math.max(4, wound.tempCm * scale * 0.7)}
          className="fill-none stroke-oxide"
          strokeWidth="1"
        />
        {wound.blastCm > 0 && (
          <circle cx={spawnX} cy={y0 + 22} r={Math.max(4, wound.blastCm * scale)} className="fill-none stroke-oxide" strokeDasharray="2 2" />
        )}
        {wound.frags.map((f) => {
          const rad = (f.ang * Math.PI) / 180;
          const x2 = spawnX + Math.cos(rad) * f.cm * scale * 0.85;
          const y2 = y0 + 22 + Math.sin(rad) * f.cm * scale * 0.55;
          return <line key={f.n} x1={spawnX} y1={y0 + 22} x2={x2} y2={y2} className="trace stroke-oxide" strokeWidth="0.8" />;
        })}
        <line x1="8" y1="128" x2={8 + scale} y2="128" className="stroke-brass" strokeWidth="2" />
        <text x="8" y="122" className="fill-muted" fontSize="9">
          1 cm
        </text>
        {wound.exit && (
          <text x={Math.min(250, stopX)} y="18" className="fill-brass" fontSize="10">
            sortie
          </text>
        )}
      </svg>
      <ul className="mt-1 space-y-0.5 text-xs text-muted">
        {wound.tissues.map((t) => (
          <li key={t.id}>
            {t.label} · {t.cm.toFixed(2)} cm · {t.state === "franchie" ? "franchie" : t.state === "arret" ? "arrêt" : "intacte"}
          </li>
        ))}
      </ul>
    </div>
  );
}
