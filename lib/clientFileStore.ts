'use client';

const DATABASE_NAME = 'testimonium-client-files';
const STORE_NAME = 'sessions';
const DATABASE_VERSION = 1;

interface StoredFiles {
  sessionId: string;
  files: File[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local file storage'));
  });
}

export async function saveSessionFiles(sessionId: string, files: File[]): Promise<void> {
  if (files.length === 0) return;
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put({ sessionId, files } satisfies StoredFiles);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save local files'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Could not save local files'));
    });
  } finally {
    database.close();
  }
}

export async function loadSessionFiles(sessionId: string): Promise<File[]> {
  const database = await openDatabase();
  try {
    return await new Promise<File[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(sessionId);
      request.onsuccess = () => resolve((request.result as StoredFiles | undefined)?.files ?? []);
      request.onerror = () => reject(request.error ?? new Error('Could not read local files'));
    });
  } finally {
    database.close();
  }
}

export async function removeSessionFiles(sessionId: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(sessionId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove local files'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Could not remove local files'));
    });
  } finally {
    database.close();
  }
}
