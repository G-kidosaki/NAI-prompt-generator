import { useState, useEffect, useMemo, useRef } from "react";
import storage from "./storage";
import { isExtension, sendToNovelAI, pickTarget, resetTargets } from "./extension/bridge";
import { sortByOrder } from "./lib/utils";
import { serialize } from "./lib/serializer";
import { migrateOldSavedToPrompts } from "./lib/migrate";
import {
  SK_SAVED, SK_SAVED_OLD,
} from "./lib/constants";
import { useLibraryStore, useSettingsStore } from "./state/store";
import GlobalStyles from "./components/Common/GlobalStyles";
import Header from "./components/Common/Header";
import Toast from "./components/Common/Toast";
import SelectTab from "./components/Library/SelectTab";
import ManageTab from "./components/Library/ManageTab";
import OutputTab from "./components/Output/OutputTab";
import SelectionBar from "./components/Output/SelectionBar";

export default function App() {
  /* ── library state (Zustand) ── */
  const cats = useLibraryStore((s) => s.cats);
  const prompts = useLibraryStore((s) => s.prompts);
  const sels = useLibraryStore((s) => s.sels);
  const replaceLibrary = useLibraryStore((s) => s.replaceLibrary);

  // selection ops
  const toggleSelStore = useLibraryStore((s) => s.toggleSel);
  const setWeight = useLibraryStore((s) => s.setWeight);
  const flipSel = useLibraryStore((s) => s.flipSel);
  const removeSel = useLibraryStore((s) => s.removeSel);
  const clearAll = useLibraryStore((s) => s.clearAll);

  // prompt ops
  const addPromptStore = useLibraryStore((s) => s.addPrompt);
  const updatePromptStore = useLibraryStore((s) => s.updatePrompt);
  const deletePromptStore = useLibraryStore((s) => s.deletePrompt);
  const movePromptStore = useLibraryStore((s) => s.movePrompt);

  // category ops
  const addCategoryStore = useLibraryStore((s) => s.addCategory);
  const renameCategoryStore = useLibraryStore((s) => s.renameCategory);
  const setCatColor = useLibraryStore((s) => s.setCatColor);
  const deleteCategoryStore = useLibraryStore((s) => s.deleteCategory);
  const moveCat = useLibraryStore((s) => s.moveCat);

  // tag ops
  const addTagToCat = useLibraryStore((s) => s.addTagToCat);
  const renameTagStore = useLibraryStore((s) => s.renameTag);
  const deleteTagStore = useLibraryStore((s) => s.deleteTag);

  /* ── settings state (Zustand) ── */
  const sendMode = useSettingsStore((s) => s.sendMode);
  const setSendMode = useSettingsStore((s) => s.setSendMode);
  const model = useSettingsStore((s) => s.model);
  const setModel = useSettingsStore((s) => s.setModel);
  const migratedSaved = useSettingsStore((s) => s.migratedSaved);
  const setMigratedSaved = useSettingsStore((s) => s.setMigratedSaved);

  /* ── ui state (local) ── */
  const [tab, setTab] = useState("select");
  const [activeCat, setActiveCat] = useState("char");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState([]);
  const [addMode, setAddMode] = useState("positive");

  /* ── manage state (local) ── */
  const [manageCat, setManageCat] = useState("char");
  const [newPrompt, setNewPrompt] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newPromptTagIds, setNewPromptTagIds] = useState([]);
  const [newPromptTagInput, setNewPromptTagInput] = useState("");
  const [editId, setEditId] = useState(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editTagIds, setEditTagIds] = useState([]);
  const [editTagInput, setEditTagInput] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [renameCatId, setRenameCatId] = useState(null);
  const [renameCatName, setRenameCatName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [renameTagId, setRenameTagId] = useState(null);
  const [renameTagName, setRenameTagName] = useState("");

  /* ── output state (local) ── */
  const [saveName, setSaveName] = useState("");
  const [savePosCatId, setSavePosCatId] = useState("");
  const [saveNegCatId, setSaveNegCatId] = useState("");

  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const promptRef = useRef(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  /* ── 旧 saved (savedCats/saved) → 既存カテゴリへの一括移行（一度だけ実行）
        Zustand persist のハイドレート完了後に走らせる ── */
  useEffect(() => {
    let cancelled = false;
    const waitHydration = (store) => new Promise((resolve) => {
      const p = store.persist;
      if (!p || p.hasHydrated?.()) { resolve(); return; }
      const unsub = p.onFinishHydration?.(() => { unsub?.(); resolve(); });
      if (!unsub) resolve();
    });
    (async () => {
      await Promise.all([waitHydration(useLibraryStore), waitHydration(useSettingsStore)]);
      if (cancelled) return;
      if (useSettingsStore.getState().migratedSaved) return;

      try {
        let oldData = null;
        const r2 = await storage.get(SK_SAVED);
        if (r2?.value) oldData = JSON.parse(r2.value);
        else {
          const old2 = await storage.get(SK_SAVED_OLD);
          if (old2?.value) oldData = JSON.parse(old2.value);
        }
        if (oldData) {
          const cur = useLibraryStore.getState();
          const result = migrateOldSavedToPrompts(oldData, cur.cats, cur.prompts);
          if (result) replaceLibrary({ cats: result.cats, prompts: result.prompts, sels: cur.sels });
        }
      } catch {}
      setMigratedSaved(true);
    })();
    return () => { cancelled = true; };
  }, [replaceLibrary, setMigratedSaved]);

  /* clear stale tag selections when switching manage cat */
  useEffect(() => { setNewPromptTagIds([]); setNewPromptTagInput(""); setEditId(null); }, [manageCat]);

  /* ── derived ── */
  const sortedCats = useMemo(() => sortByOrder(cats), [cats]);
  const activeCatObj = useMemo(() => sortedCats.find(c => c.id === activeCat) || sortedCats[0], [sortedCats, activeCat]);
  const manageCatObj = useMemo(() => sortedCats.find(c => c.id === manageCat) || sortedCats[0], [sortedCats, manageCat]);

  /* default save target = first category */
  useEffect(() => {
    if (!sortedCats.length) return;
    if (!sortedCats.find(c => c.id === savePosCatId)) setSavePosCatId(sortedCats[0].id);
    if (!sortedCats.find(c => c.id === saveNegCatId)) setSaveNegCatId(sortedCats[0].id);
  }, [sortedCats, savePosCatId, saveNegCatId]);

  /* ── selection ops ── */
  const toggleSel = (id) => toggleSelStore(id, addMode);

  /* ── prompt CRUD wrappers ── */
  const addPromptItem = () => {
    if (!newPrompt.trim()) return;
    addPromptStore(manageCat, newPrompt.trim(), newLabel.trim() || newPrompt.trim(), [...newPromptTagIds]);
    setNewPrompt(""); setNewLabel(""); setNewPromptTagIds([]); setNewPromptTagInput("");
    flash("プロンプト追加完了");
  };
  const startEdit = (p) => { setEditId(p.id); setEditPrompt(p.prompt); setEditLabel(p.label); setEditTagIds([...(p.tagIds || [])]); setEditTagInput(""); };
  const saveEdit = (id) => {
    updatePromptStore(id, { prompt: editPrompt, label: editLabel, tagIds: [...editTagIds] });
    setEditId(null);
  };
  const deletePrompt = (id) => deletePromptStore(id);
  const movePromptItem = (id, dir) => movePromptStore(id, dir);

  /* ── category CRUD ── */
  const addCategory = () => { if (!newCatName.trim()) return; addCategoryStore(newCatName.trim()); setNewCatName(""); };
  const renameCategory = (id) => {
    if (!renameCatName.trim()) return;
    renameCategoryStore(id, renameCatName.trim());
    setRenameCatId(null);
  };
  const deleteCategory = (id) => {
    deleteCategoryStore(id);
    if (activeCat === id) setActiveCat(sortedCats.find(c => c.id !== id)?.id || "");
    if (manageCat === id) setManageCat(sortedCats.find(c => c.id !== id)?.id || "");
  };

  /* ── tag CRUD ── */
  const addTag = () => {
    const id = addTagToCat(manageCat, newTagName);
    if (!id) return;
    if ((manageCatObj?.tags || []).some(t => t.name === newTagName.trim() && t.id !== id)) flash("既存タグです");
    setNewTagName("");
  };
  const renameTag = (catId, tagId) => {
    if (!renameTagName.trim()) return;
    renameTagStore(catId, tagId, renameTagName.trim());
    setRenameTagId(null);
  };
  const deleteTag = (catId, tagId) => {
    deleteTagStore(catId, tagId);
    setTagFilter(t => t.filter(id => id !== tagId));
  };

  // Quick-create-or-pick tag from the prompt add/edit input
  const quickAddTagForNew = () => {
    const id = addTagToCat(manageCat, newPromptTagInput);
    if (!id) return;
    setNewPromptTagIds(arr => arr.includes(id) ? arr : [...arr, id]);
    setNewPromptTagInput("");
  };
  const quickAddTagForEdit = (catId) => {
    const id = addTagToCat(catId, editTagInput);
    if (!id) return;
    setEditTagIds(arr => arr.includes(id) ? arr : [...arr, id]);
    setEditTagInput("");
  };

  /* ── emphasis ── */
  const handleEmphasis = (o, c) => {
    const el = promptRef.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    if (s === e) { flash("テキストを選択してください"); return; }
    const t = newPrompt;
    setNewPrompt(t.slice(0, s) + o + t.slice(s, e) + c + t.slice(e));
    setTimeout(() => { el.focus(); el.selectionStart = s; el.selectionEnd = e + o.length + c.length; }, 10);
  };
  const stripOuter = () => { const m = newPrompt.match(/^[\{\[]([\s\S]*?)[\}\]]$/); if (m) setNewPrompt(m[1]); };

  /* ── output (sorted by category order, stable within a cat) ── */
  const sortedSels = useMemo(() => {
    const catOrder = new Map(sortedCats.map((c, i) => [c.id, i]));
    return Object.entries(sels)
      .map(([id, s]) => ({ id, s, p: prompts.find(x => x.id === id) }))
      .filter(({ p }) => p)
      .sort((a, b) => (catOrder.get(a.p.catId) ?? 999) - (catOrder.get(b.p.catId) ?? 999));
  }, [sels, prompts, sortedCats]);

  const { pos: posOut, neg: negOut } = useMemo(
    () => serialize({ cats, prompts, sels }, model),
    [cats, prompts, sels, model]
  );
  const selCount = Object.keys(sels).length;

  /* ── save completed prompts as new entries in chosen prompt categories ── */
  const saveOutput = () => {
    if (!posOut && !negOut) { flash("出力するプロンプトがありません"); return; }
    const validate = (id) => sortedCats.find(c => c.id === id) ? id : sortedCats[0]?.id;
    const pCat = validate(savePosCatId);
    const nCat = validate(saveNegCatId);
    if (!pCat && !nCat) { flash("保存先カテゴリがありません"); return; }
    const baseName = saveName.trim() || `プロンプト_${prompts.length + 1}`;
    if (posOut && negOut) {
      addPromptStore(pCat, posOut, `${baseName}_⊕`, []);
      addPromptStore(nCat, negOut, `${baseName}_⊖`, []);
    } else if (posOut) {
      addPromptStore(pCat, posOut, baseName, []);
    } else if (negOut) {
      addPromptStore(nCat, negOut, baseName, []);
    }
    setSaveName("");
    const posCatName = sortedCats.find(c => c.id === pCat)?.name;
    const negCatName = sortedCats.find(c => c.id === nCat)?.name;
    if (posOut && negOut) {
      flash(pCat === nCat ? `「${posCatName}」に 2件追加しました` : `「${posCatName}」と「${negCatName}」に追加しました`);
    } else {
      flash(`「${posOut ? posCatName : negCatName}」に追加しました`);
    }
  };

  /* ── send to NovelAI (extension only) ── */
  const handleSendToNovelAI = async (override) => {
    if (!isExtension) { flash("拡張機能でのみ利用可能です"); return; }
    const pos = override?.pos ?? posOut;
    const neg = override?.neg ?? negOut;
    if (!pos && !neg) { flash("送信する内容がありません"); return; }
    setSending(true);
    try {
      const res = await sendToNovelAI({ pos, neg, mode: sendMode });
      if (res?.ok) flash(`NovelAI へ送信しました（${sendMode === "append" ? "末尾追加" : "上書き"}）`);
      else if (res?.reason === "POS_NOT_FOUND") flash("ポジ用の入力欄が見つかりません — 「🎯 ポジ要素を選択」をお試しください");
      else if (res?.reason === "NEG_NOT_FOUND") flash("ネガ用の入力欄が見つかりません — 「🎯 ネガ要素を選択」をお試しください");
      else flash("送信に失敗しました");
    } catch (e) {
      const m = e?.message || "";
      if (m === "NOVELAI_TAB_NOT_FOUND") flash("NovelAI Image Generator のタブを開いてください");
      else if (m === "CONTENT_SCRIPT_NOT_LOADED") flash("NovelAI のタブを再読込してください（拡張インストール後の初回のみ必要です）");
      else flash("送信エラー: " + m);
    } finally {
      setSending(false);
    }
  };
  const handlePickTarget = async (kind) => {
    if (!isExtension) return;
    try {
      const res = await pickTarget(kind);
      if (res?.ok) flash(`${kind === "pos" ? "ポジ" : "ネガ"}要素を保存しました`);
      else if (res?.reason === "CANCELLED") flash("選択をキャンセルしました");
      else if (res?.reason === "NOT_TEXTAREA") flash("プロンプト入力欄を選択してください");
      else flash("選択に失敗しました");
    } catch (e) {
      const m = e?.message || "";
      if (m === "NOVELAI_TAB_NOT_FOUND") flash("NovelAI のタブを開いてください");
      else if (m === "CONTENT_SCRIPT_NOT_LOADED") flash("NovelAI のタブを再読込してください");
      else flash("エラー: " + m);
    }
  };
  const handleResetTargets = async () => {
    if (!isExtension) return;
    try {
      await resetTargets();
      flash("ターゲット設定をリセットしました");
    } catch (e) {
      const m = e?.message || "";
      if (m === "NOVELAI_TAB_NOT_FOUND") flash("NovelAI のタブを開いてください");
      else if (m === "CONTENT_SCRIPT_NOT_LOADED") flash("NovelAI のタブを再読込してください");
    }
  };

  /* ── copy ── */
  const copyText = async (text, label) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      flash((label || "テキスト") + " コピー完了！");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); flash((label || "テキスト") + " コピー完了！"); }
      catch { flash("コピー失敗 — 手動でコピーしてください"); }
      document.body.removeChild(ta);
    }
  };

  /* ── export/import: prompt list ── */
  const exportList = () => {
    const blob = new Blob([JSON.stringify({ version: 3, cats, prompts }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: "nai-prompt-list.json" }).click();
    URL.revokeObjectURL(url); flash("プロンプト一覧をエクスポートしました");
  };
  const importList = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      const newCats = Array.isArray(d.cats)
        ? d.cats.map(c => ({ ...c, tags: c.tags || [], color: c.color || "" }))
        : cats;
      const newPrompts = Array.isArray(d.prompts)
        ? d.prompts.map(({ neg, ...p }) => ({ ...p, tagIds: p.tagIds || [] }))
        : prompts;
      replaceLibrary({ cats: newCats, prompts: newPrompts, sels: {} });
      flash(`置換完了（${(d.prompts || []).length}件）`);
    } catch { flash("読み込みエラー"); }
    e.target.value = "";
  };

  /* ── merge import: dedup by (catName + prompt text) ── */
  const importListMerge = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      const incomingCats = Array.isArray(d.cats) ? d.cats : [];
      const incomingPrompts = Array.isArray(d.prompts) ? d.prompts.map(({ neg, ...p }) => p) : [];

      const cur = useLibraryStore.getState();
      let nextCats = cur.cats.map(c => ({ ...c, tags: [...(c.tags || [])] }));
      const catMap = {};
      const tagMap = {};

      const uidLocal = () => Math.random().toString(36).slice(2, 10);

      for (const ic of incomingCats) {
        let resolved = nextCats.find(c => c.name === ic.name);
        if (!resolved) {
          resolved = { id: uidLocal(), name: ic.name, order: nextCats.length, tags: [], color: ic.color || "" };
          nextCats = [...nextCats, resolved];
        }
        catMap[ic.id] = resolved.id;
        for (const it of (ic.tags || [])) {
          let rt = (resolved.tags || []).find(t => t.name === it.name);
          if (!rt) {
            rt = { id: uidLocal(), name: it.name };
            resolved.tags = [...(resolved.tags || []), rt];
            nextCats = nextCats.map(c => c.id === resolved.id ? resolved : c);
          }
          tagMap[`${ic.id}:${it.id}`] = rt.id;
        }
      }

      let nextPrompts = [...cur.prompts];
      let added = 0, skipped = 0;
      for (const ip of incomingPrompts) {
        const resolvedCatId = catMap[ip.catId] || ip.catId;
        if (!nextCats.find(c => c.id === resolvedCatId)) { skipped++; continue; }
        const dup = nextPrompts.find(x => x.catId === resolvedCatId && x.prompt === ip.prompt && x.label === ip.label);
        if (dup) { skipped++; continue; }
        const resolvedTagIds = (ip.tagIds || []).map(tid => tagMap[`${ip.catId}:${tid}`]).filter(Boolean);
        const order = nextPrompts.filter(x => x.catId === resolvedCatId).length;
        nextPrompts = [...nextPrompts, { id: uidLocal(), catId: resolvedCatId, prompt: ip.prompt, label: ip.label, tagIds: resolvedTagIds, order }];
        added++;
      }

      replaceLibrary({ cats: nextCats, prompts: nextPrompts, sels: cur.sels });
      flash(`マージ完了（追加${added}件、重複スキップ${skipped}件）`);
    } catch { flash("読み込みエラー"); }
    e.target.value = "";
  };

  /* ── filtered ── */
  const filteredSelect = useMemo(() => {
    if (!activeCatObj) return [];
    return sortByOrder(prompts.filter(p => {
      if (p.catId !== activeCatObj.id) return false;
      if (tagFilter.length && !tagFilter.some(tid => (p.tagIds || []).includes(tid))) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.prompt.toLowerCase().includes(q) && !p.label.toLowerCase().includes(q)) return false;
      }
      return true;
    }));
  }, [prompts, activeCatObj, tagFilter, search]);

  const filteredManage = useMemo(() => {
    if (!manageCatObj) return [];
    return sortByOrder(prompts.filter(p => {
      if (p.catId !== manageCatObj.id) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.prompt.toLowerCase().includes(q) && !p.label.toLowerCase().includes(q)) return false;
      }
      return true;
    }));
  }, [prompts, manageCatObj, search]);

  const tagCount = (catId, tagId) => prompts.filter(p => p.catId === catId && (p.tagIds || []).includes(tagId)).length;

  /* ── bottom bar height calc ── */
  const barPad = selCount > 0 ? 200 : 80;

  /* ════════ RENDER ════════ */
  return (
    <>
      <GlobalStyles />

      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

        <Header tab={tab} setTab={setTab} setSearch={setSearch} model={model} setModel={setModel} />

        {/* SCROLLABLE CONTENT */}
        <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", paddingBottom: barPad }}>
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "14px 16px" }}>

            {tab === "select" && (
              <SelectTab
                sortedCats={sortedCats}
                prompts={prompts}
                sels={sels}
                activeCat={activeCat}
                setActiveCat={setActiveCat}
                search={search}
                setSearch={setSearch}
                tagFilter={tagFilter}
                setTagFilter={setTagFilter}
                addMode={addMode}
                setAddMode={setAddMode}
                activeCatObj={activeCatObj}
                filteredSelect={filteredSelect}
                toggleSel={toggleSel}
                copyText={copyText}
              />
            )}

            {tab === "manage" && (
              <ManageTab
                sortedCats={sortedCats}
                manageCat={manageCat}
                setManageCat={setManageCat}
                manageCatObj={manageCatObj}
                prompts={prompts}
                filteredManage={filteredManage}
                search={search}
                setSearch={setSearch}
                newPrompt={newPrompt}
                setNewPrompt={setNewPrompt}
                newLabel={newLabel}
                setNewLabel={setNewLabel}
                newPromptTagIds={newPromptTagIds}
                setNewPromptTagIds={setNewPromptTagIds}
                newPromptTagInput={newPromptTagInput}
                setNewPromptTagInput={setNewPromptTagInput}
                promptRef={promptRef}
                handleEmphasis={handleEmphasis}
                stripOuter={stripOuter}
                addPromptItem={addPromptItem}
                quickAddTagForNew={quickAddTagForNew}
                editId={editId}
                setEditId={setEditId}
                editPrompt={editPrompt}
                setEditPrompt={setEditPrompt}
                editLabel={editLabel}
                setEditLabel={setEditLabel}
                editTagIds={editTagIds}
                setEditTagIds={setEditTagIds}
                editTagInput={editTagInput}
                setEditTagInput={setEditTagInput}
                startEdit={startEdit}
                saveEdit={saveEdit}
                deletePrompt={deletePrompt}
                movePromptItem={movePromptItem}
                copyText={copyText}
                quickAddTagForEdit={quickAddTagForEdit}
                newCatName={newCatName}
                setNewCatName={setNewCatName}
                addCategory={addCategory}
                renameCatId={renameCatId}
                setRenameCatId={setRenameCatId}
                renameCatName={renameCatName}
                setRenameCatName={setRenameCatName}
                renameCategory={renameCategory}
                deleteCategory={deleteCategory}
                setCatColor={setCatColor}
                moveCat={moveCat}
                newTagName={newTagName}
                setNewTagName={setNewTagName}
                addTag={addTag}
                renameTagId={renameTagId}
                setRenameTagId={setRenameTagId}
                renameTagName={renameTagName}
                setRenameTagName={setRenameTagName}
                renameTag={renameTag}
                deleteTag={deleteTag}
                tagCount={tagCount}
                exportList={exportList}
                importList={importList}
                importListMerge={importListMerge}
              />
            )}

            {tab === "output" && (
              <OutputTab
                posOut={posOut}
                negOut={negOut}
                copyText={copyText}
                isExtension={isExtension}
                sendMode={sendMode}
                setSendMode={setSendMode}
                sending={sending}
                handleSendToNovelAI={handleSendToNovelAI}
                handlePickTarget={handlePickTarget}
                handleResetTargets={handleResetTargets}
                sortedCats={sortedCats}
                saveName={saveName}
                setSaveName={setSaveName}
                savePosCatId={savePosCatId}
                setSavePosCatId={setSavePosCatId}
                saveNegCatId={saveNegCatId}
                setSaveNegCatId={setSaveNegCatId}
                saveOutput={saveOutput}
              />
            )}

          </div>
        </div>

        <SelectionBar
          selCount={selCount}
          sortedSels={sortedSels}
          sortedCats={sortedCats}
          posOut={posOut}
          negOut={negOut}
          setWeight={setWeight}
          flipSel={flipSel}
          removeSel={removeSel}
          clearAll={clearAll}
        />
      </div>

      <Toast message={toast} />
    </>
  );
}
