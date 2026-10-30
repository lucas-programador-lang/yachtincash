// ============================================================
// Aba "Grupos" — WhatsApp e Telegram.
//
// >>> EDITE OS LINKS ABAIXO <<<
//   WhatsApp: link de convite do grupo (https://chat.whatsapp.com/XXXX)
//   Telegram: link do grupo/canal (https://t.me/seugrupo)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const lista = document.getElementById('gruposLista');
    if (!lista) return;

    const GRUPOS = [
        {
            tipo: 'whatsapp',
            titulo: 'Grupo do <span>WhatsApp</span>',
            descricao: 'Entre no nosso grupo do WhatsApp e receba avisos, novidades, dicas e suporte da equipe!',
            link: 'https://chat.whatsapp.com/COLOQUE-O-CODIGO-DO-GRUPO',
            beneficios: [['aviso', 'Avisos em tempo real'], ['presente', 'Promoções exclusivas'], ['equipe', 'Suporte da equipe'], ['chat', 'Interação com membros']]
        },
        {
            tipo: 'telegram',
            titulo: 'Grupo do <span>Telegram</span>',
            descricao: 'Entre no nosso grupo do Telegram e fique por dentro de todas as novidades, lançamentos e oportunidades em primeira mão!',
            link: 'https://t.me/yachtincash',
            beneficios: [['aviso', 'Avisos e atualizações'], ['presente', 'Promoções exclusivas'], ['equipe', 'Conteúdos diferenciados'], ['doc', 'Suporte e informações']]
        }
    ];

    const LINK_PADRAO = 'COLOQUE-O-CODIGO-DO-GRUPO'; // marcador: ainda não configurado
    const toast = (tipo, titulo, msg) => { if (typeof window.showToast === 'function') window.showToast(tipo, titulo, msg); };
    const S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

    const ICONES = {
        aviso: `<svg viewBox="0 0 24 24" ${S}><path d="M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>`,
        presente: `<svg viewBox="0 0 24 24" ${S}><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>`,
        equipe: `<svg viewBox="0 0 24 24" ${S}><circle cx="9" cy="8" r="3.2"/><path d="M2.8 19.2c.7-3.1 3.1-5 6.2-5s5.5 1.9 6.2 5"/><circle cx="17.5" cy="8.8" r="2.4"/><path d="M16 11.5c1.9.4 3.3 1.7 3.9 3.9"/></svg>`,
        chat: `<svg viewBox="0 0 24 24" ${S}><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="M8 10h8M8 13h5"/></svg>`,
        doc: `<svg viewBox="0 0 24 24" ${S}><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M9 12h6M9 16h6M9 8h2"/></svg>`,
        whatsapp: `<svg viewBox="0 0 24 24" ${S}><path d="M3.5 20.5l1.4-4.6A8.5 8.5 0 1 1 8.2 19.2Z"/><path d="M9 8.6c.3 2.6 2.8 5.3 6 6.2l1.3-1.3-2-1.1-.9.8c-1.1-.5-2-1.4-2.5-2.5l.8-.9-1.1-2Z"/></svg>`,
        telegram: `<svg viewBox="0 0 24 24" ${S}><path d="M21 4 3 11l5.5 2L10 19l3.2-3.6L17.5 19 21 4Z"/><path d="M8.5 13 21 4"/></svg>`,
        seta: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>`
    };

    lista.innerHTML = GRUPOS.map((g, i) => `
        <article class="gp-card is-${g.tipo}">
            <div class="gp-badge">${ICONES[g.tipo]}</div>
            <div>
                <h3 class="gp-titulo">${g.titulo}</h3>
                <p class="gp-desc">${g.descricao}</p>
            </div>
            <ul class="gp-beneficios">
                ${g.beneficios.map(([ic, txt]) => `<li><span class="gp-ico">${ICONES[ic]}</span>${txt}</li>`).join('')}
            </ul>
            <button type="button" class="gp-btn" data-gp="${i}">
                <span class="gp-btn-txt">${ICONES[g.tipo]}<span>Entrar no<br>Grupo</span></span>
                ${ICONES.seta}
            </button>
        </article>`).join('');

    lista.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-gp]');
        if (!btn) return;
        const g = GRUPOS[Number(btn.dataset.gp)];
        if (!g || !g.link || g.link.indexOf(LINK_PADRAO) !== -1) {
            toast('warning', 'Grupo indisponível', 'O link deste grupo ainda não foi configurado.');
            return;
        }
        window.open(g.link, '_blank', 'noopener');
    });
});
