/* [INICIO: AUTH_IMPORTS] */
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { app } from './firebase.js';
import * as ui from './ui.js'; // Para mostrar mensagens de erro
/* [FIM: AUTH_IMPORTS] */

const auth = getAuth(app);

/* [INICIO: AUTH_LISTENERS] */
export function setupAuthListeners(onLoginCallback, onLogoutCallback) {

    // 1. Monitora o estado da autenticação (Logado/Deslogado)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // console.log("Usuário logado.");
            onLoginCallback(user);
        } else {
            // console.log("Usuário deslogado");
            onLogoutCallback();
        }
    });

    // 2. Listener do Formulário de Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Limpa erro anterior
            ui.hideLoginError();

            try {
                await signInWithEmailAndPassword(auth, email, password);
                // O onAuthStateChanged vai lidar com o resto
            } catch (error) {
                console.error("Erro no login:", error);
                let msg = "Falha ao entrar.";
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    msg = "Email ou senha incorretos.";
                } else if (error.code === 'auth/too-many-requests') {
                    msg = "Muitas tentativas. Tente mais tarde.";
                }
                ui.showLoginError(msg);
            }
        });
    }

    // 3. Listener do Botão de Logout
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
            } catch (error) {
                console.error("Erro ao sair:", error);
            }
        });
    }

    // 4. Listener do Botão "Criar Conta"
    // Este botão usa os mesmos campos de Email/Senha do form de login para criar a conta
    const registerBtn = document.getElementById('register-button');
    if (registerBtn) {
        registerBtn.addEventListener('click', async (e) => {
            e.preventDefault(); // Evita submit do form se estiver dentro dele

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                ui.showToast("Preencha email e senha para criar a conta.", 'warning');
                return;
            }

            if (password.length < 6) {
                ui.showToast("A senha deve ter pelo menos 6 caracteres.", 'warning');
                return;
            }

            if (confirm("Deseja criar uma nova conta com este email e senha?")) {
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    ui.showToast("Conta criada com sucesso! Você já está logado.", 'success');
                } catch (error) {
                    console.error("Erro ao criar conta:", error);
                    let msg = "Erro ao criar conta.";
                    if (error.code === 'auth/email-already-in-use') msg = "Este email já está cadastrado.";
                    if (error.code === 'auth/invalid-email') msg = "Email inválido.";
                    ui.showToast(msg, 'error');
                }
            }
        });
    }
}
/* [FIM: AUTH_LISTENERS] */
