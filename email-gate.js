// ============================================================
// EMAIL-GATE — exige a confirmação do e-mail para usar o painel.
//
// Quem se cadastrou e ainda NÃO confirmou o e-mail vê uma tela que cobre
// todo o painel com o aviso:
//   • a conta será excluída se não confirmar em 72 horas (com contagem);
//   • não pode depositar, não pode convidar amigos, não pode usar nenhuma função.
// Botões: "Já confirmei", "Reenviar e-mail" (com espera de 60s) e "Sair".
// Quando a pessoa confirma (mesmo em outro aparelho), a tela some sozinha.
//
// IMPORTANTE: isto bloqueia a INTERFACE. A proteção de verdade (impedir
// depósito/saque/convite por quem chama a API direto) precisa estar também nas
// regras do Realtime Database e no Worker — veja LEIA-ME-CONFIRMACAO-EMAIL.md.
//
// Precisa vir DEPOIS de auth.js e script.js no index.html.
// ============================================================
(function () {
    'use strict';

    const corpo = document.body;
    if (!corpo || !corpo.classList.contains('app-body') || corpo.classList.contains('admin-body')) return;
    if (typeof firebaseAuth === 'undefined') return;

    // Contas criadas ANTES desta data ficam isentas (senão todo mundo que já
    // tinha cadastro ficaria trancado para fora). Ajuste para o dia em que
    // publicar. Mantenha o MESMO valor na rotina de exclusão (veja o LEIA-ME).
    const EXIGIR_A_PARTIR_DE = Date.parse('2026-11-04T00:00:00-03:00');
    const PRAZO_MS = 72 * 60 * 60 * 1000;
    const ESPERA_REENVIO_S = 60;

    let overlay = null;
    let timerContagem = null;
    let timerChecagem = null;
    let timerReenvio = null;
    let escondidos = [];

    const $ = (sel) => overlay && overlay.querySelector(sel);

    // ---------- bloqueio de funções ----------
    // Impede abrir qualquer modal (depósito, saque etc.) por código enquanto
    // bloqueado. A função openModal só existe depois que o script.js termina
    // de carregar, por isso o "embrulho" é feito no DOMContentLoaded e de novo
    // quando a tela de bloqueio aparece.
    function protegerModais() {
        if (typeof window.openModal === 'function' && !window.openModal.__protegido) {
            const original = window.openModal;
            const protegida = function () {
                if (window.__emailBloqueado) return;
                return original.apply(this, arguments);
            };
            protegida.__protegido = true;
            window.openModal = protegida;
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', protegerModais);
    else protegerModais();

    function formatarRestante(ms) {
        if (ms <= 0) return 'prazo esgotado';
        const totalMin = Math.floor(ms / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return h + 'h ' + String(m).padStart(2, '0') + 'min';
    }

    function montar(user, criadaEm) {
        overlay = document.createElement('div');
        overlay.className = 'email-gate';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'emailGateTitulo');
        overlay.innerHTML =
            '<div class="email-gate-card">' +
                '<div class="email-gate-icone" aria-hidden="true">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6.5L20.5 7"/></svg>' +
                '</div>' +
                '<h2 id="emailGateTitulo">Confirme seu e-mail</h2>' +
                '<p class="email-gate-texto">Enviamos um link de confirmação para <strong class="email-gate-email"></strong>. Abra o e-mail e toque no link para liberar sua conta.</p>' +
                '<div class="email-gate-aviso" role="alert">' +
                    '<strong>Atenção: prazo de 72 horas</strong>' +
                    '<span>Se você não confirmar o e-mail, sua conta será <b>excluída</b> em até 72 horas.</span>' +
                    '<span class="email-gate-contagem">Tempo restante: <b data-restante>--</b></span>' +
                '</div>' +
                '<ul class="email-gate-lista">' +
                    '<li>Você <b>não pode depositar</b></li>' +
                    '<li>Você <b>não pode convidar amigos</b></li>' +
                    '<li>Você <b>não pode usar nenhuma função</b> até confirmar</li>' +
                '</ul>' +
                '<div class="email-gate-acoes">' +
                    '<button type="button" class="btn" data-acao="confirmei">Já confirmei</button>' +
                    '<button type="button" class="btn btn-outline" data-acao="reenviar">Reenviar e-mail</button>' +
                '</div>' +
                '<p class="email-gate-dica">Não achou? Olhe também a caixa de spam ou lixo eletrônico.</p>' +
                '<button type="button" class="email-gate-sair" data-acao="sair">Sair da conta</button>' +
            '</div>';
        $('.email-gate-email').textContent = user.email || '';
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            const botao = e.target.closest('[data-acao]');
            if (!botao) return;
            const acao = botao.dataset.acao;
            if (acao === 'confirmei') verificar(true);
            if (acao === 'reenviar') reenviar(botao);
            if (acao === 'sair') { if (window.Auth && Auth.logout) Auth.logout(); else firebaseAuth.signOut().then(() => { window.location.href = 'login.html'; }); }
        });

        const atualizarContagem = () => {
            const restante = criadaEm + PRAZO_MS - Date.now();
            const el = $('[data-restante]');
            if (el) el.textContent = formatarRestante(restante);
            if (restante <= 0) overlay.classList.add('is-expirado');
        };
        atualizarContagem();
        timerContagem = setInterval(atualizarContagem, 30000);
    }

    // Deixa o resto da página fora do alcance de clique, teclado e leitor de tela
    function isolarPagina() {
        escondidos = [];
        Array.from(document.body.children).forEach((el) => {
            if (el === overlay || /^(SCRIPT|STYLE|LINK)$/.test(el.tagName) || el.classList.contains('toast-container')) return;
            if (!el.inert) { el.inert = true; escondidos.push(el); }
        });
        document.body.classList.add('email-gate-aberto');
    }
    function liberarPagina() {
        escondidos.forEach((el) => { el.inert = false; });
        escondidos = [];
        document.body.classList.remove('email-gate-aberto');
    }

    function mostrar(user, criadaEm) {
        window.__emailBloqueado = true;
        protegerModais();
        if (!overlay) montar(user, criadaEm);
        isolarPagina();
        const primeiro = $('[data-acao="confirmei"]');
        if (primeiro) primeiro.focus();
        if (!timerChecagem) {
            timerChecagem = setInterval(() => verificar(false), 5000);
            document.addEventListener('visibilitychange', aoVoltar);
            window.addEventListener('focus', aoVoltar);
        }
    }
    function aoVoltar() { if (document.visibilityState === 'visible') verificar(false); }

    function fechar() {
        window.__emailBloqueado = false;
        clearInterval(timerContagem); timerContagem = null;
        clearInterval(timerChecagem); timerChecagem = null;
        clearInterval(timerReenvio); timerReenvio = null;
        document.removeEventListener('visibilitychange', aoVoltar);
        window.removeEventListener('focus', aoVoltar);
        liberarPagina();
        if (overlay) { overlay.remove(); overlay = null; }
    }

    // Recarrega o usuário no Firebase para ver se já confirmou
    function verificar(manual) {
        const user = firebaseAuth.currentUser;
        if (!user) return;
        user.reload().then(() => {
            const atual = firebaseAuth.currentUser;
            if (atual && atual.emailVerified) {
                // Atualiza o token para as regras do banco enxergarem email_verified = true
                return atual.getIdToken(true).then(() => {
                    fechar();
                    if (window.Toast) Toast.success('E-mail confirmado! Sua conta está liberada.');
                });
            }
            if (manual && window.Toast) Toast.warning('Ainda não identificamos a confirmação. Abra o link do e-mail e tente de novo.');
        }).catch((err) => {
            console.warn('Falha ao verificar o e-mail:', err && err.code);
            if (manual && window.Toast) Toast.error('Não foi possível verificar agora. Tente novamente.');
        });
    }

    function reenviar(botao) {
        const user = firebaseAuth.currentUser;
        if (!user || botao.disabled) return;
        botao.disabled = true;
        Auth.enviarVerificacao(user).then(() => {
            if (window.Toast) Toast.success('E-mail reenviado para ' + user.email + '.');
            let restante = ESPERA_REENVIO_S;
            botao.textContent = 'Reenviar em ' + restante + 's';
            timerReenvio = setInterval(() => {
                restante -= 1;
                if (restante <= 0) {
                    clearInterval(timerReenvio); timerReenvio = null;
                    botao.disabled = false; botao.textContent = 'Reenviar e-mail';
                } else {
                    botao.textContent = 'Reenviar em ' + restante + 's';
                }
            }, 1000);
        }).catch((err) => {
            botao.disabled = false;
            const msg = (err && err.code === 'auth/too-many-requests')
                ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
                : 'Não foi possível reenviar agora. Tente novamente em instantes.';
            if (window.Toast) Toast.error(msg);
        });
    }

    firebaseAuth.onAuthStateChanged((user) => {
        if (!user) return;
        if (user.emailVerified) { if (overlay) fechar(); return; }
        const criadaEm = Date.parse(user.metadata && user.metadata.creationTime) || Date.now();
        if (criadaEm < EXIGIR_A_PARTIR_DE) return; // conta antiga: isenta
        mostrar(user, criadaEm);
    });
})();
