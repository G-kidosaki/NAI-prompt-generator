import { useEffect, useState, useRef } from "react";
import Btn from "../Common/Btn";
import { loadTagDb, searchTags } from "../../lib/tagdb";

const CAT_COLORS = {
  0: "var(--dim)",   // general
  1: "var(--gold)",  // character
  3: "#a78bfa",      // copyright
  4: "var(--acc)",   // meta / artist
  5: "var(--neg)",   // species
};

export default function AddTagBar({ onAdd, placeholder = "新規タグ（Enter で追加）" }) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [highlighted, setHighlighted] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { loadTagDb(); }, []);

  useEffect(() => {
    const q = text.trim();
    if (!q) { setSuggestions([]); return; }
    const s = searchTags(q, 8);
    setSuggestions(s);
    setHighlighted(0);
  }, [text]);

  const submit = (override) => {
    const t = (override ?? text).trim();
    if (!t) return;
    onAdd(t);
    setText("");
    setSuggestions([]);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (open && suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((i) => (i + 1) % suggestions.length); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted((i) => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === "Tab")       { e.preventDefault(); submit(suggestions[highlighted].t); return; }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions.length > 0) submit(suggestions[highlighted].t);
      else submit();
    }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div style={{ position: "relative", marginTop: 6, marginBottom: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          style={{ fontSize: 14 }}
          autoComplete="off"
        />
        <Btn on={() => submit()} bg="var(--acc)" color="#000" border="none" small>＋ 追加</Btn>
      </div>
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 60, zIndex: 50, marginTop: 2,
          background: "var(--bg0)", border: "1px solid var(--bdr)", borderRadius: 6,
          maxHeight: 240, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,.4)",
        }}>
          {suggestions.map((s, i) => (
            <div
              key={s.t}
              onMouseDown={(e) => { e.preventDefault(); submit(s.t); }}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: "5px 10px", fontSize: 12, cursor: "pointer",
                background: i === highlighted ? "var(--accDim)" : "transparent",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: CAT_COLORS[s.c] || "var(--dim)" }} />
              <span className="mono" style={{ color: i === highlighted ? "var(--acc)" : "var(--txt)" }}>{s.t}</span>
              {(s.n || []).length > 0 && (
                <span style={{ marginLeft: "auto", color: "var(--dim)", fontSize: 11 }}>{s.n.join(", ")}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
