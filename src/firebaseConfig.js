import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBIuTZqmSl2Y48draMes-D_ZvTzvNuBfs4",
  authDomain: "botsystem-7e35d.firebaseapp.com",
  databaseURL:
    "https://botsystem-7e35d-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "botsystem-7e35d",
  storageBucket: "botsystem-7e35d.appspot.com",
  messagingSenderId: "642017925657",
  appId: "1:642017925657:web:767a9e05836df3fc686888",
  measurementId: "G-J360DWPPYV",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };
