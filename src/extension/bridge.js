/**
 * App.jsx から呼ぶ薄いラッパ。
 * 拡張機能環境でない場合は isExtension=false。各関数は呼ばれない想定。
 */

export const isExtension =
  typeof chrome !== "undefined" && !!chrome?.runtime?.id;

async function findNovelAITab() {
  if (!isExtension) throw new Error("NOT_EXTENSION");
  const tabs = await chrome.tabs.query({ url: "https://novelai.net/image*" });
  if (!tabs.length) throw new Error("NOVELAI_TAB_NOT_FOUND");
  return tabs.find((t) => t.active) ?? tabs[0];
}

export async function sendToNovelAI({ pos, neg, mode }) {
  const tab = await findNovelAITab();
  return chrome.tabs.sendMessage(tab.id, {
    type: "INSERT_PROMPTS",
    pos: pos || "",
    neg: neg || "",
    mode: mode === "append" ? "append" : "overwrite",
  });
}

export async function pickTarget(kind /* "pos" | "neg" */) {
  const tab = await findNovelAITab();
  // PICK_TARGET 中はタブをアクティブにしないとマウス操作できないので focus する
  try {
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId != null) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } catch {}
  return chrome.tabs.sendMessage(tab.id, { type: "PICK_TARGET", kind });
}

export async function resetTargets() {
  const tab = await findNovelAITab();
  return chrome.tabs.sendMessage(tab.id, { type: "RESET_TARGETS" });
}
