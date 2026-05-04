import { useState, useEffect, useMemo, useRef } from "react";
import storage from "./storage";
import { isExtension, sendToNovelAI, pickTarget, resetTargets } from "./extension/bridge";
import { uid, sortByOrder, assignPromptOrders, wrap } from "./lib/utils";
import { migrateOldSavedToPrompts } from "./lib/migrate";
import {
  INIT_CATS, INIT_PROMPTS,
  SK, SK_SAVED, SK_SETTINGS, SK_OLD, SK_SAVED_OLD,
} from "./lib/constants";
import GlobalStyles from "./components/Common/GlobalStyles";
import Header from "./components/Common/Header";
import Toast from "./components/Common/Toast";
import SelectTab from "./components/Library/SelectTab";
import ManageTab from "./components/Library/ManageTab";
import OutputTab from "./components/Output/OutputTab";
import SelectionBar from "./components/Output/SelectionBar";

export default function App() {
  /* ── core state ── */
  const [cats, setCats] = useState(INIT_CATS);
  const [prompts, setPrompts] = useState(INIT_PROMPTS);
  const [sels, setSels] = useState({}); // { [id]: { w, neg } }
  const [loaded, setLoaded] = useState(false);

  /* ── ui state ── */
  const [tab, setTab] = useState("select");
  const [activeCat, setActiveCat] = useState("char");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState([]);
  const [addMode, setAddMode] = useState("positive");

  /* ── manage state ── */
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

  /* ── output state ── */
  const [saveName, setSaveName] = useState("");
  const [savePosCatId, setSavePosCatId] = useState("");
  const [saveNegCatId, setSaveNegCatId] = useState("");

  /* ── extension settings ── */
  const [sendMode, setSendMode] = useState("overwrite"); // "overwrite" | "append"
  const [migratedSaved, setMigratedSaved] = useState(false);
  const [sending, setSending] = useState(false);

  const [toast, setToast] = useState("");
  const promptRef = useRef(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  /* ── persistence + migration ── */
  useEffect(() => {
    (async () => {
      let curCats = INIT_CATS;
      let curPrompts = INIT_PROMPTS;
      let curSels = {};
      let alreadyMigrated = false;

      try {
        const r = await storage.get(SK);
        if (r?.value) {
          const d = JSON.parse(r.value);
          if (Array.isArray(d.cats) && d.cats.length) curCats = d.cats.map(c => ({ ...c, tags: c.tags || [], color: c.color || "" }));
          if (Array.isArray(d.prompts)) curPrompts = assignPromptOrders(d.prompts.map(p => ({ ...p, tagIds: p.tagIds || [] })));
          if (d.sels && typeof d.sels === "object") curSels = d.sels;
        } else {
          // migrate from v2
          const old = await storage.get(SK_OLD);
          if (old?.value) {
            const o = JSON.parse(old.value);
            const oldCats = Array.isArray(o.cats) ? o.cats : [];
            const oldPrompts = Array.isArray(o.prompts) ? o.prompts : [];
            curCats = oldCats.length ? oldCats.map(c => ({ ...c, tags: c.tags || [], color: c.color || "" })) : curCats;
            curPrompts = assignPromptOrders(oldPrompts.map(({ neg, ...rest }) => ({ ...rest, tagIds: rest.tagIds || [] })));
            const newSels = {};
            for (const [id, val] of Object.entries(o.sels || {})) {
              if (val && typeof val === "object" && "w" in val) newSels[id] = val;
              else {
                const op = oldPrompts.find(p => p.id === id);
                newSels[id] = { w: typeof val === "number" ? val : 0, neg: !!op?.neg };
              }
            }
            curSels = newSels;
          }
        }
      } catch {}

      try {
        const r3 = await storage.get(SK_SETTINGS);
        if (r3?.value) {
          const s = JSON.parse(r3.value);
          if (s.sendMode === "append" || s.sendMode === "overwrite") setSendMode(s.sendMode);
          alreadyMigrated = !!s.migratedSaved;
        }
      } catch {}

      // 旧 saved (savedCats/saved) → 既存カテゴリへの一括移行（一度だけ実行）
      if (!alreadyMigrated) {
        try {
          let oldData = null;
          const r2 = await storage.get(SK_SAVED);
          if (r2?.value) oldData = JSON.parse(r2.value);
          else {
            const old2 = await storage.get(SK_SAVED_OLD);
            if (old2?.value) oldData = JSON.parse(old2.value);
          }
          if (oldData) {
            const result = migrateOldSavedToPrompts(oldData, curCats, curPrompts);
            if (result) { curCats = result.cats; curPrompts = result.prompts; }
          }
        } catch {}
        setMigratedSaved(true);
      }

      setCats(curCats);
      setPrompts(curPrompts);
      setSels(curSels);
      setLoaded(true);
    })();
  }, []);
  useEffect(() => { if (!loaded) return; (async () => { try { await storage.set(SK, JSON.stringify({ cats, prompts, sels })); } catch {} })(); }, [cats, prompts, sels, loaded]);
  useEffect(() => { if (!loaded) return; (async () => { try { await storage.set(SK_SETTINGS, JSON.stringify({ sendMode, migratedSaved })); } catch {} })(); }, [sendMode, migratedSaved, loaded]);

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
  const toggleSel = (id) => setSels(p => {
    const n = { ...p };
    if (n[id]) delete n[id];
    else n[id] = { w: 0, neg: addMode === "negative" };
    return n;
  });
  const setWeight = (id, d) => setSels(p => {
    if (!p[id]) return p;
    return { ...p, [id]: { ...p[id], w: Math.max(-5, Math.min(5, p[id].w + d)) } };
  });
  const flipSel = (id) => setSels(p => p[id] ? { ...p, [id]: { ...p[id], neg: !p[id].neg } } : p);
  const removeSel = (id) => setSels(p => { const n = { ...p }; delete n[id]; return n; });
  const clearAll = () => setSels({});

  /* ── prompt CRUD ── */
  const addPromptItem = () => {
    if (!newPrompt.trim()) return;
    setPrompts(p => {
      const order = p.filter(x => x.catId === manageCat).length;
      return [...p, { id: uid(), catId: manageCat, prompt: newPrompt.trim(), label: newLabel.trim() || newPrompt.trim(), tagIds: [...newPromptTagIds], order }];
    });
    setNewPrompt(""); setNewLabel(""); setNewPromptTagIds([]); setNewPromptTagInput("");
    flash("プロンプト追加完了");
  };
  const startEdit = (p) => { setEditId(p.id); setEditPrompt(p.prompt); setEditLabel(p.label); setEditTagIds([...(p.tagIds || [])]); setEditTagInput(""); };
  const saveEdit = (id) => { setPrompts(p => p.map(x => x.id === id ? { ...x, prompt: editPrompt, label: editLabel, tagIds: [...editTagIds] } : x)); setEditId(null); };
  const deletePrompt = (id) => {
    setPrompts(p => {
      const target = p.find(x => x.id === id);
      if (!target) return p;
      const without = p.filter(x => x.id !== id);
      // reindex same-cat orders
      const sameCat = sortByOrder(without.filter(x => x.catId === target.catId)).map((x, i) => ({ ...x, order: i }));
      const map = new Map(sameCat.map(x => [x.id, x]));
      return without.map(x => map.get(x.id) || x);
    });
    setSels(p => { const n = { ...p }; delete n[id]; return n; });
  };
  const movePromptItem = (id, dir) => setPrompts(p => {
    const target = p.find(x => x.id === id);
    if (!target) return p;
    const sameCat = sortByOrder(p.filter(x => x.catId === target.catId));
    const idx = sameCat.findIndex(x => x.id === id);
    const j = idx + dir;
    if (j < 0 || j >= sameCat.length) return p;
    [sameCat[idx], sameCat[j]] = [sameCat[j], sameCat[idx]];
    const reordered = sameCat.map((x, i) => ({ ...x, order: i }));
    const map = new Map(reordered.map(x => [x.id, x]));
    return p.map(x => map.get(x.id) || x);
  });

  /* ── category CRUD + reorder ── */
  const addCategory = () => { if (!newCatName.trim()) return; setCats(p => [...p, { id: uid(), name: newCatName.trim(), order: p.length, tags: [], color: "" }]); setNewCatName(""); };
  const setCatColor = (id, color) => setCats(p => p.map(c => c.id === id ? { ...c, color } : c));
  const renameCategory = (id) => { if (!renameCatName.trim()) return; setCats(p => p.map(c => c.id === id ? { ...c, name: renameCatName.trim() } : c)); setRenameCatId(null); };
  const deleteCategory = (id) => {
    const ids = prompts.filter(x => x.catId === id).map(x => x.id);
    setCats(p => sortByOrder(p.filter(c => c.id !== id)).map((c, i) => ({ ...c, order: i })));
    setPrompts(p => p.filter(x => x.catId !== id));
    setSels(p => { const n = { ...p }; ids.forEach(i => delete n[i]); return n; });
    if (activeCat === id) setActiveCat(sortedCats.find(c => c.id !== id)?.id || "");
    if (manageCat === id) setManageCat(sortedCats.find(c => c.id !== id)?.id || "");
  };
  const moveCat = (id, dir) => setCats(p => {
    const sorted = sortByOrder(p);
    const idx = sorted.findIndex(c => c.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sorted.length) return p;
    [sorted[idx], sorted[j]] = [sorted[j], sorted[idx]];
    return sorted.map((c, i) => ({ ...c, order: i }));
  });

  /* ── tag CRUD (per-category) ── */
  const addTagToCat = (catId, name) => {
    const t = name.trim();
    if (!t) return null;
    const cat = cats.find(c => c.id === catId);
    const existing = (cat?.tags || []).find(x => x.name === t);
    if (existing) return existing.id;
    const newTag = { id: uid(), name: t };
    setCats(p => p.map(c => c.id === catId ? { ...c, tags: [...(c.tags || []), newTag] } : c));
    return newTag.id;
  };
  const addTag = () => {
    const id = addTagToCat(manageCat, newTagName);
    if (!id) return;
    if ((manageCatObj?.tags || []).some(t => t.name === newTagName.trim() && t.id !== id)) flash("既存タグです");
    setNewTagName("");
  };
  const renameTag = (catId, tagId) => {
    if (!renameTagName.trim()) return;
    setCats(p => p.map(c => c.id === catId ? { ...c, tags: (c.tags || []).map(t => t.id === tagId ? { ...t, name: renameTagName.trim() } : t) } : c));
    setRenameTagId(null);
  };
  const deleteTag = (catId, tagId) => {
    setCats(p => p.map(c => c.id === catId ? { ...c, tags: (c.tags || []).filter(t => t.id !== tagId) } : c));
    setPrompts(p => p.map(x => x.catId === catId ? { ...x, tagIds: (x.tagIds || []).filter(id => id !== tagId) } : x));
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
  const buildOut = (neg) => sortedSels
    .filter(({ s }) => !!s.neg === neg)
    .map(({ p, s }) => wrap(p.prompt, s.w))
    .join(", ");
  const posOut = buildOut(false);
  const negOut = buildOut(true);
  const selCount = Object.keys(sels).length;

  /* ── save completed prompts as new entries in chosen prompt categories ── */
  const saveOutput = () => {
    if (!posOut && !negOut) { flash("出力するプロンプトがありません"); return; }
    const validate = (id) => sortedCats.find(c => c.id === id) ? id : sortedCats[0]?.id;
    const pCat = validate(savePosCatId);
    const nCat = validate(saveNegCatId);
    if (!pCat && !nCat) { flash("保存先カテゴリがありません"); return; }
    const baseName = saveName.trim() || `プロンプト_${prompts.length + 1}`;
    setPrompts(prev => {
      const next = [...prev];
      const addEntry = (catId, text, label) => {
        if (!catId || !text) return;
        const order = next.filter(x => x.catId === catId).length;
        next.push({ id: uid(), catId, prompt: text, label, tagIds: [], order });
      };
      if (posOut && negOut) {
        addEntry(pCat, posOut, `${baseName}_⊕`);
        addEntry(nCat, negOut, `${baseName}_⊖`);
      } else if (posOut) {
        addEntry(pCat, posOut, baseName);
      } else if (negOut) {
        addEntry(nCat, negOut, baseName);
      }
      return next;
    });
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
      if (Array.isArray(d.cats)) setCats(d.cats.map(c => ({ ...c, tags: c.tags || [], color: c.color || "" })));
      if (Array.isArray(d.prompts)) setPrompts(assignPromptOrders(d.prompts.map(({ neg, ...p }) => ({ ...p, tagIds: p.tagIds || [] }))));
      setSels({});
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

      let nextCats = cats.map(c => ({ ...c, tags: [...(c.tags || [])] }));
      const catMap = {}; // incomingCatId -> resolvedCatId
      const tagMap = {}; // `${incomingCatId}:${incomingTagId}` -> resolvedTagId

      for (const ic of incomingCats) {
        let resolved = nextCats.find(c => c.name === ic.name);
        if (!resolved) {
          resolved = { id: uid(), name: ic.name, order: nextCats.length, tags: [], color: ic.color || "" };
          nextCats = [...nextCats, resolved];
        }
        catMap[ic.id] = resolved.id;
        for (const it of (ic.tags || [])) {
          let rt = (resolved.tags || []).find(t => t.name === it.name);
          if (!rt) {
            rt = { id: uid(), name: it.name };
            resolved.tags = [...(resolved.tags || []), rt];
            nextCats = nextCats.map(c => c.id === resolved.id ? resolved : c);
          }
          tagMap[`${ic.id}:${it.id}`] = rt.id;
        }
      }

      let nextPrompts = [...prompts];
      let added = 0, skipped = 0;
      for (const ip of incomingPrompts) {
        const resolvedCatId = catMap[ip.catId] || ip.catId;
        if (!nextCats.find(c => c.id === resolvedCatId)) { skipped++; continue; }
        const dup = nextPrompts.find(x => x.catId === resolvedCatId && x.prompt === ip.prompt && x.label === ip.label);
        if (dup) { skipped++; continue; }
        const resolvedTagIds = (ip.tagIds || []).map(tid => tagMap[`${ip.catId}:${tid}`]).filter(Boolean);
        const order = nextPrompts.filter(x => x.catId === resolvedCatId).length;
        nextPrompts = [...nextPrompts, { id: uid(), catId: resolvedCatId, prompt: ip.prompt, label: ip.label, tagIds: resolvedTagIds, order }];
        added++;
      }

      setCats(nextCats);
      setPrompts(nextPrompts);
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

        <Header tab={tab} setTab={setTab} setSearch={setSearch} />

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
