/* Nongki PWA data layer — IndexedDB foundation.
 * This module deliberately contains no API secret and does not connect to a backend yet.
 * Load with: <script type="module"> import { ... } from './src/db.js'; </script>
 */
const DB_NAME = 'nongki-pwa';
const DB_VERSION = 1;
const STORES = {
  products: 'products',
  transactions: 'transactions',
  outbox: 'outbox',
  sessions: 'sessions'
};

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

export function openNongkiDB() {
  if (!('indexedDB' in globalThis)) {
    return Promise.reject(new Error('Perangkat/browser ini tidak mendukung IndexedDB.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.products)) {
        db.createObjectStore(STORES.products, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.transactions)) {
        const store = db.createObjectStore(STORES.transactions, { keyPath: 'id' });
        store.createIndex('businessDate', 'businessDate', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.outbox)) {
        const store = db.createObjectStore(STORES.outbox, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.sessions)) {
        db.createObjectStore(STORES.sessions, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Gagal membuka database Nongki.'));
    request.onblocked = () => reject(new Error('Database Nongki sedang dipakai tab lama. Tutup tab aplikasi lain lalu coba lagi.'));
  });
}

async function withStore(storeName, mode, callback) {
  const db = await openNongkiDB();
  try {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = await callback(store, tx);
    await transactionDone(tx);
    return result;
  } finally {
    db.close();
  }
}

export async function getAllRecords(storeName) {
  if (!Object.values(STORES).includes(storeName)) throw new Error('Store tidak dikenal.');
  return withStore(storeName, 'readonly', store => requestResult(store.getAll()));
}

export async function putProduct(product) {
  if (!product?.id || !product?.name || !Number.isFinite(Number(product.price))) {
    throw new Error('Produk harus memiliki id, nama, dan harga valid.');
  }
  const record = {
    ...product,
    price: Number(product.price),
    active: product.active !== false,
    updatedAt: new Date().toISOString()
  };
  return withStore(STORES.products, 'readwrite', store => requestResult(store.put(record)));
}

export async function recordTransaction({ userId = null, deviceId = null, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Transaksi harus memiliki minimal satu item.');
  }
  const cleanItems = items.map(item => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!item.productId || !item.productName || !Number.isInteger(quantity) || quantity < 1 ||
        !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('Detail produk tidak valid.');
    }
    return {
      productId: String(item.productId),
      productName: String(item.productName),
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice
    };
  });
  const now = new Date();
  const id = crypto.randomUUID();
  const transaction = {
    id,
    createdAt: now.toISOString(),
    businessDate: [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'),
    userId,
    deviceId,
    status: 'active',
    canceledAt: null,
    canceledBy: null,
    cancelReason: null,
    items: cleanItems,
    total: cleanItems.reduce((sum, item) => sum + item.lineTotal, 0)
  };
  const db = await openNongkiDB();
  try {
    const tx = db.transaction([STORES.transactions, STORES.outbox], 'readwrite');
    tx.objectStore(STORES.transactions).add(transaction);
    tx.objectStore(STORES.outbox).add({
      id: crypto.randomUUID(),
      entityId: id,
      eventType: 'transaction.created',
      createdAt: now.toISOString(),
      payload: transaction,
      attempts: 0,
      lastError: null
    });
    await transactionDone(tx);
    return transaction;
  } finally {
    db.close();
  }
}

export async function cancelTransaction(transactionId, { userId = null, reason = '' } = {}) {
  const db = await openNongkiDB();
  try {
    const tx = db.transaction([STORES.transactions, STORES.outbox], 'readwrite');
    const transactions = tx.objectStore(STORES.transactions);
    const current = await requestResult(transactions.get(transactionId));
    if (!current) throw new Error('Transaksi tidak ditemukan.');
    if (current.status === 'canceled') {
      await transactionDone(tx);
      return current;
    }
    const now = new Date().toISOString();
    const updated = {
      ...current,
      status: 'canceled',
      canceledAt: now,
      canceledBy: userId,
      cancelReason: String(reason || '').trim()
    };
    transactions.put(updated);
    tx.objectStore(STORES.outbox).add({
      id: crypto.randomUUID(),
      entityId: transactionId,
      eventType: 'transaction.canceled',
      createdAt: now,
      payload: {
        transactionId,
        status: 'canceled',
        canceledAt: now,
        canceledBy: userId,
        cancelReason: updated.cancelReason
      },
      attempts: 0,
      lastError: null
    });
    await transactionDone(tx);
    return updated;
  } finally {
    db.close();
  }
}

export async function getPendingOutbox() {
  const records = await getAllRecords(STORES.outbox);
  return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeOutboxEvent(eventId) {
  return withStore(STORES.outbox, 'readwrite', store => requestResult(store.delete(eventId)));
}

export async function markOutboxAttempt(eventId, errorMessage = '') {
  const db = await openNongkiDB();
  try {
    const tx = db.transaction(STORES.outbox, 'readwrite');
    const store = tx.objectStore(STORES.outbox);
    const event = await requestResult(store.get(eventId));
    if (event) {
      event.attempts = (Number(event.attempts) || 0) + 1;
      event.lastError = String(errorMessage || '').slice(0, 500) || null;
      store.put(event);
    }
    await transactionDone(tx);
    return event || null;
  } finally {
    db.close();
  }
}
