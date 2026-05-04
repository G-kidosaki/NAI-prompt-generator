import { makeTag, emptyComposition, makeCharacter } from "../composition";
import type { Composition, Tag, ActionRole, ModelId } from "../types";

const ROLE_RE = /^(source|target|mutual)#(.+)$/s;
const NUMERIC_RE = /^(-?\d+(?:\.\d+)?)::(.+)::$/s;
const RANDOMIZER_RE = /^\|\|(.+)\|\|$/s;

const countWrap = (text: string, open: string, close: string): { stripped: string; count: number } => {
  let n = 0;
  let s = text;
  while (s.startsWith(open) && s.endsWith(close) && s.length >= open.length + close.length) {
    s = s.slice(open.length, s.length - close.length);
    n++;
    if (n > 5) break;
  }
  return { stripped: s, count: n };
};

const parseV3Wrap = (text: string): { text: string; w: number } => {
  const pos = countWrap(text, "{", "}");
  if (pos.count > 0) return { text: pos.stripped, w: pos.count };
  const neg = countWrap(text, "[", "]");
  if (neg.count > 0) return { text: neg.stripped, w: -neg.count };
  return { text, w: 0 };
};

/**
 * 単一タグ文字列を Tag に。例:
 *   "source#1.3::kissing::"
 *   "{{blue eyes}}"
 *   "||red hair|blue hair||"
 */
export function parseTag(raw: string, neg: boolean): Tag {
  let s = raw.trim();
  let role: ActionRole = "none";
  const roleMatch = s.match(ROLE_RE);
  if (roleMatch) {
    role = roleMatch[1] as ActionRole;
    s = roleMatch[2];
  }

  // 数値強調
  const numMatch = s.match(NUMERIC_RE);
  if (numMatch) {
    const n = parseFloat(numMatch[1]);
    s = numMatch[2];
    // 中身がランダマイザならそれを抽出、それ以外はテキスト
    const ran = s.match(RANDOMIZER_RE);
    if (ran) {
      const variants = ran[1].split("|").map((v) => v.trim()).filter(Boolean);
      return makeTag("", { weight: { kind: "numeric", n }, role, neg, random: { variants } });
    }
    return makeTag(s, { weight: { kind: "numeric", n }, role, neg });
  }

  // ランダマイザのみ
  const ran = s.match(RANDOMIZER_RE);
  if (ran) {
    const variants = ran[1].split("|").map((v) => v.trim()).filter(Boolean);
    return makeTag("", { weight: { kind: "v3", w: 0 }, role, neg, random: { variants } });
  }

  // V3 形式
  const v3 = parseV3Wrap(s);
  return makeTag(v3.text, { weight: { kind: "v3", w: v3.w }, role, neg });
}

const splitSections = (text: string): string[] => {
  // 区切りは「空白で囲まれた || 」のみとし、トップレベル分割。
  // 内部の ||a|b|| ランダマイザは生き残る。
  return text.split(/\s+\|\|\s+/).map((s) => s.trim()).filter(Boolean);
};

const splitTags = (text: string): string[] =>
  text.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);

/**
 * V4 形式の pos / neg 文字列ペアを Composition に再構成。
 * セクション数が一致しない場合は max 個のキャラを作り、片方が無い側は空。
 */
export function parseV4(
  pos: string,
  neg: string = "",
  model: ModelId = "v4"
): Composition {
  const posSections = splitSections(pos);
  const negSections = splitSections(neg);
  const sectionCount = Math.max(posSections.length, negSections.length, 1);

  const comp = emptyComposition(model);
  const baseP = posSections[0] ?? "";
  const baseN = negSections[0] ?? "";
  comp.base.positives = splitTags(baseP).map((t) => parseTag(t, false));
  comp.base.negatives = splitTags(baseN).map((t) => parseTag(t, true));

  for (let i = 1; i < sectionCount; i++) {
    const ch = makeCharacter();
    ch.positives = splitTags(posSections[i] ?? "").map((t) => parseTag(t, false));
    ch.negatives = splitTags(negSections[i] ?? "").map((t) => parseTag(t, true));
    comp.characters.push(ch);
  }
  return comp;
}
