// Handles the Web Share Target POST so users can share entire photo albums
// from the iOS Photos app directly into the slideshow.
let pendingFiles = null;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.searchParams.has('share-target') && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  const formData = await request.formData();
  const files = formData.getAll('media').filter(f => f instanceof File);

  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  if (clients.length > 0) {
    clients[0].postMessage({ type: 'SHARED_FILES', files });
    clients[0].focus();
  } else {
    pendingFiles = files;
  }

  return Response.redirect('/', 303);
}

self.addEventListener('message', event => {
  if (event.data?.type === 'GET_SHARED_FILES') {
    if (pendingFiles) {
      event.source.postMessage({ type: 'SHARED_FILES', files: pendingFiles });
      pendingFiles = null;
    }
  }
});
