const DB_NAME = 'hlp-db'
const DB_VERSION = 1
const STORE_NAME = 'config'
const CONFIG_KEY = 'player'

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })

const getChannel = () => {
  if (typeof BroadcastChannel === 'undefined') return null
  return new BroadcastChannel('hlp-config')
}

const broadcastChange = () => {
  const channel = getChannel()
  if (channel) {
    channel.postMessage({ type: 'config-updated', ts: Date.now() })
    channel.close()
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hlp-config-change'))
  }
}

export const getConfig = async () => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(CONFIG_KEY)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result || null)
  })
}

export const saveConfig = async (payload) => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(payload, CONFIG_KEY)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      broadcastChange()
      resolve(true)
    }
  })
}

export const clearConfig = async () => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(CONFIG_KEY)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      broadcastChange()
      resolve(true)
    }
  })
}

export const subscribeConfig = (handler) => {
  const channel = getChannel()
  const onMessage = (event) => {
    if (event?.data?.type === 'config-updated') {
      handler()
    }
  }

  const onLocal = () => handler()

  if (channel) {
    channel.addEventListener('message', onMessage)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('hlp-config-change', onLocal)
  }

  return () => {
    if (channel) {
      channel.removeEventListener('message', onMessage)
      channel.close()
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('hlp-config-change', onLocal)
    }
  }
}
