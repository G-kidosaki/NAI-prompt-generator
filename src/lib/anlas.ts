/**
 * Anlas（NovelAI の生成コスト）の概算。
 * 公式式は非公開＆プラン別で複雑なため、ここでは「目安」として:
 *   base = ceil(width * height * sqrt(steps / 28) / (1024 * 1024) * 18)
 * を返す。Opus プランの無料枠（〜1024^2 / 28 step）は別途UI側で表示。
 */
export const estimateAnlas = (
  width: number,
  height: number,
  steps: number = 28,
  characterCount: number = 0,
  refImageCount: number = 0,
): number => {
  if (!width || !height || width <= 0 || height <= 0) return 0;
  const stepFactor = Math.sqrt(Math.max(steps, 1) / 28);
  const pixels = width * height;
  let base = Math.ceil((pixels * stepFactor) / (1024 * 1024) * 18);
  // 複数キャラ追加で +50% 程度（V4 Image 系の経験則）
  if (characterCount > 1) base = Math.ceil(base * (1 + 0.15 * (characterCount - 1)));
  // 参照画像（ポーション）の初回変換は 1枚 2 anlas 加算
  base += refImageCount * 2;
  return base;
};

export const isFreeOpusTier = (width: number, height: number, steps: number): boolean => {
  return width * height <= 1024 * 1024 && steps <= 28;
};
