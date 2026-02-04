import { safeSetText, safeSetHTML } from './utils.js';
import { getEntregaInfo } from './delivery.js';

export function populateDashboardYears(dbState) {
    const select = document.getElementById('dashboard-filtro-ano');
    if (!select) return;

    const valorSelecionadoAnteriormente = select.value;
    const anosEncontrados = new Set();

    const extrairAno = (dataStr) => {
        if (!dataStr || dataStr.length < 4) return;
        const ano = parseInt(dataStr.substring(0, 4));
        if (!isNaN(ano) && ano > 2000 && ano < 2100) {
            anosEncontrados.add(ano);
        }
    };

    if (dbState.eventos) dbState.eventos.forEach(e => extrairAno(e.data));
    if (dbState.financeiro) dbState.financeiro.forEach(f => extrairAno(f.data));
    if (dbState.custos) dbState.custos.forEach(c => extrairAno(c.data));
    if (dbState.contratos) {
        dbState.contratos.forEach(c => {
            if (c.dataContrato) extrairAno(c.dataContrato);
        });
    }

    select.innerHTML = '<option value="todos">Todo o Período (Geral)</option>';
    const anosOrdenados = Array.from(anosEncontrados).sort((a, b) => b - a);

    anosOrdenados.forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        select.appendChild(option);
    });

    select.value = valorSelecionadoAnteriormente;

    // Botão de Histórico (Adicionado dinamicamente)
    let historyContainer = document.getElementById('dashboard-history-container');
    if (!historyContainer) {
        historyContainer = document.createElement('div');
        historyContainer.id = 'dashboard-history-container';
        historyContainer.className = 'mt-2 text-right';
        select.parentNode.appendChild(historyContainer);
    }

    const minYear = Array.from(anosEncontrados).length > 0 ? Math.min(...anosEncontrados) : new Date().getFullYear();
    const prevYear = minYear - 1;

    historyContainer.innerHTML = `
        <button onclick="window.app.loadHistory(${prevYear})" class="text-xs text-blue-600 underline hover:text-blue-800 transition-colors">
            Carregar histórico de ${prevYear}
        </button>
    `;
}

