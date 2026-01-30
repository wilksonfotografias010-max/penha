import { safeSetText } from './utils.js';

let myFluxoChart = null;

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
                <td class="p-4"><button onclick="window.app.deleteItem('financeiro', '${pagamento.id}')" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-5 h-5"></i></button></td>
            </tr>`;
        }).join('');
}

export function renderCustos(dbState) {
    const lista = document.getElementById('lista-custos');
    lista.innerHTML = dbState.custos.length === 0
        ? '<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum custo cadastrado.</td></tr>'
        : dbState.custos.map(item => {
            const evento = item.eventoId ? dbState.eventos.find(e => e.id === item.eventoId) : null;
            const fotografo = dbState.fotografos.find(f => f.id === item.fotografoId);
            const valor = parseFloat(item.valor) || 0;
            const dataFormatada = item.data ? new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data';
            const isPendente = item.status === 'Pendente';
            const isRecorrente = item.repetir === true;

            let statusHtml = isPendente
                ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><i data-lucide="clock" class="w-3 h-3 mr-1"></i> Pendente</span>`
                : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><i data-lucide="check" class="w-3 h-3 mr-1"></i> Pago</span>`;

            const btnRecorrencia = `<button onclick="window.app.toggleRecorrencia('${item.id}', ${!isRecorrente})" class="ml-2 p-1 rounded hover:bg-gray-200 ${isRecorrente ? 'text-blue-600' : 'text-gray-400'}" title="${isRecorrente ? 'Desativar repetição' : 'Ativar repetição'}"><i data-lucide="repeat" class="w-4 h-4"></i></button>`;
            const btnConfirmar = isPendente ? `<button onclick="window.app.confirmarCusto('${item.id}')" class="text-green-600 hover:text-green-800 mr-2" title="Confirmar Pagamento"><i data-lucide="check-circle-2" class="w-5 h-5"></i></button>` : '';

            return `<tr class="border-b hover:bg-gray-50 ${isPendente ? 'bg-yellow-50/50' : ''}">
                <td class="p-4">${dataFormatada}</td>
                <td class="p-4 font-medium">${item.descricao}</td>
                <td class="p-4 text-sm text-gray-600">${evento ? evento.nome : 'Custo Fixo'} ${fotografo ? `(${fotografo.nome})` : ''}</td>
                <td class="p-4 font-bold text-gray-700">R$ ${valor.toFixed(2).replace('.', ',')}</td>
                <td class="p-4 flex items-center">${statusHtml}${btnRecorrencia}</td>
                <td class="p-4"><div class="flex items-center">${btnConfirmar}<button onclick="window.app.deleteItem('custos', '${item.id}')" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-5 h-5"></i></button></div></td>
            </tr>`;
        }).join('');
    if (window.lucide) window.lucide.createIcons();
}

export function populateRelatorioYears(dbState) {
    const select = document.getElementById('relatorio-ano');
    if (!select) return;
    const anos = new Set();
    const add = (d) => { if (d) anos.add(new Date(d + 'T00:00:00').getFullYear()); };
    dbState.financeiro.forEach(i => add(i.data));
    dbState.custos.forEach(i => add(i.data));
    anos.add(new Date().getFullYear());
    const valorAtual = select.value;
    select.innerHTML = '';
    Array.from(anos).sort((a, b) => b - a).forEach(ano => {
        const opt = document.createElement('option');
        opt.value = ano;
        opt.textContent = ano;
        select.appendChild(opt);
    });
    if (valorAtual && anos.has(parseInt(valorAtual))) select.value = valorAtual;
    else select.value = new Date().getFullYear();
}

export function populateRelatorioVendedores(dbState) {
    const select = document.getElementById('relatorio-vendedor');
    if (!select) return;
    const valorAtual = select.value;

    select.innerHTML = '<option value="todos">Geral (Todos)</option>';

    if (dbState.vendedores) {
        dbState.vendedores.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = v.nome;
            select.appendChild(opt);
        });
    }

    if (valorAtual) select.value = valorAtual;
}

export function renderRelatorioBalanco(dbState) {
    const elAno = document.getElementById('relatorio-ano');
    const elMes = document.getElementById('relatorio-mes');
    const elVend = document.getElementById('relatorio-vendedor');

    if (!elAno || !elMes) return;

    const ano = parseInt(elAno.value);
    const mes = parseInt(elMes.value);
    const vendedorId = elVend ? elVend.value : 'todos';

    const checkVendedor = (tipo, item) => {
        if (vendedorId === 'todos') return true;

        let eventoId = null;

        if (tipo === 'entrada') {
            const contrato = dbState.contratos.find(c => c.id === item.contratoId);
            if (contrato) eventoId = contrato.eventoId;
        } else {
            eventoId = item.eventoId;
        }

        if (!eventoId) return false;

        const evento = dbState.eventos.find(e => e.id === eventoId);
        return evento && evento.vendedorId === vendedorId;
    };

    const entradas = dbState.financeiro.filter(item => {
        if (!item.data) return false;
        const d = new Date(item.data + 'T00:00:00');
        return d.getFullYear() === ano && d.getMonth() === mes && checkVendedor('entrada', item);
    }).sort((a, b) => new Date(a.data) - new Date(b.data));

    const saidas = dbState.custos.filter(item => {
        if (!item.data) return false;
        const d = new Date(item.data + 'T00:00:00');
        return d.getFullYear() === ano && d.getMonth() === mes && checkVendedor('saida', item);
    }).sort((a, b) => new Date(a.data) - new Date(b.data));

    const totalEntradas = entradas.reduce((acc, i) => acc + (parseFloat(i.valor) || 0), 0);
    const totalSaidas = saidas.reduce((acc, i) => acc + (parseFloat(i.valor) || 0), 0);
    const saldo = totalEntradas - totalSaidas;

    safeSetText('relatorio-total-receitas', `R$ ${totalEntradas.toFixed(2).replace('.', ',')}`);
    safeSetText('relatorio-total-despesas', `R$ ${totalSaidas.toFixed(2).replace('.', ',')}`);
    const elSaldo = document.getElementById('relatorio-saldo');
    if (elSaldo) {
        elSaldo.innerText = `R$ ${saldo.toFixed(2).replace('.', ',')}`;
        elSaldo.classList.remove('text-green-600', 'text-red-600', 'text-gray-800');
        if (saldo > 0) elSaldo.classList.add('text-green-600');
        else if (saldo < 0) elSaldo.classList.add('text-red-600');
        else elSaldo.classList.add('text-gray-800');
    }

    const tbodyEntradas = document.getElementById('relatorio-lista-entradas');
    if (entradas.length === 0) {
        tbodyEntradas.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500">Nenhuma entrada encontrada.</td></tr>';
    } else {
        tbodyEntradas.innerHTML = entradas.map(item => {
            const dia = new Date(item.data + 'T00:00:00').getDate();
            const cliente = dbState.clientes.find(c => {
                const contrato = dbState.contratos.find(ct => ct.id === item.contratoId);
                return contrato && contrato.clienteId === c.id;
            });
            const nome = cliente ? cliente.nome : 'Pagamento Avulso';
            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 text-gray-600">${dia}</td>
                    <td class="p-3 font-medium">${nome} <span class="text-xs text-gray-400">(${item.metodo})</span></td>
                    <td class="p-3 text-right text-green-600 font-bold">R$ ${parseFloat(item.valor).toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        }).join('');
    }

    const tbodySaidas = document.getElementById('relatorio-lista-saidas');
    if (saidas.length === 0) {
        tbodySaidas.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500">Nenhuma despesa encontrada.</td></tr>';
    } else {
        tbodySaidas.innerHTML = saidas.map(item => {
            const dia = new Date(item.data + 'T00:00:00').getDate();
            const isPendente = item.status === 'Pendente';
            const classeValor = isPendente ? 'text-yellow-600' : 'text-red-600';
            const iconStatus = isPendente ? '<i data-lucide="clock" class="w-3 h-3 inline"></i>' : '';
            return `
                <tr class="border-b hover:bg-gray-50 ${isPendente ? 'bg-yellow-50' : ''}">
                    <td class="p-3 text-gray-600">${dia}</td>
                    <td class="p-3 font-medium">${item.descricao} ${iconStatus}</td>
                    <td class="p-3 text-right ${classeValor} font-bold">R$ ${parseFloat(item.valor).toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        }).join('');
    }
    if (window.lucide) window.lucide.createIcons();
}

