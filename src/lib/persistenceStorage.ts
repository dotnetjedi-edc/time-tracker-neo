import type { StateStorage } from "zustand/middleware";

const DB_NAME = "time-tracker-browser-db";
const STORE_NAME = "persisted-state";

const canUseBrowserStorage = () => typeof window !== "undefined";

const canUseIndexedDb = () =>
  canUseBrowserStorage() && typeof window.indexedDB !== "undefined";

const openPersistenceDatabase = async (): Promise<IDBDatabase | null> => {
  if (!canUseIndexedDb()) {
    return null;
  }

  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
};

const readIndexedDbValue = async (key: string): Promise<string | null> => {
  const database = await openPersistenceDatabase();
  if (!database) {
    return null;
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);

    request.onsuccess = () => {
      resolve(typeof request.result === "string" ? request.result : null);
    };
    request.onerror = () => resolve(null);
    transaction.oncomplete = () => database.close();
  });
};

const writeIndexedDbValue = async (
  key: string,
  value: string,
): Promise<void> => {
  const database = await openPersistenceDatabase();
  if (!database) {
    return;
  }

  await new Promise<void>((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(value, key);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      resolve();
    };
  });
};

export const removePersistedSnapshot = async (key: string): Promise<void> => {
  const database = await openPersistenceDatabase();
  if (!database) {
    return;
  }

  await new Promise<void>((resolve) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      resolve();
    };
  });
};

export const recoverPersistedSnapshot = async (
  key: string,
): Promise<boolean> => {
  if (!canUseBrowserStorage()) {
    return false;
  }

  if (window.localStorage.getItem(key) !== null) {
    return false;
  }

  const snapshot = await readIndexedDbValue(key);
  if (snapshot === null) {
    return false;
  }

  window.localStorage.setItem(key, snapshot);
  return true;
};

export const resilientBrowserStorage: StateStorage = {
  getItem: (key) => {
    if (!canUseBrowserStorage()) {
      return null;
    }

    return window.localStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (!canUseBrowserStorage()) {
      return;
    }

    window.localStorage.setItem(key, value);
    void writeIndexedDbValue(key, value);
  },
  removeItem: (key) => {
    if (canUseBrowserStorage()) {
      window.localStorage.removeItem(key);
    }

    void removePersistedSnapshot(key);
  },
};
