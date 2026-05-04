import Btn from "../Common/Btn";
import { approxClipTokens, approxT5Tokens } from "../../lib/tokens";

export default function OutputTab({
  posOut, negOut, copyText,
  isExtension, sendMode, setSendMode, sending,
  handleSendToNovelAI, handlePickTarget, handleResetTargets,
  sortedCats,
  saveName, setSaveName, savePosCatId, setSavePosCatId, saveNegCatId, setSaveNegCatId,
  saveOutput,
  t5Out, perCharacter, model,
}) {
  const showT5 = model === "v4.5" && t5Out;
  const hasPerChar = (perCharacter || []).length > 0;
  return (
    <div className="fi">
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--pos)" }}>⊕ ポジティブ</span>
          {posOut && <span style={{ fontSize: 11, color: "var(--dim)" }}>~{approxClipTokens(posOut)} tok</span>}
          <Btn on={() => copyText(posOut, "ポジティブ")} disabled={!posOut} bg={posOut ? "var(--posBdr)" : undefined} color={posOut ? "#fff" : undefined} border="none" small style={{ marginLeft: "auto" }}>コピー</Btn>
        </div>
        <div className="mono" onDoubleClick={() => copyText(posOut, "ポジティブ")} title="ダブルクリックでコピー" style={{ padding: 14, borderRadius: 10, fontSize: 14, lineHeight: 1.7, minHeight: 50, wordBreak: "break-all", background: "var(--bg2)", border: "1px solid var(--posBdr)", color: "var(--pos)", userSelect: "all", WebkitUserSelect: "all", cursor: posOut ? "pointer" : "default" }}>{posOut || <span style={{ opacity: .35 }}>（未選択）</span>}</div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--neg)" }}>⊖ ネガティブ</span>
          {negOut && <span style={{ fontSize: 11, color: "var(--dim)" }}>~{approxClipTokens(negOut)} tok</span>}
          <Btn on={() => copyText(negOut, "ネガティブ")} disabled={!negOut} bg={negOut ? "var(--negBdr)" : undefined} color={negOut ? "#fff" : undefined} border="none" small style={{ marginLeft: "auto" }}>コピー</Btn>
        </div>
        <div className="mono" onDoubleClick={() => copyText(negOut, "ネガティブ")} title="ダブルクリックでコピー" style={{ padding: 14, borderRadius: 10, fontSize: 14, lineHeight: 1.7, minHeight: 50, wordBreak: "break-all", background: "var(--bg2)", border: "1px solid var(--negBdr)", color: "var(--neg)", userSelect: "all", WebkitUserSelect: "all", cursor: negOut ? "pointer" : "default" }}>{negOut || <span style={{ opacity: .35 }}>（未選択）</span>}</div>
      </div>

      {showT5 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--acc)" }}>📝 T5 自然文</span>
            <span style={{ fontSize: 11, color: "var(--dim)" }}>~{approxT5Tokens(t5Out)} tok</span>
            <Btn on={() => copyText(t5Out, "T5")} bg="var(--accDim)" color="var(--acc)" border="1px solid var(--acc)" small style={{ marginLeft: "auto" }}>コピー</Btn>
          </div>
          <div className="mono" onDoubleClick={() => copyText(t5Out, "T5")} style={{ padding: 14, borderRadius: 10, fontSize: 13, lineHeight: 1.6, background: "var(--bg2)", border: "1px solid var(--acc)", color: "var(--acc)", userSelect: "all", WebkitUserSelect: "all", cursor: "pointer", whiteSpace: "pre-wrap" }}>{t5Out}</div>
        </div>
      )}

      {hasPerChar && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dim)", marginBottom: 6 }}>
            🪄 キャラクター別ペイロード（V4 NovelAI のキャラ枠用）
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(perCharacter || []).map((c, i) => (
              <div key={i} className="mono" style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg2)", border: "1px solid var(--bdr)", fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 4, fontWeight: 700 }}>Character {i + 1}{c.bias && ` @ (${c.bias.x.toFixed(2)}, ${c.bias.y.toFixed(2)})`}</div>
                {c.pos && <div><span style={{ color: "var(--pos)", fontWeight: 700 }}>P:</span> {c.pos}</div>}
                {c.neg && <div><span style={{ color: "var(--neg)", fontWeight: 700 }}>N:</span> {c.neg}</div>}
                {!c.pos && !c.neg && <span style={{ opacity: .4 }}>（空）</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send to NovelAI (extension only) */}
      {isExtension && (
        <div style={{ background: "var(--bg2)", borderRadius: 12, padding: 16, marginBottom: 18, border: "1px solid var(--acc)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: "var(--acc)" }}>🪄 NovelAI へ送信</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--dim)" }}>送信モード:</span>
            {[["overwrite", "上書き"], ["append", "末尾追加"]].map(([k, l]) => (
              <button key={k} onClick={() => setSendMode(k)} style={{
                padding: "6px 14px", borderRadius: 18, fontSize: 13, fontWeight: 600,
                background: sendMode === k ? "var(--accDim)" : "var(--bg0)",
                color: sendMode === k ? "var(--acc)" : "var(--dim)",
                border: sendMode === k ? "2px solid var(--acc)" : "1px solid var(--bdr)",
              }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <Btn on={() => handleSendToNovelAI()} disabled={sending || (!posOut && !negOut)} bg="var(--acc)" color="#000" border="none">
              {sending ? "送信中..." : "NovelAI へ送信"}
            </Btn>
            <Btn on={() => handlePickTarget("pos")} small>🎯 ポジ要素を選択</Btn>
            <Btn on={() => handlePickTarget("neg")} small>🎯 ネガ要素を選択</Btn>
            <Btn on={handleResetTargets} small>リセット</Btn>
          </div>
          <div style={{ fontSize: 11, color: "var(--dim)" }}>
            NovelAI Image Generator (https://novelai.net/image) を開いた状態で送信してください。<br />
            要素が見つからない場合は「🎯」ボタンで対象 textarea を直接選択できます。
          </div>
        </div>
      )}

      {/* Save section: 完成プロンプトを既存カテゴリに追加 */}
      <div style={{ background: "var(--bg2)", borderRadius: 12, padding: 16, marginBottom: 18, border: "1px solid var(--goldBdr)" }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: "var(--gold)" }}>★ 完成プロンプトをカテゴリに追加</div>
        <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 10 }}>
          保存先のカテゴリを選んでください。プロンプトリストに新規エントリとして追加され、選択タブから再利用できます。
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--pos)", fontWeight: 600, minWidth: 90 }}>⊕ ポジ →</span>
          <select value={savePosCatId} onChange={e => setSavePosCatId(e.target.value)} disabled={!posOut} style={{ flex: 1, minWidth: 140, fontSize: 14, opacity: posOut ? 1 : .4 }}>
            {sortedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--neg)", fontWeight: 600, minWidth: 90 }}>⊖ ネガ →</span>
          <select value={saveNegCatId} onChange={e => setSaveNegCatId(e.target.value)} disabled={!negOut} style={{ flex: 1, minWidth: 140, fontSize: 14, opacity: negOut ? 1 : .4 }}>
            {sortedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="表示名（空欄で自動命名）" />
          <Btn on={saveOutput} disabled={!posOut && !negOut} bg="var(--goldBdr)" color="#fff" border="none">追加</Btn>
        </div>
      </div>
    </div>
  );
}
