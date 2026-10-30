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

    const AVATAR = '<svg viewBox="0 0 64 64" aria-hidden="true">' +
        '<path d="M8 64c2-14 12-20 24-20s22 6 24 20Z" fill="#1a1a1a" stroke="#f0b429" stroke-width="1.2"/>' +
        '<path d="M28 44l4 8 4-8" fill="#f0b429"/>' +
        '<circle cx="32" cy="27" r="13" fill="#f0b429"/>' +
        '<path d="M17 28v-3a15 15 0 0 1 30 0v3" fill="none" stroke="#1a1a1a" stroke-width="3.5" stroke-linecap="round"/>' +
        '<rect x="13" y="25" width="6" height="11" rx="3" fill="#1a1a1a" stroke="#f0b429" stroke-width="1.2"/>' +
        '<rect x="45" y="25" width="6" height="11" rx="3" fill="#1a1a1a" stroke="#f0b429" stroke-width="1.2"/>' +
        '<path d="M48 35c0 6-6 8-12 8" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>';

    const ICONE_WHATS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M3.5 20.5l1.4-4.6A8.5 8.5 0 1 1 8.2 19.2Z"/>' +
        '<path d="M9 8.6c.3 2.6 2.8 5.3 6 6.2l1.3-1.3-2-1.1-.9.8c-1.1-.5-2-1.4-2.5-2.5l.8-.9-1.1-2Z"/></svg>';
    const ICONE_SETA = '<svg class="ger-seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

    lista.innerHTML = GERENTES.map((g, i) => `
        <article class="ger-card">
            <div class="ger-avatar">${AVATAR}</div>
            <div class="ger-info">
                <h3 class="ger-nome">${esc(g.nome)}</h3>
                <span class="ger-status ${g.online ? '' : 'is-offline'}">${g.online ? 'Online' : 'Offline'}</span>
                <p class="ger-desc">Tire suas dúvidas, receba suporte e orientações.</p>
            </div>
            <button type="button" class="ger-btn" data-ger="${i}">
                ${ICONE_WHATS}
                <span>Falar com<br>${esc(g.nome)}</span>
                ${ICONE_SETA}
            </button>
        </article>`).join('');

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
