// js/store.js

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

// ... (setupRealtimeListeners e outras funções mantêm-se iguais, adicione as novas abaixo) ...

export function setupRealtimeListeners(userId, onDataChangeCallback) {
    if (!userId) return [];

    const dbState = { 
        eventos: [], clientes: [], contratos: [], fotografos: [], 
        financeiro: [], custos: [], colunas: [], templates: [], pacotes: [], configuracoes: [] 
    };
    
    const collections = ['eventos', 'clientes', 'contratos', 'fotografos', 'financeiro', 'custos', 'colunas', 'templates', 'pacotes', 'configuracoes'];
    let unsubscribeListeners = [];

    collections.forEach(col => {
        const collectionPath = `users/${userId}/${col}`;
        const unsub = onSnapshot(collection(db, collectionPath), (querySnapshot) => {
            dbState[col] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Ordenações
            if (col === 'custos') {
                // Ordena custos por data decrescente
                dbState.custos.sort((a, b) => new Date(b.data) - new Date(a.data));
            }
            if (col === 'clientes') dbState.clientes.sort((a, b) => a.nome.localeCompare(b.nome));
            if (col === 'eventos') dbState.eventos.sort((a, b) => new Date(a.data) - new Date(b.data)); 
            if (col === 'financeiro') dbState.financeiro.sort((a, b) => new Date(b.data) - new Date(a.data));
            if (col === 'colunas') dbState.colunas.sort((a, b) => a.ordem - b.ordem);
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

// ... (handleFormSubmit, deleteSingleItem etc continuam iguais) ...

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

// --- FUNÇÕES DE LÓGICA DE NEGÓCIO ---

// 1. Alterna se um custo deve se repetir ou não (Configuração)
export async function toggleCustoRecorrencia(userId, custoId, deveRepetir) {
    if (!userId || !custoId) return;
    const docRef = doc(db, `users/${userId}/custos/${custoId}`);
    try {
        await updateDoc(docRef, { repetir: deveRepetir });
    } catch (error) {
        throw new Error("Erro ao atualizar recorrência.");
    }
}

// 2. Confirma um custo que foi gerado automaticamente (Passa de Pendente para Pago)
export async function confirmarCustoPendente(userId, custoId) {
    if (!userId || !custoId) return;
    const docRef = doc(db, `users/${userId}/custos/${custoId}`);
    try {
        await updateDoc(docRef, { status: "Pago" });
    } catch (error) {
        throw new Error("Erro ao confirmar pagamento.");
    }
}

// 3. O CORAÇÃO DA AUTOMAÇÃO: Gera custos do mês se não existirem
export async function verificarGerarCustosFixos(userId, dbState) {
    if (!userId || !dbState.custos) return;

    const hoje = new Date();
    const mesAtual = hoje.getMonth(); // 0 a 11
    const anoAtual = hoje.getFullYear();
    const stringMesAtual = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`; // Ex: "2026-02"

    const batch = writeBatch(db);
    let temNovosCustos = false;

    // Filtra apenas os custos "Mestres" que devem repetir
    // Um custo "Mestre" é um que foi criado manualmente pelo usuário com repetir=true
    // Ou podemos considerar qualquer custo com repetir=true como um gerador em potencial
    
    // Lógica simplificada: Vamos olhar todos os custos com repetir=true
    // E verificar se já existe um custo "filho" (ou clone) para o mês atual
    
    const custosRecorrentes = dbState.custos.filter(c => c.repetir === true);

    custosRecorrentes.forEach(custoMestre => {
        // Verifica se já existe um lançamento para este mês referente a este mestre
        // Critério: Mesmo nome, mesmo valor, e a data cai no mês atual
        // OU, idealmente, teríamos um campo 'id_pai', mas vamos usar heurística para compatibilidade
        
        // Vamos usar o ID do pai para rastreio se tiver, senão usa o próprio ID
        const mestreId = custoMestre.id_pai || custoMestre.id;

        const jaExisteNesteMes = dbState.custos.some(c => {
            if (!c.data) return false;
            const dataC = new Date(c.data + 'T00:00:00');
            const ehMesmoMes = dataC.getMonth() === mesAtual && dataC.getFullYear() === anoAtual;
            
            // É o próprio mestre (se ele foi criado neste mês)
            if (c.id === custoMestre.id && ehMesmoMes) return true;

            // É um filho deste mestre
            if (c.id_pai === mestreId && ehMesmoMes) return true;

            return false;
        });

        if (!jaExisteNesteMes) {
            // Cria o custo para este mês
            const diaVencimento = new Date(custoMestre.data + 'T00:00:00').getDate();
            const novaData = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`;
            
            const novoCustoRef = doc(collection(db, `users/${userId}/custos`));
            batch.set(novoCustoRef, {
                descricao: custoMestre.descricao,
                valor: custoMestre.valor,
                data: novaData,
                eventoId: "", // Custo fixo geralmente não tem evento
                fotografoId: "",
                repetir: false, // O filho não repete, só o pai
                id_pai: mestreId, // Link para saber de onde veio
                status: "Pendente" // Nasce pendente de confirmação
            });
            temNovosCustos = true;
        }
    });

    if (temNovosCustos) {
        console.log("Gerando novos custos fixos para o mês...");
        await batch.commit();
    }
}

// ... (Resto das funções como updateEventoColuna, marcarEntregue, etc mantêm-se iguais) ...

export async function updateEventoColuna(userId, eventoId, novaColunaId) {
    const docRef = doc(db, `users/${userId}/eventos/${eventoId}`);
    await updateDoc(docRef, { colunaId: novaColunaId });
}

export async function marcarEntregue(userId, eventId, tipo) {
    const docRef = doc(db, `users/${userId}/eventos/${eventId}`);
    await updateDoc(docRef, { [`entrega_${tipo}_status`]: "Entregue", [`entrega_${tipo}_data`]: new Date().toISOString().split('T')[0] });
}
export async function reverterEntrega(userId, eventId, tipo) {
    const docRef = doc(db, `users/${userId}/eventos/${eventId}`);
    await updateDoc(docRef, { [`entrega_${tipo}_status`]: "Pendente", [`entrega_${tipo}_data`]: null });
}
export async function updateEventoPrazo(userId, eventId, tipo, novaData) {
    const docRef = doc(db, `users/${userId}/eventos/${eventId}`);
    await updateDoc(docRef, { [`prazo_${tipo}`]: novaData });
}
export async function saveConfigPrazos(userId, prazosData) {
    const docRef = doc(db, `users/${userId}/configuracoes/global_prazos`);
    await setDoc(docRef, prazosData, { merge: true });
}
export async function updateContrato(userId, contratoId, dataToUpdate) {
    const docRef = doc(db, `users/${userId}/contratos/${contratoId}`);
    await updateDoc(docRef, dataToUpdate);
}
export async function saveTemplate(userId, templateData, templateId) {
    if (templateId) { await updateDoc(doc(db, `users/${userId}/templates/${templateId}`), templateData); } 
    else { await addDoc(collection(db, `users/${userId}/templates`), templateData); }
}
export async function savePacote(userId, pacoteData, pacoteId) {
    if (pacoteId) { await updateDoc(doc(db, `users/${userId}/pacotes/${pacoteId}`), pacoteData); } 
    else { await addDoc(collection(db, `users/${userId}/pacotes`), pacoteData); }
}
export async function deleteEventAndRelations(userId, eventoId) {
    const batch = writeBatch(db);
    const custosSnap = await getDocs(query(collection(db, `users/${userId}/custos`), where("eventoId", "==", eventoId)));
    custosSnap.forEach(doc => batch.delete(doc.ref));
    const contratosSnap = await getDocs(query(collection(db, `users/${userId}/contratos`), where("eventoId", "==", eventoId)));
    for (const c of contratosSnap.docs) {
        const pagSnap = await getDocs(query(collection(db, `users/${userId}/financeiro`), where("contratoId", "==", c.id)));
        pagSnap.forEach(d => batch.delete(d.ref));
        batch.delete(c.ref);
    }
    batch.delete(doc(db, `users/${userId}/eventos/${eventoId}`));
    await batch.commit();
}
export async function deleteClientAndRelations(userId, clienteId) {
    const batch = writeBatch(db);
    const eventosSnap = await getDocs(query(collection(db, `users/${userId}/eventos`), where("clienteId", "==", clienteId)));
    for (const ev of eventosSnap.docs) {
        const custosSnap = await getDocs(query(collection(db, `users/${userId}/custos`), where("eventoId", "==", ev.id)));
        custosSnap.forEach(d => batch.delete(d.ref));
        batch.delete(ev.ref);
    }
    const contratosSnap = await getDocs(query(collection(db, `users/${userId}/contratos`), where("clienteId", "==", clienteId)));
    for (const c of contratosSnap.docs) {
        const pagSnap = await getDocs(query(collection(db, `users/${userId}/financeiro`), where("contratoId", "==", c.id)));
        pagSnap.forEach(d => batch.delete(d.ref));
        batch.delete(c.ref);
    }
    batch.delete(doc(db, `users/${userId}/clientes/${clienteId}`));
    await batch.commit();
}
export async function updateColumn(userId, columnId, newName) {
    await updateDoc(doc(db, `users/${userId}/colunas/${columnId}`), { nome: newName });
}
