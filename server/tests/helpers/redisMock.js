const values = new Map();
const expirations = new Map();

function removeIfExpired(key) {
  const expiresAt = expirations.get(key);
  if (expiresAt && expiresAt <= Date.now()) {
    values.delete(key);
    expirations.delete(key);
  }
}

export const redisMock = {
  isOpen: true,
  json: {
    async get(key) {
      removeIfExpired(key);
      return values.get(key) ?? null;
    },
    async set(key, path, value) {
      if (path === "$") {
        values.set(key, structuredClone(value));
      } else if (path.startsWith("$.")) {
        const document = values.get(key);
        if (!document) return null;
        document[path.slice(2)] = structuredClone(value);
      }
      return "OK";
    },
  },
  ft: {
    async search(_index, query) {
      const userId = query.match(/^@userId:\{(.+)\}$/)?.[1];
      const documents = [];
      for (const [id, value] of values) {
        removeIfExpired(id);
        if (id.startsWith("session:") && value?.userId === userId) {
          documents.push({ id, value });
        }
      }
      return { total: documents.length, documents };
    },
  },
  async set(key, value, options = {}) {
    values.set(key, value);
    if (options.EX) expirations.set(key, Date.now() + options.EX * 1000);
    return "OK";
  },
  async del(...keys) {
    let removed = 0;
    for (const key of keys.flat()) {
      removed += Number(values.delete(key));
      expirations.delete(key);
    }
    return removed;
  },
  async expire(key, seconds) {
    if (!values.has(key)) return 0;
    expirations.set(key, Date.now() + seconds * 1000);
    return 1;
  },
  async eval(_script, { keys, arguments: args }) {
    const [key] = keys;
    removeIfExpired(key);
    const count = Number(values.get(key) || 0) + 1;
    values.set(key, count);
    if (count === 1) {
      expirations.set(key, Date.now() + Number(args[0]) * 1000);
    }
    return count;
  },
  async ttl(key) {
    removeIfExpired(key);
    if (!values.has(key)) return -2;
    const expiresAt = expirations.get(key);
    return expiresAt ? Math.ceil((expiresAt - Date.now()) / 1000) : -1;
  },
  async sendCommand([command, key]) {
    if (command !== "GETDEL")
      throw new Error(`Unsupported command: ${command}`);
    removeIfExpired(key);
    const value = values.get(key) ?? null;
    values.delete(key);
    expirations.delete(key);
    return value;
  },
  async quit() {},
  reset() {
    values.clear();
    expirations.clear();
  },
};
