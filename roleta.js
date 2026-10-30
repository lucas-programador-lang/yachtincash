// ============================================================
// Roleta da Sorte — tela "Roleta".
//
// REGRA: quando uma pessoa que você indicou faz um investimento
// de R$ 100,00 ou mais (aprovado pelo admin), você ganha 1 giro.
// (1 giro por indicado — concedido no admin.js, ao aprovar o depósito.)
//
// PRÊMIOS: R$ 2,00 no saldo OU desconto na taxa de saque.
//
// SEGURANÇA: quem sorteia o prêmio e credita é o Worker
// (rota POST /roleta/girar), igual às Missões. Aqui só mostramos o
// resultado e animamos a roda. Veja WORKER-ROLETA.md.
//
// Carregue este arquivo DEPOIS do script.js no index.html.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('section-roleta')) return;

    const WORKER_URL = 'https://apidayachtincash.lucas-dev-programador.workers.dev';
    const SEGMENTOS = 8; // alterna: dinheiro, desconto, dinheiro, desconto...
    const $ = (id) => document.getElementById(id);
    const toast = (tipo, titulo, msg) => { if (typeof window.showToast === 'function') window.showToast(tipo, titulo, msg); };
    const brl = (v) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let giros = 0;
    let descontoPontos = 0;
    let rotacao = 0;
    let girando = false;

    // ---------- Desenha a roda (SVG) ----------
    function desenharRoda() {
        const cx = 100, cy = 100, r = 98;
        const passo = 360 / SEGMENTOS;
        const cores = { dinheiro: '#1d6b3a', desconto: '#7a3fb0' };
        let svg = '<svg viewBox="0 0 200 200" class="rol-wheel" id="roletaRoda" aria-hidden="true">';

        for (let i = 0; i < SEGMENTOS; i++) {
            const tipo = i % 2 === 0 ? 'dinheiro' : 'desconto';
            // Segmento i fica centralizado em i * passo graus a partir do topo
            const a0 = (i * passo - passo / 2 - 90) * Math.PI / 180;
            const a1 = (i * passo + passo / 2 - 90) * Math.PI / 180;
            const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
            const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
            svg += `<path d="M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z" fill="${cores[tipo]}" stroke="#f0b429" stroke-width="1.5"/>`;

            const rotulo = tipo === 'dinheiro' ? 'R$ 2,00' : 'DESCONTO';
            const sub = tipo === 'dinheiro' ? '' : 'na taxa';
            svg += `<g transform="rotate(${i * passo} ${cx} ${cy})">` +
                `<text x="${cx}" y="34" text-anchor="middle">${rotulo}</text>` +
                (sub ? `<text x="${cx}" y="46" text-anchor="middle" style="font-size:8px;font-weight:600">${sub}</text>` : '') +
                '</g>';
        }
        svg += '</svg>';
        $('roletaRodaBox').innerHTML = svg;
    }

    // ---------- Estado do usuário ----------
    function atualizarTela() {
        if (!girando) {
            $('roletaGiros').textContent = String(giros);
            $('roletaDesconto').textContent = descontoPontos > 0 ? '-' + descontoPontos + '% na taxa' : 'Nenhum';
        }
        const btn = $('roletaGirar');
        btn.disabled = girando || giros < 1;
        btn.innerHTML = 'GIRAR<small>' + giros + (giros === 1 ? ' giro' : ' giros') + '</small>';
    }

    function renderizarHistorico(dados) {
        const corpo = $('roletaHistorico');
        const itens = dados ? Object.values(dados).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10) : [];
        if (!itens.length) {
            corpo.innerHTML = '<tr><td colspan="2" class="muted">Nenhum giro ainda.</td></tr>';
            return;
        }
        corpo.innerHTML = itens.map((h) => {
            const data = new Date(h.createdAt).toLocaleDateString('pt-BR');
            const premio = h.tipo === 'dinheiro' ? brl(h.valor) : '-' + h.pontos + '% na taxa de saque';
            return '<tr><td>' + data + '</td><td>' + premio + '</td></tr>';
        }).join('');
    }

    // ---------- Giro ----------
    async function chamarGirar() {
        const user = firebaseAuth.currentUser;
        if (!user) throw new Error('Faça login novamente.');
        const token = await user.getIdToken();
        const resposta = await fetch(WORKER_URL + '/roleta/girar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: '{}'
        });
        let dados = {};
        try { dados = await resposta.json(); } catch (e) { /* sem corpo */ }
        if (!resposta.ok) throw new Error(dados.error || 'Não foi possível girar agora.');
        return dados;
    }

    function animarAte(tipo) {
        // Escolhe um segmento do tipo sorteado (pares = dinheiro, ímpares = desconto)
        const candidatos = [];
        for (let i = 0; i < SEGMENTOS; i++) {
            if ((i % 2 === 0) === (tipo === 'dinheiro')) candidatos.push(i);
        }
        const alvo = candidatos[Math.floor(Math.random() * candidatos.length)];
        const passo = 360 / SEGMENTOS;
        const atual = ((rotacao % 360) + 360) % 360;
        const destino = (360 - alvo * passo) % 360;
        let delta = destino - atual;
        if (delta < 0) delta += 360;
        rotacao += 360 * 5 + delta;
        $('roletaRoda').style.transform = 'rotate(' + rotacao + 'deg)';
        return new Promise((resolve) => setTimeout(resolve, 5200));
    }

    function mostrarResultado(premio) {
        if (premio.tipo === 'dinheiro') {
            $('roletaResTitulo').textContent = 'Você ganhou ' + brl(premio.valor) + '!';
            $('roletaResTexto').textContent = 'O valor já foi creditado no seu saldo de Rendimento.';
        } else {
            $('roletaResTitulo').textContent = 'Desconto na taxa de saque!';
            $('roletaResTexto').textContent = 'Seu próximo saque terá -' + premio.pontos + '% de taxa.';
        }
        $('roletaResultado').classList.add('is-open');
    }

    $('roletaGirar').addEventListener('click', async () => {
        if (girando || giros < 1) return;
        girando = true;
        atualizarTela();
        try {
            const dados = await chamarGirar();
            await animarAte(dados.premio.tipo);
            mostrarResultado(dados.premio);
        } catch (err) {
            toast('error', 'Roleta', err.message);
        } finally {
            girando = false;
            atualizarTela();
        }
    });

    $('roletaResFechar').addEventListener('click', () => $('roletaResultado').classList.remove('is-open'));

    // ---------- Dados em tempo real ----------
    desenharRoda();
    atualizarTela();

    firebaseAuth.onAuthStateChanged((user) => {
        if (!user) return;
        firebaseDb.ref('users/' + user.uid).on('value', (snap) => {
            const d = snap.val() || {};
            giros = Number(d.roletaGiros) || 0;
            descontoPontos = Number(d.saqueDesconto) || 0;
            atualizarTela();
        });
        firebaseDb.ref('roletaHistorico/' + user.uid).limitToLast(10).on('value', (snap) => {
            renderizarHistorico(snap.val());
        });
    });
});
