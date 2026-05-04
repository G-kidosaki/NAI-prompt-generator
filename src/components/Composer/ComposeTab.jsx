import ComposerRoot from "./ComposerRoot";
import Btn from "../Common/Btn";

/**
 * 編集タブのルート。model に応じて V3 ガイド / V4・V4.5 の Composer を表示。
 */
export default function ComposeTab({ model, setModel, selCount }) {
  if (model === "v3") {
    return (
      <div className="fi" style={{ padding: "24px 12px" }}>
        <div style={{
          background: "var(--bg2)", borderRadius: 12, padding: 24, border: "1px solid var(--bdr)",
          maxWidth: 560, margin: "40px auto 0",
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>📦 V3 モードでは編集画面は不要です</div>
          <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.7, marginBottom: 16 }}>
            V3 は <strong>「🧱 ライブラリ」</strong>でプロンプトを選び、
            <strong>「📤 出力」</strong>でコピー／送信するシンプルなフローです。
            現在の選択数: <strong style={{ color: "var(--acc)" }}>{selCount} 件</strong>
            <br /><br />
            複数キャラ・数値強調・アクション主体タグ・T5 自然文などの高度な機能を使うには
            <strong style={{ color: "var(--acc)" }}> V4 / V4.5</strong> モードに切り替えてください。
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn on={() => setModel("v4")} bg="var(--acc)" color="#000" border="none">V4 に切り替え</Btn>
            <Btn on={() => setModel("v4.5")}>V4.5 に切り替え</Btn>
          </div>
        </div>
      </div>
    );
  }
  return <ComposerRoot />;
}
