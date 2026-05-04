const DATASETS = [
  { id: "anime",      label: "🌸 anime",      tag: null,                 hint: "デフォルト（Anime データセット）" },
  { id: "fur",        label: "🐾 fur",        tag: "fur dataset",        hint: "e621 寄りの絵柄（fur dataset）" },
  { id: "background", label: "🏞 background", tag: "background dataset", hint: "風景・物体メインのイラスト（background dataset）" },
  { id: "location",   label: "📍 location",   tag: "location",           hint: "indoor/outdoor 不問で背景を要求（location）" },
];

const findActive = (positives) => {
  for (const d of DATASETS) {
    if (d.tag && positives.some((t) => t.text === d.tag)) return d.id;
  }
  return "anime";
};

export default function DatasetSelector({ basePositives, onSet }) {
  const active = findActive(basePositives);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
      <span style={{ fontSize: 12, color: "var(--dim)" }}>データセット:</span>
      {DATASETS.map((d) => (
        <button
          key={d.id}
          title={d.hint}
          onClick={() => onSet(d.id, d.tag)}
          style={{
            padding: "4px 10px", borderRadius: 14, fontSize: 12, fontWeight: 600,
            background: active === d.id ? "var(--accDim)" : "var(--bg2)",
            color: active === d.id ? "var(--acc)" : "var(--dim)",
            border: active === d.id ? "1px solid var(--acc)" : "1px solid var(--bdr)",
          }}
        >{d.label}</button>
      ))}
    </div>
  );
}
