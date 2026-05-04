import type { Composition, Tag, ModelId } from "../types";
import { wrapV3, wrapNumeric } from "../weight";
import { serializeRandomizer } from "../randomizer";
import type { SerializeResult } from "./index";

/**
 * 単一タグの V4 直列化。順序:
 *   1. ランダマイザーがあればまず ||a|b|| に展開（強調はその全体に掛ける）
 *   2. 数値強調 1.3::tag:: または V3 形式 {{tag}} を適用
 *   3. role が source/target/mutual なら接頭辞 source#tag を付与
 */
export function serializeTag(t: Tag, model: ModelId): string {
  let body = t.text;
  if (t.random && t.random.variants.length >= 2) {
    body = serializeRandomizer(t.random.variants);
  }

  // 重み: 数値強調を優先。V3 重みは {} / [] のまま。
  if (t.weight.kind === "numeric") {
    body = wrapNumeric(body, t.weight);
  } else if (t.weight.kind === "v3" && t.weight.w !== 0) {
    body = wrapV3(body, t.weight);
  }

  // アクション主体（V4 以降のみ）
  if (model !== "v3" && t.role !== "none") {
    body = `${t.role}#${body}`;
  }
  return body;
}

const joinTags = (tags: Tag[], neg: boolean, model: ModelId): string =>
  tags.filter((t) => t.neg === neg).map((t) => serializeTag(t, model)).join(", ");

/**
 * V4 / V4.5 の直列化。
 *   - pos:  base.positives と各キャラの positives を " || " で連結
 *   - neg:  base.negatives と各キャラの negatives を " || " で連結
 *   - perCharacter: 拡張で個別 textarea に流し込むペイロード
 *   - t5:   V4.5 の自然文プロンプト（V4 では無視）
 */
export function serializeV4(comp: Composition): SerializeResult {
  const model = comp.model;
  const enabled = comp.characters.filter((c) => c.enabled);

  const baseP = joinTags(comp.base.positives, false, model);
  const baseN = joinTags(comp.base.negatives, true, model);

  const charP = enabled.map((c) => joinTags(c.positives, false, model));
  const charN = enabled.map((c) => joinTags(c.negatives, true, model));

  const pos = [baseP, ...charP].filter(Boolean).join(" || ");
  const neg = [baseN, ...charN].filter(Boolean).join(" || ");

  const perCharacter = enabled.map((c) => ({
    pos: joinTags(c.positives, false, model),
    neg: joinTags(c.negatives, true, model),
    bias: c.positionBias ?? null,
  }));

  return {
    pos,
    neg,
    perCharacter,
    t5: model === "v4.5" ? (comp.base.t5 ?? "") : "",
  };
}
