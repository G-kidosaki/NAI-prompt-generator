import { useState, useEffect, useRef } from "react";
import storage from "./storage";

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () =>
  new Date().toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

const INIT_CATS = [
  { id: "char", name: "キャラクター", order: 0 },
  { id: "expr", name: "表情", order: 1 },
  { id: "act", name: "行為", order: 2 },
  { id: "outfit", name: "服装", order: 3 },
  { id: "place", name: "場所", order: 4 },
  { id: "comp", name: "構図", order: 5 },
  { id: "light", name: "光・色調", order: 6 },
  { id: "quality", name: "品質", order: 7 },
];

const INIT_PROMPTS = [
  { id: "p1", catId: "char", prompt: "1girl", label: "女の子", neg: false },
  { id: "p2", catId: "char", prompt: "1boy", label: "男の子", neg: false },
  { id: "p3", catId: "char", prompt: "blonde hair", label: "金髪", neg: false },
  { id: "p4", catId: "expr", prompt: "smile", label: "笑顔", neg: false },
  { id: "p5", catId: "expr", prompt: "crying", label: "泣き", neg: false },
  { id: "p6", catId: "act", prompt: "standing", label: "立ち", neg: false },
  { id: "p7", catId: "act", prompt: "jumping", label: "ジャンプ", neg: false },
  { id: "p8", catId: "outfit", prompt: "school uniform", label: "制服", neg: false },
  { id: "p9", catId: "outfit", prompt: "dress", label: "ドレス", neg: false },
  { id: "p10", catId: "place", prompt: "classroom", label: "教室", neg: false },
  { id: "p11", catId: "place", prompt: "forest", label: "森", neg: false },
  { id: "p12", catId: "comp", prompt: "close-up", label: "アップ", neg: false },
  { id: "p13", catId: "comp", prompt: "full body", label: "全身", neg: false },
  { id: "p14", catId: "light", prompt: "dramatic lighting", label: "ドラマチック", neg: false },
  { id: "p15", catId: "quality", prompt: "masterpiece", label: "傑作", neg: false },
  { id: "p16", catId: "quality", prompt: "best quality", label: "最高品質", neg: false },
  { id: "p17", catId: "quality", prompt: "lowres", label: "低解像度", neg: true },
  { id: "p18", catId: "quality", prompt: "bad anatomy", label: "破綻", neg: true },
];

const wrap = (text, w) => {
  let r = text;
  if (w > 0) for (let i = 0; i < w; i++) r = "{" + r + "}";
  if (w < 0) for (let i = 0; i < -w; i++) r = "[" + r + "]";
  return r;
};

