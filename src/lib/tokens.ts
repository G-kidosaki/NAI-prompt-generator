/**
 * トークン数の概算ヘルパ。正確な数は SentencePiece / BPE が必要だが、
 * UI で「だいたいどのくらい長いか」を見るには十分な精度を狙う。
 *
 * - T5 (NovelAI V4.5): SentencePiece-like。英文は ~4 chars/token、
 *   日本語は ~1〜2 chars/token として近似。
 * - CLIP (NovelAI V3 / V4 のタグエンコーダ): カンマ区切りの語と空白で
 *   おおまかに分割し、句読点も追加。
 */

const ASCII_LIKE = /[\x00-\x7F]/g;

const countAsciiChars = (s: string): number => (s.match(ASCII_LIKE) || []).length;

export const approxT5Tokens = (text: string): number => {
  if (!text) return 0;
  const ascii = countAsciiChars(text);
  const nonAscii = text.length - ascii;
  // 英語 ~4 chars/token, 日本語 ~1.5 chars/token
  return Math.ceil(ascii / 4 + nonAscii / 1.5);
};

export const approxClipTokens = (text: string): number => {
  if (!text) return 0;
  // カンマと空白で分割し、空要素を除外。各タグは平均 1.5 トークン程度に膨らむ。
  const parts = text.split(/[,\s]+/).filter(Boolean);
  return Math.ceil(parts.length * 1.5);
};
