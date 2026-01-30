export function renderConfigPrazos(dbState) {
    const section = document.getElementById('section-entrega');
    let configContainer = document.getElementById('entrega-config-container');
    if (!configContainer) {
        configContainer = document.createElement('div');
        configContainer.id = 'entrega-config-container';
        configContainer.className = 'bg-blue-50 p-4 rounded-lg shadow-sm mb-6 border border-blue-100';
        const h1 = section.querySelector('h1');
        h1.parentNode.insertBefore(configContainer, h1.nextSibling);
    }
    const config = (dbState.configuracoes && dbState.configuracoes.find(c => c.id === 'global_prazos')) || {};
    const diasPrevia = config.dias_previa || 3;
    const diasMidia = config.dias_midia || 60;
    const diasAlbum = config.dias_album || 180;

    configContainer.innerHTML = `
        <details>
            <summary class="cursor-pointer font-semibold text-blue-800 flex items-center gap-2"><i data-lucide="settings" class="w-4 h-4"></i> Configurar Prazos Padrão (Dias)</summary>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div><label class="block text-xs font-medium text-gray-700">Prévia</label><input type="number" id="cfg-dias-previa" value="${diasPrevia}" class="w-full p-2 border rounded text-sm"></div>
                <div><label class="block text-xs font-medium text-gray-700">Mídia (Fotos)</label><input type="number" id="cfg-dias-midia" value="${diasMidia}" class="w-full p-2 border rounded text-sm"></div>
                <div><label class="block text-xs font-medium text-gray-700">Álbum</label><input type="number" id="cfg-dias-album" value="${diasAlbum}" class="w-full p-2 border rounded text-sm"></div>
                <button onclick="const p = document.getElementById('cfg-dias-previa').value; const m = document.getElementById('cfg-dias-midia').value; const a = document.getElementById('cfg-dias-album').value; window.app.saveConfigPrazos({ dias_previa: p, dias_midia: m, dias_album: a });" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition">Salvar Padrões</button>
            </div>
        </details>`;
    if (window.lucide) window.lucide.createIcons();
}

