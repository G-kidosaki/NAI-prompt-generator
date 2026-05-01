/**
 * localStorage ベースの storage adapter
 * Artifact の window.storage / Electron の IPC storage と同じインターフェース
 */
const storage = {
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

export default storage;
