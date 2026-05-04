import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { temporal } from "zundo";
import storage, { zustandAdapter } from "../storage";
import {
  INIT_CATS, INIT_PROMPTS,
  SK, SK_OLD,
} from "../lib/constants";
import { uid, sortByOrder, assignPromptOrders } from "../lib/utils";
import {
  emptyComposition,
  addTag as addTagPure, removeTag as removeTagPure,
  updateTag as updateTagPure, moveTag as moveTagPure,
  addCharacter as addCharacterPure, removeCharacter as removeCharacterPure,
  updateCharacter as updateCharacterPure, moveCharacter as moveCharacterPure,
  type TagTarget,
} from "../lib/composition";
import type {
  Library, Category, PromptItem, SelectionMap,
  ModelId, Composition, Tag, CharacterSlot,
} from "../lib/types";

/**
 * Library 専用の storage アダプタ。
 * SK が未保存で SK_OLD（v2形式）が存在する場合だけ v2 を読み込み、
 * Zustand persist の merge() に渡せる JSON を返す。これにより
 * 既存ユーザーの v2 → v3 マイグレーションが副作用なく走る。
 */
const libraryStorageAdapter = {
  async getItem(name: string) {
    const r = await storage.get(name);
    if (r?.value) return r.value;
    if (name === SK) {
      const old = await storage.get(SK_OLD);
      if (old?.value) {
        try {
          const o = JSON.parse(old.value);
          const oldCats = Array.isArray(o.cats) ? o.cats : [];
          const oldPrompts = Array.isArray(o.prompts) ? o.prompts : [];
          const newSels: SelectionMap = {};
          for (const [id, val] of Object.entries(o.sels || {})) {
            if (val && typeof val === "object" && "w" in (val as object)) {
              newSels[id] = val as { w: number; neg: boolean };
            } else {
              const op = oldPrompts.find((p: any) => p.id === id);
              newSels[id] = { w: typeof val === "number" ? val : 0, neg: !!op?.neg };
            }
          }
          return JSON.stringify({
            state: {
              cats: oldCats,
              prompts: oldPrompts.map(({ neg: _n, ...rest }: any) => ({ ...rest, tagIds: rest.tagIds || [] })),
              sels: newSels,
            },
            version: 0,
          });
        } catch {
          return null;
        }
      }
    }
    return null;
  },
  async setItem(name: string, value: string) {
    await storage.set(name, value);
  },
  async removeItem(name: string) {
    await zustandAdapter.removeItem(name);
  },
};

// ─────────────────────────────────────────────────────────
// Library slice — 既存の cats/prompts/sels と等価。
// 永続化キーは SK（"nai-pg-v3"）を維持し、既存ユーザーのデータを破壊しない。
// ─────────────────────────────────────────────────────────

interface LibraryState extends Library {
  // raw setters
  setCats: (cats: Category[] | ((prev: Category[]) => Category[])) => void;
  setPrompts: (prompts: PromptItem[] | ((prev: PromptItem[]) => PromptItem[])) => void;
  setSels: (sels: SelectionMap | ((prev: SelectionMap) => SelectionMap)) => void;
  replaceLibrary: (lib: Library) => void;

  // selection ops
  toggleSel: (id: string, addMode: "positive" | "negative") => void;
  setWeight: (id: string, delta: number) => void;
  flipSel: (id: string) => void;
  removeSel: (id: string) => void;
  clearAll: () => void;

  // prompt ops
  addPrompt: (catId: string, prompt: string, label: string, tagIds: string[]) => void;
  updatePrompt: (id: string, patch: Partial<Pick<PromptItem, "prompt" | "label" | "tagIds">>) => void;
  deletePrompt: (id: string) => void;
  movePrompt: (id: string, dir: -1 | 1) => void;

  // category ops
  addCategory: (name: string) => void;
  renameCategory: (id: string, name: string) => void;
  setCatColor: (id: string, color: string) => void;
  deleteCategory: (id: string) => void;
  moveCat: (id: string, dir: -1 | 1) => void;

  // tag ops
  addTagToCat: (catId: string, name: string) => string | null;
  renameTag: (catId: string, tagId: string, name: string) => void;
  deleteTag: (catId: string, tagId: string) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      cats: INIT_CATS as Category[],
      prompts: INIT_PROMPTS as PromptItem[],
      sels: {} as SelectionMap,

