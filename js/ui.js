// js/ui.js

// ######################################################
// ARQUIVO 4: RENDERIZADOR DA INTERFACE (UI) - CORRIGIDO
// ######################################################

// Variável global para o gráfico
let myFluxoChart = null; 

// --- 0. FUNÇÕES AUXILIARES DE AUTH (Restauradas) ---

export function showLoginError(message) {
    let errorEl = document.getElementById('login-error-message');
    // Se o elemento não existir no HTML, cria um fallback ou usa alert
    if (!errorEl) {
        const form = document.getElementById('login-form');
        if (form) {
            errorEl = document.createElement('div');
            errorEl.id = 'login-error-message';
            errorEl.className = 'text-red-500 text-sm mt-2 text-center';
            form.appendChild(errorEl);
        } else {
            alert(message);
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

// --- 1. RENDERIZAÇÃO DO DASHBOARD ---

// js/ui.js (Apenas substitua a função updateDashboard e as funções auxiliares abaixo)

// Função auxiliar para evitar erro se o elemento não existir
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = text;
    }
}

// Função auxiliar para evitar erro ao setar HTML
function safeSetHTML(id, html) {
    const el = document.getElementById(id);
    if (el) {
        el.innerHTML = html;
    }
}

export function updateDashboard(dbState) {
    // Cálculo dos valores
    const totalPago = dbState.financeiro.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
    
    let totalContratado = 0;
    dbState.contratos.forEach(contrato => {
        if (contrato.status === 'Assinado' || contrato.status === 'Concluído') {
            totalContratado += (parseFloat(contrato.valorTotal) || 0);
        }
    });
    
    const totalPendente = totalContratado - totalPago;
    const totalCustos = dbState.custos.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
    const lucroLiquido = totalPago - totalCustos;

    // --- ATUALIZAÇÃO SEGURA DO DOM ---
    
    // Cards do Topo
    safeSetText('total-pendente', `R$ ${totalPendente.toFixed(2).replace('.', ',')}`);
    safeSetText('total-custos', `R$ ${totalCustos.toFixed(2).replace('.', ',')}`);

    const lucroEl = document.getElementById('lucro-liquido');
    if (lucroEl) {
        lucroEl.innerText = `R$ ${lucroLiquido.toFixed(2).replace('.', ',')}`;
        lucroEl.classList.toggle('text-red-600', lucroLiquido < 0);
        lucroEl.classList.toggle('text-gray-800', lucroLiquido >= 0);
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Entregas Críticas
    let entregasCriticasCount = 0;
    dbState.eventos.forEach(evento => {
        const tipos = ['previa', 'midia', 'album'];
        tipos.forEach(tipo => {
            const info = getEntregaInfo(evento, tipo); 
            if (info.status === 'atrasado' || info.status === 'hoje') {
                entregasCriticasCount++;
            }
        });
    });
    safeSetText('db-entregas-criticas', entregasCriticasCount);
    
    // Contratos Fechados (Mês)
    let valorContratosMes = 0;
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    dbState.contratos.forEach(contrato => {
        if ((contrato.status === 'Assinado' || contrato.status === 'Concluído') && contrato.dataContrato) {
            const dataContrato = new Date(contrato.dataContrato + 'T00:00:00');
            if (dataContrato.getMonth() === mesAtual && dataContrato.getFullYear() === anoAtual) {
                valorContratosMes += (parseFloat(contrato.valorTotal) || 0);
            }
        }
    });
    safeSetText('db-contratos-mes', `R$ ${valorContratosMes.toFixed(2).replace('.', ',')}`);

    // Eventos (Próximos 30 dias)
    let eventos30DiasCount = 0;
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + 30);

    dbState.eventos.forEach(evento => {
        if (evento.data) {
            const dataEvento = new Date(evento.data + 'T00:00:00');
            if (dataEvento >= hoje && dataEvento <= dataLimite) {
                eventos30DiasCount++;
            }
        }
    });
    safeSetText('db-eventos-30d', eventos30DiasCount);

    // --- Listas do Dashboard ---
    
    // Próximos 5 Eventos
    const eventosFuturos = dbState.eventos
        .filter(evento => evento.data && new Date(evento.data + 'T00:00:00') >= hoje)
        .sort((a, b) => new Date(a.data) - new Date(b.data))
        .slice(0, 5); 

    let htmlFuturos = '';
    if (eventosFuturos.length === 0) {
        htmlFuturos = '<p class="text-gray-500">Nenhum evento futuro agendado.</p>';
    } else {
        htmlFuturos = eventosFuturos.map(evento => {
            const dataFormatada = new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR');
            const cliente = dbState.clientes.find(c => c.id === evento.clienteId);
            return `
                <div class="border-b border-gray-100 pb-2">
                    <p class="font-semibold text-gray-800">${evento.nome}</p>
                    <p class="text-sm text-gray-600">${cliente ? cliente.nome : 'Cliente'} - <strong>${dataFormatada}</strong></p>
                </div>
            `;
        }).join('');
    }
    safeSetHTML('dashboard-proximos-eventos', htmlFuturos);

    // Últimos 5 Eventos (Entregas)
    const eventosPassados = dbState.eventos
        .filter(evento => evento.data && new Date(evento.data + 'T00:00:00') < hoje)
        .sort((a, b) => new Date(b.data) - new Date(a.data)) // Decrescente
        .slice(0, 5);

    let htmlPassados = '';
    if (eventosPassados.length === 0) {
        htmlPassados = '<p class="text-gray-500">Nenhum evento passado encontrado.</p>';
    } else {
        htmlPassados = eventosPassados.map(evento => {
            const infoMidia = getEntregaInfo(evento, 'midia');
            const infoAlbum = getEntregaInfo(evento, 'album');

            const getStatusColor = (info) => {
                if (info.status === 'entregue') return 'text-green-600';
                if (info.status === 'atrasado') return 'text-red-600';
                if (info.status === 'hoje') return 'text-yellow-600';
                return 'text-blue-600'; 
            };
            
            const midiaColor = getStatusColor(infoMidia);
            const albumColor = getStatusColor(infoAlbum);
            const dataFormatada = new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR');

            return `
                <div class="border-b border-gray-100 pb-3">
                    <p class="font-semibold text-gray-800">${evento.nome} <span class="text-sm text-gray-500">(${dataFormatada})</span></p>
                    <div class="text-sm space-y-1 mt-1 pl-2">
                        <p><strong>Mídia:</strong> <span class="font-medium ${midiaColor}">${infoMidia.text}</span></p>
                        <p><strong>Álbum:</strong> <span class="font-medium ${albumColor}">${infoAlbum.text}</span></p>
                    </div>
                </div>
            `;
        }).join('');
    }
    safeSetHTML('dashboard-ultimos-eventos', htmlPassados);
}

// --- 2. RENDERIZAÇÃO DAS SEÇÕES PRINCIPAIS ---

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
        
        const eventosDaColuna = dbState.eventos
            .filter(evento => evento.colunaId === coluna.id)
            .sort((a, b) => new Date(a.data) - new Date(b.data)); 
        
        let cardsHtml = eventosDaColuna.map(evento => {
            const dataFormatada = evento.data ? new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data indefinida';
            const cliente = dbState.clientes.find(c => c.id === evento.clienteId);
            const nomeCliente = cliente ? cliente.nome : "Cliente não encontrado";

            let borderColor = 'border-blue-500';
            switch(evento.tipo) {
                case 'Casamento': borderColor = 'border-pink-500'; break;
                case 'Infantil': borderColor = 'border-yellow-500'; break;
                case 'Corporativo': borderColor = 'border-indigo-500'; break;
                case 'Ensaio': borderColor = 'border-teal-500'; break;
                case 'Evento Adulto': borderColor = 'border-purple-500'; break;
            }

            return `
            <div class="kanban-card bg-white p-5 rounded-lg shadow-md border-l-4 ${borderColor}" draggable="true" data-evento-id="${evento.id}">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">${evento.nome}</h3>
                        <p class="text-sm font-medium text-gray-600">${nomeCliente}</p>
                    </div>
                    <span class="text-xs font-semibold ${borderColor.replace('border-', 'bg-').replace('-500', '-100')} ${borderColor.replace('border-', 'text-').replace('-500', '-800')} px-2 py-1 rounded-full">${evento.tipo}</span>
                </div>
                <p class="text-gray-600 mt-2"><i data-lucide="calendar" class="inline-block w-4 h-4 mr-1"></i> ${dataFormatada}</p>
                <p class="text-gray-600 mt-1"><i data-lucide="map-pin" class="inline-block w-4 h-4 mr-1"></i> ${evento.local || 'Local a definir'}</p>
                <div class="mt-4 flex items-center gap-3">
                    <button onclick="window.app.openDossieModalFromEvento('${evento.id}')" class="text-blue-500 hover:text-blue-700" title="Ver Dossiê">
                        <i data-lucide="eye" class="w-5 h-5"></i>
                    </button>
                    <button onclick="window.app.deleteItem('eventos', '${evento.id}')" class="text-red-500 hover:text-red-700" title="Excluir Evento">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>`;
        }).join('');

        if (eventosDaColuna.length === 0) {
            cardsHtml = `<div class="text-center text-gray-400 text-sm p-4">Arraste eventos para cá</div>`;
        }

        // Cabeçalho da Coluna com Botões de Ação
        colunaEl.innerHTML = `
            <div class="kanban-column-title flex justify-between items-center bg-gray-200 rounded-t-lg px-4 py-3">
                <span class="font-bold text-gray-700">${coluna.nome} <span class="text-sm font-normal text-gray-500">(${eventosDaColuna.length})</span></span>
                <div class="flex gap-2">
                    <button onclick="window.app.editColumn('${coluna.id}', '${coluna.nome}')" class="text-gray-500 hover:text-blue-600" title="Renomear Coluna">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.app.deleteItem('colunas', '${coluna.id}')" class="text-gray-500 hover:text-red-600" title="Excluir Coluna">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <div class="kanban-cards space-y-3 p-3" data-coluna-id="${coluna.id}">
                ${cardsHtml}
            </div>
        `;
        
        board.appendChild(colunaEl);
    });
    
    // Recarrega os ícones
    if (window.lucide) window.lucide.createIcons();
}

