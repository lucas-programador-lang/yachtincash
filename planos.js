// ============================================================
// Catálogo de planos — FONTE ÚNICA da tela (Investir, Depósito e VIP).
//
// Regra: todos rendem 2,5% ao dia sobre o capital, até somar 60% do
// valor investido (60 / 2,5 = 24 dias de rendimento).
//
// ATENÇÃO: o admin.js e o worker.js têm a mesma tabela (o Worker é quem
// confere o preço de verdade). Se mudar um plano aqui, mude nos três.
//
// Carregue ESTE arquivo ANTES do deposito.js e do inicio.js.
// ============================================================
(function () {
    const TAXA_DIARIA_PERCENTUAL = 2.5;
    const LIMITE_PERCENTUAL = 60;
    const DURACAO_DIAS = LIMITE_PERCENTUAL / TAXA_DIARIA_PERCENTUAL; // 24

    // ---------- FOTOS DOS PLANOS ----------
    // Para usar uma foto sua em um plano, coloque o arquivo na mesma pasta
    // do index.html e escreva o nome aqui. Plano sem foto (ou foto que não
    // carregar) mostra a ilustração de moedas.
    // Exemplo:  'vip1-50': 'plano-iniciante.png',
    const IMAGENS = {
        // 'vip1-50': 'plano-iniciante.png',
        // 'vip2-70': 'plano-bronze.png',
        // 'vip3-150': 'plano-prata.png',
        // 'vip4-300': 'plano-ouro.png',
        // 'vip5-450': 'plano-master.png'
    };

    // [chave, nome, valor investido, nível VIP]
    const LISTA = [
        ['vip1-50', 'Plano Iniciante', 50, 1],
        ['vip2-70', 'Plano Bronze', 70, 2],
        ['vip3-150', 'Plano Prata', 150, 3],
        ['vip4-300', 'Plano Ouro', 300, 4],
        ['vip5-450', 'Plano Master', 450, 5]
    ];

    const catalogo = {};
    LISTA.forEach(([chave, nome, valor, vip]) => {
        catalogo[chave] = {
            nome: nome,
            valor: valor,
            vip: vip,
            imagem: IMAGENS[chave] || null,
            retornoDiario: Math.round(valor * TAXA_DIARIA_PERCENTUAL * 100) / 10000,
            duracaoDias: DURACAO_DIAS,
            totalRendimento: Math.round(valor * LIMITE_PERCENTUAL) / 100
        };
    });

    window.PLANOS_CATALOGO = catalogo;
    window.PLANOS_TAXA_DIARIA = TAXA_DIARIA_PERCENTUAL;
    window.PLANOS_LIMITE = LIMITE_PERCENTUAL;

    const brl = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = (v) => String(v).replace('.', ',');

    const ICONE_COROA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/><path d="M5 19h14"/></svg>';
    const ICONE_COROA_CHEIA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/></svg>';

    // Ilustração: duas pilhas de moedas que crescem com o nível VIP, com
    // sombreado, brilho e sombra no chão. As cores são o dourado do site
    // (variáveis do style.css), então acompanham a paleta.
    function pilha(cx, base, rx, ry, altura, quantidade, ids) {
        let svg = '';
        for (let i = 0; i < quantidade; i++) {
            const topo = base - i * altura;
            const fundo = topo + altura;
            svg += '<ellipse cx="' + cx + '" cy="' + fundo + '" rx="' + rx + '" ry="' + ry + '" fill="url(#' + ids.lado + ')"/>'
                + '<rect x="' + (cx - rx) + '" y="' + topo + '" width="' + (rx * 2) + '" height="' + altura + '" fill="url(#' + ids.lado + ')"/>'
                + '<path d="M' + (cx - rx) + ' ' + fundo + ' A' + rx + ' ' + ry + ' 0 0 0 ' + (cx + rx) + ' ' + fundo + '" fill="none" stroke="rgba(52,34,8,0.55)" stroke-width="0.9"/>';
        }
        const topoFinal = base - (quantidade - 1) * altura;
        svg += '<ellipse cx="' + cx + '" cy="' + topoFinal + '" rx="' + rx + '" ry="' + ry + '" fill="url(#' + ids.topo + ')" stroke="rgba(52,34,8,0.5)" stroke-width="0.8"/>'
            + '<ellipse cx="' + cx + '" cy="' + topoFinal + '" rx="' + (rx * 0.66) + '" ry="' + (ry * 0.62) + '" fill="none" stroke="rgba(120,84,26,0.55)" stroke-width="1"/>'
            + '<rect x="' + (cx - rx + 4) + '" y="' + topoFinal + '" width="3.2" height="' + ((quantidade - 1) * altura + altura - 1) + '" rx="1.6" fill="#fff" opacity="0.16"/>';
        return svg;
    }

    function brilho(x, y, tamanho) {
        const t = tamanho;
        return '<path d="M' + x + ' ' + (y - t) + ' L' + (x + t * 0.28) + ' ' + (y - t * 0.28) + ' L' + (x + t) + ' ' + y
            + ' L' + (x + t * 0.28) + ' ' + (y + t * 0.28) + ' L' + x + ' ' + (y + t)
            + ' L' + (x - t * 0.28) + ' ' + (y + t * 0.28) + ' L' + (x - t) + ' ' + y
            + ' L' + (x - t * 0.28) + ' ' + (y - t * 0.28) + ' Z" class="coin-spark"/>';
    }

    function pilhaMoedas(vip) {
        const ids = { lado: 'cs' + vip, topo: 'ct' + vip };
        const defs = '<defs>'
            + '<linearGradient id="' + ids.lado + '" x1="0" y1="0" x2="1" y2="0">'
            + '<stop offset="0" style="stop-color:var(--accent-gold-deep)"/>'
            + '<stop offset="0.3" style="stop-color:var(--accent-gold)"/>'
            + '<stop offset="0.62" style="stop-color:var(--accent-gold)"/>'
            + '<stop offset="1" style="stop-color:var(--accent-gold-deep)"/></linearGradient>'
            + '<linearGradient id="' + ids.topo + '" x1="0" y1="0" x2="1" y2="1">'
            + '<stop offset="0" style="stop-color:var(--accent-gold-soft)"/>'
            + '<stop offset="1" style="stop-color:var(--accent-gold)"/></linearGradient></defs>';

        let desenho = defs
            + '<ellipse cx="60" cy="74" rx="52" ry="5.5" fill="#000" opacity="0.38"/>'
            + pilha(34, 70, 20, 5.6, 6.5, Math.max(1, vip), ids)   // pilha menor, atrás
            + pilha(78, 68, 26, 7, 8, vip + 2, ids);               // pilha principal, à frente

        // brilhos: aparecem a partir do VIP 3
        const pontos = [[100, 16, 5], [16, 34, 3.6], [60, 8, 4]];
        for (let i = 0; i < Math.max(0, vip - 2); i++) {
            desenho += brilho(pontos[i][0], pontos[i][1], pontos[i][2]);
        }

        return '<svg class="plan-coins" viewBox="0 0 120 80" aria-hidden="true">' + desenho + '</svg>';
    }

    function renderizarPlanos() {
        const lista = document.getElementById('planList');
        if (!lista) return;

        lista.innerHTML = Object.entries(catalogo).map(([chave, p]) => {
            const arte = p.imagem
                ? '<img class="plan-photo" src="' + p.imagem + '" alt="' + p.nome + '" data-vip="' + p.vip + '" loading="lazy">'
                : pilhaMoedas(p.vip);
            return `
            <div class="plan-row">
                <span class="plan-icon">${ICONE_COROA}</span>
                <div class="plan-info">
                    <div class="plan-name">
                        <span>${p.nome}</span>
                        <span class="vip-badge">${ICONE_COROA_CHEIA}<span>VIP ${p.vip}</span></span>
                    </div>
                    <div class="plan-price">${brl(p.valor)}</div>
                    <div class="plan-rate">${pct(TAXA_DIARIA_PERCENTUAL)}% ao dia</div>
                    <div class="plan-meta muted">${p.duracaoDias} dias • rendimento total ${brl(p.totalRendimento)} (${LIMITE_PERCENTUAL}%)</div>
                </div>
                <div class="plan-side">
                    <div class="plan-art">${arte}</div>
                    <button type="button" class="btn btn-compact plan-buy" onclick="abrirDepositoComPlano('${chave}')">Investir</button>
                </div>
            </div>`;
        }).join('');

        // Foto que não carregar volta para a ilustração de moedas
        lista.querySelectorAll('img.plan-photo').forEach((img) => {
            img.addEventListener('error', () => {
                img.outerHTML = pilhaMoedas(Number(img.dataset.vip) || 1);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', renderizarPlanos);
})();
