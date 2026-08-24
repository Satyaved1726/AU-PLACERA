// Import and configure the Firebase SDK compat libraries from CDN
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Parse initial parameters passed during navigator.serviceWorker.register(...)
const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

const hasFirebaseConfig = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

if (hasFirebaseConfig) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Listen to background messages when tab is closed
  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || '🔔 New notice';
    const notificationOptions = {
      body: payload.notification?.body || 'Check the portal for details.',
      icon: '/app_icon.png',
      data: payload.data
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Redirect on notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  if (!data || !data.postId) return;

  const targetPath = data.audience === 'oia' ? '/student/oia' : '/student/notice-board';
  const targetUrl = `${self.location.origin}${targetPath}?postId=${data.postId}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If there's an active tab belonging to our application, navigate and focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.navigate(targetUrl).then(c => c.focus());
        }
      }
      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
