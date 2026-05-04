import { useCompStore } from "../../state/store";
import { approxT5Tokens } from "../../lib/tokens";

/**
 * V4.5 専用の自然言語プロンプト入力。T5 で扱われる前提。
 * V4 / V3 では非表示。
 */
export default function T5Editor() {
  const model = useCompStore((s) => s.comp.model);
  const t5 = useCompStore((s) => s.comp.base.t5 ?? "");
  const setBaseT5 = useCompStore((s) => s.setBaseT5);
  if (model !== "v4.5") return null;

  const tokens = approxT5Tokens(t5);
  return (
    <div style={{ background: "var(--bg2)", borderRadius: 12, padding: 12, marginBottom: 12, border: "1px solid var(--bdr)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--acc)" }}>📝 T5 自然文プロンプト</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>
          ~{tokens} tokens（概算）
        </span>
      </div>
      <textarea
        value={t5}
        onChange={(e) => setBaseT5(e.target.value)}
        rows={4}
        placeholder="例: A blue desk in a cozy library, soft afternoon light through the windows."
        style={{ fontFamily: "'JetBrains Mono','Menlo',monospace", fontSize: 13, lineHeight: 1.5, resize: "vertical" }}
      />
      <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 6 }}>
        ・danbooru タグでは表現しづらい要素はここに自然文で書けます。
        ・タグ側と組み合わせると、タグの内容が優先されつつ補完される傾向。
      </div>
    </div>
  );
}
