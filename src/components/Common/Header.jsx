export default function Header({ tab, setTab, setSearch }) {
  return (
    <div style={{ padding: `calc(12px + var(--safe-t)) 16px 10px`, flexShrink: 0, borderBottom: "1px solid var(--bdr)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 960, margin: "0 auto", flexWrap: "wrap" }}>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.5px", color: "var(--acc)" }}>NAI</span>
        <span style={{ fontSize: 14, color: "var(--dim)" }}>Prompt Generator</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 3, background: "var(--bg2)", borderRadius: 10, padding: 3 }}>
          {[["select", "選択"], ["manage", "追加・管理"], ["output", "出力"]].map(([k, v]) => (
            <button key={k} onClick={() => { setTab(k); setSearch(""); }} style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500,
              background: tab === k ? "var(--acc)" : "transparent",
              color: tab === k ? "#0b0e14" : "var(--dim)",
            }}>{v}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
