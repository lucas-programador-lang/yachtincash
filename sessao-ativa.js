// ============================================================
// Aviso de "você já está logado" nas telas de cadastro e login.
//
// Quem abre o link de indicação (register.html?ref=...) já logado
// via o formulário de cadastro e achava que tinha dado erro. Agora
// aparece um aviso com duas opções: ir para o painel ou sair e
// continuar o cadastro (mantendo o ?ref= do link).
//
// Não redireciona sozinho de propósito: assim dá para testar o
// próprio link de indicação no mesmo navegador.
// Carregue este arquivo DEPOIS do auth.js.
// ============================================================
(function () {
    if (typeof firebaseAuth === 'undefined') return;

    const ehCadastro = /register/i.test(location.pathname);

    function css() {
        if (document.getElementById('sessaoAtivaCss')) return;
        const s = document.createElement('style');
        s.id = 'sessaoAtivaCss';
        s.textContent =
            '.sessao-ativa{margin:0 0 18px;padding:14px 16px;border-radius:14px;text-align:left;' +
            'background:linear-gradient(160deg,rgba(241,201,111,.12),rgba(241,201,111,.04));' +
            'border:1px solid rgba(241,201,111,.35);color:var(--text-color,#eaf2f8);font-size:13.5px;line-height:1.5}' +
            '.sessao-ativa strong{color:var(--gold-hi,#f3e3b8);word-break:break-all}' +
            '.sessao-ativa-acoes{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}' +
            '.sessao-ativa-acoes button{flex:1 1 140px;padding:11px 14px;border-radius:12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background .2s,border-color .2s}' +
            '.sessao-ativa-ir{border:0;color:#2a1d05;background:linear-gradient(180deg,#f5dc92,#c9a04a)}' +
            '.sessao-ativa-sair{color:var(--gold,#d9b86c);background:transparent;border:1px solid rgba(241,201,111,.4)}' +
            '.form-bloqueado{opacity:.4;pointer-events:none;filter:grayscale(.4);user-select:none}' +
            '.sessao-ativa-sair:hover{background:rgba(241,201,111,.1);border-color:rgba(241,201,111,.8)}';
        document.head.appendChild(s);
    }

    function mostrar(user) {
        const card = document.querySelector('.card');
        if (!card || document.getElementById('sessaoAtiva')) return;
        css();

        const aviso = document.createElement('div');
        aviso.className = 'sessao-ativa';
        aviso.id = 'sessaoAtiva';
        aviso.setAttribute('role', 'status');

        const texto = document.createElement('div');
        texto.appendChild(document.createTextNode('Você já está logado como '));
        const email = document.createElement('strong');
        email.textContent = user.email || 'sua conta';
        texto.appendChild(email);
        texto.appendChild(document.createTextNode(ehCadastro
            ? '. Para criar uma nova conta com este link, saia primeiro.'
            : '. Quer entrar em outra conta? Saia primeiro.'));

        const acoes = document.createElement('div');
        acoes.className = 'sessao-ativa-acoes';

        const ir = document.createElement('button');
        ir.type = 'button';
        ir.className = 'sessao-ativa-ir';
        ir.textContent = 'Ir para o painel';
        ir.addEventListener('click', () => { location.href = 'index.html'; });

        const sair = document.createElement('button');
        sair.type = 'button';
        sair.className = 'sessao-ativa-sair';
        sair.textContent = ehCadastro ? 'Sair e cadastrar' : 'Sair desta conta';
        sair.addEventListener('click', () => {
            sair.disabled = true;
            firebaseAuth.signOut().then(() => location.reload()); // mantém o ?ref= da URL
        });

        acoes.appendChild(ir);
        acoes.appendChild(sair);
        aviso.appendChild(texto);
        aviso.appendChild(acoes);

        const logo = card.querySelector('.logo-container');
        if (logo && logo.nextSibling) card.insertBefore(aviso, logo.nextSibling);
        else card.insertBefore(aviso, card.firstChild);
    }

    // No cadastro, enquanto houver alguém logado o formulário fica travado:
    // criar uma conta nova trocaria a sessão sem querer. É preciso sair antes.
    function travarFormulario(travar) {
        if (!ehCadastro) return;
        const form = document.getElementById('registerForm');
        if (!form) return;
        css();
        form.classList.toggle('form-bloqueado', travar);
        form.setAttribute('aria-disabled', String(travar));
        form.querySelectorAll('input, button[type="submit"]').forEach((el) => { el.disabled = travar; });
    }

    // Segurança extra: mesmo que o formulário seja destravado pelo console, o envio é barrado.
    // (capture = roda antes do listener do auth.js)
    document.addEventListener('submit', (e) => {
        if (!ehCadastro || !firebaseAuth.currentUser) return;
        if (e.target && e.target.id === 'registerForm') {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }, true);

    firebaseAuth.onAuthStateChanged((user) => {
        const existente = document.getElementById('sessaoAtiva');
        if (!user) {
            if (existente) existente.remove();
            travarFormulario(false);
            return;
        }
        mostrar(user);
        travarFormulario(true);
    });
})();