// Em js/ui.js

export function renderClientes(dbState) {
    const lista = document.getElementById('lista-clientes');
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
                    <button onclick="window.app.openEditClienteModal('${cliente.id}')" class="text-blue-500 hover:text-blue-700" title="Editar Cliente">
                        <i data-lucide="edit-2" class="w-5 h-5"></i>
                    </button>
                    <button onclick="window.app.deleteItem('clientes', '${cliente.id}')" class="text-red-500 hover:text-red-700" title="Excluir Cliente">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    
    if (window.lucide) window.lucide.createIcons();
}

// Adicione estas novas funções no js/ui.js (pode ser no final do arquivo)

export function openEditClienteModal(clienteId, dbState) {
    const cliente = dbState.clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    document.getElementById('edit-cliente-id').value = cliente.id;
    document.getElementById('edit-cliente-nome').value = cliente.nome || '';
    document.getElementById('edit-cliente-telefone').value = cliente.telefone || '';
    document.getElementById('edit-cliente-email').value = cliente.email || '';
    document.getElementById('edit-cliente-documento').value = cliente.documento || '';
    document.getElementById('edit-cliente-endereco').value = cliente.endereco || '';

    document.getElementById('modal-edit-cliente').classList.remove('hidden');
}

export function closeEditClienteModal() {
    document.getElementById('modal-edit-cliente').classList.add('hidden');
}

