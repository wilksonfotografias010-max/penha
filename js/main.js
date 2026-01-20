/* [INICIO: MAIN_IMPORTS] - Importações de Módulos */
import { setupAuthListeners } from './auth.js';
import * as store from './store.js'; 
import * as ui from './ui.js';       
import { initGeradorListeners } from './geradorContrato.js';
import { initDragAndDrop } from './kanban.js'; 
/* [FIM: MAIN_IMPORTS] */


/* [INICIO: MAIN_STATE] - Estado Global da Aplicação */
let userId = null;

// Estrutura inicial do banco de dados local
let dbState = { 
    eventos: [], clientes: [], contratos: [], fotografos: [], 
    financeiro: [], custos: [], colunas: [], templates: [], pacotes: [], configuracoes: [], categorias: []
};

let unsubscribeListeners = []; 
let calendarioData = new Date(); 
let selectedEventIdForEntrega = null; 
/* [FIM: MAIN_STATE] */


/* [INICIO: MAIN_CORE_LOGIC] - Reação a Mudanças no Banco de Dados */
function onDataChange(newState) {
    dbState = newState; 
    // Atualiza filtros do relatório
    ui.populateRelatorioYears(dbState);
    
    // Se a aba estiver aberta, recalcula
    const relatorioSection = document.getElementById('section-relatorios');
    if (relatorioSection && !relatorioSection.classList.contains('hidden')) {
        ui.renderRelatorioBalanco(dbState);
    }
    
    // 1. Automação de Custos Fixos (Verifica virada de mês)
    if (userId && dbState.custos.length > 0) {
        store.verificarGerarCustosFixos(userId, dbState)
            .catch(err => console.error("Erro na automação de custos:", err));
    }

    // 2. Prepara Filtros e Selects Dinâmicos
    ui.populateDashboardYears(dbState);
    ui.populateDynamicSelects(dbState); // Categorias nos selects

    // 3. Renderiza Interface
    ui.updateDashboard(dbState);
    ui.renderKanban(dbState);
    ui.renderClientes(dbState);
    ui.renderContratos(dbState);
    ui.renderFotografos(dbState);
    ui.renderFinanceiro(dbState);
    ui.renderCustos(dbState); 
    ui.renderCalendario(calendarioData, dbState);
    ui.renderCategorias(dbState); // Lista de categorias na config
    ui.renderTemplates(dbState);
    ui.renderPacotes(dbState);
    
    // 4. Popula Selects Padrão
    ui.populateEventoClienteSelect(dbState);
    ui.populateEventoSelect(dbState);
    ui.populateCustoFotografoSelect(dbState);
    ui.populateContratoClienteSelect(dbState);
    ui.populateEntregaEventoSelect(dbState, selectedEventIdForEntrega);
    
    // 5. Lógica de Seções Específicas
    if (selectedEventIdForEntrega) {
        const evento = dbState.eventos.find(e => e.id === selectedEventIdForEntrega);
        ui.renderEntregaCards(evento, dbState);
    } else {
        ui.renderEntregasAtrasadas(dbState);
    }
    
    const entregaSection = document.getElementById('section-entrega');
    if (entregaSection && !entregaSection.classList.contains('hidden')) {
        ui.renderConfigPrazos(dbState);
    }

    const financeiroSection = document.getElementById('section-financeiro');
    if (financeiroSection && !financeiroSection.classList.contains('hidden')) {
        ui.renderContasAReceber(dbState);
        ui.renderFluxoDeCaixaChart(dbState);
    }

    // Ícones
    if (window.lucide) window.lucide.createIcons();
}
/* [FIM: MAIN_CORE_LOGIC] */


/* [INICIO: MAIN_AUTH_CALLBACKS] - Callbacks de Login/Logout */
function onLogin(user) {
    userId = user.uid;
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('flex');
    document.getElementById('auth-status').innerText = user.email;
    
    unsubscribeListeners = store.setupRealtimeListeners(userId, onDataChange);
}

