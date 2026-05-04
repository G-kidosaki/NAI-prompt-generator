import Btn from "../Common/Btn";

export default function SelectionBar({
  selCount, sortedSels, sortedCats, posOut, negOut,
  setWeight, flipSel, removeSel, clearAll,
}) {
  return (
    <div style={{
      flexShrink: 0, borderTop: "1px solid var(--bdr)", background: "var(--bg0)",
      padding: `10px 16px calc(10px + var(--safe-b))`,
      maxHeight: 200, overflowY: "auto",
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: selCount > 0 ? 6 : 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dim)" }}>選択中 ({selCount})</span>
          {selCount > 0 && <Btn on={clearAll} small style={{ marginLeft: "auto" }}>全解除</Btn>}
        </div>
        {selCount > 0 && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 80, overflowY: "auto", marginBottom: 6 }}>
              {sortedSels.map(({ id, s, p }, i) => {
                const prev = sortedSels[i - 1];
                const showSep = i > 0 && prev && prev.p.catId !== p.catId;
                const cat = sortedCats.find(c => c.id === p.catId);
                return (
                  <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {showSep && <span style={{ width: 1, alignSelf: "stretch", background: "var(--bdr)", margin: "0 2px" }} />}
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 8px", borderRadius: 6, fontSize: 12,
                      background: s.neg ? "var(--negBg)" : "var(--posBg)",
                      border: `1px solid ${s.neg ? "var(--negBdr)" : "var(--posBdr)"}`,
                      color: s.neg ? "var(--neg)" : "var(--pos)",
                    }}>
                      <button onClick={() => setWeight(id, -1)} title="弱める" style={{ background: "none", color: "inherit", fontSize: 16, padding: "0 3px", lineHeight: 1 }}>−</button>
                      <span className="mono" style={{ fontSize: 11, minWidth: 16, textAlign: "center" }}>{s.w > 0 ? "+" + s.w : s.w}</span>
                      <button onClick={() => setWeight(id, 1)} title="強める" style={{ background: "none", color: "inherit", fontSize: 16, padding: "0 3px", lineHeight: 1 }}>+</button>
                      <button onClick={() => flipSel(id)} title="ポジ／ネガを切替" style={{ background: "none", color: "inherit", fontSize: 12, padding: "0 4px", lineHeight: 1, fontWeight: 700 }}>{s.neg ? "⊖" : "⊕"}</button>
                      <span style={{ margin: "0 2px" }} title={cat?.name || ""}>{p.label}</span>
                      <button onClick={() => removeSel(id)} title="削除" style={{ background: "none", color: "inherit", fontSize: 16, padding: "0 3px", opacity: .5, lineHeight: 1 }}>×</button>
                    </div>
                  </span>
                );
              })}
            </div>
            <div className="mono" style={{ padding: "5px 8px", borderRadius: 6, background: "var(--bg2)", fontSize: 11, color: "var(--dim)", wordBreak: "break-all", lineHeight: 1.5 }}>
              {posOut && <div><span style={{ color: "var(--pos)", fontWeight: 700 }}>P:</span> {posOut}</div>}
              {negOut && <div><span style={{ color: "var(--neg)", fontWeight: 700 }}>N:</span> {negOut}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