      setCats: (cats) => set((s) => ({ cats: typeof cats === "function" ? cats(s.cats) : cats })),
      setPrompts: (prompts) => set((s) => ({ prompts: typeof prompts === "function" ? prompts(s.prompts) : prompts })),
      setSels: (sels) => set((s) => ({ sels: typeof sels === "function" ? sels(s.sels) : sels })),
      replaceLibrary: (lib) => set({ cats: lib.cats, prompts: lib.prompts, sels: lib.sels }),

      // ── selection
      toggleSel: (id, addMode) => set((s) => {
        const n = { ...s.sels };
        if (n[id]) delete n[id];
        else n[id] = { w: 0, neg: addMode === "negative" };
        return { sels: n };
      }),
      setWeight: (id, delta) => set((s) => {
        if (!s.sels[id]) return s;
        return {
          sels: {
            ...s.sels,
            [id]: { ...s.sels[id], w: Math.max(-5, Math.min(5, s.sels[id].w + delta)) },
          },
        };
      }),
      flipSel: (id) => set((s) => s.sels[id] ? { sels: { ...s.sels, [id]: { ...s.sels[id], neg: !s.sels[id].neg } } } : s),
      removeSel: (id) => set((s) => { const n = { ...s.sels }; delete n[id]; return { sels: n }; }),
      clearAll: () => set({ sels: {} }),

      // ── prompt
      addPrompt: (catId, prompt, label, tagIds) => set((s) => {
        const order = s.prompts.filter((x) => x.catId === catId).length;
        return {
          prompts: [...s.prompts, { id: uid(), catId, prompt, label, tagIds, order }],
        };
      }),
      updatePrompt: (id, patch) => set((s) => ({
        prompts: s.prompts.map((x) => x.id === id ? { ...x, ...patch } : x),
      })),
      deletePrompt: (id) => set((s) => {
        const target = s.prompts.find((x) => x.id === id);
        if (!target) return s;
        const without = s.prompts.filter((x) => x.id !== id);
        const sameCat = sortByOrder(without.filter((x) => x.catId === target.catId)).map((x, i) => ({ ...x, order: i }));
        const map = new Map(sameCat.map((x) => [x.id, x] as const));
        const newPrompts = without.map((x) => map.get(x.id) || x);
        const newSels = { ...s.sels }; delete newSels[id];
        return { prompts: newPrompts, sels: newSels };
      }),
      movePrompt: (id, dir) => set((s) => {
        const target = s.prompts.find((x) => x.id === id);
        if (!target) return s;
        const sameCat = sortByOrder(s.prompts.filter((x) => x.catId === target.catId));
        const idx = sameCat.findIndex((x) => x.id === id);
        const j = idx + dir;
        if (j < 0 || j >= sameCat.length) return s;
        [sameCat[idx], sameCat[j]] = [sameCat[j], sameCat[idx]];
        const reordered = sameCat.map((x, i) => ({ ...x, order: i }));
        const map = new Map(reordered.map((x) => [x.id, x] as const));
        return { prompts: s.prompts.map((x) => map.get(x.id) || x) };
      }),

      // ── category
      addCategory: (name) => set((s) => ({
        cats: [...s.cats, { id: uid(), name, order: s.cats.length, tags: [], color: "" }],
      })),
      renameCategory: (id, name) => set((s) => ({
        cats: s.cats.map((c) => c.id === id ? { ...c, name } : c),
      })),
      setCatColor: (id, color) => set((s) => ({
        cats: s.cats.map((c) => c.id === id ? { ...c, color } : c),
      })),
      deleteCategory: (id) => set((s) => {
        const ids = s.prompts.filter((x) => x.catId === id).map((x) => x.id);
        const newCats = sortByOrder(s.cats.filter((c) => c.id !== id)).map((c, i) => ({ ...c, order: i }));
        const newPrompts = s.prompts.filter((x) => x.catId !== id);
        const newSels = { ...s.sels }; ids.forEach((i) => delete newSels[i]);
        return { cats: newCats, prompts: newPrompts, sels: newSels };
      }),
      moveCat: (id, dir) => set((s) => {
        const sorted = sortByOrder(s.cats);
        const idx = sorted.findIndex((c) => c.id === id);
        const j = idx + dir;
        if (idx < 0 || j < 0 || j >= sorted.length) return s;
        [sorted[idx], sorted[j]] = [sorted[j], sorted[idx]];
        return { cats: sorted.map((c, i) => ({ ...c, order: i })) };
      }),

