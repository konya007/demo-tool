// IndexedDB tối giản: tracks (metadata), blobs (file nhạc), labels, kv (settings)
const DB_NAME = 'stage-music'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('tracks')) db.createObjectStore('tracks', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs')
      if (!db.objectStoreNames.contains('labels')) db.createObjectStore('labels', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

type StoreName = 'tracks' | 'blobs' | 'labels' | 'kv'

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return wrap(fn(db.transaction(store, mode).objectStore(store)))
}

export const db = {
  getAll: <T>(store: StoreName) => tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>),
  get: <T>(store: StoreName, key: string) => tx<T | undefined>(store, 'readonly', (s) => s.get(key)),
  put: (store: StoreName, value: unknown, key?: string) => tx(store, 'readwrite', (s) => s.put(value, key)),
  delete: (store: StoreName, key: string) => tx(store, 'readwrite', (s) => s.delete(key)),
  async putMany(store: StoreName, values: unknown[]) {
    const database = await open()
    const t = database.transaction(store, 'readwrite')
    const s = t.objectStore(store)
    values.forEach((v) => s.put(v))
    return new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
    })
  },
  async clearAll() {
    const database = await open()
    const names: StoreName[] = ['tracks', 'blobs', 'labels', 'kv']
    const t = database.transaction(names, 'readwrite')
    names.forEach((n) => t.objectStore(n).clear())
    return new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
    })
  },
}
