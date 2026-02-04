// js/geradorContrato.js

// ######################################################
// ARQUIVO 3: LÓGICA DO GERADOR (SEM ABAS - CORRIGIDO)
// ######################################################

// Pega os dados do formulário HTML
function getFormData() {
    const data = {};
    const fields = [
        'contractType', 'eventDate', 'eventTime', 'eventDuration', 'eventLocal', 'package', 'value', 'paymentMethod', 'rules',
        'clientName', 'clientCPF', 'clientRG',
        'clientAddress', 'clientEmail', 'clientPhone', 'imageRights', 
        'studentName', 'studentClass'
    ];
    fields.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
           data[id] = element.type === 'checkbox' ? element.checked : element.value;
        }
    });

    // Pega o pacote do SELECT ÚNICO
    const packageSelect = document.getElementById('contractPackage');
    if (packageSelect && packageSelect.value) {
        const contractType = document.getElementById('contractType').value;
        if (contractType === '1') data.infantilPackage = packageSelect.value;
        if (contractType === '2') data.weddingPackage = packageSelect.value;
        if (contractType === '3') data.civilPackage = packageSelect.value;
        if (contractType === '6') data.formaturaPackage = packageSelect.value;
        if (contractType === '7') data.ensaioPackage = packageSelect.value; 
    }

    return data;
}

// Gera o texto final substituindo os placeholders
function generateContractText(formData, dbState) {
    const contractType = formData.contractType;
    let selectedPackage = "";

    switch (contractType) {
        case '1': selectedPackage = formData.infantilPackage; break;
        case '2': selectedPackage = formData.weddingPackage; break;
        case '3': selectedPackage = formData.civilPackage; break;
        case '6': selectedPackage = formData.formaturaPackage; break;
        case '7': selectedPackage = formData.ensaioPackage; break;
    }
    
    // Busca o template no banco de dados
    const template = dbState.templates.find(t => 
        t.link_tipo === contractType && 
        t.link_pacote === selectedPackage
    );

    if (!template) {
        const select = document.getElementById('contractType');
        const typeText = select.options[select.selectedIndex].text;
        let errorMsg = `<h1>Erro: Template não encontrado</h1>
                        <p style="text-align: center; color: red;">
                            Nenhum template foi encontrado para:<br>
                            <strong>Tipo:</strong> ${typeText}<br>
                            <strong>Pacote:</strong> ${selectedPackage || '(Nenhum)'}
                        </p>
                        <p style="text-align: center;">Verifique em "Templates de Contrato" se você criou um template vinculado a este pacote.</p>`;
        return errorMsg;
    }

    let contractHTML = template.corpo;

    const placeholders = {
        '{{clientName}}': formData.clientName || '[Nome do Cliente]',
        '{{clientCPF}}': formData.clientCPF || '[CPF do Cliente]',
        '{{clientRG}}': formData.clientRG || '[RG]',
        '{{clientAddress}}': formData.clientAddress || '[Endereço]',
        '{{clientEmail}}': formData.clientEmail || '[Email]',
        '{{clientPhone}}': formData.clientPhone || '[Telefone]',
        '{{eventDate}}': formData.eventDate ? new Date(formData.eventDate + 'T00:00:00').toLocaleDateString('pt-BR') : '[Data]',
        '{{eventTime}}': formData.eventTime || '[Hora]',
        '{{eventDuration}}': formData.eventDuration || '[Duração]',
        '{{eventLocal}}': formData.eventLocal || '[Local]',
        '{{value}}': parseFloat(formData.value || 0).toFixed(2).replace('.', ','),
        '{{paymentMethod}}': formData.paymentMethod || '[Pagamento]',
        '{{package}}': formData.package || '[Obs Pacote]',
        '{{rules}}': formData.rules || '',
        '{{studentName}}': formData.studentName || '[Aluno]',
        '{{studentClass}}': formData.studentClass || '[Turma]',
        '{{contratadoName}}': "Francisco Penha",
        '{{contratadoCPF}}': "000.000.000-00",
        '{{contratadoAddress}}': "Rua Dorgival, 11, Imperatriz - MA",
        '{{currentDate}}': new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    };

    for (const key in placeholders) {
        contractHTML = contractHTML.replace(new RegExp(key.replace(/\{\{/g, '{{').replace(/\}\}/g, '}}'), 'g'), placeholders[key]);
    }
    
    if (formData.imageRights) {
        contractHTML = contractHTML.replace(/<NAO_AUTORIZA>[\s\S]*?<\/NAO_AUTORIZA>/g, '');
        contractHTML = contractHTML.replace(/<AUTORIZA>/g, '').replace(/<\/AUTORIZA>/g, '');
    } else {
        contractHTML = contractHTML.replace(/<AUTORIZA>[\s\S]*?<\/AUTORIZA>/g, '');
        contractHTML = contractHTML.replace(/<NAO_AUTORIZA>/g, '').replace(/<\/NAO_AUTORIZA>/g, '');
    }
    
    return contractHTML;
}

