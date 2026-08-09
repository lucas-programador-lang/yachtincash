document.addEventListener('DOMContentLoaded', () => {
    // ===== Modais (ex: Depositar) =====
    window.openModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            if (modalId === 'depositModal') {
                const qrView = document.getElementById('depositQrView');
                if (qrView) {
                    qrView.style.display = 'none';
                    document.getElementById('qrcodeCanvas').innerHTML = '';
                }
            }
            modal.classList.add('open');
            document.body.classList.add('modal-open');
        }
    };

    window.closeModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('open');
            document.body.classList.remove('modal-open');
        }
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach((modal) => {
                modal.classList.remove('open');
            });
            document.body.classList.remove('modal-open');
            closeSidebar();
        }
    });

    // ===== Menu hambúrguer (gaveta lateral no mobile) =====
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarCloseBtn = document.getElementById('sidebarClose');

    function openSidebar() {
        if (!sidebar) return;
        sidebar.classList.add('mobile-open');
        sidebarOverlay.classList.add('open');
        hamburgerBtn.classList.add('is-open');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
        document.body.classList.add('modal-open'); // reaproveita o travamento de scroll
    }

    function closeSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('open');
        hamburgerBtn.classList.remove('is-open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('modal-open');
    }

    if (hamburgerBtn && sidebar && sidebarOverlay) {
        hamburgerBtn.addEventListener('click', () => {
            const isOpen = sidebar.classList.contains('mobile-open');
            isOpen ? closeSidebar() : openSidebar();
        });
        sidebarOverlay.addEventListener('click', closeSidebar);
        sidebarCloseBtn?.addEventListener('click', closeSidebar);
    }

    // ===== Toasts (substitui os alert() nativos do navegador) =====
    window.showToast = function (type, title, message) {
        const container = document.getElementById('toastContainer');
        if (!container) {
            // Fallback caso o container não exista na página
            alert(message ? `${title}\n${message}` : title);
            return;
        }

        const icons = { success: '✓', error: '✕', warning: '!', info: 'i' };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type || 'info'}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-body">
                <div class="toast-title"></div>
                ${message ? '<div class="toast-message"></div>' : ''}
            </div>
            <button class="toast-close" type="button" aria-label="Fechar">&times;</button>
        `;
        toast.querySelector('.toast-title').textContent = title;
        if (message) {
            toast.querySelector('.toast-message').textContent = message;
        }

        const removeToast = () => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 260);
        };

        toast.querySelector('.toast-close').addEventListener('click', removeToast);
        setTimeout(removeToast, 4000);

        container.appendChild(toast);
    };

    // ===== QR Code Pix (modal de Depositar) =====
    window.gerarQrCodeDeposito = function () {
        const cpfInput = document.getElementById('depositCpf');
        const telefoneInput = document.getElementById('depositTelefone');

        if (!cpfInput.value.trim() || !telefoneInput.value.trim()) {
            showToast('warning', 'Campos obrigatórios', 'Preencha CPF e Telefone para gerar o Pix.');
            return;
        }

        // Código Pix "copia e cola" (exemplo — substituir pela integração real do gateway)
        const pixCode = '00020126580014BR.GOV.BCB.PIX2572qrcode.cartwavehub.com.br/v2/qr/cob/945c7fe1-5dc0-49a1-be8d-041bf95642e05204000053039865802BR5925PLATAFORMA6009SAO PAULO62070503***6304ABCD';

        const qrContainer = document.getElementById('qrcodeCanvas');
        qrContainer.innerHTML = '';

        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: pixCode,
                width: 200,
                height: 200,
                colorDark: '#0e1420',
                colorLight: '#ffffff'
            });
        } else {
            console.error('Biblioteca QRCode não carregada.');
            qrContainer.innerText = 'Não foi possível gerar o QR Code.';
        }

        document.getElementById('depositPixCode').innerText = pixCode;
        document.getElementById('depositQrView').style.display = 'block';
    };

    window.copiarCodigoPixDeposito = function () {
        const pixCode = document.getElementById('depositPixCode').innerText;
        navigator.clipboard.writeText(pixCode).then(() => showToast('success', 'Código Pix copiado!'));
    };

    // Tratamento do formulário de Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof Auth === 'undefined') {
                console.error('Auth não está definido. Verifique se o script de autenticação foi carregado antes deste arquivo.');
                showToast('error', 'Erro ao carregar o sistema de login', 'Tente recarregar a página.');
                return;
            }
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            if (!usernameInput || !passwordInput) {
                console.error('Campos de usuário/senha não encontrados no formulário de login.');
                showToast('error', 'Erro no formulário', 'Tente recarregar a página.');
                return;
            }
            const user = usernameInput.value;
            const pass = passwordInput.value;
            try {
                if (Auth.login(user, pass)) {
                    window.location.href = 'index.html';
                } else {
                    showToast('error', 'Preencha os campos corretamente!');
                }
            } catch (err) {
                console.error('Erro ao tentar login:', err);
                showToast('error', 'Erro ao realizar login.');
            }
        });
    }

    // Tratamento do formulário de Registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (typeof Auth === 'undefined') {
                console.error('Auth não está definido. Verifique se o script de autenticação foi carregado antes deste arquivo.');
                showToast('error', 'Erro ao carregar o sistema de cadastro', 'Tente recarregar a página.');
                return;
            }
            const regUserInput = document.getElementById('regUser');
            const regPassInput = document.getElementById('regPass');
            if (!regUserInput || !regPassInput) {
                console.error('Campos de usuário/senha não encontrados no formulário de registro.');
                showToast('error', 'Erro no formulário', 'Tente recarregar a página.');
                return;
            }
            const user = regUserInput.value;
            const pass = regPassInput.value;
            try {
                if (Auth.register(user, pass)) {
                    showToast('success', 'Cadastro realizado com sucesso!', 'Você ganhou R$ 5,00.');
                    setTimeout(() => { window.location.href = 'index.html'; }, 1200);
                } else {
                    showToast('error', 'Erro ao realizar cadastro.');
                }
            } catch (err) {
                console.error('Erro ao tentar cadastro:', err);
                showToast('error', 'Erro ao realizar cadastro.');
            }
        });
    }

    // Se estiver na index (dashboard), protege a rota e atualiza dados
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
        if (typeof Auth !== 'undefined') {
            Auth.protectRoute();

            const savedBalance = localStorage.getItem('yacht_balance') || '5.00';

            // Atualiza o saldo em todos os lugares onde ele aparece (Início, Carteira, Perfil)
            const balanceTargets = ['userBalance', 'sacarSaldoDisponivel'];
            balanceTargets.forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.innerText = `R$ ${savedBalance}`;
            });

            // Preenche dados do Perfil, se o Auth expuser o usuário logado
            const perfilUsuario = document.getElementById('perfilUsuario');
            const perfilSaldo = document.getElementById('perfilSaldo');
            if (perfilUsuario) {
                const currentUser = (typeof Auth.getCurrentUser === 'function')
                    ? Auth.getCurrentUser()
                    : localStorage.getItem('yacht_user') || '-';
                perfilUsuario.innerText = currentUser || '-';
            }
            if (perfilSaldo) {
                perfilSaldo.innerText = `R$ ${savedBalance}`;
            }
        } else {
            console.error('Auth não está definido. A rota do dashboard não pôde ser protegida.');
        }

        // ===== Navegação da Sidebar (troca de seções) =====
        const navItems = document.querySelectorAll('.nav-item[data-section]');
        const sections = document.querySelectorAll('.page-section');

        function showSection(sectionKey) {
            sections.forEach((section) => {
                section.classList.toggle('active', section.id === `section-${sectionKey}`);
            });
            navItems.forEach((item) => {
                item.classList.toggle('active', item.dataset.section === sectionKey);
            });
            // Lembra a última seção visitada
            localStorage.setItem('yacht_last_section', sectionKey);
        }

        navItems.forEach((item) => {
            item.addEventListener('click', () => {
                showSection(item.dataset.section);
                // No mobile, a navegação acontece dentro da gaveta — fecha ao escolher uma seção
                closeSidebar();
            });
        });

        // Restaura a última seção visitada (padrão: início)
        const lastSection = localStorage.getItem('yacht_last_section');
        if (lastSection && document.getElementById(`section-${lastSection}`)) {
            showSection(lastSection);
        }
    }
});
