import { useState } from "react";
import { useCompStore, useSettingsStore } from "../../state/store";
import { parseV4 } from "../../lib/parser/v4";
import Btn from "../Common/Btn";

/**
 * 既存の V4 形式 pos / neg 文字列を貼り付けて Composition に取り込む。
 * NovelAI からコピペした文字列をそのまま編集可能な構造に戻せる。
 */
export default function ImportPanel() {
  const setComp = useCompStore((s) => s.setComp);
  const model = useSettingsStore((s) => s.model);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState("");
  const [neg, setNeg] = useState("");

  const submit = () => {
    if (!pos.trim() && !neg.trim()) return;
    const c = parseV4(pos, neg, model === "v3" ? "v4" : model);
    setComp(c);
    setPos(""); setNeg("");
    setOpen(false);
  };

  return (
    <div style={{ background: "var(--bg2)", borderRadius: 12, padding: 12, marginBottom: 12, border: "1px solid var(--bdr)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: open ? 8 : 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dim)" }}>📥 既存V4プロンプトを取り込み</span>
        <Btn on={() => setOpen(!open)} small style={{ marginLeft: "auto" }}>
          {open ? "閉じる" : "開く"}
        </Btn>
      </div>
      {open && (
        <>
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 6 }}>
            NovelAI でコピーした「||」区切りの V4 形式プロンプトを貼って読み込めます。
            既存の Composition は上書きされます。
          </div>
          <textarea
            value={pos} onChange={(e) => setPos(e.target.value)}
            rows={2}
            placeholder="ポジ: 例) 2girls || marisa || reimu"
            style={{ fontFamily: "'JetBrains Mono','Menlo',monospace", fontSize: 12, marginBottom: 6, resize: "vertical" }}
          />
          <textarea
            value={neg} onChange={(e) => setNeg(e.target.value)}
            rows={2}
            placeholder="ネガ: 例) lowres || blurry"
            style={{ fontFamily: "'JetBrains Mono','Menlo',monospace", fontSize: 12, marginBottom: 6, resize: "vertical" }}
          />
          <Btn on={submit} disabled={!pos.trim() && !neg.trim()} bg="var(--acc)" color="#000" border="none" small>取り込み</Btn>
        </>
      )}
    </div>
  );
}
