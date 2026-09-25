import { useEffect, useState, type ReactNode } from "react";
import { Boxes, Crosshair, Landmark, Swords } from "lucide-react";
import { Atelier } from "@/components/game/atelier";
import {
  MOUTHS,
  RATION_G,
  SMITHS,
  SQUAD,
  WAGON,
  cargoGrams,
  readiness,
  road,
  useGame,
  wagonsUsed,
} from "@/game/store";
import type { Aim } from "@/game/store";
import type { CargoKind, DepotId } from "@/game/types";

type Tab = "fret" | "armes" | "qg" | "choc";

const TABS: { id: Tab; label: string; icon: typeof Boxes }[] = [
  { id: "fret", label: "Fret", icon: Boxes },
  { id: "armes", label: "Armurerie", icon: Crosshair },
  { id: "qg", label: "Quartier", icon: Landmark },
  { id: "choc", label: "Escarmouche", icon: Swords },
];

const CARGO: { id: CargoKind; label: string }[] = [
  { id: "grain", label: "Grain (g)" },
  { id: "brass", label: "Laiton (g)" },
  { id: "propellant", label: "Poudre (g)" },
  { id: "lead", label: "Plomb (g)" },
  { id: "steel", label: "Acier (g)" },
  { id: "tungsten", label: "Dense (g)" },
  { id: "timber", label: "Bois (g)" },
  { id: "medical", label: "Caisses médicales" },
  { id: "cartridges", label: "Cartouches" },
  { id: "rifles", label: "Fusils" },
];

function grams(n: number) {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1000) return `${(n / 1000).toFixed(a >= 10000 ? 1 : 2)} kg`;
  if (a >= 100) return `${Math.round(n)} g`;
  if (a >= 10) return `${n.toFixed(1)} g`;
  return `${n.toFixed(2)} g`;
}

