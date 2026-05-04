import type { Library, ModelId } from "../types";
import { serializeV3 } from "./v3";

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
 * モデル ID に応じた直列化のディスパッチャ。
 * 現状は V3 のみ実装済み。V4 / V4.5 は P3 / P4 で追加。
 */
export function serialize(library: Library, model: ModelId): SerializeResult {
  // 暫定: V4 / V4.5 が選択されても V3 と同じ結果を返す（重み形式は維持）。
  // P3 で V4 シリアライザに切り替える。
  switch (model) {
    case "v3":
    case "v4":
    case "v4.5":
    default:
      return serializeV3(library);
  }
}

export { serializeV3 };
