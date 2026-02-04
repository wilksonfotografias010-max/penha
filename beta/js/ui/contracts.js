export function renderContratos(dbState) {
    const lista = document.getElementById('lista-contratos');
    if (!lista) return;

    const inputBusca = document.getElementById('filtro-contrato-busca');
    const termoBusca = inputBusca ? inputBusca.value.toLowerCase() : '';

    // Filtragem dos dados
    const contratosFiltrados = dbState.contratos.filter(contrato => {
        const cliente = dbState.clientes.find(c => c.id === contrato.clienteId);
        const nomeCliente = cliente ? cliente.nome.toLowerCase() : '';
        return nomeCliente.includes(termoBusca);
    });

    lista.innerHTML = contratosFiltrados.length === 0
        ? '<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhum contrato encontrado.</td></tr>'
        : contratosFiltrados.map(contrato => {
            const cliente = dbState.clientes.find(c => c.id === contrato.clienteId) || { nome: 'Cliente não encontrado' };
            const evento = dbState.eventos.find(e => e.id === contrato.eventoId) || { nome: 'Evento não encontrado' };

            // Cálculos Financeiros (Estratégia B: Extras via Pagamento)
            const pagamentos = dbState.financeiro.filter(p => p.contratoId === contrato.id);
            const totalPago = pagamentos.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);

            const valorPacote = parseFloat(contrato.valorTotal || 0);
            const valorExtras = pagamentos.filter(p => p.isExtra).reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
            const valorFinal = valorPacote + valorExtras;

            const restante = valorFinal - totalPago;

            let statusClass = 'bg-gray-100 text-gray-800';
            switch (contrato.status) {
                case 'Proposta': statusClass = 'bg-blue-100 text-blue-800'; break;
                case 'Enviado': statusClass = 'bg-yellow-100 text-yellow-800'; break;
                case 'Assinado': statusClass = 'bg-green-100 text-green-800'; break;
                case 'Concluído': statusClass = 'bg-emerald-100 text-emerald-800'; break;
                case 'Cancelado': statusClass = 'bg-red-100 text-red-800'; break;
            }

            const linkButton = contrato.link
                ? `<a href="${contrato.link}" target="_blank" class="text-blue-500 hover:text-blue-700" title="Ver Documento"><i data-lucide="external-link" class="w-5 h-5"></i></a>`
                : `<span class="text-gray-300" title="Sem documento"><i data-lucide="external-link" class="w-5 h-5"></i></span>`;

            let restanteClass = restante > 0.01 ? 'text-red-600' : 'text-gray-500';

            return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-4 font-medium text-gray-800">${cliente.nome}</td>
                <td class="p-4 text-sm text-gray-600">${evento.nome}</td>
                <td class="p-4">
                    <div class="text-sm font-bold">Total: R$ ${valorFinal.toFixed(2).replace('.', ',')}</div>
                    <div class="text-xs text-gray-500 mt-0.5" title="Pacote Original">Pacote: R$ ${valorPacote.toFixed(2)}</div>
                    ${valorExtras > 0 ? `<div class="text-xs text-blue-600 font-medium" title="Vendas de Extras">Extras: + R$ ${valorExtras.toFixed(2)}</div>` : ''}
                    <div class="text-sm text-green-600 mt-1">Pago: R$ ${totalPago.toFixed(2).replace('.', ',')}</div>
                    <div class="text-sm font-bold ${restanteClass}">Falta: R$ ${restante.toFixed(2).replace('.', ',')}</div>
                </td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">${contrato.status}</span></td>
                <td class="p-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <button onclick="window.app.openDossieModal('${contrato.id}')" class="text-blue-500 hover:text-blue-700" title="Ver Dossiê"><i data-lucide="eye" class="w-5 h-5"></i></button>
                        <button onclick="window.app.openAddPaymentModal('${contrato.id}')" class="text-green-500 hover:text-green-700" title="Adicionar Pagamento"><i data-lucide="plus-circle" class="w-5 h-5"></i></button>
                        <button onclick="window.app.abrirGerador('${contrato.id}')" class="text-indigo-500 hover:text-indigo-700" title="Gerar Texto"><i data-lucide="file-signature" class="w-5 h-5"></i></button>
                        <button onclick="window.app.openEditContratoModal('${contrato.id}')" class="text-gray-500 hover:text-gray-700" title="Editar"><i data-lucide="edit-2" class="w-5 h-5"></i></button>
                        ${linkButton}
                        <button onclick="window.app.deleteItem('contratos', '${contrato.id}')" class="text-red-500 hover:text-red-700" title="Excluir"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');

    // FORÇA O DESENHO DOS ÍCONES APÓS O HTML SER INJETADO
    if (window.lucide) window.lucide.createIcons();
}
