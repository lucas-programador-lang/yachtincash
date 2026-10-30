document.addEventListener('DOMContentLoaded', () => {
    if (typeof Auth === 'undefined') {
        console.error('Auth não está definido. Verifique se auth.js foi carregado antes deste arquivo.');
        return;
    }

    // Mesma tabela de planos usada no script.js — precisa ficar igual nos
    // dois arquivos, já que é o que traduz a "chave" do plano (ex:
    // 'irwin-50') em nome/valor/retorno/duração.
    const PLANOS_INFO = {
        'vip1-50': { nome: 'Plano Iniciante', valor: 50, retornoDiario: 1.25, duracaoDias: 24 },
        'vip2-70': { nome: 'Plano Bronze', valor: 70, retornoDiario: 1.75, duracaoDias: 24 },
        'vip3-150': { nome: 'Plano Prata', valor: 150, retornoDiario: 3.75, duracaoDias: 24 },
        'vip4-300': { nome: 'Plano Ouro', valor: 300, retornoDiario: 7.5, duracaoDias: 24 },
        'vip5-450': { nome: 'Plano Master', valor: 450, retornoDiario: 11.25, duracaoDias: 24 }
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
            .reduce((soma, u) => soma + (u.balance || 0) + (u.balanceComissao || 0), 0);

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
                        <td>${formatarMoeda((u.balance || 0) + (u.balanceComissao || 0))}</td>
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
                            <button class="btn btn-compact" data-action="criar-plano-mesmo-assim" data-id="${escapeHtml(id)}">Criar plano mesmo assim</button>
                            <button class="btn btn-compact btn-outline" data-action="resolver-pendencia" data-id="${escapeHtml(id)}">Marcar resolvido sem criar</button>
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
        return `<span class="badge ${classe}">${escapeHtml(texto)}</span>`;
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
                    <td>
                        ${formatarMoeda(s.valor)}
                        <div class="muted" style="font-size:12px; line-height:1.4;">
                            ${s.tipo === 'comissao' ? 'Comissão' : 'Rendimento'}
                            ${s.valorLiquido != null ? ' • Pagar ' + formatarMoeda(s.valorLiquido) + ' (taxa ' + formatarMoeda(s.taxa) + ')' : ''}
                        </div>
                    </td>
                    <td>${badgeStatus(s.status)}</td>
                    <td>
                        ${s.status === 'pending' ? `
                            <div class="table-actions">
                                <button class="btn btn-compact btn-success" data-action="marcar-saque-pago" data-id="${escapeHtml(id)}">Marcar como pago</button>
                                <button class="btn btn-compact btn-danger" data-action="rejeitar-saque" data-id="${escapeHtml(id)}">Rejeitar</button>
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
                                <button class="btn btn-compact btn-success" data-action="aprovar-deposito" data-id="${escapeHtml(id)}">Aprovar</button>
                                <button class="btn btn-compact btn-danger" data-action="rejeitar-deposito" data-id="${escapeHtml(id)}">Rejeitar</button>
                            </div>
                        ` : '<span class="muted">—</span>'}
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="5" class="muted">Nenhum depósito registrado ainda.</td></tr>';
    }

    // ===== Regras de negócio =====

    // Comissão de 1º nível = 10% do valor do plano. O arredondamento
    // garante os valores exatos exigidos pelas regras do Firebase
    // (R$ 2, R$ 5 e R$ 15), sem erro de ponto flutuante.
    function calcularComissao(valorPlano) {
        return Math.round(valorPlano * 10) / 100;
    }

    // Credita a comissão de 1º nível (10%) para quem indicou o usuário,
    // se houver. Lê o referredBy direto do banco (não do cache local)
    // para nunca usar um dado desatualizado.
    function creditarComissaoIndicacao(uidIndicado, info) {
        return firebaseDb.ref('users/' + uidIndicado).once('value').then((userSnap) => {
            const userData = userSnap.val() || {};
            const referredByUid = userData.referredBy;
            if (!referredByUid) return false;

            const valorComissao = calcularComissao(info.valor);

            return Promise.all([
                firebaseDb.ref('commissions/' + referredByUid).push({
                    fromUid: uidIndicado,
                    fromName: userData.fullName || userData.email || uidIndicado,
                    planoNome: info.nome,
                    valor: valorComissao,
                    createdAt: Date.now()
                }),
                firebaseDb.ref('users/' + referredByUid + '/balanceComissao')
                    .transaction((saldoAtual) => (saldoAtual || 0) + valorComissao)
            ]).then(() => true);
        });
    }

    // Aprova um depósito: marca como aprovado (de forma atômica, para
    // dois cliques/admins nunca aprovarem o mesmo depósito duas vezes),
    // cria o plano na carteira e credita a comissão de indicação.
    //
    // IMPORTANTE: as transactions são feitas em nós FILHOS de users/{uid}
    // (planos, balance), nunca em users/{uid} inteiro — as regras do
    // Realtime Database só definem .write por campo, então uma escrita
    // no nó pai seria recusada com permission_denied.
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

        const statusRef = firebaseDb.ref('deposits/' + depositId + '/status');
        const planosRef = firebaseDb.ref('users/' + deposito.uid + '/planos');
        const novoPlanoId = planosRef.push().key;

        // Só vira true depois que o plano foi gravado — a partir daí
        // NÃO devolvemos o depósito para "pending" em caso de erro, senão
        // um novo clique tentaria criar o plano de novo.
        let planoJaCriado = false;

        // 1) Reserva o depósito: só continua quem conseguir trocar
        //    'pending' por 'approved' primeiro.
        statusRef.transaction((statusAtual) => {
            return statusAtual === 'pending' ? 'approved' : undefined;
        }).then((reserva) => {
            if (!reserva.committed) return null; // outro clique/admin já aprovou

            // 2) Cria o plano, a menos que o usuário já tenha um plano
            //    ativo do mesmo valor (nesse caso aborta e vira pendência).
            return planosRef.transaction((planosAtuais) => {
                const lista = planosAtuais ? Object.values(planosAtuais) : [];
                const jaTemPlanoAtivo = lista.some((plano) => {
                    const diasPassados = Math.floor((Date.now() - plano.dataAtivacao) / 86400000);
                    return diasPassados < plano.duracaoDias &&
                        Math.abs((plano.valorInvestido || 0) - info.valor) < 0.01;
                });
                if (jaTemPlanoAtivo) return; // aborta sem alterar nada

                const novos = planosAtuais || {};
                novos[novoPlanoId] = {
                    planoKey: info.planoKey || null,
                    nome: info.nome,
                    valorInvestido: info.valor,
                    retornoDiario: info.retornoDiario,
                    duracaoDias: info.duracaoDias,
                    dataAtivacao: Date.now(),
                    diasCreditados: 0
                };
                return novos;
            });
        }).then((resultado) => {
            if (resultado === null) return; // já estava aprovado

            planoJaCriado = true; // a partir daqui, nada de rollback do status

            firebaseDb.ref('deposits/' + depositId).update({ resolvedAt: Date.now() });

            if (!resultado.committed) {
                // Duplicidade: cria a pendência para decisão manual
                return firebaseDb.ref('planPendencies').push({
                    uid: deposito.uid,
                    userName: deposito.userName,
                    valor: info.valor,
                    nome: info.nome,
                    retornoDiario: info.retornoDiario,
                    duracaoDias: info.duracaoDias,
                    planoKey: info.planoKey || deposito.planoKey || null,
                    observacao: 'Pix confirmado, mas o usuário já tinha um plano ativo desse valor no momento da confirmação.',
                    depositId: depositId,
                    status: 'open',
                    createdAt: Date.now()
                }).then(() => {
                    showToast('warning', 'Depósito aprovado com pendência', 'Usuário já tem plano ativo desse valor — decisão manual necessária em "Pendências de Plano".');
                });
            }

            // 3) Plano criado: credita a comissão para quem indicou
            return creditarComissaoIndicacao(deposito.uid, info).then(() => {
                showToast('success', 'Depósito aprovado!', 'O plano foi ativado na carteira do usuário.');
            });
        }).catch((err) => {
            console.error('Erro ao aprovar depósito:', err);

            if (!planoJaCriado) {
                // Falhou antes de criar o plano: devolve para pendente
                // para o admin poder tentar de novo com segurança.
                statusRef.transaction((s) => (s === 'approved' ? 'pending' : undefined));
                showToast('error', 'Erro ao aprovar depósito', 'Tente novamente em instantes.');
            } else {
                // O plano já foi criado, só a comissão (ou a pendência) falhou.
                showToast('error', 'Plano criado, mas houve erro depois', 'Confira a comissão do indicador no painel antes de tentar de novo.');
            }
        });
    }

    function rejeitarDeposito(depositId) {
        const deposito = depositosMap[depositId];
        if (!deposito || deposito.status !== 'pending') return;

        firebaseDb.ref('deposits/' + depositId + '/status').transaction((statusAtual) => {
            return statusAtual === 'pending' ? 'rejected' : undefined;
        }).then((resultado) => {
            if (!resultado.committed) return;
            firebaseDb.ref('deposits/' + depositId).update({ resolvedAt: Date.now() });
            showToast('info', 'Depósito rejeitado.');
        }).catch((err) => {
            console.error('Erro ao rejeitar depósito:', err);
            showToast('error', 'Erro ao rejeitar depósito', 'Tente novamente em instantes.');
        });
    }

    // Resolve uma pendência de plano criando o plano mesmo com a
    // duplicidade (ignora o limite) e creditando a comissão.
    function criarPlanoMesmoAssim(pendId) {
        const pend = pendenciasMap[pendId];
        if (!pend || pend.status === 'resolved') return;

        const info = {
            nome: pend.nome,
            valor: pend.valor,
            retornoDiario: pend.retornoDiario,
            duracaoDias: pend.duracaoDias,
            planoKey: pend.planoKey
        };

        let planoJaCriado = false;
        const statusRef = firebaseDb.ref('planPendencies/' + pendId + '/status');

        // Reserva a pendência de forma atômica (evita duplo clique)
        statusRef.transaction((statusAtual) => {
            return statusAtual !== 'resolved' ? 'resolved' : undefined;
        }).then((reserva) => {
            if (!reserva.committed) return null;

            return firebaseDb.ref('users/' + pend.uid + '/planos').push({
                planoKey: info.planoKey || null,
                nome: info.nome,
                valorInvestido: info.valor,
                retornoDiario: info.retornoDiario,
                duracaoDias: info.duracaoDias,
                dataAtivacao: Date.now(),
                diasCreditados: 0
            }).then(() => {
                planoJaCriado = true;
                firebaseDb.ref('planPendencies/' + pendId).update({
                    resolvedAt: Date.now(),
                    resolucao: 'plano_criado'
                });
                return creditarComissaoIndicacao(pend.uid, info);
            }).then(() => {
                showToast('success', 'Plano criado mesmo com a duplicidade.');
            });
        }).catch((err) => {
            console.error('Erro ao criar plano pela pendência:', err);
            if (!planoJaCriado) {
                statusRef.transaction((s) => (s === 'resolved' ? 'open' : undefined));
                showToast('error', 'Erro ao criar plano', 'Tente novamente em instantes.');
            } else {
                showToast('error', 'Plano criado, mas houve erro depois', 'Confira a comissão do indicador no painel.');
            }
        });
    }

    function resolverPendenciaSemCriar(pendId) {
        const pend = pendenciasMap[pendId];
        if (!pend || pend.status === 'resolved') return;

        firebaseDb.ref('planPendencies/' + pendId).update({
            status: 'resolved',
            resolvedAt: Date.now(),
            resolucao: 'sem_criar'
        }).then(() => {
            showToast('info', 'Pendência marcada como resolvida — nenhum plano foi criado.');
        }).catch((err) => {
            console.error('Erro ao resolver pendência:', err);
            showToast('error', 'Erro ao resolver pendência', 'Tente novamente em instantes.');
        });
    }

    function marcarSaquePago(id) {
        const saque = saquesMap[id];
        if (!saque || saque.status !== 'pending') return;

        // A transaction aborta (retorna undefined) se o saldo for
        // insuficiente, e o status só é atualizado se ela for aplicada.
        // Saques de comissão saem de balanceComissao; os de rendimento (e os
        // antigos, sem "tipo") saem de balance.
        const campoSaldo = saque.tipo === 'comissao' ? 'balanceComissao' : 'balance';
        firebaseDb.ref('users/' + saque.uid + '/' + campoSaldo).transaction((saldoAtual) => {
            const saldo = saldoAtual || 0;
            if (saldo < saque.valor) {
                return; // aborta — saldo insuficiente
            }
            return saldo - saque.valor;
        }).then((resultado) => {
            if (!resultado.committed) {
                showToast('warning', 'Saldo insuficiente', 'O saldo atual do usuário é menor que o valor do saque. Verifique antes de marcar como pago.');
                return;
            }
            return firebaseDb.ref('withdrawals/' + id).update({ status: 'paid', paidAt: Date.now() }).then(() => {
                showToast('success', 'Saque marcado como pago!', 'O saldo do usuário foi atualizado.');
            });
        }).catch((err) => {
            console.error('Erro ao marcar saque como pago:', err);
            showToast('error', 'Erro ao processar saque', 'Tente novamente em instantes.');
        });
    }

    function rejeitarSaque(id) {
        const saque = saquesMap[id];
        if (!saque || saque.status !== 'pending') return;

        firebaseDb.ref('withdrawals/' + id).update({ status: 'rejected', resolvedAt: Date.now() }).then(() => {
            showToast('info', 'Saque rejeitado.');
        }).catch((err) => {
            console.error('Erro ao rejeitar saque:', err);
            showToast('error', 'Erro ao rejeitar saque', 'Tente novamente em instantes.');
        });
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
            renderPendenciasPlano();
            renderDepositos();
        }, (err) => console.error('[Admin] Erro ao ler users:', err.code, err.message));

        firebaseDb.ref('commissions').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            commissionsMap = {};
            Object.entries(data).forEach(([uid, entradas]) => {
                commissionsMap[uid] = Object.values(entradas || {}).reduce((soma, c) => soma + (c.valor || 0), 0);
            });
            renderUsuarios();
        }, (err) => console.error('[Admin] Erro ao ler commissions:', err.code, err.message));

        firebaseDb.ref('withdrawals').on('value', (snapshot) => {
            saquesMap = snapshot.val() || {};
            renderSaques();
            renderStats();
        }, (err) => console.error('[Admin] Erro ao ler withdrawals:', err.code, err.message));

        firebaseDb.ref('deposits').on('value', (snapshot) => {
            depositosMap = snapshot.val() || {};
            renderDepositos();
            renderStats();
        }, (err) => console.error('[Admin] Erro ao ler deposits:', err.code, err.message));

        firebaseDb.ref('planPendencies').on('value', (snapshot) => {
            pendenciasMap = snapshot.val() || {};
            renderPendenciasPlano();
            renderStats();
        }, (err) => console.error('[Admin] Erro ao ler planPendencies:', err.code, err.message));
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
