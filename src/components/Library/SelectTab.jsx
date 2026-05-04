import { catColor } from "../../lib/utils";

export default function SelectTab({
  sortedCats, prompts, sels, activeCat, setActiveCat,
  search, setSearch, tagFilter, setTagFilter,
  addMode, setAddMode, activeCatObj, filteredSelect,
  toggleSel, copyText,
}) {
  return (
    <div className="fi">
      {/* category tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, marginBottom: 10, WebkitOverflowScrolling: "touch" }}>
        {sortedCats.map((c) => {
          const cnt = prompts.filter(p => p.catId === c.id && sels[p.id]).length;
          const a = activeCat === c.id;
          const col = catColor(c);
          return (
            <button key={c.id} onClick={() => { setActiveCat(c.id); setSearch(""); setTagFilter([]); }} style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 14, fontWeight: 500, whiteSpace: "nowrap",
              display: "inline-flex", alignItems: "center", gap: 6,
              background: a ? "var(--accDim)" : "var(--bg2)",
              color: a ? col : "var(--dim)",
              border: a ? `1px solid ${col}` : "1px solid var(--bdr)",
            }}>
              {c.color && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />}
              {c.name}{cnt > 0 && <span style={{ marginLeft: 2, fontSize: 11, opacity: .7 }}>({cnt})</span>}
            </button>
          );
        })}
      </div>

      {/* mode toggle (insert as positive/negative) */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--dim)" }}>追加モード:</span>
        {[["positive", "⊕ ポジティブ", "--pos", "--posBg", "--posBdr"], ["negative", "⊖ ネガティブ", "--neg", "--negBg", "--negBdr"]].map(([k, l, c, bg, bd]) => (
          <button key={k} onClick={() => setAddMode(k)} style={{
            padding: "6px 14px", borderRadius: 18, fontSize: 13, fontWeight: 600,
            background: addMode === k ? `var(${bg})` : "var(--bg2)",
            color: addMode === k ? `var(${c})` : "var(--dim)",
            border: addMode === k ? `2px solid var(${bd})` : "1px solid var(--bdr)",
          }}>{l}</button>
        ))}
      </div>

      {/* tag filter */}
      {activeCatObj && (activeCatObj.tags || []).length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--dim)" }}>タグ:</span>
          <button onClick={() => setTagFilter([])} style={{
            padding: "4px 10px", borderRadius: 14, fontSize: 12, fontWeight: 500,
            background: tagFilter.length === 0 ? "var(--accDim)" : "var(--bg2)",
            color: tagFilter.length === 0 ? "var(--acc)" : "var(--dim)",
            border: tagFilter.length === 0 ? "1px solid var(--acc)" : "1px solid var(--bdr)",
          }}>すべて</button>
          {(activeCatObj.tags || []).map(t => {
            const a = tagFilter.includes(t.id);
            return (
              <button key={t.id} onClick={() => setTagFilter(tf => tf.includes(t.id) ? tf.filter(x => x !== t.id) : [...tf, t.id])} style={{
                padding: "4px 10px", borderRadius: 14, fontSize: 12, fontWeight: 500,
                background: a ? "var(--accDim)" : "var(--bg2)",
                color: a ? "var(--acc)" : "var(--dim)",
                border: a ? "1px solid var(--acc)" : "1px solid var(--bdr)",
              }}>#{t.name}</button>
            );
          })}
        </div>
      )}

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="検索..." style={{ marginBottom: 14 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, minHeight: 60 }}>
        {filteredSelect.length === 0 && <span style={{ color: "var(--dim)", fontSize: 14, padding: 12 }}>プロンプトがありません</span>}
        {filteredSelect.map((p) => {
          const sel = sels[p.id];
          const tagNames = (p.tagIds || []).map(tid => (activeCatObj?.tags || []).find(t => t.id === tid)?.name).filter(Boolean);
          return (
            <button key={p.id}
              onClick={() => toggleSel(p.id)}
              onDoubleClick={(e) => { e.preventDefault(); copyText(p.prompt, p.label); }}
              title="クリック: 選択／ダブルクリック: コピー"
              className={sel ? "pop" : ""} style={{
                padding: "10px 16px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                border: sel ? `2px solid ${sel.neg ? "var(--negBdr)" : "var(--posBdr)"}` : "1px solid var(--bdr)",
                background: sel ? (sel.neg ? "var(--negBg)" : "var(--posBg)") : "var(--bg2)",
                color: sel ? (sel.neg ? "var(--neg)" : "var(--pos)") : "var(--txt)",
                borderLeft: activeCatObj?.color ? `4px solid ${activeCatObj.color}` : undefined,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
              <span style={{ fontSize: 12, opacity: .6 }}>{sel ? (sel.neg ? "⊖" : "⊕") : "·"}</span>
              <span>{p.label}</span>
              <span className="mono" style={{ fontSize: 11, opacity: .4 }}>{p.prompt}</span>
              {tagNames.length > 0 && <span style={{ fontSize: 10, opacity: .5 }}>{tagNames.map(n => "#" + n).join(" ")}</span>}
              <span style={{ fontSize: 10, opacity: .4, marginLeft: 2 }}>📋</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