const SK = "nai-pg-v2";
const SK_SAVED = "nai-pg-saved-v2";

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
  const [cats, setCats] = useState(INIT_CATS);
  const [prompts, setPrompts] = useState(INIT_PROMPTS);
  const [sels, setSels] = useState({});
  const [saved, setSaved] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [tab, setTab] = useState("select");
  const [activeCat, setActiveCat] = useState("char");
  const [search, setSearch] = useState("");

  const [addMode, setAddMode] = useState("positive");
  const [newPrompt, setNewPrompt] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [manageCat, setManageCat] = useState("char");
  const [editId, setEditId] = useState(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editLabel, setEditLabel] = useState("");

  const [newCatName, setNewCatName] = useState("");
  const [renameCatId, setRenameCatId] = useState(null);
  const [renameCatName, setRenameCatName] = useState("");

  const [saveName, setSaveName] = useState("");
  const [expandedSaved, setExpandedSaved] = useState(null);

  const [toast, setToast] = useState("");
  const promptRef = useRef(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  /* ── persistence ── */
  useEffect(() => {
    (async () => {
      try { const r = await storage.get(SK); if (r?.value) { const d = JSON.parse(r.value); if (d.cats?.length) setCats(d.cats); if (d.prompts) setPrompts(d.prompts); if (d.sels) setSels(d.sels); } } catch {}
      try { const r2 = await storage.get(SK_SAVED); if (r2?.value) { const d2 = JSON.parse(r2.value); if (Array.isArray(d2)) setSaved(d2); } } catch {}
      setLoaded(true);
    })();
  }, []);
  useEffect(() => { if (!loaded) return; (async () => { try { await storage.set(SK, JSON.stringify({ cats, prompts, sels })); } catch {} })(); }, [cats, prompts, sels, loaded]);
  useEffect(() => { if (!loaded) return; (async () => { try { await storage.set(SK_SAVED, JSON.stringify(saved)); } catch {} })(); }, [saved, loaded]);

  /* ── selection ── */
  const toggleSel = (id) => setSels((p) => { const n = { ...p }; if (n[id] !== undefined) delete n[id]; else n[id] = 0; return n; });
  const setWeight = (id, d) => setSels((p) => ({ ...p, [id]: Math.max(-5, Math.min(5, (p[id] || 0) + d)) }));
  const removeSel = (id) => setSels((p) => { const n = { ...p }; delete n[id]; return n; });
  const clearAll = () => setSels({});

  /* ── prompt CRUD ── */
  const addPromptItem = () => {
    if (!newPrompt.trim()) return;
    setPrompts((p) => [...p, { id: uid(), catId: manageCat, prompt: newPrompt.trim(), label: newLabel.trim() || newPrompt.trim(), neg: addMode === "negative" }]);
    setNewPrompt(""); setNewLabel(""); flash("プロンプト追加完了");
  };
  const saveEdit = (id) => { setPrompts((p) => p.map((x) => x.id === id ? { ...x, prompt: editPrompt, label: editLabel } : x)); setEditId(null); };
  const deletePrompt = (id) => { setPrompts((p) => p.filter((x) => x.id !== id)); setSels((p) => { const n = { ...p }; delete n[id]; return n; }); };

  /* ── category CRUD ── */
  const addCategory = () => { if (!newCatName.trim()) return; setCats((p) => [...p, { id: uid(), name: newCatName.trim(), order: p.length }]); setNewCatName(""); };
  const renameCategory = (id) => { if (!renameCatName.trim()) return; setCats((p) => p.map((c) => c.id === id ? { ...c, name: renameCatName.trim() } : c)); setRenameCatId(null); };
  const deleteCategory = (id) => {
    const ids = prompts.filter((x) => x.catId === id).map((x) => x.id);
    setCats((p) => p.filter((c) => c.id !== id));
    setPrompts((p) => p.filter((x) => x.catId !== id));
    setSels((p) => { const n = { ...p }; ids.forEach((i) => delete n[i]); return n; });
    if (activeCat === id) setActiveCat(cats.find((c) => c.id !== id)?.id || "");
    if (manageCat === id) setManageCat(cats.find((c) => c.id !== id)?.id || "");
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

  /* ── output ── */
  const buildOut = (neg) => Object.entries(sels).map(([id, w]) => { const p = prompts.find((x) => x.id === id); if (!p || p.neg !== neg) return null; return wrap(p.prompt, w); }).filter(Boolean).join(", ");
  const posOut = buildOut(false);
  const negOut = buildOut(true);
  const selCount = Object.keys(sels).length;

  /* ── save completed ── */
  const saveOutput = () => {
    if (!posOut && !negOut) { flash("出力するプロンプトがありません"); return; }
    const name = saveName.trim() || `プロンプト_${saved.length + 1}`;
    setSaved((p) => [{ id: uid(), name, pos: posOut, neg: negOut, date: now() }, ...p]);
    setSaveName(""); flash(`「${name}」を保存しました`);
  };
  const deleteSaved = (id) => setSaved((p) => p.filter((x) => x.id !== id));

  /* ── copy: iPad Safari 対応 ── */
  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(label + " コピー完了！");
    } catch {
      // fallback for older Safari
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); flash(label + " コピー完了！"); }
      catch { flash("コピー失敗 — 手動でコピーしてください"); }
      document.body.removeChild(ta);
    }
  };

  /* ── export/import: prompt list ── */
  const exportList = () => {
    const blob = new Blob([JSON.stringify({ version: 2, cats, prompts }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: "nai-prompt-list.json" }).click();
    URL.revokeObjectURL(url); flash("プロンプト一覧をエクスポートしました");
  };
  const importList = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const d = JSON.parse(await f.text()); if (d.cats) setCats(d.cats); if (d.prompts) setPrompts(d.prompts); setSels({}); flash(`インポート完了（${(d.prompts || []).length}件）`); }
    catch { flash("読み込みエラー"); } e.target.value = "";
  };

  /* ── export/import: saved ── */
  const exportSaved = () => {
    if (!saved.length) { flash("保存済みプロンプトなし"); return; }
    const blob = new Blob([JSON.stringify({ version: 2, saved }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: "nai-saved-outputs.json" }).click();
    URL.revokeObjectURL(url); flash("エクスポート完了");
  };
  const importSaved = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const d = JSON.parse(await f.text()); if (Array.isArray(d.saved)) { setSaved((p) => [...d.saved, ...p]); flash(`${d.saved.length}件読み込み完了`); } else flash("形式エラー"); }
    catch { flash("読み込みエラー"); } e.target.value = "";
  };

  /* ── filtered ── */
  const filtered = prompts.filter((p) => {
    const catMatch = tab === "select" ? p.catId === activeCat : tab === "manage" ? p.catId === manageCat : false;
    if (!catMatch) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.prompt.toLowerCase().includes(q) || p.label.toLowerCase().includes(q);
  });

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
        /* iPad landscape sidebar optimization */
        @media(min-width:1024px){
          .main-content{display:grid;grid-template-columns:200px 1fr;gap:0}
        }
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
              <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,marginBottom:14,WebkitOverflowScrolling:"touch"}}>
                {cats.map((c)=>{
                  const cnt=prompts.filter(p=>p.catId===c.id&&sels[p.id]!==undefined).length;
                  const a=activeCat===c.id;
                  return(<button key={c.id} onClick={()=>{setActiveCat(c.id);setSearch("")}} style={{
                    padding:"8px 16px",borderRadius:20,fontSize:14,fontWeight:500,whiteSpace:"nowrap",
                    background:a?"var(--accDim)":"var(--bg2)",color:a?"var(--acc)":"var(--dim)",
                    border:a?"1px solid var(--acc)":"1px solid var(--bdr)",
                  }}>{c.name}{cnt>0&&<span style={{marginLeft:5,fontSize:11,opacity:.7}}>({cnt})</span>}</button>);
                })}
              </div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="検索..." style={{marginBottom:14}}/>
              <div style={{display:"flex",flexWrap:"wrap",gap:10,minHeight:60}}>
                {filtered.length===0&&<span style={{color:"var(--dim)",fontSize:14,padding:12}}>プロンプトがありません</span>}
                {filtered.map((p)=>{
                  const sel=sels[p.id]!==undefined;
                  return(<button key={p.id} onClick={()=>toggleSel(p.id)} className={sel?"pop":""} style={{
                    padding:"10px 16px",borderRadius:10,fontSize:14,fontWeight:500,
                    border:sel?`2px solid ${p.neg?"var(--negBdr)":"var(--posBdr)"}`:"1px solid var(--bdr)",
                    background:sel?(p.neg?"var(--negBg)":"var(--posBg)"):"var(--bg2)",
                    color:sel?(p.neg?"var(--neg)":"var(--pos)"):"var(--txt)",
                  }}>
                    <span style={{fontSize:12,opacity:.6,marginRight:5}}>{p.neg?"⊖":"⊕"}</span>
                    {p.label}
                    <span className="mono" style={{fontSize:11,opacity:.4,marginLeft:6}}>{p.prompt}</span>
                  </button>);
                })}
              </div>
            </div>
          )}

          {/* ═══ MANAGE ═══ */}
          {tab==="manage"&&(
            <div className="fi">
              <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:14,color:"var(--dim)"}}>モード:</span>
                {[["positive","⊕ ポジティブ","--pos","--posBg","--posBdr"],["negative","⊖ ネガティブ","--neg","--negBg","--negBdr"]].map(([k,l,c,bg,bd])=>(
                  <button key={k} onClick={()=>setAddMode(k)} style={{
                    padding:"8px 18px",borderRadius:20,fontSize:14,fontWeight:600,
                    background:addMode===k?`var(${bg})`:"var(--bg2)",color:addMode===k?`var(${c})`:"var(--dim)",
                    border:addMode===k?`2px solid var(${bd})`:"1px solid var(--bdr)",
                  }}>{l}</button>
                ))}
              </div>

              <div style={{background:"var(--bg2)",borderRadius:12,padding:16,marginBottom:18,border:`1px solid var(${addMode==="positive"?"--posBdr":"--negBdr"})`}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:10,color:addMode==="positive"?"var(--pos)":"var(--neg)"}}>プロンプト追加</div>
                <select value={manageCat} onChange={e=>setManageCat(e.target.value)} style={{marginBottom:10,width:"auto",minWidth:160}}>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
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
                  <span className="mono" style={{color:addMode==="positive"?"var(--pos)":"var(--neg)"}}>{newPrompt}</span>
                </div>)}
                <div style={{display:"flex",gap:8}}>
                  <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="表示名 (日本語)　例: ジャンプ"/>
                  <Btn on={addPromptItem} bg={addMode==="positive"?"var(--posBdr)":"var(--negBdr)"} color="#fff" border="none">追加</Btn>
                </div>
              </div>

              <div style={{marginBottom:18}}>
                <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:15,fontWeight:600}}>登録済みプロンプト</span>
                  <select value={manageCat} onChange={e=>setManageCat(e.target.value)} style={{marginLeft:"auto",width:"auto",fontSize:14}}>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
                </div>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="検索..." style={{marginBottom:8}}/>
                <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:300,overflowY:"auto"}}>
                  {filtered.length===0&&<span style={{color:"var(--dim)",fontSize:14}}>プロンプトなし</span>}
                  {filtered.map(p=>(
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 12px",borderRadius:8,background:"var(--bg2)",borderLeft:`3px solid var(${p.neg?"--negBdr":"--posBdr"})`}}>
                      {editId===p.id?(
                        <>
                          <input value={editPrompt} onChange={e=>setEditPrompt(e.target.value)} style={{flex:1,fontSize:14}}/>
                          <input value={editLabel} onChange={e=>setEditLabel(e.target.value)} style={{width:100,fontSize:14}}/>
                          <Btn on={()=>saveEdit(p.id)} bg="var(--acc)" color="#000" border="none" small>保存</Btn>
                          <Btn on={()=>setEditId(null)} small>取消</Btn>
                        </>
                      ):(
                        <>
                          <span style={{fontSize:12,color:p.neg?"var(--neg)":"var(--pos)",fontWeight:700,width:18}}>{p.neg?"⊖":"⊕"}</span>
                          <span className="mono" style={{fontSize:14,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis"}}>{p.prompt}</span>
                          <span style={{fontSize:13,color:"var(--dim)",flexShrink:0}}>{p.label}</span>
                          <Btn on={()=>{setEditId(p.id);setEditPrompt(p.prompt);setEditLabel(p.label)}} small>編集</Btn>
                          <Btn on={()=>deletePrompt(p.id)} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{background:"var(--bg2)",borderRadius:12,padding:16,marginBottom:18,border:"1px solid var(--bdr)"}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>カテゴリ管理</div>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="新しいカテゴリ名"/>
                  <Btn on={addCategory} bg="var(--acc)" color="#000" border="none">追加</Btn>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {cats.map(c=>(
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",borderRadius:8,background:"var(--bg0)"}}>
                      {renameCatId===c.id?(
                        <>
                          <input value={renameCatName} onChange={e=>setRenameCatName(e.target.value)} style={{flex:1,fontSize:14}}/>
                          <Btn on={()=>renameCategory(c.id)} bg="var(--acc)" color="#000" border="none" small>保存</Btn>
                          <Btn on={()=>setRenameCatId(null)} small>取消</Btn>
                        </>
                      ):(
                        <>
                          <span style={{flex:1,fontSize:14}}>{c.name}</span>
                          <span style={{fontSize:12,color:"var(--dim)"}}>{prompts.filter(p=>p.catId===c.id).length}件</span>
                          <Btn on={()=>{setRenameCatId(c.id);setRenameCatName(c.name)}} small>名前変更</Btn>
                          <Btn on={()=>{if(confirm(`「${c.name}」と中のプロンプトを全削除しますか？`))deleteCategory(c.id)}} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{background:"var(--bg2)",borderRadius:12,padding:16,border:"1px solid var(--bdr)"}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>プロンプト一覧の書き出し／読み込み</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Btn on={exportList}>📥 書き出し (JSON)</Btn>
                  <label style={{padding:"10px 18px",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",background:"var(--bg2)",color:"var(--dim)",border:"1px solid var(--bdr)",display:"inline-flex",alignItems:"center"}}>
                    📤 読み込み (JSON)
                    <input type="file" accept=".json" style={{display:"none"}} onChange={importList}/>
                  </label>
                </div>
                <div style={{fontSize:12,color:"var(--dim)",marginTop:8}}>読み込むと現在のデータが置き換わります</div>
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
                <div className="mono" style={{padding:14,borderRadius:10,fontSize:14,lineHeight:1.7,minHeight:50,wordBreak:"break-all",background:"var(--bg2)",border:"1px solid var(--posBdr)",color:"var(--pos)",userSelect:"all",WebkitUserSelect:"all"}}>{posOut||<span style={{opacity:.35}}>（未選択）</span>}</div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:15,fontWeight:600,color:"var(--neg)"}}>⊖ ネガティブ</span>
                  <Btn on={()=>copyText(negOut,"ネガティブ")} disabled={!negOut} bg={negOut?"var(--negBdr)":undefined} color={negOut?"#fff":undefined} border="none" small style={{marginLeft:"auto"}}>コピー</Btn>
                </div>
                <div className="mono" style={{padding:14,borderRadius:10,fontSize:14,lineHeight:1.7,minHeight:50,wordBreak:"break-all",background:"var(--bg2)",border:"1px solid var(--negBdr)",color:"var(--neg)",userSelect:"all",WebkitUserSelect:"all"}}>{negOut||<span style={{opacity:.35}}>（未選択）</span>}</div>
              </div>

              <div style={{background:"var(--bg2)",borderRadius:12,padding:16,marginBottom:24,border:"1px solid var(--goldBdr)"}}>
                <div style={{fontSize:15,fontWeight:600,marginBottom:10,color:"var(--gold)"}}>★ 完成プロンプトとして保存</div>
                <div style={{display:"flex",gap:8}}>
                  <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="保存名（空欄で自動命名）"/>
                  <Btn on={saveOutput} disabled={!posOut&&!negOut} bg="var(--goldBdr)" color="#fff" border="none">保存</Btn>
                </div>
              </div>

              <div style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                  <span style={{fontSize:15,fontWeight:600}}>保存済みプロンプト ({saved.length})</span>
                  <div style={{marginLeft:"auto",display:"flex",gap:6}}>
                    <Btn on={exportSaved} disabled={!saved.length} small>📥 書き出し</Btn>
                    <label style={{padding:"6px 12px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",background:"var(--bg2)",color:"var(--dim)",border:"1px solid var(--bdr)",display:"inline-flex",alignItems:"center"}}>
                      📤 読み込み
                      <input type="file" accept=".json" style={{display:"none"}} onChange={importSaved}/>
                    </label>
                  </div>
                </div>
                {saved.length===0&&<span style={{fontSize:14,color:"var(--dim)"}}>保存されたプロンプトはまだありません</span>}
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {saved.map(s=>{
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
                              <div className="mono" style={{fontSize:13,lineHeight:1.6,padding:"8px 10px",borderRadius:6,background:"var(--bg0)",color:"var(--pos)",wordBreak:"break-all",userSelect:"all",WebkitUserSelect:"all"}}>{s.pos}</div>
                            </div>)}
                            {s.neg&&(<div>
                              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                                <span style={{fontSize:13,fontWeight:600,color:"var(--neg)"}}>⊖ Negative</span>
                                <Btn on={()=>copyText(s.neg,"ネガティブ")} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>コピー</Btn>
                              </div>
                              <div className="mono" style={{fontSize:13,lineHeight:1.6,padding:"8px 10px",borderRadius:6,background:"var(--bg0)",color:"var(--neg)",wordBreak:"break-all",userSelect:"all",WebkitUserSelect:"all"}}>{s.neg}</div>
                            </div>)}
                            <Btn on={()=>{if(confirm(`「${s.name}」を削除しますか？`))deleteSaved(s.id)}} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                <div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:64,overflowY:"auto",marginBottom:6}}>
                  {Object.entries(sels).map(([id,w])=>{
                    const p=prompts.find(x=>x.id===id);if(!p)return null;
                    return(
                      <div key={id} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"5px 8px",borderRadius:6,fontSize:12,
                        background:p.neg?"var(--negBg)":"var(--posBg)",border:`1px solid ${p.neg?"var(--negBdr)":"var(--posBdr)"}`,color:p.neg?"var(--neg)":"var(--pos)"}}>
                        <button onClick={()=>setWeight(id,-1)} style={{background:"none",color:"inherit",fontSize:16,padding:"0 3px",lineHeight:1}}>−</button>
                        <span className="mono" style={{fontSize:11,minWidth:16,textAlign:"center"}}>{w>0?"+"+w:w}</span>
                        <button onClick={()=>setWeight(id,1)} style={{background:"none",color:"inherit",fontSize:16,padding:"0 3px",lineHeight:1}}>+</button>
                        <span style={{margin:"0 2px"}}>{p.label}</span>
                        <button onClick={()=>removeSel(id)} style={{background:"none",color:"inherit",fontSize:16,padding:"0 3px",opacity:.5,lineHeight:1}}>×</button>
                      </div>
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
