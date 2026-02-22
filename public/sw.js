// No-op service worker: unregister immediately so no caching or update checks.
self.addEventListener("activate", () => {
  self.registration?.unregister();
});
