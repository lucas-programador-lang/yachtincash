// ============================================================
// Missões diárias (pontos) — tela "Missões".
//
// Quem confere as missões e credita o prêmio é o Worker (rotas
// /missoes e /missoes/resgatar). Aqui só mostramos o status e pedimos
// o resgate. Abrir o app já conta como "Acessar a plataforma".
// O dia reinicia às 00:00 (horário de Brasília).
//
// Carregue este arquivo DEPOIS do script.js e do inicio.js no index.html.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('section-missoes')) return;

    const WORKER_URL = 'https://apidayachtincash.lucas-dev-programador.workers.dev';
    const $ = (id) => document.getElementById(id);
    const toast = (tipo, titulo, msg) => { if (typeof window.showToast === 'function') window.showToast(tipo, titulo, msg); };
    const brl = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Ícones desenhados (SVG), sem emojis
    const ICONES = {
        deposito: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/></svg>',
        convidar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M2.8 19.2c.7-3.1 3.1-5 6.2-5s5.5 1.9 6.2 5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.2c2.6.1 4.3 1.8 4.9 4.6"/></svg>',
        investir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/></svg>',
        acessar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>'
    };

    let estado = null;
    let carregando = false;

    async function chamar(caminho) {
        const user = firebaseAuth.currentUser;
        if (!user) return null;
        const token = await user.getIdToken();
        const resposta = await fetch(WORKER_URL + caminho, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: '{}'
        });
        let dados = {};
        try { dados = await resposta.json(); } catch (e) { /* resposta sem corpo */ }
        if (!resposta.ok) {
            const erro = new Error(dados.error || 'Falha ao falar com o servidor.');
            erro.estado = dados.estado || null;
            throw erro;
        }
        return dados;
    }

    function linhaMissao(m) {
        const percentual = Math.round((m.atual / m.meta) * 100);
        let acao = '';
        if (m.concluida) {
            acao = '<span class="mis-done">Concluído</span>';
        } else if (m.id === 'deposito') {
            acao = '<button type="button" class="btn btn-compact mis-go" data-mis-acao="deposito">Ir agora</button>';
        } else if (m.id === 'convidar') {
            acao = '<button type="button" class="btn btn-compact mis-go" data-goto="equipe">Ir agora</button>';
        } else if (m.id === 'investir') {
            acao = '<button type="button" class="btn btn-compact mis-go" data-goto="investir">Ir agora</button>';
        }
        return `
            <div class="mis-row${m.concluida ? ' is-done' : ''}">
                <span class="mis-icon">${ICONES[m.id] || ''}</span>
                <div class="mis-info">
                    <div class="mis-title">${m.titulo}</div>
                    <div class="mis-points">+ ${m.pontos} pontos</div>
                    <div class="mis-bar"><span style="width:${percentual}%"></span></div>
                </div>
                <div class="mis-side">
                    <span class="mis-count">${m.atual}/${m.meta}</span>
                    ${acao}
                </div>
            </div>`;
    }

    function desenhar() {
        const lista = $('missoesLista');
        if (!lista || !estado) return;

        lista.innerHTML = estado.missoes.map(linhaMissao).join('');

        const pct = Math.round((estado.concluidas / estado.totalMissoes) * 100);
        $('missoesBarra').style.width = pct + '%';
        $('missoesContagem').textContent = estado.concluidas + '/' + estado.totalMissoes;
        $('missoesPontos').textContent = estado.pontos + '/' + estado.pontosTotal + ' pontos';

        const botao = $('btnResgatarMissoes');
        if (estado.resgatado) {
            botao.disabled = true;
            botao.textContent = 'Prêmio de hoje resgatado';
        } else if (estado.completo) {
            botao.disabled = false;
            botao.textContent = 'Resgatar ' + brl(estado.premio);
        } else {
            botao.disabled = true;
            botao.textContent = 'Complete tudo para ganhar ' + brl(estado.premio);
        }
        tickRelogio();
    }

    function tickRelogio() {
        const el = $('missoesReinicio');
        if (!el || !estado) return;
        const resto = estado.expiraEm - Date.now();
        if (resto <= 0) {
            el.textContent = 'Reiniciando...';
            atualizar();
            return;
        }
        const s = Math.floor(resto / 1000);
        const hh = String(Math.floor(s / 3600)).padStart(2, '0');
        const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        el.textContent = 'Reinicia às 00:00 (em ' + hh + ':' + mm + ':' + ss + ')';
    }

    async function atualizar() {
        if (carregando || !firebaseAuth.currentUser) return;
        carregando = true;
        try {
            const dados = await chamar('/missoes');
            if (dados) {
                estado = dados;
                desenhar();
            }
        } catch (err) {
            console.error('Erro ao carregar as missões:', err);
            if (!estado && $('missoesLista')) {
                $('missoesLista').innerHTML = '<div class="info-box muted">Não foi possível carregar as missões agora. Tente novamente em instantes.</div>';
            }
        } finally {
            carregando = false;
        }
    }

    async function resgatar() {
        const botao = $('btnResgatarMissoes');
        botao.disabled = true;
        try {
            const dados = await chamar('/missoes/resgatar');
            if (dados && dados.estado) estado = dados.estado;
            toast('success', 'Prêmio resgatado!', brl(dados.creditado) + ' foram adicionados ao seu saldo.');
        } catch (err) {
            if (err.estado) estado = err.estado;
            toast('warning', 'Não foi possível resgatar', err.message);
        }
        desenhar();
    }

    // ---------- Ligações ----------
    $('btnResgatarMissoes').addEventListener('click', resgatar);

    // "Ir agora" do depósito abre o modal (os outros usam data-goto, tratado no inicio.js)
    document.addEventListener('click', (e) => {
        const alvo = e.target.closest('[data-mis-acao="deposito"]');
        if (alvo && typeof window.openModal === 'function') window.openModal('depositModal');
    });

    // Entrar na tela de Missões atualiza o progresso
    const menu = document.querySelector('.nav-item[data-section="missoes"]');
    if (menu) menu.addEventListener('click', atualizar);

    // Abrir a plataforma (login) já registra o acesso do dia
    firebaseAuth.onAuthStateChanged((user) => {
        estado = null;
        if (user) atualizar();
    });

    // Com a tela aberta, atualiza a cada 45 segundos e roda o relógio
    setInterval(() => {
        if ($('section-missoes').classList.contains('active')) atualizar();
    }, 45000);
    setInterval(tickRelogio, 1000);
});
