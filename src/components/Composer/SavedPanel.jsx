import { useState } from "react";
import LZString from "lz-string";
import { useCompStore } from "../../state/store";
import Btn from "../Common/Btn";

const encodeShareUrl = (comp) => {
  const json = JSON.stringify(comp);
  const b64 = LZString.compressToEncodedURIComponent(json);
  const base = window.location.origin + window.location.pathname;
  return `${base}#comp=${b64}`;
};

export default function SavedPanel() {
  const comp = useCompStore((s) => s.comp);
  const saved = useCompStore((s) => s.saved);
  const saveCurrent = useCompStore((s) => s.saveCurrent);
  const loadSaved = useCompStore((s) => s.loadSaved);
  const deleteSaved = useCompStore((s) => s.deleteSaved);

  const [name, setName] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const onSave = () => {
    saveCurrent(name);
    setName("");
  };

  const onShare = async () => {
    const url = encodeShareUrl(comp);
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div style={{ background: "var(--bg2)", borderRadius: 12, padding: 12, marginBottom: 12, border: "1px solid var(--bdr)" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)", marginBottom: 8 }}>★ 保存／共有</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="保存名（空欄で自動命名）"
          style={{ fontSize: 13 }}
        />
        <Btn on={onSave} bg="var(--goldBdr)" color="#fff" border="none" small>💾 保存</Btn>
        <Btn on={onShare} small>🔗 URL 共有</Btn>
      </div>

      {shareUrl && (
        <div style={{ marginBottom: 10, padding: 8, borderRadius: 6, background: "var(--bg0)", fontSize: 11, wordBreak: "break-all" }}>
          <div style={{ marginBottom: 4, color: copied ? "var(--pos)" : "var(--dim)" }}>
            {copied ? "✓ クリップボードにコピーしました" : "↓ URL（手動でコピーしてください）"}
          </div>
          <div className="mono" style={{ userSelect: "all" }}>{shareUrl}</div>
        </div>
      )}

      {saved.length === 0 ? (
        <div style={{ fontSize: 11, color: "var(--dim)" }}>まだ保存された Composition はありません。</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {saved.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 6, background: "var(--bg0)" }}>
              <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.name || "(無名)"}
              </span>
              <span style={{ fontSize: 10, color: "var(--dim)" }}>
                {c.model} ／ {c.characters.length}キャラ
              </span>
              <Btn on={() => loadSaved(c.id)} small>📂 読込</Btn>
              <Btn on={() => { if (confirm(`「${c.name}」を削除しますか？`)) deleteSaved(c.id); }} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
