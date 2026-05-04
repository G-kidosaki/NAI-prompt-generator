/**
 * NovelAI V4 の `||a|b|c||` ランダマイザー記法を扱うユーティリティ。
 *
 * - serialize(["red", "blue", "green"]) → "||red|blue|green||"
 * - parse("||red|blue|green||") → ["red", "blue", "green"]
 * - 空配列 / 1要素のみは無効（無強調と同じ意味）。
 * - 入れ子は NovelAI 側でサポートされないので、ここでも扱わない。
 */

export const serializeRandomizer = (variants: string[]): string => {
  const cleaned = variants.map((v) => v.trim()).filter(Boolean);
  if (cleaned.length < 2) return cleaned[0] ?? "";
  return "||" + cleaned.join("|") + "||";
};

export const parseRandomizer = (text: string): string[] | null => {
  const m = text.match(/^\|\|(.+)\|\|$/);
  if (!m) return null;
  const variants = m[1].split("|").map((v) => v.trim()).filter(Boolean);
  return variants.length >= 2 ? variants : null;
};

export const isRandomizer = (text: string): boolean => parseRandomizer(text) !== null;
