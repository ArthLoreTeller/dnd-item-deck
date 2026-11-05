// Web Locks is unavailable on plain HTTP. A readwrite IndexedDB transaction also
// excludes other transactions on the same store, including ones in other tabs.
export function withDatabaseLock(database, commit) {
  return new Promise((resolve, reject) => {
    const open = database.open('dnd-item-deck-coordination', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('lock');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      try {
        const transaction = db.transaction('lock', 'readwrite');
        transaction.onabort = () => { db.close(); reject(transaction.error); };
        transaction.oncomplete = () => db.close();
        const ready = transaction.objectStore('lock').get('inventory');
        ready.onsuccess = () => {
          try { resolve(commit()); } catch (error) { reject(error); }
        };
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  });
}
