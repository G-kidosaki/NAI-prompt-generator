import { wrap } from "./utils";
import type { Weight } from "./types";

/**
 * V3 重み（{} の数 / [] の数）を NovelAI 内部での近似倍率に換算する。
 * NovelAI のドキュメントに準拠: { } = ×1.05、[ ] = /1.05。
 */
const V3_BASE = 1.05;

export const v3WeightToNumeric = (w: number): number => {
  if (w === 0) return 1;
  return parseFloat(Math.pow(V3_BASE, w).toFixed(3));
};

/**
 * 1.21 のような近似倍率を、最も近い V3 整数重みに丸める。
 * 完全なラウンドトリップは保証されないが、UI 切替時の表示用には十分。
 */
export const numericToV3Weight = (n: number): number => {
  if (!isFinite(n) || n <= 0 || n === 1) return 0;
  const w = Math.round(Math.log(n) / Math.log(V3_BASE));
  return Math.max(-5, Math.min(5, w));
};

/**
 * Weight オブジェクトを V3 表現に変換（{} / [] のラップ用）。
 */
export const toV3Weight = (weight: Weight): number => {
  if (weight.kind === "v3") return weight.w;
  return numericToV3Weight(weight.n);
};

/**
 * Weight オブジェクトを V4 数値表現に変換。
 */
export const toNumericWeight = (weight: Weight): number => {
  if (weight.kind === "numeric") return weight.n;
  return v3WeightToNumeric(weight.w);
};

/**
 * Weight を V3 文字列ラップ（既存 wrap() を呼ぶラッパー）。
 */
export const wrapV3 = (text: string, weight: Weight): string => {
  return wrap(text, toV3Weight(weight));
};

/**
 * Weight を V4 数値強調に直列化。重み 1（変化なし）は素通し。
 */
export const wrapNumeric = (text: string, weight: Weight): string => {
  const n = toNumericWeight(weight);
  if (n === 1) return text;
  // NovelAI V4 の表記: 1.3::tag:: / -1::tag::
  return `${n}::${text}::`;
};

export const makeV3Weight = (w: number): Weight => ({ kind: "v3", w });
export const makeNumericWeight = (n: number): Weight => ({ kind: "numeric", n });
export const noWeight = (): Weight => ({ kind: "v3", w: 0 });
