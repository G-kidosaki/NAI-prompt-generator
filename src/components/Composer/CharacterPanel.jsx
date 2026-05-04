import TagPill from "./TagPill";
import AddTagBar from "./AddTagBar";
import Btn from "../Common/Btn";

export default function CharacterPanel({
  title,
  positives,
  negatives,
  posTarget,        // TagTarget for positives
  negTarget,        // TagTarget for negatives
  activeTarget,
  onSetActive,
  onAddTag,         // (target, text) => void
  onUpdateTag,      // (target, tagId, patch) => void
  onRemoveTag,      // (target, tagId) => void
  onMoveTag,        // (target, tagId, dir) => void
  model,
  // optional character-level controls
  onRename,
  charName,
  onToggleEnabled,
  enabled,
  onMoveChar,
  onRemoveChar,
}) {
  const targetsEqual = (a, b) =>
    a && b && a.kind === b.kind && a.neg === b.neg &&
    (a.kind === "base" || a.charId === b.charId);

  const isActivePos = targetsEqual(activeTarget, posTarget);
  const isActiveNeg = targetsEqual(activeTarget, negTarget);

  return (
    <div style={{
      background: "var(--bg2)", borderRadius: 12, padding: 12, marginBottom: 12,
      border: enabled === false ? "1px dashed var(--bdr)" : "1px solid var(--bdr)",
      opacity: enabled === false ? 0.55 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {onRename != null ? (
          <input
            value={charName ?? ""}
            onChange={(e) => onRename(e.target.value)}
            placeholder={title}
            style={{ width: "auto", minWidth: 140, fontSize: 13, padding: "4px 8px" }}
          />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
        )}
        {onMoveChar && (<>
          <Btn on={() => onMoveChar(-1)} small style={{ padding: "4px 8px" }}>↑</Btn>
          <Btn on={() => onMoveChar(1)} small style={{ padding: "4px 8px" }}>↓</Btn>
        </>)}
        {onToggleEnabled && (
          <Btn on={onToggleEnabled} small>{enabled ? "👁 有効" : "🚫 無効"}</Btn>
        )}
        {onRemoveChar && (
          <Btn on={onRemoveChar} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>削除</Btn>
        )}
      </div>

      {/* Positives */}
      <div
        onClick={() => onSetActive(posTarget)}
        style={{
          padding: 8, borderRadius: 8, marginBottom: 8,
          background: isActivePos ? "var(--posBg)" : "var(--bg0)",
          border: isActivePos ? "1px solid var(--posBdr)" : "1px solid transparent",
          cursor: "pointer",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--pos)", fontWeight: 700, marginBottom: 6 }}>
          ⊕ ポジ ({positives.length}){isActivePos && " — クリックでここに追加"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {positives.length === 0 && <span style={{ fontSize: 11, opacity: .5 }}>（空）</span>}
          {positives.map((t, i) => (
            <TagPill
              key={t.id}
              tag={t}
              model={model}
              neg={false}
              onUpdate={(patch) => onUpdateTag(posTarget, t.id, patch)}
              onRemove={() => onRemoveTag(posTarget, t.id)}
              onMove={(dir) => onMoveTag(posTarget, t.id, dir)}
            />
          ))}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <AddTagBar onAdd={(text) => onAddTag(posTarget, text)} placeholder="⊕ ポジに追加" />
        </div>
      </div>

      {/* Negatives */}
      <div
        onClick={() => onSetActive(negTarget)}
        style={{
          padding: 8, borderRadius: 8,
          background: isActiveNeg ? "var(--negBg)" : "var(--bg0)",
          border: isActiveNeg ? "1px solid var(--negBdr)" : "1px solid transparent",
          cursor: "pointer",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--neg)", fontWeight: 700, marginBottom: 6 }}>
          ⊖ ネガ ({negatives.length}){isActiveNeg && " — クリックでここに追加"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {negatives.length === 0 && <span style={{ fontSize: 11, opacity: .5 }}>（空）</span>}
          {negatives.map((t) => (
            <TagPill
              key={t.id}
              tag={t}
              model={model}
              neg
              onUpdate={(patch) => onUpdateTag(negTarget, t.id, patch)}
              onRemove={() => onRemoveTag(negTarget, t.id)}
              onMove={(dir) => onMoveTag(negTarget, t.id, dir)}
            />
          ))}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <AddTagBar onAdd={(text) => onAddTag(negTarget, text)} placeholder="⊖ ネガに追加" />
        </div>
      </div>
    </div>
  );
}
