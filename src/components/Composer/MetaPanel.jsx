import { useCompStore } from "../../state/store";
import { estimateAnlas, isFreeOpusTier } from "../../lib/anlas";
import Btn from "../Common/Btn";

const RESOLUTION_PRESETS = [
  { id: "square_normal",  label: "Normal Square 1024",   w: 1024, h: 1024 },
  { id: "portrait_normal", label: "Normal Portrait 832×1216", w: 832, h: 1216 },
  { id: "landscape_normal", label: "Normal Landscape 1216×832", w: 1216, h: 832 },
  { id: "square_large",   label: "Large Square 1472",    w: 1472, h: 1472 },
  { id: "portrait_large", label: "Large Portrait 1024×1536", w: 1024, h: 1536 },
  { id: "landscape_large", label: "Large Landscape 1536×1024", w: 1536, h: 1024 },
  { id: "wallpaper_p",    label: "Wallpaper Portrait 1088×1920", w: 1088, h: 1920 },
  { id: "wallpaper_l",    label: "Wallpaper Landscape 1920×1088", w: 1920, h: 1088 },
];

const SAMPLERS = [
  "k_euler_ancestral", "k_euler", "k_dpmpp_2s_ancestral",
  "k_dpmpp_2m", "k_dpmpp_sde", "k_dpmpp_2m_sde",
];

export default function MetaPanel() {
  // 注意: selector は安定した参照を返すこと。`.filter(...)` や `|| []` は
  // 毎回新しい配列を生成するため React の useSyncExternalStore が例外を投げる。
  // ベースの参照を取り出してから派生値を計算する。
  const comp = useCompStore((s) => s.comp);
  const setComp = useCompStore((s) => s.setComp);
  const meta = comp.meta;
  const characters = comp.characters.filter((c) => c.enabled);
  const refImages = meta.refImages || [];

  const updateMeta = (patch) => setComp({
    ...comp, meta: { ...comp.meta, ...patch }, updatedAt: Date.now(),
  });
  const setResolution = (preset) =>
    updateMeta({ resolution: { w: preset.w, h: preset.h, preset: preset.id } });

  const w = meta.resolution?.w || 1024;
  const h = meta.resolution?.h || 1024;
  const steps = meta.steps || 28;
  const cost = estimateAnlas(w, h, steps, characters.length, refImages.length);
  const isFree = isFreeOpusTier(w, h, steps);

  return (
    <div style={{ background: "var(--bg2)", borderRadius: 12, padding: 12, marginBottom: 12, border: "1px solid var(--bdr)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>⚙ 生成パラメータ</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: isFree ? "var(--pos)" : "var(--gold)" }}>
          {isFree ? "🆓 Opus 無料枠" : `~${cost} anlas`}
        </span>
      </div>

      {/* Resolution presets */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 4 }}>解像度プリセット</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {RESOLUTION_PRESETS.map((p) => {
            const active = meta.resolution?.preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setResolution(p)}
                style={{
                  padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 500,
                  background: active ? "var(--accDim)" : "var(--bg0)",
                  color: active ? "var(--acc)" : "var(--dim)",
                  border: active ? "1px solid var(--acc)" : "1px solid var(--bdr)",
                }}
              >{p.label}</button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--dim)" }}>カスタム:</span>
          <input
            type="number"
            value={w}
            onChange={(e) => updateMeta({ resolution: { ...meta.resolution, w: Number(e.target.value), preset: undefined } })}
            style={{ width: 80, fontSize: 12, padding: "4px 6px" }}
          />
          <span style={{ fontSize: 11, color: "var(--dim)" }}>×</span>
          <input
            type="number"
            value={h}
            onChange={(e) => updateMeta({ resolution: { ...meta.resolution, h: Number(e.target.value), preset: undefined } })}
            style={{ width: 80, fontSize: 12, padding: "4px 6px" }}
          />
        </div>
      </div>

      {/* Sampling */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 2 }}>steps</div>
          <input type="number" value={meta.steps ?? 28} onChange={(e) => updateMeta({ steps: Number(e.target.value) })} style={{ fontSize: 12, padding: "4px 6px" }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 2 }}>cfg</div>
          <input type="number" step="0.1" value={meta.cfg ?? 5} onChange={(e) => updateMeta({ cfg: Number(e.target.value) })} style={{ fontSize: 12, padding: "4px 6px" }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 2 }}>sampler</div>
          <select value={meta.sampler ?? SAMPLERS[0]} onChange={(e) => updateMeta({ sampler: e.target.value })} style={{ fontSize: 12, padding: "4px 6px" }}>
            {SAMPLERS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Seed */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--dim)", minWidth: 36 }}>seed:</span>
        <input
          type="number"
          value={meta.seed ?? ""}
          onChange={(e) => updateMeta({ seed: e.target.value === "" ? null : Number(e.target.value) })}
          placeholder="ランダム"
          style={{ flex: 1, minWidth: 140, fontSize: 12, padding: "4px 6px" }}
        />
        <Btn on={() => updateMeta({ seed: Math.floor(Math.random() * 4294967295) })} small>🎲 ランダム</Btn>
        <Btn on={() => updateMeta({ seed: null })} small>クリア</Btn>
      </div>
    </div>
  );
}
