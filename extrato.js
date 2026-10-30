// ============================================================
// Extrato — "Histórico de Transações" com filtros e lista.
//
// O script.js monta as movimentações do usuário (depósitos, saques,
// investimentos, rendimentos e comissões) e entrega para
// window.desenharHistorico(entradas) sempre que algo muda.
//
// Cada entrada: { tipo, valor, data, status, detalhe? }
//   tipo:   'deposito' | 'saque' | 'investimento' | 'rendimento' | 'comissao'
//   status: 'paid' | 'pending' | 'rejected'
//
// Carregue este arquivo DEPOIS do script.js no index.html.
// ============================================================
(function () {
    const POR_PAGINA = 30;

    const brl = (v) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function escapeHtml(texto) {
        const div = document.createElement('div');
        div.textContent = texto == null ? '' : String(texto);
        return div.innerHTML;
    }

    // Ícones desenhados (SVG), sem emojis
    const SVG = (conteudo) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + conteudo + '</svg>';
    const TIPOS = {
        deposito: { titulo: 'Depósito', classe: 'is-in', icone: SVG('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/>') },
        saque: { titulo: 'Saque', classe: 'is-out', icone: SVG('<path d="M12 15V3"/><path d="M7 8l5-5 5 5"/><path d="M4 20h16"/>') },
        investimento: { titulo: 'Investimento', classe: 'is-invest', icone: SVG('<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/>') },
        rendimento: { titulo: 'Rendimento', classe: 'is-in', icone: SVG('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>') },
        comissao: { titulo: 'Comissão', classe: 'is-gold', icone: SVG('<circle cx="9" cy="8" r="3.2"/><path d="M2.8 19.2c.7-3.1 3.1-5 6.2-5s5.5 1.9 6.2 5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.2c2.6.1 4.3 1.8 4.9 4.6"/>') }
    };

    // Filtros: quais tipos aparecem em cada aba
    const FILTROS = {
        todos: null,
        depositos: ['deposito'],
        saques: ['saque'],
        investimentos: ['investimento', 'rendimento']
    };

    let entradas = [];
    let filtro = 'todos';
    let limite = POR_PAGINA;

    // Saque concluído usa "Concluído"; o resto, quando pago, "Aprovado"
    function rotuloStatus(entrada) {
        if (entrada.status === 'pending') return { texto: 'Pendente', classe: 'badge-warning' };
        if (entrada.status === 'rejected') return { texto: 'Rejeitado', classe: 'badge-danger' };
        return { texto: entrada.tipo === 'saque' ? 'Concluído' : 'Aprovado', classe: 'badge-success' };
    }

    function linha(entrada) {
        const tipo = TIPOS[entrada.tipo] || TIPOS.deposito;
        const status = rotuloStatus(entrada);
        const d = new Date(entrada.data);
        const dataHora = d.toLocaleDateString('pt-BR') + ' - ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const detalhe = entrada.detalhe ? `<span class="hist-detail">${escapeHtml(entrada.detalhe)}</span>` : '';

        return `
            <div class="hist-row">
                <span class="hist-icon ${tipo.classe}${entrada.status === 'rejected' ? ' is-rejected' : ''}">${tipo.icone}</span>
                <div class="hist-info">
                    <span class="hist-title">${tipo.titulo}</span>
                    <span class="hist-value">${brl(entrada.valor)}</span>
                    <span class="hist-date">${dataHora}</span>
                    ${detalhe}
                </div>
                <span class="badge ${status.classe}">${status.texto}</span>
            </div>`;
    }

    function desenhar() {
        const lista = document.getElementById('extratoLista');
        if (!lista) return;

        const tipos = FILTROS[filtro];
        const visiveis = entradas
            .filter((e) => !tipos || tipos.indexOf(e.tipo) !== -1)
            .sort((a, b) => b.data - a.data);

        if (!visiveis.length) {
            lista.innerHTML = '<div class="info-box muted">Nenhuma movimentação registrada ainda.</div>';
        } else {
            lista.innerHTML = visiveis.slice(0, limite).map(linha).join('');
        }

        const mais = document.getElementById('extratoMais');
        if (mais) mais.hidden = visiveis.length <= limite;

        document.querySelectorAll('#section-extrato [data-hist-filtro]').forEach((botao) => {
            const ativo = botao.dataset.histFiltro === filtro;
            botao.classList.toggle('btn-outline', !ativo);
            botao.setAttribute('aria-selected', ativo ? 'true' : 'false');
        });
    }

    window.desenharHistorico = function (novasEntradas) {
        entradas = novasEntradas || [];
        desenhar();
    };

    document.addEventListener('click', (e) => {
        const aba = e.target.closest('#section-extrato [data-hist-filtro]');
        if (aba) {
            filtro = aba.dataset.histFiltro;
            limite = POR_PAGINA;
            desenhar();
            return;
        }
        if (e.target.closest('#extratoMais')) {
            limite += POR_PAGINA;
            desenhar();
        }
    });
})();
