// src/firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyC_dUT5zu19BstgZy8pH4Lj7psOSyx41lM",
  authDomain: "pokechampions-86482.firebaseapp.com",
  projectId: "pokechampions-86482",
  storageBucket: "pokechampions-86482.firebasestorage.app",
  messagingSenderId: "624226354474",
  appId: "1:624226354474:web:eca1d3a35272ee41af0a53",
  measurementId: "G-8NLJFDSHKB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
