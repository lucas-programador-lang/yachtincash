// =====================================================================
// Firebase — inicialização
// =====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBq5b3kwpDsX4cxpFPH1cDT45CNDjUVGww",
    authDomain: "yachtincash.firebaseapp.com",
    databaseURL: "https://yachtincash-default-rtdb.firebaseio.com",
    projectId: "yachtincash",
    storageBucket: "yachtincash.firebasestorage.app",
    messagingSenderId: "767279208292",
    appId: "1:767279208292:web:7894f5d3c6aad067428c71"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const firebaseAuth = firebase.auth();
const firebaseDb = firebase.database();

// Gera um código alfanumérico curto (sem caracteres ambíguos como 0/O/1/I)
function gerarCodigoAleatorio(tamanho) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';
    for (let i = 0; i < tamanho; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
}

// Gera um código de indicação único (verifica em refCodes/{codigo} via
// transaction para nunca gerar dois códigos iguais, mesmo com usuários
// se cadastrando ao mesmo tempo).
function gerarCodigoIndicacaoUnico(uid, tentativasRestantes) {
    if (tentativasRestantes === undefined) tentativasRestantes = 6;
    const codigo = gerarCodigoAleatorio(7);
    return firebaseDb.ref('refCodes/' + codigo).transaction((atual) => {
        return atual === null ? uid : undefined;
    }).then((resultado) => {
        if (resultado.committed) {
            return codigo;
        }
        if (tentativasRestantes > 0) {
            return gerarCodigoIndicacaoUnico(uid, tentativasRestantes - 1);
        }
        throw new Error('Não foi possível gerar um código de indicação único.');
    });
}

// =====================================================================
// Sistema de autenticação (Firebase Auth) e perfil (Realtime Database)
// =====================================================================
const Auth = {
    _userRef(uid) {
        return firebaseDb.ref('users/' + uid);
    },

    // Login com e-mail e senha. Retorna uma Promise (use .then/.catch).
    login(email, password) {
        return firebaseAuth.signInWithEmailAndPassword(email, password);
    },

    // Cadastro: cria o usuário no Firebase Auth, gera um código de
    // indicação único, salva o perfil (nome + saldo inicial de R$ 5,00 +
    // refCode) e, se o cadastro veio de um link de indicação (?ref=CODIGO
    // na URL), registra o vínculo com quem indicou. Retorna uma Promise.
    //
    // IMPORTANTE: usa .update() em vez de .set() em users/{uid} — as regras
    // do Realtime Database só têm .write definido em cada CAMPO (fullName,
    // email, balance, etc.), não no nó users/$uid como um todo. Um .set()
    // no nó pai é avaliado só no caminho exato onde é chamado (sem olhar
    // regras dos filhos) e seria recusado; .update() com múltiplos campos
    // já é avaliado campo a campo pelo Firebase, batendo com essas regras.
    register(fullName, email, password) {
        return firebaseAuth.createUserWithEmailAndPassword(email, password)
            .then((credential) => {
                const user = credential.user;
                const uid = user.uid;
                return user.updateProfile({ displayName: fullName })
                    .then(() => gerarCodigoIndicacaoUnico(uid))
                    .then((refCode) => this._userRef(uid).update({
                        fullName: fullName,
                        email: email,
                        balance: 5,
                        cadastroBonus: 5,
                        createdAt: Date.now(),
                        refCode: refCode
                    }))
                    .then(() => this._registrarIndicacaoSeHouver(uid, fullName))
                    .then(() => credential);
            });
    },

    // Se a URL de cadastro tinha ?ref=CODIGO, resolve o código para o uid
    // de quem indicou e grava o vínculo dos dois lados: no perfil do novo
    // usuário (referredBy) e na lista de indicados de quem indicou
    // (referrals/{referrerUid}/...), que alimenta a página Equipe.
    _registrarIndicacaoSeHouver(uid, fullName) {
        const params = new URLSearchParams(window.location.search);
        const refCodigo = (params.get('ref') || '').trim().toUpperCase();
        if (!refCodigo) return Promise.resolve();

        return firebaseDb.ref('refCodes/' + refCodigo).once('value')
            .then((snapshot) => {
                const referrerUid = snapshot.val();
                if (!referrerUid || referrerUid === uid) return null;

                return Promise.all([
                    this._userRef(uid).update({ referredBy: referrerUid }),
                    firebaseDb.ref('referrals/' + referrerUid).push({
                        referredUid: uid,
                        referredName: fullName,
                        createdAt: Date.now()
                    })
                ]);
            })
            .catch((err) => {
                console.error('Erro ao registrar indicação:', err);
            });
    },

    logout() {
        return firebaseAuth.signOut().then(() => {
            window.location.href = 'login.html';
        });
    },

    isLoggedIn() {
        return !!firebaseAuth.currentUser;
    },

    getCurrentUser() {
        return firebaseAuth.currentUser ? firebaseAuth.currentUser.email : null;
    },

    // Protege a rota do dashboard: se não houver usuário logado, redireciona
    // para login.html. Se houver, chama onReady(user, userRef) assim que o
    // Firebase confirmar o estado de autenticação — userRef já aponta para
    // users/{uid} no Realtime Database, pronto para leitura/escuta.
    protectRoute(onReady) {
        firebaseAuth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            if (typeof onReady === 'function') {
                onReady(user, this._userRef(user.uid));
            }
        });
    }
};

