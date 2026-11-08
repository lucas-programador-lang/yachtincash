// ============================================================
// Aba "Gerente" — atendimento por WhatsApp.
//
// >>> EDITE A LISTA ABAIXO <<<
//   numero:   WhatsApp com código do país e DDD, só dígitos
//             (ex.: 5511987654321 = +55 11 98765-4321)
//   online:   true mostra "Online" (verde), false mostra "Offline"
//   mensagem: texto que já vem escrito na conversa
//
// Para ter mais ou menos gerentes, é só adicionar/remover linhas.
// Carregue este arquivo no index.html (já incluído).
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const lista = document.getElementById('gerenteLista');
    if (!lista) return;

    const GERENTES = [
        { nome: 'Gerente 1', numero: '5500000000000', online: true, mensagem: 'Olá! Preciso de ajuda na YachtinCash.' },
        { nome: 'Gerente 2', numero: '5500000000000', online: true, mensagem: 'Olá! Preciso de ajuda na YachtinCash.' },
        { nome: 'Gerente 3', numero: '5500000000000', online: true, mensagem: 'Olá! Preciso de ajuda na YachtinCash.' }
    ];

    const NUMERO_PADRAO = '5500000000000'; // marcador: ainda não configurado

    const toast = (tipo, titulo, msg) => { if (typeof window.showToast === 'function') window.showToast(tipo, titulo, msg); };
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // Avatar do atendente (headset). Cada cartão tem seus próprios degradês (id com o
    // índice) e as cores vão em style="" para valer sobre o CSS da aba.
    const avatar = (i) => `<svg viewBox="0 0 64 64" aria-hidden="true">
        <defs>
            <linearGradient id="gav-bg${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b4768"/><stop offset="1" stop-color="#0a1c2d"/></linearGradient>
            <linearGradient id="gav-corpo${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4be8dd"/><stop offset="1" stop-color="#16808f"/></linearGradient>
            <linearGradient id="gav-rosto${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdeebd"/><stop offset="1" stop-color="#dcb45f"/></linearGradient>
        </defs>
        <rect width="64" height="64" style="fill:url(#gav-bg${i})"/>
        <path d="M7 64c2-14 12-19 25-19s23 5 25 19Z" style="fill:url(#gav-corpo${i});stroke:none"/>
        <path d="M27 45.5l5 8 5-8Z" style="fill:#f1d58b;stroke:none"/>
        <circle cx="32" cy="28" r="12.5" style="fill:url(#gav-rosto${i});stroke:none"/>
        <path d="M17.5 29v-4a14.5 14.5 0 0 1 29 0v4" style="fill:none;stroke:#0b2236;stroke-width:3.4;stroke-linecap:round"/>
        <rect x="13" y="26" width="7" height="12" rx="3.5" style="fill:#0b2236;stroke:#f1d58b;stroke-width:1.2"/>
        <rect x="44" y="26" width="7" height="12" rx="3.5" style="fill:#0b2236;stroke:#f1d58b;stroke-width:1.2"/>
        <path d="M48 37.5c0 6.5-6 8.5-12.5 8.5" style="fill:none;stroke:#0b2236;stroke-width:2;stroke-linecap:round"/>
        <circle cx="35" cy="46" r="2.3" style="fill:#f1d58b;stroke:none"/>
    </svg>`;

    const ICONE_WHATS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M3.5 20.5l1.4-4.6A8.5 8.5 0 1 1 8.2 19.2Z"/>' +
        '<path d="M9 8.6c.3 2.6 2.8 5.3 6 6.2l1.3-1.3-2-1.1-.9.8c-1.1-.5-2-1.4-2.5-2.5l.8-.9-1.1-2Z"/></svg>';
    const ICONE_SETA = '<svg class="ger-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

    lista.innerHTML = GERENTES.map((g, i) => `
        <article class="ger-card">
            <div class="ger-avatar-wrap">
                <div class="ger-avatar">${avatar(i)}</div>
                <span class="ger-dot ${g.online ? '' : 'is-offline'}" aria-hidden="true"></span>
            </div>
            <div class="ger-info">
                <div class="ger-linha">
                    <h3 class="ger-nome">${esc(g.nome)}</h3>
                    <span class="ger-status ${g.online ? '' : 'is-offline'}">${g.online ? 'Online' : 'Offline'}</span>
                </div>
                <p class="ger-desc">Tire suas dúvidas, receba suporte e orientações.</p>
            </div>
            <button type="button" class="ger-btn" data-ger="${i}" aria-label="Falar com ${esc(g.nome)} no WhatsApp">
                <span class="ger-btn-ico">${ICONE_WHATS}</span>
                <span class="ger-btn-txt"><small>Falar com</small>${esc(g.nome)}</span>
                ${ICONE_SETA}
            </button>
        </article>`).join('');

    // Resumo no cabeçalho: quantos gerentes estão online agora
    const cabecalho = document.querySelector('#section-gerente .ger-header > div');
    if (cabecalho && !cabecalho.querySelector('.ger-resumo')) {
        const online = GERENTES.filter((g) => g.online).length;
        const resumo = document.createElement('span');
        resumo.className = 'ger-resumo';
        resumo.textContent = online + (online === 1 ? ' gerente online' : ' gerentes online');
        cabecalho.appendChild(resumo);
    }

    lista.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-ger]');
        if (!btn) return;
        const g = GERENTES[Number(btn.dataset.ger)];
        const numero = String((g && g.numero) || '').replace(/\D/g, '');
        if (!numero || numero === NUMERO_PADRAO) {
            toast('warning', 'Gerente indisponível', 'O WhatsApp deste gerente ainda não foi configurado.');
            return;
        }
        const link = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(g.mensagem || '');
        window.open(link, '_blank', 'noopener');
    });
});
