import { useStore as useZustandStore } from "zustand";
import { useCompStore } from "../../state/store";
import { makeTag } from "../../lib/composition";
import CharacterPanel from "./CharacterPanel";
import DatasetSelector from "./DatasetSelector";
import T5Editor from "./T5Editor";
import MetaPanel from "./MetaPanel";
import SavedPanel from "./SavedPanel";
import Btn from "../Common/Btn";

const useTemporal = (selector) => useZustandStore(useCompStore.temporal, selector);

export default function ComposerRoot() {
  const comp = useCompStore((s) => s.comp);
  const activeTarget = useCompStore((s) => s.activeTarget);
  const setActiveTarget = useCompStore((s) => s.setActiveTarget);
  const addTag = useCompStore((s) => s.addTag);
  const removeTag = useCompStore((s) => s.removeTag);
  const updateTag = useCompStore((s) => s.updateTag);
  const moveTag = useCompStore((s) => s.moveTag);
  const addCharacter = useCompStore((s) => s.addCharacter);
  const removeCharacter = useCompStore((s) => s.removeCharacter);
  const updateCharacter = useCompStore((s) => s.updateCharacter);
  const moveCharacter = useCompStore((s) => s.moveCharacter);
  const resetComp = useCompStore((s) => s.resetComp);

  // zundo の API: temporal.getState() で { undo, redo, pastStates, futureStates }
  const undo = useTemporal((t) => t.undo);
  const redo = useTemporal((t) => t.redo);
  const pastCount = useTemporal((t) => t.pastStates.length);
  const futureCount = useTemporal((t) => t.futureStates.length);

  const handleAdd = (target, text) => {
    addTag(target, makeTag(text, { neg: target.neg }));
    setActiveTarget(target);
  };

  // Dataset toggle: replace existing dataset tag at base.positives[0] (if any)
  const onSetDataset = (id, datasetTag) => {
    const datasets = ["fur dataset", "background dataset", "location"];
    // remove any existing dataset markers
    for (const t of comp.base.positives) {
      if (datasets.includes(t.text)) removeTag({ kind: "base", neg: false }, t.id);
    }
    if (datasetTag) {
      addTag({ kind: "base", neg: false }, makeTag(datasetTag, { dataset: id }));
    }
  };

  return (
    <div className="fi" style={{ paddingBottom: 24 }}>
      <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>🪄 V4 コンポーザー</span>
        <span style={{ fontSize: 11, color: "var(--dim)" }}>
          model: <strong style={{ color: "var(--acc)" }}>{comp.model}</strong> ／
          キャラクター: <strong>{comp.characters.length}</strong>
        </span>
        <Btn on={() => undo()} disabled={pastCount === 0} small style={{ marginLeft: "auto" }} title="Undo (履歴を1つ戻す)">↶ Undo</Btn>
        <Btn on={() => redo()} disabled={futureCount === 0} small title="Redo (やり直し)">↷ Redo</Btn>
        <Btn on={() => addCharacter()} bg="var(--acc)" color="#000" border="none" small>
          ＋ キャラクター追加
        </Btn>
        <Btn on={() => { if (confirm("現在の Composition をリセットしますか？")) resetComp(comp.model); }} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small>🗑 リセット</Btn>
      </div>

      <DatasetSelector basePositives={comp.base.positives} onSet={onSetDataset} />

      <MetaPanel />

      <T5Editor />

      <SavedPanel />

      <CharacterPanel
        title="📦 ベース（全体）"
        positives={comp.base.positives}
        negatives={comp.base.negatives}
        posTarget={{ kind: "base", neg: false }}
        negTarget={{ kind: "base", neg: true }}
        activeTarget={activeTarget}
        onSetActive={setActiveTarget}
        onAddTag={handleAdd}
        onUpdateTag={updateTag}
        onRemoveTag={removeTag}
        onMoveTag={moveTag}
        model={comp.model}
      />

      {comp.characters.map((c, idx) => (
        <CharacterPanel
          key={c.id}
          title={c.name || `Character ${idx + 1}`}
          charName={c.name}
          onRename={(name) => updateCharacter(c.id, { name })}
          enabled={c.enabled}
          onToggleEnabled={() => updateCharacter(c.id, { enabled: !c.enabled })}
          onMoveChar={(dir) => moveCharacter(c.id, dir)}
          onRemoveChar={() => {
            if (confirm(`Character ${idx + 1} を削除しますか？`)) removeCharacter(c.id);
          }}
          positives={c.positives}
          negatives={c.negatives}
          posTarget={{ kind: "char", charId: c.id, neg: false }}
          negTarget={{ kind: "char", charId: c.id, neg: true }}
          activeTarget={activeTarget}
          onSetActive={setActiveTarget}
          onAddTag={handleAdd}
          onUpdateTag={updateTag}
          onRemoveTag={removeTag}
          onMoveTag={moveTag}
          model={comp.model}
        />
      ))}

      {comp.characters.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--dim)", padding: "8px 12px", borderRadius: 8, background: "var(--bg2)" }}>
          複数キャラを使う場合は右上の「＋ キャラクター追加」を押してください。
        </div>
      )}
    </div>
  );
}
