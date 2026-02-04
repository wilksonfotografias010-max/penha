import { showToast } from './toast.js';

export function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

export function safeSetHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

export function showLoginError(message) {
    let errorEl = document.getElementById('login-error-message');
    if (!errorEl) {
        const form = document.getElementById('login-form');
        if (form) {
            errorEl = document.createElement('div');
            errorEl.id = 'login-error-message';
            errorEl.className = 'text-red-500 text-sm mt-2 text-center';
            form.appendChild(errorEl);
        } else {
            showToast(message, 'warning');
            return;
        }
    }
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

export function hideLoginError() {
    const errorEl = document.getElementById('login-error-message');
    if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
    }
}
