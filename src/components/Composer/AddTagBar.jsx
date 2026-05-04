import { useState } from "react";
import Btn from "../Common/Btn";

export default function AddTagBar({ onAdd, placeholder = "新規タグ（Enter で追加）" }) {
  const [text, setText] = useState("");
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText("");
  };
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 6, marginBottom: 6 }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder={placeholder}
        style={{ fontSize: 14 }}
      />
      <Btn on={submit} bg="var(--acc)" color="#000" border="none" small>＋ 追加</Btn>
    </div>
  );
}