export function renderContratos(dbState) {
    const lista = document.getElementById('lista-contratos');
    lista.innerHTML = dbState.contratos.length === 0 
        ? '<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhum contrato cadastrado.</td></tr>'
        : dbState.contratos.map(contrato => {
            const cliente = dbState.clientes.find(c => c.id === contrato.clienteId) || { nome: 'Cliente não encontrado' };
            const evento = dbState.eventos.find(e => e.id === contrato.eventoId) || { nome: 'Evento não encontrado' };
            
            const valorTotal = parseFloat(contrato.valorTotal || 0);
            const totalPago = dbState.financeiro
                .filter(p => p.contratoId === contrato.id)
                .reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
            const restante = valorTotal - totalPago;

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
            
            let restanteClass = 'text-gray-500';
            if (restante > 0) restanteClass = 'text-red-600';
            if (restante <= 0 && valorTotal > 0) restanteClass = 'text-green-600';

            return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-4">${cliente.nome}</td>
                <td class="p-4">${evento.nome}</td>
                <td class="p-4">
                    <div class="text-sm">Total: R$ ${valorTotal.toFixed(2).replace('.', ',')}</div>
                    <div class="text-sm text-green-600">Pago: R$ ${totalPago.toFixed(2).replace('.', ',')}</div>
                    <div class="text-sm font-medium ${restanteClass}">Restante: R$ ${restante.toFixed(2).replace('.', ',')}</div>
                </td>
                <td class="p-4"><span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">${contrato.status}</span></td>
                <td class="p-4 flex items-center gap-3">
                    <button onclick="window.app.openDossieModal('${contrato.id}')" class="text-blue-500 hover:text-blue-700" title="Ver Dossiê">
                        <i data-lucide="eye" class="w-5 h-5"></i>
                    </button>
                    <button onclick="window.app.openAddPaymentModal('${contrato.id}')" class="text-green-500 hover:text-green-700" title="Adicionar Pagamento">
                        <i data-lucide="plus-circle" class="w-5 h-5"></i>
                    </button>
                    <button onclick="window.app.abrirGerador('${contrato.id}')" class="text-indigo-500 hover:text-indigo-700" title="Gerar Texto do Contrato">
                        <i data-lucide="file-signature" class="w-5 h-5"></i>
                    </button>
                    <button onclick="window.app.openEditContratoModal('${contrato.id}')" class="text-gray-500 hover:text-gray-700" title="Editar Contrato (Link/Status)">
                        <i data-lucide="edit-2" class="w-5 h-5"></i>
                    </button>
                    ${linkButton}
                    <button onclick="window.app.deleteItem('contratos', '${contrato.id}')" class="text-red-500 hover:text-red-700" title="Excluir Contrato"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                </td>
            </tr>`;
        }).join('');
}

export function renderFotografos(dbState) {
    const lista = document.getElementById('lista-fotografos');
     lista.innerHTML = dbState.fotografos.length === 0 
        ? '<tr><td colspan="3" class="p-4 text-center text-gray-500">Nenhum fotógrafo cadastrado.</td></tr>'
        : dbState.fotografos.map(fotografo => `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-4">${fotografo.nome}</td><td class="p-4">${fotografo.contato}</td>
                <td class="p-4"><button onclick="window.app.deleteItem('fotografos', '${fotografo.id}')" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-5 h-5"></i></button></td>
            </tr>`).join('');
}

export function renderFinanceiro(dbState) {
    const lista = document.getElementById('lista-financeiro');
    
    lista.innerHTML = dbState.financeiro.length === 0 
        ? '<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum pagamento registrado.</td></tr>'
        : dbState.financeiro.map(pagamento => {
            
            const contrato = dbState.contratos.find(c => c.id === pagamento.contratoId) || {};
            const cliente = dbState.clientes.find(c => c.id === contrato.clienteId) || { nome: 'Cliente não encontrado' };
            const evento = dbState.eventos.find(e => e.id === contrato.eventoId) || { nome: 'Contrato não encontrado' };
            
            const dataFormatada = pagamento.data ? new Date(pagamento.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data';
            const valorFormatado = (parseFloat(pagamento.valor) || 0).toFixed(2).replace('.', ',');

            return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-4">${dataFormatada}</td>
                <td class="p-4">${cliente.nome}</td>
                <td class="p-4">${evento.nome}</td>
                <td class="p-4"><span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">${pagamento.metodo || 'N/D'}</span></td>
                <td class="p-4 font-medium text-green-600">R$ ${valorFormatado}</td>
                <td class="p-4">
                    <button onclick="window.app.deleteItem('financeiro', '${pagamento.id}')" class="text-red-500 hover:text-red-700" title="Excluir Pagamento">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
}

// ... dentro de js/ui.js ...

export function renderCustos(dbState) {
    const lista = document.getElementById('lista-custos');
    lista.innerHTML = dbState.custos.length === 0
        ? '<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum custo cadastrado.</td></tr>'
        : dbState.custos.map(item => {
            const evento = item.eventoId ? dbState.eventos.find(e => e.id === item.eventoId) : null; 
            const fotografo = dbState.fotografos.find(f => f.id === item.fotografoId);
            const valor = parseFloat(item.valor) || 0;
            const dataFormatada = item.data 
                ? new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR') 
                : 'Sem data';

            // Lógica de Status
            const isPendente = item.status === 'Pendente';
            const isRecorrente = item.repetir === true;

            // Badge de Status
            let statusHtml = '';
            if (isPendente) {
                statusHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <i data-lucide="clock" class="w-3 h-3 mr-1"></i> Pendente
                </span>`;
            } else {
                statusHtml = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <i data-lucide="check" class="w-3 h-3 mr-1"></i> Pago
                </span>`;
            }

            // Controle de Recorrência (Toggle)
            const btnRecorrencia = `
                <button onclick="window.app.toggleRecorrencia('${item.id}', ${!isRecorrente})" 
                    class="ml-2 p-1 rounded hover:bg-gray-200 ${isRecorrente ? 'text-blue-600' : 'text-gray-400'}" 
                    title="${isRecorrente ? 'Desativar repetição mensal' : 'Ativar repetição mensal'}">
                    <i data-lucide="repeat" class="w-4 h-4"></i>
                </button>
            `;

            // Botão de Confirmar (Só aparece se for Pendente)
            const btnConfirmar = isPendente 
                ? `<button onclick="window.app.confirmarCusto('${item.id}')" class="text-green-600 hover:text-green-800 mr-2" title="Confirmar Pagamento">
                     <i data-lucide="check-circle-2" class="w-5 h-5"></i>
                   </button>`
                : '';

            return `<tr class="border-b hover:bg-gray-50 ${isPendente ? 'bg-yellow-50/50' : ''}">
                <td class="p-4">${dataFormatada}</td>
                <td class="p-4 font-medium">${item.descricao}</td>
                <td class="p-4 text-sm text-gray-600">${evento ? evento.nome : 'Custo Fixo'} ${fotografo ? `(${fotografo.nome})` : ''}</td>
                <td class="p-4 font-bold text-gray-700">R$ ${valor.toFixed(2).replace('.', ',')}</td>
                <td class="p-4 flex items-center">
                    ${statusHtml}
                    ${btnRecorrencia}
                </td>
                <td class="p-4">
                    <div class="flex items-center">
                        ${btnConfirmar}
                        <button onclick="window.app.deleteItem('custos', '${item.id}')" class="text-red-500 hover:text-red-700" title="Excluir Custo">
                            <i data-lucide="trash-2" class="w-5 h-5"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
        
    if (window.lucide) window.lucide.createIcons();
}

export function renderContasAReceber(dbState) {
    const lista = document.getElementById('lista-contas-a-receber');
    if (!lista) return;

    let pendencias = [];

    dbState.contratos.forEach(contrato => {
        if (contrato.status === 'Cancelado' || contrato.status === 'Proposta') {
            return;
        }

        const valorTotal = parseFloat(contrato.valorTotal || 0);
        const totalPago = dbState.financeiro
            .filter(p => p.contratoId === contrato.id)
            .reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
        
        const restante = valorTotal - totalPago;

        if (restante > 0) {
            const cliente = dbState.clientes.find(c => c.id === contrato.clienteId) || { nome: 'Cliente?' };
            const evento = dbState.eventos.find(e => e.id === contrato.eventoId) || { nome: 'Evento?', data: '1970-01-01' };
            
            pendencias.push({
                contratoId: contrato.id,
                clienteNome: cliente.nome,
                eventoNome: evento.nome,
                dataEvento: evento.data,
                restante: restante
            });
        }
    });

    pendencias.sort((a, b) => new Date(a.dataEvento) - new Date(b.dataEvento));

    if (pendencias.length === 0) {
        lista.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Nenhum pagamento pendente!</td></tr>';
        return;
    }

    lista.innerHTML = pendencias.map(item => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3">${item.clienteNome}</td>
            <td class="p-3">${item.eventoNome}</td>
            <td class="p-3 font-medium text-red-600">R$ ${item.restante.toFixed(2).replace('.', ',')}</td>
            <td class="p-3 flex gap-2">
                <button onclick="window.app.openAddPaymentModal('${item.contratoId}')" class="text-green-500 hover:text-green-700" title="Adicionar Pagamento">
                    <i data-lucide="plus-circle" class="w-5 h-5"></i>
                </button>
                <button onclick="window.app.openDossieModal('${item.contratoId}')" class="text-blue-500 hover:text-blue-700" title="Ver Dossiê">
                    <i data-lucide="eye" class="w-5 h-5"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

export function renderFluxoDeCaixaChart(dbState) {
    const ctx = document.getElementById('fluxo-caixa-chart');
    if (!ctx) return; 

    const labels = [];
    const receitasData = new Array(12).fill(0);
    const custosData = new Array(12).fill(0);
    
    const hoje = new Date();
    hoje.setDate(1); 

    for (let i = 11; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        labels.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
    }

    const dataLimiteInferior = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
    
    dbState.financeiro.forEach(item => {
        if (!item.data) return;
        const dataPagamento = new Date(item.data + 'T00:00:00');
        
        if (dataPagamento >= dataLimiteInferior) {
            const mesDiff = (dataPagamento.getFullYear() - hoje.getFullYear()) * 12 + (dataPagamento.getMonth() - hoje.getMonth());
            const index = 11 + mesDiff; 
            
            if (index >= 0 && index < 12) {
                receitasData[index] += parseFloat(item.valor || 0);
            }
        }
    });

    dbState.custos.forEach(item => {
        if (!item.data) return;
        const dataCusto = new Date(item.data + 'T00:00:00');
        
        if (dataCusto >= dataLimiteInferior) {
            const mesDiff = (dataCusto.getFullYear() - hoje.getFullYear()) * 12 + (dataCusto.getMonth() - hoje.getMonth());
            const index = 11 + mesDiff;
            
            if (index >= 0 && index < 12) {
                custosData[index] += parseFloat(item.valor || 0);
            }
        }
    });

    if (myFluxoChart) {
        myFluxoChart.destroy();
    }

    myFluxoChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Recebido (R$)',
                    data: receitasData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)', 
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Custos (R$)',
                    data: custosData,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)', 
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += 'R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// --- 3. RENDERIZAÇÃO DO CALENDÁRIO ---

export function renderCalendario(calendarioData, dbState) {
    const dataBase = new Date(calendarioData.getFullYear(), calendarioData.getMonth(), 1);
    const mesAnoEl = document.getElementById('calendario-mes-ano');
    const gridEl = document.getElementById('calendario-grid');
    
    const mes = dataBase.getMonth();
    const ano = dataBase.getFullYear();
    
    mesAnoEl.textContent = dataBase.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    }).replace(/^\w/, c => c.toUpperCase()); 

    const primeiroDiaSemana = dataBase.getDay();
    const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
    
    gridEl.innerHTML = '';
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    for (let i = 0; i < primeiroDiaSemana; i++) {
        gridEl.innerHTML += `<div class="calendar-day empty h-36"></div>`;
    }

    for (let dia = 1; dia <= ultimoDiaMes; dia++) {
        const dataAtual = new Date(ano, mes, dia);
        let todayClass = dataAtual.getTime() === hoje.getTime() ? 'today' : '';
        
        const dataFormatada = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        
        const eventosDoDia = dbState.eventos.filter(evento => {
            if (!evento.data) return false;
            const dataEvento = new Date(evento.data + 'T00:00:00');
            return dataEvento.getTime() === dataAtual.getTime();
        });

        let eventosHtml = eventosDoDia.map(evento => {
            let eventColorClass = 'bg-blue-100 text-blue-800';
            switch(evento.tipo) {
                case 'Casamento': eventColorClass = 'bg-pink-100 text-pink-800'; break;
                case 'Infantil': eventColorClass = 'bg-yellow-100 text-yellow-800'; break;
                case 'Corporativo': eventColorClass = 'bg-indigo-100 text-indigo-800'; break;
                case 'Ensaio': eventColorClass = 'bg-teal-100 text-teal-800'; break;
                case 'Evento Adulto': eventColorClass = 'bg-purple-100 text-purple-800'; break;
            }
            return `<span class="calendar-event ${eventColorClass}" title="${evento.nome}">${evento.nome}</span>`;
        }).join('');

        gridEl.innerHTML += `
            <div class="calendar-day ${todayClass} h-36 cursor-pointer hover:bg-gray-50 overflow-y-auto" onclick="window.app.abrirNovoEventoDoCalendario('${dataFormatada}')">
                <div class="day-number">${dia}</div>
                <div class="mt-1 space-y-1">${eventosHtml}</div>
            </div>
        `;
    }

    const totalCelulas = primeiroDiaSemana + ultimoDiaMes;
    const celulasRestantes = (7 - (totalCelulas % 7)) % 7;
    for (let i = 0; i < celulasRestantes; i++) {
        gridEl.innerHTML += `<div class="calendar-day empty h-36"></div>`;
    }
}

export function mudarMes(offset, calendarioData, dbState) {
    calendarioData.setMonth(calendarioData.getMonth() + offset);
    renderCalendario(calendarioData, dbState); 
}


// --- 4. POPULAÇÃO DE SELECTS ---

function populateSelectWithOptions(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const selectedValue = select.value; 
    select.innerHTML = options.header; 
    options.data.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.nome;
        select.appendChild(option);
    });
    select.value = selectedValue; 
}

