function populateSelectWithOptions(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const selectedValue = select.value; // Tenta manter a seleção atual

    // Limpa e define o cabeçalho
    select.innerHTML = options.header;

    // Preenche com os dados
    if (options.data && Array.isArray(options.data)) {
        options.data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.nome; // Certifique-se que o cliente tem o campo 'nome'
            select.appendChild(option);
        });
    }

    // Restaura o valor se ainda existir na nova lista
    // (Pequeno delay para garantir que o DOM atualizou)
    if (selectedValue) {
        // Verifica se o valor antigo ainda é válido nas novas options
        const optionExists = Array.from(select.options).some(o => o.value === selectedValue);
        if (optionExists) select.value = selectedValue;
    }
}

export function populateEventoClienteSelect(dbState) {
    populateSelectWithOptions('evento-cliente', {
        header: '<option value="">Selecione o Cliente</option>',
        data: dbState.clientes || []
    });
}

export function populateEventoVendedorSelect(dbState) {
    populateSelectWithOptions('evento-vendedor', {
        header: '<option value="">Selecione o Vendedor (Opcional)</option>',
        data: dbState.vendedores || []
    });
}

export function populateEventoSelect(dbState) {
    populateSelectWithOptions('custo-evento', {
        header: '<option value="">Custo Fixo / Nenhum Evento</option>',
        data: dbState.eventos || []
    });
}

export function populateCustoFotografoSelect(dbState) {
    populateSelectWithOptions('custo-fotografo', {
        header: '<option value="">Selecione o Fotógrafo (Opcional)</option>',
        data: dbState.fotografos || []
    });
}

export function populateContratoClienteSelect(dbState) {
    populateSelectWithOptions('contrato-cliente', {
        header: '<option value="">Selecione o Cliente</option>',
        data: dbState.clientes || []
    });
}

export function updateContratoEventoSelect(clienteId, dbState) {
    let eventosFiltrados = [];
    let header = '<option value="">Selecione o Evento (escolha o cliente primeiro)</option>';

    if (clienteId && dbState.eventos) {
        eventosFiltrados = dbState.eventos.filter(e => e.clienteId === clienteId);
        if (eventosFiltrados.length === 0) {
            header = '<option value="">Nenhum evento encontrado para este cliente</option>';
        } else {
            header = '<option value="">Selecione o Evento</option>';
        }
    }

    populateSelectWithOptions('contrato-evento', { header: header, data: eventosFiltrados });
}
