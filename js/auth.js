// js/auth.js

// ######################################################
// ARQUIVO 6: AUTENTICAÇÃO (O Porteiro)
// ######################################################
// Este arquivo cuida apenas do login, registro, logout
// e monitora o estado da autenticação.

import { auth } from './firebase.js'; // Importa a conexão do arquivo 2
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Importa as funções de UI para mostrar/esconder erros de login
import { showLoginError, hideLoginError } from './ui.js';

/**
 * Inicializa os listeners de autenticação.
 * @param {function} onLogin - Função do main.js a ser chamada quando o usuário logar.
 * @param {function} onLogout - Função do main.js a ser chamada quando o usuário deslogar.
 */
export function setupAuthListeners(onLogin, onLogout) {
    
    // 1. Monitora o estado da autenticação
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário está logado
            hideLoginError();
            onLogin(user); // Chama a função principal de login
        } else {
            // Usuário está deslogado
            onLogout(); // Chama a função principal de logout
        }
    });

    // 2. Listener do formulário de Login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        hideLoginError();
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // O onAuthStateChanged vai cuidar do resto
        } catch (error) {
            console.error("Erro de login:", error.code);
            showLoginError("Email ou senha incorretos.");
        }
    });

    // 3. Listener do botão de Registrar
    document.getElementById('register-button').addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        hideLoginError();

        if (password.length < 6) {
            showLoginError("A senha deve ter no mínimo 6 caracteres.");
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            // O onAuthStateChanged vai cuidar do resto
        } catch (error) {
            console.error("Erro de registro:", error.code);
            if (error.code === 'auth/email-already-in-use') {
                showLoginError("Este email já está em uso.");
            } else {
                showLoginError("Erro ao registrar. Tente novamente.");
            }
        }
    });

    // 4. Listener do botão de Sair
    document.getElementById('logout-button').addEventListener('click', () => {
        signOut(auth);
    });
}