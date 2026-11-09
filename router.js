// ============================================================
// ROUTER — rotas de navegador (History API) para o painel.
//
// Cada seção do painel ganha um endereço próprio:
//   /                     Início
//   /investir             Planos de rendimento
//   /ciclos               Ciclos
//   /meus-investimentos   Meus Investimentos
//   /equipe               Equipe
//   /missoes              Missões
//   /roleta               Roleta
//   /gerente              Gerente
//   /grupos               Grupos
//   /cupom                Cupom
//   /extrato              Extrato
//   /perfil               Perfil
//
// Funciona assim:
//  - Toda troca de tela (menu lateral, menu inferior, "Mais", atalhos do
//    Início etc.) já passa por um clique em .nav-item[data-section]; este
//    arquivo só escuta esse clique e atualiza o endereço (pushState).
//  - Botão "voltar/avançar" do navegador (popstate) volta para a seção certa.
//  - Abrir ou recarregar um endereço (ex.: /extrato) abre direto na seção.
//  - Endereço desconhecido cai no Início.
//
// Precisa ser o ÚLTIMO script do index.html (depois de script.js e app-extras.js).
// No Cloudflare Pages, o arquivo _redirects faz cada rota abrir o index.html.
// ============================================================
(function () {
    'use strict';

    // Só o painel do usuário (o admin e as telas de login ficam de fora)
    const corpo = document.body;
    if (!corpo || !corpo.classList.contains('app-body') || corpo.classList.contains('admin-body')) {
        document.documentElement.removeAttribute('data-rota');
        return;
    }

    const ROTAS = {
        inicio: '/',
        investir: '/investir',
        ciclos: '/ciclos',
        carteira: '/meus-investimentos',
        equipe: '/equipe',
        missoes: '/missoes',
        roleta: '/roleta',
        gerente: '/gerente',
        grupos: '/grupos',
        cupom: '/cupom',
        extrato: '/extrato',
        perfil: '/perfil'
    };
    const SECOES = {};
    Object.keys(ROTAS).forEach((k) => { SECOES[ROTAS[k]] = k; });

    const TITULO_BASE = document.title || 'YACHTINCASH';
    let aplicando = false; // true enquanto a troca de tela vem do próprio router

    // "/extrato/", "/extrato.html", "/index.html", "/inicio" -> forma padrão
    function normalizar(caminho) {
        let c = String(caminho || '/')
            .replace(/\/index\.html$/i, '/')
            .replace(/\.html$/i, '')
            .replace(/\/+$/, '');
        if (c === '' || c.toLowerCase() === '/inicio') return '/';
        return c.toLowerCase();
    }
    function secaoDoCaminho(caminho) { return SECOES[normalizar(caminho)] || null; }
    function itemDoMenu(secao) { return document.querySelector('.sidebar .nav-item[data-section="' + secao + '"]'); }

    // Guarda a seção atual só nesta aba. Serve de rede de segurança: se o servidor
    // devolver "/" ao recarregar (F5) uma rota como /investir, voltamos para ela.
    function lembrar(secao) {
        try { sessionStorage.setItem('yacht_router_secao', secao); } catch (e) { /* sem storage */ }
    }
    function lembrada() {
        try { return sessionStorage.getItem('yacht_router_secao'); } catch (e) { return null; }
    }
    function foiRecarregamento() {
        try {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav) return nav.type === 'reload';
            return !!(performance.navigation && performance.navigation.type === 1);
        } catch (e) { return false; }
    }

    function atualizarTitulo(secao) {
        lembrar(secao);
        const item = itemDoMenu(secao);
        const rotulo = item && item.querySelector('span:not(.nav-icon)');
        const nome = rotulo && rotulo.textContent.trim();
        document.title = (secao === 'inicio' || !nome) ? TITULO_BASE : nome + ' • ' + TITULO_BASE.split(' - ')[0].split(' | ')[0];
    }

    // Abre a seção usando o mesmo clique do menu (toda a lógica das telas continua igual)
    function mostrar(secao) {
        const item = itemDoMenu(secao);
        if (!item) return false;
        aplicando = true;
        try { item.click(); } finally { aplicando = false; }
        atualizarTitulo(secao);
        return true;
    }

    function empurrar(secao) {
        const destino = ROTAS[secao];
        if (!destino) return;
        if (normalizar(location.pathname) !== destino) {
            history.pushState({ secao: secao }, '', destino);
        }
        atualizarTitulo(secao);
        window.scrollTo(0, 0);
    }

    // Na primeira navegação feita pela pessoa, as animações de entrada voltam ao normal
    function limparSemAnim() {
        document.querySelectorAll('.page-section.sem-anim').forEach((s) => s.classList.remove('sem-anim'));
    }

    function iniciar() {
        // 1) Toda troca de tela feita pelo usuário vira uma entrada no histórico
        document.querySelectorAll('.sidebar .nav-item[data-section]').forEach((item) => {
            item.addEventListener('click', () => {
                limparSemAnim();
                if (aplicando) return;
                empurrar(item.dataset.section);
            });
        });

        // 2) Botão voltar/avançar do navegador
        window.addEventListener('popstate', () => {
            limparSemAnim();
            mostrar(secaoDoCaminho(location.pathname) || 'inicio');
        });

        // 3) Abertura / recarregamento: o endereço manda
        let inicial = secaoDoCaminho(location.pathname) || 'inicio';
        // F5 / Ctrl+F5 que o servidor mandou para "/": volta para a seção em que a pessoa estava
        const guardada = lembrada();
        if (inicial === 'inicio' && normalizar(location.pathname) === '/' && foiRecarregamento()
            && guardada && guardada !== 'inicio' && ROTAS[guardada]) {
            inicial = guardada;
        }
        mostrar(inicial);
        // Tira a marca que o index.html colocou no <html> para evitar o flash do Início.
        // A seção que já abriu fica SEM a animação de entrada (.sem-anim): senão, ao tirar a
        // marca, a animação "secIn" (fade) começaria agora e pareceria um piscar da tela.
        const jaAtiva = document.querySelector('.page-section.active');
        if (jaAtiva && document.documentElement.hasAttribute('data-rota')) jaAtiva.classList.add('sem-anim');
        document.documentElement.removeAttribute('data-rota');
        history.replaceState({ secao: inicial }, '', ROTAS[inicial]);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
