export const DEMO_USER_ID = "local-demo-user"
export const LEGACY_STORAGE_TX_KEY = "mvp_transactions_v3"
export const LEGACY_STORAGE_TEMPLATE_KEY = "mvp_import_templates_v1"
export const INDEXED_DB_NAME = "basic_accounting_calculator"
export const INDEXED_DB_VERSION = 1
export const INDEXED_DB_STORE = "app_state"
export const INDEXED_DB_TX_KEY = "transactions"
export const INDEXED_DB_TEMPLATE_KEY = "import_templates"
export const INDEXED_DB_RECURRING_KEY = "recurring_entries"
export const INDEXED_DB_RECURRING_LOG_KEY = "recurring_record_logs"

let indexedDbPromise: Promise<IDBDatabase> | null = null

export function getIndexedDbInstance(): Promise<IDBDatabase> {
  if (typeof globalThis.window === "undefined" || !("indexedDB" in globalThis.window)) {
    return Promise.reject(new Error("瀏覽器不支援 IndexedDB"))
  }

  if (!indexedDbPromise) {
    indexedDbPromise = new Promise((resolve, reject) => {
      const request = globalThis.window.indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
          db.createObjectStore(INDEXED_DB_STORE)
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error("本機資料庫開啟失敗"))
      request.onblocked = () => reject(new Error("本機資料庫被鎖定，請關閉其他分頁後再試"))
    })
  }

  return indexedDbPromise
}

export async function readIndexedDbValue<T>(key: string): Promise<T | undefined> {
  const db = await getIndexedDbInstance()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, "readonly")
    const store = tx.objectStore(INDEXED_DB_STORE)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error ?? new Error("本機資料庫讀取失敗"))
  })
}

export async function writeIndexedDbValue<T>(key: string, value: T): Promise<void> {
  const db = await getIndexedDbInstance()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INDEXED_DB_STORE, "readwrite")
    const store = tx.objectStore(INDEXED_DB_STORE)
    store.put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("本機資料庫寫入失敗"))
  })
}
