// 最小 SW: アイコンクリックでサイドパネルを開くだけ
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});
});