      // ── tag
      addTagToCat: (catId, name) => {
        const t = name.trim();
        if (!t) return null;
        const cat = get().cats.find((c) => c.id === catId);
        const existing = (cat?.tags || []).find((x) => x.name === t);
        if (existing) return existing.id;
        const newTag = { id: uid(), name: t };
        set((s) => ({
          cats: s.cats.map((c) => c.id === catId ? { ...c, tags: [...(c.tags || []), newTag] } : c),
        }));
        return newTag.id;
      },
      renameTag: (catId, tagId, name) => set((s) => ({
        cats: s.cats.map((c) => c.id === catId ? {
          ...c,
          tags: (c.tags || []).map((t) => t.id === tagId ? { ...t, name } : t),
        } : c),
      })),
      deleteTag: (catId, tagId) => set((s) => ({
        cats: s.cats.map((c) => c.id === catId ? {
          ...c,
          tags: (c.tags || []).filter((t) => t.id !== tagId),
        } : c),
        prompts: s.prompts.map((x) => x.catId === catId ? {
          ...x,
          tagIds: (x.tagIds || []).filter((id) => id !== tagId),
        } : x),
      })),
    }),
    {
      name: SK,
      storage: createJSONStorage(() => libraryStorageAdapter),
      // 既存 SK のフォーマットは { cats, prompts, sels }。
      // zustand persist は { state, version } 形式で保存するためキーは別に新設…
      // と思いきや、ここでは既存 SK の中身を読み書きするので、
      // partialize で永続化対象を絞り、merge で旧フォーマット互換を持たせる。
      partialize: (state) => ({
        cats: state.cats,
        prompts: state.prompts,
        sels: state.sels,
      }),
      merge: (persistedState, currentState) => {
        // persistedState は zustand 形式（{ state, version }）または旧形式（直接 cats/prompts/sels）
        const ps = (persistedState as any) ?? {};
        // 旧形式（既存ユーザーの永続データ）と zustand 形式の両方を吸収
        const raw = ps.state ?? ps;
        const cats = Array.isArray(raw.cats) && raw.cats.length
          ? raw.cats.map((c: any) => ({ ...c, tags: c.tags || [], color: c.color || "" }))
          : currentState.cats;
        const prompts = Array.isArray(raw.prompts)
          ? assignPromptOrders(raw.prompts.map((p: any) => ({ ...p, tagIds: p.tagIds || [] })))
          : currentState.prompts;
        const sels = raw.sels && typeof raw.sels === "object" ? raw.sels : currentState.sels;
        return { ...currentState, cats, prompts, sels };
      },
    }
  )
);

// ─────────────────────────────────────────────────────────
// UI / settings slice — Composition 編集 UI で使う一過性の状態。
// V4 Composition 本体は P3 で別ストアとして導入予定。ここではモデル選択
// とサーバ送信モードだけ persist する。
// ─────────────────────────────────────────────────────────

interface SettingsState {
  model: ModelId;
  sendMode: "overwrite" | "append";
  migratedSaved: boolean;
  setModel: (m: ModelId) => void;
  setSendMode: (m: "overwrite" | "append") => void;
  setMigratedSaved: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      model: "v4",                       // 新規ユーザー向けデフォルト。既存ユーザーは persist の merge で保存値を復元
      sendMode: "overwrite",
      migratedSaved: false,
      setModel: (model) => set({ model }),
      setSendMode: (sendMode) => set({ sendMode }),
      setMigratedSaved: (migratedSaved) => set({ migratedSaved }),
    }),
    {
      name: "nai-pg-settings-v3",
      storage: createJSONStorage(() => zustandAdapter),
      // 旧フォーマット { sendMode, migratedSaved } を吸収
      merge: (persistedState, currentState) => {
        const ps = (persistedState as any) ?? {};
        const raw = ps.state ?? ps;
        const validModel = raw.model === "v3" || raw.model === "v4" || raw.model === "v4.5"
          ? raw.model
          : currentState.model;
        return {
          ...currentState,
          model: validModel,
          sendMode: raw.sendMode === "append" ? "append" : "overwrite",
          migratedSaved: !!raw.migratedSaved,
        };
      },
    }
  )
);

// ─────────────────────────────────────────────────────────
// Composition slice — 編集中の V4 Composition オブジェクトを保持。
// 永続化キーは新規の `nai-pg-comp-v4`。Library / Settings ストアと独立。
// ─────────────────────────────────────────────────────────

interface CompositionState {
  comp: Composition;
  /** Composer UI で「いまアクティブな入力先」を覚えるためのターゲット */
  activeTarget: TagTarget;
  /** 保存済み Composition のリスト（明示的に「保存」されたものだけ） */
  saved: Composition[];

