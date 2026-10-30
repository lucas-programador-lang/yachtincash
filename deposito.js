// ============================================================
// Tela de Depósito — lógica das abas, validações e geração do Pix.
//
// IMPORTANTE: carregue este arquivo DEPOIS do script.js no index.html.
// Ele substitui, sem mexer no script.js, as funções:
//   openModal / closeModal (acrescenta o reset e a limpeza do depósito),
//   abrirDepositoComPlano, gerarQrCodeDeposito.
// (copiarCodigoPixDeposito continua sendo a do script.js.)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const DEPOSITO_MINIMO = 50;
    const PIX_WORKER_URL = 'https://apidayachtincash.lucas-dev-programador.workers.dev';

    // Mesma tabela do script.js/admin.js/worker.js. O preço REAL é sempre
    // conferido no Worker; aqui serve para montar a tela e validar.
    const PLANOS = {
        'teste-20': { nome: 'YACHT Teste', valor: 20, retornoDiario: 2.5, duracaoDias: 4 },
        'irwin-50': { nome: 'YACHT IRWIN', valor: 50, retornoDiario: 3.35, duracaoDias: 30 },
        'hunter-150': { nome: 'YACHT HUNTER', valor: 150, retornoDiario: 9, duracaoDias: 30 }
    };

    let planoSelecionado = null;
    let pararEscutaStatus = null;

    const $ = (id) => document.getElementById(id);
    const brl = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const toast = (tipo, titulo, msg) => { if (typeof window.showToast === 'function') window.showToast(tipo, titulo, msg); };

    // ---------- Máscaras e validações ----------
    function mascaraCpf(valor) {
        const d = valor.replace(/\D/g, '').slice(0, 11);
        return d
            .replace(/^(\d{3})(\d)/, '$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1-$2');
    }

    function mascaraTelefone(valor) {
        const d = valor.replace(/\D/g, '').slice(0, 11);
        if (d.length <= 2) return d;
        if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    }

    function cpfValido(cpf) {
        if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
        let soma = 0;
        for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
        const d1 = ((soma * 10) % 11) % 10;
        if (d1 !== Number(cpf[9])) return false;
        soma = 0;
        for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
        const d2 = ((soma * 10) % 11) % 10;
        return d2 === Number(cpf[10]);
    }

    function lerValorDigitado() {
        const texto = $('depOutroValor').value.trim();
        if (!texto) return null;
        return parseFloat(texto.replace(/\./g, '').replace(',', '.'));
    }

    // ---------- Abas ----------
    function trocarAba(nome) {
        document.querySelectorAll('#depositModal [data-dep-panel]').forEach((p) => {
            p.classList.toggle('active', p.dataset.depPanel === nome);
        });
        document.querySelectorAll('#depositModal .dep-tab').forEach((t) => {
            const ativa = t.dataset.depTab === nome;
            t.classList.toggle('active', ativa);
            t.setAttribute('aria-selected', ativa ? 'true' : 'false');
        });
    }

    // Um único listener para abas, botões "CONTINUAR" e o link do aviso
    $('depositModal').addEventListener('click', (e) => {
        const alvo = e.target.closest('[data-dep-tab]');
        if (alvo) {
            trocarAba(alvo.dataset.depTab);
            return;
        }
        const chip = e.target.closest('.dep-chip');
        if (chip) selecionarPlano(chip.dataset.plano);
    });

    // ---------- Seleção de valor ----------
    function selecionarPlano(chave) {
        planoSelecionado = chave || null;
        document.querySelectorAll('#depositModal .dep-chip').forEach((c) => {
            c.classList.toggle('selected', c.dataset.plano === planoSelecionado);
        });
        if (chave) $('depOutroValor').value = '';
    }

    // Digitar em "Outro valor" desmarca o botão escolhido
    $('depOutroValor').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^\d.,]/g, '');
        if (e.target.value) selecionarPlano(null);
    });

    $('depositCpf').addEventListener('input', (e) => { e.target.value = mascaraCpf(e.target.value); });
    $('depositTelefone').addEventListener('input', (e) => { e.target.value = mascaraTelefone(e.target.value); });
    $('depositWhatsapp').addEventListener('input', (e) => { e.target.value = mascaraTelefone(e.target.value); });

    function planoPorValor(valor) {
        return Object.keys(PLANOS).find((k) => Math.abs(PLANOS[k].valor - valor) < 0.001) || null;
    }

    function planosDisponiveisTexto() {
        return Object.values(PLANOS)
            .filter((p) => p.valor >= DEPOSITO_MINIMO)
            .map((p) => brl(p.valor))
            .join(' e ');
    }

    // ---------- Estado da tela ----------
    function resetarTela() {
        trocarAba('pix');
        selecionarPlano(null);
        $('depOutroValor').value = '';
        $('depositQrView').style.display = 'none';
        $('qrcodeCanvas').innerHTML = '';
        $('depositPixCode').textContent = '';
        const waiting = $('depWaiting');
        waiting.classList.remove('ok');
        waiting.textContent = '⏳ Aguardando confirmação do pagamento...';
        const btn = $('depGerarPix');
        btn.disabled = false;
        btn.textContent = 'GERAR PIX';
        pararEscuta();
    }

    function pararEscuta() {
        if (pararEscutaStatus) {
            pararEscutaStatus();
            pararEscutaStatus = null;
        }
    }

    // Wrappers: mantêm o comportamento do script.js e acrescentam o nosso
    const openModalOriginal = window.openModal;
    window.openModal = function (modalId) {
        if (typeof openModalOriginal === 'function') openModalOriginal(modalId);
        if (modalId === 'depositModal') resetarTela();
    };

    const closeModalOriginal = window.closeModal;
    window.closeModal = function (modalId) {
        if (typeof closeModalOriginal === 'function') closeModalOriginal(modalId);
        if (modalId === 'depositModal') pararEscuta();
    };

    // Botão "Alugar" da página Investir: abre já com o plano marcado
    window.abrirDepositoComPlano = function (chave) {
        const info = PLANOS[chave];
        if (info && info.valor < DEPOSITO_MINIMO) {
            toast('warning', 'Depósito mínimo', `O depósito mínimo é ${brl(DEPOSITO_MINIMO)}.`);
            return;
        }
        window.openModal('depositModal');
        if (info) selecionarPlano(chave);
    };

    // ---------- Confirmação do pagamento em tempo real ----------
    // As regras do Firebase só deixam o usuário ler seus depósitos por
    // consulta filtrada pelo próprio uid — por isso a query abaixo.
    function escutarConfirmacao(depositId, uid) {
        pararEscuta();
        const ref = firebaseDb.ref('deposits').orderByChild('uid').equalTo(uid);
        const callback = ref.on('value', (snapshot) => {
            const todos = snapshot.val() || {};
            const deposito = todos[depositId];
            if (!deposito) return;

            if (deposito.status === 'approved') {
                pararEscuta();
                const waiting = $('depWaiting');
                waiting.classList.add('ok');
                waiting.textContent = '✓ Pagamento confirmado!';
                toast('success', 'Pagamento confirmado!', 'Seu plano foi ativado.');
                setTimeout(() => window.closeModal('depositModal'), 1500);
            } else if (deposito.status === 'rejected') {
                pararEscuta();
                toast('error', 'Depósito rejeitado', 'Fale com o suporte se o pagamento foi feito.');
            }
        }, (err) => console.error('Erro ao acompanhar depósito:', err));

        pararEscutaStatus = () => ref.off('value', callback);
    }

    async function nomeDoUsuario(user) {
        try {
            const snap = await firebaseDb.ref('users/' + user.uid + '/fullName').once('value');
            if (snap.val()) return snap.val();
        } catch (err) {
            console.error('Não foi possível ler o nome do usuário:', err);
        }
        return user.displayName || user.email || 'Cliente';
    }

    // ---------- GERAR PIX ----------
    window.gerarQrCodeDeposito = async function () {
        // 1) Valor
        let chave = null;
        let valor = null;
        const digitado = lerValorDigitado();

        if (digitado !== null) {
            valor = digitado;
            if (isNaN(valor) || valor <= 0) {
                toast('warning', 'Valor inválido', 'Digite um valor válido.');
                $('depOutroValor').focus();
                return;
            }
            if (valor < DEPOSITO_MINIMO) {
                toast('warning', 'Valor abaixo do mínimo', `O depósito mínimo é ${brl(DEPOSITO_MINIMO)}.`);
                $('depOutroValor').focus();
                return;
            }
            chave = planoPorValor(valor);
            if (!chave) {
                toast('warning', 'Valor indisponível', `Os valores disponíveis são ${planosDisponiveisTexto()}.`);
                $('depOutroValor').focus();
                return;
            }
        } else if (planoSelecionado) {
            chave = planoSelecionado;
            valor = PLANOS[chave].valor;
        } else {
            toast('warning', 'Escolha o valor', 'Selecione um valor para o depósito.');
            return;
        }

        if (valor < DEPOSITO_MINIMO) {
            toast('warning', 'Valor abaixo do mínimo', `O depósito mínimo é ${brl(DEPOSITO_MINIMO)}.`);
            return;
        }

        // 2) CPF e telefone (aba Cartão)
        const cpf = $('depositCpf').value.replace(/\D/g, '');
        const telefone = $('depositTelefone').value.replace(/\D/g, '');

        if (!cpf || !telefone) {
            trocarAba('cartao');
            toast('warning', 'Campos obrigatórios', 'Preencha CPF e telefone para gerar o Pix.');
            (!cpf ? $('depositCpf') : $('depositTelefone')).focus();
            return;
        }
        if (!cpfValido(cpf)) {
            trocarAba('cartao');
            toast('warning', 'CPF inválido', 'Confira os números do CPF.');
            $('depositCpf').focus();
            return;
        }
        if (telefone.length < 10 || telefone.length > 11) {
            trocarAba('cartao');
            toast('warning', 'Telefone inválido', 'Informe um telefone válido, com DDD.');
            $('depositTelefone').focus();
            return;
        }

        // 3) WhatsApp (aba Outros) — opcional, mas se preenchido precisa estar correto
        const whatsapp = $('depositWhatsapp').value.replace(/\D/g, '');
        if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 11)) {
            trocarAba('outros');
            toast('warning', 'WhatsApp inválido', 'Informe o número com DDD ou deixe o campo vazio.');
            $('depositWhatsapp').focus();
            return;
        }

        const user = firebaseAuth.currentUser;
        if (!user) return;

        const btn = $('depGerarPix');
        btn.disabled = true;
        btn.textContent = 'GERANDO PIX...';

        try {
            const info = PLANOS[chave];
            const userName = await nomeDoUsuario(user);

            // Cria o depósito como PENDENTE; o ID gerado é o "identifier"
            // que o webhook usa para aprovar o depósito certo.
            const registro = {
                uid: user.uid,
                userName: userName,
                planoKey: chave,
                planoNome: info.nome,
                valor: info.valor,
                retornoDiario: info.retornoDiario,
                duracaoDias: info.duracaoDias,
                status: 'pending',
                createdAt: Date.now()
            };
            if (whatsapp) registro.whatsapp = whatsapp;

            const ref = await firebaseDb.ref('deposits').push(registro);
            const depositId = ref.key;

            // O Worker calcula o valor da cobrança pelo plano — o valor
            // enviado pelo navegador não é usado.
            const response = await fetch(`${PIX_WORKER_URL}/criar-pix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    depositId: depositId,
                    cliente: {
                        name: userName,
                        email: user.email || '',
                        phone: telefone,
                        document: cpf
                    }
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Falha ao gerar cobrança Pix.');
            if (!data.pixCode) throw new Error('A Vizzion Pay não retornou o código Pix.');

            const qrBox = $('qrcodeCanvas');
            qrBox.innerHTML = '';
            if (typeof QRCode !== 'undefined') {
                new QRCode(qrBox, {
                    text: data.pixCode,
                    width: 200,
                    height: 200,
                    colorDark: '#0e1420',
                    colorLight: '#ffffff'
                });
            } else {
                qrBox.textContent = 'Não foi possível gerar o QR Code.';
            }

            $('depositPixCode').textContent = data.pixCode;
            $('depositQrView').style.display = 'block';
            $('depositQrView').scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            escutarConfirmacao(depositId, user.uid);
        } catch (err) {
            console.error('Erro ao gerar cobrança Pix:', err);
            toast('error', 'Erro ao gerar Pix', 'Não foi possível gerar o QR Code agora. Tente novamente em instantes.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'GERAR PIX';
        }
    };
});