export function initGeradorListeners() {
    const contractForm = document.getElementById('contractForm');
    const generateButton = document.getElementById('generateButton');
    const outputSection = document.getElementById('outputSection');
    const contractOutput = document.getElementById('contractOutput');

    // --- CORREÇÃO: REMOVIDOS LISTENERS DAS ABAS ANTIGAS (tabForm, tabText) ---
    
    // Listener do Botão Gerar
    if (generateButton) {
        generateButton.addEventListener('click', () => {
            if (!contractForm.checkValidity()) {
                contractForm.reportValidity();
                outputSection.classList.remove('hidden');
                contractOutput.innerHTML = `<p style="color: red; text-align:center">Preencha os campos obrigatórios.</p>`;
                return;
            }
            
            const formData = getFormData(); 
            
            // SEGURANÇA: Verifica se window.app e getDbState existem antes de chamar
            if (window.app && window.app.getDbState) {
                const contractHTML = generateContractText(formData, window.app.getDbState());
                contractOutput.innerHTML = contractHTML;
                outputSection.classList.remove('hidden');
                outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                console.error("window.app.getDbState não está disponível.");
            }
        });
    }

    // Botão Copiar
    const copyBtn = document.getElementById('copyButton');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const textToCopy = contractOutput.innerText || contractOutput.textContent;
            navigator.clipboard.writeText(textToCopy);
        });
    }

    // Botão Imprimir
    const printBtn = document.getElementById('printButton');
    if (printBtn) {
        printBtn.addEventListener('click', () => window.print());
    }

    // --- LISTENER DINÂMICO DO TIPO DE CONTRATO ---
    const contractTypeSelect = document.getElementById('contractType');
    
    if (contractTypeSelect) {
        contractTypeSelect.addEventListener('change', (e) => {
            const eventDetails = document.getElementById('eventDetails');
            const packageSection = document.getElementById('dynamicPackageSection'); 
            const clientNameLabel = document.getElementById('clientNameLabel');
            
            if(packageSection) packageSection.classList.add('hidden');
            if(eventDetails) eventDetails.classList.remove('hidden');
            if(clientNameLabel) clientNameLabel.textContent = 'Nome Completo';
            
            const type = e.target.value;
            
            let dbState = null;
            if (window.app && window.app.getDbState) {
                dbState = window.app.getDbState();
            }
            
            if (type === '5' && eventDetails) eventDetails.classList.add('hidden');
            
            const studentDetails = document.getElementById('formaturaStudentDetails');
            if (type === '6') {
                if(clientNameLabel) clientNameLabel.textContent = 'Nome do Pai ou Mãe (Responsável)';
                const dateLabel = document.querySelector('label[for="eventDate"]');
                if(dateLabel) dateLabel.textContent = 'Data do Evento Principal (Baile)';
                if(studentDetails) studentDetails.classList.remove('hidden');
            } else {
                const dateLabel = document.querySelector('label[for="eventDate"]');
                if(dateLabel) dateLabel.textContent = 'Data do Evento';
                if(studentDetails) studentDetails.classList.add('hidden');
            }

            // Carrega pacotes se não for "Geral" (4) ou "Entrada de Dados" (5)
            if (type !== '4' && type !== '5') {
                if(packageSection) packageSection.classList.remove('hidden');
                if (window.app && window.app.updatePackageSelect && dbState) {
                    window.app.updatePackageSelect('contractPackage', type, dbState);
                }
            }
        });

        // Dispara o evento change para arrumar a tela inicial
        contractTypeSelect.dispatchEvent(new Event('change'));
    }

    // --- Listener para PREENCHER O VALOR automaticamente ---
    const packageSelect = document.getElementById('contractPackage');
    if(packageSelect) {
        packageSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            if (selectedOption && selectedOption.dataset.valor) {
                const valInput = document.getElementById('value');
                if(valInput) valInput.value = selectedOption.dataset.valor;
            }
        });
    }
}

