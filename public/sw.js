self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(clients.claim()))

self.addEventListener('push', event => {
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.some(c => c.focused)) return

      let data
      try { data = event.data?.json() ?? {} } catch { data = { message: event.data?.text() } }

      const title = data.title || data.topic || 'Beacon'
      const options: any = {
        body: data.message || '',
        icon: '/icons/icon-192.png',
        badge: '/favicon.svg',
        tag: data.topic || 'beacon',
        data: { url: data.url, topic: data.topic },
        vibrate: data.priority === 'urgent' ? [200, 100, 200] : [100, 50, 100],
        requireInteraction: data.priority === 'urgent',
      }

      // Notification actions (ntfy-compatible)
      if (data.actions && Array.isArray(data.actions)) {
        options.actions = data.actions.map((a: any) => ({
          action: a.action || 'view',
          title: a.label || a.action,
          icon: a.icon,
        }))
        // Store action URLs so notificationclick can look them up
        self.__pendingActions = self.__pendingActions || {}
        self.__pendingActions[data.topic || 'beacon'] = data.actions
      }

      return self.registration.showNotification(title, options)
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const tag = event.notification.tag
  const actions = self.__pendingActions?.[tag]
  let target = '/'

  if (event.action && actions) {
    const matched = actions.find((a: any) => a.action === event.action || a.label === event.action)
    if (matched?.url) target = matched.url
  } else {
    target = event.notification.data?.url || '/'
  }

  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    for (const client of clientList) {
      if (client.url === target && 'focus' in client) return client.focus()
    }
    return clients.openWindow(target)
  }))
})
