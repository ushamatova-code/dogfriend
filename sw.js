// DogFriend Service Worker v1.0
// Этот файл ДОЛЖЕН лежать в корне сайта (рядом с index.html)

const CACHE_NAME = 'dogfriend-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(
    self.clients.claim().then(() => {
      // Сообщаем всем открытым вкладкам — есть обновление, перезагрузись
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
});

// ── Обработка входящих Push-уведомлений ──────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'DogFriend', body: event.data ? event.data.text() : 'Новое уведомление' };
  }

  const title = data.title || 'DogFriend 🐕';
  const options = {
    body: data.body || 'Новое уведомление',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge.png',
    tag: data.tag || `dogfriend-${Date.now()}`,
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    silent: false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      chatId: data.chatId || null,
      type: data.type || 'message',
      ...data
    },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Клик по уведомлению ───────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если приложение уже открыто — фокусируемся на нём
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Отправляем сообщение в приложение чтобы открыть нужный чат
          client.postMessage({ type: 'NOTIFICATION_CLICK', data: notifData });
          return;
        }
      }
      // Если приложение закрыто — открываем новую вкладку
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Закрытие уведомления ──────────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});
