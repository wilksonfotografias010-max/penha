export function renderCategorias(dbState) {
    const lista = document.getElementById('lista-categorias');
    if (!lista) return;

    if (!dbState.categorias || dbState.categorias.length === 0) {
        lista.innerHTML = '<p class="text-gray-500 text-center py-4 text-sm">Nenhuma categoria criada.</p>';
        return;
    }

    lista.innerHTML = dbState.categorias.map(cat => `
        <div class="flex justify-between items-center bg-gray-50 p-2 mb-2 rounded border border-gray-200">
            <span class="font-medium text-gray-700 text-sm">${cat.nome}</span>
            <div class="flex gap-2">
                <button onclick="window.app.editCategoria('${cat.id}')" class="text-blue-500 hover:text-blue-700" title="Editar">
                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
                <button onclick="window.app.deleteItem('categorias', '${cat.id}')" class="text-red-500 hover:text-red-700" title="Excluir">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

export function populateCategoriaForm(categoria) {
    document.getElementById('categoria-id').value = categoria.id;
    document.getElementById('categoria-nome').value = categoria.nome || '';
}

export function clearCategoriaForm() {
    const form = document.getElementById('form-categoria');
    if (form) form.reset();
    document.getElementById('categoria-id').value = "";
}

export function populateDynamicSelects(dbState) {
    const idsDosSelects = [
        'evento-tipo',          // No formulário de Evento
        'pacote-tipo-vinculo',  // No formulário de Pacote
        'template-link-tipo',   // No formulário de Template
        'subcategoria-categoria-pai' // [NEW] No formulário de Subcategoria
    ];

    idsDosSelects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        const valorAtual = select.value;

        const primeiraOpcao = select.options[0];
        select.innerHTML = '';
        if (primeiraOpcao) select.appendChild(primeiraOpcao);

        if (id === 'template-link-tipo') {
            const optGeral = document.createElement('option');
            optGeral.value = 'geral';
            optGeral.textContent = 'Geral (Todos)';
            select.appendChild(optGeral);
        }

        if (dbState.categorias) {
            dbState.categorias.forEach(cat => {
                const option = document.createElement('option');
                // IMPORTANTE: Para subcategorias e alguns casos, precisamos do ID. Para outros (legacy), o Nome.
                // Ajuste: evento-tipo usa NOME. pacote-tipo-vinculo usa ID. 
                // Vamos padronizar: value=ID, mas manter compatibilidade do evento-tipo se ele usava nome.
                // VERIFICANDO CODIGO ANTIGO: option.value = cat.nome.
                // MUDANÇA: Para subcategoria precisamos do ID.

                if (id === 'subcategoria-categoria-pai' || id === 'pacote-tipo-vinculo') {
                    option.value = cat.id;
                } else {
                    option.value = cat.nome;
                }

                option.textContent = cat.nome;
                select.appendChild(option);
            });
        }

        if (valorAtual) select.value = valorAtual;
    });
}

export function renderVendedores(dbState) {
    const lista = document.getElementById('lista-vendedores');
    if (!lista) return;

    if (!dbState.vendedores || dbState.vendedores.length === 0) {
        lista.innerHTML = '<p class="text-gray-500 text-center py-4 text-sm">Nenhum vendedor cadastrado.</p>';
        return;
    }

    lista.innerHTML = dbState.vendedores.map(vend => `
        <div class="flex justify-between items-center bg-gray-50 p-2 mb-2 rounded border border-gray-200">
            <span class="font-medium text-gray-700 text-sm">${vend.nome}</span>
            <div class="flex gap-2">
                <button onclick="window.app.editVendedor('${vend.id}')" class="text-blue-500 hover:text-blue-700" title="Editar">
                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
                <button onclick="window.app.deleteItem('vendedores', '${vend.id}')" class="text-red-500 hover:text-red-700" title="Excluir">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

export function populateVendedorForm(vendedor) {
    document.getElementById('vendedor-id').value = vendedor.id;
    document.getElementById('vendedor-nome').value = vendedor.nome || '';
}

export function clearVendedorForm() {
    const form = document.getElementById('form-vendedor');
    if (form) form.reset();
    document.getElementById('vendedor-id').value = "";
}

export function populateTemplateForm(template) {
    document.getElementById('template-id').value = template.id;
    document.getElementById('template-titulo').value = template.titulo;
    document.getElementById('template-link-tipo').value = template.link_tipo || 'geral';
    const event = new Event('change');
    document.getElementById('template-link-tipo').dispatchEvent(event);
    setTimeout(() => { document.getElementById('template-link-pacote').value = template.link_pacote || ''; }, 100);
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
    if (!dbState.templates || dbState.templates.length === 0) { lista.innerHTML = '<p class="text-gray-500">Nenhum template cadastrado.</p>'; return; }
    lista.innerHTML = dbState.templates.map(t => `
        <div class="bg-white p-4 rounded shadow flex justify-between items-center">
            <div><h4 class="font-bold">${t.titulo}</h4><p class="text-xs text-gray-500">Vínculo: ${t.link_tipo || 'Geral'}</p></div>
            <div class="flex gap-2">
                <button onclick="window.app.editTemplate('${t.id}')" class="text-blue-500 hover:text-blue-700"><i data-lucide="edit-3" class="w-5 h-5"></i></button>
                <button onclick="window.app.deleteItem('templates', '${t.id}')" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            </div>
        </div>`).join('');
    if (window.lucide) window.lucide.createIcons();
}

export function renderPacotes(dbState) {
    const container = document.getElementById('lista-pacotes');
    if (!container) return;
    if (!dbState.pacotes || dbState.pacotes.length === 0) { container.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum pacote cadastrado.</p>'; return; }
    const categories = {};
    dbState.pacotes.forEach(p => { const cat = p.package_category_name || 'Sem Categoria'; if (!categories[cat]) categories[cat] = []; categories[cat].push(p); });
    container.innerHTML = Object.keys(categories).sort().map(categoryName => {
        const items = categories[categoryName];
        const itemsHtml = items.map(pacote => {
            const valor = (pacote.package_value || 0).toFixed(2).replace('.', ',');
            return `
                <div class="flex justify-between items-center bg-white p-2 mb-1 rounded border border-gray-100 hover:shadow-sm transition-shadow">
                    <div><span class="font-semibold text-gray-800 text-sm">${pacote.package_name}</span><span class="text-xs text-green-600 font-bold ml-2">R$ ${valor}</span></div>
                    <div class="flex gap-2">
                        <button onclick="window.app.editPacote('${pacote.id}')" class="text-blue-500 hover:text-blue-700"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                        <button onclick="window.app.deleteItem('pacotes', '${pacote.id}')" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>`;
        }).join('');
        return `<div class="border border-gray-200 rounded-lg overflow-hidden mb-4"><h3 class="text-lg font-bold text-gray-900 bg-gray-50 p-3 border-b">${categoryName}</h3><div class="p-2 bg-gray-50/50 space-y-1">${itemsHtml}</div></div>`;
    }).join('');
    if (window.lucide) window.lucide.createIcons();
}

export function populatePacoteForm(pacote) {
    document.getElementById('pacote-id').value = pacote.id;
    document.getElementById('pacote-tipo-vinculo').value = pacote.package_category_id || '';
    document.getElementById('pacote-nome').value = pacote.package_name || '';
    document.getElementById('pacote-valor').value = pacote.package_value || 0;
}

export function clearPacoteForm() { document.getElementById('form-pacote').reset(); document.getElementById('pacote-id').value = ""; }

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

export function renderTiposEntrega(dbState) {
    const lista = document.getElementById('lista-tipos-entrega');
    if (!lista) return;

    if (!dbState.tipos_entrega || dbState.tipos_entrega.length === 0) {
        lista.innerHTML = '<p class="text-gray-500 text-center py-4 text-sm">Nenhum tipo de entrega definido.</p>';
        return;
    }

    // Ordenar (já vem ordenado do store, mas garantindo)
    const tipos = [...dbState.tipos_entrega].sort((a, b) => (a.ordem || 99) - (b.ordem || 99));

    lista.innerHTML = tipos.map(tipo => `
        <div class="flex justify-between items-center bg-gray-50 p-2 mb-2 rounded border border-gray-200">
            <div>
                <span class="font-medium text-gray-700 text-sm block">${tipo.titulo}</span>
                <span class="text-xs text-gray-500">Prazo Padrão: ${tipo.dias_padrao} dias</span>
            </div>
            <div class="flex gap-2">
                <button onclick="window.app.editTipoEntrega('${tipo.id}')" class="text-blue-500 hover:text-blue-700" title="Editar">
                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
                <button onclick="window.app.deleteItem('tipos_entrega', '${tipo.id}')" class="text-red-500 hover:text-red-700" title="Excluir" ${['previa', 'midia', 'album'].includes(tipo.id) ? 'disabled style="opacity:0.3;cursor:not-allowed"' : ''}>
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

export function populateTipoEntregaForm(tipo) {
    document.getElementById('tipo-entrega-id').value = tipo.id;
    document.getElementById('tipo-entrega-titulo').value = tipo.titulo || '';
    document.getElementById('tipo-entrega-dias').value = tipo.dias_padrao || 0;
}



/* [NEW] Helper para Popular Select de Subcategorias (Dependente) */
export function populateSubCategorySelect(selectId, parentCategoryId, dbState) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">Subcategoria...</option>';
    select.disabled = true; // Reset disabled state by default

    if (!parentCategoryId) {
        return;
    }

    if (dbState.subcategorias) {
        // Filtra subcategorias que pertencem à categoria pai selecionada
        const filtered = dbState.subcategorias.filter(sub => sub.categoriaId === parentCategoryId);

        filtered.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.nome;
            option.textContent = sub.nome;
            select.appendChild(option);
        });

        if (filtered.length > 0) {
            select.disabled = false;
        } else {
            const opt = document.createElement('option');
            opt.text = "Nenhuma subcategoria";
            select.add(opt);
        }
    }
}

/* [NEW] SUBCATEGORIAS LOGIC */

export function renderSubcategorias(dbState) {
    const lista = document.getElementById('lista-subcategorias');
    if (!lista) return;

    if (!dbState.subcategorias || dbState.subcategorias.length === 0) {
        lista.innerHTML = '<p class="text-gray-500 text-center py-4 text-sm">Nenhuma subcategoria criada.</p>';
        return;
    }

    // Agrupa por Categoria Pai para exibição organizada
    const grouped = {};
    dbState.subcategorias.forEach(sub => {
        const catName = sub.categoriaNome || 'Sem Categoria Mestre';
        if (!grouped[catName]) grouped[catName] = [];
        grouped[catName].push(sub);
    });

    lista.innerHTML = Object.keys(grouped).sort().map(catName => {
        const subs = grouped[catName];
        const subsHtml = subs.map(sub => `
            <div class="flex justify-between items-center bg-white p-2 mb-1 rounded border border-gray-100 ml-4">
                <span class="font-medium text-gray-700 text-sm">${sub.nome}</span>
                <div class="flex gap-2">
                    <button onclick="window.app.editSubcategoria('${sub.id}')" class="text-blue-500 hover:text-blue-700" title="Editar"><i data-lucide="edit-2" class="w-3 h-3"></i></button>
                    <button onclick="window.app.deleteItem('subcategorias', '${sub.id}')" class="text-red-500 hover:text-red-700" title="Excluir"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                </div>
            </div>
        `).join('');

        return `
            <div class="mb-3">
                <div class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 border-b pb-1">${catName}</div>
                ${subsHtml}
            </div>
        `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}

export function populateSubcategoriaForm(sub) {
    document.getElementById('subcategoria-id').value = sub.id;
    document.getElementById('subcategoria-nome').value = sub.nome || '';
    document.getElementById('subcategoria-categoria-pai').value = sub.categoriaId || '';
}

export function clearSubcategoriaForm() {
    const form = document.getElementById('form-subcategoria');
    if (form) form.reset();
    document.getElementById('subcategoria-id').value = "";
}
