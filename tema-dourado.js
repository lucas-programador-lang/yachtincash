// ============================================================
// TEMA DOURADO — comportamento do visual novo.
//  1) Menu inferior: cada botão "clica" no item do menu lateral
//     correspondente (então toda a lógica de abas continua a mesma) e
//     acompanha a aba ativa.
//  2) Olhinho do saldo (esconde/mostra o Saldo Total).
//  3) "Meus Ativos" no Início: planos ativos, rendimento de hoje e
//     comissão de hoje (lidos do seu Firebase).
// Carregue DEPOIS dos outros scripts no index.html.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // ---------- 1) Menu inferior ----------
    const barra = document.getElementById('goldBottomNav');
    if (barra) {
        const itensMenu = () => document.querySelectorAll('.sidebar .nav-item[data-section]');
        barra.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-go]');
            if (!btn) return;
            const alvo = document.querySelector('.sidebar .nav-item[data-section="' + btn.dataset.go + '"]');
            if (alvo) alvo.click();
        });
        const sincronizar = () => {
            const ativo = document.querySelector('.sidebar .nav-item.active');
            const secao = ativo ? ativo.dataset.section : 'inicio';
            barra.querySelectorAll('button[data-go]').forEach((b) => b.classList.toggle('is-active', b.dataset.go === secao));
        };
        const obs = new MutationObserver(sincronizar);
        itensMenu().forEach((el) => obs.observe(el, { attributes: true, attributeFilter: ['class'] }));
        sincronizar();
    }

    // ---------- 2) Olhinho do saldo ----------
    const cabecalho = document.querySelector('.balance-card .balance-card-header');
    const cartao = document.querySelector('.balance-card');
    if (cabecalho && cartao) {
        const olho = document.createElement('button');
        olho.type = 'button';
        olho.className = 'balance-eye';
        olho.setAttribute('aria-label', 'Mostrar ou esconder saldo');
        olho.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
        cabecalho.appendChild(olho);
        try { if (localStorage.getItem('saldoOculto') === '1') cartao.classList.add('is-hidden'); } catch (e) { /* sem storage */ }
        olho.addEventListener('click', () => {
            const oculto = cartao.classList.toggle('is-hidden');
            try { localStorage.setItem('saldoOculto', oculto ? '1' : '0'); } catch (e) { /* sem storage */ }
        });
    }

    // ---------- 3) Meus Ativos ----------
    const brl = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    if (document.getElementById('ativosPlanos') && typeof firebaseAuth !== 'undefined') {
        firebaseAuth.onAuthStateChanged((user) => {
            if (!user) return;
            firebaseDb.ref('users/' + user.uid + '/planos').on('value', (snap) => {
                const planos = Object.values(snap.val() || {});
                const agora = Date.now();
                const ativos = planos.filter((p) => Math.floor((agora - p.dataAtivacao) / 86400000) < p.duracaoDias);
                set('ativosPlanos', String(ativos.length));
                set('ativosRendimentoHoje', brl(ativos.reduce((s, p) => s + (Number(p.retornoDiario) || 0), 0)));
            });
            firebaseDb.ref('commissions/' + user.uid).on('value', (snap) => {
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                const soma = Object.values(snap.val() || {})
                    .filter((c) => (c.createdAt || 0) >= hoje.getTime())
                    .reduce((s, c) => s + (Number(c.valor) || 0), 0);
                set('ativosComissaoHoje', brl(soma));
            });
        });
    }
});
