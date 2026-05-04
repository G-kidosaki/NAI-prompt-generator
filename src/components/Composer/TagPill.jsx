import { useState, useRef, useEffect } from "react";
import { serializeRandomizer } from "../../lib/randomizer";

const ROLE_COLORS = {
  none:   { bg: "var(--bg2)",  fg: "var(--txt)", bd: "var(--bdr)" },
  source: { bg: "var(--accDim)", fg: "var(--acc)", bd: "var(--acc)" },
  target: { bg: "var(--negBg)",  fg: "var(--neg)", bd: "var(--negBdr)" },
  mutual: { bg: "#3b1f4a",       fg: "#a78bfa",    bd: "#a78bfa" },
};

const ROLE_LABELS = { none: "—", source: "src", target: "tgt", mutual: "mut" };
const ROLES = ["none", "source", "target", "mutual"];

const formatWeight = (w) => {
  if (w.kind === "v3") {
    if (w.w === 0) return "";  // デフォルトは何も表示しない
    return w.w > 0 ? `+${w.w}` : `${w.w}`;
  }
  if (w.n === 1) return "";
  return w.n.toFixed(2);
};

const stepWeight = (w, dir) => {
  if (w.kind === "v3") {
    return { kind: "v3", w: Math.max(-5, Math.min(5, w.w + dir)) };
  }
  const next = Math.round((w.n + dir * 0.1) * 100) / 100;
  return { kind: "numeric", n: Math.max(-2, Math.min(3, next)) };
};

const cycleRole = (cur, model) => {
  if (model === "v3") return "none";
  const idx = ROLES.indexOf(cur);
  return ROLES[(idx + 1) % ROLES.length];
};

