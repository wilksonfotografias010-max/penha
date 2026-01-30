export function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-5 right-5 z-50 flex flex-col gap-2';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');

    // Cores baseadas no tipo
    let bgClass = 'bg-blue-600';
    let icon = 'info';

    if (type === 'success') { bgClass = 'bg-green-600'; icon = 'check-circle'; }
    if (type === 'error') { bgClass = 'bg-red-600'; icon = 'alert-circle'; }
    if (type === 'warning') { bgClass = 'bg-yellow-600'; icon = 'alert-triangle'; }

    toast.className = `${bgClass} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 transform transition-all duration-300 translate-x-full opacity-0 min-w-[300px]`;
    toast.innerHTML = `
        <i data-lucide="${icon}" class="w-6 h-6 flex-shrink-0"></i>
        <span class="font-medium text-sm flex-1">${message}</span>
        <button onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100"><i data-lucide="x" class="w-4 h-4"></i></button>
    `;

    container.appendChild(toast);

    // Renderiza ícones
    if (window.lucide) window.lucide.createIcons();

    // Animação de entrada
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    });

    // Auto remove após 3.5 segundos
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 300);
    }, 4000);
}
