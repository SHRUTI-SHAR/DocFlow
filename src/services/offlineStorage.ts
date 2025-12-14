import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  extracted_text: string;
  processing_status: string;
  metadata: any;
  storage_url?: string | null;
  blob_data?: Blob;
  cached_at: string;
  is_favorite: boolean;
}

interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  created_at: string;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
}

interface SimplifyDriveDB extends DBSchema {
  documents: {
    key: string;
    value: OfflineDocument;
    indexes: {
      'by-updated': string;
      'by-name': string;
      'by-favorite': number;
    };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-created': string;
    };
  };
  app_cache: {
    key: string;
    value: {
      key: string;
      data: any;
      cached_at: string;
      expires_at?: string;
    };
  };
}

let db: IDBPDatabase<SimplifyDriveDB> | null = null;

export const initOfflineDB = async (): Promise<IDBPDatabase<SimplifyDriveDB>> => {
  if (db) return db;

  db = await openDB<SimplifyDriveDB>('simplify-drive-offline', 2, {
    upgrade(database, oldVersion, newVersion, transaction) {
      // Documents store
      if (!database.objectStoreNames.contains('documents')) {
        const docStore = database.createObjectStore('documents', { keyPath: 'id' });
        docStore.createIndex('by-updated', 'updated_at');
        docStore.createIndex('by-name', 'file_name');
        docStore.createIndex('by-favorite', 'is_favorite');
      }

      // Sync queue store
      if (!database.objectStoreNames.contains('sync_queue')) {
        const syncStore = database.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('by-status', 'status');
        syncStore.createIndex('by-created', 'created_at');
      }

      // App cache store
      if (!database.objectStoreNames.contains('app_cache')) {
        database.createObjectStore('app_cache', { keyPath: 'key' });
      }
    },
  });

  return db;
};

// Document operations
export const saveDocumentOffline = async (
  document: Omit<OfflineDocument, 'cached_at' | 'is_favorite'>,
  blob?: Blob
): Promise<void> => {
  const database = await initOfflineDB();
  
  const offlineDoc: OfflineDocument = {
    ...document,
    blob_data: blob,
    cached_at: new Date().toISOString(),
    is_favorite: false,
  };

  await database.put('documents', offlineDoc);
};

export const getOfflineDocument = async (id: string): Promise<OfflineDocument | undefined> => {
  const database = await initOfflineDB();
  return database.get('documents', id);
};

export const getAllOfflineDocuments = async (): Promise<OfflineDocument[]> => {
  const database = await initOfflineDB();
  return database.getAll('documents');
};

export const deleteOfflineDocument = async (id: string): Promise<void> => {
  const database = await initOfflineDB();
  await database.delete('documents', id);
};

export const toggleDocumentFavorite = async (id: string): Promise<void> => {
  const database = await initOfflineDB();
  const doc = await database.get('documents', id);
  if (doc) {
    doc.is_favorite = !doc.is_favorite;
    await database.put('documents', doc);
  }
};

export const getOfflineDocumentBlob = async (id: string): Promise<Blob | undefined> => {
  const document = await getOfflineDocument(id);
  return document?.blob_data;
};

// Sync queue operations
export const addToSyncQueue = async (
  operation: SyncQueueItem['operation'],
  table: string,
  data: any
): Promise<void> => {
  const database = await initOfflineDB();
  
  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    operation,
    table,
    data,
    created_at: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  };

  await database.put('sync_queue', item);
};

export const getPendingSyncItems = async (): Promise<SyncQueueItem[]> => {
  const database = await initOfflineDB();
  return database.getAllFromIndex('sync_queue', 'by-status', 'pending');
};

export const updateSyncItemStatus = async (
  id: string,
  status: SyncQueueItem['status'],
  incrementRetry = false
): Promise<void> => {
  const database = await initOfflineDB();
  const item = await database.get('sync_queue', id);
  if (item) {
    item.status = status;
    if (incrementRetry) {
      item.retries += 1;
    }
    await database.put('sync_queue', item);
  }
};

export const removeSyncItem = async (id: string): Promise<void> => {
  const database = await initOfflineDB();
  await database.delete('sync_queue', id);
};

export const getSyncQueueCount = async (): Promise<number> => {
  const database = await initOfflineDB();
  const items = await database.getAllFromIndex('sync_queue', 'by-status', 'pending');
  return items.length;
};

// Cache operations
export const cacheData = async (
  key: string,
  data: any,
  expiresInMinutes?: number
): Promise<void> => {
  const database = await initOfflineDB();
  
  const cacheItem = {
    key,
    data,
    cached_at: new Date().toISOString(),
    expires_at: expiresInMinutes
      ? new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString()
      : undefined,
  };

  await database.put('app_cache', cacheItem);
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  const database = await initOfflineDB();
  const item = await database.get('app_cache', key);
  
  if (!item) return null;
  
  if (item.expires_at && new Date(item.expires_at) < new Date()) {
    await database.delete('app_cache', key);
    return null;
  }
  
  return item.data as T;
};

export const clearCache = async (): Promise<void> => {
  const database = await initOfflineDB();
  await database.clear('app_cache');
};

// Storage stats
export const getOfflineStorageStats = async (): Promise<{
  documentCount: number;
  totalSize: number;
  pendingSyncs: number;
}> => {
  const database = await initOfflineDB();
  const documents = await database.getAll('documents');
  const pendingSyncs = await getSyncQueueCount();
  
  const totalSize = documents.reduce((sum, doc) => {
    const blobSize = doc.blob_data?.size || 0;
    return sum + doc.file_size + blobSize;
  }, 0);

  return {
    documentCount: documents.length,
    totalSize,
    pendingSyncs,
  };
};

// Clear all offline data
export const clearAllOfflineData = async (): Promise<void> => {
  const database = await initOfflineDB();
  await database.clear('documents');
  await database.clear('sync_queue');
  await database.clear('app_cache');
};
