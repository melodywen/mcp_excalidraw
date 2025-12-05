/**
 * Excalidraw Library Persistence Adapter using IndexedDB
 * 
 * This module implements the LibraryPersistenceAdapter interface required by Excalidraw
 * to enable persistent storage of library items across page refreshes.
 * 
 * Storage Strategy:
 * - Uses IndexedDB for large capacity and async operations
 * - Database name: 'ExcalidrawLibrary'
 * - Object store: 'libraryItems'
 * - Fallback to localStorage for older browsers (not recommended)
 */

import type { LibraryItems_anyVersion } from '@excalidraw/excalidraw/types/element/types';
import type { 
  LibraryPersistenceAdapter, 
  LibraryPersistedData 
} from '@excalidraw/excalidraw/types/excalidraw/data/library';

const DB_NAME = 'ExcalidrawLibrary';
const DB_VERSION = 1;
const STORE_NAME = 'libraryItems';
const LIBRARY_KEY = 'items';

/**
 * IndexedDB Helper Functions
 */

/**
 * Opens the IndexedDB database and creates object store if needed
 */
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.log('Created IndexedDB object store:', STORE_NAME);
      }
    };
  });
};

/**
 * Loads library data from IndexedDB
 */
const loadFromIndexedDB = async (): Promise<{ libraryItems: LibraryItems_anyVersion } | null> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(LIBRARY_KEY);

      request.onsuccess = () => {
        const data = request.result;
        
        if (data && data.libraryItems) {
          console.log(`Loaded ${data.libraryItems.length} library items from IndexedDB`);
          resolve(data);
        } else {
          console.log('No library items found in IndexedDB');
          resolve(null);
        }
        
        db.close();
      };

      request.onerror = () => {
        console.error('Failed to load from IndexedDB:', request.error);
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error accessing IndexedDB:', error);
    return null;
  }
};

/**
 * Saves library data to IndexedDB
 */
const saveToIndexedDB = async (libraryData: LibraryPersistedData): Promise<void> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(libraryData, LIBRARY_KEY);

      request.onsuccess = () => {
        console.log(`Saved ${libraryData.libraryItems.length} library items to IndexedDB`);
        db.close();
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to save to IndexedDB:', request.error);
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
    throw error;
  }
};

/**
 * Clears all library data from IndexedDB
 */
export const clearLibraryStorage = async (): Promise<void> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(LIBRARY_KEY);

      request.onsuccess = () => {
        console.log('Cleared library storage');
        db.close();
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear library storage:', request.error);
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error clearing library storage:', error);
    throw error;
  }
};

/**
 * LocalStorage Fallback (for older browsers or IndexedDB failures)
 */

const LOCALSTORAGE_KEY = 'excalidraw-library-items';

const loadFromLocalStorage = (): { libraryItems: LibraryItems_anyVersion } | null => {
  try {
    const data = localStorage.getItem(LOCALSTORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      console.log(`Loaded ${parsed.libraryItems?.length || 0} library items from localStorage (fallback)`);
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

const saveToLocalStorage = (libraryData: LibraryPersistedData): void => {
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(libraryData));
    console.log(`Saved ${libraryData.libraryItems.length} library items to localStorage (fallback)`);
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    throw error;
  }
};

/**
 * Main Library Persistence Adapter
 * 
 * Implements the LibraryPersistenceAdapter interface required by Excalidraw.
 * Uses IndexedDB as primary storage with localStorage as fallback.
 */
export const libraryPersistenceAdapter: LibraryPersistenceAdapter = {
  /**
   * Loads library items from persistent storage
   * 
   * @param metadata - Contains source information ('load' or 'save')
   * @returns Library items or null if no data exists
   */
  async load({ source }) {
    console.log(`[LibraryAdapter] Loading library items (source: ${source})`);
    
    // Try IndexedDB first
    try {
      const data = await loadFromIndexedDB();
      if (data) {
        console.log(`[LibraryAdapter] Returning data from IndexedDB:`, data);
        return data;
      }
    } catch (error) {
      console.warn('[LibraryAdapter] IndexedDB load failed, trying localStorage fallback:', error);
    }
    
    // Fallback to localStorage
    try {
      const data = loadFromLocalStorage();
      if (data) {
        console.log(`[LibraryAdapter] Returning data from localStorage:`, data);
        // Migrate to IndexedDB for future use
        try {
          await saveToIndexedDB(data);
          console.log('[LibraryAdapter] Migrated library data from localStorage to IndexedDB');
        } catch (migrationError) {
          console.warn('[LibraryAdapter] Failed to migrate to IndexedDB:', migrationError);
        }
        return data;
      }
    } catch (error) {
      console.error('[LibraryAdapter] LocalStorage load failed:', error);
    }
    
    // No data found - return empty array instead of null
    const emptyLibrary = { libraryItems: [] };
    console.log('[LibraryAdapter] No library items found, returning empty library:', emptyLibrary);
    console.log('[LibraryAdapter] Type of return:', typeof emptyLibrary, 'is array:', Array.isArray(emptyLibrary.libraryItems));
    return emptyLibrary;
  },

  /**
   * Saves library items to persistent storage
   * 
   * @param libraryData - Library data to persist
   */
  async save(libraryData) {
    console.log(`Saving ${libraryData.libraryItems.length} library items`);
    
    // Try IndexedDB first
    try {
      await saveToIndexedDB(libraryData);
      return;
    } catch (error) {
      console.warn('IndexedDB save failed, trying localStorage fallback:', error);
    }
    
    // Fallback to localStorage
    try {
      saveToLocalStorage(libraryData);
    } catch (error) {
      console.error('Failed to save library items to any storage:', error);
      throw new Error('Library persistence failed: both IndexedDB and localStorage unavailable');
    }
  },
};

/**
 * Export helper for debugging
 */
export const debugLibraryStorage = async () => {
  console.log('=== Library Storage Debug ===');
  
  try {
    const indexedDBData = await loadFromIndexedDB();
    console.log('IndexedDB data:', indexedDBData);
  } catch (error) {
    console.log('IndexedDB error:', error);
  }
  
  try {
    const localStorageData = loadFromLocalStorage();
    console.log('LocalStorage data:', localStorageData);
  } catch (error) {
    console.log('LocalStorage error:', error);
  }
  
  console.log('=== End Debug ===');
};
