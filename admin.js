document.addEventListener('DOMContentLoaded', () => {
    if (typeof Auth === 'undefined') {
        console.error('Auth não está definido. Verifique se auth.js foi carregado antes deste arquivo.');
        return;
    }

    // Mesma tabela de planos usada no script.js — precisa ficar igual nos
    // dois arquivos, já que é o que traduz a "chave" do plano (ex:
    // 'irwin-50') em nome/valor/retorno/duração.
    const PLANOS_INFO = {
        'teste-20': { nome: 'YACHT Teste', valor: 20, retornoDiario: 2.5, duracaoDias: 4 },
        'irwin-50': { nome: 'YACHT IRWIN', valor: 50, retornoDiario: 3.35, duracaoDias: 30 },
        'hunter-150': { nome: 'YACHT HUNTER', valor: 150, retornoDiario: 9, duracaoDias: 30 }
    };

    function formatarMoeda(valor) {
        return `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function formatarDataHora(timestamp) {
        if (!timestamp) return '-';
        const d = new Date(timestamp);
        return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // Evita que nome/e-mail digitados por um usuário quebrem o HTML da
    // tabela quando inseridos via innerHTML.
    function escapeHtml(texto) {
        const div = document.createElement('div');
        div.textContent = texto == null ? '' : String(texto);
        return div.innerHTML;
    }

    function setText(id, texto) {
        const el = document.getElementById(id);
        if (el) el.textContent = texto;
    }

    // ===== Estado em memória, populado pelos listeners do Firebase =====
    let usersMap = {};        // uid -> { fullName, email, balance, isAdmin, referredBy, planos }
    let commissionsMap = {};  // uid -> total de comissão acumulada
    let saquesMap = {};       // id -> registro de withdrawals/{id}
    let depositosMap = {};    // id -> registro de deposits/{id}
    let pendenciasMap = {};   // id -> registro de planPendencies/{id}
    let filtroUsuarios = '';

    // ===== Renderização =====
    function renderStats() {
        const saquesPendentesTotal = Object.values(saquesMap)
            .filter((s) => s.status === 'pending')
            .reduce((soma, s) => soma + (s.valor || 0), 0);

        const depositosPendentesTotal = Object.values(depositosMap)
            .filter((d) => d.status === 'pending')
            .reduce((soma, d) => soma + (d.valor || 0), 0);

        const pendenciasAbertas = Object.values(pendenciasMap)
            .filter((p) => p.status !== 'resolved').length;

        const saldoTotal = Object.values(usersMap)
            .reduce((soma, u) => soma + (u.balance || 0), 0);

        setText('statSaquesPendentes', formatarMoeda(saquesPendentesTotal));
        setText('statDepositosPendentes', formatarMoeda(depositosPendentesTotal));
        setText('statPendenciasPlano', String(pendenciasAbertas));
        setText('statSaldoTotal', formatarMoeda(saldoTotal));
        setText('statUsuariosCadastrados', String(Object.keys(usersMap).length));
    }

    function renderUsuarios() {
        const tbody = document.getElementById('usuariosBody');
        if (!tbody) return;

        const termo = filtroUsuarios.trim().toLowerCase();
        const linhas = Object.entries(usersMap)
            .filter(([, u]) => {
                if (!termo) return true;
                const nome = (u.fullName || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                return nome.includes(termo) || email.includes(termo);
            })
            .map(([uid, u]) => {
                const comissao = commissionsMap[uid] || 0;
                const isAdmin = !!u.isAdmin;
                return `
                    <tr>
                        <td>${escapeHtml(u.fullName || '-')}</td>
                        <td>${escapeHtml(u.email || '-')}</td>
                        <td>${formatarMoeda(u.balance)}</td>
                        <td>${formatarMoeda(comissao)}</td>
                        <td>
                            ${isAdmin ? '<span class="badge badge-success">Admin</span>' : '<span class="muted">—</span>'}
                        </td>
                    </tr>
                `;
            });

        tbody.innerHTML = linhas.length
            ? linhas.join('')
            : '<tr><td colspan="5" class="muted">Nenhum usuário encontrado.</td></tr>';
    }

    function renderPendenciasPlano() {
        const tbody = document.getElementById('pendenciasPlanoBody');
        if (!tbody) return;

        const abertas = Object.entries(pendenciasMap).filter(([, p]) => p.status !== 'resolved');

        tbody.innerHTML = abertas.length
            ? abertas.map(([id, p]) => `
                <tr>
                    <td>${formatarDataHora(p.createdAt)}</td>
                    <td>${escapeHtml(p.userName || p.uid)}</td>
                    <td>${formatarMoeda(p.valor)}</td>
                    <td>${escapeHtml(p.observacao || '-')}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-compact" data-action="criar-plano-mesmo-assim" data-id="${id}">Criar plano mesmo assim</button>
                            <button class="btn btn-compact btn-outline" data-action="resolver-pendencia" data-id="${id}">Marcar resolvido sem criar</button>
                        </div>
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" class="muted">Nenhuma pendência de plano no momento.</td></tr>';
    }

    function badgeStatus(status, mapaTextos) {
        const textos = mapaTextos || { pending: 'Pendente', paid: 'Pago', approved: 'Aprovado', rejected: 'Rejeitado' };
        const classes = { pending: 'badge-warning', paid: 'badge-success', approved: 'badge-success', rejected: 'badge-danger' };
        const classe = classes[status] || 'badge-info';
        const texto = textos[status] || status;
        return `<span class="badge ${classe}">${texto}</span>`;
    }

    function renderSaques() {
        const tbody = document.getElementById('saquesBody');
        if (!tbody) return;

        const registros = Object.entries(saquesMap).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

        tbody.innerHTML = registros.length
            ? registros.map(([id, s]) => `
                <tr>
                    <td>${formatarDataHora(s.createdAt)}</td>
                    <td>${escapeHtml(s.userName || s.uid)}</td>
                    <td>${escapeHtml(s.pixChave || '-')}</td>
                    <td>${formatarMoeda(s.valor)}</td>
                    <td>${badgeStatus(s.status)}</td>
                    <td>
                        ${s.status === 'pending' ? `
                            <div class="table-actions">
                                <button class="btn btn-compact btn-success" data-action="marcar-saque-pago" data-id="${id}">Marcar como pago</button>
                                <button class="btn btn-compact btn-danger" data-action="rejeitar-saque" data-id="${id}">Rejeitar</button>
                            </div>
                        ` : '<span class="muted">—</span>'}
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="6" class="muted">Nenhum saque registrado ainda.</td></tr>';
    }

    function renderDepositos() {
        const tbody = document.getElementById('depositosBody');
        if (!tbody) return;

        const registros = Object.entries(depositosMap).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

        tbody.innerHTML = registros.length
            ? registros.map(([id, d]) => `
                <tr>
                    <td>${formatarDataHora(d.createdAt)}</td>
                    <td>${escapeHtml(d.userName || d.uid)}</td>
                    <td>${escapeHtml(d.planoNome || '-')} — ${formatarMoeda(d.valor)}</td>
                    <td>${badgeStatus(d.status)}</td>
                    <td>
                        ${d.status === 'pending' ? `
                            <div class="table-actions">
                                <button class="btn btn-compact btn-success" data-action="aprovar-deposito" data-id="${id}">Aprovar</button>
                                <button class="btn btn-compact btn-danger" data-action="rejeitar-deposito" data-id="${id}">Rejeitar</button>
                            </div>
                        ` : '<span class="muted">—</span>'}
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" class="muted">Nenhum depósito registrado ainda.</td></tr>';
    }

    // ===== Regras de negócio =====

    // Verifica se o usuário já tem, neste momento, um plano ATIVO
    // (dentro da duração) com o mesmo valor investido do depósito.
    function temPlanoAtivoMesmoValor(uid, valor) {
        const user = usersMap[uid];
        if (!user || !user.planos) return false;
        return Object.values(user.planos).some((plano) => {
            const diasPassados = Math.floor((Date.now() - plano.dataAtivacao) / 86400000);
            const ativo = diasPassados < plano.duracaoDias;
            return ativo && Math.abs((plano.valorInvestido || 0) - valor) < 0.01;
        });
    }

    // Cria o plano na carteira do usuário e credita a comissão de 1º
    // nível (10%) para quem o indicou, se houver.
    function criarPlanoParaUsuario(uid, info) {
        firebaseDb.ref('users/' + uid + '/planos').push({
            planoKey: info.planoKey || null,
            nome: info.nome,
            valorInvestido: info.valor,
            retornoDiario: info.retornoDiario,
            duracaoDias: info.duracaoDias,
            dataAtivacao: Date.now()
        });

        const referredByUid = usersMap[uid] ? usersMap[uid].referredBy : null;
        if (referredByUid) {
            const valorComissao = info.valor * 0.10;
            firebaseDb.ref('commissions/' + referredByUid).push({
                fromUid: uid,
                fromName: (usersMap[uid] && (usersMap[uid].fullName || usersMap[uid].email)) || uid,
                planoNome: info.nome,
                valor: valorComissao,
                createdAt: Date.now()
            });
            firebaseDb.ref('users/' + referredByUid + '/balance').transaction((saldoAtual) => (saldoAtual || 0) + valorComissao);
        }
    }

    function aprovarDeposito(depositId) {
        const deposito = depositosMap[depositId];
        if (!deposito || deposito.status !== 'pending') return;

        const info = PLANOS_INFO[deposito.planoKey] || {
            nome: deposito.planoNome,
            valor: deposito.valor,
            retornoDiario: deposito.retornoDiario || 0,
            duracaoDias: deposito.duracaoDias || 0,
            planoKey: deposito.planoKey
        };

        // FIX: checagem de duplicidade + criação do plano feitas de forma
        // atômica dentro de uma transaction no próprio nó do usuário. Antes,
        // temPlanoAtivoMesmoValor() lia o cache local usersMap e o plano era
        // criado depois com um push() separado — dois cliques (ou dois
        // admins) quase simultâneos podiam ambos ler o mesmo estado
        // desatualizado e passar pela checagem antes que o primeiro push()
        // fosse refletido, criando plano e comissão duplicados.
        firebaseDb.ref('users/' + deposito.uid).transaction((userData) => {
            if (userData === null) return userData;

            const planosAtuais = userData.planos ? Object.values(userData.planos) : [];
            const jaTemPlanoAtivo = planosAtuais.some((plano) => {
                const diasPassados = Math.floor((Date.now() - plano.dataAtivacao) / 86400000);
                const ativo = diasPassados < plano.duracaoDias;
                return ativo && Math.abs((plano.valorInvestido || 0) - info.valor) < 0.01;
            });

            if (jaTemPlanoAtivo) {
                // Aborta a transaction sem alterar nada — sinaliza pendência no .then().
                return;
            }

            if (!userData.planos) userData.planos = {};
            const novoPlanoId = firebaseDb.ref('users/' + deposito.uid + '/planos').push().key;
            userData.planos[novoPlanoId] = {
                planoKey: info.planoKey || null,
                nome: info.nome,
                valorInvestido: info.valor,
                retornoDiario: info.retornoDiario,
                duracaoDias: info.duracaoDias,
                dataAtivacao: Date.now()
            };
            return userData;
        }).then((resultado) => {
            if (!resultado.committed) {
                // Transaction abortada (plano duplicado detectado nesta execução) — cria a pendência.
                firebaseDb.ref('planPendencies').push({
                    uid: deposito.uid,
                    userName: deposito.userName,
                    valor: info.valor,
                    nome: info.nome,
                    retornoDiario: info.retornoDiario,
                    duracaoDias: info.duracaoDias,
                    planoKey: info.planoKey || deposito.planoKey || null,
                    observacao: 'Pix confirmado, mas o usuário já tinha um plano ativo desse valor no momento da confirmação.',
                    depositId,
                    status: 'open',
                    createdAt: Date.now()
                });
                firebaseDb.ref('deposits/' + depositId).update({ status: 'approved', resolvedAt: Date.now() });
                showToast('warning', 'Depósito aprovado com pendência', 'Usuário já tem plano ativo desse valor — decisão manual necessária em "Pendências de Plano".');
                return;
            }

            // Plano criado com sucesso — credita a comissão de indicação, se houver.
            const userDataFinal = resultado.snapshot.val();
            const referredByUid = userDataFinal ? userDataFinal.referredBy : null;
            if (referredByUid) {
                const valorComissao = info.valor * 0.10;
                firebaseDb.ref('commissions/' + referredByUid).push({
                    fromUid: deposito.uid,
                    fromName: (userDataFinal && (userDataFinal.fullName || userDataFinal.email)) || deposito.uid,
                    planoNome: info.nome,
                    valor: valorComissao,
                    createdAt: Date.now()
                });
                firebaseDb.ref('users/' + referredByUid + '/balance').transaction((saldoAtual) => (saldoAtual || 0) + valorComissao);
            }

            firebaseDb.ref('deposits/' + depositId).update({ status: 'approved', resolvedAt: Date.now() });
            showToast('success', 'Depósito aprovado!', 'O plano foi ativado na carteira do usuário.');
        }).catch((err) => {
            console.error('Erro ao aprovar depósito:', err);
            showToast('error', 'Erro ao aprovar depósito', 'Tente novamente em instantes.');
        });
    }

    function rejeitarDeposito(depositId) {
        firebaseDb.ref('deposits/' + depositId).update({ status: 'rejected', resolvedAt: Date.now() });
        showToast('info', 'Depósito rejeitado.');
    }

    function criarPlanoMesmoAssim(pendId) {
        const pend = pendenciasMap[pendId];
        if (!pend) return;
        criarPlanoParaUsuario(pend.uid, {
            nome: pend.nome,
            valor: pend.valor,
            retornoDiario: pend.retornoDiario,
            duracaoDias: pend.duracaoDias,
            planoKey: pend.planoKey
        });
        firebaseDb.ref('planPendencies/' + pendId).update({ status: 'resolved', resolvedAt: Date.now(), resolucao: 'plano_criado' });
        showToast('success', 'Plano criado mesmo com a duplicidade.');
    }

    function resolverPendenciaSemCriar(pendId) {
        firebaseDb.ref('planPendencies/' + pendId).update({ status: 'resolved', resolvedAt: Date.now(), resolucao: 'sem_criar' });
        showToast('info', 'Pendência marcada como resolvida — nenhum plano foi criado.');
    }

    function marcarSaquePago(id) {
        const saque = saquesMap[id];
        if (!saque || saque.status !== 'pending') return;

        // FIX: antes, a transaction sempre "committava" saturando o saldo em
        // 0 com Math.max(0, ...) mesmo quando o saldo era menor que o valor
        // do saque — e o saque era marcado como 'paid' de qualquer forma, ou
        // seja, o admin conseguia pagar mais do que o usuário tinha
        // disponível sem nenhum aviso. Agora a transaction aborta (retorna
        // undefined) se o saldo for insuficiente, e o status só é atualizado
        // se a transaction de fato for aplicada.
        firebaseDb.ref('users/' + saque.uid + '/balance').transaction((saldoAtual) => {
            const saldo = saldoAtual || 0;
            if (saldo < saque.valor) {
                return; // aborta a transaction — saldo insuficiente
            }
            return saldo - saque.valor;
        }).then((resultado) => {
            if (!resultado.committed) {
                showToast('warning', 'Saldo insuficiente', 'O saldo atual do usuário é menor que o valor do saque. Verifique antes de marcar como pago.');
                return;
            }
            firebaseDb.ref('withdrawals/' + id).update({ status: 'paid', paidAt: Date.now() });
            showToast('success', 'Saque marcado como pago!', 'O saldo do usuário foi atualizado.');
        }).catch((err) => {
            console.error('Erro ao marcar saque como pago:', err);
            showToast('error', 'Erro ao processar saque', 'Tente novamente em instantes.');
        });
    }

    function rejeitarSaque(id) {
        firebaseDb.ref('withdrawals/' + id).update({ status: 'rejected', resolvedAt: Date.now() });
        showToast('info', 'Saque rejeitado.');
    }

    // ===== Delegação de cliques nas tabelas (evita listener por linha) =====
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'aprovar-deposito') aprovarDeposito(id);
        if (action === 'rejeitar-deposito') rejeitarDeposito(id);
        if (action === 'criar-plano-mesmo-assim') criarPlanoMesmoAssim(id);
        if (action === 'resolver-pendencia') resolverPendenciaSemCriar(id);
        if (action === 'marcar-saque-pago') marcarSaquePago(id);
        if (action === 'rejeitar-saque') rejeitarSaque(id);
    });

    const buscaInput = document.getElementById('buscaUsuarios');
    if (buscaInput) {
        buscaInput.addEventListener('input', () => {
            filtroUsuarios = buscaInput.value;
            renderUsuarios();
        });
    }

    // ===== Listeners do Firebase =====
    function iniciarPainelAdmin() {
        firebaseDb.ref('users').on('value', (snapshot) => {
            usersMap = snapshot.val() || {};
            renderUsuarios();
            renderStats();
            // Reavalia pendências/depósitos também, já que usam dados de usersMap
            renderPendenciasPlano();
            renderDepositos();
        });

        firebaseDb.ref('commissions').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            commissionsMap = {};
            Object.entries(data).forEach(([uid, entradas]) => {
                commissionsMap[uid] = Object.values(entradas || {}).reduce((soma, c) => soma + (c.valor || 0), 0);
            });
            renderUsuarios();
        });

        firebaseDb.ref('withdrawals').on('value', (snapshot) => {
            saquesMap = snapshot.val() || {};
            renderSaques();
            renderStats();
        });

        firebaseDb.ref('deposits').on('value', (snapshot) => {
            depositosMap = snapshot.val() || {};
            renderDepositos();
            renderStats();
        });

        firebaseDb.ref('planPendencies').on('value', (snapshot) => {
            pendenciasMap = snapshot.val() || {};
            renderPendenciasPlano();
            renderStats();
        });
    }

    // ===== Controle de acesso: só entra quem tem users/{uid}/isAdmin === true =====
    Auth.protectRoute((user, userRef) => {
        userRef.once('value').then((snapshot) => {
            const data = snapshot.val() || {};
            if (!data.isAdmin) {
                showToast('error', 'Acesso restrito', 'Você não tem permissão para acessar o painel administrativo.');
                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
                return;
            }
            iniciarPainelAdmin();
        }).catch((err) => {
            console.error('Erro ao verificar permissão de admin:', err);
            window.location.href = 'index.html';
        });
    });
});
