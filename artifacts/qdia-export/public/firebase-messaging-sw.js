importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAbKWdiHtbWRufJelWzQVszfNK2tmKj6HI",
  authDomain: "qdia-dz.firebaseapp.com",
  projectId: "qdia-dz",
  storageBucket: "qdia-dz.firebasestorage.app",
  messagingSenderId: "532566442601",
  appId: "1:532566442601:web:4f28b83b4e77e539a718f8",
  measurementId: "G-2Q3PW60V7C",
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? payload.data?.title ?? "QDIA Export";
  const options = {
    body: payload.notification?.body ?? payload.data?.body ?? "",
    icon: payload.notification?.icon ?? payload.data?.icon ?? "/logo.png",
  };
  self.registration.showNotification(title, options);
});