export function populateEventoClienteSelect(dbState) {
    populateSelectWithOptions('evento-cliente', {
        header: '<option value="">Selecione o Cliente</option>', 
        data: dbState.clientes
    });
}

export function populateEventoSelect(dbState) {
    populateSelectWithOptions('custo-evento', { 
        header: '<option value="">Custo Fixo / Nenhum Evento</option>', 
        data: dbState.eventos 
    });
}

export function populateCustoFotografoSelect(dbState) {
    populateSelectWithOptions('custo-fotografo', { 
        header: '<option value="">Selecione o Fotógrafo (Opcional)</option>', 
        data: dbState.fotografos 
    });
}

export function populateContratoClienteSelect(dbState) {
    populateSelectWithOptions('contrato-cliente', {
        header: '<option value="">Selecione o Cliente</option>', 
        data: dbState.clientes
    });
}

export function updateContratoEventoSelect(clienteId, dbState) {
    let eventosFiltrados = [];
    let header = '<option value="">Selecione o Evento (escolha o cliente primeiro)</option>';

    if (clienteId) {
        eventosFiltrados = dbState.eventos.filter(e => e.clienteId === clienteId);
        if (eventosFiltrados.length === 0) {
            header = '<option value="">Nenhum evento encontrado para este cliente</option>';
        } else {
            header = '<option value="">Selecione o Evento</option>';
        }
    }
    
    populateSelectWithOptions('contrato-evento', {
        header: header,
        data: eventosFiltrados
    });
}