export function renderContasAReceber(dbState) {
    const lista = document.getElementById('lista-contas-a-receber');
    if (!lista) return;
    let pendencias = [];
    dbState.contratos.forEach(contrato => {
        if (contrato.status === 'Cancelado' || contrato.status === 'Proposta') return;
        const valorTotal = parseFloat(contrato.valorTotal || 0);
        const totalPago = dbState.financeiro.filter(p => p.contratoId === contrato.id).reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
        const restante = valorTotal - totalPago;
        if (restante > 0) {
            const cliente = dbState.clientes.find(c => c.id === contrato.clienteId) || { nome: 'Cliente?' };
            const evento = dbState.eventos.find(e => e.id === contrato.eventoId) || { nome: 'Evento?', data: '1970-01-01' };
            pendencias.push({ contratoId: contrato.id, clienteNome: cliente.nome, eventoNome: evento.nome, dataEvento: evento.data, restante: restante });
        }
    });
    pendencias.sort((a, b) => new Date(a.dataEvento) - new Date(b.dataEvento));
    if (pendencias.length === 0) { lista.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Nenhum pagamento pendente!</td></tr>'; return; }
    lista.innerHTML = pendencias.map(item => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3">${item.clienteNome}</td>
            <td class="p-3">${item.eventoNome}</td>
            <td class="p-3 font-medium text-red-600">R$ ${item.restante.toFixed(2).replace('.', ',')}</td>
            <td class="p-3 flex gap-2">
                <button onclick="window.app.openAddPaymentModal('${item.contratoId}')" class="text-green-500 hover:text-green-700" title="Adicionar"><i data-lucide="plus-circle" class="w-5 h-5"></i></button>
                <button onclick="window.app.openDossieModal('${item.contratoId}')" class="text-blue-500 hover:text-blue-700" title="Ver Dossiê"><i data-lucide="eye" class="w-5 h-5"></i></button>
            </td>
        </tr>`).join('');
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
            if (index >= 0 && index < 12) receitasData[index] += parseFloat(item.valor || 0);
        }
    });
    dbState.custos.forEach(item => {
        if (!item.data) return;
        const dataCusto = new Date(item.data + 'T00:00:00');
        if (dataCusto >= dataLimiteInferior) {
            const mesDiff = (dataCusto.getFullYear() - hoje.getFullYear()) * 12 + (dataCusto.getMonth() - hoje.getMonth());
            const index = 11 + mesDiff;
            if (index >= 0 && index < 12) custosData[index] += parseFloat(item.valor || 0);
        }
    });

    if (myFluxoChart) myFluxoChart.destroy();

    // Check if Chart is available
    if (typeof Chart !== 'undefined') {
        myFluxoChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Recebido (R$)', data: receitasData, backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 },
                    { label: 'Custos (R$)', data: custosData, backgroundColor: 'rgba(239, 68, 68, 0.7)', borderColor: 'rgba(239, 68, 68, 1)', borderWidth: 1 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: function (value) { return 'R$ ' + value.toLocaleString('pt-BR'); } } } } }
        });
    }
}
