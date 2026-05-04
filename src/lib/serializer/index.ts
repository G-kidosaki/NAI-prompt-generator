import type { Library, Composition, ModelId } from "../types";
import { serializeV3 } from "./v3";
import { serializeV4 } from "./v4";

/**
 * 出力結果の共通形。V4 以降は per-character / t5 を追加するが、
 * pos / neg は常に NovelAI の textarea 1 個分にそのまま貼れる単一文字列。
 */
export interface SerializeResult {
  pos: string;
  neg: string;
  /** V4 以降のキャラ別ペイロード。V3 では空配列。 */
  perCharacter?: Array<{
    pos: string;
    neg: string;
    bias?: { x: number; y: number } | null;
  }>;
  /** V4.5 の T5 自然文プロンプト。空文字なら未指定。 */
  t5?: string;
}

/**
 * Library（V3 互換のフラットな選択）からの直列化。
 * V4 構造（複数キャラ）を使いたい場合は serializeComposition() を呼ぶこと。
 */
export function serialize(library: Library, _model: ModelId): SerializeResult {
  // Library モデルにはキャラ概念がないので、どのモデル ID でも V3 形式で返す。
  return serializeV3(library);
}

/**
 * Composition（V4 構造）からの直列化。
 */
export function serializeComposition(comp: Composition): SerializeResult {
  switch (comp.model) {
    case "v3":
      // Composition だが V3 として出力したい場合は base のみフラットに連結
      return serializeV4({ ...comp, characters: [] });
    case "v4":
    case "v4.5":
    default:
      return serializeV4(comp);
  }
}

export { serializeV3, serializeV4 };
