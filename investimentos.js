// ============================================================
// Meus Investimentos — abas "Rendimento" (planos) e "Ciclo" (Ciclones).
//
// Recebe os planos do usuário (users/{uid}/planos) do script.js, que
// chama window.renderizarMeusInvestimentos(planosData) sempre que os
// dados mudam. Cada plano vira um cartão que abre os detalhes ao clicar.
//
// Carregue este arquivo DEPOIS do script.js no index.html.
// ============================================================
(function () {
    const DIA_MS = 86400000;

    const brl = (v) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const pct = (v) => (Math.round(v * 100) / 100).toString().replace('.', ',');
    const data = (ts) => new Date(ts).toLocaleDateString('pt-BR');

    function escapeHtml(texto) {
        const div = document.createElement('div');
        div.textContent = texto == null ? '' : String(texto);
        return div.innerHTML;
    }

    const ICONE_COROA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z"/><path d="M5 19h14"/></svg>';
    const ICONE_CICLO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 0 1-13.6 5.7"/><path d="M4 12a8 8 0 0 1 13.6-5.7"/><path d="M17.6 3v3.3h-3.3"/><path d="M6.4 21v-3.3h3.3"/></svg>';
    const ICONE_SETA = '<svg class="inv-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

    // Imagens de cada plano (coroa) e de cada ciclo (baú). Sem imagem, vale o ícone desenhado.
    const IMAGENS_PLANOS = {
        'vip1-50': 'icone-iniciante.png', 'vip2-70': 'icone-bronze.png', 'vip3-150': 'icone-prata.png',
        'vip4-300': 'icone-ouro.png', 'vip5-450': 'icone-master.png'
    };
    const IMAGENS_CICLOS = {
        'ciclone1-50': 'ciclone-1.png', 'ciclone2-100': 'ciclone-2.png', 'ciclone3-250': 'ciclone-3.png',
        'ciclone4-500': 'ciclone-4.png', 'ciclone5-1000': 'ciclone-5.png'
    };

    let planosUsuario = [];
    let abaAtual = 'rendimento';
    const abertos = new Set(); // cartões com os detalhes abertos (por índice de ativação)

    const ehCiclo = (plano) => typeof plano.planoKey === 'string' && plano.planoKey.indexOf('ciclone') === 0;

    function calcular(plano) {
        const diasPassados = Math.floor((Date.now() - plano.dataAtivacao) / DIA_MS);
        const diasContados = Math.max(0, Math.min(diasPassados, plano.duracaoDias));
        return {
            diasContados: diasContados,
            acumulado: diasContados * plano.retornoDiario,
            finalizado: diasPassados >= plano.duracaoDias,
            termina: plano.dataAtivacao + plano.duracaoDias * DIA_MS,
            taxa: plano.valorInvestido ? (plano.retornoDiario / plano.valorInvestido) * 100 : 0
        };
    }

    function cartao(plano, aba) {
        const c = calcular(plano);
        const id = String(plano.dataAtivacao) + '-' + (plano.planoKey || plano.nome);
        const aberto = abertos.has(id);
        const status = c.finalizado
            ? '<span class="inv-status is-end">Concluído</span>'
            : '<span class="inv-status is-on">Ativo</span>';

        const imagem = (aba === 'ciclo' ? IMAGENS_CICLOS : IMAGENS_PLANOS)[plano.planoKey];
        const icone = imagem
            ? '<img src="' + imagem + '" alt="" loading="lazy">'
            : (aba === 'ciclo' ? ICONE_CICLO : ICONE_COROA);

        const progresso = plano.duracaoDias ? Math.min(100, Math.round((c.diasContados / plano.duracaoDias) * 100)) : 0;

        return `
            <div class="inv-card ${c.finalizado ? 'is-end' : 'is-on'}${aba === 'ciclo' ? ' is-ciclo' : ''}${aberto ? ' is-open' : ''}">
                <button type="button" class="inv-head" data-inv-id="${escapeHtml(id)}" aria-expanded="${aberto ? 'true' : 'false'}">
                    <span class="inv-icon${imagem ? ' has-img' : ''}${imagem && aba === 'ciclo' ? ' is-bau' : ''}">${icone}</span>
                    <span class="inv-info">
                        <span class="inv-top">
                            <span class="inv-name">${escapeHtml(plano.nome)}</span>
                            ${status}
                        </span>
                        <span class="inv-value">${brl(plano.valorInvestido)}</span>
                        <span class="inv-meta">
                            <span class="inv-chip">${pct(c.taxa)}% ao dia</span>
                            <span class="inv-chip is-gain">+ ${brl(c.acumulado)} rendidos</span>
                        </span>
                        <span class="inv-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${plano.duracaoDias}" aria-valuenow="${c.diasContados}" aria-label="Dias rendidos">
                            <span class="inv-prog-bar"><i style="width:${progresso}%"></i></span>
                            <span class="inv-prog-txt">${c.diasContados} de ${plano.duracaoDias} dias</span>
                        </span>
                    </span>
                    ${ICONE_SETA}
                </button>
                <div class="inv-details"${aberto ? '' : ' hidden'}>
                    <div class="inv-detail"><span>Ativado em</span><strong>${data(plano.dataAtivacao)}</strong></div>
                    <div class="inv-detail"><span>Rendimento diário</span><strong>${brl(plano.retornoDiario)}</strong></div>
                    <div class="inv-detail"><span>Rendimento acumulado</span><strong>${brl(c.acumulado)}</strong></div>
                    <div class="inv-detail"><span>Dias rendidos</span><strong>${c.diasContados} de ${plano.duracaoDias}</strong></div>
                    <div class="inv-detail"><span>${c.finalizado ? 'Terminou em' : 'Termina em'}</span><strong>${data(c.termina)}</strong></div>
                </div>
            </div>`;
    }

    const ICONE_VAZIO_COFRE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20h18"/><path d="M5 20V9l7-5 7 5v11"/><path d="M9 20v-6h6v6"/></svg>';

    function desenhar() {
        const lista = document.getElementById('invLista');
        if (!lista) return;

        const doGrupo = planosUsuario
            .filter((p) => (abaAtual === 'ciclo') === ehCiclo(p))
            .sort((a, b) => b.dataAtivacao - a.dataAtivacao);

        if (!doGrupo.length) {
            const destino = abaAtual === 'ciclo' ? 'ciclos' : 'investir';
            const nome = abaAtual === 'ciclo' ? 'Ciclos' : 'Investir';
            const texto = abaAtual === 'ciclo'
                ? 'Seus ciclos ativos e concluídos vão aparecer aqui.'
                : 'Seus planos de rendimento ativos e concluídos vão aparecer aqui.';
            lista.innerHTML = `<div class="inv-vazio">
                <span class="inv-vazio-ico">${ICONE_VAZIO_COFRE}</span>
                <strong>Nenhum investimento nesta aba ainda</strong>
                <p>${texto}</p>
                <button type="button" class="btn btn-compact" data-goto="${destino}">Ir para ${nome}</button>
            </div>`;
        } else {
            lista.innerHTML = doGrupo.map((p) => cartao(p, abaAtual)).join('');
        }

        // Imagem que não carregar volta para o ícone desenhado
        lista.querySelectorAll('.inv-icon.has-img img').forEach((img) => {
            img.addEventListener('error', () => {
                const caixa = img.parentElement;
                caixa.classList.remove('has-img', 'is-bau');
                caixa.innerHTML = abaAtual === 'ciclo' ? ICONE_CICLO : ICONE_COROA;
            });
        });

        let investido = 0;
        let rendimento = 0;
        let ativos = 0;
        let concluidos = 0;
        doGrupo.forEach((p) => {
            const c = calcular(p);
            investido += p.valorInvestido || 0;
            rendimento += c.acumulado;
            if (c.finalizado) concluidos++; else ativos++;
        });
        const pills = document.getElementById('invPills');
        if (pills) {
            pills.innerHTML = doGrupo.length
                ? '<span class="inv-pill is-on"><i></i>' + ativos + (ativos === 1 ? ' ativo' : ' ativos') + '</span>' +
                  '<span class="inv-pill is-end">' + concluidos + (concluidos === 1 ? ' concluído' : ' concluídos') + '</span>'
                : '';
        }
        const total = document.getElementById('invRendimentoTotal');
        const totalInvestido = document.getElementById('invTotalInvestido');
        if (total) total.textContent = brl(rendimento);
        if (totalInvestido) totalInvestido.textContent = 'Total investido: ' + brl(investido);

        document.querySelectorAll('#section-carteira [data-inv-aba]').forEach((botao) => {
            const ativa = botao.dataset.invAba === abaAtual;
            const total = planosUsuario.filter((p) => (botao.dataset.invAba === 'ciclo') === ehCiclo(p)).length;
            const cnt = botao.querySelector('.inv-cnt');
            if (cnt) cnt.textContent = total ? String(total) : '';
            botao.classList.toggle('btn-outline', !ativa);
            botao.setAttribute('aria-selected', ativa ? 'true' : 'false');
        });
    }

    window.renderizarMeusInvestimentos = function (planosData) {
        planosUsuario = planosData ? Object.values(planosData) : [];
        desenhar();
    };

    document.addEventListener('click', (e) => {
        const aba = e.target.closest('#section-carteira [data-inv-aba]');
        if (aba) {
            abaAtual = aba.dataset.invAba;
            desenhar();
            return;
        }
        const cabeca = e.target.closest('#section-carteira .inv-head');
        if (cabeca) {
            const id = cabeca.dataset.invId;
            if (abertos.has(id)) abertos.delete(id); else abertos.add(id);
            desenhar();
        }
    });

    // O status (Ativo/Concluído) depende da data: reavalia a cada minuto
    setInterval(desenhar, 60000);
})();
