// ============================================================
// SIDEBAR RECOLHÍVEL (desktop)
// - Botão redondo na borda do menu: recolhe para uma barra de ícones
//   (e expande de volta). O estado fica salvo neste navegador.
// - Atalho: tecla "[" também recolhe/expande.
// - No modo recolhido, passar o mouse num ícone mostra o nome.
// Só age em telas >= 1024px e fora do painel admin.
// Carregue DEPOIS do router.js no index.html.
// ============================================================
(function () {
    'use strict';
    var layout = document.querySelector('.app-layout');
    var sidebar = document.getElementById('sidebar');
    if (!layout || !sidebar || document.body.classList.contains('admin-body')) return;

    var CHAVE = 'yic_sidebar_recolhido';
    var body = document.body;

    // Emblema que aparece no lugar da logo larga quando recolhido
    var marca = sidebar.querySelector('.sidebar-brand');
    if (marca && !marca.querySelector('.brand-mark')) {
        var img = document.createElement('img');
        img.className = 'brand-mark';
        img.src = 'icon-192.png';
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        marca.appendChild(img);
    }

    // Nome de cada item (usado no tooltip e no leitor de tela)
    sidebar.querySelectorAll('.nav-item, .logout-btn, .telegram-btn').forEach(function (el) {
        var rotulo = (el.querySelector('span:not(.telegram-mark)') || el).textContent.trim();
        if (rotulo) {
            el.setAttribute('data-tip', rotulo);
            if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', rotulo);
        }
    });

    // Botão
    var botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'sidebar-toggle';
    botao.setAttribute('aria-controls', 'sidebar');
    botao.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
    layout.appendChild(botao);

    // Tooltip
    var tip = document.createElement('div');
    tip.className = 'sb-tip';
    tip.setAttribute('role', 'tooltip');
    body.appendChild(tip);

    function recolhido() { return body.classList.contains('sb-collapsed'); }

    function aplicar(valor, salvar) {
        body.classList.toggle('sb-collapsed', valor);
        botao.setAttribute('aria-expanded', String(!valor));
        var texto = valor ? 'Expandir menu' : 'Recolher menu';
        botao.setAttribute('aria-label', texto);
        botao.setAttribute('data-tip', texto);
        tip.classList.remove('is-on');
        if (salvar) {
            try { localStorage.setItem(CHAVE, valor ? '1' : '0'); } catch (e) { /* sem storage: ok */ }
        }
    }

    var inicial = false;
    try { inicial = localStorage.getItem(CHAVE) === '1'; } catch (e) { /* ok */ }
    body.classList.add('sb-init');           // sem animação na primeira pintura
    aplicar(inicial, false);
    requestAnimationFrame(function () {
        requestAnimationFrame(function () { body.classList.remove('sb-init'); });
    });

    botao.addEventListener('click', function () { aplicar(!recolhido(), true); });

    document.addEventListener('keydown', function (e) {
        if (e.key !== '[' || e.ctrlKey || e.metaKey || e.altKey) return;
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
        if (window.innerWidth < 1024) return;
        aplicar(!recolhido(), true);
    });

    function mostrarTip(el) {
        if (window.innerWidth < 1024) return;
        if (el !== botao && !recolhido()) return;
        var r = el.getBoundingClientRect();
        tip.textContent = el.getAttribute('data-tip') || '';
        tip.style.top = (r.top + r.height / 2) + 'px';
        tip.style.left = (r.right + 12) + 'px';
        tip.classList.add('is-on');
    }
    function esconderTip() { tip.classList.remove('is-on'); }

    sidebar.querySelectorAll('[data-tip]').forEach(function (el) {
        el.addEventListener('mouseenter', function () { mostrarTip(el); });
        el.addEventListener('focus', function () { mostrarTip(el); });
        el.addEventListener('mouseleave', esconderTip);
        el.addEventListener('blur', esconderTip);
        el.addEventListener('click', esconderTip);
    });
    botao.addEventListener('mouseenter', function () { mostrarTip(botao); });
    botao.addEventListener('mouseleave', esconderTip);
})();
