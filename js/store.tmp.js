
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
        const financeiroAntigo = finSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Busca Custos
        const custosQuery = query(
            collection(db, `users/${userId}/custos`),
            where('data', '>=', startStr),
            where('data', '<=', endStr)
        );
        const custosSnapshot = await getDocs(custosQuery);
        const custosAntigos = custosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return { financeiro: financeiroAntigo, custos: custosAntigos };

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
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Erro ao carregar eventos antigos:", error);
        throw new Error("Falha ao buscar eventos de " + year);
    }
}
/* [FIM: STORE_HISTORY_LOADER] */
