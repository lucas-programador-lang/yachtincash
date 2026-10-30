// ============================================================
// Perfil — navegação da tela "Meu Perfil".
//
// Nome, ID e VIP são preenchidos pelo inicio.js (mesma fonte de dados
// e mesma regra de VIP do Início). Os atalhos com data-goto já são
// tratados pelo inicio.js; aqui ficam só "Meu Dados" e "Meus Saques".
//
// Carregue este arquivo DEPOIS do inicio.js e do extrato.js no index.html.
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const secao = document.getElementById('section-perfil');
    if (!secao) return;

    const menu = document.getElementById('perfilMenu');
    const dados = document.getElementById('perfilDados');

    function mostrarDados(abrir) {
        if (!menu || !dados) return;
        menu.hidden = abrir;
        dados.hidden = !abrir;
        window.scrollTo({ top: 0 });
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-perfil-dados]')) { mostrarDados(true); return; }
        if (e.target.closest('[data-perfil-voltar]')) { mostrarDados(false); return; }

        // "Meus Saques": abre o Extrato já filtrado em Saques
        if (e.target.closest('[data-perfil-saques]')) {
            const nav = document.querySelector('.nav-item[data-section="extrato"]');
            if (nav) nav.click();
            const aba = document.querySelector('#section-extrato [data-hist-filtro="saques"]');
            if (aba) aba.click();
        }
    });

    // Ao sair da aba Perfil e voltar, sempre começa pelo menu
    const navPerfil = document.querySelector('.nav-item[data-section="perfil"]');
    if (navPerfil) navPerfil.addEventListener('click', () => mostrarDados(false));
});
