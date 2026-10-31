// ============================================================
// Painel admin — criação e gestão de cupons (R$ 0,10 a R$ 0,50).
// Carregue DEPOIS do admin.js no admin.html. Só roda para quem tem
// users/{uid}/isAdmin === true (as regras do Firebase também exigem).
//
// Estrutura gravada em coupons/{CODIGO}:
//   { valor, ativo, usosMax, usos, expiraEm?, createdAt }
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('cuponsBody')) return;

    const VALOR_MIN = 0.10;
    const VALOR_MAX = 0.50;
    const toast = (tipo, titulo, msg) => { if (typeof window.showToast === 'function') window.showToast(tipo, titulo, msg); };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const brl = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let cupons = {};

    function render() {
        const corpo = document.getElementById('cuponsBody');
        const codigos = Object.keys(cupons).sort((a, b) => (cupons[b].createdAt || 0) - (cupons[a].createdAt || 0));
        if (!codigos.length) {
            corpo.innerHTML = '<tr><td colspan="6">Nenhum cupom criado ainda.</td></tr>';
            return;
        }
        corpo.innerHTML = codigos.map((cod) => {
            const c = cupons[cod];
            const expirado = c.expiraEm && Date.now() > c.expiraEm;
            const esgotado = (c.usos || 0) >= (c.usosMax || 1);
            const status = !c.ativo ? 'Desativado' : expirado ? 'Expirado' : esgotado ? 'Esgotado' : 'Ativo';
            const validade = c.expiraEm ? new Date(c.expiraEm).toLocaleDateString('pt-BR') : 'Sem validade';
            return '<tr>' +
                '<td><strong>' + esc(cod) + '</strong></td>' +
                '<td>' + brl(c.valor) + '</td>' +
                '<td>' + (c.usos || 0) + ' / ' + (c.usosMax || 1) + '</td>' +
                '<td>' + validade + '</td>' +
                '<td>' + status + '</td>' +
                '<td>' +
                    '<button type="button" class="btn btn-outline" data-cp="toggle" data-id="' + esc(cod) + '">' + (c.ativo ? 'Desativar' : 'Ativar') + '</button> ' +
                    '<button type="button" class="btn btn-danger" data-cp="excluir" data-id="' + esc(cod) + '">Excluir</button>' +
                '</td></tr>';
        }).join('');
    }

    async function criar() {
        const codigo = document.getElementById('cupomNovoCodigo').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const valor = Math.round(parseFloat(String(document.getElementById('cupomNovoValor').value).replace(',', '.')) * 100) / 100;
        const usosMax = parseInt(document.getElementById('cupomNovoUsos').value, 10);
        const dias = parseInt(document.getElementById('cupomNovoDias').value, 10);

        if (codigo.length < 3 || codigo.length > 20) { toast('warning', 'Cupom', 'O código deve ter de 3 a 20 letras/números.'); return; }
        if (!(valor >= VALOR_MIN && valor <= VALOR_MAX)) { toast('warning', 'Cupom', 'O valor deve ficar entre R$ 0,10 e R$ 0,50.'); return; }
        if (!(usosMax >= 1)) { toast('warning', 'Cupom', 'Informe quantas pessoas podem usar (mínimo 1).'); return; }

        const ref = firebaseDb.ref('coupons/' + codigo);
        try {
            const existente = await ref.once('value');
            if (existente.exists()) { toast('warning', 'Cupom', 'Já existe um cupom com esse código.'); return; }

            const dados = { valor, ativo: true, usosMax, usos: 0, createdAt: Date.now() };
            if (dias >= 1) dados.expiraEm = Date.now() + dias * 86400000;
            await ref.set(dados);

            ['cupomNovoCodigo', 'cupomNovoDias'].forEach((id) => { document.getElementById(id).value = ''; });
            toast('success', 'Cupom criado!', codigo + ' — ' + brl(valor) + ' para até ' + usosMax + ' pessoa(s).');
        } catch (err) {
            console.error('Erro ao criar cupom:', err);
            toast('error', 'Cupom', 'Não foi possível criar o cupom. Confira as regras do Firebase.');
        }
    }

    document.getElementById('cupomCriar').addEventListener('click', criar);

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-cp]');
        if (!btn) return;
        const cod = btn.dataset.id;
        try {
            if (btn.dataset.cp === 'toggle') {
                await firebaseDb.ref('coupons/' + cod + '/ativo').set(!(cupons[cod] && cupons[cod].ativo));
            } else if (btn.dataset.cp === 'excluir' && window.confirm('Excluir o cupom ' + cod + '?')) {
                await firebaseDb.ref('coupons/' + cod).remove();
            }
        } catch (err) {
            console.error('Erro ao alterar cupom:', err);
            toast('error', 'Cupom', 'Não foi possível alterar o cupom.');
        }
    });

    firebaseAuth.onAuthStateChanged((user) => {
        if (!user) return;
        firebaseDb.ref('users/' + user.uid + '/isAdmin').once('value').then((snap) => {
            if (snap.val() !== true) return;
            firebaseDb.ref('coupons').on('value', (s) => { cupons = s.val() || {}; render(); },
                (err) => console.error('[Admin] Erro ao ler coupons:', err.code, err.message));
        });
    });
});
