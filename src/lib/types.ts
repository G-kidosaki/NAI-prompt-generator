// ─────────────────────────────────────────────────────────
// Library types (V3-compatible). 既存の cats/prompts/sels と同じ。
// ─────────────────────────────────────────────────────────

export interface CatTag {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  tags: CatTag[];
  color?: string;
}

export interface PromptItem {
  id: string;
  catId: string;
  prompt: string;
  label: string;
  tagIds: string[];
  order: number;
}

export interface Selection {
  w: number;          // -5..+5
  neg: boolean;
}

export type SelectionMap = Record<string, Selection>;

export interface Library {
  cats: Category[];
  prompts: PromptItem[];
  sels: SelectionMap;
}

// ─────────────────────────────────────────────────────────
// Composition types (V4 / V4.5). P1 では型のみ。P3 で UI とシリアライザ
// が本格使用する。
// ─────────────────────────────────────────────────────────

export type ModelId = "v3" | "v4" | "v4.5";

export type Weight =
  | { kind: "v3"; w: number }              // -5..+5、{}/[] ラップ
  | { kind: "numeric"; n: number };        // 1.3::tag:: / -1::tag::

export type ActionRole = "none" | "source" | "target" | "mutual";
export type Dataset = null | "fur" | "background" | "location";

export interface Tag {
  id: string;
  text: string;
  weight: Weight;
  role: ActionRole;
  neg: boolean;
  random?: { variants: string[] };
  dataset?: Dataset;
  note?: string;
}

export interface CharacterSlot {
  id: string;
  name?: string;
  positives: Tag[];
  negatives: Tag[];
  positionBias?: { x: number; y: number } | null;
  enabled: boolean;
}

export interface RefImage {
  id: string;
  dataUrl: string;
  weight: number;
  tag: string;
  anlasCharged: boolean;
}

export interface ResolutionMeta {
  w: number;
  h: number;
  preset?: string;
}

export interface CompositionMeta {
  seed?: number | null;
  resolution?: ResolutionMeta;
  sampler?: string;
  steps?: number;
  cfg?: number;
  refImages?: RefImage[];
}

export interface Composition {
  id: string;
  name: string;
  model: ModelId;
  base: { positives: Tag[]; negatives: Tag[]; t5?: string };
  characters: CharacterSlot[];
  meta: CompositionMeta;
  updatedAt: number;
  schemaVersion: 4;
}

// ─────────────────────────────────────────────────────────
// App-level UI state shared between tabs
// ─────────────────────────────────────────────────────────

export type Tab = "select" | "manage" | "output";
export type AddMode = "positive" | "negative";
export type SendMode = "overwrite" | "append";

export interface Settings {
  model: ModelId;
  sendMode: SendMode;
  migratedSaved: boolean;
}
