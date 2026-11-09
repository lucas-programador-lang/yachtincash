// ============================================================
// CONTROLE DE SESSÃO — validade de 7 dias e UM aparelho por conta.
//
// 1) VALIDADE: a pessoa fica logada no máximo 7 DIAS desde o último login
//    (conta a partir do login de verdade, não de quando abriu o site). Passou
//    disso, é deslogada e precisa entrar de novo. Vale também com o painel
//    aberto: a conferência se repete a cada 5 minutos.
//
// 2) UM APARELHO POR CONTA: quando a conta entra em outro celular/computador,
//    o aparelho antigo é deslogado na hora (com aviso na tela de login).
//    Cada aparelho guarda um código de sessão; o aparelho que entrou por
//    último grava o seu em sessoes/{uid} no Realtime Database, e os outros,
//    ao verem que o código mudou, saem.
//
// REGRAS DO REALTIME DATABASE: precisa liberar o caminho "sessoes" (veja o
// trecho no final deste arquivo). Sem isso a troca de aparelho NÃO é detectada
// (nada quebra: ninguém é deslogado por engano; só a validade de 7 dias vale).
//
// IMPORTANTE: isto roda no navegador. Serve para o uso normal, mas não impede
// quem altera o código do site no próprio navegador. Para uma trava à prova de
// adulteração seria preciso revogar as sessões no servidor (Worker).
//
// Carregue DEPOIS do auth.js no index.html (só no painel do usuário).
// ============================================================
(function () {
    'use strict';

    const corpo = document.body;
    if (!corpo || !corpo.classList.contains('app-body') || corpo.classList.contains('admin-body')) return;
    if (typeof firebaseAuth === 'undefined' || typeof firebaseDb === 'undefined') return;

    // ---------- CONFIGURAÇÃO ----------
    const VALIDADE_DIAS = 7;                       // dias logado antes de pedir login de novo
    const VERIFICAR_A_CADA_MS = 5 * 60 * 1000;     // confere a validade a cada 5 minutos
    const UM_APARELHO_POR_CONTA = true;            // false = desliga a regra de um aparelho só
    // -----------------------------------

    const VALIDADE_MS = VALIDADE_DIAS * 24 * 60 * 60 * 1000;
    const chaveLocal = (uid) => 'yic_sessao_' + uid;

    let uidAtual = null;
    let meuId = null;
    let refSessao = null;
    let ouvinte = null;
    let saindo = false;

    function novoId() {
        const bytes = new Uint8Array(12);
        (window.crypto || window.msCrypto).getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }

    function descricaoDoAparelho() {
        return String(navigator.userAgent || 'desconhecido').slice(0, 100);
    }

    function pararOuvinte() {
        if (refSessao && ouvinte) {
            try { refSessao.off('value', ouvinte); } catch (e) { /* ok */ }
        }
        ouvinte = null;
    }

    // Desloga e leva para o login com o motivo (o login mostra o aviso)
    function sair(motivo) {
        if (saindo) return;
        saindo = true;
        pararOuvinte();
        if (uidAtual) {
            try { localStorage.removeItem(chaveLocal(uidAtual)); } catch (e) { /* ok */ }
        }
        const ir = () => window.location.replace('login.html?motivo=' + encodeURIComponent(motivo));
        // espera o signOut terminar, senão o login mandaria a pessoa de volta ao painel
        Promise.resolve(firebaseAuth.signOut()).then(ir, ir);
    }

    // ---------- 1) validade de 7 dias ----------
    // authTime = momento do login de verdade (não muda quando o Firebase renova o token)
    function verificarValidade(user) {
        if (!user || typeof user.getIdTokenResult !== 'function') return Promise.resolve(false);
        return user.getIdTokenResult().then((resultado) => {
            const inicio = Date.parse(resultado.authTime);
            if (inicio && Date.now() - inicio > VALIDADE_MS) {
                sair('expirou');
                return true;
            }
            return false;
        }).catch(() => false); // sem rede: não derruba ninguém
    }

    // ---------- 2) um aparelho por conta ----------
    function dadosDaSessao() {
        return { id: meuId, em: Date.now(), info: descricaoDoAparelho() };
    }

    async function assumirSessao(user) {
        refSessao = firebaseDb.ref('sessoes/' + user.uid);
        try {
            meuId = localStorage.getItem(chaveLocal(user.uid));
            if (!meuId) {
                // login novo neste aparelho: ele passa a ser o aparelho ativo
                meuId = novoId();
                await refSessao.set(dadosDaSessao());
                localStorage.setItem(chaveLocal(user.uid), meuId);
            } else {
                // já era daqui: confere se outro aparelho entrou enquanto estava fechado
                const foto = await refSessao.once('value');
                const atual = foto.val();
                if (atual && atual.id && atual.id !== meuId) { sair('outro-dispositivo'); return; }
                if (!atual) await refSessao.set(dadosDaSessao());
            }
        } catch (erro) {
            // regras do banco ainda sem o caminho "sessoes", ou sem internet:
            // não deslogamos ninguém por causa disso
            console.warn('Controle de aparelho desativado (não foi possível usar sessoes/' + user.uid + '):', erro && erro.code ? erro.code : erro);
            meuId = null;
            return;
        }

        // daqui para frente: se outro aparelho assumir a conta, este sai na hora
        ouvinte = (foto) => {
            const atual = foto.val();
            if (atual && atual.id && atual.id !== meuId) sair('outro-dispositivo');
        };
        refSessao.on('value', ouvinte);
    }

    firebaseAuth.onAuthStateChanged((user) => {
        if (!user) {
            // saiu (por conta própria ou não): esquece o código deste aparelho
            pararOuvinte();
            if (uidAtual && !saindo) {
                try { localStorage.removeItem(chaveLocal(uidAtual)); } catch (e) { /* ok */ }
            }
            uidAtual = null;
            meuId = null;
            return;
        }
        if (user.uid === uidAtual) return;
        uidAtual = user.uid;

        verificarValidade(user).then((expirou) => {
            if (!expirou && UM_APARELHO_POR_CONTA && !saindo) assumirSessao(user);
        });
    });

    // Painel aberto por dias: confere de novo de tempos em tempos e ao voltar para a aba
    function conferirAgora() {
        if (firebaseAuth.currentUser && !saindo) verificarValidade(firebaseAuth.currentUser);
    }
    setInterval(conferirAgora, VERIFICAR_A_CADA_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) conferirAgora(); });
})();

/* ============================================================
   REGRAS DO REALTIME DATABASE — acrescente este bloco dentro de "rules" (no mesmo
   nível de "users", "deposits" etc.), no Console do Firebase > Realtime Database > Regras:

    "sessoes": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "newData.hasChildren(['id', 'em'])",
        "id":   { ".validate": "newData.isString() && newData.val().length <= 64" },
        "em":   { ".validate": "newData.isNumber()" },
        "info": { ".validate": "newData.isString() && newData.val().length <= 120" },
        "$outro": { ".validate": false }
      }
    }
   ============================================================ */