export function updateDashboard(dbState) {
    const elAno = document.getElementById('dashboard-filtro-ano');
    const elMes = document.getElementById('dashboard-filtro-mes');
    const filtroAno = elAno ? elAno.value : 'todos';
    const filtroMes = elMes ? elMes.value : 'todos';

    const estaNoPeriodo = (dataStr) => {
        if (!dataStr) return false;
        if (filtroAno === 'todos') return true;
        const anoData = parseInt(dataStr.substring(0, 4));
        const mesData = parseInt(dataStr.substring(5, 7)) - 1;
        if (anoData !== parseInt(filtroAno)) return false;
        if (filtroMes !== 'todos' && mesData !== parseInt(filtroMes)) return false;
        return true;
    };

    const financeiroFiltrado = dbState.financeiro.filter(item => estaNoPeriodo(item.data));
    const custosFiltrados = dbState.custos.filter(item => estaNoPeriodo(item.data));
    const contratosFiltrados = dbState.contratos.filter(contrato => {
        if (contrato.status !== 'Assinado' && contrato.status !== 'Concluído') return false;
        let dataRef = contrato.dataContrato;
        if (!dataRef) {
            const evento = dbState.eventos.find(e => e.id === contrato.eventoId);
            if (evento) dataRef = evento.data;
        }
        return estaNoPeriodo(dataRef);
    });

    const totalPago = financeiroFiltrado.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
    const totalCustos = custosFiltrados.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
    const totalContratado = contratosFiltrados.reduce((acc, c) => acc + (parseFloat(c.valorTotal) || 0), 0);
    const lucroLiquido = totalPago - totalCustos;

    let totalPagoDosContratosFiltrados = 0;
    contratosFiltrados.forEach(c => {
        const pags = dbState.financeiro.filter(p => p.contratoId === c.id);
        totalPagoDosContratosFiltrados += pags.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
    });
    const totalPendente = totalContratado - totalPagoDosContratosFiltrados;

    safeSetText('total-pendente', `R$ ${totalPendente.toFixed(2).replace('.', ',')}`);
    safeSetText('db-contratos-mes', `R$ ${totalContratado.toFixed(2).replace('.', ',')}`);

    const labelPeriodo = filtroAno === 'todos' ? '(Geral)' : `(${filtroAno})`;
    const cardContratosTitulo = document.querySelector('#db-contratos-mes')?.previousElementSibling;
    if (cardContratosTitulo) cardContratosTitulo.innerText = `Contratos Fechados ${labelPeriodo}`;

    safeSetText('total-custos', `R$ ${totalCustos.toFixed(2).replace('.', ',')}`);

    const lucroEl = document.getElementById('lucro-liquido');
    if (lucroEl) {
        lucroEl.innerText = `R$ ${lucroLiquido.toFixed(2).replace('.', ',')}`;
        lucroEl.classList.toggle('text-red-600', lucroLiquido < 0);
        lucroEl.classList.toggle('text-gray-800', lucroLiquido >= 0);
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let entregasCriticasCount = 0;
    const tiposEntrega = dbState.tipos_entrega && dbState.tipos_entrega.length > 0
        ? dbState.tipos_entrega
        : [{ id: 'previa', titulo: 'PRÉVIA' }, { id: 'midia', titulo: 'MÍDIA' }, { id: 'album', titulo: 'ÁLBUM' }];

    dbState.eventos.forEach(evento => {
        tiposEntrega.forEach(tipo => {
            const info = getEntregaInfo(evento, tipo, dbState);
            if (info.status === 'atrasado' || info.status === 'hoje') entregasCriticasCount++;
        });
    });
    safeSetText('db-entregas-criticas', entregasCriticasCount);

    const eventosFuturos = dbState.eventos
        .filter(evento => evento.data && new Date(evento.data + 'T00:00:00') >= hoje)
        .sort((a, b) => new Date(a.data) - new Date(b.data))
        .slice(0, 5);

    let htmlFuturos = eventosFuturos.length === 0 ? '<p class="text-gray-500">Nenhum evento futuro.</p>' : eventosFuturos.map(evento => {
        const dataFormatada = new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const cliente = dbState.clientes.find(c => c.id === evento.clienteId);
        return `<div class="border-b border-gray-100 pb-2"><p class="font-semibold text-gray-800">${evento.nome}</p><p class="text-sm text-gray-600">${cliente ? cliente.nome : 'Cliente'} - <strong>${dataFormatada}</strong></p></div>`;
    }).join('');
    safeSetHTML('dashboard-proximos-eventos', htmlFuturos);

    const eventosPassados = dbState.eventos
        .filter(evento => evento.data && new Date(evento.data + 'T00:00:00') < hoje)
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .slice(0, 5);

    let htmlPassados = eventosPassados.length === 0 ? '<p class="text-gray-500">Nenhum evento passado.</p>' : eventosPassados.map(evento => {
        // Dinamico: Mostra status de todas as entregas configuradas
        const statusHtml = tiposEntrega.map(tipo => {
            const info = getEntregaInfo(evento, tipo, dbState);
            const color = info.status === 'entregue' ? 'text-green-600' : (info.status === 'atrasado' ? 'text-red-600' : 'text-blue-600');
            return `<p><strong>${tipo.titulo}:</strong> <span class="font-medium ${color}">${info.text}</span></p>`;
        }).join('');

        const dataFormatada = new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR');
        return `<div class="border-b border-gray-100 pb-3"><p class="font-semibold text-gray-800">${evento.nome} <span class="text-sm text-gray-500">(${dataFormatada})</span></p><div class="text-sm space-y-1 mt-1 pl-2">${statusHtml}</div></div>`;
    }).join('');
    safeSetHTML('dashboard-ultimos-eventos', htmlPassados);
}
