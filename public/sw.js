const CACHE_NAME = 'tandem-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Tandem', body: event.data?.text() || '' };
  }

  const { title = 'Tandem', body = '', icon = '/vite.svg', badge = '/vite.svg', tag = 'tandem', url, bookingId } = data;
  const notificationTag = bookingId ? `tandem-booking-${bookingId}` : tag;

  const options = {
    body,
    icon,
    badge,
    tag: notificationTag,
    vibrate: [200, 100, 200],
    data: { url: url || (bookingId ? `/booking-status/${bookingId}` : '/'), bookingId },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
