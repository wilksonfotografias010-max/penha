// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Carregar variáveis de variáves de ambiente (TESTE)
// Função auxiliar para parsear o .env simples
const parseEnv = (text) => {
  return text.split('\n').reduce((acc, line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      acc[key.trim()] = value;
    }
    return acc;
  }, {});
};

// Fetch síncrono (Top-level await) para garantir que config exista antes do app iniciar
const response = await fetch('/.env');
const envText = await response.text();
const env = parseEnv(envText);

const firebaseConfig = {
  apiKey: "AIzaSyBMQiHvzuFYmum-wG4OfOl2WodfhUeKpnQ",
  authDomain: "penha-livre.firebaseapp.com",
  projectId: "penha-livre",
  storageBucket: "penha-livre.firebasestorage.app",
  messagingSenderId: "568948881302",
  appId: "1:568948881302:web:553a49e4bdfe6a68724fb7"
};

console.log("--- FIREBASE CONFIG DEBUG ---");
console.log("API Key loaded:", firebaseConfig.apiKey ? "YES (Starts with " + firebaseConfig.apiKey.substring(0, 5) + ")" : "NO");
console.log("Project ID:", firebaseConfig.projectId);
console.log("Auth Domain:", firebaseConfig.authDomain);
console.log("-----------------------------");

// Inicializa e exporta os serviços
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = getFirestore(app);
