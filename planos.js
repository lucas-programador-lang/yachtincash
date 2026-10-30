// ============================================================
// Catálogo de planos — FONTE ÚNICA da tela (Investir, Depósito e VIP).
//
// Regra: todos rendem 1% ao dia sobre o capital, até somar 50% do
// valor investido (50 / 1 = 50 dias de rendimento). O rendimento diário
// é fixo (não cai) e cada plano vale por 50 dias.
// Cada usuário pode ter no máximo 10 planos ativos de cada valor.
// Planos com VIP pagam um cashback (em reais) quando o plano é ativado.
//
// ATENÇÃO: o admin.js e o worker.js têm a mesma tabela (o Worker é quem
// confere o preço de verdade). Se mudar um plano aqui, mude nos três.
//
// Carregue ESTE arquivo ANTES do deposito.js e do inicio.js.
// ============================================================
(function () {
    const TAXA_DIARIA_PERCENTUAL = 1;
    const LIMITE_PERCENTUAL = 50;
    const DURACAO_DIAS = LIMITE_PERCENTUAL / TAXA_DIARIA_PERCENTUAL; // 50
    const LIMITE_COMPRAS = 10; // máximo de planos ativos do mesmo valor por usuário

    // ---------- FOTOS DOS PLANOS ----------
    // Para usar uma foto sua em um plano, coloque o arquivo na mesma pasta
    // do index.html e escreva o nome aqui. Plano sem foto (ou foto que não
    // carregar) mostra a ilustração de moedas.
    // Exemplo:  'ciclone1-50': 'ciclone-1.png',
    const IMAGENS = {
        // 'ciclone1-50': 'ciclone-1.png',
        // 'ciclone2-100': 'ciclone-2.png',
        // 'ciclone3-250': 'ciclone-3.png',
        // 'ciclone4-500': 'ciclone-4.png',
        // 'ciclone5-1000': 'ciclone-5.png'
    };

    // [chave, nome, valor investido, nível VIP (0 = sem VIP), cashback em R$]
    const LISTA = [
        ['ciclone1-50', 'Ciclone 1', 50, 0, 0],
        ['ciclone2-100', 'Ciclone 2', 100, 0, 0],
        ['ciclone3-250', 'Ciclone 3', 250, 4, 5],
        ['ciclone4-500', 'Ciclone 4', 500, 5, 10],
        ['ciclone5-1000', 'Ciclone 5', 1000, 6, 15]
    ];

    const catalogo = {};
    LISTA.forEach(([chave, nome, valor, vip, cashback], indice) => {
        catalogo[chave] = {
            nome: nome,
            valor: valor,
            vip: vip,
            cashback: cashback,
            ordem: indice + 1, // 1 a 5: só para o desenho das moedas
            limiteCompras: LIMITE_COMPRAS,
            imagem: IMAGENS[chave] || null,
            retornoDiario: Math.round(valor * TAXA_DIARIA_PERCENTUAL * 100) / 10000,
            duracaoDias: DURACAO_DIAS,
            totalRendimento: Math.round(valor * LIMITE_PERCENTUAL) / 100
        };
    });

    window.PLANOS_CATALOGO = catalogo;
    window.PLANOS_TAXA_DIARIA = TAXA_DIARIA_PERCENTUAL;
    window.PLANOS_LIMITE = LIMITE_PERCENTUAL;
    window.PLANOS_LIMITE_COMPRAS = LIMITE_COMPRAS;

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

    // "nivel" = ordem do plano (1 a 5): define o tamanho das pilhas
    function pilhaMoedas(nivel) {
        const vip = nivel;
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
                ? '<img class="plan-photo" src="' + p.imagem + '" alt="' + p.nome + '" data-vip="' + p.ordem + '" loading="lazy">'
                : pilhaMoedas(p.ordem);
            const selo = p.vip > 0
                ? '<span class="vip-badge">' + ICONE_COROA_CHEIA + '<span>VIP ' + p.vip + '</span></span>'
                : '<span class="vip-badge is-none"><span>Sem VIP</span></span>';
            const cashback = p.cashback > 0
                ? '<div class="plan-meta muted">Cashback de ' + brl(p.cashback) + ' na ativação</div>'
                : '';
            return `
            <div class="plan-row">
                <span class="plan-icon">${ICONE_COROA}</span>
                <div class="plan-info">
                    <div class="plan-name">
                        <span>${p.nome}</span>
                        ${selo}
                    </div>
                    <div class="plan-price">${brl(p.valor)}</div>
                    <div class="plan-rate">${pct(TAXA_DIARIA_PERCENTUAL)}% ao dia</div>
                    <div class="plan-meta muted">${p.duracaoDias} dias • rendimento total ${brl(p.totalRendimento)} (${LIMITE_PERCENTUAL}%)</div>
                    ${cashback}
                    <div class="plan-meta muted">Limitado a ${p.limiteCompras} por usuário</div>
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
