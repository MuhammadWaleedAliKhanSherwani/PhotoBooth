/* =========================================================================
   storage.js — photos live in the browser's Cache Storage.
   Falls back to memory if Cache Storage isn't available (e.g. file://).
   ========================================================================= */

const PhotoStore = (() => {
  const CACHE = 'maheen-photos-v1';
  const PREFIX = '__photos__/';
  const mem = new Map();
  let usable = null;

  const keyFor = (id) => new URL(`${PREFIX}${id}.jpg`, location.href).href;
  const idFrom = (url) => Number(url.split(PREFIX)[1]?.replace('.jpg', ''));

  async function ok() {
    if (usable !== null) return usable;
    try {
      usable = 'caches' in window && /^https?:$/.test(location.protocol) && !!(await caches.open(CACHE));
    } catch {
      usable = false;
    }
    if (usable && navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    return usable;
  }

  async function save(id, blob) {
    if (await ok()) {
      const cache = await caches.open(CACHE);
      await cache.put(keyFor(id), new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } }));
    } else {
      mem.set(id, blob);
    }
  }

  async function list() {
    if (!(await ok())) return [...mem.entries()].map(([id, blob]) => ({ id, blob })).sort((a, b) => b.id - a.id);
    const cache = await caches.open(CACHE);
    const keys = (await cache.keys()).filter((r) => r.url.includes(PREFIX));
    const items = await Promise.all(
      keys.map(async (req) => {
        const res = await cache.match(req);
        return res ? { id: idFrom(req.url), blob: await res.blob() } : null;
      })
    );
    return items.filter(Boolean).sort((a, b) => b.id - a.id);
  }

  async function count() {
    if (!(await ok())) return mem.size;
    const cache = await caches.open(CACHE);
    return (await cache.keys()).filter((r) => r.url.includes(PREFIX)).length;
  }

  async function remove(id) {
    if (await ok()) await (await caches.open(CACHE)).delete(keyFor(id));
    mem.delete(id);
  }

  async function clear() {
    if (await ok()) await caches.delete(CACHE);
    mem.clear();
  }

  return { ok, save, list, count, remove, clear };
})();
