import type { Card, Variant } from './data'

/* Saved cards live in this browser's IndexedDB: card details plus the photo as a Blob.
   Blob URLs die on refresh, so every load makes fresh ones. */

const DB = 'traindex'
const VERSION = 1

type StoredCard = Omit<Card, 'photo'> & { photo: Blob }

let db: Promise<IDBDatabase> | null = null

function open() {
  db ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('cards', { keyPath: 'id' })
      // catalog sign designs are only known after a scan, so keep the ones our cards use
      req.result.createObjectStore('variants', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return db
}

function run<T>(store: 'cards' | 'variants', mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T> | void) {
  return open().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const tx = d.transaction(store, mode)
        const req = work(tx.objectStore(store))
        tx.oncomplete = () => resolve(req ? req.result : (undefined as T))
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error ?? new Error('Storage transaction aborted'))
      }),
  )
}

export async function loadSaved(): Promise<{ cards: Card[]; variants: Variant[] }> {
  try {
    const [stored, variants] = await Promise.all([
      run<StoredCard[]>('cards', 'readonly', (s) => s.getAll()),
      run<Variant[]>('variants', 'readonly', (s) => s.getAll()),
    ])
    const cards = stored.map((c) => ({ ...c, photo: URL.createObjectURL(c.photo) }))
    return { cards, variants }
  } catch {
    // private browsing or storage blocked: the app still works for this session
    return { cards: [], variants: [] }
  }
}

/** Throws when the browser refuses (quota, private mode), so the save sheet can say so. */
export async function saveCard(card: Card) {
  const photo = await (await fetch(card.photo)).blob()
  await run('cards', 'readwrite', (s) => s.put({ ...card, photo } satisfies StoredCard))
}

export async function updateCard(card: Card) {
  const old = await run<StoredCard | undefined>('cards', 'readonly', (s) => s.get(card.id))
  if (!old) return
  await run('cards', 'readwrite', (s) => s.put({ ...card, photo: old.photo } satisfies StoredCard))
}

export const deleteCard = (id: string) => run('cards', 'readwrite', (s) => s.delete(id)).catch(() => {})

export const saveVariant = (v: Variant) => run('variants', 'readwrite', (s) => s.put(v)).catch(() => {})

export const clearCards = () => run('cards', 'readwrite', (s) => s.clear()).catch(() => {})