// =====================================================================
// Sistema de Toast (substitui o alert() nativo do navegador)
// =====================================================================
const Toast = {
    _container: null,
    _icons: {
        success: '✓',
        error: '✕',
        warning: '!',
        info: 'i'
    },
    _titles: {
        success: 'Sucesso',
        error: 'Erro',
        warning: 'Atenção',
        info: 'Aviso'
    },
    _getContainer() {
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.className = 'toast-container';
            document.body.appendChild(this._container);
        }
        return this._container;
    },
    show(type, message, title) {
        const container = this._getContainer();

        const toastEl = document.createElement('div');
        toastEl.className = `toast toast-${type}`;

        const iconEl = document.createElement('div');
        iconEl.className = 'toast-icon';
        iconEl.textContent = this._icons[type] || this._icons.info;

        const bodyEl = document.createElement('div');
        bodyEl.className = 'toast-body';

        const titleEl = document.createElement('div');
        titleEl.className = 'toast-title';
        titleEl.textContent = title || this._titles[type] || this._titles.info;

        const messageEl = document.createElement('div');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;

        bodyEl.appendChild(titleEl);
        bodyEl.appendChild(messageEl);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.setAttribute('aria-label', 'Fechar aviso');
        closeBtn.textContent = '×';

        toastEl.appendChild(iconEl);
        toastEl.appendChild(bodyEl);
        toastEl.appendChild(closeBtn);
        container.appendChild(toastEl);

        const remove = () => {
            toastEl.classList.add('hide');
            toastEl.addEventListener('animationend', () => toastEl.remove(), { once: true });
        };

        closeBtn.addEventListener('click', remove);
        const autoCloseTimer = setTimeout(remove, 4000);
        closeBtn.addEventListener('click', () => clearTimeout(autoCloseTimer));

        return toastEl;
    },
    success(message, title) { return this.show('success', message, title); },
    error(message, title) { return this.show('error', message, title); },
    warning(message, title) { return this.show('warning', message, title); },
    info(message, title) { return this.show('info', message, title); }
};

document.addEventListener('DOMContentLoaded', () => {
    // Botão de olhinho para mostrar/ocultar senha (login e cadastro)
    const eyeOpenIcon = `<svg class="icon-eye" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/>
    </svg>`;
    const eyeOffIcon = `<svg class="icon-eye" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.5 3.5l17 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M10.6 5.2C11 5.1 11.5 5 12 5c7 0 10.5 7 10.5 7-.6 1.2-1.5 2.6-2.8 3.9M6.6 6.6C3.8 8.3 1.5 12 1.5 12S5 19 12 19c1.4 0 2.7-.3 3.8-.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9.9 10c-.3.5-.4 1-.4 1.6 0 1.6 1.3 2.9 2.9 2.9.5 0 1-.1 1.5-.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    document.querySelectorAll('.toggle-password').forEach((toggleBtn) => {
        toggleBtn.addEventListener('click', () => {
            const targetId = toggleBtn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) {
                console.error(`Campo de senha "${targetId}" não encontrado para o botão de mostrar/ocultar.`);
                return;
            }
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            toggleBtn.innerHTML = isHidden ? eyeOffIcon : eyeOpenIcon;
            toggleBtn.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha');
        });
    });

    // Traduz os códigos de erro mais comuns do Firebase Auth para PT-BR
    function mensagemErroFirebase(err, contexto) {
        const codigo = err && err.code;
        const mapa = {
            'auth/invalid-email': 'E-mail inválido.',
            'auth/user-disabled': 'Esta conta foi desativada.',
            'auth/user-not-found': 'E-mail ou senha incorretos!',
            'auth/wrong-password': 'E-mail ou senha incorretos!',
            'auth/invalid-credential': 'E-mail ou senha incorretos!',
            'auth/email-already-in-use': 'Esse e-mail já está cadastrado.',
            'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
            'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.'
        };
        return mapa[codigo] || (contexto === 'login' ? 'Erro ao realizar login.' : 'Erro ao realizar cadastro.');
    }

    // Tratamento do formulário de Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            if (!emailInput || !passwordInput) {
                console.error('Campos de e-mail/senha não encontrados no formulário de login.');
                Toast.error('Erro no formulário. Tente recarregar a página.');
                return;
            }

            const email = emailInput.value;
            const pass = passwordInput.value;
            const submitBtn = loginForm.querySelector('button[type="submit"], .btn');
            if (submitBtn) submitBtn.disabled = true;

            Auth.login(email, pass)
                .then(() => {
                    Toast.success('Login realizado! Redirecionando...');
                    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
                })
                .catch((err) => {
                    console.error('Erro ao tentar login:', err);
                    Toast.error(mensagemErroFirebase(err, 'login'));
                    if (submitBtn) submitBtn.disabled = false;
                });
        });
    }

    // Tratamento do formulário de Registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const regNameInput = document.getElementById('regName');
            const regEmailInput = document.getElementById('regEmail');
            const regPassInput = document.getElementById('regPass');

            if (!regNameInput || !regEmailInput || !regPassInput) {
                console.error('Campos de nome/e-mail/senha não encontrados no formulário de registro.');
                Toast.error('Erro no formulário. Tente recarregar a página.');
                return;
            }

            const fullName = regNameInput.value;
            const email = regEmailInput.value;
            const pass = regPassInput.value;
            const submitBtn = registerForm.querySelector('button[type="submit"], .btn');
            if (submitBtn) submitBtn.disabled = true;

            Auth.register(fullName, email, pass)
                .then(() => {
                    Toast.success('Cadastro realizado com sucesso! Você ganhou R$ 5,00.');
                    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
                })
                .catch((err) => {
                    console.error('Erro ao tentar cadastro:', err);
                    Toast.error(mensagemErroFirebase(err, 'register'));
                    if (submitBtn) submitBtn.disabled = false;
                });
        });
    }
});
