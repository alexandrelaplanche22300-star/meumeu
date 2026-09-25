export type CoreMat = "lead" | "jacket" | "steel" | "tungsten" | "frangible";
export type Nose = "round" | "spitzer" | "flat" | "hollow" | "soft";
export type Effect = "ball" | "ap" | "api" | "frag" | "tracer" | "shot";
export type Action = "bolt" | "lever" | "straight" | "blowback";
export type Sight = "iron" | "aperture" | "optic";
export type Profile = "light" | "standard" | "heavy";
export type Feed = "single" | "clip" | "box" | "tube" | "belt";
export type CaseMat = "brass" | "steel" | "paper";
export type Filler = "none" | "void" | "burst";
export type BaseShape = "flat" | "boat";
export type Jacket = "none" | "tombac" | "cuivre" | "acier";
export type Burn = "lente" | "moyenne" | "vive";
export type Muzzle = "none" | "frein" | "cache" | "manchon";
export type Mount = "epaule" | "bipied" | "trepied";
export type Foregrip = "none" | "poignee";
export type Armor = "none" | "toile" | "cuir" | "lin" | "plaque" | "ceramique" | "composite";

export type Design = {
  diameter: number;
  caseLength: number;
  caseDiameter: number;
  bulletLength: number;
  powderFill: number;
  barrelLength: number;
  twist: number;
  core: CoreMat;
  nose: Nose;
  effect: Effect;
  action: Action;
  sight: Sight;
  profile: Profile;
  zero: number;
  magazine: number;
  feed: Feed;
  caseMat: CaseMat;
  filler: Filler;
  cavity: number;
  base: BaseShape;
  jacket: Jacket;
  jacketMm: number;
  burn: Burn;
  meplat: number;
  boat: number;
  pellets: number;
  muzzle: Muzzle;
  mount: Mount;
  foregrip: Foregrip;
};

export type CargoKind =
  | "grain"
  | "brass"
  | "propellant"
  | "lead"
  | "steel"
  | "tungsten"
  | "medical"
  | "timber"
  | "cartridges"
  | "rifles";

export type RawStock = {
  grain: number;
  brass: number;
  propellant: number;
  lead: number;
  steel: number;
  tungsten: number;
  medical: number;
  timber: number;
};

export type Lot = {
  id: string;
  qty: number;
  design: Design;
  name: string;
};

export type DepotId = "mines" | "arsenal" | "front";

export type Depot = {
  id: DepotId;
  name: string;
  km: number;
  stock: RawStock;
  cartridges: Lot[];
  rifles: Lot[];
};

export type Convoy = {
  id: string;
  from: DepotId;
  to: DepotId;
  cargo: CargoKind;
  amount: number;
  lot?: Lot;
  daysLeft: number;
  daysTotal: number;
  wagons: number;
};

export type Company = {
  id: string;
  name: string;
  men: number;
  fit: number;
  wounded: number;
  down: number;
  rifles: number;
  rifle: Design | null;
  ammo: number;
  ammoDesign: Design | null;
  trainDays: number;
  blood: number;
};

export type Battle = {
  enemyFit: number;
  enemyAmmo: number;
  enemyMen: number;
  range: number;
  resolved: boolean;
  outcome: "none" | "hold" | "rout" | "dry" | "lost";
  lastFx: "none" | "player" | "enemy" | "both";
  enemyBlood: number;
};

export type LogLine = { day: number; text: string };

export type ZoneId =
  | "crane"
  | "cou"
  | "poumon"
  | "coeur"
  | "aorte"
  | "foie"
  | "rate"
  | "intestin"
  | "colonne"
  | "femoral";
