// Minimal, robust IndexedDB adapter for zustand/persist
import {openDB} from 'idb';

// Define database name, version, and store name
const DB_NAME = 'lit-hr';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise;
function db() {
  // Open the IndexedDB database, creating the object store if needed
  return (dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    },
  }));
}

// Promise-based "storage" shape for createJSONStorage
export const idbStorage = {
  async getItem(key) {
    // Retrieve an item from the store
    return (await db()).get(STORE, key);
  },
  async setItem(key, value) {
    // Store an item in the store
    return (await db()).put(STORE, value, key);
  },
  async removeItem(key) {
    // Remove an item from the store
    return (await db()).delete(STORE, key);
  },
};
