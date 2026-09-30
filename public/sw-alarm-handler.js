// sw-alarm-handler.js - Lockscreen Alarm and Notification Handler for Prabhat Nepali Alarm
// Handles action buttons directly on Android and Mobile Lock screens!

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const action = event.action || 'open';
  const targetAction = action === 'upload_photo' ? 'upload_photo' : 'photo_challenge';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // 1. If an existing app window is open, focus it and tell it to show the upload/photo screen
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          client.postMessage({
            type: 'LOCKSCREEN_ALARM_ACTION',
            action: targetAction,
            timestamp: Date.now(),
          });
          return client.focus();
        }
      }

      // 2. If no window is open (e.g., app was in background), open the window directly
      if (clients.openWindow) {
        const urlToOpen =
          targetAction === 'upload_photo'
            ? '/?action=upload_photo'
            : '/?action=photo_challenge';
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Allow ServiceWorker to show high-priority notifications with lockscreen action buttons
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'TRIGGER_LOCKSCREEN_ALARM') {
    const alarm = event.data.alarm;
    const title = `⏰ Prabhat Alarm Ringing! (${alarm.time || 'Morning'} NPT)`;
    const body = `${alarm.label || 'Wake Up Alarm'} — Mandatory Wake-Up Photo Challenge! Tap below to upload photo and stop alarm.`;

    self.registration.showNotification(title, {
      body: body,
      icon: '/pwa-192x192.png',
      badge: '/icon.svg',
      tag: 'prabhat-nepali-alarm',
      requireInteraction: true,
      renotify: true,
      vibrate: [600, 300, 600, 300, 600, 300, 1000],
      actions: [
        {
          action: 'upload_photo',
          title: '📷 Upload Photo',
        },
        {
          action: 'open_challenge',
          title: '☀️ Stop Alarm',
        },
      ],
      data: {
        alarmId: alarm.id,
        action: 'upload_photo',
        timestamp: Date.now(),
      },
    });
  }
});
