// Service Worker for TaskFlow PWA
// Enables offline access and background sync

const CACHE_NAME = "taskflow-v1";
const urlsToCache = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-16x16.png",
  "/icons/icon-32x32.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Install event - cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response or fetch from network
      return response || fetch(event.request);
    }).catch(() => {
      // If both cache and network fail, return a fallback
      if (event.request.mode === "navigate") {
        return caches.match("/");
      }
    })
  );
});

// Background sync for pending writes
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tasks") {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  // Get pending changes from IndexedDB
  const db = await openDB();
  const pendingChanges = await db.getAll("pending_changes");

  for (const change of pendingChanges) {
    try {
      await fetch("/api/tasks", {
        method: change.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change.data),
      });

      // Remove synced change
      await db.delete("pending_changes", change.id);
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("TaskFlowSync", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("pending_changes")) {
        db.createObjectStore("pending_changes", { keyPath: "id" });
      }
    };
  });
}