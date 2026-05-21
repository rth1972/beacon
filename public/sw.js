self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(clients.claim()))

self.addEventListener('push', event => {
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If a page is focused, the SSE handler already shows a notification
      if (clientList.some(c => c.focused)) return

      let data
      try { data = event.data?.json() ?? {} } catch { data = { message: event.data?.text() } }

      const title = data.title || data.topic || 'Beacon'
      const options = {
        body: data.message || '',
        icon: '/icons/icon-192.png',
        badge: '/favicon.svg',
        tag: data.topic || 'beacon',
        data: { url: data.url, topic: data.topic },
        vibrate: data.priority === 'urgent' ? [200, 100, 200] : [100, 50, 100],
        requireInteraction: data.priority === 'urgent',
      }
      return self.registration.showNotification(title, options)
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification.data?.url || '/'
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    for (const client of clientList) {
      if (client.url === target && 'focus' in client) return client.focus()
    }
    return clients.openWindow(target)
  }))
})