  setComp: (c: Composition) => void;
  resetComp: (model?: ModelId) => void;
  setModel: (model: ModelId) => void;
  setBaseT5: (t5: string) => void;

  setActiveTarget: (t: TagTarget) => void;

  addTag: (target: TagTarget, tag: Tag) => void;
  removeTag: (target: TagTarget, tagId: string) => void;
  updateTag: (target: TagTarget, tagId: string, patch: Partial<Tag>) => void;
  moveTag: (target: TagTarget, tagId: string, dir: -1 | 1) => void;

  addCharacter: (name?: string) => void;
  removeCharacter: (charId: string) => void;
  updateCharacter: (charId: string, patch: Partial<CharacterSlot>) => void;
  moveCharacter: (charId: string, dir: -1 | 1) => void;

  /** 現在の comp を saved に追加（id は新規発番） */
  saveCurrent: (name: string) => void;
  loadSaved: (id: string) => void;
  deleteSaved: (id: string) => void;
}

export const useCompStore = create<CompositionState>()(
  persist(
    temporal((set) => ({
      comp: emptyComposition("v4"),
      activeTarget: { kind: "base", neg: false },
      saved: [],

      setComp: (comp) => set({ comp }),
      resetComp: (model) => set({ comp: emptyComposition(model ?? "v4") }),
      setModel: (model) => set((s) => ({ comp: { ...s.comp, model, updatedAt: Date.now() } })),
      setBaseT5: (t5) => set((s) => ({ comp: { ...s.comp, base: { ...s.comp.base, t5 }, updatedAt: Date.now() } })),

      setActiveTarget: (activeTarget) => set({ activeTarget }),

      addTag: (target, tag) => set((s) => ({ comp: addTagPure(s.comp, target, tag) })),
      removeTag: (target, tagId) => set((s) => ({ comp: removeTagPure(s.comp, target, tagId) })),
      updateTag: (target, tagId, patch) => set((s) => ({ comp: updateTagPure(s.comp, target, tagId, patch) })),
      moveTag: (target, tagId, dir) => set((s) => ({ comp: moveTagPure(s.comp, target, tagId, dir) })),

      addCharacter: (name) => set((s) => ({ comp: addCharacterPure(s.comp, name) })),
      removeCharacter: (charId) => set((s) => {
        const next = { comp: removeCharacterPure(s.comp, charId) };
        // active target がそのキャラを指していたら base に戻す
        if (s.activeTarget.kind === "char" && s.activeTarget.charId === charId) {
          return { ...next, activeTarget: { kind: "base", neg: s.activeTarget.neg } as TagTarget };
        }
        return next;
      }),
      updateCharacter: (charId, patch) => set((s) => ({ comp: updateCharacterPure(s.comp, charId, patch) })),
      moveCharacter: (charId, dir) => set((s) => ({ comp: moveCharacterPure(s.comp, charId, dir) })),

      saveCurrent: (name) => set((s) => {
        const snapshot: Composition = {
          ...s.comp,
          id: uid(),
          name: name.trim() || `Composition ${s.saved.length + 1}`,
          updatedAt: Date.now(),
        };
        return { saved: [...s.saved, snapshot] };
      }),
      loadSaved: (id) => set((s) => {
        const target = s.saved.find((c) => c.id === id);
        if (!target) return s;
        return { comp: { ...target, id: uid(), updatedAt: Date.now() } };
      }),
      deleteSaved: (id) => set((s) => ({ saved: s.saved.filter((c) => c.id !== id) })),
    }), {
      // zundo: undo/redo 対象は comp フィールドのみ。activeTarget は履歴に
      // 入れず、頻繁な切替で履歴が荒れないようにする。
      partialize: (s) => ({ comp: s.comp }),
      limit: 100,
      equality: (a, b) => a.comp === b.comp,
    }),
    {
      name: "nai-pg-comp-v4",
      storage: createJSONStorage(() => zustandAdapter),
      partialize: (state) => ({
        comp: state.comp,
        activeTarget: state.activeTarget,
        saved: state.saved,
      }),
      merge: (persistedState, currentState) => {
        const ps = (persistedState as any) ?? {};
        const raw = ps.state ?? ps;
        // schemaVersion が一致しなければ捨てる（将来のための保険）
        if (raw?.comp?.schemaVersion !== 4) return currentState;
        return {
          ...currentState,
          comp: raw.comp,
          activeTarget: raw.activeTarget ?? currentState.activeTarget,
          saved: Array.isArray(raw.saved) ? raw.saved.filter((c: any) => c?.schemaVersion === 4) : [],
        };
      },
    }
  )
);