export default function TagPill({ tag, model, neg, onUpdate, onRemove, onMove }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(tag.text);
  const [randomDraft, setRandomDraft] = useState(tag.random ? tag.random.variants.join(", ") : "");
  const popRef = useRef(null);

  const c = ROLE_COLORS[tag.role] ?? ROLE_COLORS.none;
  const isRandom = !!tag.random && tag.random.variants.length >= 2;
  const labelText = isRandom
    ? "🎲 " + tag.random.variants.length + "通り"
    : tag.text;
  const weightLabel = formatWeight(tag.weight);

  // 外部クリックで popover 閉じる
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const openPopover = () => {
    setText(tag.text);
    setRandomDraft(tag.random ? tag.random.variants.join(", ") : "");
    setOpen(true);
  };

  const commitText = () => {
    const variants = randomDraft.split(",").map((v) => v.trim()).filter(Boolean);
    onUpdate({
      text: text.trim() || tag.text,
      random: variants.length >= 2 ? { variants } : undefined,
    });
  };

  const toggleNumeric = () => {
    const next = tag.weight.kind === "numeric"
      ? { kind: "v3", w: 0 }
      : { kind: "numeric", n: 1 };
    onUpdate({ weight: next });
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* === デフォルト表示: 最小ピル === */}
      <button
        onClick={openPopover}
        title="クリックで編集"
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "5px 10px", borderRadius: 14, fontSize: 13, fontWeight: 500,
          background: neg ? "var(--negBg)" : c.bg,
          border: `1px solid ${neg ? "var(--negBdr)" : c.bd}`,
          color: neg ? "var(--neg)" : c.fg,
          cursor: "pointer", maxWidth: 280,
        }}
      >
        {tag.role !== "none" && model !== "v3" && (
          <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 3, background: "var(--bg0)", fontWeight: 700 }}>
            {ROLE_LABELS[tag.role]}
          </span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{labelText}</span>
        {weightLabel && (
          <span className="mono" style={{ fontSize: 10, opacity: .7, padding: "0 2px" }}>{weightLabel}</span>
        )}
      </button>

      {/* === Popover: 全操作 === */}
      {open && (
        <div
          ref={popRef}
          style={{
            position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 100,
            background: "var(--bg0)", border: "1px solid var(--bdr)", borderRadius: 10,
            padding: 10, minWidth: 280, boxShadow: "0 6px 20px rgba(0,0,0,.5)",
          }}
        >
          {/* タグ本文 */}
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 4 }}>タグ</div>
          <input
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitText(); setOpen(false); } if (e.key === "Escape") setOpen(false); }}
            placeholder="例: blue eyes"
            style={{ fontSize: 13, marginBottom: 8 }}
          />

          {/* 重み */}
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 4 }}>強調</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <button onClick={() => onUpdate({ weight: stepWeight(tag.weight, -1) })} title="弱める"
              style={{ background: "var(--bg2)", color: "var(--txt)", padding: "4px 10px", borderRadius: 6, fontSize: 14, fontWeight: 700 }}>−</button>
            <span className="mono" style={{ flex: 1, textAlign: "center", fontSize: 13, padding: "4px 8px", background: "var(--bg2)", borderRadius: 6 }}>
              {tag.weight.kind === "numeric" ? tag.weight.n.toFixed(2) : (tag.weight.w === 0 ? "1.00" : (tag.weight.w > 0 ? "+" + tag.weight.w : tag.weight.w))}
            </span>
            <button onClick={() => onUpdate({ weight: stepWeight(tag.weight, 1) })} title="強める"
              style={{ background: "var(--bg2)", color: "var(--txt)", padding: "4px 10px", borderRadius: 6, fontSize: 14, fontWeight: 700 }}>＋</button>
            <button onClick={toggleNumeric} title={tag.weight.kind === "numeric" ? "→ V3 形式 {{}}" : "→ 数値強調 ::"}
              style={{ background: "var(--bg2)", color: "var(--dim)", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
              {tag.weight.kind === "numeric" ? "1.3::" : "{{}}"}
            </button>
          </div>

          {/* role (V4+) */}
          {model !== "v3" && (
            <>
              <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 4 }}>アクション主体（V4+）</div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => onUpdate({ role: r })}
                    title={r === "none" ? "通常" : r === "source" ? "行動の主体" : r === "target" ? "行動の対象" : "相互の行動"}
                    style={{
                      flex: 1, padding: "5px 0", fontSize: 11, fontWeight: 600, borderRadius: 5,
                      background: tag.role === r ? (ROLE_COLORS[r]?.bg) : "var(--bg2)",
                      color: tag.role === r ? (ROLE_COLORS[r]?.fg) : "var(--dim)",
                      border: tag.role === r ? `1px solid ${ROLE_COLORS[r]?.bd}` : "1px solid transparent",
                    }}
                  >{r === "none" ? "通常" : ROLE_LABELS[r]}</button>
                ))}
              </div>
            </>
          )}

          {/* ランダマイザ */}
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 4 }}>🎲 ランダマイザ（カンマ区切り、2件以上で有効）</div>
          <input
            value={randomDraft}
            onChange={(e) => setRandomDraft(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitText(); setOpen(false); } }}
            placeholder="例: red hair, blue hair"
            style={{ fontSize: 12, marginBottom: 10 }}
          />

          {/* 操作 */}
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => onMove?.(-1)} title="左へ"
              style={{ background: "var(--bg2)", color: "var(--dim)", padding: "5px 8px", borderRadius: 5, fontSize: 13 }}>‹</button>
            <button onClick={() => onMove?.(1)} title="右へ"
              style={{ background: "var(--bg2)", color: "var(--dim)", padding: "5px 8px", borderRadius: 5, fontSize: 13 }}>›</button>
            <button onClick={() => onUpdate({ neg: !tag.neg })} title="ポジ／ネガを切替"
              style={{ background: "var(--bg2)", color: "var(--dim)", padding: "5px 10px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>
              {tag.neg ? "ネガ→ポジ" : "ポジ→ネガ"}
            </button>
            <span style={{ flex: 1 }} />
            <button onClick={onRemove} title="削除"
              style={{ background: "var(--negBg)", color: "var(--neg)", padding: "5px 10px", borderRadius: 5, fontSize: 12, fontWeight: 700, border: "1px solid var(--negBdr)" }}>
              🗑 削除
            </button>
          </div>

          <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 8, lineHeight: 1.4 }}>
            ↵ Enter で保存 ／ Esc で閉じる
          </div>
        </div>
      )}
    </div>
  );
}
