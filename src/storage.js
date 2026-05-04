/**
 * storage adapter
 *  - 拡張機能環境では chrome.storage.local
 *  - それ以外（PWA / 通常 Web）では localStorage
 * インターフェースは Artifact / Electron の storage と同じ async API
 */
const cs =
  typeof chrome !== "undefined" && chrome?.storage?.local
    ? chrome.storage.local
    : null;

const chromeStorage = {
  async get(key) {
    try {
      const o = await cs.get(key);
      if (!(key in o)) return null;
      return { key, value: o[key] };
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      await cs.set({ [key]: value });
      return { key, value };
    } catch {
      return null;
    }
  },
  async delete(key) {
    try {
      await cs.remove(key);
      return { key, deleted: true };
    } catch {
      return null;
    }
  },
  async list(prefix) {
    try {
      const o = await cs.get(null);
      const keys = Object.keys(o).filter((k) => !prefix || k.startsWith(prefix));
      return { keys };
    } catch {
      return { keys: [] };
    }
  },
};

const localStorageAdapter = {
  async get(key) {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;
      return { key, value };
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
      return { key, value };
    } catch {
      return null;
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(key);
      return { key, deleted: true };
    } catch {
      return null;
    }
  },
  async list(prefix) {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!prefix || k.startsWith(prefix)) keys.push(k);
      }
      return { keys };
    } catch {
      return { keys: [] };
    }
  },
};

const storage = cs ? chromeStorage : localStorageAdapter;

/**
 * Zustand persist 用のアダプタ。
 * StateStorage interface に揃えて { getItem, setItem, removeItem } を返す。
 * 内部で上記の async storage（chrome.storage / localStorage）に委譲。
 */
export const zustandAdapter = {
  async getItem(name) {
    const r = await storage.get(name);
    return r?.value ?? null;
  },
  async setItem(name, value) {
    await storage.set(name, value);
  },
  async removeItem(name) {
    await storage.delete(name);
  },
};

export default storage;
