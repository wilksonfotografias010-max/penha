export function renderKanban(dbState) {
    const board = document.getElementById('kanban-board');
    if (!board) return;

    const colunasOrdenadas = [...dbState.colunas].sort((a, b) => a.ordem - b.ordem);
    board.innerHTML = '';

    if (colunasOrdenadas.length === 0) {
        board.innerHTML = `<p class="text-gray-500 p-4">Nenhuma coluna Kanban foi criada. Adicione uma acima.</p>`;
        return;
    }

    colunasOrdenadas.forEach(coluna => {
        const colunaEl = document.createElement('div');
        colunaEl.className = 'kanban-column';

        const eventosDaColuna = dbState.eventos.filter(evento => evento.colunaId === coluna.id).sort((a, b) => new Date(a.data) - new Date(b.data));
        let cardsHtml = eventosDaColuna.map(evento => {
            const dataFormatada = evento.data ? new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data indefinida';
            const cliente = dbState.clientes.find(c => c.id === evento.clienteId);
            const nomeCliente = cliente ? cliente.nome : (evento.tipo === 'Bloqueio' || evento.tipo === 'Pessoal' ? '---' : "Cliente não encontrado");
            let borderColor = 'border-blue-500';
            switch (evento.tipo) {
                case 'Casamento': borderColor = 'border-pink-500'; break;
                case 'Infantil': borderColor = 'border-yellow-500'; break;
                case 'Corporativo': borderColor = 'border-indigo-500'; break;
                case 'Ensaio': borderColor = 'border-teal-500'; break;
                case 'Evento Adulto': borderColor = 'border-purple-500'; break;
            }
            return `
            <div class="kanban-card bg-white p-5 rounded-lg shadow-md border-l-4 ${borderColor}" draggable="true" data-evento-id="${evento.id}">
                <div class="flex justify-between items-start">
                    <div><h3 class="text-xl font-bold text-gray-800">${evento.nome}</h3><p class="text-sm font-medium text-gray-600">${nomeCliente}</p></div>
                    <span class="text-xs font-semibold ${borderColor.replace('border-', 'bg-').replace('-500', '-100')} ${borderColor.replace('border-', 'text-').replace('-500', '-800')} px-2 py-1 rounded-full">${evento.tipo}</span>
                </div>
                <p class="text-gray-600 mt-2"><i data-lucide="calendar" class="inline-block w-4 h-4 mr-1"></i> ${dataFormatada}</p>
                <p class="text-gray-600 mt-1"><i data-lucide="map-pin" class="inline-block w-4 h-4 mr-1"></i> ${evento.local || 'Local a definir'}</p>
                <div class="mt-4 flex items-center gap-3">
                    <button onclick="window.app.openDossieModalFromEvento('${evento.id}')" class="text-blue-500 hover:text-blue-700" title="Ver Dossiê"><i data-lucide="eye" class="w-5 h-5"></i></button>
                    <button onclick="window.app.deleteItem('eventos', '${evento.id}')" class="text-red-500 hover:text-red-700" title="Excluir Evento"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                </div>
            </div>`;
        }).join('');

        if (eventosDaColuna.length === 0) cardsHtml = `<div class="text-center text-gray-400 text-sm p-4">Arraste eventos para cá</div>`;

        colunaEl.innerHTML = `
            <div class="kanban-column-title flex justify-between items-center bg-gray-200 rounded-t-lg px-4 py-3">
                <span class="font-bold text-gray-700">${coluna.nome} <span class="text-sm font-normal text-gray-500">(${eventosDaColuna.length})</span></span>
                <div class="flex gap-2">
                    <button onclick="window.app.editColumn('${coluna.id}', '${coluna.nome}')" class="text-gray-500 hover:text-blue-600" title="Renomear Coluna"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="window.app.deleteItem('colunas', '${coluna.id}')" class="text-gray-500 hover:text-red-600" title="Excluir Coluna"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
            <div class="kanban-cards space-y-3 p-3" data-coluna-id="${coluna.id}">${cardsHtml}</div>
        `;
        board.appendChild(colunaEl);
    });
    if (window.lucide) window.lucide.createIcons();
}