export function populateEntregaEventoSelect(dbState, selectedEventIdForEntrega) {
    const select = document.getElementById('entrega-evento-select');
    if (!select) return;
    select.innerHTML = '<option value="">Ver todos os atrasos (Padrão)</option>';
    dbState.eventos.forEach(evento => {
        const cliente = dbState.clientes.find(c => c.id === evento.clienteId);
        const nomeCliente = cliente ? `(${cliente.nome})` : '';
        const option = document.createElement('option');
        option.value = evento.id;
        option.textContent = `${evento.nome} ${nomeCliente}`;
        select.appendChild(option);
    });
    select.value = selectedEventIdForEntrega || "";
}

// --- FUNÇÕES DE MODAL ---

// js/ui.js

// ... (Mantenha todo o código anterior até chegar na função showSection) ...

// --- FUNÇÕES DE NAVEGAÇÃO E MODAL ---

export function showSection(sectionId, dbState, calendarioData) {
    // 1. Esconde todas as seções
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    
    // 2. Mostra a seção desejada
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
        
        // --- LÓGICA DE CARREGAMENTO ESPECÍFICO POR ABA ---
        
        // Se for Calendário, renderiza o grid
        if (sectionId === 'section-calendario' && calendarioData) {
            renderCalendario(calendarioData, dbState);
        }
        
        // NOVO: Se for Financeiro, força a renderização das tabelas e gráficos
        if (sectionId === 'section-financeiro') {
            console.log("Atualizando dados financeiros...");
            renderContasAReceber(dbState);
            renderFluxoDeCaixaChart(dbState);
            // Também garantimos que as listas principais estejam atualizadas
            renderFinanceiro(dbState);
            renderCustos(dbState);
        }

        // Se for Entregas, também é bom garantir
        if (sectionId === 'section-entrega') {
            const select = document.getElementById('entrega-evento-select');
            // Se tiver evento selecionado, renderiza cards, senão renderiza atrasos
            if (select && select.value) {
                const evento = dbState.eventos.find(e => e.id === select.value);
                renderEntregaCards(evento, dbState);
            } else {
                renderEntregasAtrasadas(dbState);
            }
        }
    }
}

// ... (Mantenha o resto do arquivo igual: openAddPaymentModal, openDossieModal, etc...) ...
export function openAddPaymentModal(contratoId = null) {
    document.getElementById('modal-add-payment').classList.remove('hidden');
    document.getElementById('add-payment-form').reset();
    document.getElementById('payment-date').valueAsDate = new Date();
    
    if (contratoId) {
        document.getElementById('payment-contrato-id').value = contratoId;
    }
}

export function closeAddPaymentModal() {
    document.getElementById('modal-add-payment').classList.add('hidden');
}

