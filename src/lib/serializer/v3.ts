import { wrap, sortByOrder } from "../utils";
import type { Library } from "../types";
import type { SerializeResult } from "./index";

/**
 * V3（NovelAI Diffusion V3 まで）の出力ルール:
 *   - sels をカテゴリ順 → カテゴリ内 stable で並べる
 *   - 各タグは {} / [] でラップ（wrap()）
 *   - ポジ / ネガ をカンマで連結
 *
 * 既存 App.jsx の buildOut() と完全互換。テスト容易性のため副作用なし。
 */
export function serializeV3(library: Library): SerializeResult {
  const { cats, prompts, sels } = library;
  const sortedCats = sortByOrder(cats);
  const catOrder = new Map(sortedCats.map((c, i) => [c.id, i]));

  const sortedSels = Object.entries(sels)
    .map(([id, s]) => ({ id, s, p: prompts.find((x) => x.id === id) }))
    .filter((x): x is { id: string; s: { w: number; neg: boolean }; p: NonNullable<typeof x.p> } => !!x.p)
    .sort((a, b) => (catOrder.get(a.p.catId) ?? 999) - (catOrder.get(b.p.catId) ?? 999));

  const join = (neg: boolean) => sortedSels
    .filter(({ s }) => !!s.neg === neg)
    .map(({ p, s }) => wrap(p.prompt, s.w))
    .join(", ");

  return { pos: join(false), neg: join(true) };
}
