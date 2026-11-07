// ============================================================
// Início — preenche o cabeçalho (nome, VIP, ID) em tempo real e liga
// o atalho "Planos". Saldo, Rendimento e Comissão continuam sendo
// atualizados pelo script.js (mesmos IDs de antes).
//
// Carregue este arquivo DEPOIS do script.js no index.html.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('section-inicio')) return;

    const $ = (id) => document.getElementById(id);

    // ---------- VIP ----------
    // O nível é o do MAIOR plano ativo (tabela em planos.js). Sem plano
    // ativo = VIP 0.
    function vipDoPlano(plano) {
        const catalogo = window.PLANOS_CATALOGO || {};
        if (plano.planoKey && catalogo[plano.planoKey]) return catalogo[plano.planoKey].vip;
        // Planos antigos (sem chave no catálogo): maior plano que cabe no valor investido
        return Object.values(catalogo)
            .filter((p) => p.valor <= (plano.valorInvestido || 0))
            .reduce((max, p) => Math.max(max, p.vip), 0);
    }

    // Ícone do selo VIP.
    //  - Plano da tela Investir  -> coroa do nível (icone-*.png)
    //  - Ciclo (Ciclone 3, 4 e 5) -> baú do ciclo (ciclone-*.png)
    // Vale o plano ativo de MAIOR nível VIP. Se dois empatarem (ex.: Plano
    // Ouro e Ciclone 3 são os dois VIP 4), vale o comprado por último.
    const COROAS_VIP = {
        1: 'icone-iniciante.png',
        2: 'icone-bronze.png',
        3: 'icone-prata.png',
        4: 'icone-ouro.png',
        5: 'icone-master.png'
    };
    function ehCiclo(plano) {
        return typeof plano.planoKey === 'string' && plano.planoKey.indexOf('ciclone') === 0;
    }
    function arquivoIconeVip(plano, nivel) {
        if (!plano || nivel <= 0) return null;
        const catalogo = window.PLANOS_CATALOGO || {};
        if (ehCiclo(plano)) {
            const info = catalogo[plano.planoKey];
            return (info && info.imagem) || null;     // baú do ciclo
        }
        return COROAS_VIP[nivel] || null;             // coroa do plano
    }
    function mostrarIconeVip(idImg, arquivo) {
        const img = $(idImg);
        if (!img) return;
        const selo = img.closest('.vip-badge');
        if (arquivo) {
            if (img.getAttribute('src') !== arquivo) img.src = arquivo;
            img.hidden = false;
        } else {
            img.hidden = true;
            img.removeAttribute('src');
        }
        if (selo) selo.classList.toggle('has-img', !!arquivo);
    }

    // Devolve { nivel, arquivo } do melhor plano ativo
    function calcularVipDetalhe(planos) {
        const lista = planos ? Object.values(planos) : [];
        let melhor = null;
        let nivel = 0;
        lista
            .filter((p) => Math.floor((Date.now() - p.dataAtivacao) / 86400000) < p.duracaoDias)
            .forEach((p) => {
                const n = vipDoPlano(p);
                const quando = p.createdAt || p.dataAtivacao || 0;
                const quandoMelhor = melhor ? (melhor.createdAt || melhor.dataAtivacao || 0) : 0;
                if (n > nivel || (n === nivel && n > 0 && quando > quandoMelhor)) {
                    nivel = n;
                    melhor = p;
                }
            });
        return { nivel: nivel, arquivo: arquivoIconeVip(melhor, nivel) };
    }

    function primeiroNome(texto) {
        return (texto || '').trim().split(/\s+/)[0] || '';
    }

    let dadosUsuario = {};
    let usuarioAtual = null;

    function renderizarCabecalho() {
        const nomeCompleto = dadosUsuario.fullName
            || (usuarioAtual && (usuarioAtual.displayName || (usuarioAtual.email || '').split('@')[0]))
            || '';
        const nome = primeiroNome(nomeCompleto) || 'visitante';

        $('homeNome').textContent = nome;
        $('homeAvatar').textContent = nome.charAt(0) || '?';
        $('homeId').textContent = dadosUsuario.refCode || '—';

        const vip = calcularVipDetalhe(dadosUsuario.planos);
        const nivel = vip.nivel;
        $('homeVipTexto').textContent = 'VIP ' + nivel;
        $('homeVip').classList.toggle('is-none', nivel === 0);
        mostrarIconeVip('homeVipImg', vip.arquivo);

        // Mesmos dados no cabeçalho da tela Perfil (se existir)
        if ($('perfilNome')) {
            $('perfilNome').textContent = nomeCompleto || 'visitante';
            $('perfilAvatar').textContent = nome.charAt(0) || '?';
            $('perfilId').textContent = dadosUsuario.refCode || '—';
            $('perfilVipTexto').textContent = 'VIP ' + nivel;
            $('perfilVip').classList.toggle('is-none', nivel === 0);
            mostrarIconeVip('perfilVipImg', vip.arquivo);
        }
    }

    // ---------- Dados do usuário em tempo real ----------
    let pararEscuta = null;
    let gerandoRefCode = false;

    firebaseAuth.onAuthStateChanged((user) => {
        if (pararEscuta) { pararEscuta(); pararEscuta = null; }
        usuarioAtual = user;
        if (!user) return;

        const ref = firebaseDb.ref('users/' + user.uid);
        const callback = ref.on('value', (snapshot) => {
            dadosUsuario = snapshot.val() || {};
            renderizarCabecalho();

            // Contas criadas antes do código de indicação existir: gera um
            // agora, para o ID aparecer e o link de indicação funcionar.
            if (!dadosUsuario.refCode && !gerandoRefCode && typeof gerarCodigoIndicacaoUnico === 'function') {
                gerandoRefCode = true;
                gerarCodigoIndicacaoUnico(user.uid)
                    .then((codigo) => ref.update({ refCode: codigo }))
                    .catch((err) => console.error('Erro ao gerar o ID do usuário:', err))
                    .finally(() => { gerandoRefCode = false; });
            }
        }, (err) => console.error('Erro ao ler dados do usuário:', err));

        pararEscuta = () => ref.off('value', callback);
    });

    // O VIP depende da validade dos planos: reavalia a cada minuto
    setInterval(renderizarCabecalho, 60000);

    // ---------- Atalho "Planos" → página Investir ----------
    document.addEventListener('click', (e) => {
        const alvo = e.target.closest('[data-goto]');
        if (!alvo) return;
        const menu = document.querySelector('.nav-item[data-section="' + alvo.dataset.goto + '"]');
        if (menu) menu.click();
    });
});
