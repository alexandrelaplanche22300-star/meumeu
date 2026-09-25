import { useEffect, useMemo, useRef, useState } from "react";
import { ARMOR_META, sampleAt, terminal, type Report, type Wound } from "@/game/ballistics";
import type { Armor, Design, ZoneId } from "@/game/types";

type Vec = { x: number; y: number; z: number };

const ORGANS: { zone: ZoneId; label: string; c: Vec; r: Vec; fill: string }[] = [
  { zone: "poumon", label: "Poumon", c: { x: -1.15, y: 0.45, z: 0.1 }, r: { x: 1.05, y: 1.3, z: 0.8 }, fill: "rgba(186,204,196,0.42)" },
  { zone: "poumon", label: "Poumon", c: { x: 1.15, y: 0.45, z: 0.1 }, r: { x: 1.05, y: 1.3, z: 0.8 }, fill: "rgba(186,204,196,0.42)" },
  { zone: "coeur", label: "Cœur", c: { x: -0.28, y: 0.15, z: 0.55 }, r: { x: 0.62, y: 0.72, z: 0.48 }, fill: "rgba(168,74,62,0.75)" },
  { zone: "aorte", label: "Aorte", c: { x: 0.18, y: 0.25, z: 0.2 }, r: { x: 0.22, y: 1.45, z: 0.22 }, fill: "rgba(156,58,50,0.92)" },
  { zone: "foie", label: "Foie", c: { x: -0.95, y: -1.15, z: 0.35 }, r: { x: 1.05, y: 0.7, z: 0.65 }, fill: "rgba(122,78,58,0.72)" },
  { zone: "rate", label: "Rate", c: { x: 1.15, y: -0.95, z: 0.25 }, r: { x: 0.42, y: 0.65, z: 0.38 }, fill: "rgba(110,62,78,0.75)" },
  { zone: "intestin", label: "Abdomen", c: { x: 0.05, y: -1.85, z: 0.25 }, r: { x: 1.25, y: 0.62, z: 0.75 }, fill: "rgba(168,140,110,0.4)" },
  { zone: "colonne", label: "Colonne", c: { x: 0, y: -0.15, z: -0.9 }, r: { x: 0.36, y: 2.5, z: 0.36 }, fill: "rgba(214,206,186,0.88)" },
  { zone: "crane", label: "Crâne", c: { x: 0, y: 3.15, z: 0.1 }, r: { x: 0.85, y: 0.7, z: 0.75 }, fill: "rgba(214,206,186,0.55)" },
  { zone: "cou", label: "Cou", c: { x: 0, y: 2.15, z: 0.15 }, r: { x: 0.42, y: 0.45, z: 0.4 }, fill: "rgba(196,160,140,0.45)" },
  { zone: "femoral", label: "Fémur", c: { x: -0.55, y: -3.3, z: 0.1 }, r: { x: 0.28, y: 1.1, z: 0.28 }, fill: "rgba(214,206,186,0.8)" },
  { zone: "femoral", label: "Fémur", c: { x: 0.55, y: -3.3, z: 0.1 }, r: { x: 0.28, y: 1.1, z: 0.28 }, fill: "rgba(214,206,186,0.8)" },
];

function project(p: Vec, yaw: number, cx: number, cy: number, scale: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const xr = p.x * c - p.z * s;
  const zr = p.x * s + p.z * c;
  const k = 2.4 / (3.1 + zr);
  return { x: cx + xr * scale * k, y: cy - p.y * scale * k, z: zr, k };
}

function aimPoint(zone: ZoneId): Vec {
  const hit = ORGANS.find((o) => o.zone === zone);
  if (!hit) return { x: 0, y: 0.2, z: 0.5 };
  return { x: hit.c.x * 0.45, y: hit.c.y, z: hit.c.z };
}

