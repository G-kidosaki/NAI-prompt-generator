import { uid } from "./utils";

/**
 * 旧 SK_SAVED 形式 (savedCats/saved の二段構造) を新形式に移行する。
 * 旧 saved の各エントリを、対応する savedCat 名と同名のプロンプトカテゴリに
 * 通常プロンプトとして追加する。同名カテゴリがなければ新規作成。
 */
export const migrateOldSavedToPrompts = (savedData, cats, prompts) => {
  if (!savedData || typeof savedData !== "object") return null;
  const oldSavedCats = Array.isArray(savedData.savedCats) ? savedData.savedCats : [];
  const oldSaved = Array.isArray(savedData.saved) ? savedData.saved : Array.isArray(savedData) ? savedData : [];
  if (!oldSaved.length) return null;
  const newCats = [...cats];
  const newPrompts = [...prompts];
  for (const s of oldSaved) {
    const sc = oldSavedCats.find(c => c.id === s.savedCatId);
    const fallback = sc?.id === "default" || !sc ? "完成プロンプト" : sc.name;
    const targetName = fallback;
    let cat = newCats.find(c => c.name === targetName);
    if (!cat) {
      cat = { id: uid(), name: targetName, order: newCats.length, tags: [], color: "" };
      newCats.push(cat);
    }
    const baseName = (s.name || "完成プロンプト").trim();
    const addEntry = (text, label) => {
      if (!text) return;
      const order = newPrompts.filter(p => p.catId === cat.id).length;
      newPrompts.push({ id: uid(), catId: cat.id, prompt: text, label, tagIds: [], order });
    };
    if (s.pos && s.neg) { addEntry(s.pos, `${baseName}_⊕`); addEntry(s.neg, `${baseName}_⊖`); }
    else if (s.pos) addEntry(s.pos, baseName);
    else if (s.neg) addEntry(s.neg, baseName);
  }
  return { cats: newCats, prompts: newPrompts };
};
