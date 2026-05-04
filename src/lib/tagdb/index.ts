/**
 * 軽量タグDB。public/tagdb/danbooru-popular.json を遅延ロードして
 * 記憶し、空文字 / 接頭辞マッチで候補を返す。
 *
 *   - t: タグ ID（danbooru の正規形、underscore 区切り）
 *   - c: カテゴリ（0=general, 1=character, 4=meta 等。Danbooru 流儀）
 *   - n?: 日本語別名の配列（あれば検索対象）
 */

export interface DbTag {
  t: string;
  c: number;
  n?: string[];
}

let cache: DbTag[] | null = null;
let loadingPromise: Promise<DbTag[]> | null = null;

const TAGDB_URL = (() => {
  // Vite の base を拾うため、env から動的に。テスト環境では fallback。
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  return `${base.replace(/\/$/, "")}/tagdb/danbooru-popular.json`;
})();

export const loadTagDb = async (): Promise<DbTag[]> => {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;
  loadingPromise = fetch(TAGDB_URL)
    .then((r) => r.ok ? r.json() : Promise.reject(r.status))
    .then((data) => {
      cache = Array.isArray(data?.tags) ? data.tags : [];
      return cache!;
    })
    .catch(() => {
      cache = [];
      return cache!;
    })
    .finally(() => { loadingPromise = null; });
  return loadingPromise;
};

const normalize = (s: string): string =>
  s.toLowerCase().replace(/_/g, " ").trim();

export const searchTags = (query: string, limit = 12): DbTag[] => {
  if (!cache) return [];
  const q = normalize(query);
  if (!q) return [];
  // Danbooru の正規形 (underscore) で前方マッチ → 部分マッチ → 日本語別名 の順で集約
  const exact: DbTag[] = [];
  const prefix: DbTag[] = [];
  const partial: DbTag[] = [];
  const nMatch: DbTag[] = [];
  for (const t of cache) {
    const tn = normalize(t.t);
    if (tn === q) exact.push(t);
    else if (tn.startsWith(q)) prefix.push(t);
    else if (tn.includes(q)) partial.push(t);
    else if ((t.n || []).some((alias) => alias.toLowerCase().includes(q))) nMatch.push(t);
    if (exact.length + prefix.length + partial.length + nMatch.length >= limit * 2) break;
  }
  return [...exact, ...prefix, ...partial, ...nMatch].slice(0, limit);
};

export const tagDbSize = (): number => cache?.length ?? 0;
