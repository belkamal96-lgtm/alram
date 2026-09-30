import { CustomSoundRecord, WakeUpLogEntry } from '../types/alarm';

const DB_NAME = 'PrabhatAlarmDB';
const DB_VERSION = 1;
const STORE_CUSTOM_SOUNDS = 'customSounds';
const STORE_WAKEUP_LOGS = 'wakeUpLogs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CUSTOM_SOUNDS)) {
        db.createObjectStore(STORE_CUSTOM_SOUNDS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_WAKEUP_LOGS)) {
        const logStore = db.createObjectStore(STORE_WAKEUP_LOGS, { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Custom Sounds Storage
export async function saveCustomSound(sound: CustomSoundRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_SOUNDS, 'readwrite');
    const store = tx.objectStore(STORE_CUSTOM_SOUNDS);
    const req = store.put(sound);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllCustomSounds(): Promise<CustomSoundRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_SOUNDS, 'readonly');
    const store = tx.objectStore(STORE_CUSTOM_SOUNDS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getCustomSoundById(id: string): Promise<CustomSoundRecord | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_SOUNDS, 'readonly');
    const store = tx.objectStore(STORE_CUSTOM_SOUNDS);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCustomSound(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CUSTOM_SOUNDS, 'readwrite');
    const store = tx.objectStore(STORE_CUSTOM_SOUNDS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Wake-Up Logs Storage
export async function saveWakeUpLog(entry: WakeUpLogEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WAKEUP_LOGS, 'readwrite');
    const store = tx.objectStore(STORE_WAKEUP_LOGS);
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllWakeUpLogs(): Promise<WakeUpLogEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WAKEUP_LOGS, 'readonly');
    const store = tx.objectStore(STORE_WAKEUP_LOGS);
    const req = store.getAll();
    req.onsuccess = () => {
      const logs = (req.result || []) as WakeUpLogEntry[];
      logs.sort((a, b) => b.timestamp - a.timestamp);
      resolve(logs);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteWakeUpLog(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_WAKEUP_LOGS, 'readwrite');
    const store = tx.objectStore(STORE_WAKEUP_LOGS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