export function openDossieModal(contratoId, dbState) {
    const contrato = dbState.contratos.find(c => c.id === contratoId);
    if (!contrato) return;
    
    const cliente = dbState.clientes.find(c => c.id === contrato.clienteId);
    const evento = dbState.eventos.find(e => e.id === contrato.eventoId);
    const pagamentos = dbState.financeiro.filter(p => p.contratoId === contratoId);

    document.getElementById('dossie-cliente-nome').innerText = cliente ? cliente.nome : '---';
    document.getElementById('dossie-evento-nome').innerText = evento ? evento.nome : '---';
    document.getElementById('dossie-evento-data').innerText = evento && evento.data ? new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR') : '---';
    document.getElementById('dossie-contrato-status').innerText = contrato.status;
    document.getElementById('dossie-contrato-valor').innerText = `R$ ${(parseFloat(contrato.valorTotal) || 0).toFixed(2).replace('.', ',')}`;

    const listaPag = document.getElementById('dossie-lista-pagamentos');
    listaPag.innerHTML = pagamentos.length === 0 
        ? '<p class="text-gray-500">Nenhum pagamento registrado.</p>' 
        : pagamentos.map(p => `<div class="flex justify-between border-b py-1"><span>${new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span><span>R$ ${parseFloat(p.valor).toFixed(2).replace('.', ',')}</span></div>`).join('');
        
    const totalPago = pagamentos.reduce((acc, p) => acc + parseFloat(p.valor), 0);
    const restante = parseFloat(contrato.valorTotal) - totalPago;
    
    document.getElementById('dossie-total-pago').innerText = `R$ ${totalPago.toFixed(2).replace('.', ',')}`;
    document.getElementById('dossie-restante').innerText = `R$ ${restante.toFixed(2).replace('.', ',')}`;
    
    const restanteEl = document.getElementById('dossie-restante');
    if (restante > 0) restanteEl.classList.add('text-red-600');
    else restanteEl.classList.remove('text-red-600');

    document.getElementById('modal-dossie').classList.remove('hidden');
}

export function closeDossieModal() {
    document.getElementById('modal-dossie').classList.add('hidden');
}

export function openDossieModalFromEvento(eventoId, dbState) {
    const contrato = dbState.contratos.find(c => c.eventoId === eventoId);
    if (contrato) {
        openDossieModal(contrato.id, dbState);
    } else {
        alert("Nenhum contrato encontrado para este evento.");
    }
}

export function abrirNovoEventoDoCalendario(dataString) {
    showSection('section-eventos'); 
    document.getElementById('evento-data').value = dataString;
    document.getElementById('evento-nome').focus();
}

export function openEditContratoModal(contratoId, dbState) {
    const contrato = dbState.contratos.find(c => c.id === contratoId);
    if (!contrato) return;

    document.getElementById('edit-contrato-id').value = contrato.id;
    
    // Preenche Valor
    document.getElementById('edit-contrato-valor').value = contrato.valorTotal || 0;
    
    // NOVO: Preenche Histórico (ou vazio se não existir)
    document.getElementById('edit-contrato-historico').value = contrato.historico_valores || '';
    
    document.getElementById('edit-contrato-status').value = contrato.status;
    document.getElementById('edit-contrato-link').value = contrato.link || '';
    document.getElementById('edit-contrato-forma-pagamento').value = contrato.formaPagamento || '';

    document.getElementById('modal-edit-contrato').classList.remove('hidden');
}
export function closeEditContratoModal() {
    document.getElementById('modal-edit-contrato').classList.add('hidden');
}

export function abrirGerador(contratoId, dbState) {
    showSection('section-gerador');
    console.log("Abrindo gerador para contrato:", contratoId);
}

export function viewEntregaFromAtraso(eventId, dbState) {
    const select = document.getElementById('entrega-evento-select');
    if(select) {
        select.value = eventId;
        select.dispatchEvent(new Event('change'));
    }
}

// --- FUNÇÕES DE TEMPLATE E PACOTE ---

export function populateTemplateForm(template) {
    document.getElementById('template-id').value = template.id;
    document.getElementById('template-titulo').value = template.titulo;
    document.getElementById('template-link-tipo').value = template.link_tipo || 'geral';
    // O select de pacote precisa ser atualizado primeiro, depois setado o valor
    const event = new Event('change');
    document.getElementById('template-link-tipo').dispatchEvent(event);
    
    // Pequeno timeout para garantir que o select foi populado
    setTimeout(() => {
        document.getElementById('template-link-pacote').value = template.link_pacote || '';
    }, 100);

    const corpoDiv = document.getElementById('template-corpo');
    if (corpoDiv) corpoDiv.innerHTML = template.corpo;
}

export function clearTemplateForm() {
    document.getElementById('form-template').reset();
    document.getElementById('template-id').value = "";
    document.getElementById('template-corpo').innerHTML = "";
}