export function getEntregaInfo(evento, tipo) {
    const dataEventoStr = evento.data;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    if (!dataEventoStr) return { status: 'nodate', text: 'Data do evento não definida', deadline: 'N/A', bgColor: 'bg-gray-100', textColor: 'text-gray-500', diffDays: 99999, prazoDate: null };

    const dataEvento = new Date(dataEventoStr + 'T00:00:00');
    let dataPrazo = new Date(dataEvento);
    let statusField, dataField, title, prazoField;
    let diasPadrao = 0;
    let config = {};
    if (window.app && window.app.getDbState) { const dbState = window.app.getDbState(); config = (dbState.configuracoes && dbState.configuracoes.find(c => c.id === 'global_prazos')) || {}; }

    if (tipo === 'previa') { diasPadrao = parseInt(config.dias_previa || 3); statusField = 'entrega_previa_status'; dataField = 'entrega_previa_data'; prazoField = 'prazo_previa'; title = 'PRÉVIA'; }
    else if (tipo === 'midia') { diasPadrao = parseInt(config.dias_midia || 60); statusField = 'entrega_midia_status'; dataField = 'entrega_midia_data'; prazoField = 'prazo_midia'; title = 'FOTOS EM MÍDIA'; }
    else if (tipo === 'album') { diasPadrao = parseInt(config.dias_album || 180); statusField = 'entrega_album_status'; dataField = 'entrega_album_data'; prazoField = 'prazo_album'; title = 'ALBUM IMPRESSO'; }

    if (evento[prazoField]) dataPrazo = new Date(evento[prazoField] + 'T00:00:00');
    else dataPrazo.setDate(dataEvento.getDate() + diasPadrao);

    const prazoFormatado = dataPrazo.toLocaleDateString('pt-BR');
    const prazoISO = dataPrazo.toISOString().split('T')[0];
    const diffTime = dataPrazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (evento[statusField] === 'Entregue') {
        const dataEntrega = evento[dataField] ? new Date(evento[dataField]).toLocaleDateString('pt-BR') : '';
        return { title, status: 'entregue', text: `Entregue em ${dataEntrega}`, deadline: `Prazo: ${prazoFormatado}`, bgColor: 'bg-green-100', textColor: 'text-green-800', diffDays: 99998, data: dataEntrega, prazoDate: prazoISO };
    }
    if (diffDays < 0) return { title, status: 'atrasado', text: `${Math.abs(diffDays)} dia(s) atrasado`, deadline: `Prazo: ${prazoFormatado}`, bgColor: 'bg-red-100', textColor: 'text-red-800', diffDays: diffDays, data: null, prazoDate: prazoISO };
    if (diffDays === 0) return { title, status: 'hoje', text: 'Vence Hoje', deadline: `Prazo: ${prazoFormatado}`, bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', diffDays: 0, data: null, prazoDate: prazoISO };
    return { title, status: 'pendente', text: `Vence em ${diffDays} dia(s)`, deadline: `Prazo: ${prazoFormatado}`, bgColor: 'bg-blue-100', textColor: 'text-blue-800', diffDays: diffDays, data: null, prazoDate: prazoISO };
}

export function renderEntregaCards(evento, dbState) {
    const container = document.getElementById('entrega-management-area');
    if (!evento) { container.innerHTML = '<p class="text-red-500">Erro: Evento não encontrado.</p>'; return; }
    const tipos = ['previa', 'midia', 'album'];
    container.innerHTML = tipos.map(tipo => {
        const info = getEntregaInfo(evento, tipo);
        const buttonHtml = info.status === 'entregue'
            ? `<div class="flex gap-2"><button class="w-full bg-green-500 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-default"><i data-lucide="check-circle" class="w-5 h-5"></i> Entregue</button><button onclick="window.app.reverterEntrega('${evento.id}', '${tipo}')" class="bg-gray-200 text-gray-600 px-3 rounded-lg hover:bg-gray-300" title="Desfazer entrega"><i data-lucide="rotate-ccw" class="w-5 h-5"></i></button></div>`
            : `<button onclick="window.app.marcarEntregue('${evento.id}', '${tipo}')" class="w-full bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">Marcar como Entregue</button>`;
        const dateInputHtml = `<div class="mt-2 text-xs"><label class="block text-gray-500 mb-1">Alterar Prazo:</label><input type="date" value="${info.prazoDate || ''}" onchange="window.app.updateEventoPrazo('${evento.id}', '${tipo}', this.value)" class="bg-white/50 border border-black/10 rounded px-2 py-1 w-full text-gray-700 focus:outline-none focus:bg-white"></div>`;
        return `<div class="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between ${info.bgColor} ${info.textColor}"><div><h3 class="text-xl font-bold text-gray-900">${info.title}</h3><p class="text-2xl font-bold mt-2">${info.text}</p><p class="text-sm text-gray-600 mt-1">${info.deadline}</p>${dateInputHtml}</div><div class="mt-4">${buttonHtml}</div></div>`;
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
            if (info.status === 'atrasado' || info.status === 'hoje') atrasos.push({ evento: evento, info: info });
        });
    });
    atrasos.sort((a, b) => a.info.diffDays - b.info.diffDays);
    if (atrasos.length === 0) { container.innerHTML = `<div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow"><h3 class="font-bold">Tudo em dia!</h3><p>Nenhuma entrega está atrasada ou vencendo hoje.</p></div>`; return; }
    container.innerHTML = atrasos.map(item => {
        const cliente = dbState.clientes.find(c => c.id === item.evento.clienteId);
        const nomeCliente = cliente ? cliente.nome : 'Cliente não encontrado';
        const { bgColor, textColor, title, text, deadline } = item.info;
        return `<div class="bg-white p-4 rounded-lg shadow-md flex items-center justify-between gap-4 ${bgColor} ${textColor}"><div class="flex-shrink-0 w-16 h-16 ${bgColor} rounded-lg flex items-center justify-center"><i data-lucide="${item.info.status === 'atrasado' ? 'alert-triangle' : 'alert-circle'}" class="w-8 h-8"></i></div><div class="flex-grow"><span class="text-xs font-semibold ${bgColor.replace('-100', '-800')} ${bgColor.replace('bg-', 'bg-').replace('-100', '-200')} px-2 py-0.5 rounded-full">${title}</span><h4 class="text-lg font-bold text-gray-900">${item.evento.nome}</h4><p class="text-sm text-gray-700">${nomeCliente}</p></div><div class="flex-shrink-0 text-right"><p class="text-lg font-bold">${text}</p><p class="text-sm text-gray-600">${deadline}</p></div><div class="flex-shrink-0"><button onclick="window.app.viewEntregaFromAtraso('${item.evento.id}')" class="bg-gray-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700">Ver Evento</button></div></div>`;
    }).join('');
    if (window.lucide) window.lucide.createIcons();
}

export function viewEntregaFromAtraso(eventId, dbState) {
    const select = document.getElementById('entrega-evento-select');
    if (select) {
        select.value = eventId;
        select.dispatchEvent(new Event('change'));
    }
}

export function populateEntregaEventoSelect(dbState, selectedEventIdForEntrega) {
    const select = document.getElementById('entrega-evento-select');
    if (!select) return;

    select.innerHTML = '<option value="">Ver todos os atrasos (Padrão)</option>';

    if (dbState.eventos) {
        dbState.eventos.forEach(evento => {
            const cliente = dbState.clientes ? dbState.clientes.find(c => c.id === evento.clienteId) : null;
            const nomeCliente = cliente ? `(${cliente.nome})` : '';
            const option = document.createElement('option');
            option.value = evento.id;
            option.textContent = `${evento.nome} ${nomeCliente}`;
            select.appendChild(option);
        });
    }

    select.value = selectedEventIdForEntrega || "";
}
