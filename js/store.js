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
    setDoc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
/* [FIM: STORE_IMPORTS] */


/* [INICIO: STORE_LISTENERS] - Monitoramento em Tempo Real */
export function setupRealtimeListeners(userId, onDataChangeCallback) {
    if (!userId) return [];

    // Estado inicial com todas as coleções
    const dbState = { 
        eventos: [], clientes: [], contratos: [], fotografos: [], 
        financeiro: [], custos: [], colunas: [], templates: [], pacotes: [], 
        configuracoes: [], categorias: [] 
    };
    
    const collections = ['eventos', 'clientes', 'contratos', 'fotografos', 'financeiro', 'custos', 'colunas', 'templates', 'pacotes', 'configuracoes', 'categorias'];
    let unsubscribeListeners = [];

    collections.forEach(col => {
        const collectionPath = `users/${userId}/${col}`;
        const unsub = onSnapshot(collection(db, collectionPath), (querySnapshot) => {
            
            dbState[col] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Ordenações automáticas
            if (col === 'clientes') dbState.clientes.sort((a, b) => a.nome.localeCompare(b.nome));
            if (col === 'eventos') dbState.eventos.sort((a, b) => new Date(a.data) - new Date(b.data)); 
            if (col === 'financeiro') dbState.financeiro.sort((a, b) => new Date(b.data) - new Date(a.data));
            if (col === 'custos') dbState.custos.sort((a, b) => new Date(b.data) - new Date(a.data));
            if (col === 'colunas') dbState.colunas.sort((a, b) => a.ordem - b.ordem);
            if (col === 'categorias') dbState.categorias.sort((a, b) => a.nome.localeCompare(b.nome));
            
            if (col === 'pacotes') {
                dbState.pacotes.sort((a, b) => {
                    const catA = a.package_category_name || '';
                    const catB = b.package_category_name || '';
                    if (catA !== catB) return catA.localeCompare(catB);
                    return (a.package_name || '').localeCompare(b.package_name || '');
                });
            }
            
            onDataChangeCallback(dbState);
        });
        
        unsubscribeListeners.push(unsub);
    });

    return unsubscribeListeners;
}
/* [FIM: STORE_LISTENERS] */


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
    if (!userId || !columnId || !newName) return;
    const docRef = doc(db, `users/${userId}/colunas/${columnId}`);
    try {
        await updateDoc(docRef, { nome: newName });
    } catch (error) {
        console.error("Erro ao atualizar coluna: ", error);
        throw new Error("Falha ao renomear a coluna.");
    }
}
/* [FIM: STORE_KANBAN] */


/* [INICIO: STORE_DELIVERY] - Lógica de Prazos e Entregas */
export async function marcarEntregue(userId, eventId, tipo) {
    if (!userId || !eventId || !tipo) return;
    const docRef = doc(db, `users/${userId}/eventos/${eventId}`);
    try {
        await updateDoc(docRef, {
            [`entrega_${tipo}_status`]: "Entregue",
            [`entrega_${tipo}_data`]: new Date().toISOString().split('T')[0]
        });
    } catch (error) { throw new Error("Falha ao atualizar status."); }
}

export async function reverterEntrega(userId, eventId, tipo) {
    if (!userId || !eventId || !tipo) return;
    const docRef = doc(db, `users/${userId}/eventos/${eventId}`);
    try {
        await updateDoc(docRef, {
            [`entrega_${tipo}_status`]: "Pendente",
            [`entrega_${tipo}_data`]: null
        });
    } catch (error) { throw new Error("Falha ao reverter status."); }
}

export async function updateEventoPrazo(userId, eventId, tipo, novaData) {
    if (!userId || !eventId || !tipo) return;
    const docRef = doc(db, `users/${userId}/eventos/${eventId}`);
    try {
        await updateDoc(docRef, { [`prazo_${tipo}`]: novaData });
    } catch (error) { throw new Error("Falha ao atualizar prazo."); }
}

export async function saveConfigPrazos(userId, prazosData) {
    if (!userId) return;
    const docRef = doc(db, `users/${userId}/configuracoes/global_prazos`);
    try {
        await setDoc(docRef, prazosData, { merge: true });
    } catch (error) { throw new Error("Falha ao salvar configurações."); }
}
/* [FIM: STORE_DELIVERY] */


/* [INICIO: STORE_CONTRACTS] - Atualização de Contratos e Clientes */
export async function updateContrato(userId, contratoId, dataToUpdate) {
    if (!userId || !contratoId) return;
    const docRef = doc(db, `users/${userId}/contratos/${contratoId}`);
    try {
        await updateDoc(docRef, dataToUpdate);
    } catch (error) { throw new Error("Falha ao atualizar contrato."); }
}

export async function updateCliente(userId, clienteId, data) {
    if (!userId || !clienteId) return;
    const docRef = doc(db, `users/${userId}/clientes/${clienteId}`);
    try {
        await updateDoc(docRef, data);
    } catch (error) { throw new Error("Falha ao atualizar dados do cliente."); }
}
/* [FIM: STORE_CONTRACTS] */


/* [INICIO: STORE_CONFIG] - Templates, Pacotes e Categorias */
export async function saveTemplate(userId, templateData, templateId) {
    if (!userId) throw new Error("Usuário não autenticado.");
    if (templateId) {
        await updateDoc(doc(db, `users/${userId}/templates/${templateId}`), templateData);
    } else {
        await addDoc(collection(db, `users/${userId}/templates`), templateData);
    }
}

