export const INIT_CATS = [
  { id: "char", name: "キャラクター", order: 0, tags: [] },
  { id: "expr", name: "表情", order: 1, tags: [] },
  { id: "act", name: "行為", order: 2, tags: [] },
  { id: "outfit", name: "服装", order: 3, tags: [] },
  { id: "place", name: "場所", order: 4, tags: [] },
  { id: "comp", name: "構図", order: 5, tags: [] },
  { id: "light", name: "光・色調", order: 6, tags: [] },
  { id: "quality", name: "品質", order: 7, tags: [] },
];

export const INIT_PROMPTS = [
  { id: "p1", catId: "char", prompt: "1girl", label: "女の子", tagIds: [], order: 0 },
  { id: "p2", catId: "char", prompt: "1boy", label: "男の子", tagIds: [], order: 1 },
  { id: "p3", catId: "char", prompt: "blonde hair", label: "金髪", tagIds: [], order: 2 },
  { id: "p4", catId: "expr", prompt: "smile", label: "笑顔", tagIds: [], order: 0 },
  { id: "p5", catId: "expr", prompt: "crying", label: "泣き", tagIds: [], order: 1 },
  { id: "p6", catId: "act", prompt: "standing", label: "立ち", tagIds: [], order: 0 },
  { id: "p7", catId: "act", prompt: "jumping", label: "ジャンプ", tagIds: [], order: 1 },
  { id: "p8", catId: "outfit", prompt: "school uniform", label: "制服", tagIds: [], order: 0 },
  { id: "p9", catId: "outfit", prompt: "dress", label: "ドレス", tagIds: [], order: 1 },
  { id: "p10", catId: "place", prompt: "classroom", label: "教室", tagIds: [], order: 0 },
  { id: "p11", catId: "place", prompt: "forest", label: "森", tagIds: [], order: 1 },
  { id: "p12", catId: "comp", prompt: "close-up", label: "アップ", tagIds: [], order: 0 },
  { id: "p13", catId: "comp", prompt: "full body", label: "全身", tagIds: [], order: 1 },
  { id: "p14", catId: "light", prompt: "dramatic lighting", label: "ドラマチック", tagIds: [], order: 0 },
  { id: "p15", catId: "quality", prompt: "masterpiece", label: "傑作", tagIds: [], order: 0 },
  { id: "p16", catId: "quality", prompt: "best quality", label: "最高品質", tagIds: [], order: 1 },
  { id: "p17", catId: "quality", prompt: "lowres", label: "低解像度", tagIds: [], order: 2 },
  { id: "p18", catId: "quality", prompt: "bad anatomy", label: "破綻", tagIds: [], order: 3 },
];

export const PRESET_COLORS = [
  { hex: "", name: "デフォルト" },
  { hex: "#38bdf8", name: "ブルー" },
  { hex: "#34d399", name: "グリーン" },
  { hex: "#fbbf24", name: "ゴールド" },
  { hex: "#fb7185", name: "ピンク" },
  { hex: "#a78bfa", name: "パープル" },
  { hex: "#22d3ee", name: "シアン" },
  { hex: "#f97316", name: "オレンジ" },
  { hex: "#94a3b8", name: "グレー" },
];

export const SK = "nai-pg-v3";
export const SK_SAVED = "nai-pg-saved-v3";
export const SK_SETTINGS = "nai-pg-settings-v3";
export const SK_OLD = "nai-pg-v2";
export const SK_SAVED_OLD = "nai-pg-saved-v2";