export function renderTemplates(dbState) {
    const lista = document.getElementById('lista-templates');
    if (!lista) return;

    if (!dbState.templates || dbState.templates.length === 0) {
        lista.innerHTML = '<p class="text-gray-500">Nenhum template cadastrado.</p>';
        return;
    }

    lista.innerHTML = dbState.templates.map(t => `
        <div class="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
                <h4 class="font-bold">${t.titulo}</h4>
                <p class="text-xs text-gray-500">Vínculo: ${t.link_tipo || 'Geral'}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="window.app.editTemplate('${t.id}')" class="text-blue-500 hover:text-blue-700">
                    <i data-lucide="edit-3" class="w-5 h-5"></i>
                </button>
                <button onclick="window.app.deleteItem('templates', '${t.id}')" class="text-red-500 hover:text-red-700">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    if (window.lucide) window.lucide.createIcons();
}

export function renderPacotes(dbState) {
    const container = document.getElementById('lista-pacotes');
    if (!container) return;

    if (!dbState.pacotes || dbState.pacotes.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum pacote cadastrado.</p>';
        return;
    }

    // Agrupa pacotes por categoria
    const categories = {};
    dbState.pacotes.forEach(p => {
        const cat = p.package_category_name || 'Sem Categoria';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(p);
    });

    // Renderiza
    container.innerHTML = Object.keys(categories).sort().map(categoryName => {
        const items = categories[categoryName];
        
        const itemsHtml = items.map(pacote => {
            const valor = (pacote.package_value || 0).toFixed(2).replace('.', ',');
            return `
                <div class="flex justify-between items-center bg-white p-2 mb-1 rounded border border-gray-100 hover:shadow-sm transition-shadow">
                    <div>
                        <span class="font-semibold text-gray-800 text-sm">${pacote.package_name}</span>
                        <span class="text-xs text-green-600 font-bold ml-2">R$ ${valor}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.app.editPacote('${pacote.id}')" class="text-blue-500 hover:text-blue-700" title="Editar">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.app.deleteItem('pacotes', '${pacote.id}')" class="text-red-500 hover:text-red-700" title="Excluir">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <h3 class="text-lg font-bold text-gray-900 bg-gray-50 p-3 border-b">${categoryName}</h3>
                <div class="p-2 bg-gray-50/50 space-y-1">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}

export function populatePacoteForm(pacote) {
    document.getElementById('pacote-id').value = pacote.id;
    document.getElementById('pacote-tipo-vinculo').value = pacote.package_category_id || '';
    document.getElementById('pacote-nome').value = pacote.package_name || '';
    document.getElementById('pacote-valor').value = pacote.package_value || 0;
}

export function clearPacoteForm() {
    document.getElementById('form-pacote').reset();
    document.getElementById('pacote-id').value = "";
}

export function updatePackageSelect(selectElementId, categoryId, dbState) {
    const select = document.getElementById(selectElementId);
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um Pacote...</option>';

    if (!categoryId || !dbState.pacotes) return;

    const pacotesFiltrados = dbState.pacotes.filter(p => p.package_category_id === categoryId);

    pacotesFiltrados.forEach(pacote => {
        const option = document.createElement('option');
        option.value = pacote.package_name; 
        const valorFormatado = (pacote.package_value || 0).toFixed(2).replace('.', ',');
        option.textContent = `${pacote.package_name} (R$ ${valorFormatado})`;
        option.dataset.valor = pacote.package_value;
        select.appendChild(option);
    });
}


// --- 5. LÓGICA DE UI DA SEÇÃO "ENTREGA" (ATUALIZADA) ---

// Renderiza a caixa de configuração no topo da seção de entrega
export function renderConfigPrazos(dbState) {
    // Procura o container de config ou cria um
    const section = document.getElementById('section-entrega');
    let configContainer = document.getElementById('entrega-config-container');
    
    if (!configContainer) {
        configContainer = document.createElement('div');
        configContainer.id = 'entrega-config-container';
        configContainer.className = 'bg-blue-50 p-4 rounded-lg shadow-sm mb-6 border border-blue-100';
        
        // Insere logo após o título h1
        const h1 = section.querySelector('h1');
        h1.parentNode.insertBefore(configContainer, h1.nextSibling);
    }

    // Pega configurações existentes (ou padrão)
    const config = (dbState.configuracoes && dbState.configuracoes.find(c => c.id === 'global_prazos')) || {};
    const diasPrevia = config.dias_previa || 3;
    const diasMidia = config.dias_midia || 60;
    const diasAlbum = config.dias_album || 180;

    configContainer.innerHTML = `
        <details>
            <summary class="cursor-pointer font-semibold text-blue-800 flex items-center gap-2">
                <i data-lucide="settings" class="w-4 h-4"></i> Configurar Prazos Padrão (Dias)
            </summary>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label class="block text-xs font-medium text-gray-700">Prévia</label>
                    <input type="number" id="cfg-dias-previa" value="${diasPrevia}" class="w-full p-2 border rounded text-sm">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700">Mídia (Fotos)</label>
                    <input type="number" id="cfg-dias-midia" value="${diasMidia}" class="w-full p-2 border rounded text-sm">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700">Álbum</label>
                    <input type="number" id="cfg-dias-album" value="${diasAlbum}" class="w-full p-2 border rounded text-sm">
                </div>
                <button onclick="
                    const p = document.getElementById('cfg-dias-previa').value;
                    const m = document.getElementById('cfg-dias-midia').value;
                    const a = document.getElementById('cfg-dias-album').value;
                    window.app.saveConfigPrazos({ dias_previa: p, dias_midia: m, dias_album: a });
                " class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition">Salvar Padrões</button>
            </div>
        </details>
    `;
    if (window.lucide) window.lucide.createIcons();
}

export function getEntregaInfo(evento, tipo) {
    const dataEventoStr = evento.data;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (!dataEventoStr) {
        return { status: 'nodate', text: 'Data do evento não definida', deadline: 'N/A', bgColor: 'bg-gray-100', textColor: 'text-gray-500', diffDays: 99999, prazoDate: null };
    }

    const dataEvento = new Date(dataEventoStr + 'T00:00:00');
    let dataPrazo = new Date(dataEvento);
    let statusField, dataField, title, prazoField;

    // 1. Tenta pegar configurações globais do window.app
    let diasPadrao = 0;
    let config = {};
    if (window.app && window.app.getDbState) {
        const dbState = window.app.getDbState();
        config = (dbState.configuracoes && dbState.configuracoes.find(c => c.id === 'global_prazos')) || {};
    }

    if (tipo === 'previa') {
        diasPadrao = parseInt(config.dias_previa || 3);
        statusField = 'entrega_previa_status';
        dataField = 'entrega_previa_data';
        prazoField = 'prazo_previa';
        title = 'PRÉVIA';
    } else if (tipo === 'midia') {
        diasPadrao = parseInt(config.dias_midia || 60);
        statusField = 'entrega_midia_status';
        dataField = 'entrega_midia_data';
        prazoField = 'prazo_midia';
        title = 'FOTOS EM MÍDIA';
    } else if (tipo === 'album') {
        diasPadrao = parseInt(config.dias_album || 180);
        statusField = 'entrega_album_status';
        dataField = 'entrega_album_data';
        prazoField = 'prazo_album';
        title = 'ALBUM IMPRESSO';
    }

    // 2. Define a data base do prazo
    // Se o evento tiver um prazo ESPECÍFICO salvo, usa ele. Se não, usa o cálculo padrão.
    if (evento[prazoField]) {
        dataPrazo = new Date(evento[prazoField] + 'T00:00:00');
    } else {
        dataPrazo.setDate(dataEvento.getDate() + diasPadrao);
    }

    const prazoFormatado = dataPrazo.toLocaleDateString('pt-BR');
    const prazoISO = dataPrazo.toISOString().split('T')[0]; // Para o input type="date"
    const diffTime = dataPrazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (evento[statusField] === 'Entregue') {
        const dataEntrega = evento[dataField] ? new Date(evento[dataField]).toLocaleDateString('pt-BR') : '';
        return { 
            title, status: 'entregue', text: `Entregue em ${dataEntrega}`, 
            deadline: `Prazo: ${prazoFormatado}`, bgColor: 'bg-green-100', 
            textColor: 'text-green-800', diffDays: 99998,
            data: dataEntrega,
            prazoDate: prazoISO
        };
    }

    if (diffDays < 0) {
        return { 
            title, status: 'atrasado', text: `${Math.abs(diffDays)} dia(s) atrasado`, 
            deadline: `Prazo: ${prazoFormatado}`, bgColor: 'bg-red-100', 
            textColor: 'text-red-800', diffDays: diffDays,
            data: null, prazoDate: prazoISO
        };
    }
    if (diffDays === 0) {
        return { 
            title, status: 'hoje', text: 'Vence Hoje', 
            deadline: `Prazo: ${prazoFormatado}`, bgColor: 'bg-yellow-100', 
            textColor: 'text-yellow-800', diffDays: 0,
            data: null, prazoDate: prazoISO
        };
    }
    return { 
        title, status: 'pendente', text: `Vence em ${diffDays} dia(s)`, 
        deadline: `Prazo: ${prazoFormatado}`, bgColor: 'bg-blue-100', 
        textColor: 'text-blue-800', diffDays: diffDays,
        data: null, prazoDate: prazoISO
    };
}

export function renderEntregaCards(evento, dbState) {
    const container = document.getElementById('entrega-management-area');
    
    if (!evento) {
        container.innerHTML = '<p class="text-red-500">Erro: Evento não encontrado.</p>';
        return;
    }

    const tipos = ['previa', 'midia', 'album'];
    container.innerHTML = tipos.map(tipo => {
        const info = getEntregaInfo(evento, tipo);
        
        // Botão principal (Alterna entre Entregue e Pendente)
        const buttonHtml = info.status === 'entregue'
            ? `<div class="flex gap-2">
                 <button class="w-full bg-green-500 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-default">
                    <i data-lucide="check-circle" class="w-5 h-5"></i> Entregue
                 </button>
                 <button onclick="window.app.reverterEntrega('${evento.id}', '${tipo}')" class="bg-gray-200 text-gray-600 px-3 rounded-lg hover:bg-gray-300" title="Desfazer entrega">
                    <i data-lucide="rotate-ccw" class="w-5 h-5"></i>
                 </button>
               </div>`
            : `<button onclick="window.app.marcarEntregue('${evento.id}', '${tipo}')" class="w-full bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                    Marcar como Entregue
               </button>`;
        
        // Input para mudar a data do prazo
        const dateInputHtml = `
            <div class="mt-2 text-xs">
                <label class="block text-gray-500 mb-1">Alterar Prazo:</label>
                <input type="date" value="${info.prazoDate || ''}" 
                    onchange="window.app.updateEventoPrazo('${evento.id}', '${tipo}', this.value)"
                    class="bg-white/50 border border-black/10 rounded px-2 py-1 w-full text-gray-700 focus:outline-none focus:bg-white"
                >
            </div>
        `;

        return `
            <div class="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between ${info.bgColor} ${info.textColor}">
                <div>
                    <h3 class="text-xl font-bold text-gray-900">${info.title}</h3>
                    <p class="text-2xl font-bold mt-2">${info.text}</p>
                    <p class="text-sm text-gray-600 mt-1">${info.deadline}</p>
                    ${dateInputHtml}
                </div>
                <div class="mt-4">
                    ${buttonHtml}
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons(); 
}

export function renderEntregasAtrasadas(dbState) {
    const container = document.getElementById('entrega-atrasos-container');
    let atrasos = [];

    dbState.eventos.forEach(evento => {
        const tipos = ['previa', 'midia', 'album'];
        tipos.forEach(tipo => {
            const info = getEntregaInfo(evento, tipo);
            if (info.status === 'atrasado' || info.status === 'hoje') {
                atrasos.push({
                    evento: evento,
                    info: info
                });
            }
        });
    });

    atrasos.sort((a, b) => a.info.diffDays - b.info.diffDays);

    if (atrasos.length === 0) {
        container.innerHTML = `
            <div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow">
                <h3 class="font-bold">Tudo em dia!</h3>
                <p>Nenhuma entrega está atrasada ou vencendo hoje.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = atrasos.map(item => {
        const cliente = dbState.clientes.find(c => c.id === item.evento.clienteId);
        const nomeCliente = cliente ? cliente.nome : 'Cliente não encontrado';
        const { bgColor, textColor, title, text, deadline } = item.info;

        return `
            <div class="bg-white p-4 rounded-lg shadow-md flex items-center justify-between gap-4 ${bgColor} ${textColor}">
                <div class="flex-shrink-0 w-16 h-16 ${bgColor} rounded-lg flex items-center justify-center">
                    <i data-lucide="${item.info.status === 'atrasado' ? 'alert-triangle' : 'alert-circle'}" class="w-8 h-8"></i>
                </div>
                <div class="flex-grow">
                    <span class="text-xs font-semibold ${bgColor.replace('-100', '-800')} ${bgColor.replace('bg-', 'bg-').replace('-100', '-200')} px-2 py-0.5 rounded-full">${title}</span>
                    <h4 class="text-lg font-bold text-gray-900">${item.evento.nome}</h4>
                    <p class="text-sm text-gray-700">${nomeCliente}</p>
                </div>
                <div class="flex-shrink-0 text-right">
                    <p class="text-lg font-bold">${text}</p>
                    <p class="text-sm text-gray-600">${deadline}</p>
                </div>
                <div class="flex-shrink-0">
                    <button onclick="window.app.viewEntregaFromAtraso('${item.evento.id}')" class="bg-gray-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700">
                        Ver Evento
                    </button>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}
