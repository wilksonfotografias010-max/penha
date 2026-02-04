import { renderRelatorioBalanco } from './finance.js';
import { renderCalendario } from './calendar.js';
import { renderContasAReceber, renderFluxoDeCaixaChart, renderFinanceiro, renderCustos } from './finance.js';
import { renderEntregaCards, renderEntregasAtrasadas, renderConfigPrazos } from './delivery.js';

export function showSection(sectionId, dbState, calendarioData) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    const section = document.getElementById(sectionId);

    if (sectionId === 'section-relatorios') {
        const elMes = document.getElementById('relatorio-mes');
        if (elMes && !elMes.value) elMes.value = new Date().getMonth();

        renderRelatorioBalanco(dbState);
    }
    if (section) {
        section.classList.remove('hidden');
        if (sectionId === 'section-calendario' && calendarioData) renderCalendario(calendarioData, dbState);

        if (sectionId === 'section-financeiro') {
            renderContasAReceber(dbState);
            renderFluxoDeCaixaChart(dbState);
            renderFinanceiro(dbState);
            renderCustos(dbState);
        }

        if (sectionId === 'section-entrega') {
            const select = document.getElementById('entrega-evento-select');
            if (select && select.value) {
                const evento = dbState.eventos.find(e => e.id === select.value);
                renderEntregaCards(evento, dbState);
            } else {
                renderEntregasAtrasadas(dbState);
            }
            // Garantir que o menu de configuração seja renderizado
            renderConfigPrazos(dbState);
        }
    }
}
