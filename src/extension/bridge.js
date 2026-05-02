/**
 * App.jsx から呼ぶ薄いラッパ。
 * 拡張機能環境でない場合は isExtension=false。各関数は呼ばれない想定。
 */

export const isExtension =
  typeof chrome !== "undefined" && !!chrome?.runtime?.id;

const NOT_INJECTED_RE = /Could not establish connection|Receiving end does not exist|message channel closed/i;

async function findNovelAITab() {
  if (!isExtension) throw new Error("NOT_EXTENSION");
  let tabs = await chrome.tabs.query({ url: "https://novelai.net/image*" });
  if (!tabs.length) tabs = await chrome.tabs.query({ url: "https://novelai.net/*" });
  if (!tabs.length) throw new Error("NOVELAI_TAB_NOT_FOUND");
  return tabs.find((t) => t.active) ?? tabs[0];
}

async function pingTab(tabId) {
  try {
    const r = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    return !!r?.ok;
  } catch {
    return false;
  }
}

async function send(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (e) {
    if (NOT_INJECTED_RE.test(e?.message || "")) {
      const ok = await pingTab(tabId);
      if (!ok) throw new Error("CONTENT_SCRIPT_NOT_LOADED");
      // ping 通ったなら再送
      return await chrome.tabs.sendMessage(tabId, message);
    }
    throw e;
  }
}

export async function sendToNovelAI({ pos, neg, mode }) {
  const tab = await findNovelAITab();
  return send(tab.id, {
    type: "INSERT_PROMPTS",
    pos: pos || "",
    neg: neg || "",
    mode: mode === "append" ? "append" : "overwrite",
  });
}

export async function pickTarget(kind /* "pos" | "neg" */) {
  const tab = await findNovelAITab();
  try {
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId != null) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } catch {}
  return send(tab.id, { type: "PICK_TARGET", kind });
}

export async function resetTargets() {
  const tab = await findNovelAITab();
  return send(tab.id, { type: "RESET_TARGETS" });
}
