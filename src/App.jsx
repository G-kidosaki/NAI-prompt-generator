import { useState, useEffect, useMemo, useRef } from "react";
import storage from "./storage";

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () =>
  new Date().toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

const INIT_CATS = [
  { id: "char", name: "キャラクター", order: 0, tags: [] },
  { id: "expr", name: "表情", order: 1, tags: [] },
  { id: "act", name: "行為", order: 2, tags: [] },
  { id: "outfit", name: "服装", order: 3, tags: [] },
  { id: "place", name: "場所", order: 4, tags: [] },
  { id: "comp", name: "構図", order: 5, tags: [] },
  { id: "light", name: "光・色調", order: 6, tags: [] },
  { id: "quality", name: "品質", order: 7, tags: [] },
];

const INIT_PROMPTS = [
  { id: "p1", catId: "char", prompt: "1girl", label: "女の子", tagIds: [], order: 0 },
  { id: "p2", catId: "char", prompt: "1boy", label: "男の子", tagIds: [], order: 1 },
  { id: "p3", catId: "char", prompt: "blonde hair", label: "金髪", tagIds: [], order: 2 },
  { id: "p4", catId: "expr", prompt: "smile", label: "笑顔", tagIds: [], order: 0 },
  { id: "p5", catId: "expr", prompt: "crying", label: "泣き", tagIds: [], order: 1 },
  { id: "p6", catId: "act", prompt: "standing", label: "立ち", tagIds: [], order: 0 },
  { id: "p7", catId: "act", prompt: "jumping", label: "ジャンプ", tagIds: [], order: 1 },
  { id: "p8", catId: "outfit", prompt: "school uniform", label: "制服", tagIds: [], order: 0 },
  { id: "p9", catId: "outfit", prompt: "dress", label: "ドレス", tagIds: [], order: 1 },
  { id: "p10", catId: "place", prompt: "classroom", label: "教室", tagIds: [], order: 0 },
  { id: "p11", catId: "place", prompt: "forest", label: "森", tagIds: [], order: 1 },
  { id: "p12", catId: "comp", prompt: "close-up", label: "アップ", tagIds: [], order: 0 },
  { id: "p13", catId: "comp", prompt: "full body", label: "全身", tagIds: [], order: 1 },
  { id: "p14", catId: "light", prompt: "dramatic lighting", label: "ドラマチック", tagIds: [], order: 0 },
  { id: "p15", catId: "quality", prompt: "masterpiece", label: "傑作", tagIds: [], order: 0 },
  { id: "p16", catId: "quality", prompt: "best quality", label: "最高品質", tagIds: [], order: 1 },
  { id: "p17", catId: "quality", prompt: "lowres", label: "低解像度", tagIds: [], order: 2 },
  { id: "p18", catId: "quality", prompt: "bad anatomy", label: "破綻", tagIds: [], order: 3 },
];

const INIT_SAVED_CATS = [
  { id: "default", name: "未分類", order: 0 },
];

const PRESET_COLORS = [
  { hex: "", name: "デフォルト" },
  { hex: "#38bdf8", name: "ブルー" },
  { hex: "#34d399", name: "グリーン" },
  { hex: "#fbbf24", name: "ゴールド" },
  { hex: "#fb7185", name: "ピンク" },
  { hex: "#a78bfa", name: "パープル" },
  { hex: "#22d3ee", name: "シアン" },
  { hex: "#f97316", name: "オレンジ" },
  { hex: "#94a3b8", name: "グレー" },
];

const catColor = (c) => c?.color || "var(--acc)";

const wrap = (text, w) => {
  let r = text;
  if (w > 0) for (let i = 0; i < w; i++) r = "{" + r + "}";
  if (w < 0) for (let i = 0; i < -w; i++) r = "[" + r + "]";
  return r;
};

const SK = "nai-pg-v3";
const SK_SAVED = "nai-pg-saved-v3";
const SK_OLD = "nai-pg-v2";
const SK_SAVED_OLD = "nai-pg-saved-v2";

const sortByOrder = (arr) => [...arr].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const assignPromptOrders = (arr) => {
  const counters = {};
  return arr.map(p => {
    if (typeof p.order === "number") return p;
    const c = counters[p.catId] = (counters[p.catId] ?? -1) + 1;
    return { ...p, order: c };
  });
};

const Btn = ({ children, on, bg, color, border, small, disabled, style, ...rest }) => (
  <button disabled={disabled} onClick={on} style={{
    padding: small ? "6px 12px" : "10px 18px", borderRadius: small ? 6 : 8,
    fontSize: small ? 12 : 14, fontWeight: 600, whiteSpace: "nowrap",
    background: bg || "var(--bg2)", color: color || "var(--dim)",
    border: border || "1px solid var(--bdr)", opacity: disabled ? 0.4 : 1,
    cursor: disabled ? "not-allowed" : "pointer", transition: "all .15s",
    WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
    ...style,
  }} {...rest}>{children}</button>
);

