// js/store.js

// ######################################################
// ARQUIVO 5: CAMADA DE DADOS (STORE) - VERSÃO COMPLETA
// ######################################################

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

/**
 * Configura os listeners em tempo real.
 */
export function setupRealtimeListeners(userId, onDataChangeCallback) {
    if (!userId) return [];

    // Estado inicial completo
    const dbState = { 
        eventos: [], clientes: [], contratos: [], fotografos: [], 
        financeiro: [], custos: [], colunas: [], templates: [], pacotes: [] 
    };
    
    const collections = ['eventos', 'clientes', 'contratos', 'fotografos', 'financeiro', 'custos', 'colunas', 'templates', 'pacotes'];
    let unsubscribeListeners = [];

    collections.forEach(col => {
        const collectionPath = `users/${userId}/${col}`;
        const unsub = onSnapshot(collection(db, collectionPath), (querySnapshot) => {
            
            dbState[col] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Ordenações
            if (col === 'clientes') {
                dbState.clientes.sort((a, b) => a.nome.localeCompare(b.nome));
            }
            if (col === 'eventos') {
                 dbState.eventos.sort((a, b) => new Date(a.data) - new Date(b.data)); 
            }
            if (col === 'financeiro') {
                dbState.financeiro.sort((a, b) => new Date(b.data) - new Date(a.data));
            }
            if (col === 'colunas') {
                dbState.colunas.sort((a, b) => a.ordem - b.ordem);
            }
            if (col === 'pacotes') {
                dbState.pacotes.sort((a, b) => {
                    const catA = a.package_category_name || '';
                    const catB = b.package_category_name || '';
                    const nameA = a.package_name || '';
                    const nameB = b.package_name || '';
                    if (catA !== catB) return catA.localeCompare(catB);
                    return nameA.localeCompare(nameB);
                });
            }
            
            onDataChangeCallback(dbState);
        });
        
        unsubscribeListeners.push(unsub);
    });

    return unsubscribeListeners;
}

/**
 * Adiciona um novo documento.
 */
export async function handleFormSubmit(userId, collectionName, data) {
    if (!userId) { console.error("Usuário não autenticado."); return; }
    try {
        await addDoc(collection(db, `users/${userId}/${collectionName}`), data);
    } catch (error) { 
        console.error("Erro ao adicionar documento: ", error); 
        throw new Error(`Falha ao salvar em ${collectionName}`);
    }
}

/**
 * Deleta um documento ÚNICO (Simples).
 * Esta é a função que o botão de lixeira do Pacote chama.
 */
export async function deleteSingleItem(userId, collectionName, id) {
    if (!userId) return;
    try {
        await deleteDoc(doc(db, `users/${userId}/${collectionName}/${id}`));
    } catch (error) { 
        console.error("Erro ao deletar documento: ", error); 
        throw new Error(`Falha ao deletar item de ${collectionName}`);
    }
}

/**
 * Atualiza o status (coluna) de um evento no Kanban.
 */
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

/**
 * Marca entrega.
 */
export async function marcarEntregue(userId, eventId, tipo) {
    if (!userId || !eventId || !tipo) return;
    const docRef = doc(db, `users/${userId}/eventos/${eventId}`);
    const statusField = `entrega_${tipo}_status`;
    const dataField = `entrega_${tipo}_data`;
    try {
        await updateDoc(docRef, {
            [statusField]: "Entregue",
            [dataField]: new Date().toISOString().split('T')[0]
        });
    } catch (error) {
        console.error("Erro ao marcar entrega: ", error);
        throw new Error("Falha ao atualizar status.");
    }
}

/**
 * Atualiza contrato.
 */
export async function updateContrato(userId, contratoId, dataToUpdate) {
    if (!userId || !contratoId) return;
    const docRef = doc(db, `users/${userId}/contratos/${contratoId}`);
    try {
        await updateDoc(docRef, dataToUpdate);
    } catch (error) {
        console.error("Erro ao atualizar contrato: ", error);
        throw new Error("Falha ao atualizar.");
    }
}

/**
 * Salva ou Atualiza um Template.
 */
export async function saveTemplate(userId, templateData, templateId) {
    if (!userId) throw new Error("Usuário não autenticado.");
    if (templateId) {
        const docRef = doc(db, `users/${userId}/templates/${templateId}`);
        await updateDoc(docRef, templateData);
    } else {
        await addDoc(collection(db, `users/${userId}/templates`), templateData);
    }
}

/**
 * Salva ou Atualiza um Pacote.
 */
export async function savePacote(userId, pacoteData, pacoteId) {
    if (!userId) throw new Error("Usuário não autenticado.");
    if (pacoteId) {
        const docRef = doc(db, `users/${userId}/pacotes/${pacoteId}`);
        await updateDoc(docRef, pacoteData);
    } else {
        await addDoc(collection(db, `users/${userId}/pacotes`), pacoteData);
    }
}

// --- FUNÇÕES DE EXCLUSÃO EM CASCATA (MESTRA) ---

export async function deleteEventAndRelations(userId, eventoId) {
    if (!userId || !eventoId) return;
    const batch = writeBatch(db);

    // 1. Custos
    const custosQuery = query(collection(db, `users/${userId}/custos`), where("eventoId", "==", eventoId));
    const custosSnapshot = await getDocs(custosQuery);
    custosSnapshot.forEach(doc => batch.delete(doc.ref));

    // 2. Contratos
    const contratosQuery = query(collection(db, `users/${userId}/contratos`), where("eventoId", "==", eventoId));
    const contratosSnapshot = await getDocs(contratosQuery);

    // 3. Pagamentos
    for (const contratoDoc of contratosSnapshot.docs) {
        const pagamentosQuery = query(collection(db, `users/${userId}/financeiro`), where("contratoId", "==", contratoDoc.id));
        const pagamentosSnapshot = await getDocs(pagamentosQuery);
        pagamentosSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(contratoDoc.ref);
    }

    // 4. O Evento
    const eventoRef = doc(db, `users/${userId}/eventos/${eventoId}`);
    batch.delete(eventoRef);

    await batch.commit();
}

export async function deleteClientAndRelations(userId, clienteId) {
    if (!userId || !clienteId) return;
    const batch = writeBatch(db);

    // 1. Eventos
    const eventosQuery = query(collection(db, `users/${userId}/eventos`), where("clienteId", "==", clienteId));
    const eventosSnapshot = await getDocs(eventosQuery);

    for (const eventoDoc of eventosSnapshot.docs) {
        // Custos do evento
        const custosQuery = query(collection(db, `users/${userId}/custos`), where("eventoId", "==", eventoDoc.id));
        const custosSnapshot = await getDocs(custosQuery);
        custosSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(eventoDoc.ref);
    }

    // 2. Contratos
    const contratosQuery = query(collection(db, `users/${userId}/contratos`), where("clienteId", "==", clienteId));
    const contratosSnapshot = await getDocs(contratosQuery);

    for (const contratoDoc of contratosSnapshot.docs) {
        // Pagamentos do contrato
        const pagamentosQuery = query(collection(db, `users/${userId}/financeiro`), where("contratoId", "==", contratoDoc.id));
        const pagamentosSnapshot = await getDocs(pagamentosQuery);
        pagamentosSnapshot.forEach(doc => batch.delete(doc.ref));
        batch.delete(contratoDoc.ref);
    }

    // 3. O Cliente
    const clienteRef = doc(db, `users/${userId}/clientes/${clienteId}`);
    batch.delete(clienteRef);

    await batch.commit();
}
/**
 * Atualiza o nome de uma coluna Kanban.
 */
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