export function Cinema({
  design,
  zone,
  range,
  tilt,
  armor,
  velocity,
  report,
}: {
  design: Design;
  zone: ZoneId;
  range: number;
  tilt: number;
  armor: Armor;
  velocity: number;
  report: Report;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bloodRef = useRef<HTMLImageElement | null>(null);
  const sprayRef = useRef<HTMLImageElement | null>(null);
  const [play, setPlay] = useState(true);
  const [scrub, setScrub] = useState(0);
  const wound: Wound = useMemo(
    () => terminal(design, velocity || report.velocity, zone, tilt, armor),
    [design, velocity, report.velocity, zone, tilt, armor],
  );

  useEffect(() => {
    const a = new Image();
    a.src = "/fx/blood-burst.png";
    bloodRef.current = a;
    const b = new Image();
    b.src = "/fx/blood-spray.png";
    sprayRef.current = b;
  }, []);

  useEffect(() => {
    setScrub(0);
  }, [design, zone, range, armor, tilt]);

  useEffect(() => {
    if (!play) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setScrub((t) => {
        const n = t + dt * 0.18;
        return n > 1.2 ? 0 : n;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [play]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1a1712");
    g.addColorStop(1, "#100e0c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const yaw = -0.45 + scrub * 0.9;
    const cx = w * 0.5;
    const cy = h * 0.52;
    const scale = 34;
    const skin = project({ x: 0, y: -0.2, z: 0 }, yaw, cx, cy, scale);
    ctx.beginPath();
    ctx.ellipse(skin.x, skin.y, 92, 168, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(231,220,198,0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(198,161,90,0.4)";
    ctx.stroke();

    if (armor !== "none") {
      const plate = project({ x: 0, y: 0.05, z: 1.25 }, yaw, cx, cy, scale);
      ctx.beginPath();
      ctx.ellipse(plate.x, plate.y, 70, 78, yaw * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = armor === "plaque" || armor === "ceramique" ? "rgba(198,161,90,0.3)" : "rgba(154,146,127,0.24)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#c6a15a";
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    const drawn = ORGANS.map((o) => ({ o, p: project(o.c, yaw, cx, cy, scale) })).sort((a, b) => a.p.z - b.p.z);
    for (const { o, p } of drawn) {
      const named = wound.organs.some((n) => n.toLowerCase().includes(o.label.toLowerCase().slice(0, 4)));
      const hot = named || (o.zone === zone && (wound.reached || wound.armorStop));
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, Math.max(4, o.r.x * scale * p.k), Math.max(4, o.r.y * scale * p.k), 0, 0, Math.PI * 2);
      ctx.fillStyle = hot && !wound.armorStop ? "rgba(156,58,50,0.62)" : o.fill;
      ctx.fill();
      ctx.strokeStyle = hot ? "#e7dcc6" : "rgba(231,220,198,0.28)";
      ctx.stroke();
    }

    ctx.beginPath();
    const artery: Vec[] = [
      { x: 0.05, y: 2.3, z: 0.25 },
      { x: 0.12, y: 0.3, z: 0.2 },
      { x: -0.15, y: -0.4, z: 0.35 },
      { x: -0.55, y: -3.1, z: 0.2 },
    ];
    artery.forEach((pt, i) => {
      const p = project(pt, yaw, cx, cy, scale);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = wound.bleed > 5 ? "#c6a15a" : "#9c3a32";
    ctx.lineWidth = 1.5 + Math.min(5, wound.bleed / 10);
    ctx.stroke();
    ctx.lineWidth = 1;

    const aim = aimPoint(zone);
    const depth = wound.armorStop ? 0.2 : Math.min(3.6, wound.stopCm);
    const u = Math.min(1, scrub / 0.62);
    const bullets = design.effect === "shot" ? Math.min(8, design.pellets) : 1;
    for (let i = 0; i < bullets; i++) {
      const spread = design.effect === "shot" ? (i - (bullets - 1) / 2) * 0.18 : 0;
      const z = 2.6 - u * (2.6 - (aim.z - depth * 0.25));
      const bullet = { x: aim.x + spread, y: aim.y + spread * 0.4, z };
      const bp = project(bullet, yaw, cx, cy, scale);
      const tail = project({ ...bullet, z: bullet.z + 0.7 }, yaw, cx, cy, scale);
      ctx.strokeStyle = design.effect === "tracer" ? "#c6a15a" : "rgba(231,220,198,0.8)";
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(bp.x, bp.y);
      ctx.stroke();
      ctx.fillStyle = design.effect === "tracer" ? "#c6a15a" : "#ebe4d4";
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, design.effect === "shot" ? 2 : 3.4, 0, Math.PI * 2);
      ctx.fill();
      if (u > 0.94 && i === 0) {
        const k = Math.max(0, Math.min(1, (scrub - 0.62) / 0.45));
        for (const f of wound.frags.slice(0, 12)) {
          const rad = (f.ang * Math.PI) / 180;
          const dist = f.cm * k;
          const fp = project(
            {
              x: bullet.x + Math.sin(rad) * dist,
              y: bullet.y + Math.cos(rad) * dist * 0.55,
              z: bullet.z - dist * 0.25,
            },
            yaw,
            cx,
            cy,
            scale,
          );
          ctx.fillStyle = "#9c3a32";
          ctx.fillRect(fp.x - 1, fp.y - 1, 2.4, 2.4);
        }
        if (wound.blastCm > 0) {
          ctx.beginPath();
          ctx.arc(bp.x, bp.y, Math.max(4, wound.blastCm * 22 * (0.3 + k)), 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(156,58,50,0.85)";
          ctx.stroke();
        }
        const img = wound.bleed > 8 ? sprayRef.current : bloodRef.current;
        if (wound.bleed > 1.5 && img && img.complete && img.naturalWidth > 0) {
          ctx.globalAlpha = Math.min(0.8, 0.15 + wound.bleed / 50) * (0.4 + k);
          ctx.drawImage(img, bp.x - 40, bp.y - 32, 80, 64);
          ctx.globalAlpha = 1;
        }
      }
    }

    ctx.fillStyle = "#9a927f";
    ctx.font = "13px sans-serif";
    ctx.fillText(`Ralenti · ${Math.round(velocity || report.velocity)} m/s · ${ARMOR_META[armor].label}`, 14, 22);
    ctx.fillText(wound.armorStop ? "La protection arrête le coup" : wound.exit ? "Elle sort" : `Arrêt à ${wound.stopCm.toFixed(1)} cm`, 14, h - 14);
  }, [scrub, design, zone, tilt, armor, velocity, report.velocity, wound]);

  return (
    <div className="mb-3">
      <canvas ref={canvasRef} width={720} height={460} className="h-auto w-full rounded-md bg-bg" aria-label="Coupe radiographique en mouvement" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="min-h-11 rounded-md bg-brass px-3 text-sm text-ink" onClick={() => setPlay((p) => !p)}>
          {play ? "Pause du ralenti" : "Lancer le ralenti"}
        </button>
        <label className="min-w-40 flex-1 text-sm">
          <span className="sr-only">Instant du coup</span>
          <input type="range" min={0} max={1.2} step={0.01} value={scrub} onChange={(e) => { setPlay(false); setScrub(Number(e.target.value)); }} />
        </label>
      </div>
      <p className="mt-1 text-xs text-muted">
        Volume d’un Meumeu, pas un corps humain. Les artères sont celles du modèle : {wound.bleed.toFixed(1)} ml/min
        {wound.seconds ? `, vidange utile ~${Math.round(wound.seconds)} s` : ""}. {ARMOR_META[armor].note}
      </p>
    </div>
  );
}
