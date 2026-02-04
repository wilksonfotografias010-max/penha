import { showSection } from './nav.js';
import { showToast } from './toast.js';

export function openAddPaymentModal(contratoId = null, dbState = null) {
    document.getElementById('modal-add-payment').classList.remove('hidden');
    document.getElementById('add-payment-form').reset();
    document.getElementById('payment-date').valueAsDate = new Date();

    // [NEW] Reset checkbox
    const extraCheck = document.getElementById('payment-is-extra');
    if (extraCheck) extraCheck.checked = false;

    const infoDiv = document.getElementById('payment-context-info');
    const infoText = document.getElementById('payment-context-detail');

    if (contratoId) {
        document.getElementById('payment-contrato-id').value = contratoId;
        if (dbState && infoDiv && infoText) {
            const contrato = dbState.contratos.find(c => c.id === contratoId);
            if (contrato) {
                const cliente = dbState.clientes.find(c => c.id === contrato.clienteId);
                const evento = dbState.eventos.find(e => e.id === contrato.eventoId);
                infoText.innerText = `${cliente ? cliente.nome : 'Cliente Desconhecido'} - ${evento ? evento.nome : 'Evento Desconhecido'}`;
                infoDiv.classList.remove('hidden');
            }
        }
    } else {
        document.getElementById('payment-contrato-id').value = "";
        if (infoDiv) infoDiv.classList.add('hidden');
    }
}

export function closeAddPaymentModal() { document.getElementById('modal-add-payment').classList.add('hidden'); }

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

    // Valores (Dynamically Calculated Extras)
    const valorPacote = parseFloat(contrato.valorTotal) || 0;
    const valorExtras = pagamentos.filter(p => p.isExtra).reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
    const valorFinal = valorPacote + valorExtras;

    document.getElementById('dossie-contrato-valor').innerHTML = `
        R$ ${valorFinal.toFixed(2).replace('.', ',')}
        <div class="text-xs text-gray-400 font-normal mt-1">
            (Pacote: ${valorPacote.toFixed(2)} + Extras: ${valorExtras.toFixed(2)})
        </div>
    `;

    const listaPag = document.getElementById('dossie-lista-pagamentos');
    listaPag.innerHTML = pagamentos.length === 0
        ? '<p class="text-gray-500">Nenhum pagamento registrado.</p>'
        : pagamentos.map(p => `
            <div class="flex justify-between border-b py-1">
                <span class="flex items-center">
                    ${new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR')} 
                    ${p.isExtra ? '<span class="ml-2 text-xs bg-blue-100 text-blue-800 px-1 rounded">Extra</span>' : ''}
                </span>
                <span>R$ ${parseFloat(p.valor).toFixed(2).replace('.', ',')}</span>
            </div>`).join('');

    const totalPago = pagamentos.reduce((acc, p) => acc + parseFloat(p.valor), 0);
    const restante = valorFinal - totalPago;
    document.getElementById('dossie-total-pago').innerText = `R$ ${totalPago.toFixed(2).replace('.', ',')}`;
    document.getElementById('dossie-restante').innerText = `R$ ${restante.toFixed(2).replace('.', ',')}`;
    document.getElementById('dossie-restante').classList.toggle('text-red-600', restante > 0);

    // --- Custos e Lucro ---
    const custosEvento = dbState.custos.filter(c => c.eventoId === contrato.eventoId);
    const listaCustos = document.getElementById('dossie-lista-custos');

    if (listaCustos) {
        listaCustos.innerHTML = custosEvento.length === 0
            ? '<p class="text-gray-500">Nenhum custo registrado para este evento.</p>'
            : custosEvento.map(c => `
                <div class="flex justify-between border-b py-1 text-red-600">
                    <span>${c.descricao} (${new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR')})</span>
                    <span>- R$ ${parseFloat(c.valor).toFixed(2).replace('.', ',')}</span>
                </div>`).join('');
    }

    const totalCustos = custosEvento.reduce((acc, c) => acc + parseFloat(c.valor), 0);
    const lucro = totalPago - totalCustos;
    const elLucro = document.getElementById('dossie-lucro-liquido');
    if (elLucro) {
        elLucro.innerText = `R$ ${lucro.toFixed(2).replace('.', ',')}`;
        elLucro.classList.toggle('text-green-600', lucro >= 0);
        elLucro.classList.toggle('text-red-600', lucro < 0);
    }
    // -----------------------

    document.getElementById('modal-dossie').classList.remove('hidden');
}

export function closeDossieModal() { document.getElementById('modal-dossie').classList.add('hidden'); }

export function openDossieModalFromEvento(eventoId, dbState) {
    const contrato = dbState.contratos.find(c => c.eventoId === eventoId);
    if (contrato) openDossieModal(contrato.id, dbState);
    else showToast("Nenhum contrato encontrado para este evento.", 'warning');
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
    document.getElementById('edit-contrato-valor').value = contrato.valorTotal || 0;
    document.getElementById('edit-contrato-historico').value = contrato.historico_valores || '';
    document.getElementById('edit-contrato-status').value = contrato.status;
    document.getElementById('edit-contrato-link').value = contrato.link || '';
    document.getElementById('edit-contrato-forma-pagamento').value = contrato.formaPagamento || '';
    document.getElementById('modal-edit-contrato').classList.remove('hidden');
}

export function closeEditContratoModal() { document.getElementById('modal-edit-contrato').classList.add('hidden'); }

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

export function closeEditClienteModal() { document.getElementById('modal-edit-cliente').classList.add('hidden'); }

export function abrirGerador(contratoId, dbState) {
    showSection('section-gerador');
    // console.log("Abrindo gerador para contrato:", contratoId); // Sanitized
}
