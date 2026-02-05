export function renderClientes(dbState) {
    const lista = document.getElementById('lista-clientes');
    if (!lista) return;
    lista.innerHTML = dbState.clientes.length === 0
        ? '<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhum cliente cadastrado.</td></tr>'
        : dbState.clientes.map(cliente => {
            const numEventos = dbState.eventos.filter(e => e.clienteId === cliente.id).length;
            return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-4 font-medium">${cliente.nome} <span class="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">${numEventos}</span></td>
                <td class="p-4">${cliente.telefone || '---'}</td>
                <td class="p-4">${cliente.email || '---'}</td>
                <td class="p-4 text-sm">${cliente.endereco || '---'}</td>
                <td class="p-4 flex gap-2">
                    <button onclick="window.app.openEditClienteModal('${cliente.id}')" class="text-blue-500 hover:text-blue-700" title="Editar Cliente"><i data-lucide="edit-2" class="w-5 h-5"></i></button>
                    <button onclick="window.app.deleteItem('clientes', '${cliente.id}')" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                </td>
            </tr>`;
        }).join('');
    if (window.lucide) window.lucide.createIcons();
}

export function renderFotografos(dbState) {
    const lista = document.getElementById('lista-fotografos');
    if (!lista) return;
    lista.innerHTML = dbState.fotografos.length === 0
        ? '<tr><td colspan="3" class="p-4 text-center text-gray-500">Nenhum fotógrafo cadastrado.</td></tr>'
        : dbState.fotografos.map(fotografo => `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-4">${fotografo.nome}</td><td class="p-4">${fotografo.contato}</td>
                <td class="p-4"><button onclick="window.app.deleteItem('fotografos', '${fotografo.id}')" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-5 h-5"></i></button></td>
            </tr>`).join('');
}

export function renderEventosTable(dbState) {
    const lista = document.getElementById('lista-eventos');
    if (!lista) return;

    if (!dbState.eventos || dbState.eventos.length === 0) {
        lista.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhum evento agendado.</td></tr>';
        return;
    }

    // Ordenar por Data (já vem ordenado do store, mas garantindo)
    const eventos = [...dbState.eventos];

    lista.innerHTML = eventos.map(evento => {
        const cliente = dbState.clientes.find(c => c.id === evento.clienteId);
        const nomeCliente = cliente ? cliente.nome : (evento.clienteId ? 'Cliente Removido' : '---');
        const dataFormatada = new Date(evento.data).toLocaleDateString('pt-BR');

        // Exibe Categoria e Subcategoria (se houver)
        let catDisplay = evento.tipo || '-';
        if (evento.subcategoria) {
            catDisplay += ` <span class="text-xs text-gray-500">(${evento.subcategoria})</span>`;
        }

        return `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-4 text-sm text-gray-700">${dataFormatada}</td>
            <td class="p-4 font-medium text-gray-900">${evento.nome}</td>
            <td class="p-4 text-sm text-gray-600">${catDisplay}</td>
            <td class="p-4 text-sm text-gray-600">${nomeCliente}</td>
            <td class="p-4 flex gap-2">
                 <!-- Botão de Editar (Adicionar lógica futura se necessário, por enquanto delete) -->
                <button onclick="window.app.deleteEvento('${evento.id}')" class="text-red-500 hover:text-red-700" title="Excluir Evento">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}
