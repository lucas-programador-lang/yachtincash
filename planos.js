// ============================================================
// Catálogo de planos — FONTE ÚNICA da tela (Investir, Depósito e VIP).
//
// Regra: todos rendem 2,5% ao dia sobre o capital, até somar 60% do
// valor investido (60 / 2,5 = 24 dias de rendimento).
//
// ATENÇÃO: o admin.js e o worker.js têm a mesma tabela (o Worker é quem
// confere o preço de verdade). Se mudar um plano aqui, mude nos três.
//
// Existem DOIS grupos de planos, cada um com a sua tela e as suas regras:
//   - PLANOS (tela Investir): 2,5% ao dia até 60% do valor, 24 dias.
//   - CICLOS (tela Ciclos): 1% ao dia até 50% do valor, 50 dias, rendimento
//     fixo, limite de 10 ativos por usuário e cashback nos que têm VIP.
// Os dois ficam juntos em window.PLANOS_CATALOGO (campo "grupo").
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

    // ---------- CICLOS (Ciclone 1 a 5) ----------
    const CICLO_TAXA_DIARIA = 1;
    const CICLO_LIMITE_PERCENTUAL = 50;
    const CICLO_DURACAO_DIAS = CICLO_LIMITE_PERCENTUAL / CICLO_TAXA_DIARIA; // 50
    const CICLO_LIMITE_COMPRAS = 10; // máximo de ciclos ativos do mesmo tipo por usuário

    // Fotos dos ciclos (mesma ideia das fotos dos planos)
    const IMAGENS_CICLOS = {
        // 'ciclone1-50': 'ciclone-1.png',
        // 'ciclone2-100': 'ciclone-2.png',
        // 'ciclone3-250': 'ciclone-3.png',
        // 'ciclone4-500': 'ciclone-4.png',
        // 'ciclone5-1000': 'ciclone-5.png'
    };

    // [chave, nome, valor investido, nível VIP (0 = sem VIP), cashback em R$]
    const LISTA_CICLOS = [
        ['ciclone1-50', 'Ciclone 1', 50, 0, 0],
        ['ciclone2-100', 'Ciclone 2', 100, 0, 0],
        ['ciclone3-250', 'Ciclone 3', 250, 4, 5],
        ['ciclone4-500', 'Ciclone 4', 500, 5, 10],
        ['ciclone5-1000', 'Ciclone 5', 1000, 6, 15]
    ];

    const catalogo = {};
    LISTA.forEach(([chave, nome, valor, vip], indice) => {
        catalogo[chave] = {
            grupo: 'planos',
            nome: nome,
            valor: valor,
            vip: vip,
            cashback: 0,
            ordem: indice + 1,
            taxaDiaria: TAXA_DIARIA_PERCENTUAL,
            limitePercentual: LIMITE_PERCENTUAL,
            imagem: IMAGENS[chave] || null,
            retornoDiario: Math.round(valor * TAXA_DIARIA_PERCENTUAL * 100) / 10000,
            duracaoDias: DURACAO_DIAS,
            totalRendimento: Math.round(valor * LIMITE_PERCENTUAL) / 100
        };
    });
    LISTA_CICLOS.forEach(([chave, nome, valor, vip, cashback], indice) => {
        catalogo[chave] = {
            grupo: 'ciclos',
            nome: nome,
            valor: valor,
            vip: vip,
            cashback: cashback,
            ordem: indice + 1,
            limiteCompras: CICLO_LIMITE_COMPRAS,
            taxaDiaria: CICLO_TAXA_DIARIA,
            limitePercentual: CICLO_LIMITE_PERCENTUAL,
            imagem: IMAGENS_CICLOS[chave] || null,
            retornoDiario: Math.round(valor * CICLO_TAXA_DIARIA * 100) / 10000,
            duracaoDias: CICLO_DURACAO_DIAS,
            totalRendimento: Math.round(valor * CICLO_LIMITE_PERCENTUAL) / 100
        };
    });

    window.PLANOS_CATALOGO = catalogo;
    window.PLANOS_TAXA_DIARIA = TAXA_DIARIA_PERCENTUAL;
    window.PLANOS_LIMITE = LIMITE_PERCENTUAL;
    window.CICLOS_LIMITE_COMPRAS = CICLO_LIMITE_COMPRAS;

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

    // "vip" aqui é só o tamanho do desenho (1 a 5); "prefixo" separa os ids
    // dos gradientes de cada tela.
    function pilhaMoedas(vip, prefixo) {
        const ids = { lado: (prefixo || '') + 'cs' + vip, topo: (prefixo || '') + 'ct' + vip };
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

    function cartaoPlano(chave, p) {
        const ciclo = p.grupo === 'ciclos';
        const prefixo = ciclo ? 'cy' : '';
        const arte = p.imagem
            ? '<img class="plan-photo" src="' + p.imagem + '" alt="' + p.nome + '" data-nivel="' + p.ordem + '" data-prefixo="' + prefixo + '" loading="lazy">'
            : pilhaMoedas(p.ordem, prefixo);
        const selo = p.vip > 0
            ? '<span class="vip-badge">' + ICONE_COROA_CHEIA + '<span>VIP ' + p.vip + '</span></span>'
            : '<span class="vip-badge is-none"><span>Sem VIP</span></span>';
        const extras = ciclo
            ? (p.cashback > 0 ? '<div class="plan-meta muted">Cashback de ' + brl(p.cashback) + ' na ativação</div>' : '')
                + '<div class="plan-meta muted">Rendimento fixo • limitado a ' + p.limiteCompras + ' por usuário</div>'
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
                    <div class="plan-rate">${pct(p.taxaDiaria)}% ao dia</div>
                    <div class="plan-meta muted">${p.duracaoDias} dias • rendimento total ${brl(p.totalRendimento)} (${p.limitePercentual}%)</div>
                    ${extras}
                </div>
                <div class="plan-side">
                    <div class="plan-art">${arte}</div>
                    <button type="button" class="btn btn-compact plan-buy" onclick="abrirDepositoComPlano('${chave}')">Investir</button>
                </div>
            </div>`;
    }

    function renderizarLista(idLista, grupo) {
        const lista = document.getElementById(idLista);
        if (!lista) return;

        lista.innerHTML = Object.entries(catalogo)
            .filter(([, p]) => p.grupo === grupo)
            .map(([chave, p]) => cartaoPlano(chave, p))
            .join('');

        // Foto que não carregar volta para a ilustração de moedas
        lista.querySelectorAll('img.plan-photo').forEach((img) => {
            img.addEventListener('error', () => {
                img.outerHTML = pilhaMoedas(Number(img.dataset.nivel) || 1, img.dataset.prefixo || '');
            });
        });
    }

    function renderizarPlanos() {
        renderizarLista('planList', 'planos');
        renderizarLista('cicloList', 'ciclos');
    }

    document.addEventListener('DOMContentLoaded', renderizarPlanos);
})();
