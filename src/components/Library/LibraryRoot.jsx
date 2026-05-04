import SelectTab from "./SelectTab";
import ManageTab from "./ManageTab";

/**
 * ライブラリタブのルート。閲覧 / 管理 を sub-nav で切替。
 * 旧「選択」と「追加・管理」を一つに統合し、トップレベルのタブ数を減らす。
 */
export default function LibraryRoot({ subTab, setSubTab, selectProps, manageProps }) {
  return (
    <div>
      {/* sub-nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, background: "var(--bg2)", borderRadius: 10, padding: 3, width: "fit-content" }}>
        {[
          { id: "browse", label: "📖 閲覧（プロンプトを選ぶ）", hint: "クリックで現在の編集対象に追加" },
          { id: "manage", label: "✏️ 管理（追加・編集）",       hint: "プロンプト・カテゴリ・タグの CRUD と JSON 入出力" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            title={t.hint}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: subTab === t.id ? "var(--accDim)" : "transparent",
              color: subTab === t.id ? "var(--acc)" : "var(--dim)",
              border: subTab === t.id ? "1px solid var(--acc)" : "1px solid transparent",
            }}
          >{t.label}</button>
        ))}
      </div>

      {subTab === "browse" && <SelectTab {...selectProps} />}
      {subTab === "manage" && <ManageTab {...manageProps} />}
    </div>
  );
}
