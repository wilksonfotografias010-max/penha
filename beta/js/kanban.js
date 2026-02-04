// js/kanban.js

// ######################################################
// ARQUIVO 8: LÓGICA DO KANBAN (Drag and Drop)
// ######################################################

// --- Variáveis de estado para o Drag and Drop ---
let draggedCard = null; // Armazena o card (HTML element) que está sendo arrastado
let draggedEventoId = null; // Armazena o ID do evento
let currentDropZone = null; // Armazena a coluna de destino (para o 'touch')

/**
 * Inicializa todos os event listeners para a funcionalidade de 
 * arrastar e soltar (mouse e touch) no quadro Kanban.
 */
export function initDragAndDrop() {
    const boardContainer = document.getElementById('kanban-board-container');
    if (!boardContainer) return; // Sai se o quadro não estiver na página

    // --- 1. Eventos de MOUSE (Drag) ---
    boardContainer.addEventListener('dragstart', (e) => {
        const card = e.target.closest('.kanban-card');
        if (!card) return;
        
        // Adiciona um feedback visual
        card.classList.add('dragging');
        // Define o dado que estamos arrastando (o ID do evento)
        e.dataTransfer.setData('text/plain', card.dataset.eventoId);
    });

    // --- 2. Eventos de MOUSE (Drop) ---
    boardContainer.addEventListener('dragend', (e) => {
        const card = e.target.closest('.kanban-card');
        if (card) {
            // Limpa o feedback visual
            card.classList.remove('dragging');
        }
    });

    boardContainer.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessário para permitir o 'drop'
        const zone = e.target.closest('.kanban-cards');
        if (!zone) return;
        
        // Remove o realce de todas as outras colunas
        document.querySelectorAll('.kanban-cards').forEach(z => z.classList.remove('drag-over'));
        // Adiciona o realce apenas na coluna atual
        zone.classList.add('drag-over');
    });

    boardContainer.addEventListener('dragleave', (e) => {
        const zone = e.target.closest('.kanban-cards');
        if (zone) {
            zone.classList.remove('drag-over');
        }
    });

    boardContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const zone = e.target.closest('.kanban-cards');
        if (!zone) return;
        
        zone.classList.remove('drag-over');
        
        // Pega os dados que definimos no 'dragstart'
        const eventoId = e.dataTransfer.getData('text/plain');
        const novaColunaId = zone.dataset.colunaId;
        
        const draggedCardEl = document.querySelector(`[data-evento-id="${eventoId}"]`);
        if (!draggedCardEl) return;
        
        // Não faz nada se soltar na mesma coluna
        if (draggedCardEl.closest('.kanban-cards').dataset.colunaId === novaColunaId) {
            return;
        }

        // Chama a função global do main.js para avisar o Firestore
        if (window.app && window.app.updateEventoColuna) {
            window.app.updateEventoColuna(eventoId, novaColunaId);
        }
    });

    // --- 3. Evento de TOQUE (Touch Start no Card) ---
    boardContainer.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.kanban-card');
        if (!card) return;
        
        // Salva o estado
        draggedCard = card; 
        draggedEventoId = card.dataset.eventoId;
        
        card.classList.add('dragging');
        
        if (navigator.vibrate) {
            navigator.vibrate(50); // Feedback tátil
        }
    }, { passive: true }); // 'passive: true' melhora a performance do scroll

    // --- 4. Evento de TOQUE (Touch Move na Página) ---
    // Usamos 'window' para que o usuário possa arrastar para fora da coluna
    window.addEventListener('touchmove', (e) => {
        if (!draggedCard) return; // Se não estamos arrastando, sai
        
        // Previne o scroll da página ENQUANTO arrasta
        if (e.cancelable) e.preventDefault();

        const touch = e.touches[0];
        // Encontra qual elemento está debaixo do dedo
        const elementUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!elementUnderFinger) return;

        // Verifica se o elemento é uma zona de drop
        const dropZone = elementUnderFinger.closest('.kanban-cards');
        
        // Limpa o realce de todas as colunas
        document.querySelectorAll('.kanban-cards').forEach(zone => {
            if (zone !== dropZone) {
                zone.classList.remove('drag-over');
            }
        });

        // Adiciona o realce e salva a zona de drop atual
        if (dropZone) {
            dropZone.classList.add('drag-over');
            currentDropZone = dropZone;
        } else {
            currentDropZone = null;
        }
    }, { passive: false }); // 'passive: false' é necessário para o preventDefault

    // --- 5. Evento de TOQUE (Touch End na Página) ---
    window.addEventListener('touchend', (e) => {
        if (!draggedCard || !draggedEventoId) {
            return; // Sai se não estava arrastando nada
        }
        
        // Limpa todos os feedbacks visuais
        draggedCard.classList.remove('dragging');
        document.querySelectorAll('.kanban-cards').forEach(zone => zone.classList.remove('drag-over'));

        // Se o usuário soltou o dedo sobre uma zona de drop válida...
        if (currentDropZone) {
            const novaColunaId = currentDropZone.dataset.colunaId;
            const colunaOriginalId = draggedCard.closest('.kanban-cards').dataset.colunaId;

            // ...e a coluna é diferente da original...
            if (novaColunaId !== colunaOriginalId) {
                // ...chama a função global para avisar o Firestore.
                if (window.app && window.app.updateEventoColuna) {
                    window.app.updateEventoColuna(draggedEventoId, novaColunaId);
                }
            }
        }
        
        // Reseta as variáveis de estado
        draggedCard = null;
        draggedEventoId = null;
        currentDropZone = null;
    });
}