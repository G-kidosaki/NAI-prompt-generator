import { uid } from "./utils";
import { noWeight } from "./weight";
import type {
  Composition, CharacterSlot, Tag, ModelId,
} from "./types";

export const makeTag = (text: string, over: Partial<Tag> = {}): Tag => ({
  id: uid(),
  text,
  weight: noWeight(),
  role: "none",
  neg: false,
  ...over,
});

export const makeCharacter = (over: Partial<CharacterSlot> = {}): CharacterSlot => ({
  id: uid(),
  positives: [],
  negatives: [],
  positionBias: null,
  enabled: true,
  ...over,
});

export const emptyComposition = (model: ModelId = "v4"): Composition => ({
  id: uid(),
  name: "",
  model,
  base: { positives: [], negatives: [], t5: "" },
  characters: [],
  meta: {},
  updatedAt: Date.now(),
  schemaVersion: 4,
});

/**
 * Composition 内のタグの所在を表す軽量な参照。
 *   - base: ベースの positives / negatives
 *   - char: キャラクターの positives / negatives（charId 必須）
 */
export type TagTarget =
  | { kind: "base"; neg: boolean }
  | { kind: "char"; charId: string; neg: boolean };

const fieldOf = (neg: boolean): "positives" | "negatives" =>
  neg ? "negatives" : "positives";

export const getTagList = (comp: Composition, target: TagTarget): Tag[] => {
  if (target.kind === "base") return comp.base[fieldOf(target.neg)];
  const ch = comp.characters.find((c) => c.id === target.charId);
  return ch ? ch[fieldOf(target.neg)] : [];
};

const updateTagList = (
  comp: Composition,
  target: TagTarget,
  fn: (tags: Tag[]) => Tag[]
): Composition => {
  if (target.kind === "base") {
    const f = fieldOf(target.neg);
    return { ...comp, base: { ...comp.base, [f]: fn(comp.base[f]) }, updatedAt: Date.now() };
  }
  const f = fieldOf(target.neg);
  return {
    ...comp,
    characters: comp.characters.map((c) => c.id === target.charId
      ? { ...c, [f]: fn(c[f]) }
      : c),
    updatedAt: Date.now(),
  };
};

export const addTag = (comp: Composition, target: TagTarget, tag: Tag): Composition =>
  updateTagList(comp, target, (tags) => [...tags, tag]);

export const removeTag = (comp: Composition, target: TagTarget, tagId: string): Composition =>
  updateTagList(comp, target, (tags) => tags.filter((t) => t.id !== tagId));

export const updateTag = (
  comp: Composition,
  target: TagTarget,
  tagId: string,
  patch: Partial<Tag>
): Composition =>
  updateTagList(comp, target, (tags) => tags.map((t) => t.id === tagId ? { ...t, ...patch } : t));

export const moveTag = (
  comp: Composition,
  target: TagTarget,
  tagId: string,
  dir: -1 | 1
): Composition =>
  updateTagList(comp, target, (tags) => {
    const idx = tags.findIndex((t) => t.id === tagId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= tags.length) return tags;
    const next = [...tags];
    [next[idx], next[j]] = [next[j], next[idx]];
    return next;
  });

export const addCharacter = (comp: Composition, name?: string): Composition => ({
  ...comp,
  characters: [...comp.characters, makeCharacter({ name })],
  updatedAt: Date.now(),
});

export const removeCharacter = (comp: Composition, charId: string): Composition => ({
  ...comp,
  characters: comp.characters.filter((c) => c.id !== charId),
  updatedAt: Date.now(),
});

export const updateCharacter = (
  comp: Composition,
  charId: string,
  patch: Partial<CharacterSlot>
): Composition => ({
  ...comp,
  characters: comp.characters.map((c) => c.id === charId ? { ...c, ...patch } : c),
  updatedAt: Date.now(),
});

export const moveCharacter = (
  comp: Composition,
  charId: string,
  dir: -1 | 1
): Composition => {
  const idx = comp.characters.findIndex((c) => c.id === charId);
  const j = idx + dir;
  if (idx < 0 || j < 0 || j >= comp.characters.length) return comp;
  const next = [...comp.characters];
  [next[idx], next[j]] = [next[j], next[idx]];
  return { ...comp, characters: next, updatedAt: Date.now() };
};
