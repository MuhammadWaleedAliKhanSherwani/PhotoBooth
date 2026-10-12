/* =========================================================================
   storage.js — photos (and custom stickers) live in the browser's Cache Storage.
   Falls back to memory if Cache Storage isn't available (e.g. file://).
   ========================================================================= */

function makeBlobStore(cacheName, prefix, ext, type) {
  const mem = new Map();
  let usable = null;

  const keyFor = (id) => new URL(`${prefix}${id}.${ext}`, location.href).href;
  const idFrom = (url) => Number(url.split(prefix)[1]?.replace(`.${ext}`, ''));

  async function ok() {
    if (usable !== null) return usable;
    try {
      usable = 'caches' in window && /^https?:$/.test(location.protocol) && !!(await caches.open(cacheName));
    } catch {
      usable = false;
    }
    if (usable && navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    return usable;
  }

  async function save(id, blob) {
    if (await ok()) {
      const cache = await caches.open(cacheName);
      await cache.put(keyFor(id), new Response(blob, { headers: { 'Content-Type': type } }));
    } else {
      mem.set(id, blob);
    }
  }

  async function list() {
    if (!(await ok())) return [...mem.entries()].map(([id, blob]) => ({ id, blob })).sort((a, b) => b.id - a.id);
    const cache = await caches.open(cacheName);
    const keys = (await cache.keys()).filter((r) => r.url.includes(prefix));
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
    const cache = await caches.open(cacheName);
    return (await cache.keys()).filter((r) => r.url.includes(prefix)).length;
  }

  async function remove(id) {
    if (await ok()) await (await caches.open(cacheName)).delete(keyFor(id));
    mem.delete(id);
  }

  async function clear() {
    if (await ok()) await caches.delete(cacheName);
    mem.clear();
  }

  return { ok, save, list, count, remove, clear };
}

const PhotoStore = makeBlobStore('maheen-photos-v1', '__photos__/', 'jpg', 'image/jpeg');
const StickerStore = makeBlobStore('maheen-stickers-v1', '__stickers__/', 'png', 'image/png');
