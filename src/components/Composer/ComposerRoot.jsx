import { useState } from "react";
import { useStore as useZustandStore } from "zustand";
import { useCompStore } from "../../state/store";
import { makeTag } from "../../lib/composition";
import CharacterPanel from "./CharacterPanel";
import DatasetSelector from "./DatasetSelector";
import T5Editor from "./T5Editor";
import MetaPanel from "./MetaPanel";
import SavedPanel from "./SavedPanel";
import ImportPanel from "./ImportPanel";
import Btn from "../Common/Btn";

const useTemporal = (selector) => useZustandStore(useCompStore.temporal, selector);

const SUB_TABS = [
  { id: "edit",   label: "✏️ タグ編集", hint: "ベースとキャラ毎の pos/neg を編集" },
  { id: "config", label: "⚙️ 設定",     hint: "Dataset / 解像度 / Sampler / Seed / T5" },
  { id: "store",  label: "💾 保存・取込", hint: "Composition の保存・読込・URL共有・既存V4プロンプト取り込み" },
];

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

  const undo = useTemporal((t) => t.undo);
  const redo = useTemporal((t) => t.redo);
  const pastCount = useTemporal((t) => t.pastStates.length);
  const futureCount = useTemporal((t) => t.futureStates.length);

  const [subTab, setSubTab] = useState("edit");

  const handleAdd = (target, text) => {
    addTag(target, makeTag(text, { neg: target.neg }));
    setActiveTarget(target);
  };

  // Dataset toggle: replace existing dataset tag at base.positives[0] (if any)
  const onSetDataset = (id, datasetTag) => {
    const datasets = ["fur dataset", "background dataset", "location"];
    for (const t of comp.base.positives) {
      if (datasets.includes(t.text)) removeTag({ kind: "base", neg: false }, t.id);
    }
    if (datasetTag) {
      addTag({ kind: "base", neg: false }, makeTag(datasetTag, { dataset: id }));
    }
  };

  return (
    <div className="fi" style={{ paddingBottom: 24 }}>
      {/* HEADER: 概要 + アクション */}
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>🪄 編集（{comp.model}）</span>
        <span style={{ fontSize: 11, color: "var(--dim)" }}>
          ベース {comp.base.positives.length + comp.base.negatives.length} 件 ／
          キャラ {comp.characters.length} 体
        </span>
        <Btn on={() => undo()} disabled={pastCount === 0} small style={{ marginLeft: "auto" }} title="Undo (履歴を1つ戻す)">↶</Btn>
        <Btn on={() => redo()} disabled={futureCount === 0} small title="Redo (やり直し)">↷</Btn>
        <Btn on={() => { if (confirm("現在の Composition をリセットしますか？")) resetComp(comp.model); }} bg="var(--negBg)" color="var(--neg)" border="1px solid var(--negBdr)" small title="現在の編集をクリア">🗑</Btn>
      </div>

      {/* SUB-NAV */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "var(--bg2)", borderRadius: 10, padding: 3 }}>
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            title={t.hint}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: subTab === t.id ? "var(--accDim)" : "transparent",
              color: subTab === t.id ? "var(--acc)" : "var(--dim)",
              border: subTab === t.id ? "1px solid var(--acc)" : "1px solid transparent",
              flex: 1,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* === タグ編集 === */}
      {subTab === "edit" && (
        <>
          {comp.base.positives.length === 0 && comp.base.negatives.length === 0 && comp.characters.length === 0 && (
            <div style={{
              background: "var(--accDim)", border: "1px solid var(--acc)",
              borderRadius: 10, padding: "10px 14px", marginBottom: 10,
              fontSize: 12, color: "var(--acc)", lineHeight: 1.6,
            }}>
              <strong>はじめに：</strong> 下の <strong>📦 ベース</strong>（全体）の <strong>⊕ ポジ</strong> 欄に
              <code style={{ background: "var(--bg0)", padding: "1px 5px", borderRadius: 3, margin: "0 2px" }}>1girl</code>
              などを入力 → Enter。複数キャラを描き分けたいときは下の
              <strong> ＋ キャラクター追加</strong> でキャラ枠を追加。
              <br />
              タグをクリックすると重み・role・ランダマイザの編集 popover が開きます。
            </div>
          )}

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

          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <Btn on={() => addCharacter()} bg="var(--acc)" color="#000" border="none">
              ＋ キャラクター追加
            </Btn>
          </div>
        </>
      )}

      {/* === 設定 === */}
      {subTab === "config" && (
        <>
          <DatasetSelector basePositives={comp.base.positives} onSet={onSetDataset} />
          <MetaPanel />
          <T5Editor />
          {comp.model === "v4" && (
            <div style={{ fontSize: 11, color: "var(--dim)", padding: "8px 12px", marginTop: 4 }}>
              💡 T5 自然文プロンプトは V4.5 モードで有効になります。右上の <strong>model</strong> から V4.5 に切り替えてください。
            </div>
          )}
        </>
      )}

      {/* === 保存・取込 === */}
      {subTab === "store" && (
        <>
          <SavedPanel />
          <ImportPanel />
        </>
      )}
    </div>
  );
}