export function GameApp() {
  const game = useGame();
  const [tab, setTab] = useState<Tab>("armes");
  useEffect(() => {
    void useGame.persist.rehydrate();
  }, []);
  const gate = readiness(game);
  const free = game.wagons - wagonsUsed(game.convoys);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-3 py-3">
          <img src="/plates/meumeu.jpg" alt="Meumeu, bovin de peluche" className="h-14 w-11 rounded-sm bg-paper object-contain" />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg leading-none text-brass">MEUMEU</p>
            <p className="text-sm text-muted">Fret & Feu · bovins de peluche, 30 cm · contre les Bê, chèvres</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-serif text-fg">Jour {game.day}</p>
            <p className="text-muted">{free} fourgon{free > 1 ? "s" : ""} libre{free > 1 ? "s" : ""} · {game.labor} forges</p>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-md bg-brass px-3 text-sm font-medium text-ink disabled:opacity-40"
            onClick={() => game.advanceDay()}
            disabled={!!game.battle && !game.battle.resolved}
          >
            Clore la journée
          </button>
        </div>
        {game.notice && <p className="mx-auto max-w-6xl px-3 pb-3 text-sm text-paper">{game.notice}</p>}
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4 pb-24">
        {tab === "fret" && <Freight />}
        {tab === "armes" && <Atelier />}
        {tab === "qg" && <Quarter gate={gate} />}
        {tab === "choc" && <Skirmish gate={gate} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl grid-cols-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${on ? "text-brass" : "text-muted"}`}>
                <Icon size={18} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Card({ title, children, aside }: { title: string; children: ReactNode; aside?: string }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-base text-brass">{title}</h2>
        {aside && <p className="text-xs text-muted">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function Freight() {
  const game = useGame();
  const [from, setFrom] = useState<DepotId>("mines");
  const [to, setTo] = useState<DepotId>("arsenal");
  const [cargo, setCargo] = useState<CargoKind>("grain");
  const [amount, setAmount] = useState(1500);
  const [lotId, setLotId] = useState("");
  const src = game.depots[from];
  const lots = cargo === "cartridges" ? src.cartridges : cargo === "rifles" ? src.rifles : [];
  const lot = lots.find((l) => l.id === lotId) ?? lots[0];
  const link = road(from, to);
  const loadG = cargoGrams(cargo, amount, lot?.design);
  const nodes: { id: DepotId; x: number }[] = [
    { id: "mines", x: 12 },
    { id: "arsenal", x: 50 },
    { id: "front", x: 88 },
  ];

  return (
    <div className="grid gap-3">
      <Card title="La carte tient dans une journée de pattes" aside="fourgon 1,5 kg · corps 30 cm">
        <svg viewBox="0 0 100 36" className="h-28 w-full">
          <line x1="12" y1="18" x2="88" y2="18" className="stroke-line" strokeWidth="1" />
          {nodes.map((n) => (
            <g key={n.id}>
              <circle cx={n.x} cy="18" r="3.2" className="fill-brass" />
              <text x={n.x} y="10" textAnchor="middle" className="fill-fg" fontSize="3.2">
                {game.depots[n.id].name}
              </text>
            </g>
          ))}
          {game.convoys.map((c) => {
            const ax = nodes.find((n) => n.id === c.from)?.x ?? 0;
            const bx = nodes.find((n) => n.id === c.to)?.x ?? 0;
            const u = 1 - c.daysLeft / c.daysTotal;
            const x = ax + (bx - ax) * Math.min(0.92, Math.max(0.08, u));
            return <circle key={c.id} cx={x} cy="18" r="1.6" className="fill-oxide" />;
          })}
        </svg>
        <p className="text-sm text-muted">
          Puits → Cale 2,2 km, 1 jour. Cale → Seuil 5,4 km, 2 jours. La diagonale Puits → Seuil prend 4 jours et ne forge rien.
          {MOUTHS.mines + MOUTHS.arsenal} bouches mangent {RATION_G} g chacune, chaque jour, là où elles vivent.
        </p>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        {(Object.keys(game.depots) as DepotId[]).map((id) => {
          const d = game.depots[id];
          return (
            <Card key={id} title={d.name}>
              <ul className="grid grid-cols-2 gap-x-3 text-sm">
                <Stock k="Grain" v={grams(d.stock.grain)} />
                <Stock k="Laiton" v={grams(d.stock.brass)} />
                <Stock k="Poudre" v={grams(d.stock.propellant)} />
                <Stock k="Plomb" v={grams(d.stock.lead)} />
                <Stock k="Acier" v={grams(d.stock.steel)} />
                <Stock k="Dense" v={grams(d.stock.tungsten)} />
                <Stock k="Bois" v={grams(d.stock.timber)} />
                <Stock k="Caisses" v={String(d.stock.medical)} />
              </ul>
              {d.cartridges.map((l) => (
                <p key={l.id} className="mt-1 text-sm text-paper">{l.qty} cart. {l.name}</p>
              ))}
              {d.rifles.map((l) => (
                <p key={l.id} className="text-sm text-paper">{l.qty} fusils {l.name}</p>
              ))}
              {d.cartridges.length + d.rifles.length === 0 && <p className="mt-2 text-xs text-muted">Pas d’armes en caisse.</p>}
            </Card>
          );
        })}
      </div>

      <Card title="Charger un fourgon" aside={link ? `${link.km} km · ${link.days} j · ${Math.round(loadG)} g` : "même dépôt"}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Départ">
            <Select value={from} onChange={(v) => setFrom(v as DepotId)} options={(["mines", "arsenal", "front"] as DepotId[]).map((id) => ({ id, label: game.depots[id].name }))} />
          </Field>
          <Field label="Arrivée">
            <Select value={to} onChange={(v) => setTo(v as DepotId)} options={(["mines", "arsenal", "front"] as DepotId[]).map((id) => ({ id, label: game.depots[id].name }))} />
          </Field>
          <Field label="Charge">
            <Select value={cargo} onChange={(v) => setCargo(v as CargoKind)} options={CARGO} />
          </Field>
          <Field label="Quantité">
            <input className="min-h-11 w-full rounded-md border border-line bg-bg px-2 text-fg" type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </Field>
          {lots.length > 0 && (
            <Field label="Lot">
              <Select value={lot?.id ?? ""} onChange={setLotId} options={lots.map((l) => ({ id: l.id, label: `${l.name} · ${l.qty}` }))} />
            </Field>
          )}
        </div>
        <button type="button" className="mt-3 min-h-11 rounded-md bg-brass px-4 text-sm font-medium text-ink" onClick={() => game.dispatch(from, to, cargo, amount, lot?.id)}>
          Faire partir le fourgon
        </button>
        {game.convoys.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {game.convoys.map((c) => (
              <li key={c.id}>{game.depots[c.from].name} → {game.depots[c.to].name} · {c.cargo} × {Math.round(c.amount)} · {c.daysLeft} j · {c.wagons} fourgon{c.wagons > 1 ? "s" : ""}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stock({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex justify-between gap-2 border-b border-line/60 py-1">
      <span className="text-muted">{k}</span>
      <span>{v}</span>
    </li>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <select className="min-h-11 w-full rounded-md border border-line bg-bg px-2 text-fg" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}


function Quarter({ gate }: { gate: ReturnType<typeof readiness> }) {
  const game = useGame();
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card title="On n’est pas prêts" aside={gate.ok ? "le fossé peut s’ouvrir" : "la guerre reste close"}>
        <ul className="space-y-2 text-sm">
          {gate.checks.map((c) => (
            <li key={c.label} className="flex items-start justify-between gap-3">
              <span className={c.ok ? "text-brass" : "text-fg"}>{c.ok ? "Tenu" : "Manque"} — {c.label}</span>
              <span className="text-muted">{c.detail}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-md bg-brass px-3 text-sm text-ink" onClick={() => game.train()}>Instruire une compagnie ({SQUAD})</button>
          <button type="button" className="min-h-11 rounded-md border border-brass px-3 text-sm text-brass" onClick={() => game.distribute()}>Poches : cartouches du Seuil</button>
        </div>
        <p className="mt-2 text-xs text-muted">Les fusils doivent déjà être au Seuil. L’instruction dure deux jours. Une cartouche qui ne chambre pas reste en caisse.</p>
      </Card>
      <Card title="Compagnies" aside={`${SMITHS} forgerons repartent chaque aube`}>
        {game.companies.length === 0 && <p className="text-sm text-muted">Aucune. Trente Meumeu, un fusil chacun, quand le fret aura porté l’acier.</p>}
        <ul className="space-y-3">
          {game.companies.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Portrait src="/plates/meumeu.jpg" blood={c.blood} alt={c.name} />
              <div className="text-sm">
                <p className="font-serif text-brass">{c.name}</p>
                <p>{c.fit} debout · {c.wounded} blessés · {c.down} à terre</p>
                <p className="text-muted">{c.trainDays > 0 ? `Instruction, ${c.trainDays} j` : "Instruite"} · {c.ammo} coups {c.ammoDesign ? c.ammoDesign.diameter.toFixed(2) + " mm" : ""}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Registre">
        <ul className="space-y-1 text-sm">
          {game.log.map((l, i) => (
            <li key={`${l.day}-${i}`}><span className="text-muted">J{l.day}</span> {l.text}</li>
          ))}
        </ul>
        <button type="button" className="mt-3 min-h-11 text-sm text-oxide" onClick={() => game.reset()}>Recommencer la république</button>
      </Card>
      <Card title="Ce que pèse une journée">
        <p className="text-sm text-muted">
          Les puits donnent du grain, du métal, un peu de poudre, des miettes de noyau dense. La Cale ne crée des cartouches que si la matière est déjà dans ses murs. Le Seuil ne tire que ce qu’un fourgon a déposé. Une compagnie de {SQUAD} mange {SQUAD * RATION_G} g par jour, en plus des bouches civiles.
        </p>
      </Card>
    </div>
  );
}

function Portrait({ src, blood, alt }: { src: string; blood: number; alt: string }) {
  return (
    <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md bg-paper">
      <img src={src} alt={alt} className="h-full w-full object-contain" />
      {blood > 0.04 && <img src="/fx/blood-burst.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.25 + blood * 0.6 }} />}
    </div>
  );
}

const RANGES = [4, 8, 12, 18, 28];

function Skirmish({ gate }: { gate: ReturnType<typeof readiness> }) {
  const game = useGame();
  const b = game.battle;
  const [aim, setAim] = useState<Aim>("centre");
  return (
    <div className="grid gap-3">
      <Card title="Le fossé" aside="même peluche, 30 cm : bovin contre chèvre">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Portrait src="/plates/meumeu.jpg" blood={game.companies.some((c) => c.blood > 0) ? Math.max(...game.companies.map((c) => c.blood), 0) : 0} alt="Meumeu, bovin de peluche" />
            <p className="mt-1 text-center text-xs text-brass">Meumeu<br />bovin</p>
          </div>
          <p className="pb-8 text-sm text-muted">{b ? `${b.range} m` : "pas encore"}</p>
          <div>
            <Portrait src="/plates/be.jpg?v=chevre" blood={b?.enemyBlood ?? 0} alt="Bê, chèvre de peluche" />
            <p className="mt-1 text-center text-xs text-muted">Bê<br />chèvre</p>
          </div>
          {(b?.lastFx === "enemy" || b?.lastFx === "both") && <img src="/fx/muzzle.png" alt="" className="h-16 w-16 object-contain" />}
        </div>
        {!b && (
          <>
            <p className="mt-3 text-sm text-muted">Tant que le grain, les caisses et les poches ne tiennent pas, les Bê restent un bruit derrière le fossé.</p>
            <ul className="mt-2 space-y-1 text-sm">
              {gate.checks.map((c) => (
                <li key={c.label} className={c.ok ? "text-brass" : "text-fg"}>{c.ok ? "Tenu" : "Manque"} — {c.label} ({c.detail})</li>
              ))}
            </ul>
            <button type="button" disabled={!gate.ok} className="mt-3 min-h-11 rounded-md bg-oxide px-3 text-sm text-paper disabled:opacity-40" onClick={() => game.startBattle()}>
              Ouvrir le feu
            </button>
          </>
        )}
        {b && (
          <div className="mt-3">
            <p className="text-sm">{b.enemyFit} Bê debout sur {b.enemyMen} · {b.enemyAmmo} coups dans leurs poches</p>
            <p className="text-sm text-muted">Nos poches : {game.companies.reduce((a, c) => a + c.ammo, 0)} coups · {game.companies.reduce((a, c) => a + c.fit, 0)} Meumeu debout</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {RANGES.map((r) => (
                <button key={r} type="button" disabled={b.resolved} onClick={() => game.setRange(r)} className={`min-h-11 rounded-md px-3 text-sm ${b.range === r ? "bg-brass text-ink" : "bg-bg text-fg"}`}>{r} m</button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {([["centre", "Centre"], ["tete", "Tête"], ["jambe", "Jambes"]] as [Aim, string][]).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setAim(id)} className={`min-h-11 rounded-md px-3 text-sm ${aim === id ? "bg-brass text-ink" : "border border-line"}`}>{label}</button>
              ))}
            </div>
            {!b.resolved && (
              <button type="button" className="mt-3 min-h-11 rounded-md bg-oxide px-4 text-sm text-paper" onClick={() => game.fire(aim)}>
                Volée
              </button>
            )}
            {b.resolved && <p className="mt-3 font-serif text-brass">{b.outcome === "rout" ? "Les Bê cèdent." : b.outcome === "lost" ? "La ligne est tombée." : "Plus une cartouche. Le fret a tranché."}</p>}
          </div>
        )}
      </Card>
      {game.companies.filter((c) => c.trainDays <= 0).map((c) => (
        <Card key={c.id} title={c.name}>
          <div className="flex gap-3">
            <Portrait src="/plates/meumeu.jpg" blood={c.blood} alt="" />
            <p className="text-sm">{c.fit} debout, {c.wounded} blessés, {c.down} à terre, {c.ammo} coups. Un Meumeu trop atteint quitte la ligne dans la volée — ça dépend du calibre, de ce qu’il reste de vitesse, et de l’organe.</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
