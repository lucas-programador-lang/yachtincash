document.addEventListener('DOMContentLoaded', () => {
    // ===== Modais (ex: Depositar) =====
    window.openModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            if (modalId === 'depositModal') {
                const qrView = document.getElementById('depositQrView');
                const modalCard = modal.querySelector('.modal-card');
                if (qrView) {
                    qrView.style.display = 'none';
                    document.getElementById('qrcodeCanvas').innerHTML = '';
                }
                if (modalCard) modalCard.classList.remove('has-scroll');
                definirModoPlanoDeposito(false);
            }
            modal.classList.add('open');
            document.body.classList.add('modal-open');
        }
    };

    window.closeModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('open');
            document.body.classList.remove('modal-open');
        }
    };

    window.abrirDepositoComPlano = function (planoValor) {
        openModal('depositModal');
        definirModoPlanoDeposito(true, planoValor);
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach((modal) => {
                modal.classList.remove('open');
            });
            document.body.classList.remove('modal-open');
            closeSidebar();
        }
    });

    // ===== Menu hambúrguer (gaveta lateral no mobile) =====
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCloseBtn = document.getElementById('sidebarClose');

    function openSidebar() {
        if (!sidebar) return;
        sidebar.classList.add('mobile-open');
        sidebarOverlay.classList.add('open');
        hamburgerBtn.classList.add('is-open');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        document.body.classList.add('modal-open');
    }

    function closeSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('open');
        hamburgerBtn.classList.remove('is-open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('modal-open');
    }

    if (hamburgerBtn && sidebar && sidebarOverlay) {
        hamburgerBtn.addEventListener('click', () => {
            const isOpen = sidebar.classList.contains('mobile-open');
            isOpen ? closeSidebar() : openSidebar();
        });
        sidebarOverlay.addEventListener('click', closeSidebar);
        sidebarCloseBtn?.addEventListener('click', closeSidebar);
    }

    // ===== Planos (Investir/Depositar) — dados completos, usados no modal
    // de Depósito e para registrar a compra na Carteira =====
    const PLANOS_INFO = {
        'teste-20': { nome: 'YACHT Teste', valor: 20, retornoDiario: 2.5, duracaoDias: 4 },
        'irwin-50': { nome: 'YACHT IRWIN', valor: 50, retornoDiario: 3.35, duracaoDias: 30 },
        'hunter-150': { nome: 'YACHT HUNTER', valor: 150, retornoDiario: 9, duracaoDias: 30 }
    };

    function formatarMoeda(valor) {
        return `R$ ${(valor || 0).toFixed(2).replace('.', ',')}`;
    }

    function formatarDataHora(timestamp) {
        const d = new Date(timestamp);
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function formatarMesAno(timestamp) {
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const d = new Date(timestamp);
        return `${meses[d.getMonth()]}/${d.getFullYear()}`;
    }

    function atualizarLabelPlanoSelecionado() {
        const selectEl = document.getElementById('depositPlanoSelect');
        const hiddenInput = document.getElementById('depositPlano');
        if (hiddenInput) hiddenInput.value = selectEl ? selectEl.value : 'teste-20';
    }

    // Controla o campo de plano do modal de Depósito nos dois modos:
    // - bloqueado=true  → usado pelo "Alugar" (Investir): mostra o plano
    //   travado, sem opção de trocar.
    // - bloqueado=false → usado pelo "Depositar" genérico (Início): mostra
    //   o <select> para a pessoa escolher entre os 3 planos.
    function definirModoPlanoDeposito(bloqueado, planoValor) {
        const selectEl = document.getElementById('depositPlanoSelect');
        const displayEl = document.getElementById('depositPlanoNome');
        const hiddenInput = document.getElementById('depositPlano');

        if (bloqueado) {
            const chave = PLANOS_INFO[planoValor] ? planoValor : 'teste-20';
            const info = PLANOS_INFO[chave];
            if (displayEl) {
                displayEl.textContent = `${info.nome} — ${formatarMoeda(info.valor)}`;
                displayEl.style.display = 'block';
            }
            if (selectEl) selectEl.style.display = 'none';
            if (hiddenInput) hiddenInput.value = chave;
        } else {
            if (selectEl) {
                selectEl.style.display = '';
                selectEl.value = 'teste-20';
            }
            if (displayEl) displayEl.style.display = 'none';
            if (hiddenInput) hiddenInput.value = selectEl ? selectEl.value : 'teste-20';
        }
    }

    const depositPlanoSelect = document.getElementById('depositPlanoSelect');
    if (depositPlanoSelect) {
        depositPlanoSelect.addEventListener('change', atualizarLabelPlanoSelecionado);
    }

    // Registra o depósito como PENDENTE no Realtime Database assim que o
    // Pix é gerado. O plano só é ativado na Carteira depois que um admin
    // aprovar esse depósito no painel /admin.html (evita ativar plano
    // antes do dinheiro realmente cair).
    function registrarDepositoPendente(planoValor) {
        const user = firebaseAuth.currentUser;
        if (!user) return;
        const chave = PLANOS_INFO[planoValor] ? planoValor : 'teste-20';
        const info = PLANOS_INFO[chave];
        firebaseDb.ref('deposits').push({
            uid: user.uid,
            userName: currentUserName || user.email || user.uid,
            planoKey: chave,
            planoNome: info.nome,
            valor: info.valor,
            retornoDiario: info.retornoDiario,
            duracaoDias: info.duracaoDias,
            status: 'pending',
            createdAt: Date.now()
        });
    }

    // Preenche a página Carteira (totais + tabela de planos ativos) a
    // partir dos dados de users/{uid}/planos no Realtime Database.
    // Também atualiza o "Rendimento Acumulado" do Início, que usa a
    // mesma base de cálculo.
    function renderizarCarteira(planosData) {
        const tbody = document.getElementById('planosAtivosBody');
        const totalInvestidoEl = document.getElementById('totalInvestidoPlanos');
        const rendimentoTotalEl = document.getElementById('rendimentoTotalPlanos');
        const rendimentoInicioEl = document.getElementById('rendimentoAcumuladoInicio');
        if (!tbody) return;

        const planos = planosData ? Object.values(planosData) : [];

        if (!planos.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="muted">Você ainda não possui planos ativos. Vá até <strong>Investir</strong> para alugar seu primeiro Yacht.</td></tr>';
            if (totalInvestidoEl) totalInvestidoEl.textContent = formatarMoeda(0);
            if (rendimentoTotalEl) rendimentoTotalEl.textContent = formatarMoeda(0);
            if (rendimentoInicioEl) rendimentoInicioEl.textContent = formatarMoeda(0);
            return;
        }

        let totalInvestido = 0;
        let rendimentoTotal = 0;

        const linhas = planos.map((plano) => {
            const diasPassados = Math.floor((Date.now() - plano.dataAtivacao) / 86400000);
            const diasContados = Math.max(0, Math.min(diasPassados, plano.duracaoDias));
            const rendimentoAcumulado = diasContados * plano.retornoDiario;
            const finalizado = diasPassados >= plano.duracaoDias;

            totalInvestido += plano.valorInvestido;
            rendimentoTotal += rendimentoAcumulado;

            const dataFormatada = new Date(plano.dataAtivacao).toLocaleDateString('pt-BR');
            const statusBadge = finalizado
                ? '<span class="badge badge-info">Concluído</span>'
                : '<span class="badge badge-success">Ativo</span>';

            return `
                <tr>
                    <td>${dataFormatada}</td>
                    <td>${plano.nome} — ${formatarMoeda(plano.valorInvestido)}</td>
                    <td>${formatarMoeda(plano.retornoDiario)}</td>
                    <td>${formatarMoeda(rendimentoAcumulado)}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = linhas;
        if (totalInvestidoEl) totalInvestidoEl.textContent = formatarMoeda(totalInvestido);
        if (rendimentoTotalEl) rendimentoTotalEl.textContent = formatarMoeda(rendimentoTotal);
        if (rendimentoInicioEl) rendimentoInicioEl.textContent = formatarMoeda(rendimentoTotal);
    }

    // Preenche o Extrato de Recebimentos: cada dia já rendido de cada plano
    // ativo vira uma linha (mesma base de dados/cálculo da Carteira).
    function renderizarExtrato(planosData, saquesDoUsuario, depositosDoUsuario) {
        const tbody = document.getElementById('extratoBody');
        if (!tbody) return;

        const planos = planosData ? Object.values(planosData) : [];
        const entradas = [];

        planos.forEach((plano) => {
            const diasPassados = Math.floor((Date.now() - plano.dataAtivacao) / 86400000);
            const diasContados = Math.max(0, Math.min(diasPassados, plano.duracaoDias));

            for (let dia = 1; dia <= diasContados; dia++) {
                entradas.push({
                    data: plano.dataAtivacao + dia * 86400000,
                    descricao: `Rendimento Diário — ${plano.nome}`,
                    valor: plano.retornoDiario
                });
            }
        });

        // Saques pagos entram como saída (valor negativo) no extrato —
        // atualiza sozinho assim que o admin marca como pago.
        (saquesDoUsuario || []).forEach((saque) => {
            if (saque.status !== 'paid') return;
            entradas.push({
                data: saque.paidAt || saque.createdAt,
                descricao: 'Saque via Pix',
                valor: -saque.valor
            });
        });

        // Depósitos aprovados/rejeitados também aparecem — dá visibilidade
        // pro usuário sem ele precisar perguntar no suporte.
        (depositosDoUsuario || []).forEach((deposito) => {
            if (deposito.status === 'approved') {
                entradas.push({
                    data: deposito.resolvedAt || deposito.createdAt,
                    descricao: `Depósito aprovado — ${deposito.planoNome}`,
                    valor: deposito.valor
                });
            } else if (deposito.status === 'rejected') {
                entradas.push({
                    data: deposito.resolvedAt || deposito.createdAt,
                    descricao: `Depósito rejeitado — ${deposito.planoNome}`,
                    valor: 0
                });
            }
        });

        if (!entradas.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="muted">Nenhuma movimentação registrada ainda.</td></tr>';
            return;
        }

        entradas.sort((a, b) => b.data - a.data);

        tbody.innerHTML = entradas.map((entrada) => {
            const dataObj = new Date(entrada.data);
            const dataHora = dataObj.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const mesAno = dataObj.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
            const valorFormatado = entrada.valor < 0
                ? `- ${formatarMoeda(Math.abs(entrada.valor))}`
                : formatarMoeda(entrada.valor);

            return `
                <tr>
                    <td>${dataHora}</td>
                    <td>${mesAno}</td>
                    <td>${entrada.descricao}</td>
                    <td>${valorFormatado}</td>
                </tr>
            `;
        }).join('');
    }

    // Preenche a tabela "Membros da Rede" e o "Total de Indicados" (Equipe)
    // a partir de referrals/{uid} no Realtime Database.
    function renderizarMembrosRede(referralsData) {
        const tbody = document.getElementById('membrosRedeBody');
        const totalIndicadosEl = document.getElementById('totalIndicados');
        if (!tbody) return;

        const membros = referralsData ? Object.values(referralsData) : [];

        if (totalIndicadosEl) totalIndicadosEl.textContent = String(membros.length);

        if (!membros.length) {
            tbody.innerHTML = '<tr><td colspan="2" class="muted">Nenhum membro na sua rede ainda. Compartilhe seu link de indicação para começar.</td></tr>';
            return;
        }

        membros.sort((a, b) => b.createdAt - a.createdAt);

        tbody.innerHTML = membros.map((membro) => {
            const dataFormatada = new Date(membro.createdAt).toLocaleDateString('pt-BR');
            return `
                <tr>
                    <td>${dataFormatada}</td>
                    <td>${membro.referredName || '-'}</td>
                </tr>
            `;
        }).join('');
    }

    // Soma as comissões recebidas (commissions/{uid}) e atualiza o card
    // "Comissões (1º Nível - 10%)" tanto da Equipe quanto do Início.
    function renderizarComissoes(commissionsData) {
        const comissaoEl = document.getElementById('comissaoNivel1');
        const comissaoInicioEl = document.getElementById('comissaoNivel1Inicio');
        if (!comissaoEl && !comissaoInicioEl) return;
        const comissoes = commissionsData ? Object.values(commissionsData) : [];
        const total = comissoes.reduce((soma, c) => soma + (c.valor || 0), 0);
        if (comissaoEl) comissaoEl.textContent = formatarMoeda(total);
        if (comissaoInicioEl) comissaoInicioEl.textContent = formatarMoeda(total);
    }

    // Rótulos amigáveis para o tipo de chave PIX, usados no modal de Saque
    const PIX_TIPO_LABEL = {
        cpf: 'CPF',
        email: 'E-mail',
        telefone: 'Telefone',
        aleatoria: 'Chave Aleatória'
    };

    // Salva Nome Completo + Chave PIX (Perfil) no Realtime Database.
    // É esse cadastro que passa a aparecer no modal de Saque (Início).
    window.salvarPerfil = function () {
        const user = firebaseAuth.currentUser;
        if (!user) return;

        const nomeInput = document.getElementById('perfilNomeCompleto');
        const tipoPixInput = document.getElementById('perfilTipoPix');
        const chavePixInput = document.getElementById('perfilChavePix');

        const chavePix = chavePixInput ? chavePixInput.value.trim() : '';
        if (!chavePix) {
            showToast('warning', 'Chave PIX obrigatória', 'Informe sua chave PIX para poder solicitar saques.');
            chavePixInput?.focus();
            return;
        }

        firebaseDb.ref('users/' + user.uid).update({
            fullName: nomeInput ? nomeInput.value.trim() : '',
            pixTipo: tipoPixInput ? tipoPixInput.value : 'cpf',
            pixChave: chavePix
        }).then(() => {
            showToast('success', 'Alterações salvas!');
        }).catch((err) => {
            console.error('Erro ao salvar perfil:', err);
            showToast('error', 'Erro ao salvar', 'Tente novamente em instantes.');
        });
    };

    // ===== Toasts (substitui os alert() nativos do navegador) =====
    window.showToast = function (type, title, message) {
        const container = document.getElementById('toastContainer');
        if (!container) {
            alert(message ? `${title}\n${message}` : title);
            return;
        }

        const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type || 'info'}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-body">
                <div class="toast-title"></div>
                ${message ? '<div class="toast-message"></div>' : ''}
            </div>
            <button class="toast-close" type="button" aria-label="Fechar">&times;</button>
        `;
        toast.querySelector('.toast-title').textContent = title;
        if (message) {
            toast.querySelector('.toast-message').textContent = message;
        }

        const removeToast = () => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 260);
        };

        toast.querySelector('.toast-close').addEventListener('click', removeToast);
        setTimeout(removeToast, 4000);

        container.appendChild(toast);
    };

    // ===== QR Code Pix (modal de Depositar) =====
    window.gerarQrCodeDeposito = function () {
        const cpfInput = document.getElementById('depositCpf');
        const telefoneInput = document.getElementById('depositTelefone');

        if (!cpfInput.value.trim() || !telefoneInput.value.trim()) {
            showToast('warning', 'Campos obrigatórios', 'Preencha CPF e Telefone para gerar o Pix.');
            return;
        }

        // Código Pix "copia e cola" (exemplo — substituir pela integração real do gateway)
        const pixCode = '00020126580014BR.GOV.BCB.PIX2572qrcode.cartwavehub.com.br/v2/qr/cob/945c7fe1-5dc0-49a1-be8d-041bf95642e05204000053039865802BR5925PLATAFORMA6009SAO PAULO62070503***6304ABCD';

        const qrContainer = document.getElementById('qrcodeCanvas');
        qrContainer.innerHTML = '';

        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: pixCode,
                width: 200,
                height: 200,
                colorDark: '#0e1420',
                colorLight: '#ffffff'
            });
        } else {
            console.error('Biblioteca QRCode não carregada.');
            qrContainer.innerText = 'Não foi possível gerar o QR Code.';
        }

        document.getElementById('depositPixCode').innerText = pixCode;
        document.getElementById('depositQrView').style.display = 'block';

        const modalCard = document.querySelector('#depositModal .modal-card');
        if (modalCard) modalCard.classList.add('has-scroll');

        // Registra o depósito como pendente — é isso que faz ele aparecer
        // em "Todos os Depósitos" no painel admin, aguardando aprovação
        registrarDepositoPendente(document.getElementById('depositPlano').value);
    };

    window.copiarCodigoPixDeposito = function () {
        const pixCode = document.getElementById('depositPixCode').innerText;
        navigator.clipboard.writeText(pixCode).then(() => showToast('success', 'Código Pix copiado!'));
    };

    // ===== Solicitação de Saque (modal de Sacar) =====
    const SAQUE_VALOR_MINIMO = 30;

    // Saldo do usuário mantido em memória, atualizado em tempo real pelo
    // listener do Firebase Realtime Database (ver bloco do dashboard abaixo).
    let currentBalance = 0;
    // uid de quem indicou o usuário logado (se houver), usado para creditar
    // a comissão de 1º nível quando este usuário ativa um plano.
    let referredByUid = null;
    // Chave PIX cadastrada em Perfil (null enquanto não houver nenhuma) —
    // usada para exibir no modal de Saque e bloquear o pedido sem chave.
    let chavePixCadastrada = null;
    // Nome/e-mail do usuário logado, usado para identificar quem fez o
    // pedido nas tabelas do painel admin (Saques/Depósitos).
    let currentUserName = null;

    window.solicitarSaque = function () {
        const valorInput = document.getElementById('sacarValor');
        const valorTexto = valorInput.value.trim();
        const valor = parseFloat(valorTexto);

        if (!chavePixCadastrada) {
            showToast('warning', 'Chave PIX necessária', 'Cadastre uma chave PIX em Perfil antes de solicitar o saque.');
            return;
        }

        if (!valorTexto || isNaN(valor)) {
            showToast('warning', 'Valor obrigatório', 'Digite o valor que deseja sacar.');
            valorInput.focus();
            return;
        }

        if (valor < SAQUE_VALOR_MINIMO) {
            showToast('warning', 'Valor mínimo não atingido', `O valor mínimo para saque é R$ ${SAQUE_VALOR_MINIMO.toFixed(2).replace('.', ',')}.`);
            valorInput.focus();
            return;
        }

        if (valor > currentBalance) {
            showToast('warning', 'Saldo insuficiente', 'O valor solicitado é maior que o seu saldo disponível.');
            valorInput.focus();
            return;
        }

        // Registra o saque como pendente — é isso que faz ele aparecer em
        // "Todos os Saques" no painel admin. O saldo só é debitado quando
        // o admin marcar como pago (evita descontar antes de pagar de fato).
        const user = firebaseAuth.currentUser;
        firebaseDb.ref('withdrawals').push({
            uid: user.uid,
            userName: currentUserName || user.email || user.uid,
            pixChave: chavePixCadastrada,
            valor,
            status: 'pending',
            createdAt: Date.now()
        });

        showToast('success', 'Solicitação de saque enviada!', `Valor: R$ ${valor.toFixed(2).replace('.', ',')}`);
        valorInput.value = '';
        closeModal('sacarModal');
    };

    // Tratamento do formulário de Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof Auth === 'undefined') {
                console.error('Auth não está definido. Verifique se o script de autenticação foi carregado antes deste arquivo.');
                showToast('error', 'Erro ao carregar o sistema de login', 'Tente recarregar a página.');
                return;
            }
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (!usernameInput || !passwordInput) {
                console.error('Campos de usuário/senha não encontrados no formulário de login.');
                showToast('error', 'Erro no formulário', 'Tente recarregar a página.');
                return;
            }
            const user = usernameInput.value;
            const pass = passwordInput.value;
            Auth.login(user, pass)
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch((err) => {
                    console.error('Erro ao tentar login:', err);
                    showToast('error', 'Preencha os campos corretamente!');
                });
        });
    }

    // Tratamento do formulário de Registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof Auth === 'undefined') {
                console.error('Auth não está definido. Verifique se o script de autenticação foi carregado antes deste arquivo.');
                showToast('error', 'Erro ao carregar o sistema de cadastro', 'Tente recarregar a página.');
                return;
            }
            const regUserInput = document.getElementById('regUser');
            const regPassInput = document.getElementById('regPass');
            if (!regUserInput || !regPassInput) {
                console.error('Campos de usuário/senha não encontrados no formulário de registro.');
                showToast('error', 'Erro no formulário', 'Tente recarregar a página.');
                return;
            }
            const user = regUserInput.value;
            const pass = regPassInput.value;
            Auth.register(user, user, pass)
                .then(() => {
                    showToast('success', 'Cadastro realizado com sucesso!', 'Você ganhou R$ 5,00.');
                    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
                })
                .catch((err) => {
                    console.error('Erro ao tentar cadastro:', err);
                    showToast('error', 'Erro ao realizar cadastro.');
                });
        });
    }

    // Se estiver na index (dashboard), protege a rota e escuta os dados do usuário
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
        if (typeof Auth !== 'undefined') {
            Auth.protectRoute((user, userRef) => {
                // Escuta em tempo real o perfil (nome, saldo) no Realtime Database
                userRef.on('value', (snapshot) => {
                    const data = snapshot.val() || {};
                    const balanceValue = typeof data.balance === 'number' ? data.balance : (parseFloat(data.balance) || 0);
                    currentBalance = balanceValue;

                    const formattedBalance = balanceValue.toFixed(2).replace('.', ',');

                    // Atualiza o saldo em todos os lugares onde ele aparece (Início, Carteira, Perfil)
                    const balanceTargets = ['userBalance', 'sacarSaldoDisponivel'];
                    balanceTargets.forEach((id) => {
                        const el = document.getElementById(id);
                        if (el) el.innerText = `R$ ${formattedBalance}`;
                    });

                    // Preenche dados do Perfil
                    const perfilUsuario = document.getElementById('perfilUsuario');
                    const perfilSaldo = document.getElementById('perfilSaldo');
                    const perfilNomeCompleto = document.getElementById('perfilNomeCompleto');
                    const perfilTipoPix = document.getElementById('perfilTipoPix');
                    const perfilChavePix = document.getElementById('perfilChavePix');
                    if (perfilUsuario) {
                        perfilUsuario.innerText = data.fullName || user.email || '-';
                    }
                    currentUserName = data.fullName || user.email || user.uid;
                    if (perfilSaldo) {
                        perfilSaldo.innerText = `R$ ${formattedBalance}`;
                    }
                    if (perfilNomeCompleto && !perfilNomeCompleto.value) {
                        perfilNomeCompleto.value = data.fullName || '';
                    }
                    // Só preenche uma vez (na primeira leitura), pra não
                    // sobrescrever o que a pessoa está digitando agora.
                    if (perfilTipoPix && !perfilTipoPix.dataset.carregado) {
                        perfilTipoPix.value = data.pixTipo || 'cpf';
                        perfilTipoPix.dataset.carregado = 'true';
                    }
                    if (perfilChavePix && !perfilChavePix.value) {
                        perfilChavePix.value = data.pixChave || '';
                    }

                    // Atualiza a chave PIX exibida no modal de Saque (Início)
                    chavePixCadastrada = data.pixChave || null;
                    const sacarChavePixEl = document.getElementById('sacarChavePix');
                    if (sacarChavePixEl) {
                        if (chavePixCadastrada) {
                            const tipoLabel = PIX_TIPO_LABEL[data.pixTipo] || 'Chave PIX';
                            sacarChavePixEl.textContent = `${tipoLabel}: ${chavePixCadastrada}`;
                            sacarChavePixEl.classList.remove('withdraw-key-missing');
                            sacarChavePixEl.classList.add('withdraw-key-set');
                        } else {
                            sacarChavePixEl.textContent = 'Nenhuma chave cadastrada — vá em Perfil e cadastre uma.';
                            sacarChavePixEl.classList.add('withdraw-key-missing');
                            sacarChavePixEl.classList.remove('withdraw-key-set');
                        }
                    }

                    // Guarda quem indicou este usuário, usado ao ativar um plano
                    referredByUid = data.referredBy || null;

                    // Monta o link de indicação real (Equipe) com o código único do usuário
                    const refLinkInput = document.getElementById('refLink');
                    if (refLinkInput && data.refCode) {
                        refLinkInput.value = `${window.location.origin}/register.html?ref=${data.refCode}`;
                    }
                });

                // Escuta em tempo real os planos comprados (Carteira e Extrato)
                let ultimoPlanosData = null;
                let ultimosSaquesUsuario = [];
                let ultimosDepositosUsuario = [];

                userRef.child('planos').on('value', (snapshot) => {
                    ultimoPlanosData = snapshot.val();
                    renderizarCarteira(ultimoPlanosData);
                    renderizarExtrato(ultimoPlanosData, ultimosSaquesUsuario, ultimosDepositosUsuario);
                });

                // As regras do Firebase só deixam um usuário comum ler
                // 'withdrawals'/'deposits' via query filtrada pelo próprio
                // uid (não o nó inteiro, que é exclusivo do admin) — por
                // isso usamos orderByChild('uid').equalTo(...) aqui.
                firebaseDb.ref('withdrawals').orderByChild('uid').equalTo(user.uid).on('value', (snapshot) => {
                    const meusRegistros = snapshot.val() || {};
                    ultimosSaquesUsuario = Object.values(meusRegistros);
                    renderizarExtrato(ultimoPlanosData, ultimosSaquesUsuario, ultimosDepositosUsuario);
                });

                firebaseDb.ref('deposits').orderByChild('uid').equalTo(user.uid).on('value', (snapshot) => {
                    const meusRegistros = snapshot.val() || {};
                    ultimosDepositosUsuario = Object.values(meusRegistros);
                    renderizarExtrato(ultimoPlanosData, ultimosSaquesUsuario, ultimosDepositosUsuario);
                });

                // Escuta em tempo real os indicados e as comissões (Equipe)
                firebaseDb.ref('referrals/' + user.uid).on('value', (snapshot) => {
                    renderizarMembrosRede(snapshot.val());
                });
                firebaseDb.ref('commissions/' + user.uid).on('value', (snapshot) => {
                    renderizarComissoes(snapshot.val());
                });

                // Rendimento diário e status "Concluído" dependem do tempo
                // decorrido — recalcula periodicamente para não precisar
                // recarregar a página para ver a virada do dia.
                setInterval(() => {
                    renderizarCarteira(ultimoPlanosData);
                    renderizarExtrato(ultimoPlanosData, ultimosSaquesUsuario, ultimosDepositosUsuario);
                }, 60000);
            });
        } else {
            console.error('Auth não está definido. A rota do dashboard não pôde ser protegida.');
        }

        // ===== Navegação da Sidebar (troca de seções) =====
        const navItems = document.querySelectorAll('.nav-item[data-section]');
        const sections = document.querySelectorAll('.page-section');
        const mobileTopbarTitle = document.getElementById('mobileTopbarTitle');

        function showSection(sectionKey) {
            sections.forEach((section) => {
                section.classList.toggle('active', section.id === `section-${sectionKey}`);
            });
            navItems.forEach((item) => {
                item.classList.toggle('active', item.dataset.section === sectionKey);
            });
            // Mantém o título do topbar mobile em sincronia com a seção ativa
            if (mobileTopbarTitle) {
                const activeItem = document.querySelector(`.nav-item[data-section="${sectionKey}"]`);
                const label = activeItem?.querySelector('span:not(.nav-icon)')?.textContent;
                if (label) mobileTopbarTitle.textContent = label;
            }
            // Lembra a última seção visitada
            localStorage.setItem('yacht_last_section', sectionKey);
        }

        navItems.forEach((item) => {
            item.addEventListener('click', () => {
                showSection(item.dataset.section);
                // No mobile, a navegação acontece dentro da gaveta — fecha ao escolher uma seção
                closeSidebar();
            });
        });

        // Restaura a última seção visitada (padrão: início)
        const lastSection = localStorage.getItem('yacht_last_section');
        if (lastSection && document.getElementById(`section-${lastSection}`)) {
            showSection(lastSection);
        }
    }
});
