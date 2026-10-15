
  // Chave do painel: validar no servidor antes de guardar
  tela.salvarToken.addEventListener('click', async () => {
    const chaveDigitada = tela.token.value.trim();

    if (!chaveDigitada) {
      avisar('Digite a chave do painel.', 'erro');
      return;
    }

    tela.salvarToken.disabled = true;
    tela.salvarToken.textContent = 'Validando...';

    try {
      const resposta = await fetch('/api/admin/validar', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-admin-token': chaveDigitada
        }
      });

      let dados = {};
      try {
        dados = await resposta.json();
      } catch (falha) {
        // Resposta sem JSON
      }

      if (!resposta.ok || dados.ok !== true) {
        throw new Error(dados.erro || 'Chave inválida.');
      }

      // Guardar somente depois da validação bem-sucedida
      estadoPainel.token = chaveDigitada;
      localStorage.setItem(CHAVE_TOKEN, chaveDigitada);

      tela.statusChave.textContent = 'Chave validada com sucesso.';
      avisar('Chave validada e guardada neste aparelho.', 'sucesso');

      await carregarTudo();
    } catch (falha) {
      tela.statusChave.textContent = falha.message;
      avisar(falha.message, 'erro');
    } finally {
      tela.salvarToken.disabled = false;
      tela.salvarToken.textContent = 'Salvar chave';
    }
  });

  tela.esquecerToken.addEventListener('click', () => {
    estadoPainel.token = '';
    tela.token.value = '';
    localStorage.removeItem(CHAVE_TOKEN);
    tela.statusChave.textContent = 'Chave removida deste aparelho.';
    avisar('Chave removida deste aparelho.', 'salvo');
  });
