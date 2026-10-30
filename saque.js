// ============================================================
// Tela de Saque — origem separada (Rendimento / Comissão), taxa de 15%,
// mínimo de R$ 30,00 e dias/horários de saque.
//
// Carregue DEPOIS do script.js e do deposito.js. Este arquivo substitui
// a solicitarSaque() do script.js e acompanha tudo em tempo real.
//
// MODELO DE SALDO:
//   users/{uid}/balance           -> saldo de RENDIMENTO (inclui o bônus de cadastro)
//   users/{uid}/balanceComissao   -> saldo de COMISSÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('sacarModal')) return;

    // ---------- Regras (ajuste aqui) ----------
    const SAQUE_MINIMO = 30;          // valor solicitado, antes da taxa
    const TAXA_PERCENTUAL = 15;
    const FUSO_HORARIO = 'America/Sao_Paulo'; // horário de Brasília

    // Dias: 0 = domingo, 1 = segunda ... 6 = sábado
    const ORIGENS = {
        rendimento: {
            nome: 'Rendimento',
            dias: [1, 2, 0],
            textoDias: 'Segunda, Terça e Domingo',
            horario: null
        },
        comissao: {
            nome: 'Comissão',
            dias: [1, 2, 3, 4, 5],
            textoDias: 'Segunda a Sexta, das 10h às 17h',
            horario: { inicio: 10, fim: 17 }
        }
    };

    const PIX_TIPO_LABEL = { cpf: 'CPF', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave Aleatória' };

    const $ = (id) => document.getElementById(id);
    const brl = (v) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const arred2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
    const toast = (tipo, titulo, msg) => { if (typeof window.showToast === 'function') window.showToast(tipo, titulo, msg); };

    // ---------- Estado ----------
    let saldoRendimento = 0;
    let saldoComissao = 0;
    let pixChave = null;
    let pixTipo = null;
    let nomeUsuario = '';
    let pendentes = { rendimento: 0, comissao: 0 }; // saques já pedidos e ainda não pagos
    let tipoSelecionado = 'rendimento';

    // ---------- Dia e hora de Brasília ----------
    function agoraNoFuso() {
        const partes = new Intl.DateTimeFormat('en-US', {
            timeZone: FUSO_HORARIO, weekday: 'short', hour: 'numeric', hourCycle: 'h23'
        }).formatToParts(new Date());
        const dia = partes.find((p) => p.type === 'weekday').value;
        const hora = Number(partes.find((p) => p.type === 'hour').value);
        const mapa = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        return { dow: mapa[dia], hora: hora };
    }

    function liberadoAgora(tipo) {
        const regra = ORIGENS[tipo];
        const { dow, hora } = agoraNoFuso();
        if (!regra.dias.includes(dow)) return false;
        if (regra.horario && (hora < regra.horario.inicio || hora >= regra.horario.fim)) return false;
        return true;
    }

    // ---------- Valores ----------
    function disponivel(tipo) {
        const saldo = tipo === 'comissao' ? saldoComissao : saldoRendimento;
        return Math.max(0, arred2(saldo - pendentes[tipo]));
    }

    function lerValor() {
        const texto = $('saqueValor').value.trim();
        if (!texto) return null;
        return parseFloat(texto.replace(/\./g, '').replace(',', '.'));
    }

    function calcularTaxa(valor) {
        const taxa = Math.round(valor * TAXA_PERCENTUAL) / 100; // centavos exatos
        return { taxa: taxa, liquido: arred2(valor - taxa) };
    }

    function mascararChave(chave) {
        const s = String(chave || '');
        return '*** *** *** - ' + s.slice(-2);
    }

    // ---------- Tela ----------
    function atualizarResumo() {
        const valor = lerValor();
        if (valor && !isNaN(valor) && valor > 0) {
            const { taxa, liquido } = calcularTaxa(valor);
            $('saqueTaxaValor').textContent = '- ' + brl(taxa);
            $('saqueLiquidoValor').textContent = brl(liquido);
        } else {
            $('saqueTaxaValor').textContent = brl(0);
            $('saqueLiquidoValor').textContent = brl(0);
        }
    }

    function renderizar() {
        $('saqueSaldoRendimento').textContent = brl(disponivel('rendimento'));
        $('saqueSaldoComissao').textContent = brl(disponivel('comissao'));
        $('saqueSaldoSelecionado').textContent = brl(disponivel(tipoSelecionado));

        document.querySelectorAll('#sacarModal .saque-origem').forEach((b) => {
            const marcado = b.dataset.tipo === tipoSelecionado;
            b.classList.toggle('btn-outline', !marcado);
        });

        const regra = ORIGENS[tipoSelecionado];
        const aberto = liberadoAgora(tipoSelecionado);
        const rotulo = $('saqueRegraTexto');
        rotulo.textContent = `Saque de ${regra.nome}: ${regra.textoDias}. ` + (aberto ? 'Liberado agora.' : 'Fechado agora.');
        rotulo.classList.toggle('is-open', aberto);
        rotulo.classList.toggle('is-closed', !aberto);

        $('saqueMinimoTexto').textContent = brl(SAQUE_MINIMO);
        $('saqueTaxaTexto').textContent = TAXA_PERCENTUAL + '%';

        const chaveEl = $('saqueChavePix');
        if (pixChave) {
            chaveEl.textContent = `${PIX_TIPO_LABEL[pixTipo] || 'Pix'}: ${mascararChave(pixChave)}`;
            chaveEl.classList.remove('withdraw-key-missing');
            chaveEl.classList.add('withdraw-key-set');
        } else {
            chaveEl.innerHTML = 'Nenhuma chave cadastrada — <button type="button" class="saque-link" data-saque-goto="perfil">cadastrar no Perfil</button>';
            chaveEl.classList.add('withdraw-key-missing');
            chaveEl.classList.remove('withdraw-key-set');
        }

        atualizarResumo();
    }

    function selecionarTipo(tipo) {
        tipoSelecionado = ORIGENS[tipo] ? tipo : 'rendimento';
        renderizar();
    }

    // ---------- Eventos da tela ----------
    $('sacarModal').addEventListener('click', (e) => {
        const origem = e.target.closest('.saque-origem');
        if (origem) { selecionarTipo(origem.dataset.tipo); return; }

        const ir = e.target.closest('[data-saque-goto]');
        if (ir) {
            window.closeModal('sacarModal');
            const menu = document.querySelector('.nav-item[data-section="' + ir.dataset.saqueGoto + '"]');
            if (menu) menu.click();
        }
    });

    $('saqueValor').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^\d.,]/g, '');
        atualizarResumo();
    });

    // Ao abrir o modal: limpa o valor e reavalia dia/hora
    const openModalAnterior = window.openModal;
    window.openModal = function (modalId) {
        if (typeof openModalAnterior === 'function') openModalAnterior(modalId);
        if (modalId === 'sacarModal') {
            $('saqueValor').value = '';
            const btn = $('saqueBtn');
            btn.disabled = false;
            btn.textContent = 'SOLICITAR SAQUE';
            renderizar();
        }
    };

    // Dia/hora mudam sozinhos: reavalia a cada minuto
    setInterval(renderizar, 60000);

    // ---------- Dados em tempo real ----------
    let pararUsuario = null;
    let pararSaques = null;

    firebaseAuth.onAuthStateChanged((user) => {
        if (pararUsuario) { pararUsuario(); pararUsuario = null; }
        if (pararSaques) { pararSaques(); pararSaques = null; }
        if (!user) return;

        const refUsuario = firebaseDb.ref('users/' + user.uid);
        const cbUsuario = refUsuario.on('value', (snap) => {
            const d = snap.val() || {};
            saldoRendimento = Number(d.balance) || 0;
            saldoComissao = Number(d.balanceComissao) || 0;
            pixChave = d.pixChave || null;
            pixTipo = d.pixTipo || null;
            nomeUsuario = d.fullName || user.displayName || user.email || user.uid;

            // O saldo do Início mostra rendimento + comissão
            const total = $('userBalance');
            if (total) total.textContent = brl(arred2(saldoRendimento + saldoComissao));

            renderizar();
        }, (err) => console.error('Erro ao ler saldo:', err));
        pararUsuario = () => refUsuario.off('value', cbUsuario);

        // Saques pendentes já descontam do disponível (evita pedir mais do que existe)
        const refSaques = firebaseDb.ref('withdrawals').orderByChild('uid').equalTo(user.uid);
        const cbSaques = refSaques.on('value', (snap) => {
            const soma = { rendimento: 0, comissao: 0 };
            Object.values(snap.val() || {}).forEach((s) => {
                if (s.status !== 'pending') return;
                const tipo = s.tipo === 'comissao' ? 'comissao' : 'rendimento';
                soma[tipo] += Number(s.valor) || 0;
            });
            pendentes = soma;
            renderizar();
        }, (err) => console.error('Erro ao ler saques:', err));
        pararSaques = () => refSaques.off('value', cbSaques);
    });

    // ---------- SOLICITAR SAQUE ----------
    window.solicitarSaque = function () {
        const user = firebaseAuth.currentUser;
        if (!user) return;

        const regra = ORIGENS[tipoSelecionado];

        if (!pixChave) {
            toast('warning', 'Chave PIX necessária', 'Cadastre uma chave PIX em Perfil antes de solicitar o saque.');
            return;
        }

        const valor = lerValor();
        if (valor === null || isNaN(valor) || valor <= 0) {
            toast('warning', 'Valor obrigatório', 'Digite o valor que deseja sacar.');
            $('saqueValor').focus();
            return;
        }
        if (valor < SAQUE_MINIMO) {
            toast('warning', 'Valor mínimo não atingido', `O saque mínimo é ${brl(SAQUE_MINIMO)}.`);
            $('saqueValor').focus();
            return;
        }
        if (valor > disponivel(tipoSelecionado)) {
            toast('warning', 'Saldo insuficiente', `Seu saldo de ${regra.nome} disponível é ${brl(disponivel(tipoSelecionado))}.`);
            $('saqueValor').focus();
            return;
        }
        if (!liberadoAgora(tipoSelecionado)) {
            toast('warning', 'Saque indisponível agora', `Saque de ${regra.nome}: ${regra.textoDias}.`);
            return;
        }

        const { taxa, liquido } = calcularTaxa(valor);

        const btn = $('saqueBtn');
        btn.disabled = true;
        btn.textContent = 'ENVIANDO...';

        // O saldo só é debitado quando o admin marca o saque como pago.
        firebaseDb.ref('withdrawals').push({
            uid: user.uid,
            userName: nomeUsuario,
            pixChave: pixChave,
            pixTipo: pixTipo || 'cpf',
            tipo: tipoSelecionado,
            valor: valor,
            taxaPercentual: TAXA_PERCENTUAL,
            taxa: taxa,
            valorLiquido: liquido,
            status: 'pending',
            createdAt: Date.now()
        }).then(() => {
            toast('success', 'Solicitação de saque enviada!', `Você receberá ${brl(liquido)} (taxa de ${brl(taxa)}).`);
            $('saqueValor').value = '';
            window.closeModal('sacarModal');
        }).catch((err) => {
            console.error('Erro ao solicitar saque:', err);
            toast('error', 'Erro ao solicitar saque', 'Tente novamente em instantes.');
        }).finally(() => {
            btn.disabled = false;
            btn.textContent = 'SOLICITAR SAQUE';
        });
    };
});