function onLogout() {
    userId = null;
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('flex');
    document.getElementById('auth-status').innerText = "Desconectado";
    
    unsubscribeListeners.forEach(unsub => unsub());
    unsubscribeListeners = [];
    dbState = { eventos: [], clientes: [], contratos: [], fotografos: [], financeiro: [], custos: [], colunas: [], templates: [], pacotes: [], configuracoes: [], categorias: [] };
    onDataChange(dbState); 
}
/* [FIM: MAIN_AUTH_CALLBACKS] */


/* [INICIO: MAIN_INIT] - Inicialização (DOMContentLoaded) */
document.addEventListener('DOMContentLoaded', () => {
    
    setupAuthListeners(onLogin, onLogout);
    initDragAndDrop(); 
    
    /* [INICIO: MAIN_WINDOW_APP] - API Pública */
    window.app = {
        // Navegação
        showSection: (sectionId) => ui.showSection(sectionId, dbState, calendarioData),
        
        // Modais
        openDossieModal: (contratoId) => ui.openDossieModal(contratoId, dbState),
        openDossieModalFromEvento: (eventoId) => {
            const contrato = dbState.contratos.find(c => c.eventoId === eventoId);
            if (contrato) { ui.openDossieModal(contrato.id, dbState); } 
            else { alert('Nenhum contrato encontrado para este evento.'); }
        },
        closeDossieModal: ui.closeDossieModal,
        openAddPaymentModal: ui.openAddPaymentModal,
        openEditContratoModal: (contratoId) => ui.openEditContratoModal(contratoId, dbState),
        openEditClienteModal: (clienteId) => ui.openEditClienteModal(clienteId, dbState),
        closeEditClienteModal: ui.closeEditClienteModal,
        // ... dentro de window.app ...
        gerarRelatorio: () => {
            ui.renderRelatorioBalanco(dbState);
        },
        // Funcionalidades
        abrirGerador: (contratoId) => ui.abrirGerador(contratoId, dbState),
        abrirNovoEventoDoCalendario: ui.abrirNovoEventoDoCalendario,
        
        // Entregas
        viewEntregaFromAtraso: (eventId) => {
            selectedEventIdForEntrega = eventId;
            ui.viewEntregaFromAtraso(eventId, dbState);
        },
        marcarEntregue: (eventId, tipo) => {
            if (!userId) return;
            store.marcarEntregue(userId, eventId, tipo).catch(e => alert(e.message));
        },
        reverterEntrega: (eventId, tipo) => {
            if (!userId) return;
            if(confirm("Deseja marcar esta etapa como NÃO entregue novamente?")) {
                store.reverterEntrega(userId, eventId, tipo).catch(e => alert(e.message));
            }
        },
        updateEventoPrazo: (eventId, tipo, novaData) => {
            if (!userId) return;
            store.updateEventoPrazo(userId, eventId, tipo, novaData).catch(e => alert(e.message));
        },
        saveConfigPrazos: (prazos) => {
            if (!userId) return;
            store.saveConfigPrazos(userId, prazos).then(() => alert("Configurações salvas!")).catch(e => alert(e.message));
        },

        // Configurações e Categorias
        editTemplate: (templateId) => {
            if (!templateId) return;
            const template = dbState.templates.find(t => t.id === templateId);
            if (template) ui.populateTemplateForm(template);
        },
        clearTemplateForm: () => ui.clearTemplateForm(),
        editPacote: (pacoteId) => {
            if (!pacoteId) return;
            const pacote = dbState.pacotes.find(p => p.id === pacoteId);
            if (pacote) ui.populatePacoteForm(pacote);
        },
        clearPacoteForm: () => ui.clearPacoteForm(),
        editCategoria: (id) => {
            const cat = dbState.categorias.find(c => c.id === id);
            if (cat) ui.populateCategoriaForm(cat);
        },
        clearCategoriaForm: () => ui.clearCategoriaForm(),
        
        // Colunas e Helpers
        editColumn: (columnId, currentName) => {
            const newName = prompt("Novo nome para a coluna:", currentName);
            if (newName && newName.trim() !== "" && newName !== currentName) {
                store.updateColumn(userId, columnId, newName.trim()).catch(e => alert(e.message));
            }
        },
        getDbState: () => dbState,
        updatePackageSelect: ui.updatePackageSelect, 
        updateEventoColuna: (eventoId, novaColunaId) => {
            if (!userId) return;
            store.updateEventoColuna(userId, eventoId, novaColunaId).catch(e => alert(e.message));
        },

        // Custos e Recorrência
        toggleRecorrencia: (custoId, deveRepetir) => {
            if (!userId) return;
            const msg = deveRepetir 
                ? "Deseja tornar este custo recorrente? Ele será gerado automaticamente nos próximos meses." 
                : "Deseja parar a repetição mensal deste custo?";
            if(confirm(msg)) {
                store.toggleCustoRecorrencia(userId, custoId, deveRepetir).catch(e => alert(e.message));
            }
        },
        confirmarCusto: (custoId) => {
            if (!userId) return;
            if(confirm("Confirmar que este custo fixo já foi pago este mês?")) {
                store.confirmarCustoPendente(userId, custoId).catch(e => alert(e.message));
            }
        },
        
        // Exclusão
        deleteItem: (collectionName, id) => {
            if (!userId) return;
            let message = `Tem certeza que deseja excluir este item?`;
            
            if (collectionName === 'clientes' || collectionName === 'eventos') {
                message = "⚠️ ATENÇÃO! ⚠️\n\nVocê está prestes a apagar este item e TUDO relacionado a ele (Eventos, Contratos, Pagamentos). Deseja continuar?";
                if (confirm(message)) {
                    if (collectionName === 'clientes') store.deleteClientAndRelations(userId, id).catch(e => alert(e.message));
                    else store.deleteEventAndRelations(userId, id).catch(e => alert(e.message));
                    return;
                } else return;
            } 
            
            if (collectionName === 'contratos') message += `\n\nATENÇÃO: Isso NÃO excluirá os pagamentos já feitos.`;
            else if (collectionName === 'custos') message = `Excluir este custo?`;

            if (confirm(message)) {
                store.deleteSingleItem(userId, collectionName, id).catch(e => alert(e.message)); 
            }
        },

        exportarCSV: () => {
            if (!dbState.eventos || dbState.eventos.length === 0) {
                alert("Não há dados suficientes para exportar.");
                return;
            }
             let csvContent = "Evento;Data do Evento;Cliente;Email;Telefone;Tipo;Local;Pacote/Contrato;Valor Contrato;Total Pago;Restante;Total Custos;Lucro Liquido;Status Previa;Status Midia;Status Album\n";

            dbState.eventos.forEach(evento => {
                const cliente = dbState.clientes.find(c => c.id === evento.clienteId) || {};
                const contrato = dbState.contratos.find(c => c.eventoId === evento.id); 
                const valorTotal = contrato ? (parseFloat(contrato.valorTotal) || 0) : 0;
                const totalPago = contrato 
                    ? dbState.financeiro.filter(p => p.contratoId === contrato.id).reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0)
                    : 0;
                const restante = valorTotal - totalPago;
                const totalCustos = dbState.custos.filter(c => c.eventoId === evento.id).reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
                const lucro = totalPago - totalCustos; 
                const dataEvento = evento.data ? new Date(evento.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
                const safeText = (text) => text ? text.replace(/;/g, " - ").replace(/(\r\n|\n|\r)/gm, " ") : "";
                const money = (val) => val.toFixed(2).replace('.', ',');

                const row = [
                    safeText(evento.nome), dataEvento, safeText(cliente.nome), safeText(cliente.email), safeText(cliente.telefone),
                    safeText(evento.tipo), safeText(evento.local), contrato ? "Sim" : "Sem Contrato", 
                    money(valorTotal), money(totalPago), money(restante), money(totalCustos), money(lucro),
                    safeText(evento.entrega_previa_status), safeText(evento.entrega_midia_status), safeText(evento.entrega_album_status)
                ];
                csvContent += row.join(";") + "\n";
            });

            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Relatorio_Geral_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    /* [FIM: MAIN_WINDOW_APP] */


    /* [INICIO: MAIN_LISTENERS] - Listeners de Eventos do DOM */
    
    initGeradorListeners(); 
    // ... dentro dos listeners ...
    const relAno = document.getElementById('relatorio-ano');
    const relMes = document.getElementById('relatorio-mes');
    if(relAno) relAno.addEventListener('change', () => ui.renderRelatorioBalanco(dbState));
    if(relMes) relMes.addEventListener('change', () => ui.renderRelatorioBalanco(dbState));
    // Filtros Dashboard
    const filtroAno = document.getElementById('dashboard-filtro-ano');
    const filtroMes = document.getElementById('dashboard-filtro-mes');
    if (filtroAno) filtroAno.addEventListener('change', () => ui.updateDashboard(dbState));
    if (filtroMes) filtroMes.addEventListener('change', () => ui.updateDashboard(dbState));
    // --- Filtro de Contratos (NOVO) ---
    const filtroContrato = document.getElementById('filtro-contrato-busca');
    if (filtroContrato) {
        filtroContrato.addEventListener('keyup', () => {
            ui.renderContratos(dbState);
        });
    }

    // Navegação Calendário
    document.getElementById('calendario-prev').addEventListener('click', () => { ui.mudarMes(-1, calendarioData, dbState); });
    document.getElementById('calendario-next').addEventListener('click', () => { ui.mudarMes(1, calendarioData, dbState); });
    document.getElementById('mobile-menu-button').addEventListener('click', () => { document.getElementById('sidebar').classList.toggle('-translate-x-full'); });

    // Selects Dinâmicos (OnChange)
    const templateTypeSelect = document.getElementById('template-link-tipo');
    if (templateTypeSelect) {
        templateTypeSelect.addEventListener('change', (e) => {
            ui.updatePackageSelect('template-link-pacote', e.target.value, dbState);
        });
    }
    const contratoClienteSelect = document.getElementById('contrato-cliente');
    if (contratoClienteSelect) {
        contratoClienteSelect.addEventListener('change', (e) => { ui.updateContratoEventoSelect(e.target.value, dbState); });
    }
    const entregaEventoSelect = document.getElementById('entrega-evento-select');
    if (entregaEventoSelect) {
        entregaEventoSelect.addEventListener('change', (e) => {
            selectedEventIdForEntrega = e.target.value; 
            if (selectedEventIdForEntrega) {
                const evento = dbState.eventos.find(ev => ev.id === selectedEventIdForEntrega);
                document.getElementById('entrega-default-view').classList.add('hidden');
                document.getElementById('entrega-management-area').classList.remove('hidden');
                ui.renderEntregaCards(evento, dbState);
            } else {
                document.getElementById('entrega-default-view').classList.remove('hidden');
                document.getElementById('entrega-management-area').classList.add('hidden');
                ui.renderEntregasAtrasadas(dbState);
            }
        });
    }

    // --- SUBMITS DE FORMULÁRIOS ---

    // Pacotes
    const pacoteForm = document.getElementById('form-pacote');
    if (pacoteForm) {
        pacoteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const pacoteId = e.target.elements['pacote-id'].value;
                const select = e.target.elements['pacote-tipo-vinculo'];
                const category_id = select.value;
                const category_name = select.options[select.selectedIndex].text; 
                
                const data = {
                    package_category_id: category_id,
                    package_category_name: category_name,
                    package_name: e.target.elements['pacote-nome'].value,
                    package_value: parseFloat(e.target.elements['pacote-valor'].value)
                };
                store.savePacote(userId, data, pacoteId || null).then(() => ui.clearPacoteForm()).catch(e => alert("Falha ao salvar pacote: " + e.message));
            } catch (err) { alert("Erro: " + err.message); }
        });
    }

    // Categorias (NOVO)
    const categoriaForm = document.getElementById('form-categoria');
    if (categoriaForm) {
        categoriaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('categoria-id').value;
            const nome = document.getElementById('categoria-nome').value;
            if(!nome) return;
            store.saveCategoria(userId, { nome }, id || null).then(() => ui.clearCategoriaForm()).catch(err => alert(err.message));
        });
    }

    // Templates
    const templateForm = document.getElementById('form-template');
    if (templateForm) {
        templateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const templateId = e.target.elements['template-id'].value;
            const corpoContent = document.getElementById('template-corpo').innerHTML;
            const data = {
                titulo: e.target.elements['template-titulo'].value,
                corpo: corpoContent, 
                link_tipo: e.target.elements['template-link-tipo'].value,
                link_pacote: e.target.elements['template-link-pacote'].value
            };
            store.saveTemplate(userId, data, templateId || null).then(() => ui.clearTemplateForm()).catch(e => alert("Falha ao salvar template: " + e.message));
        });
    }

    // Clientes
    document.getElementById('form-cliente').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            nome: e.target.elements['cliente-nome'].value, 
            telefone: e.target.elements['cliente-telefone'].value, 
            email: e.target.elements['cliente-email'].value,
            documento: e.target.elements['cliente-documento'].value,
            endereco: e.target.elements['cliente-endereco'].value 
        };
        store.handleFormSubmit(userId, 'clientes', data).then(() => e.target.reset()).catch(e => alert(e.message));
    });

    // Edição de Clientes
    const formEditCliente = document.getElementById('form-edit-cliente');
    if (formEditCliente) {
        formEditCliente.addEventListener('submit', (e) => {
            e.preventDefault();
            const clienteId = document.getElementById('edit-cliente-id').value;
            const data = {
                nome: document.getElementById('edit-cliente-nome').value,
                telefone: document.getElementById('edit-cliente-telefone').value,
                email: document.getElementById('edit-cliente-email').value,
                documento: document.getElementById('edit-cliente-documento').value,
                endereco: document.getElementById('edit-cliente-endereco').value
            };
            store.updateCliente(userId, clienteId, data).then(() => ui.closeEditClienteModal()).catch(err => alert(err.message));
        });
    }

    // Eventos
    document.getElementById('form-evento').addEventListener('submit', (e) => {
        e.preventDefault();
        const colunasOrdenadas = [...dbState.colunas].sort((a, b) => a.ordem - b.ordem);
        if (colunasOrdenadas.length === 0) { alert("Crie uma coluna Kanban primeiro."); return; }
        const data = {
            clienteId: e.target.elements['evento-cliente'].value,
            nome: e.target.elements['evento-nome'].value, 
            data: e.target.elements['evento-data'].value, 
            local: e.target.elements['evento-local'].value,
            tipo: e.target.elements['evento-tipo'].value,
            descricao: e.target.elements['evento-descricao'].value,
            entrega_previa_status: "Pendente", entrega_midia_status: "Pendente", entrega_album_status: "Pendente",
            entrega_previa_data: null, entrega_midia_data: null, entrega_album_data: null,
            colunaId: colunasOrdenadas[0].id
        };
        store.handleFormSubmit(userId, 'eventos', data).then(() => e.target.reset()).catch(e => alert(e.message));
    });

    // Contratos (Criação)
    document.getElementById('form-contrato').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            clienteId: e.target.elements['contrato-cliente'].value,
            eventoId: e.target.elements['contrato-evento'].value,
            valorTotal: parseFloat(e.target.elements['contrato-valor-total'].value),
            dataContrato: e.target.elements['contrato-data'].value, 
            status: e.target.elements['contrato-status'].value,
            link: e.target.elements['contrato-link'].value,
            formaPagamento: e.target.elements['contrato-forma-pagamento'].value
        };
        store.handleFormSubmit(userId, 'contratos', data).then(() => {
            e.target.reset();
            document.getElementById('contrato-data').valueAsDate = new Date();
            ui.updateContratoEventoSelect(null, dbState);
        }).catch(e => alert(e.message));
    });

    // Contratos (Edição)
    document.getElementById('edit-contract-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const contratoId = e.target.elements['edit-contrato-id'].value;
        const dataToUpdate = {
            valorTotal: parseFloat(e.target.elements['edit-contrato-valor'].value),
            historico_valores: e.target.elements['edit-contrato-historico'].value,
            status: e.target.elements['edit-contrato-status'].value,
            link: e.target.elements['edit-contrato-link'].value,
            formaPagamento: e.target.elements['edit-contrato-forma-pagamento'].value
        };
        store.updateContrato(userId, contratoId, dataToUpdate).then(() => ui.closeEditContratoModal()).catch(e => alert(e.message));
    });
    
    // Fotógrafos
    document.getElementById('form-fotografo').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = { nome: e.target.elements['fotografo-nome'].value, contato: e.target.elements['fotografo-contato'].value };
        store.handleFormSubmit(userId, 'fotografos', data).then(() => e.target.reset()).catch(e => alert(e.message));
    });
    
    // Custos
    document.getElementById('form-custo').addEventListener('submit', (e) => {
        e.preventDefault();
        const isRepeating = e.target.elements['custo-repetir'] ? e.target.elements['custo-repetir'].checked : false;
        const data = {
            data: e.target.elements['custo-data'].value,
            descricao: e.target.elements['custo-descricao'].value, 
            valor: parseFloat(e.target.elements['custo-valor'].value), 
            eventoId: e.target.elements['custo-evento'].value,
            fotografoId: e.target.elements['custo-fotografo'].value,
            repetir: isRepeating,
            status: 'Pago' 
        };
        store.handleFormSubmit(userId, 'custos', data).then(() => {
            e.target.reset();
            document.getElementById('custo-data').valueAsDate = new Date();
        }).catch(e => alert(e.message));
    });
    
    // Colunas
    document.getElementById('form-nova-coluna').addEventListener('submit', (e) => {
        e.preventDefault();
        const nomeColuna = e.target.elements['coluna-nome'].value;
        if (!nomeColuna) return;
        const proximaOrdem = (dbState.colunas.length > 0) ? Math.max(...dbState.colunas.map(c => c.ordem)) + 1 : 0;
        const data = { nome: nomeColuna, ordem: proximaOrdem };
        store.handleFormSubmit(userId, 'colunas', data).then(() => e.target.reset()).catch(e => alert(e.message));
    });

    // Pagamentos
    document.getElementById('add-payment-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            contratoId: e.target.elements['payment-contrato-id'].value,
            valor: parseFloat(e.target.elements['payment-amount'].value),
            data: e.target.elements['payment-date'].value,
            metodo: e.target.elements['payment-method'].value
        };
        store.handleFormSubmit(userId, 'financeiro', data).then(() => ui.closeAddPaymentModal()).catch(e => alert(e.message));
    });
    
    // Botões de Cancelar Modal
    document.getElementById('cancel-payment-button').addEventListener('click', ui.closeAddPaymentModal);
    document.getElementById('cancel-edit-contract-button').addEventListener('click', ui.closeEditContratoModal);

    // Datas Iniciais
    document.getElementById('contrato-data').valueAsDate = new Date();
    document.getElementById('payment-date').valueAsDate = new Date();
    document.getElementById('custo-data').valueAsDate = new Date();
    /* [FIM: MAIN_LISTENERS] */
});
/* [FIM: MAIN_INIT] */


