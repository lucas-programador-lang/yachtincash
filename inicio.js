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

    function calcularVip(planos) {
        const lista = planos ? Object.values(planos) : [];
        return lista
            .filter((p) => Math.floor((Date.now() - p.dataAtivacao) / 86400000) < p.duracaoDias)
            .reduce((max, p) => Math.max(max, vipDoPlano(p)), 0);
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

        const nivel = calcularVip(dadosUsuario.planos);
        $('homeVipTexto').textContent = 'VIP ' + nivel;
        $('homeVip').classList.toggle('is-none', nivel === 0);

        // Mesmos dados no cabeçalho da tela Perfil (se existir)
        if ($('perfilNome')) {
            $('perfilNome').textContent = nomeCompleto || 'visitante';
            $('perfilAvatar').textContent = nome.charAt(0) || '?';
            $('perfilId').textContent = dadosUsuario.refCode || '—';
            $('perfilVipTexto').textContent = 'VIP ' + nivel;
            $('perfilVip').classList.toggle('is-none', nivel === 0);
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
