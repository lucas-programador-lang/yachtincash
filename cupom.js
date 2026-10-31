// ============================================================
// Aba "Cupom" — resgate de cupons de R$ 0,10 a R$ 0,50.
//
// O navegador só ENVIA o código. Quem confere o cupom e credita o
// valor no saldo (Rendimento) é o Worker (POST /cupom/resgatar).
// Cada usuário resgata cada cupom UMA vez; o limite total de usos e a
// validade são definidos ao criar o cupom no painel admin.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const secao = document.getElementById('section-cupom');
    if (!secao) return;

    const WORKER_URL = 'https://apidayachtincash.lucas-dev-programador.workers.dev';
    const $ = (id) => document.getElementById(id);
    const toast = (tipo, titulo, msg) => { if (typeof window.showToast === 'function') window.showToast(tipo, titulo, msg); };
    const brl = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const ICONE_CUPOM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Z"/><path d="M9 9l6 6M9.5 9.5h.01M14.5 14.5h.01"/></svg>';
    const POR_PAGINA = 3;

    let resgates = [];
    let mostrarTodos = false;
    let enviando = false;

    function renderizar() {
        const lista = $('cupomLista');
        if (!resgates.length) {
            lista.innerHTML = '<p class="cp-vazio">Você ainda não resgatou nenhum cupom.</p>';
            $('cupomVerTodos').style.display = 'none';
            return;
        }
        const visiveis = mostrarTodos ? resgates : resgates.slice(0, POR_PAGINA);
        lista.innerHTML = visiveis.map((r) => {
            const d = new Date(r.createdAt || 0).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            return '<div class="cp-item"><span class="cp-item-ico">' + ICONE_CUPOM + '</span>' +
                '<div class="cp-item-info"><div class="cp-item-codigo">' + esc(r.codigo) + '</div><div class="cp-item-data">' + d + '</div></div>' +
                '<div class="cp-item-status"><span>Resgatado</span><strong>+ ' + brl(r.valor) + '</strong></div></div>';
        }).join('');
        const verTodos = $('cupomVerTodos');
        verTodos.style.display = resgates.length > POR_PAGINA ? '' : 'none';
        verTodos.textContent = mostrarTodos ? 'Ver menos' : 'Ver todos';
    }

    async function resgatar() {
        if (enviando) return;
        const codigo = $('cupomCodigo').value.trim();
        if (!codigo) { toast('warning', 'Cupom', 'Digite o código do cupom.'); return; }

        const user = firebaseAuth.currentUser;
        if (!user) { toast('error', 'Cupom', 'Faça login novamente.'); return; }

        enviando = true;
        const btn = $('cupomResgatar');
        btn.disabled = true;
        try {
            const token = await user.getIdToken();
            const resposta = await fetch(WORKER_URL + '/cupom/resgatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ codigo })
            });
            let dados = {};
            try { dados = await resposta.json(); } catch (e) { /* sem corpo */ }
            if (!resposta.ok) throw new Error(dados.error || 'Não foi possível resgatar o cupom.');

            $('cupomCodigo').value = '';
            toast('success', 'Cupom resgatado!', brl(dados.valor) + ' foram adicionados ao seu saldo.');
        } catch (err) {
            toast('error', 'Cupom', err.message);
        } finally {
            enviando = false;
            btn.disabled = false;
        }
    }

    $('cupomResgatar').addEventListener('click', resgatar);
    $('cupomCodigo').addEventListener('keydown', (e) => { if (e.key === 'Enter') resgatar(); });
    $('cupomVerTodos').addEventListener('click', () => { mostrarTodos = !mostrarTodos; renderizar(); });

    renderizar();

    firebaseAuth.onAuthStateChanged((user) => {
        if (!user) return;
        firebaseDb.ref('couponRedemptions/' + user.uid).on('value', (snap) => {
            const dados = snap.val() || {};
            resgates = Object.values(dados).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            renderizar();
        }, (err) => console.error('Erro ao ler cupons resgatados:', err));
    });
});
