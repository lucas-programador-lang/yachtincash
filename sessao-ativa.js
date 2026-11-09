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
