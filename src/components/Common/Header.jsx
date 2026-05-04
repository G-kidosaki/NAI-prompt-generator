export default function Header({ tab, setTab, setSearch, model, setModel }) {
  // タブを 3 つに集約: ライブラリ / 編集 / 出力
  // 「編集」は model に応じて V3 フラット選択 or V4 コンポーザに変身する
  const tabs = [
    { id: "library", label: "🧱 ライブラリ", hint: "プロンプト・タグの登録／編集／インポート" },
    { id: "compose", label: "🪄 編集",       hint: "現在のモードに合わせた編集画面（V3=選択、V4/V4.5=コンポーザ）" },
    { id: "output",  label: "📤 出力",       hint: "完成プロンプトのプレビュー・コピー・送信" },
  ];

  const models = [
    { id: "v3",   label: "V3",
      hint: "V3 モード\n単純なフラットなプロンプト。{} / [] 強調、カンマ区切り出力。複数キャラ非対応。" },
    { id: "v4",   label: "V4",
      hint: "V4 モード\n複数キャラを別パネルで編集。|| 区切り、source#/target#/mutual#、1.3::tag:: 数値強調。" },
    { id: "v4.5", label: "V4.5",
      hint: "V4.5 モード\nV4 機能 ＋ T5 自然文プロンプト欄。タグで表現しづらい要素を自然文で書ける。" },
  ];

  return (
    <div style={{ padding: `calc(12px + var(--safe-t)) 16px 10px`, flexShrink: 0, borderBottom: "1px solid var(--bdr)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 960, margin: "0 auto", flexWrap: "wrap" }}>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.5px", color: "var(--acc)" }}>NAI</span>
        <span style={{ fontSize: 13, color: "var(--dim)" }}>Prompt Gen</span>

        {/* model selector — 視認性UP */}
        {setModel && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 6, padding: "2px 6px", background: "var(--bg2)", borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: "var(--dim)" }}>model</span>
            <div style={{ display: "flex", gap: 2 }}>
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  title={m.hint}
                  style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                    background: model === m.id ? "var(--acc)" : "transparent",
                    color: model === m.id ? "#0b0e14" : "var(--dim)",
                    cursor: "pointer",
                  }}
                >{m.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* main tab nav */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 3, background: "var(--bg2)", borderRadius: 10, padding: 3 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch(""); }}
              title={t.hint}
              style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: tab === t.id ? "var(--acc)" : "transparent",
                color: tab === t.id ? "#0b0e14" : "var(--dim)",
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
