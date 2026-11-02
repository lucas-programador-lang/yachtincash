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
    const FILL = (c) => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + c + '</svg>';
    const ICONES = {
        deposito: FILL('<path fill-rule="evenodd" clip-rule="evenodd" d="M4.5 6A2.5 2.5 0 0 0 2 8.5v7A2.5 2.5 0 0 0 4.5 18h15a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 19.5 6h-15ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/><rect x="5" y="19.2" width="14" height="1.8" rx=".9" opacity=".6"/>'),
        convidar: FILL('<circle cx="9.5" cy="8" r="3.6"/><path d="M2.5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5v1h-14v-1Z"/><path d="M19 5.4v6M16 8.4h6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
        investir: FILL('<path fill-rule="evenodd" clip-rule="evenodd" d="M11.2 2.8a1.2 1.2 0 0 1 1.6 0l8.2 7.1c.5.4.2 1.3-.5 1.3H20V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.8h-.5c-.7 0-1-.9-.5-1.3l8.2-7.1Z"/>'),
        acessar: FILL('<g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 13.2l4.2 4.2L14 8.8"/><path d="M10.4 15.4l1.9 1.9L21 7.6"/></g>')
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
