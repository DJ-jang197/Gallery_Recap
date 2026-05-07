/**
 * db.js
 * 
 * Local-First IndexedDB wrapper for Project Siel Archive.
 * 
 * Why IndexedDB?
 * It allows us to store structured data (including base64 images if needed) 
 * directly in the browser, maintaining the "Privacy-First" directive. 
 * Data persists across page reloads.
 */

const DB_NAME = 'SielArchiveDB';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

let dbInstance = null;

/**
 * Initializes the IndexedDB connection.
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Create store with a simple string ID as the key
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
};

/**
 * Save a new journal entry to the database.
 * 
 * @param {Object} entryData - The complete entry object.
 * Expected structure:
 * {
 *   id: string (UUID),
 *   logTitle: string,
 *   logDate: ISO string,
 *   cadenceType: string,
 *   narrativeContent: string,
 *   sentimentData: object,
 *   photoThumbnails: array
 * }
 */
export const saveEntry = async (entryData) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(entryData);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Retrieve all journal entries, sorted reverse-chronologically by default.
 */
export const getAllEntries = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const entries = request.result || [];
      // Sort newest first
      entries.sort((a, b) => new Date(b.logDate) - new Date(a.logDate));
      resolve(entries);
    };
    request.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Delete a specific entry by its ID.
 * NOTE: This wipes the entry and its associated data completely from local storage.
 */
export const deleteEntry = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
};
