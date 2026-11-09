// ============================================================
// Sessão já ativa nas telas de login e cadastro.
//
// Quem já está logado e abre login.html OU register.html é levado direto
// para o painel (index.html), sem ver o formulário. Quem NÃO está logado e
// abre o painel já era mandado para o login pelo auth.js (Auth.protectRoute).
//
// Fica de fora quem ACABOU de enviar o formulário (login ou cadastro): ali o
// auth.js é quem mostra o aviso ("Login realizado!" / "Cadastro realizado!") e
// redireciona. No cadastro isso é essencial: o login acontece ANTES de o perfil,
// o link de indicação e o e-mail de confirmação terminarem de ser gravados, e
// sair da página nesse instante poderia cortar a gravação.
//
// Atenção: abrir um link de indicação (register.html?ref=...) já logado agora
// leva ao painel. Para testar o link no mesmo navegador, saia da conta antes
// (ou use uma janela anônima).
//
// Carregue este arquivo DEPOIS do auth.js.
// ============================================================
(function () {
    if (typeof firebaseAuth === 'undefined') return;

    // Aviso do motivo quando a pessoa foi deslogada (vem do sessao-controle.js: ?motivo=...)
    const MOTIVOS = {
        'expirou': 'Sua sessão expirou (limite de 7 dias). Entre novamente para continuar.',
        'outro-dispositivo': 'Sua conta foi acessada em outro aparelho, então você foi desconectado deste. Se não foi você, troque sua senha.'
    };
    (function mostrarMotivo() {
        const motivo = new URLSearchParams(location.search).get('motivo');
        if (!motivo || !MOTIVOS[motivo]) return;
        // some da barra de endereço, para o aviso não voltar ao recarregar a página
        try { history.replaceState(null, '', location.pathname); } catch (e) { /* ok */ }
        const colocar = () => {
            const card = document.querySelector('.card');
            if (!card || document.getElementById('avisoSessao')) return;
            const estilo = document.createElement('style');
            estilo.textContent =
                '.aviso-sessao{display:flex;gap:12px;align-items:flex-start;margin:0 0 18px;padding:14px 16px;border-radius:14px;text-align:left;' +
                'background:linear-gradient(90deg,rgba(255,200,96,.16),rgba(255,200,96,.04));border:1px solid rgba(255,200,96,.38);' +
                'box-shadow:inset 3px 0 0 #ffc860;color:var(--text-color,#eaf2f8);font-size:13.5px;line-height:1.5}' +
                '.aviso-sessao b{flex:0 0 24px;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;' +
                'background:rgba(255,200,96,.2);color:#ffd98a;font-size:14px;line-height:1}';
            document.head.appendChild(estilo);
            const caixa = document.createElement('div');
            caixa.className = 'aviso-sessao';
            caixa.id = 'avisoSessao';
            caixa.setAttribute('role', 'alert');
            const icone = document.createElement('b');
            icone.textContent = '!';
            const texto = document.createElement('span');
            texto.textContent = MOTIVOS[motivo];
            caixa.appendChild(icone);
            caixa.appendChild(texto);
            const logo = card.querySelector('.logo-container');
            if (logo && logo.nextSibling) card.insertBefore(caixa, logo.nextSibling);
            else card.insertBefore(caixa, card.firstChild);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', colocar); else colocar();
    })();

    // Libera o formulário (o login.html/register.html o escondem enquanto a sessão é conferida)
    const liberarTela = () => document.documentElement.classList.remove('checando-sessao');

    // A pessoa acabou de enviar o formulário? Então o auth.js cuida do redirecionamento.
    // (O sinal vale 20 s: se o envio falhar, a tela volta ao normal.)
    let enviandoFormulario = false;
    let temporizadorEnvio = null;
    document.addEventListener('submit', (e) => {
        const id = e.target && e.target.id;
        if (id !== 'loginForm' && id !== 'registerForm') return;
        enviandoFormulario = true;
        clearTimeout(temporizadorEnvio);
        temporizadorEnvio = setTimeout(() => { enviandoFormulario = false; }, 20000);
    }, true);

    firebaseAuth.onAuthStateChanged((user) => {
        if (!user) {
            liberarTela();
            return;
        }
        // Já estava logado: vai para o painel (a tela continua escondida até a troca de página)
        if (!enviandoFormulario) location.replace('index.html');
    });
})();