export async function savePacote(userId, pacoteData, pacoteId) {
    if (!userId) throw new Error("Usuário não autenticado.");
    if (pacoteId) {
        await updateDoc(doc(db, `users/${userId}/pacotes/${pacoteId}`), pacoteData);
    } else {
        await addDoc(collection(db, `users/${userId}/pacotes`), pacoteData);
    }
}

export async function saveCategoria(userId, categoriaData, categoriaId) {
    if (!userId) throw new Error("Usuário não autenticado.");
    if (categoriaId) { 
        await updateDoc(doc(db, `users/${userId}/categorias/${categoriaId}`), categoriaData); 
    } else { 
        await addDoc(collection(db, `users/${userId}/categorias`), categoriaData); 
    }
}
/* [FIM: STORE_CONFIG] */


/* [INICIO: STORE_FINANCE_AUTOMATION] - Custos Fixos e Recorrência */
export async function toggleCustoRecorrencia(userId, custoId, deveRepetir) {
    if (!userId || !custoId) return;
    const docRef = doc(db, `users/${userId}/custos/${custoId}`);
    try {
        await updateDoc(docRef, { repetir: deveRepetir });
    } catch (error) { throw new Error("Erro ao atualizar recorrência."); }
}

export async function confirmarCustoPendente(userId, custoId) {
    if (!userId || !custoId) return;
    const docRef = doc(db, `users/${userId}/custos/${custoId}`);
    try {
        await updateDoc(docRef, { status: "Pago" });
    } catch (error) { throw new Error("Erro ao confirmar pagamento."); }
}

export async function verificarGerarCustosFixos(userId, dbState) {
    if (!userId || !dbState.custos) return;

    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const batch = writeBatch(db);
    let temNovosCustos = false;

    const custosRecorrentes = dbState.custos.filter(c => c.repetir === true);

    custosRecorrentes.forEach(custoMestre => {
        const mestreId = custoMestre.id_pai || custoMestre.id;
        
        // Verifica duplicidade neste mês
        const jaExisteNesteMes = dbState.custos.some(c => {
            if (!c.data) return false;
            const dataC = new Date(c.data + 'T00:00:00');
            const ehMesmoMes = dataC.getMonth() === mesAtual && dataC.getFullYear() === anoAtual;
            
            if (c.id === custoMestre.id && ehMesmoMes) return true; // É o próprio mestre criado agora
            if (c.id_pai === mestreId && ehMesmoMes) return true; // Já existe um filho
            return false;
        });

        if (!jaExisteNesteMes) {
            const diaVencimento = new Date(custoMestre.data + 'T00:00:00').getDate();
            const novaData = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`;
            
            const novoCustoRef = doc(collection(db, `users/${userId}/custos`));
            batch.set(novoCustoRef, {
                descricao: custoMestre.descricao,
                valor: custoMestre.valor,
                data: novaData,
                eventoId: "", 
                fotografoId: "",
                repetir: false, 
                id_pai: mestreId,
                status: "Pendente" 
            });
            temNovosCustos = true;
        }
    });

    if (temNovosCustos) {
        console.log("Gerando novos custos fixos...");
        await batch.commit();
    }
}
/* [FIM: STORE_FINANCE_AUTOMATION] */


/* [INICIO: STORE_COMPLEX_DELETE] - Deleção em Cascata */
export async function deleteEventAndRelations(userId, eventoId) {
    if (!userId || !eventoId) return;
    const batch = writeBatch(db);
    
    // Custos
    const custosSnapshot = await getDocs(query(collection(db, `users/${userId}/custos`), where("eventoId", "==", eventoId)));
    custosSnapshot.forEach(doc => batch.delete(doc.ref));
    
    // Contratos e Pagamentos
    const contratosSnapshot = await getDocs(query(collection(db, `users/${userId}/contratos`), where("eventoId", "==", eventoId)));
    for (const contratoDoc of contratosSnapshot.docs) {
        const pagamentosSnapshot = await getDocs(query(collection(db, `users/${userId}/financeiro`), where("contratoId", "==", contratoDoc.id)));
        pagamentosSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(contratoDoc.ref);
    }
    
    // O Evento
    batch.delete(doc(db, `users/${userId}/eventos/${eventoId}`));
    await batch.commit();
}

export async function deleteClientAndRelations(userId, clienteId) {
    if (!userId || !clienteId) return;
    const batch = writeBatch(db);
    
    // Eventos e Custos associados
    const eventosSnapshot = await getDocs(query(collection(db, `users/${userId}/eventos`), where("clienteId", "==", clienteId)));
    for (const eventoDoc of eventosSnapshot.docs) {
        const custosSnapshot = await getDocs(query(collection(db, `users/${userId}/custos`), where("eventoId", "==", eventoDoc.id)));
        custosSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(eventoDoc.ref);
    }
    
    // Contratos e Pagamentos
    const contratosSnapshot = await getDocs(query(collection(db, `users/${userId}/contratos`), where("clienteId", "==", clienteId)));
    for (const contratoDoc of contratosSnapshot.docs) {
        const pagamentosSnapshot = await getDocs(query(collection(db, `users/${userId}/financeiro`), where("contratoId", "==", contratoDoc.id)));
        pagamentosSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(contratoDoc.ref);
    }
    
    // O Cliente
    batch.delete(doc(db, `users/${userId}/clientes/${clienteId}`));
    await batch.commit();
}
/* [FIM: STORE_COMPLEX_DELETE] */
