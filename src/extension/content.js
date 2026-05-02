/**
 * NovelAI Image Generator (https://novelai.net/image*) で動作する content script
 * - sidepanel から INSERT_PROMPTS / PICK_TARGET / PING を受信
 * - ポジ／ネガの textarea をヒューリスティックに検出（失敗時はユーザーに選択させ永続化）
 */

const TARGETS_KEY = "naipg-targets-v1";

let cached = { pos: null, neg: null }; // { pos: { selector }, neg: { selector } }

(async () => {
  try {
    const o = await chrome.storage.local.get(TARGETS_KEY);
    if (o[TARGETS_KEY]) cached = { ...cached, ...o[TARGETS_KEY] };
  } catch {}
})();

function persistTargets() {
  chrome.storage.local.set({ [TARGETS_KEY]: cached }).catch(() => {});
}

/* ───── 要素検出 ───── */

function tryCustomSelector(kind) {
  const sel = cached[kind]?.selector;
  if (!sel) return null;
  try {
    const el = document.querySelector(sel);
    return el && el.tagName === "TEXTAREA" ? el : null;
  } catch {
    return null;
  }
}

function findByLabelText(labelMatcher) {
  // ラベル文字列に近い textarea を探す（label / heading / parent text）
  const all = Array.from(document.querySelectorAll("textarea"));
  for (const ta of all) {
    let n = ta;
    for (let depth = 0; depth < 6 && n; depth++) {
      const text = (n.getAttribute?.("aria-label") || n.placeholder || n.textContent || "").trim();
      if (labelMatcher.test(text)) return ta;
      n = n.parentElement;
    }
  }
  // ラベル系要素（label/h1-6/div）の text を探して、その近傍 textarea を返す
  const candidates = Array.from(
    document.querySelectorAll("label, h1, h2, h3, h4, h5, h6, span, div")
  );
  for (const c of candidates) {
    const text = (c.textContent || "").trim();
    if (text.length > 80) continue; // 長文は除外
    if (!labelMatcher.test(text)) continue;
    let n = c;
    for (let depth = 0; depth < 6 && n; depth++) {
      const ta = n.querySelector?.("textarea");
      if (ta) return ta;
      n = n.parentElement;
    }
  }
  return null;
}

function findPos() {
  return (
    tryCustomSelector("pos") ||
    findByLabelText(/^prompt$/i) ||
    findByLabelText(/prompt/i) ||
    document.querySelector('textarea[placeholder*="prompt" i]') ||
    document.querySelector('textarea[aria-label*="prompt" i]') ||
    null
  );
}

function findNeg() {
  return (
    tryCustomSelector("neg") ||
    findByLabelText(/undesired/i) ||
    findByLabelText(/negative/i) ||
    document.querySelector('textarea[placeholder*="undesired" i]') ||
    document.querySelector('textarea[aria-label*="undesired" i]') ||
    null
  );
}

function resolveTargets() {
  // ポジは Undesired 以外、ネガは Undesired を含むものを優先
  const pos = findPos();
  const neg = findNeg();
  return {
    pos: pos && pos !== neg ? pos : pos,
    neg: neg && neg !== pos ? neg : null,
  };
}

/* ───── 値の反映（React 互換） ───── */

