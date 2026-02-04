// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Suas chaves do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBC3laSN4MUaVEWUXRcEQzGSd2syKQLFkM",
  authDomain: "franciscopenha-cac9a.firebaseapp.com",
  projectId: "franciscopenha-cac9a",
  storageBucket: "franciscopenha-cac9a.firebasestorage.app",
  messagingSenderId: "364864321406",
  appId: "1:364864321406:web:b6578bd0143586b78ae52f"
};

// Inicializa e exporta os serviços
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = getFirestore(app);
