/* [INICIO: STORE_IMPORTS] - Importações do Firebase */
import { db } from './firebase.js';
import {
    collection,
    addDoc,
    onSnapshot,
    doc,
    deleteDoc,
    updateDoc,
    getDocs,
    query,
    where,
    writeBatch,
    setDoc,
    orderBy,
    limit,
    startAt,
    endAt,
    Timestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
/* [FIM: STORE_IMPORTS] */


/* [INICIO: STORE_STATE] - Estado Interno do Módulo */
// Estado Global do Store (Acessível por todas as funções)
let dbState = {
    eventos: [], clientes: [], contratos: [], fotografos: [],
    financeiro: [], custos: [], colunas: [], templates: [], pacotes: [],
    financeiro: [], custos: [], colunas: [], templates: [], pacotes: [],
    configuracoes: [], categorias: [], vendedores: [], tipos_entrega: [],
    // Buffers para lógica de merge:
    _realtimeEventos: [], _historyEventos: [],
    _realtimeFinanceiro: [], _historyFinanceiro: [],
    _realtimeCustos: [], _historyCustos: []
};
let internalCallback = null;

function notifyChange() {
    if (internalCallback) internalCallback(dbState);
}

// Helper para merge (evita duplicatas por ID)
function mergeData(realtimeArray, historyArray) {
    const realtimeIds = new Set(realtimeArray.map(i => i.id));
    // Mantém histórico apenas se NÃO estiver no realtime (prioridade para realtime updates)
    const historyFiltered = historyArray.filter(i => !realtimeIds.has(i.id));
    return [...realtimeArray, ...historyFiltered];
}
/* [FIM: STORE_STATE] */


/* [INICIO: STORE_LISTENERS] - Monitoramento em Tempo Real */
export function setupRealtimeListeners(userId, onDataChangeCallback) {
    if (!userId) return [];

    internalCallback = onDataChangeCallback;

    // Reinicia estado
    dbState = {
        eventos: [], clientes: [], contratos: [], fotografos: [],
        financeiro: [], custos: [], colunas: [], templates: [], pacotes: [],
        configuracoes: [], categorias: [], vendedores: [], tipos_entrega: [],
        _realtimeEventos: [], _historyEventos: [],
        _realtimeFinanceiro: [], _historyFinanceiro: [],
        _realtimeCustos: [], _historyCustos: []
    };

    // Coleções leves (Carrega tudo)
    const smallCollections = ['clientes', 'fotografos', 'colunas', 'templates', 'pacotes', 'configuracoes', 'categorias', 'vendedores', 'contratos', 'tipos_entrega'];
    let unsubscribeListeners = [];

    // 1. Listeners Simples (Coleções Pequenas)
    smallCollections.forEach(col => {
        const collectionPath = `users/${userId}/${col}`;
        const unsub = onSnapshot(collection(db, collectionPath), (querySnapshot) => {
            dbState[col] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Ordenações
            if (col === 'clientes') dbState.clientes.sort((a, b) => a.nome.localeCompare(b.nome));
            if (col === 'categorias') dbState.categorias.sort((a, b) => a.nome.localeCompare(b.nome));
            if (col === 'vendedores') dbState.vendedores.sort((a, b) => a.nome.localeCompare(b.nome));
            if (col === 'colunas') dbState.colunas.sort((a, b) => a.ordem - b.ordem);
            if (col === 'tipos_entrega') dbState.tipos_entrega.sort((a, b) => (a.ordem || 99) - (b.ordem || 99));
            if (col === 'pacotes') {
                dbState.pacotes.sort((a, b) => {
                    const catA = a.package_category_name || '';
                    const catB = b.package_category_name || '';
                    if (catA !== catB) return catA.localeCompare(catB);
                    return (a.package_name || '').localeCompare(b.package_name || '');
                });
            }
            notifyChange();
        });
        unsubscribeListeners.push(unsub);
    });

    // 2. Listeners Otimizados (Coleções Pesadas)

    // EVENTOS: Carrega apenas eventos futuros ou recentes (últimos 90 dias)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateStr = ninetyDaysAgo.toISOString().split('T')[0];

    const eventosQuery = query(
        collection(db, `users/${userId}/eventos`),
        where('data', '>=', dateStr)
    );

    const unsubEventos = onSnapshot(eventosQuery, (querySnapshot) => {
        dbState._realtimeEventos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Combina com histórico carregado
        dbState.eventos = mergeData(dbState._realtimeEventos, dbState._historyEventos);
        dbState.eventos.sort((a, b) => new Date(a.data) - new Date(b.data));
        notifyChange();
    });
    unsubscribeListeners.push(unsubEventos);

    // FINANCEIRO: Carrega último 1 ano
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateFinanceStr = oneYearAgo.toISOString().split('T')[0];

    const financeiroQuery = query(
        collection(db, `users/${userId}/financeiro`),
        where('data', '>=', dateFinanceStr)
    );
    const unsubFinanceiro = onSnapshot(financeiroQuery, (querySnapshot) => {
        dbState._realtimeFinanceiro = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        dbState.financeiro = mergeData(dbState._realtimeFinanceiro, dbState._historyFinanceiro);
        dbState.financeiro.sort((a, b) => new Date(b.data) - new Date(a.data));
        notifyChange();
    });
    unsubscribeListeners.push(unsubFinanceiro);

    // CUSTOS: Carrega último 1 ano
    const custosQuery = query(
        collection(db, `users/${userId}/custos`),
        where('data', '>=', dateFinanceStr)
    );
    const unsubCustos = onSnapshot(custosQuery, (querySnapshot) => {
        dbState._realtimeCustos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        dbState.custos = mergeData(dbState._realtimeCustos, dbState._historyCustos);
        dbState.custos.sort((a, b) => new Date(b.data) - new Date(a.data));
        notifyChange();
    });
    unsubscribeListeners.push(unsubCustos);

    return unsubscribeListeners;
}
/* [FIM: STORE_LISTENERS] */


/* [INICIO: STORE_HISTORY_LOADER] - Carregamento Sob Demanda */
export async function loadFinancialHistory(userId, year) {
    if (!userId || !year) return;

    // Define o intervalo do ano solicitado
    const startObj = new Date(year, 0, 1);
    const endObj = new Date(year, 11, 31, 23, 59, 59);

    const startStr = startObj.toISOString().split('T')[0];
    const endStr = endObj.toISOString().split('T')[0];

    try {
        // Busca Financeiro
        const finQuery = query(
            collection(db, `users/${userId}/financeiro`),
            where('data', '>=', startStr),
            where('data', '<=', endStr)
        );
        const finSnapshot = await getDocs(finQuery);
        const newDataFin = finSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Adiciona ao histórico (evitando duplicatas que já estejam no histórico)
        const currentIdsFin = new Set(dbState._historyFinanceiro.map(i => i.id));
        const uniqueNewFin = newDataFin.filter(i => !currentIdsFin.has(i.id));
        dbState._historyFinanceiro = [...dbState._historyFinanceiro, ...uniqueNewFin];

        // Busca Custos
        const custosQuery = query(
            collection(db, `users/${userId}/custos`),
            where('data', '>=', startStr),
            where('data', '<=', endStr)
        );
        const custosSnapshot = await getDocs(custosQuery);
        const newDataCustos = custosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const currentIdsCustos = new Set(dbState._historyCustos.map(i => i.id));
        const uniqueNewCustos = newDataCustos.filter(i => !currentIdsCustos.has(i.id));
        dbState._historyCustos = [...dbState._historyCustos, ...uniqueNewCustos];

        // Atualiza Listas Finais
        dbState.financeiro = mergeData(dbState._realtimeFinanceiro, dbState._historyFinanceiro);
        dbState.financeiro.sort((a, b) => new Date(b.data) - new Date(a.data));

        dbState.custos = mergeData(dbState._realtimeCustos, dbState._historyCustos);
        dbState.custos.sort((a, b) => new Date(b.data) - new Date(a.data));

        notifyChange();
        return { success: true, count: uniqueNewFin.length + uniqueNewCustos.length };

    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        throw new Error("Falha ao buscar histórico do ano " + year);
    }
}

export async function loadEventsHistory(userId, year) {
    if (!userId || !year) return;
    const startStr = `${year}-01-01`;
    const endStr = `${year}-12-31`;

    try {
        const evQuery = query(
            collection(db, `users/${userId}/eventos`),
            where('data', '>=', startStr),
            where('data', '<=', endStr)
        );
        const snapshot = await getDocs(evQuery);
        const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const currentIds = new Set(dbState._historyEventos.map(i => i.id));
        const uniqueNew = newData.filter(i => !currentIds.has(i.id));

        dbState._historyEventos = [...dbState._historyEventos, ...uniqueNew];
        dbState.eventos = mergeData(dbState._realtimeEventos, dbState._historyEventos);
        dbState.eventos.sort((a, b) => new Date(a.data) - new Date(b.data));

        notifyChange();
        return { success: true, count: uniqueNew.length };

    } catch (error) {
        console.error("Erro ao carregar eventos antigos:", error);
        throw new Error("Falha ao buscar eventos de " + year);
    }
}
/* [FIM: STORE_HISTORY_LOADER] */


/* [INICIO: STORE_GENERIC_CRUD] - Funções Básicas de Escrita/Deleção */
export async function handleFormSubmit(userId, collectionName, data) {
    if (!userId) { console.error("Usuário não autenticado."); return; }
    try {
        await addDoc(collection(db, `users/${userId}/${collectionName}`), data);
    } catch (error) {
        console.error("Erro ao adicionar documento: ", error);
        throw new Error(`Falha ao salvar em ${collectionName}`);
    }
}

export async function deleteSingleItem(userId, collectionName, id) {
    if (!userId) return;
    try {
        await deleteDoc(doc(db, `users/${userId}/${collectionName}/${id}`));
    } catch (error) {
        console.error("Erro ao deletar documento: ", error);
        throw new Error(`Falha ao deletar item de ${collectionName}`);
    }
}
/* [FIM: STORE_GENERIC_CRUD] */


/* [INICIO: STORE_KANBAN] - Atualização de Colunas */
export async function updateEventoColuna(userId, eventoId, novaColunaId) {
    if (!userId || !eventoId || !novaColunaId) return;
    const docRef = doc(db, `users/${userId}/eventos/${eventoId}`);
    try {
        await updateDoc(docRef, { colunaId: novaColunaId });
    } catch (error) {
        console.error("Erro ao atualizar coluna: ", error);
        throw new Error("Falha ao mover o card.");
    }
}

export async function updateColumn(userId, columnId, newName) {
    if (!userId) return;
    const docRef = doc(db, `users/${userId}/colunas/${columnId}`);
    try {
        await updateDoc(docRef, { nome: newName });
    } catch (error) {
        console.error("Erro ao atualizar coluna:", error);
        throw new Error("Falha ao atualizar coluna.");
    }
}
/* [FIM: STORE_KANBAN] */


/* [INICIO: STORE_SPECIFIC] - Funções Específicas de Negócio */
export async function updateCliente(userId, clienteId, data) {
    if (!userId) return;
    try {
        await updateDoc(doc(db, `users/${userId}/clientes/${clienteId}`), data);
    } catch (error) {
        console.error("Erro update cliente:", error);
        throw new Error("Falha ao atualizar cliente");
    }
}

export async function updateContrato(userId, contratoId, data) {
    if (!userId) return;
    try {
        await updateDoc(doc(db, `users/${userId}/contratos/${contratoId}`), data);
    } catch (error) {
        console.error("Erro update contrato:", error);
        throw new Error("Falha ao atualizar contrato");
    }
}

export async function marcarEntregue(userId, eventoId, tipo) {
    if (!userId) return;
    const updateData = {};
    updateData[`entrega_${tipo}_status`] = 'Entregue';
    updateData[`entrega_${tipo}_data`] = new Date().toISOString().split('T')[0];
    try {
        await updateDoc(doc(db, `users/${userId}/eventos/${eventoId}`), updateData);
    } catch (error) {
        throw new Error("Falha ao registrar entrega.");
    }
}

export async function reverterEntrega(userId, eventoId, tipo) {
    if (!userId) return;
    const updateData = {};
    updateData[`entrega_${tipo}_status`] = 'Pendente';
    updateData[`entrega_${tipo}_data`] = null;
    try {
        await updateDoc(doc(db, `users/${userId}/eventos/${eventoId}`), updateData);
    } catch (error) {
        throw new Error("Falha ao reverter entrega.");
    }
}

export async function updateEventoPrazo(userId, eventoId, tipo, novaData) {
    if (!userId) return;
    const updateData = {};
    updateData[`prazo_${tipo}`] = novaData;
    try {
        await updateDoc(doc(db, `users/${userId}/eventos/${eventoId}`), updateData);
    } catch (error) {
        throw new Error("Falha ao atualizar prazo.");
    }
}

export async function saveConfigPrazos(userId, prazos) {
    if (!userId) return;
    try {
        // Busca se existe, se não cria. ID fixo 'global_prazos'
        const docRef = doc(db, `users/${userId}/configuracoes/global_prazos`);
        // setDoc com merge: true cria se não existir
        await setDoc(docRef, { ...prazos, id: 'global_prazos' }, { merge: true });
    } catch (error) {
        throw new Error("Falha ao salvar configurações.");
    }
}

export async function saveTemplate(userId, data, templateId = null) {
    if (!userId) return;
    try {
        if (templateId) await updateDoc(doc(db, `users/${userId}/templates/${templateId}`), data);
        else await addDoc(collection(db, `users/${userId}/templates`), data);
    } catch (error) {
        throw new Error("Falha ao salvar template.");
    }
}

export async function savePacote(userId, data, pacoteId = null) {
    if (!userId) return;
    try {
        if (pacoteId) await updateDoc(doc(db, `users/${userId}/pacotes/${pacoteId}`), data);
        else await addDoc(collection(db, `users/${userId}/pacotes`), data);
    } catch (error) { throw new Error("Falha ao salvar pacote."); }
}

export async function saveCategoria(userId, data, id = null) {
    if (!userId) return;
    try {
        if (id) await updateDoc(doc(db, `users/${userId}/categorias/${id}`), data);
        else await addDoc(collection(db, `users/${userId}/categorias`), data);
    } catch (error) { throw new Error("Falha ao salvar categoria."); }
}

export async function saveVendedor(userId, data, id = null) {
    if (!userId) return;
    try {
        if (id) await updateDoc(doc(db, `users/${userId}/vendedores/${id}`), data);
        else await addDoc(collection(db, `users/${userId}/vendedores`), data);
    } catch (error) { throw new Error("Falha ao salvar vendedor."); }
}

export async function saveTipoEntrega(userId, data, id = null) {
    if (!userId) return;
    try {
        if (id) {
            // Se for update
            await updateDoc(doc(db, `users/${userId}/tipos_entrega/${id}`), data);
        } else {
            // Se for create, pode ser com ID manual (ex: migration) ou auto
            if (data.id) {
                await setDoc(doc(db, `users/${userId}/tipos_entrega/${data.id}`), data);
            } else {
                await addDoc(collection(db, `users/${userId}/tipos_entrega`), data);
            }
        }
    } catch (error) { throw new Error("Falha ao salvar tipo de entrega."); }
}

export async function toggleCustoRecorrencia(userId, custoId, deveRepetir) {
    if (!userId) return;
    try {
        await updateDoc(doc(db, `users/${userId}/custos/${custoId}`), { repetir: deveRepetir });
    } catch (error) { throw new Error("Falha ao atualizar custo."); }
}

export async function confirmarCustoPendente(userId, custoId) {
    if (!userId) return;
    try {
        await updateDoc(doc(db, `users/${userId}/custos/${custoId}`), { status: 'Pago' });
    } catch (error) { throw new Error("Falha ao confirmar pagamento."); }
}

export async function deleteClientAndRelations(userId, clientId) {
    if (!userId) return;

    // 1. Busca Contratos do Cliente
    const contratosSnapshot = await getDocs(query(collection(db, `users/${userId}/contratos`), where('clienteId', '==', clientId)));
    const batch = writeBatch(db);

    // 2. Deleta Cliente
    batch.delete(doc(db, `users/${userId}/clientes/${clientId}`));

    // 3. Busca Eventos do Cliente
    const eventosSnapshot = await getDocs(query(collection(db, `users/${userId}/eventos`), where('clienteId', '==', clientId)));
    eventosSnapshot.forEach(doc => batch.delete(doc.ref));

    // 4. Deleta Custos vinculados aos Eventos (NOVO)
    for (const eventoDoc of eventosSnapshot.docs) {
        const custosSnapshot = await getDocs(query(collection(db, `users/${userId}/custos`), where('eventoId', '==', eventoDoc.id)));
        custosSnapshot.forEach(c => batch.delete(c.ref));
    }

    // 5. Deleta Contratos
    contratosSnapshot.forEach(doc => batch.delete(doc.ref));

    // 6. Deleta Pagamentos (Financeiro) vinculados aos Contratos
    for (const contratoDoc of contratosSnapshot.docs) {
        const pagsSnapshot = await getDocs(query(collection(db, `users/${userId}/financeiro`), where('contratoId', '==', contratoDoc.id)));
        pagsSnapshot.forEach(p => batch.delete(p.ref));
    }

    try {
        await batch.commit();
    } catch (error) {
        console.error(error);
        throw new Error("Erro ao excluir cliente e relações.");
    }
}

export async function deleteEventAndRelations(userId, eventId) {
    if (!userId) return;
    const batch = writeBatch(db);

    // 1. Deleta o Evento
    batch.delete(doc(db, `users/${userId}/eventos/${eventId}`));

    // 2. Busca e Deleta Contratos vinculados
    const contratosSnapshot = await getDocs(query(collection(db, `users/${userId}/contratos`), where('eventoId', '==', eventId)));
    contratosSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 3. Deleta Pagamentos (Financeiro) vinculados aos Contratos
    for (const contratoDoc of contratosSnapshot.docs) {
        const pagsSnapshot = await getDocs(query(collection(db, `users/${userId}/financeiro`), where('contratoId', '==', contratoDoc.id)));
        pagsSnapshot.forEach(p => batch.delete(p.ref));
    }

    // 4. Deleta Custos vinculados ao Evento (NOVO)
    const custosSnapshot = await getDocs(query(collection(db, `users/${userId}/custos`), where('eventoId', '==', eventId)));
    custosSnapshot.forEach(c => batch.delete(c.ref));

    try {
        await batch.commit();
    } catch (error) {
        throw new Error("Erro ao excluir evento e relações.");
    }
}

export async function verificarGerarCustosFixos(userId, dbState) {
    // Implementação simplificada para evitar custos duplicados
    // Apenas verifica se já existe custo fixo gerado para o mês atual
    // Lógica real exigiria mais checks
    return Promise.resolve();
}
/* [FIM: STORE_SPECIFIC] */

export async function deleteContractAndRelations(userId, contractId) {
    if (!userId) return;

    // Tenta encontrar o contrato no estado local
    const contrato = dbState.contratos.find(c => c.id === contractId);

    // Se não achou (pode estar desatualizado?), tenta buscar do firestore
    // Mas para simplificar e garantir, se não achou, deleta só o ID.
    if (!contrato) {
        // Tenta deletar direto pelo ID (pode ser um contrato órfão ou estado desatualizado)
        await deleteSingleItem(userId, 'contratos', contractId);
        return;
    }

    const eventId = contrato.eventoId;
    if (eventId) {
        // Se tem evento vinculado, chama a exclusão do evento (que já deleta contratos em cascata)
        await deleteEventAndRelations(userId, eventId);
    } else {
        // Se não tem evento, deleta apenas o contrato
        await deleteSingleItem(userId, 'contratos', contractId);
    }
}
