export const uid = () => Math.random().toString(36).slice(2, 10);

export const now = () =>
  new Date().toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

export const sortByOrder = (arr) => [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export const assignPromptOrders = (arr) => {
  const counters = {};
  return arr.map(p => {
    if (typeof p.order === "number") return p;
    const c = counters[p.catId] = (counters[p.catId] ?? -1) + 1;
    return { ...p, order: c };
  });
};

export const catColor = (c) => c?.color || "var(--acc)";

export const wrap = (text, w) => {
  let r = text;
  if (w > 0) for (let i = 0; i < w; i++) r = "{" + r + "}";
  if (w < 0) for (let i = 0; i < -w; i++) r = "[" + r + "]";
  return r;
};
