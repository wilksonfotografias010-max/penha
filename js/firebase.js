// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Suas chaves do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD5ugoPst247l63pmUZBqiTG3LzbJ68LOo",
  authDomain: "wilkson-gestor-contratos.firebaseapp.com",
  projectId: "wilkson-gestor-contratos",
  storageBucket: "wilkson-gestor-contratos.firebasestorage.app",
  messagingSenderId: "391559952649",
  appId: "1:391559952649:web:f01e6262927eaea675bbd8"
};

// Inicializa e exporta os serviços
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);