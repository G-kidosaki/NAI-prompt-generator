export default function Header({ tab, setTab, setSearch, model, setModel }) {
  const models = [
    { id: "v3", label: "V3", enabled: true,
      hint: "V3 モード\n選択タブで使うフラットなプロンプト。{} / [] で強調、カンマ区切りで出力。複数キャラ非対応。" },
    { id: "v4", label: "V4", enabled: true,
      hint: "V4 モード\n🪄 V4作成タブで複数キャラを別パネルに分けて編集。|| 区切り、source#/target#/mutual#、1.3::tag:: 数値強調が使える。" },
    { id: "v4.5", label: "V4.5", enabled: true,
      hint: "V4.5 モード\nV4 の機能に加え、T5 自然文プロンプト欄が有効。タグでは表現しづらい要素を自然文で書ける。" },
  ];
  return (
    <div style={{ padding: `calc(12px + var(--safe-t)) 16px 10px`, flexShrink: 0, borderBottom: "1px solid var(--bdr)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 960, margin: "0 auto", flexWrap: "wrap" }}>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.5px", color: "var(--acc)" }}>NAI</span>
        <span style={{ fontSize: 14, color: "var(--dim)" }}>Prompt Generator</span>

        {setModel && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
            <span style={{ fontSize: 11, color: "var(--dim)" }}>model:</span>
            <div style={{ display: "flex", gap: 2, background: "var(--bg2)", borderRadius: 8, padding: 2 }}>
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => m.enabled && setModel(m.id)}
                  disabled={!m.enabled}
                  title={m.hint || `${m.label}`}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: model === m.id ? "var(--acc)" : "transparent",
                    color: model === m.id ? "#0b0e14" : (m.enabled ? "var(--dim)" : "var(--bdr)"),
                    cursor: m.enabled ? "pointer" : "not-allowed",
                  }}
                >{m.label}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 3, background: "var(--bg2)", borderRadius: 10, padding: 3 }}>
          {[["select", "選択"], ["compose", "🪄 V4作成"], ["manage", "追加・管理"], ["output", "出力"]].map(([k, v]) => (
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
