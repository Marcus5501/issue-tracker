import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator, ref, set, onValue, get } from 'firebase/database';
import { enableIndexedDbPersistence } from 'firebase/firestore';

// TODO: Thay thế cấu hình dưới đây bằng cấu hình Firebase của bạn
// Bạn có thể lấy thông tin này từ trang web Firebase Console
// https://console.firebase.google.com/
const firebaseConfig = {
    apiKey: "AIzaSyByE614Ijox2kXSAFeNYbEQ04SqU6oWDuo",
    authDomain: "avada-scrum-9ff0a.firebaseapp.com",
    projectId: "avada-scrum-9ff0a",
    storageBucket: "avada-scrum-9ff0a.firebasestorage.app",
    messagingSenderId: "966424081319",
    appId: "1:966424081319:web:42ad5c6beb8d82f32dbc82",
    databaseURL: "https://avada-scrum-9ff0a-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Bật tính năng persistence cho Firestore (lưu cache local)
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('Firestore persistence enabled');
  })
  .catch((err) => {
    console.error('Error enabling Firestore persistence:', err);
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence only works in one tab at a time');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser does not support persistence');
    }
  });

// Kiểm tra kết nối với Realtime Database
const connectedRef = ref(rtdb, '.info/connected');
onValue(connectedRef, (snap) => {
  if (snap.val() === true) {
    console.log('Kết nối với Firebase Realtime Database thành công');
  } else {
    console.log('Đã mất kết nối với Firebase Realtime Database');
  }
});

// Kiểm tra ping ban đầu
const pingRef = ref(rtdb, '.info/serverTimeOffset');
get(pingRef).then((snapshot) => {
  if (snapshot.exists()) {
    console.log('Firebase ping thành công, offset =', snapshot.val());
  } else {
    console.error('Không thể ping Firebase server');
  }
}).catch(err => {
  console.error('Lỗi khi ping Firebase:', err);
});

export { db, rtdb }; 