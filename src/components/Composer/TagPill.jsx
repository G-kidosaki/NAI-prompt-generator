import { useState } from "react";
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
    if (w.w === 0) return "1.00";
    return w.w > 0 ? `+${w.w}` : `${w.w}`;
  }
  return w.n.toFixed(2);
};

const stepWeight = (w, dir) => {
  if (w.kind === "v3") {
    return { kind: "v3", w: Math.max(-5, Math.min(5, w.w + dir)) };
  }
  // numeric: 0.1 step、最低 -2.0 / 最大 +3.0
  const next = Math.round((w.n + dir * 0.1) * 100) / 100;
  return { kind: "numeric", n: Math.max(-2, Math.min(3, next)) };
};

const cycleRole = (cur, model) => {
  if (model === "v3") return "none";
  const idx = ROLES.indexOf(cur);
  return ROLES[(idx + 1) % ROLES.length];
};

export default function TagPill({ tag, model, neg, onUpdate, onRemove, onMove }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(tag.text);
  const [randomDraft, setRandomDraft] = useState(
    tag.random ? tag.random.variants.join(", ") : ""
  );

  const c = ROLE_COLORS[tag.role] ?? ROLE_COLORS.none;
  const isRandom = !!tag.random && tag.random.variants.length >= 2;
  const labelText = isRandom
    ? serializeRandomizer(tag.random.variants)
    : tag.text;

  const startEdit = () => {
    setText(tag.text);
    setRandomDraft(tag.random ? tag.random.variants.join(", ") : "");
    setEditing(true);
  };
  const commitEdit = () => {
    const variants = randomDraft.split(",").map((v) => v.trim()).filter(Boolean);
    onUpdate({
      text: text.trim() || tag.text,
      random: variants.length >= 2 ? { variants } : undefined,
    });
    setEditing(false);
  };
  const toggleNumeric = () => {
    const next = tag.weight.kind === "numeric"
      ? { kind: "v3", w: 0 }
      : { kind: "numeric", n: 1 };
    onUpdate({ weight: next });
  };

  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", gap: 4,
      padding: "6px 8px", borderRadius: 8, fontSize: 12,
      background: neg ? "var(--negBg)" : c.bg,
      border: `1px solid ${neg ? "var(--negBdr)" : c.bd}`,
      color: neg ? "var(--neg)" : c.fg,
      maxWidth: 320,
    }}>
      {!editing ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <button onClick={() => onMove?.(-1)} title="左へ" style={{ background: "none", color: "inherit", fontSize: 14, padding: "0 2px", lineHeight: 1, opacity: .55 }}>‹</button>
            <button onClick={() => onMove?.(1)} title="右へ" style={{ background: "none", color: "inherit", fontSize: 14, padding: "0 2px", lineHeight: 1, opacity: .55 }}>›</button>

            <button onClick={() => onUpdate({ weight: stepWeight(tag.weight, -1) })} title="弱める" style={{ background: "none", color: "inherit", fontSize: 14, padding: "0 4px", lineHeight: 1, fontWeight: 700 }}>−</button>
            <button
              className="mono"
              onClick={toggleNumeric}
              title={tag.weight.kind === "numeric" ? "数値強調 → V3 形式に" : "V3 形式 → 数値強調に"}
              style={{ background: "var(--bg0)", color: "inherit", fontSize: 11, padding: "2px 6px", borderRadius: 4, minWidth: 38, textAlign: "center" }}
            >{formatWeight(tag.weight)}</button>
            <button onClick={() => onUpdate({ weight: stepWeight(tag.weight, 1) })} title="強める" style={{ background: "none", color: "inherit", fontSize: 14, padding: "0 4px", lineHeight: 1, fontWeight: 700 }}>+</button>

            {model !== "v3" && (
              <button
                onClick={() => onUpdate({ role: cycleRole(tag.role, model) })}
                title={`role: ${tag.role}（クリックで切替）`}
                style={{ background: "var(--bg0)", color: "inherit", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}
              >{ROLE_LABELS[tag.role]}</button>
            )}

            <button onClick={() => onUpdate({ neg: !tag.neg })} title="ポジ／ネガを切替" style={{ background: "none", color: "inherit", fontSize: 11, padding: "0 4px", lineHeight: 1, fontWeight: 700 }}>{tag.neg ? "⊖" : "⊕"}</button>

            <span
              onClick={startEdit}
              title="クリックで編集"
              className="mono"
              style={{ margin: "0 4px", cursor: "text", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >{labelText}</span>

            <button onClick={onRemove} title="削除" style={{ background: "none", color: "inherit", fontSize: 14, padding: "0 4px", opacity: .55, lineHeight: 1 }}>×</button>
          </div>
          {isRandom && (
            <div style={{ fontSize: 10, opacity: .65 }}>🎲 {tag.random.variants.length} 通り</div>
          )}
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 220 }}>
          <input
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
            placeholder="タグ"
            style={{ fontSize: 13 }}
          />
          <input
            value={randomDraft}
            onChange={(e) => setRandomDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
            placeholder="🎲 ランダマイザ案 (カンマ区切り、2件以上で有効)"
            style={{ fontSize: 12 }}
          />
          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
            <button onClick={() => setEditing(false)} style={{ background: "var(--bg2)", color: "var(--dim)", padding: "4px 8px", borderRadius: 4, fontSize: 11, border: "1px solid var(--bdr)" }}>取消</button>
            <button onClick={commitEdit} style={{ background: "var(--acc)", color: "#000", padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>保存</button>
          </div>
        </div>
      )}
    </div>
  );
}
