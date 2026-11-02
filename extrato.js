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
    const FILL = (c) => '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + c + '</svg>';
    const TIPOS = {
        deposito: { titulo: 'Depósito', classe: 'is-in', icone: FILL('<path d="M5.5 10.5 12 17l6.5-6.5-1.9-1.9-3.2 3.2V3h-2.8v8.8L7.4 8.6l-1.9 1.9Z"/><path d="M4 18.6h16v.9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-.9Z" opacity=".75"/>') },
        saque: { titulo: 'Saque', classe: 'is-out', icone: FILL('<path fill-rule="evenodd" clip-rule="evenodd" d="M5 5.5A2.5 2.5 0 0 0 2.5 8v9A3.5 3.5 0 0 0 6 20.5h12a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3H17V6a1.5 1.5 0 0 0-1.5-1.5H5Zm12.2 8a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z"/>') },
        investimento: { titulo: 'Investimento', classe: 'is-invest', icone: FILL('<rect x="3.5" y="13" width="4.2" height="7.5" rx="1.2"/><rect x="9.9" y="9" width="4.2" height="11.5" rx="1.2" opacity=".85"/><rect x="16.3" y="4.5" width="4.2" height="16" rx="1.2"/>') },
        rendimento: { titulo: 'Rendimento', classe: 'is-in', icone: FILL('<g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 13.2l4.2 4.2L14 8.8"/><path d="M10.4 15.4l1.9 1.9L21 7.6"/></g>') },
        comissao: { titulo: 'Comissão', classe: 'is-gold', icone: FILL('<circle cx="9" cy="8" r="3.5"/><path d="M2.4 19.6c0-3.7 2.8-6.1 6.6-6.1s6.6 2.4 6.6 6.1v.9H2.4v-.9Z"/><circle cx="17.2" cy="9" r="2.7" opacity=".8"/><path d="M16.2 13.8c3 .1 5.4 1.9 5.4 5.2v1.5h-4.4v-.9c0-2.1-.4-4-1-5.8Z" opacity=".8"/>') }
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
