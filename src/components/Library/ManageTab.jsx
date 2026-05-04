import { PRESET_COLORS } from "../../lib/constants";
import Btn from "../Common/Btn";

export default function ManageTab({
  // category state
  sortedCats, manageCat, setManageCat, manageCatObj,
  // prompts list
  prompts, filteredManage, search, setSearch,
  // add prompt form
  newPrompt, setNewPrompt, newLabel, setNewLabel,
  newPromptTagIds, setNewPromptTagIds, newPromptTagInput, setNewPromptTagInput,
  promptRef, handleEmphasis, stripOuter, addPromptItem, quickAddTagForNew,
  // edit prompt
  editId, setEditId, editPrompt, setEditPrompt, editLabel, setEditLabel,
  editTagIds, setEditTagIds, editTagInput, setEditTagInput,
  startEdit, saveEdit, deletePrompt, movePromptItem, copyText, quickAddTagForEdit,
  // category mgmt
  newCatName, setNewCatName, addCategory,
  renameCatId, setRenameCatId, renameCatName, setRenameCatName,
  renameCategory, deleteCategory, setCatColor, moveCat,
  // tag mgmt
  newTagName, setNewTagName, addTag,
  renameTagId, setRenameTagId, renameTagName, setRenameTagName,
  renameTag, deleteTag, tagCount,
  // export/import
  exportList, importList, importListMerge,
}) {
  return (
    <div className="fi">
      {/* Add prompt section */}
      <div style={{ background: "var(--bg2)", borderRadius: 12, padding: 16, marginBottom: 18, border: "1px solid var(--bdr)" }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>プロンプト追加</div>
        <select value={manageCat} onChange={e => setManageCat(e.target.value)} style={{ marginBottom: 10, width: "auto", minWidth: 160 }}>
          {sortedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <Btn on={() => handleEmphasis("{", "}")} bg="var(--posBg)" color="var(--pos)" border="1px solid var(--posBdr)" small>{"{ } 強調"}</Btn>
          <Btn on={() => handleEmphasis("{{", "}}")} bg="var(--posBg)" color="var(--pos)" border="1px solid var(--posBdr)" small>{"{{ }} ×2"}</Btn>
          <Btn on={() => handleEmphasis("[", "]")} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>{"[ ] 弱化"}</Btn>
          <Btn on={stripOuter} small>括弧除去</Btn>
        </div>
        <textarea ref={promptRef} value={newPrompt} onChange={e => setNewPrompt(e.target.value)} placeholder="プロンプト (英語)　例: jumping" rows={2}
          style={{ fontFamily: "'JetBrains Mono','Menlo',monospace", fontSize: 15, marginBottom: 8, resize: "vertical" }} />
        {newPrompt && (
          <div style={{ marginBottom: 8, padding: "6px 12px", borderRadius: 8, background: "var(--bg0)", fontSize: 14 }}>
            <span style={{ color: "var(--dim)", marginRight: 6 }}>プレビュー:</span>
            <span className="mono">{newPrompt}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="表示名 (日本語)　例: ジャンプ" />
        </div>

        {/* tags chooser for new prompt */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 6 }}>タグ ({manageCatObj?.name} 用)</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {(manageCatObj?.tags || []).length === 0 && <span style={{ fontSize: 12, color: "var(--dim)" }}>既存タグなし — 下から作成</span>}
            {(manageCatObj?.tags || []).map(t => {
              const a = newPromptTagIds.includes(t.id);
              return (
                <button key={t.id} onClick={() => setNewPromptTagIds(arr => arr.includes(t.id) ? arr.filter(x => x !== t.id) : [...arr, t.id])} style={{
                  padding: "4px 10px", borderRadius: 14, fontSize: 12, fontWeight: 500,
                  background: a ? "var(--accDim)" : "var(--bg2)",
                  color: a ? "var(--acc)" : "var(--dim)",
                  border: a ? "1px solid var(--acc)" : "1px solid var(--bdr)",
                }}>#{t.name}</button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={newPromptTagInput} onChange={e => setNewPromptTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); quickAddTagForNew(); } }}
              placeholder="新規タグ名（Enter または +）" style={{ fontSize: 14 }} />
            <Btn on={quickAddTagForNew} small>＋ 新規タグ</Btn>
          </div>
        </div>

        <Btn on={addPromptItem} bg="var(--acc)" color="#000" border="none">追加</Btn>
      </div>

      {/* Existing prompts list */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>登録済みプロンプト</span>
          <select value={manageCat} onChange={e => setManageCat(e.target.value)} style={{ marginLeft: "auto", width: "auto", fontSize: 14 }}>
            {sortedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="検索..." style={{ marginBottom: 8 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 400, overflowY: "auto" }}>
          {filteredManage.length === 0 && <span style={{ color: "var(--dim)", fontSize: 14 }}>プロンプトなし</span>}
          {filteredManage.map((p, idx) => {
            const tagNames = (p.tagIds || []).map(tid => (manageCatObj?.tags || []).find(t => t.id === tid)?.name).filter(Boolean);
            const reorderDisabled = !!search;
            return (
              <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", borderRadius: 8, background: "var(--bg2)", borderLeft: `3px solid ${manageCatObj?.color || "var(--accDim)"}` }}>
                {editId === p.id ? (
                  <>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <input value={editPrompt} onChange={e => setEditPrompt(e.target.value)} style={{ flex: 1, minWidth: 160, fontSize: 14 }} />
                      <input value={editLabel} onChange={e => setEditLabel(e.target.value)} style={{ width: 140, fontSize: 14 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 4 }}>タグ</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                        {(manageCatObj?.tags || []).map(t => {
                          const a = editTagIds.includes(t.id);
                          return (
                            <button key={t.id} onClick={() => setEditTagIds(arr => arr.includes(t.id) ? arr.filter(x => x !== t.id) : [...arr, t.id])} style={{
                              padding: "4px 10px", borderRadius: 14, fontSize: 12,
                              background: a ? "var(--accDim)" : "var(--bg2)",
                              color: a ? "var(--acc)" : "var(--dim)",
                              border: a ? "1px solid var(--acc)" : "1px solid var(--bdr)",
                            }}>#{t.name}</button>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={editTagInput} onChange={e => setEditTagInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); quickAddTagForEdit(p.catId); } }}
                          placeholder="新規タグ名" style={{ fontSize: 13 }} />
                        <Btn on={() => quickAddTagForEdit(p.catId)} small>＋ 新規</Btn>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Btn on={() => saveEdit(p.id)} bg="var(--acc)" color="#000" border="none" small>保存</Btn>
                      <Btn on={() => setEditId(null)} small>取消</Btn>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Btn on={() => movePromptItem(p.id, -1)} disabled={reorderDisabled || idx === 0} small style={{ padding: "4px 8px" }} title={reorderDisabled ? "検索中は並び替え不可" : "上へ"}>↑</Btn>
                    <Btn on={() => movePromptItem(p.id, 1)} disabled={reorderDisabled || idx === filteredManage.length - 1} small style={{ padding: "4px 8px" }} title={reorderDisabled ? "検索中は並び替え不可" : "下へ"}>↓</Btn>
                    <span className="mono" style={{ fontSize: 14, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{p.prompt}</span>
                    <span style={{ fontSize: 13, color: "var(--dim)", flexShrink: 0 }}>{p.label}</span>
                    {tagNames.length > 0 && <span style={{ fontSize: 11, color: "var(--acc)", opacity: .7 }}>{tagNames.map(n => "#" + n).join(" ")}</span>}
                    <Btn on={() => copyText(p.prompt, p.label)} small>コピー</Btn>
                    <Btn on={() => startEdit(p)} small>編集</Btn>
                    <Btn on={() => deletePrompt(p.id)} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category management */}
      <div style={{ background: "var(--bg2)", borderRadius: 12, padding: 16, marginBottom: 18, border: "1px solid var(--bdr)" }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>カテゴリ管理</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="新しいカテゴリ名" />
          <Btn on={addCategory} bg="var(--acc)" color="#000" border="none">追加</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {sortedCats.map((c, idx) => (
            <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 12px", borderRadius: 8, background: "var(--bg0)", borderLeft: c.color ? `3px solid ${c.color}` : "3px solid transparent" }}>
              {renameCatId === c.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <input value={renameCatName} onChange={e => setRenameCatName(e.target.value)} style={{ flex: 1, fontSize: 14 }} />
                  <Btn on={() => renameCategory(c.id)} bg="var(--acc)" color="#000" border="none" small>保存</Btn>
                  <Btn on={() => setRenameCatId(null)} small>取消</Btn>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Btn on={() => moveCat(c.id, -1)} disabled={idx === 0} small style={{ padding: "6px 8px" }}>↑</Btn>
                    <Btn on={() => moveCat(c.id, 1)} disabled={idx === sortedCats.length - 1} small style={{ padding: "6px 8px" }}>↓</Btn>
                    <span style={{ flex: 1, fontSize: 14, minWidth: 120, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {c.color && <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: c.color }} />}
                      {c.name}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--dim)" }}>{prompts.filter(p => p.catId === c.id).length}件 / タグ{(c.tags || []).length}</span>
                    <Btn on={() => { setRenameCatId(c.id); setRenameCatName(c.name); }} small>名前変更</Btn>
                    <Btn on={() => { if (confirm(`「${c.name}」と中のプロンプトを全削除しますか？`)) deleteCategory(c.id); }} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--dim)" }}>色:</span>
                    {PRESET_COLORS.map(pc => (
                      <button key={pc.hex || "none"} onClick={() => setCatColor(c.id, pc.hex)} title={pc.name} style={{
                        width: 22, height: 22, borderRadius: "50%", cursor: "pointer",
                        background: pc.hex || "transparent",
                        border: (c.color || "") === pc.hex ? "2px solid var(--txt)" : "1px solid var(--bdr)",
                        position: "relative",
                      }}>{!pc.hex && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--dim)" }}>×</span>}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tag management for current category */}
      {manageCatObj && (
        <div style={{ background: "var(--bg2)", borderRadius: 12, padding: 16, marginBottom: 18, border: "1px solid var(--bdr)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>タグ管理（{manageCatObj.name}）</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={newTagName} onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="新しいタグ名" />
            <Btn on={addTag} bg="var(--acc)" color="#000" border="none">追加</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {(manageCatObj.tags || []).length === 0 && <span style={{ color: "var(--dim)", fontSize: 13 }}>タグなし</span>}
            {(manageCatObj.tags || []).map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, background: "var(--bg0)", flexWrap: "wrap" }}>
                {renameTagId === t.id ? (
                  <>
                    <input value={renameTagName} onChange={e => setRenameTagName(e.target.value)} style={{ flex: 1, fontSize: 14 }} />
                    <Btn on={() => renameTag(manageCatObj.id, t.id)} bg="var(--acc)" color="#000" border="none" small>保存</Btn>
                    <Btn on={() => setRenameTagId(null)} small>取消</Btn>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 14, minWidth: 120 }}>#{t.name}</span>
                    <span style={{ fontSize: 12, color: "var(--dim)" }}>{tagCount(manageCatObj.id, t.id)}件使用</span>
                    <Btn on={() => { setRenameTagId(t.id); setRenameTagName(t.name); }} small>名前変更</Btn>
                    <Btn on={() => { if (confirm(`タグ「${t.name}」を削除しますか？`)) deleteTag(manageCatObj.id, t.id); }} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* export/import */}
      <div style={{ background: "var(--bg2)", borderRadius: 12, padding: 16, border: "1px solid var(--bdr)" }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>プロンプト一覧の書き出し／読み込み</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn on={exportList}>📥 書き出し (JSON)</Btn>
          <label style={{ padding: "10px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", background: "var(--bg2)", color: "var(--dim)", border: "1px solid var(--bdr)", display: "inline-flex", alignItems: "center" }}>
            📤 置換読み込み
            <input type="file" accept=".json" style={{ display: "none" }} onChange={importList} />
          </label>
          <label style={{ padding: "10px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", background: "var(--accDim)", color: "var(--acc)", border: "1px solid var(--acc)", display: "inline-flex", alignItems: "center" }}>
            ➕ マージ読み込み
            <input type="file" accept=".json" style={{ display: "none" }} onChange={importListMerge} />
          </label>
        </div>
        <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>
          ・置換: 現在のデータが完全に置き換わります<br />
          ・マージ: 既存に追加。同名カテゴリ／タグは統合、同じ英文＋表示名のプロンプトはスキップします
        </div>
      </div>
    </div>
  );
}
