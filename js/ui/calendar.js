export function renderCalendario(calendarioData, dbState) {
    const dataBase = new Date(calendarioData.getFullYear(), calendarioData.getMonth(), 1);
    const mesAnoEl = document.getElementById('calendario-mes-ano');
    const gridEl = document.getElementById('calendario-grid');
    const mes = dataBase.getMonth();
    const ano = dataBase.getFullYear();

    mesAnoEl.textContent = dataBase.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
    const primeiroDiaSemana = dataBase.getDay();
    const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();

    gridEl.innerHTML = '';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    for (let i = 0; i < primeiroDiaSemana; i++) gridEl.innerHTML += `<div class="calendar-day empty h-36"></div>`;

    for (let dia = 1; dia <= ultimoDiaMes; dia++) {
        const dataAtual = new Date(ano, mes, dia);
        let todayClass = dataAtual.getTime() === hoje.getTime() ? 'today' : '';
        const dataFormatada = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const eventosDoDia = dbState.eventos.filter(evento => {
            if (!evento.data) return false;

            // FILTRO: Só mostra no calendário se tiver contrato vinculado
            const temContrato = dbState.contratos.some(c => c.eventoId === evento.id);
            if (!temContrato) return false;

            const dataEvento = new Date(evento.data + 'T00:00:00');
            return dataEvento.getTime() === dataAtual.getTime();
        });
        let eventosHtml = eventosDoDia.map(evento => {
            let eventColorClass = 'bg-blue-100 text-blue-800';
            switch (evento.tipo) {
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
                <div class="day-number">${dia}</div><div class="mt-1 space-y-1">${eventosHtml}</div>
            </div>`;
    }
    const totalCelulas = primeiroDiaSemana + ultimoDiaMes;
    const celulasRestantes = (7 - (totalCelulas % 7)) % 7;
    for (let i = 0; i < celulasRestantes; i++) gridEl.innerHTML += `<div class="calendar-day empty h-36"></div>`;
}

export function mudarMes(offset, calendarioData, dbState) {
    calendarioData.setMonth(calendarioData.getMonth() + offset);
    renderCalendario(calendarioData, dbState);
}