function setReactValue(el, value) {
  const proto = HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function appendValue(existing, addition) {
  if (!addition) return existing;
  if (!existing.trim()) return addition;
  const sep = /,\s*$/.test(existing) ? " " : ", ";
  return existing + sep + addition;
}

/* ───── ターゲット選択モード ───── */

function buildSelectorForElement(el) {
  if (!el) return null;
  if (el.id) return `#${CSS.escape(el.id)}`;
  // 親まで遡って構造的セレクタを作る
  const parts = [];
  let n = el;
  while (n && n.nodeType === 1 && parts.length < 6) {
    let part = n.tagName.toLowerCase();
    if (n.classList && n.classList.length) {
      part += "." + Array.from(n.classList).map((c) => CSS.escape(c)).join(".");
    } else {
      const parent = n.parentElement;
      if (parent) {
        const sib = Array.from(parent.children).filter(
          (s) => s.tagName === n.tagName
        );
        if (sib.length > 1) {
          part += `:nth-of-type(${sib.indexOf(n) + 1})`;
        }
      }
    }
    parts.unshift(part);
    if (n.id) {
      parts[0] = `#${CSS.escape(n.id)}`;
      break;
    }
    n = n.parentElement;
  }
  return parts.join(" > ");
}

let pickerActive = false;
let pickerCleanup = null;

function startPicker(kind, sendResponse) {
  if (pickerActive) {
    pickerCleanup?.();
  }
  pickerActive = true;

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(56,189,248,.05)",
    pointerEvents: "none",
    zIndex: "2147483646",
    border: "2px dashed #38bdf8",
    boxSizing: "border-box",
  });
  const banner = document.createElement("div");
  banner.textContent = `🎯 ${kind === "pos" ? "ポジティブ" : "ネガティブ"}用の textarea をクリックしてください（ESC でキャンセル）`;
  Object.assign(banner.style, {
    position: "fixed",
    top: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#0b0e14",
    color: "#38bdf8",
    border: "1px solid #38bdf8",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    zIndex: "2147483647",
    pointerEvents: "none",
    fontFamily: "system-ui, sans-serif",
  });
  document.body.appendChild(overlay);
  document.body.appendChild(banner);

  const hl = document.createElement("div");
  Object.assign(hl.style, {
    position: "fixed",
    pointerEvents: "none",
    border: "2px solid #fbbf24",
    background: "rgba(251,191,36,.1)",
    zIndex: "2147483645",
    transition: "all .05s linear",
    boxSizing: "border-box",
  });
  document.body.appendChild(hl);

  const onMove = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const r = el.getBoundingClientRect();
    Object.assign(hl.style, {
      left: r.left + "px",
      top: r.top + "px",
      width: r.width + "px",
      height: r.height + "px",
    });
  };
  const cleanup = () => {
    pickerActive = false;
    overlay.remove();
    banner.remove();
    hl.remove();
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
  };
  pickerCleanup = cleanup;

  const finish = (res) => {
    cleanup();
    sendResponse?.(res);
  };

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.tagName !== "TEXTAREA") {
      // textarea を持つ親へ昇る
      let node = el;
      while (node && node.tagName !== "TEXTAREA" && node !== document.body) {
        node = node.parentElement;
      }
      if (!node || node.tagName !== "TEXTAREA") {
        finish({ ok: false, reason: "NOT_TEXTAREA" });
        return;
      }
      const selector = buildSelectorForElement(node);
      cached[kind] = { selector };
      persistTargets();
      finish({ ok: true, selector });
      return;
    }
    const selector = buildSelectorForElement(el);
    cached[kind] = { selector };
    persistTargets();
    finish({ ok: true, selector });
  };

  const onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      finish({ ok: false, reason: "CANCELLED" });
    }
  };

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
}

/* ───── メッセージハンドラ ───── */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object") return;

  switch (msg.type) {
    case "PING":
      sendResponse({ ok: true });
      return;

    case "INSERT_PROMPTS": {
      const targets = resolveTargets();
      const found = { pos: !!targets.pos, neg: !!targets.neg };
      if (msg.pos && !targets.pos) {
        sendResponse({ ok: false, reason: "POS_NOT_FOUND", found });
        return;
      }
      if (msg.neg && !targets.neg) {
        sendResponse({ ok: false, reason: "NEG_NOT_FOUND", found });
        return;
      }
      if (msg.pos && targets.pos) {
        const next = msg.mode === "append" ? appendValue(targets.pos.value, msg.pos) : msg.pos;
        setReactValue(targets.pos, next);
      }
      if (msg.neg && targets.neg) {
        const next = msg.mode === "append" ? appendValue(targets.neg.value, msg.neg) : msg.neg;
        setReactValue(targets.neg, next);
      }
      sendResponse({ ok: true, found });
      return;
    }

    case "PICK_TARGET":
      startPicker(msg.kind, sendResponse);
      return true; // async response

    case "RESET_TARGETS":
      cached = { pos: null, neg: null };
      persistTargets();
      sendResponse({ ok: true });
      return;
  }
});