export default function App() {
  /* ── core state ── */
  const [cats, setCats] = useState(INIT_CATS);
  const [prompts, setPrompts] = useState(INIT_PROMPTS);
  const [sels, setSels] = useState({}); // { [id]: { w, neg } }
  const [savedCats, setSavedCats] = useState(INIT_SAVED_CATS);
  const [saved, setSaved] = useState([]);
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
  const [savePosCatId, setSavePosCatId] = useState("default");
  const [saveNegCatId, setSaveNegCatId] = useState("default");
  const [expandedSaved, setExpandedSaved] = useState(null);
  const [newSavedCatName, setNewSavedCatName] = useState("");
  const [renameSavedCatId, setRenameSavedCatId] = useState(null);
  const [renameSavedCatName, setRenameSavedCatName] = useState("");

  const [toast, setToast] = useState("");
  const promptRef = useRef(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  /* ── persistence + migration ── */
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(SK);
        if (r?.value) {
          const d = JSON.parse(r.value);
          if (Array.isArray(d.cats) && d.cats.length) setCats(d.cats.map(c => ({ ...c, tags: c.tags || [], color: c.color || "" })));
          if (Array.isArray(d.prompts)) setPrompts(assignPromptOrders(d.prompts.map(p => ({ ...p, tagIds: p.tagIds || [] }))));
          if (d.sels && typeof d.sels === "object") setSels(d.sels);
        } else {
          // migrate from v2
          const old = await storage.get(SK_OLD);
          if (old?.value) {
            const o = JSON.parse(old.value);
            const oldCats = Array.isArray(o.cats) ? o.cats : [];
            const oldPrompts = Array.isArray(o.prompts) ? o.prompts : [];
            const newCats = oldCats.map(c => ({ ...c, tags: c.tags || [], color: c.color || "" }));
            const newPrompts = assignPromptOrders(oldPrompts.map(({ neg, ...rest }) => ({ ...rest, tagIds: rest.tagIds || [] })));
            const newSels = {};
            for (const [id, val] of Object.entries(o.sels || {})) {
              if (val && typeof val === "object" && "w" in val) newSels[id] = val;
              else {
                const op = oldPrompts.find(p => p.id === id);
                newSels[id] = { w: typeof val === "number" ? val : 0, neg: !!op?.neg };
              }
            }
            if (newCats.length) setCats(newCats);
            if (newPrompts.length) setPrompts(newPrompts);
            setSels(newSels);
          }
        }
      } catch {}
      try {
        const r2 = await storage.get(SK_SAVED);
        if (r2?.value) {
          const d2 = JSON.parse(r2.value);
          if (Array.isArray(d2.savedCats) && d2.savedCats.length) setSavedCats(d2.savedCats);
          if (Array.isArray(d2.saved)) setSaved(d2.saved.map(s => ({ ...s, savedCatId: s.savedCatId || "default" })));
        } else {
          const old2 = await storage.get(SK_SAVED_OLD);
          if (old2?.value) {
            const arr = JSON.parse(old2.value);
            if (Array.isArray(arr)) setSaved(arr.map(s => ({ ...s, savedCatId: "default" })));
          }
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);
  useEffect(() => { if (!loaded) return; (async () => { try { await storage.set(SK, JSON.stringify({ cats, prompts, sels })); } catch {} })(); }, [cats, prompts, sels, loaded]);
  useEffect(() => { if (!loaded) return; (async () => { try { await storage.set(SK_SAVED, JSON.stringify({ savedCats, saved })); } catch {} })(); }, [savedCats, saved, loaded]);

  /* clear stale tag selections when switching manage cat */
  useEffect(() => { setNewPromptTagIds([]); setNewPromptTagInput(""); setEditId(null); }, [manageCat]);

  /* ── derived ── */
  const sortedCats = useMemo(() => sortByOrder(cats), [cats]);
  const sortedSavedCats = useMemo(() => sortByOrder(savedCats), [savedCats]);
  const activeCatObj = useMemo(() => sortedCats.find(c => c.id === activeCat) || sortedCats[0], [sortedCats, activeCat]);
  const manageCatObj = useMemo(() => sortedCats.find(c => c.id === manageCat) || sortedCats[0], [sortedCats, manageCat]);

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

  /* ── saved category CRUD + reorder ── */
  const addSavedCat = () => { if (!newSavedCatName.trim()) return; setSavedCats(p => [...p, { id: uid(), name: newSavedCatName.trim(), order: p.length }]); setNewSavedCatName(""); };
  const renameSavedCategory = (id) => { if (!renameSavedCatName.trim()) return; setSavedCats(p => p.map(c => c.id === id ? { ...c, name: renameSavedCatName.trim() } : c)); setRenameSavedCatId(null); };
  const deleteSavedCat = (id) => {
    if (id === "default") { flash("既定カテゴリは削除できません"); return; }
    setSaved(p => p.map(s => s.savedCatId === id ? { ...s, savedCatId: "default" } : s));
    setSavedCats(p => sortByOrder(p.filter(c => c.id !== id)).map((c, i) => ({ ...c, order: i })));
  };
  const moveSavedCat = (id, dir) => setSavedCats(p => {
    const sorted = sortByOrder(p);
    const idx = sorted.findIndex(c => c.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sorted.length) return p;
    [sorted[idx], sorted[j]] = [sorted[j], sorted[idx]];
    return sorted.map((c, i) => ({ ...c, order: i }));
  });
  const moveSavedItem = (id, savedCatId) => setSaved(p => p.map(s => s.id === id ? { ...s, savedCatId } : s));

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

  /* ── save completed (pos/neg can target different saved categories) ── */
  const saveOutput = () => {
    if (!posOut && !negOut) { flash("出力するプロンプトがありません"); return; }
    const validate = (id) => sortedSavedCats.find(c => c.id === id) ? id : "default";
    const pCat = validate(savePosCatId);
    const nCat = validate(saveNegCatId);
    const baseName = saveName.trim() || `プロンプト_${saved.length + 1}`;
    const ts = now();
    const items = [];
    if (posOut && negOut && pCat === nCat) {
      items.push({ id: uid(), savedCatId: pCat, name: baseName, pos: posOut, neg: negOut, date: ts });
    } else {
      if (posOut) items.push({ id: uid(), savedCatId: pCat, name: posOut && negOut ? `${baseName}_⊕` : baseName, pos: posOut, neg: "", date: ts });
      if (negOut) items.push({ id: uid(), savedCatId: nCat, name: posOut && negOut ? `${baseName}_⊖` : baseName, pos: "", neg: negOut, date: ts });
    }
    setSaved(p => [...items, ...p]);
    setSaveName(""); flash(items.length === 1 ? `「${items[0].name}」を保存しました` : `${items.length}件保存しました`);
  };
  const deleteSaved = (id) => setSaved(p => p.filter(x => x.id !== id));

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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=M+PLUS+1:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        :root{--bg0:#0b0e14;--bg1:#111620;--bg2:#1a2030;--bdr:#2a3548;--txt:#e2e8f0;--dim:#7a8a9e;
          --pos:#34d399;--posBg:#064e3b;--posBdr:#047857;--neg:#fb7185;--negBg:#4c0519;--negBdr:#be123c;
          --acc:#38bdf8;--accDim:#0c4a6e;--gold:#fbbf24;--goldBg:#451a03;--goldBdr:#b45309;
          --safe-b:env(safe-area-inset-bottom,0px);--safe-t:env(safe-area-inset-top,0px)}
        *{box-sizing:border-box;margin:0;padding:0}
        html{height:100%;overflow:hidden}
        body{background:var(--bg0);color:var(--txt);font-family:'M PLUS 1','Hiragino Sans','Meiryo',sans-serif;
          height:100%;overflow:hidden;overscroll-behavior:none;-webkit-text-size-adjust:100%}
        #root{height:100%;overflow:hidden;display:flex;flex-direction:column}
        .mono{font-family:'JetBrains Mono','Menlo',monospace}
        input,textarea,select{background:var(--bg0);border:1px solid var(--bdr);color:var(--txt);border-radius:8px;
          padding:10px 14px;font-family:inherit;font-size:16px;outline:none;transition:border-color .2s;width:100%;
          -webkit-appearance:none;appearance:none}
        input:focus,textarea:focus{border-color:var(--acc)}
        select{cursor:pointer;padding-right:30px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237a8a9e' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
        button{font-family:inherit;cursor:pointer;border:none;transition:all .15s;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
        ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:var(--bdr);border-radius:2px}
        @keyframes fi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}} .fi{animation:fi .22s ease-out}
        @keyframes pop{0%{transform:scale(.94);opacity:.6}100%{transform:scale(1);opacity:1}} .pop{animation:pop .15s ease-out}
        @media(min-width:1024px){.main-content{display:grid;grid-template-columns:200px 1fr;gap:0}}
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

        {/* HEADER */}
        <div style={{ padding: `calc(12px + var(--safe-t)) 16px 10px`, flexShrink: 0, borderBottom: "1px solid var(--bdr)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 960, margin: "0 auto", flexWrap: "wrap" }}>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.5px", color: "var(--acc)" }}>NAI</span>
            <span style={{ fontSize: 14, color: "var(--dim)" }}>Prompt Generator</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 3, background: "var(--bg2)", borderRadius: 10, padding: 3 }}>
              {[["select","選択"],["manage","追加・管理"],["output","出力"]].map(([k,v])=>(
                <button key={k} onClick={()=>{setTab(k);setSearch("")}} style={{
                  padding:"8px 16px",borderRadius:8,fontSize:14,fontWeight:500,
                  background:tab===k?"var(--acc)":"transparent",color:tab===k?"#0b0e14":"var(--dim)",
                }}>{v}{k==="output"&&saved.length>0&&<span style={{marginLeft:4,fontSize:10}}>({saved.length})</span>}</button>
              ))}
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", paddingBottom: barPad }}>
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "14px 16px" }}>

          {/* ═══ SELECT ═══ */}
          {tab==="select"&&(
            <div className="fi">
              {/* category tabs */}
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,marginBottom:10,WebkitOverflowScrolling:"touch"}}>
                {sortedCats.map((c)=>{
                  const cnt=prompts.filter(p=>p.catId===c.id&&sels[p.id]).length;
                  const a=activeCat===c.id;
                  const col=catColor(c);
                  return(<button key={c.id} onClick={()=>{setActiveCat(c.id);setSearch("");setTagFilter([])}} style={{
                    padding:"8px 16px",borderRadius:20,fontSize:14,fontWeight:500,whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:6,
                    background:a?"var(--accDim)":"var(--bg2)",color:a?col:"var(--dim)",
                    border:a?`1px solid ${col}`:"1px solid var(--bdr)",
                  }}>
                    {c.color&&<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>}
                    {c.name}{cnt>0&&<span style={{marginLeft:2,fontSize:11,opacity:.7}}>({cnt})</span>}
                  </button>);
                })}
              </div>

              {/* mode toggle (insert as positive/negative) */}
              <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:13,color:"var(--dim)"}}>追加モード:</span>
                {[["positive","⊕ ポジティブ","--pos","--posBg","--posBdr"],["negative","⊖ ネガティブ","--neg","--negBg","--negBdr"]].map(([k,l,c,bg,bd])=>(
                  <button key={k} onClick={()=>setAddMode(k)} style={{
                    padding:"6px 14px",borderRadius:18,fontSize:13,fontWeight:600,
                    background:addMode===k?`var(${bg})`:"var(--bg2)",color:addMode===k?`var(${c})`:"var(--dim)",
                    border:addMode===k?`2px solid var(${bd})`:"1px solid var(--bdr)",
                  }}>{l}</button>
                ))}
              </div>

              {/* tag filter */}
              {activeCatObj && (activeCatObj.tags||[]).length>0 && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
                  <span style={{fontSize:12,color:"var(--dim)"}}>タグ:</span>
                  <button onClick={()=>setTagFilter([])} style={{
                    padding:"4px 10px",borderRadius:14,fontSize:12,fontWeight:500,
                    background:tagFilter.length===0?"var(--accDim)":"var(--bg2)",
                    color:tagFilter.length===0?"var(--acc)":"var(--dim)",
                    border:tagFilter.length===0?"1px solid var(--acc)":"1px solid var(--bdr)",
                  }}>すべて</button>
                  {(activeCatObj.tags||[]).map(t=>{
                    const a=tagFilter.includes(t.id);
                    return <button key={t.id} onClick={()=>setTagFilter(tf=>tf.includes(t.id)?tf.filter(x=>x!==t.id):[...tf,t.id])} style={{
                      padding:"4px 10px",borderRadius:14,fontSize:12,fontWeight:500,
                      background:a?"var(--accDim)":"var(--bg2)",color:a?"var(--acc)":"var(--dim)",
                      border:a?"1px solid var(--acc)":"1px solid var(--bdr)",
                    }}>#{t.name}</button>;
                  })}
                </div>
              )}

              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="検索..." style={{marginBottom:14}}/>
              <div style={{display:"flex",flexWrap:"wrap",gap:10,minHeight:60}}>
                {filteredSelect.length===0&&<span style={{color:"var(--dim)",fontSize:14,padding:12}}>プロンプトがありません</span>}
                {filteredSelect.map((p)=>{
                  const sel=sels[p.id];
                  const tagNames=(p.tagIds||[]).map(tid=>(activeCatObj?.tags||[]).find(t=>t.id===tid)?.name).filter(Boolean);
                  return(<button key={p.id}
                    onClick={()=>toggleSel(p.id)}
                    onDoubleClick={(e)=>{e.preventDefault();copyText(p.prompt,p.label)}}
                    title="クリック: 選択／ダブルクリック: コピー"
                    className={sel?"pop":""} style={{
                      padding:"10px 16px",borderRadius:10,fontSize:14,fontWeight:500,
                      border:sel?`2px solid ${sel.neg?"var(--negBdr)":"var(--posBdr)"}`:"1px solid var(--bdr)",
                      background:sel?(sel.neg?"var(--negBg)":"var(--posBg)"):"var(--bg2)",
                      color:sel?(sel.neg?"var(--neg)":"var(--pos)"):"var(--txt)",
                      borderLeft:activeCatObj?.color?`4px solid ${activeCatObj.color}`:undefined,
                      display:"inline-flex",alignItems:"center",gap:6,
                  }}>
                    <span style={{fontSize:12,opacity:.6}}>{sel?(sel.neg?"⊖":"⊕"):"·"}</span>
                    <span>{p.label}</span>
                    <span className="mono" style={{fontSize:11,opacity:.4}}>{p.prompt}</span>
                    {tagNames.length>0&&<span style={{fontSize:10,opacity:.5}}>{tagNames.map(n=>"#"+n).join(" ")}</span>}
                    <span style={{fontSize:10,opacity:.4,marginLeft:2}}>📋</span>
                  </button>);
                })}
              </div>
            </div>
          )}

          {/* ═══ MANAGE ═══ */}
          {tab==="manage"&&(
            <div className="fi">
              {/* Add prompt section */}
              <div style={{background:"var(--bg2)",borderRadius:12,padding:16,marginBottom:18,border:"1px solid var(--bdr)"}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>プロンプト追加</div>
                <select value={manageCat} onChange={e=>setManageCat(e.target.value)} style={{marginBottom:10,width:"auto",minWidth:160}}>
                  {sortedCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                  <Btn on={()=>handleEmphasis("{","}")} bg="var(--posBg)" color="var(--pos)" border="1px solid var(--posBdr)" small>{"{ } 強調"}</Btn>
                  <Btn on={()=>handleEmphasis("{{","}}")} bg="var(--posBg)" color="var(--pos)" border="1px solid var(--posBdr)" small>{"{{ }} ×2"}</Btn>
                  <Btn on={()=>handleEmphasis("[","]")} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>{"[ ] 弱化"}</Btn>
                  <Btn on={stripOuter} small>括弧除去</Btn>
                </div>
                <textarea ref={promptRef} value={newPrompt} onChange={e=>setNewPrompt(e.target.value)} placeholder="プロンプト (英語)　例: jumping" rows={2}
                  style={{fontFamily:"'JetBrains Mono','Menlo',monospace",fontSize:15,marginBottom:8,resize:"vertical"}}/>
                {newPrompt&&(<div style={{marginBottom:8,padding:"6px 12px",borderRadius:8,background:"var(--bg0)",fontSize:14}}>
                  <span style={{color:"var(--dim)",marginRight:6}}>プレビュー:</span>
                  <span className="mono">{newPrompt}</span>
                </div>)}
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="表示名 (日本語)　例: ジャンプ"/>
                </div>

                {/* tags chooser for new prompt */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:12,color:"var(--dim)",marginBottom:6}}>タグ ({manageCatObj?.name} 用)</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                    {(manageCatObj?.tags||[]).length===0&&<span style={{fontSize:12,color:"var(--dim)"}}>既存タグなし — 下から作成</span>}
                    {(manageCatObj?.tags||[]).map(t=>{
                      const a=newPromptTagIds.includes(t.id);
                      return <button key={t.id} onClick={()=>setNewPromptTagIds(arr=>arr.includes(t.id)?arr.filter(x=>x!==t.id):[...arr,t.id])} style={{
                        padding:"4px 10px",borderRadius:14,fontSize:12,fontWeight:500,
                        background:a?"var(--accDim)":"var(--bg2)",color:a?"var(--acc)":"var(--dim)",
                        border:a?"1px solid var(--acc)":"1px solid var(--bdr)",
                      }}>#{t.name}</button>;
                    })}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <input value={newPromptTagInput} onChange={e=>setNewPromptTagInput(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();quickAddTagForNew()}}}
                      placeholder="新規タグ名（Enter または +）" style={{fontSize:14}}/>
                    <Btn on={quickAddTagForNew} small>＋ 新規タグ</Btn>
                  </div>
                </div>

                <Btn on={addPromptItem} bg="var(--acc)" color="#000" border="none">追加</Btn>
              </div>

              {/* Existing prompts list */}
              <div style={{marginBottom:18}}>
                <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:15,fontWeight:600}}>登録済みプロンプト</span>
                  <select value={manageCat} onChange={e=>setManageCat(e.target.value)} style={{marginLeft:"auto",width:"auto",fontSize:14}}>
                    {sortedCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="検索..." style={{marginBottom:8}}/>
                <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:400,overflowY:"auto"}}>
                  {filteredManage.length===0&&<span style={{color:"var(--dim)",fontSize:14}}>プロンプトなし</span>}
                  {filteredManage.map((p,idx)=>{
                    const tagNames=(p.tagIds||[]).map(tid=>(manageCatObj?.tags||[]).find(t=>t.id===tid)?.name).filter(Boolean);
                    const reorderDisabled=!!search;
                    return (
                    <div key={p.id} style={{display:"flex",flexDirection:"column",gap:6,padding:"10px 12px",borderRadius:8,background:"var(--bg2)",borderLeft:`3px solid ${manageCatObj?.color||"var(--accDim)"}`}}>
                      {editId===p.id?(
                        <>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            <input value={editPrompt} onChange={e=>setEditPrompt(e.target.value)} style={{flex:1,minWidth:160,fontSize:14}}/>
                            <input value={editLabel} onChange={e=>setEditLabel(e.target.value)} style={{width:140,fontSize:14}}/>
                          </div>
                          <div>
                            <div style={{fontSize:12,color:"var(--dim)",marginBottom:4}}>タグ</div>
                            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
                              {(manageCatObj?.tags||[]).map(t=>{
                                const a=editTagIds.includes(t.id);
                                return <button key={t.id} onClick={()=>setEditTagIds(arr=>arr.includes(t.id)?arr.filter(x=>x!==t.id):[...arr,t.id])} style={{
                                  padding:"4px 10px",borderRadius:14,fontSize:12,
                                  background:a?"var(--accDim)":"var(--bg2)",color:a?"var(--acc)":"var(--dim)",
                                  border:a?"1px solid var(--acc)":"1px solid var(--bdr)",
                                }}>#{t.name}</button>;
                              })}
                            </div>
                            <div style={{display:"flex",gap:6}}>
                              <input value={editTagInput} onChange={e=>setEditTagInput(e.target.value)}
                                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();quickAddTagForEdit(p.catId)}}}
                                placeholder="新規タグ名" style={{fontSize:13}}/>
                              <Btn on={()=>quickAddTagForEdit(p.catId)} small>＋ 新規</Btn>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                            <Btn on={()=>saveEdit(p.id)} bg="var(--acc)" color="#000" border="none" small>保存</Btn>
                            <Btn on={()=>setEditId(null)} small>取消</Btn>
                          </div>
                        </>
                      ):(
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <Btn on={()=>movePromptItem(p.id,-1)} disabled={reorderDisabled||idx===0} small style={{padding:"4px 8px"}} title={reorderDisabled?"検索中は並び替え不可":"上へ"}>↑</Btn>
                          <Btn on={()=>movePromptItem(p.id,1)} disabled={reorderDisabled||idx===filteredManage.length-1} small style={{padding:"4px 8px"}} title={reorderDisabled?"検索中は並び替え不可":"下へ"}>↓</Btn>
                          <span className="mono" style={{fontSize:14,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis"}}>{p.prompt}</span>
                          <span style={{fontSize:13,color:"var(--dim)",flexShrink:0}}>{p.label}</span>
                          {tagNames.length>0&&<span style={{fontSize:11,color:"var(--acc)",opacity:.7}}>{tagNames.map(n=>"#"+n).join(" ")}</span>}
                          <Btn on={()=>copyText(p.prompt,p.label)} small>コピー</Btn>
                          <Btn on={()=>startEdit(p)} small>編集</Btn>
                          <Btn on={()=>deletePrompt(p.id)} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
                        </div>
                      )}
                    </div>
                  );})}
                </div>
              </div>

              {/* Category management */}
              <div style={{background:"var(--bg2)",borderRadius:12,padding:16,marginBottom:18,border:"1px solid var(--bdr)"}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>カテゴリ管理</div>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="新しいカテゴリ名"/>
                  <Btn on={addCategory} bg="var(--acc)" color="#000" border="none">追加</Btn>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {sortedCats.map((c,idx)=>(
                    <div key={c.id} style={{display:"flex",flexDirection:"column",gap:6,padding:"8px 12px",borderRadius:8,background:"var(--bg0)",borderLeft:c.color?`3px solid ${c.color}`:"3px solid transparent"}}>
                      {renameCatId===c.id?(
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <input value={renameCatName} onChange={e=>setRenameCatName(e.target.value)} style={{flex:1,fontSize:14}}/>
                          <Btn on={()=>renameCategory(c.id)} bg="var(--acc)" color="#000" border="none" small>保存</Btn>
                          <Btn on={()=>setRenameCatId(null)} small>取消</Btn>
                        </div>
                      ):(
                        <>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            <Btn on={()=>moveCat(c.id,-1)} disabled={idx===0} small style={{padding:"6px 8px"}}>↑</Btn>
                            <Btn on={()=>moveCat(c.id,1)} disabled={idx===sortedCats.length-1} small style={{padding:"6px 8px"}}>↓</Btn>
                            <span style={{flex:1,fontSize:14,minWidth:120,display:"inline-flex",alignItems:"center",gap:6}}>
                              {c.color&&<span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:c.color}}/>}
                              {c.name}
                            </span>
                            <span style={{fontSize:12,color:"var(--dim)"}}>{prompts.filter(p=>p.catId===c.id).length}件 / タグ{(c.tags||[]).length}</span>
                            <Btn on={()=>{setRenameCatId(c.id);setRenameCatName(c.name)}} small>名前変更</Btn>
                            <Btn on={()=>{if(confirm(`「${c.name}」と中のプロンプトを全削除しますか？`))deleteCategory(c.id)}} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            <span style={{fontSize:11,color:"var(--dim)"}}>色:</span>
                            {PRESET_COLORS.map(pc=>(
                              <button key={pc.hex||"none"} onClick={()=>setCatColor(c.id,pc.hex)} title={pc.name} style={{
                                width:22,height:22,borderRadius:"50%",cursor:"pointer",
                                background:pc.hex||"transparent",
                                border:(c.color||"")===pc.hex?"2px solid var(--txt)":"1px solid var(--bdr)",
                                position:"relative",
                              }}>{!pc.hex&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"var(--dim)"}}>×</span>}</button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tag management for current category */}
              {manageCatObj&&(
                <div style={{background:"var(--bg2)",borderRadius:12,padding:16,marginBottom:18,border:"1px solid var(--bdr)"}}>
                  <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>タグ管理（{manageCatObj.name}）</div>
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    <input value={newTagName} onChange={e=>setNewTagName(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addTag()}}}
                      placeholder="新しいタグ名"/>
                    <Btn on={addTag} bg="var(--acc)" color="#000" border="none">追加</Btn>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {(manageCatObj.tags||[]).length===0&&<span style={{color:"var(--dim)",fontSize:13}}>タグなし</span>}
                    {(manageCatObj.tags||[]).map(t=>(
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:8,background:"var(--bg0)",flexWrap:"wrap"}}>
                        {renameTagId===t.id?(
                          <>
                            <input value={renameTagName} onChange={e=>setRenameTagName(e.target.value)} style={{flex:1,fontSize:14}}/>
                            <Btn on={()=>renameTag(manageCatObj.id,t.id)} bg="var(--acc)" color="#000" border="none" small>保存</Btn>
                            <Btn on={()=>setRenameTagId(null)} small>取消</Btn>
                          </>
                        ):(
                          <>
                            <span style={{flex:1,fontSize:14,minWidth:120}}>#{t.name}</span>
                            <span style={{fontSize:12,color:"var(--dim)"}}>{tagCount(manageCatObj.id,t.id)}件使用</span>
                            <Btn on={()=>{setRenameTagId(t.id);setRenameTagName(t.name)}} small>名前変更</Btn>
                            <Btn on={()=>{if(confirm(`タグ「${t.name}」を削除しますか？`))deleteTag(manageCatObj.id,t.id)}} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* export/import */}
              <div style={{background:"var(--bg2)",borderRadius:12,padding:16,border:"1px solid var(--bdr)"}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>プロンプト一覧の書き出し／読み込み</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Btn on={exportList}>📥 書き出し (JSON)</Btn>
                  <label style={{padding:"10px 18px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",background:"var(--bg2)",color:"var(--dim)",border:"1px solid var(--bdr)",display:"inline-flex",alignItems:"center"}}>
                    📤 置換読み込み
                    <input type="file" accept=".json" style={{display:"none"}} onChange={importList}/>
                  </label>
                  <label style={{padding:"10px 18px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",background:"var(--accDim)",color:"var(--acc)",border:"1px solid var(--acc)",display:"inline-flex",alignItems:"center"}}>
                    ➕ マージ読み込み
                    <input type="file" accept=".json" style={{display:"none"}} onChange={importListMerge}/>
                  </label>
                </div>
                <div style={{fontSize:12,color:"var(--dim)",marginTop:8}}>
                  ・置換: 現在のデータが完全に置き換わります<br/>
                  ・マージ: 既存に追加。同名カテゴリ／タグは統合、同じ英文＋表示名のプロンプトはスキップします
                </div>
              </div>
            </div>
          )}

          {/* ═══ OUTPUT ═══ */}
          {tab==="output"&&(
            <div className="fi">
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:15,fontWeight:600,color:"var(--pos)"}}>⊕ ポジティブ</span>
                  <Btn on={()=>copyText(posOut,"ポジティブ")} disabled={!posOut} bg={posOut?"var(--posBdr)":undefined} color={posOut?"#fff":undefined} border="none" small style={{marginLeft:"auto"}}>コピー</Btn>
                </div>
                <div className="mono" onDoubleClick={()=>copyText(posOut,"ポジティブ")} title="ダブルクリックでコピー" style={{padding:14,borderRadius:10,fontSize:14,lineHeight:1.7,minHeight:50,wordBreak:"break-all",background:"var(--bg2)",border:"1px solid var(--posBdr)",color:"var(--pos)",userSelect:"all",WebkitUserSelect:"all",cursor:posOut?"pointer":"default"}}>{posOut||<span style={{opacity:.35}}>（未選択）</span>}</div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:15,fontWeight:600,color:"var(--neg)"}}>⊖ ネガティブ</span>
                  <Btn on={()=>copyText(negOut,"ネガティブ")} disabled={!negOut} bg={negOut?"var(--negBdr)":undefined} color={negOut?"#fff":undefined} border="none" small style={{marginLeft:"auto"}}>コピー</Btn>
                </div>
                <div className="mono" onDoubleClick={()=>copyText(negOut,"ネガティブ")} title="ダブルクリックでコピー" style={{padding:14,borderRadius:10,fontSize:14,lineHeight:1.7,minHeight:50,wordBreak:"break-all",background:"var(--bg2)",border:"1px solid var(--negBdr)",color:"var(--neg)",userSelect:"all",WebkitUserSelect:"all",cursor:negOut?"pointer":"default"}}>{negOut||<span style={{opacity:.35}}>（未選択）</span>}</div>
              </div>

              {/* Save section */}
              <div style={{background:"var(--bg2)",borderRadius:12,padding:16,marginBottom:18,border:"1px solid var(--goldBdr)"}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:10,color:"var(--gold)"}}>★ 完成プロンプトとして保存</div>
                <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:13,color:"var(--pos)",fontWeight:600,minWidth:90}}>⊕ ポジ →</span>
                  <select value={savePosCatId} onChange={e=>setSavePosCatId(e.target.value)} disabled={!posOut} style={{flex:1,minWidth:140,fontSize:14,opacity:posOut?1:.4}}>
                    {sortedSavedCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:13,color:"var(--neg)",fontWeight:600,minWidth:90}}>⊖ ネガ →</span>
                  <select value={saveNegCatId} onChange={e=>setSaveNegCatId(e.target.value)} disabled={!negOut} style={{flex:1,minWidth:140,fontSize:14,opacity:negOut?1:.4}}>
                    {sortedSavedCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{fontSize:11,color:"var(--dim)",marginBottom:8}}>
                  {posOut&&negOut&&savePosCatId===saveNegCatId?"※ 同じカテゴリなので 1件にまとめて保存します":posOut&&negOut?"※ 別カテゴリなので 2件に分けて保存します":""}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="保存名（空欄で自動命名）"/>
                  <Btn on={saveOutput} disabled={!posOut&&!negOut} bg="var(--goldBdr)" color="#fff" border="none">保存</Btn>
                </div>
              </div>

              {/* Saved category management */}
              <div style={{background:"var(--bg2)",borderRadius:12,padding:16,marginBottom:18,border:"1px solid var(--bdr)"}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>完成プロンプト カテゴリ管理</div>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <input value={newSavedCatName} onChange={e=>setNewSavedCatName(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addSavedCat()}}}
                    placeholder="新しいカテゴリ名"/>
                  <Btn on={addSavedCat} bg="var(--acc)" color="#000" border="none">追加</Btn>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {sortedSavedCats.map((c,idx)=>(
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:8,background:"var(--bg0)",flexWrap:"wrap"}}>
                      {renameSavedCatId===c.id?(
                        <>
                          <input value={renameSavedCatName} onChange={e=>setRenameSavedCatName(e.target.value)} style={{flex:1,fontSize:14}}/>
                          <Btn on={()=>renameSavedCategory(c.id)} bg="var(--acc)" color="#000" border="none" small>保存</Btn>
                          <Btn on={()=>setRenameSavedCatId(null)} small>取消</Btn>
                        </>
                      ):(
                        <>
                          <Btn on={()=>moveSavedCat(c.id,-1)} disabled={idx===0} small style={{padding:"6px 8px"}}>↑</Btn>
                          <Btn on={()=>moveSavedCat(c.id,1)} disabled={idx===sortedSavedCats.length-1} small style={{padding:"6px 8px"}}>↓</Btn>
                          <span style={{flex:1,fontSize:14,minWidth:100}}>{c.name}</span>
                          <span style={{fontSize:12,color:"var(--dim)"}}>{saved.filter(s=>s.savedCatId===c.id).length}件</span>
                          <Btn on={()=>{setRenameSavedCatId(c.id);setRenameSavedCatName(c.name)}} small>名前変更</Btn>
                          <Btn on={()=>{if(c.id==="default"){flash("既定カテゴリは削除できません");return}if(confirm(`「${c.name}」を削除しますか？\n中のプロンプトは未分類に移動します。`))deleteSavedCat(c.id)}} disabled={c.id==="default"} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Saved prompts grouped by category */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>保存済みプロンプト ({saved.length})</div>
                {saved.length===0&&<span style={{fontSize:14,color:"var(--dim)"}}>保存されたプロンプトはまだありません</span>}
                {sortedSavedCats.map(cat=>{
                  const items=saved.filter(s=>s.savedCatId===cat.id);
                  if(items.length===0) return null;
                  return (
                    <div key={cat.id} style={{marginBottom:14}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--gold)",marginBottom:6,padding:"4px 8px",background:"var(--goldBg)",borderRadius:6,display:"inline-block"}}>★ {cat.name} ({items.length})</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {items.map(s=>{
                          const open=expandedSaved===s.id;
                          return(
                            <div key={s.id} style={{background:"var(--bg2)",borderRadius:10,border:"1px solid var(--bdr)",overflow:"hidden"}}>
                              <div onClick={()=>setExpandedSaved(open?null:s.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 14px",cursor:"pointer"}}>
                                <span style={{fontSize:14,color:"var(--gold)",transform:open?"rotate(90deg)":"rotate(0)",transition:"transform .15s",flexShrink:0}}>▶</span>
                                <span style={{fontSize:14,fontWeight:600,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
                                <span style={{fontSize:12,color:"var(--dim)",flexShrink:0}}>{s.date}</span>
                              </div>
                              {open&&(
                                <div className="fi" style={{padding:"0 14px 14px",display:"flex",flexDirection:"column",gap:10}}>
                                  {s.pos&&(<div>
                                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                                      <span style={{fontSize:13,fontWeight:600,color:"var(--pos)"}}>⊕ Positive</span>
                                      <Btn on={()=>copyText(s.pos,"ポジティブ")} bg="var(--posBg)" color="var(--pos)" border="1px solid var(--posBdr)" small>コピー</Btn>
                                    </div>
                                    <div className="mono" onDoubleClick={()=>copyText(s.pos,"ポジティブ")} title="ダブルクリックでコピー" style={{fontSize:13,lineHeight:1.6,padding:"8px 10px",borderRadius:6,background:"var(--bg0)",color:"var(--pos)",wordBreak:"break-all",userSelect:"all",WebkitUserSelect:"all",cursor:"pointer"}}>{s.pos}</div>
                                  </div>)}
                                  {s.neg&&(<div>
                                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                                      <span style={{fontSize:13,fontWeight:600,color:"var(--neg)"}}>⊖ Negative</span>
                                      <Btn on={()=>copyText(s.neg,"ネガティブ")} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>コピー</Btn>
                                    </div>
                                    <div className="mono" onDoubleClick={()=>copyText(s.neg,"ネガティブ")} title="ダブルクリックでコピー" style={{fontSize:13,lineHeight:1.6,padding:"8px 10px",borderRadius:6,background:"var(--bg0)",color:"var(--neg)",wordBreak:"break-all",userSelect:"all",WebkitUserSelect:"all",cursor:"pointer"}}>{s.neg}</div>
                                  </div>)}
                                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                                    <span style={{fontSize:12,color:"var(--dim)"}}>移動先:</span>
                                    <select value={s.savedCatId} onChange={e=>moveSavedItem(s.id,e.target.value)} style={{width:"auto",minWidth:140,fontSize:13,padding:"6px 10px"}}>
                                      {sortedSavedCats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <Btn on={()=>{if(confirm(`「${s.name}」を削除しますか？`))deleteSaved(s.id)}} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small style={{marginLeft:"auto"}}>削除</Btn>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          </div>
        </div>

        {/* ═══ SELECTION BAR (fixed bottom) ═══ */}
        <div style={{
          flexShrink: 0, borderTop: "1px solid var(--bdr)", background: "var(--bg0)",
          padding: `10px 16px calc(10px + var(--safe-b))`,
          maxHeight: 200, overflowY: "auto",
        }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:selCount>0?6:0}}>
              <span style={{fontSize:13,fontWeight:600,color:"var(--dim)"}}>選択中 ({selCount})</span>
              {selCount>0&&<Btn on={clearAll} small style={{marginLeft:"auto"}}>全解除</Btn>}
            </div>
            {selCount>0&&(
              <>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:80,overflowY:"auto",marginBottom:6}}>
                  {sortedSels.map(({id,s,p},i)=>{
                    const prev=sortedSels[i-1];
                    const showSep=i>0&&prev&&prev.p.catId!==p.catId;
                    const cat=sortedCats.find(c=>c.id===p.catId);
                    return(
                      <span key={id} style={{display:"inline-flex",alignItems:"center",gap:4}}>
                        {showSep&&<span style={{width:1,alignSelf:"stretch",background:"var(--bdr)",margin:"0 2px"}}/>}
                        <div style={{display:"inline-flex",alignItems:"center",gap:4,padding:"5px 8px",borderRadius:6,fontSize:12,
                          background:s.neg?"var(--negBg)":"var(--posBg)",border:`1px solid ${s.neg?"var(--negBdr)":"var(--posBdr)"}`,color:s.neg?"var(--neg)":"var(--pos)"}}>
                          <button onClick={()=>setWeight(id,-1)} title="弱める" style={{background:"none",color:"inherit",fontSize:16,padding:"0 3px",lineHeight:1}}>−</button>
                          <span className="mono" style={{fontSize:11,minWidth:16,textAlign:"center"}}>{s.w>0?"+"+s.w:s.w}</span>
                          <button onClick={()=>setWeight(id,1)} title="強める" style={{background:"none",color:"inherit",fontSize:16,padding:"0 3px",lineHeight:1}}>+</button>
                          <button onClick={()=>flipSel(id)} title="ポジ／ネガを切替" style={{background:"none",color:"inherit",fontSize:12,padding:"0 4px",lineHeight:1,fontWeight:700}}>{s.neg?"⊖":"⊕"}</button>
                          <span style={{margin:"0 2px"}} title={cat?.name||""}>{p.label}</span>
                          <button onClick={()=>removeSel(id)} title="削除" style={{background:"none",color:"inherit",fontSize:16,padding:"0 3px",opacity:.5,lineHeight:1}}>×</button>
                        </div>
                      </span>
                    );
                  })}
                </div>
                <div className="mono" style={{padding:"5px 8px",borderRadius:6,background:"var(--bg2)",fontSize:11,color:"var(--dim)",wordBreak:"break-all",lineHeight:1.5}}>
                  {posOut&&<div><span style={{color:"var(--pos)",fontWeight:700}}>P:</span> {posOut}</div>}
                  {negOut&&<div><span style={{color:"var(--neg)",fontWeight:700}}>N:</span> {negOut}</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast&&(
        <div style={{position:"fixed",top:60,left:"50%",transform:"translateX(-50%)",zIndex:999,
          padding:"12px 28px",borderRadius:10,background:"var(--acc)",color:"#000",
          fontSize:15,fontWeight:600,boxShadow:"0 4px 24px rgba(0,0,0,.5)",animation:"fi .2s ease-out"}}>{toast}</div>
      )}
    </>
  );
}
