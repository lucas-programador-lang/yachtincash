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

    // Ilustração: duas pilhas de moedas que crescem com o nível VIP
    // (as cores vêm do planos.css, que usa o dourado do site).
    function moeda(cx, topoY) {
        return '<ellipse class="coin-side" cx="' + cx + '" cy="' + (topoY + 7) + '" rx="22" ry="6"/>'
            + '<rect class="coin-side" x="' + (cx - 22) + '" y="' + topoY + '" width="44" height="7"/>'
            + '<ellipse class="coin-top" cx="' + cx + '" cy="' + topoY + '" rx="22" ry="6"/>'
            + '<ellipse class="coin-ring" cx="' + cx + '" cy="' + topoY + '" rx="14" ry="3.6"/>';
    }

    function pilhaMoedas(vip) {
        const base = 56;
        let desenho = '';
        // pilha menor, atrás, à esquerda
        for (let i = 0; i < Math.max(1, vip); i++) {
            desenho += moeda(28, base - i * 7 - 4).replace(/rx="22"/g, 'rx="17"').replace(/rx="14"/g, 'rx="10"')
                .replace(/width="44"/g, 'width="34"').replace(new RegExp('x="' + (28 - 22) + '"', 'g'), 'x="' + (28 - 17) + '"');
        }
        // pilha principal, à frente, à direita
        for (let i = 0; i < vip + 2; i++) {
            desenho += moeda(62, base - i * 7);
        }
        return '<svg class="plan-coins" viewBox="0 0 96 64" aria-hidden="true">' + desenho + '</svg>';
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
