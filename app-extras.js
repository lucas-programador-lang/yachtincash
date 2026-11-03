// ============================================================
// APP EXTRAS — comportamento do visual novo.
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
    // 4 atalhos fixos + botão "Mais", que abre uma folha com todo o resto.
    // (Antes o menu tinha 12 itens deslizando para o lado e muita gente
    // não percebia que dava para deslizar.)
    const barra = document.getElementById('appBottomNav');
    if (barra) {
        const PRINCIPAIS = ['inicio', 'investir', 'equipe', 'missoes'];
        const trilho = barra.querySelector('.abn-track') || barra;
        const botoes = Array.from(barra.querySelectorAll('button[data-go]'));
        const extras = botoes.filter((b) => PRINCIPAIS.indexOf(b.dataset.go) === -1);
        extras.forEach((b) => b.classList.add('abn-extra'));

        const irPara = (secao) => {
            const alvo = document.querySelector('.sidebar .nav-item[data-section="' + secao + '"]');
            if (alvo) alvo.click();
        };

        // Botão "Mais"
        const mais = document.createElement('button');
        mais.type = 'button';
        mais.id = 'abnMais';
        mais.setAttribute('aria-haspopup', 'dialog');
        mais.setAttribute('aria-expanded', 'false');
        mais.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>Mais';
        trilho.appendChild(mais);

        // Folha com os demais itens
        const folha = document.createElement('div');
        folha.className = 'abn-sheet';
        folha.id = 'abnSheet';
        folha.hidden = true;
        folha.innerHTML =
            '<div class="abn-sheet-panel" role="dialog" aria-modal="true" aria-label="Menu">' +
                '<div class="abn-sheet-handle"></div>' +
                '<div class="abn-sheet-head"><strong>Menu</strong>' +
                    '<button type="button" class="abn-sheet-close" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
                '</div>' +
                '<div class="abn-sheet-grid"></div>' +
            '</div>';
        const grade = folha.querySelector('.abn-sheet-grid');
        extras.forEach((b) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'abn-sheet-item';
            item.dataset.go = b.dataset.go;
            item.innerHTML = b.innerHTML;
            grade.appendChild(item);
        });
        // Telegram (antes só existia no menu lateral, que não aparece no celular)
        const tg = document.querySelector('.sidebar a.telegram-btn');
        if (tg) {
            const link = document.createElement('a');
            link.className = 'abn-sheet-item is-link';
            link.href = tg.href;
            link.target = '_blank';
            link.rel = 'noopener';
            link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4 3 11l6 2.5L11 20l3.2-4.3L19 19 21 4Z"/><path d="M9 13.5 21 4"/></svg>Telegram';
            grade.appendChild(link);
        }
        document.body.appendChild(folha);

        const abrir = () => {
            folha.hidden = false;
            requestAnimationFrame(() => folha.classList.add('is-open'));
            mais.setAttribute('aria-expanded', 'true');
            document.body.classList.add('abn-sheet-aberta');
        };
        const fechar = () => {
            folha.classList.remove('is-open');
            mais.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('abn-sheet-aberta');
            setTimeout(() => { if (!folha.classList.contains('is-open')) folha.hidden = true; }, 220);
        };
        mais.addEventListener('click', () => (folha.hidden ? abrir() : fechar()));
        folha.addEventListener('click', (e) => {
            if (e.target === folha || e.target.closest('.abn-sheet-close')) { fechar(); return; }
            const item = e.target.closest('button[data-go]');
            if (item) { irPara(item.dataset.go); fechar(); return; }
            if (e.target.closest('a.is-link')) fechar();
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !folha.hidden) fechar(); });

        // Atalhos fixos da barra
        barra.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-go]');
            if (btn) irPara(btn.dataset.go);
        });

        // Marca o item ativo (barra e folha); "Mais" fica ativo quando a tela atual está dentro dele
        const sincronizar = () => {
            const ativo = document.querySelector('.sidebar .nav-item.active');
            const secao = ativo ? ativo.dataset.section : 'inicio';
            document.querySelectorAll('#appBottomNav button[data-go], #abnSheet button[data-go]').forEach((b) => {
                b.classList.toggle('is-active', b.dataset.go === secao);
            });
            mais.classList.toggle('is-active', PRINCIPAIS.indexOf(secao) === -1);
        };
        const obs = new MutationObserver(sincronizar);
        document.querySelectorAll('.sidebar .nav-item[data-section]').forEach((el) => obs.observe(el, { attributes: true, attributeFilter: ['class'] }));
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
