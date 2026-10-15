/* ==========================================================================
   PAINEL DO ADMINISTRADOR
   Cadastro, edição, troca de foto e exclusão de produtos + configurações.
   ========================================================================== */

const CHAVE_TOKEN = 'catalogo_admin_token';

const estadoPainel = {
  produtos: [],
  categorias: [],
  token: localStorage.getItem(CHAVE_TOKEN) || '',
  produtoEditando: null,
  arquivoNovo: null,        // foto escolhida e ainda não enviada
  urlPrevia: null,          // pré-visualização local (antes de salvar)
  fotoRemovida: false,      // marcou para tirar a foto do produto
  busca: ''
};

const tela = {
  lista: document.getElementById('lista-produtos'),
  vazio: document.getElementById('vazio-painel'),
  busca: document.getElementById('busca-painel'),
  listaCategorias: document.getElementById('lista-categorias'),
  avisos: document.getElementById('avisos'),
  subtitulo: document.getElementById('subtitulo-loja'),

  token: document.getElementById('campo-token'),
  salvarToken: document.getElementById('salvar-token'),
  esquecerToken: document.getElementById('esquecer-token'),
  statusChave: document.getElementById('status-chave'),

  formulario: document.getElementById('formulario-produto'),
  tituloFormulario: document.getElementById('titulo-formulario'),
  produtoId: document.getElementById('produto-id'),
  campoNome: document.getElementById('campo-nome'),
  campoPreco: document.getElementById('campo-preco'),
  campoCategoria: document.getElementById('campo-categoria'),
  campoDescricao: document.getElementById('campo-descricao'),
  campoAtivo: document.getElementById('campo-ativo'),
  botaoSalvar: document.getElementById('botao-salvar'),
  botaoCancelar: document.getElementById('botao-cancelar'),
  statusFormulario: document.getElementById('status-formulario'),

  imagemManual: document.getElementById('campo-imagem-manual'),
  arquivoGaleria: document.getElementById('arquivo-galeria'),
  arquivoCamera: document.getElementById('arquivo-camera'),
  removerFoto: document.getElementById('remover-foto'),
  previa: document.getElementById('previa'),
  previaImagem: document.getElementById('previa-imagem'),
  previaDica: document.getElementById('previa-dica'),
  barraProgresso: document.getElementById('barra-progresso'),
  progresso: document.getElementById('progresso'),
  statusFoto: document.getElementById('status-foto'),

  formularioConfig: document.getElementById('formulario-config'),
  configNome: document.getElementById('config-nome'),
  configWhatsapp: document.getElementById('config-whatsapp'),
  configMensagem: document.getElementById('config-mensagem'),
  statusConfig: document.getElementById('status-config')
};

/* ------------------------------------------------------------ início ----- */

iniciarPainel();

async function iniciarPainel() {
  ligarEventosPainel();
  tela.token.value = estadoPainel.token;
  await verificarProtecao();
  await carregarTudo();
}

async function verificarProtecao() {
  try {
    const dados = await requisicao('GET', '/api/config', null, { semToken: true });
    if (dados.painel_protegido) {
      tela.statusChave.textContent = 'Este catálogo está protegido por chave. Informe a chave para salvar alterações.';
    } else {
      tela.statusChave.textContent =
        'Atenção: o painel está aberto (sem chave). Qualquer pessoa com o endereço pode alterar os produtos. ' +
        'Para proteger, crie a variável ADMIN_TOKEN no Worker — o passo a passo está no GUIA-ADMIN.md.';
    }
  } catch (falha) {
    tela.statusChave.textContent = 'Não foi possível ler as configurações: ' + falha.message;
  }
}

async function carregarTudo() {
  await Promise.all([carregarProdutos(), carregarConfig(), carregarCategorias()]);
}

/* --------------------------------------------------------- requisições --- */

async function requisicao(metodo, caminho, corpo, opcoes = {}) {
  const cabecalhos = { accept: 'application/json' };
  if (corpo !== null && corpo !== undefined) cabecalhos['content-type'] = 'application/json';
  if (!opcoes.semToken && estadoPainel.token) cabecalhos['x-admin-token'] = estadoPainel.token;

  const resposta = await fetch(caminho, {
    method: metodo,
    headers: cabecalhos,
    body: corpo === null || corpo === undefined ? undefined : JSON.stringify(corpo)
  });

  let dados = {};
  try {
    dados = await resposta.json();
  } catch (falha) { /* resposta sem corpo */ }

  if (!resposta.ok) {
    const mensagem = dados.erro || 'Erro ' + resposta.status;
    throw new Error(resposta.status === 401 ? 'Chave do painel incorreta ou ausente. (' + mensagem + ')' : mensagem);
  }
  return dados;
}

/* ------------------------------------------------------------ produtos --- */

async function carregarProdutos() {
  try {
    // "todos=1" faz a API devolver também os produtos ocultos (exige a chave do painel).
    const dados = await requisicao('GET', '/api/produtos?todos=1&ordem=recentes');
    estadoPainel.produtos = dados.produtos || [];
    renderizarListaPainel();
  } catch (falha) {
    avisar('Erro ao carregar os produtos: ' + falha.message, 'erro');
  }
}

async function carregarCategorias() {
  try {
    const dados = await requisicao('GET', '/api/categorias', null, { semToken: true });
    const nomes = new Set((dados.categorias || []).map((item) => item.categoria));
    for (const produto of estadoPainel.produtos) nomes.add(produto.categoria);
    estadoPainel.categorias = [...nomes].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    tela.listaCategorias.innerHTML = '';
    for (const nome of estadoPainel.categorias) {
      const opcao = document.createElement('option');
      opcao.value = nome;
      tela.listaCategorias.appendChild(opcao);
    }
  } catch (falha) { /* categorias são opcionais */ }
}

function renderizarListaPainel() {
  const termo = normalizar(tela.busca.value);
  const lista = estadoPainel.produtos.filter((produto) => {
    if (!termo) return true;
    return normalizar(produto.nome).includes(termo) || normalizar(produto.categoria).includes(termo);
  });

  tela.lista.innerHTML = '';
  tela.vazio.classList.toggle('oculto', lista.length > 0);

  for (const produto of lista) {
    const item = document.createElement('article');
    item.className = 'item-painel';

    const foto = document.createElement('img');
    foto.className = 'item-painel__foto';
    foto.src = produto.imagem || '/sem-foto.svg';
    foto.alt = 'Foto de ' + produto.nome;
    foto.loading = 'lazy';
    foto.addEventListener('error', () => { foto.src = '/sem-foto.svg'; });

    const texto = document.createElement('div');
    texto.className = 'item-painel__texto';

    const nome = document.createElement('p');
    nome.className = 'item-painel__nome';
    nome.innerHTML = escapar(produto.nome) +
      (produto.demo ? '<span class="tag tag--exemplo">Exemplo</span>' : '') +
      (produto.ativo ? '' : '<span class="tag tag--oculto">Oculto</span>');

    const meta = document.createElement('p');
    meta.className = 'item-painel__meta';
    meta.textContent = formatarPreco(produto.preco) + ' • ' + produto.categoria +
      (produto.imagem ? ' • com foto' : ' • sem foto');

    texto.append(nome, meta);

    const acoes = document.createElement('div');
    acoes.className = 'item-painel__acoes';

    const botaoEditar = document.createElement('button');
    botaoEditar.type = 'button';
    botaoEditar.className = 'botao botao--pequeno';
    botaoEditar.innerHTML = icone('lapis') + ' Editar';
    botaoEditar.addEventListener('click', () => abrirFormulario(produto));

    const botaoTrocar = document.createElement('button');
    botaoTrocar.type = 'button';
    botaoTrocar.className = 'botao botao--claro botao--pequeno';
    botaoTrocar.innerHTML = icone('imagem') + ' Trocar foto';
    botaoTrocar.addEventListener('click', () => escolherFotoParaTroca(produto));

    const botaoExcluir = document.createElement('button');
    botaoExcluir.type = 'button';
    botaoExcluir.className = 'botao botao--perigo botao--pequeno';
    botaoExcluir.innerHTML = icone('lixeira') + ' Excluir';
    botaoExcluir.addEventListener('click', () => confirmarExclusao(produto, acoes));

    acoes.append(botaoEditar, botaoTrocar, botaoExcluir);
    item.append(foto, texto, acoes);
    tela.lista.appendChild(item);
  }
}

/* Confirmação de exclusão (dois passos, dentro da própria lista) */
function confirmarExclusao(produto, ondeInserir) {
  if (ondeInserir.querySelector('.bloco-confirmacao')) return;

  const bloco = document.createElement('div');
  bloco.className = 'bloco-confirmacao';
  bloco.innerHTML =
    '<p><strong>Excluir “' + escapar(produto.nome) + '”?</strong><br />' +
    'Essa ação não pode ser desfeita. A foto também será apagada do armazenamento.</p>';

  const linha = document.createElement('div');
  linha.className = 'acoes-confirmacao';

  const sim = document.createElement('button');
  sim.type = 'button';
  sim.className = 'botao botao--perigo botao--pequeno';
  sim.textContent = 'Sim, excluir definitivamente';
  sim.addEventListener('click', async () => {
    sim.disabled = true;
    sim.textContent = 'Excluindo...';
    try {
      await requisicao('DELETE', '/api/produtos/' + produto.id);
      avisar('Produto excluído.', 'sucesso');
      await carregarProdutos();
    } catch (falha) {
      avisar(falha.message, 'erro');
      sim.disabled = false;
      sim.textContent = 'Sim, excluir definitivamente';
    }
  });

  const nao = document.createElement('button');
  nao.type = 'button';
  nao.className = 'botao botao--claro botao--pequeno';
  nao.textContent = 'Cancelar';
  nao.addEventListener('click', () => bloco.remove());

  linha.append(sim, nao);
  bloco.appendChild(linha);
  ondeInserir.appendChild(bloco);
}

/* ---------------------------------------------------------- formulário --- */

function abrirFormulario(produto) {
  estadoPainel.produtoEditando = produto || null;
  estadoPainel.arquivoNovo = null;
  estadoPainel.fotoRemovida = false;
  liberarPreviaLocal();

  tela.tituloFormulario.textContent = produto ? 'Editar produto #' + produto.id : 'Cadastrar novo produto';
  tela.produtoId.value = produto ? produto.id : '';
  tela.campoNome.value = produto ? produto.nome : '';
  tela.campoPreco.value = produto ? formatarNumeroParaCampo(produto.preco) : '';
  tela.campoCategoria.value = produto ? produto.categoria : '';
  tela.campoDescricao.value = produto ? produto.descricao : '';
  tela.campoAtivo.checked = produto ? produto.ativo : true;
  tela.arquivoGaleria.value = '';
  tela.imagemManual.value = '';
  tela.statusFormulario.textContent = '';
  tela.statusFoto.textContent = produto && produto.imagem
    ? 'Este produto já tem foto salva no armazenamento.'
    : 'Dica: fotos quadradas (1:1) com fundo claro ficam mais bonitas no catálogo.';

  if (produto && produto.imagem) mostrarPrevia(produto.imagem); else limparPrevia();

  trocarAba('cadastro');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  tela.campoNome.focus();
}

function limparFormulario() {
  abrirFormulario(null);
  trocarAba('cadastro');
}

function mostrarPrevia(endereco) {
  tela.previaImagem.src = endereco;
  tela.previaImagem.classList.remove('oculto');
  tela.previaDica.classList.add('oculto');
}

function limparPrevia() {
  tela.previaImagem.removeAttribute('src');
  tela.previaImagem.classList.add('oculto');
  tela.previaDica.classList.remove('oculto');
}

function liberarPreviaLocal() {
  if (estadoPainel.urlPrevia) {
    URL.revokeObjectURL(estadoPainel.urlPrevia);
    estadoPainel.urlPrevia = null;
  }
}

/* --------------------------------------------------- escolher a foto ----- */

function ligarEventosPainel() {
  // Abas
  document.querySelectorAll('.aba').forEach((botao) => {
    botao.addEventListener('click', () => trocarAba(botao.dataset.aba));
  });

  // Busca da lista
  tela.busca.addEventListener('input', renderizarListaPainel);

  // Chave do painel
  tela.salvarToken.addEventListener('click', () => {
    estadoPainel.token = tela.token.value.trim();
    if (estadoPainel.token) localStorage.setItem(CHAVE_TOKEN, estadoPainel.token);
    else localStorage.removeItem(CHAVE_TOKEN);
    avisar('Chave guardada neste aparelho.', 'sucesso');
  });
  tela.esquecerToken.addEventListener('click', () => {
    estadoPainel.token = '';
    tela.token.value = '';
    localStorage.removeItem(CHAVE_TOKEN);
    avisar('Chave removida deste aparelho.', 'salvo');
  });

  // Foto: galeria e câmera
  tela.arquivoGaleria.addEventListener('change', () => receberArquivo(tela.arquivoGaleria.files[0]));
  tela.arquivoCamera.addEventListener('change', () => receberArquivo(tela.arquivoCamera.files[0]));

  tela.removerFoto.addEventListener('click', () => {
    estadoPainel.arquivoNovo = null;
    estadoPainel.fotoRemovida = true;
    liberarPreviaLocal();
    limparPrevia();
    tela.arquivoGaleria.value = '';
    tela.statusFoto.textContent = 'A foto será removida do produto quando você salvar.';
  });

  // Salvar produto
  tela.formulario.addEventListener('submit', salvarProduto);
  tela.botaoCancelar.addEventListener('click', () => {
    abrirFormulario(null);
    tela.statusFormulario.textContent = 'Edição cancelada.';
  });

  // Configurações
  tela.formularioConfig.addEventListener('submit', salvarConfiguracoes);
}

function trocarAba(nome) {
  document.querySelectorAll('.aba').forEach((botao) => {
    botao.classList.toggle('aba--ativa', botao.dataset.aba === nome);
  });
  document.querySelectorAll('[data-painel]').forEach((secao) => {
    secao.classList.toggle('oculto', secao.dataset.painel !== nome);
  });
}

function receberArquivo(arquivo) {
  if (!arquivo) return;

  if (!arquivo.type.startsWith('image/')) {
    avisar('Escolha um arquivo de imagem (JPG, PNG, WEBP ou GIF).', 'erro');
    return;
  }
  if (arquivo.size > 8 * 1024 * 1024) {
    avisar('A foto é muito grande (máximo 8 MB).', 'erro');
    return;
  }

  estadoPainel.arquivoNovo = arquivo;
  estadoPainel.fotoRemovida = false;

  // Pré-visualização imediata, antes de enviar para a nuvem
  liberarPreviaLocal();
  estadoPainel.urlPrevia = URL.createObjectURL(arquivo);
  mostrarPrevia(estadoPainel.urlPrevia);
  tela.statusFoto.textContent = 'Foto escolhida: ' + arquivo.name +
    ' (' + Math.round(arquivo.size / 1024) + ' KB). Ela será enviada ao salvar.';
}

/* Envia a foto para o R2 com barra de progresso */
function enviarFoto(arquivo) {
  return new Promise((resolve, reject) => {
    const formulario = new FormData();
    formulario.append('arquivo', arquivo, arquivo.name || 'foto.jpg');

    const pedido = new XMLHttpRequest();
    pedido.open('POST', '/api/imagens');
    if (estadoPainel.token) pedido.setRequestHeader('x-admin-token', estadoPainel.token);

    tela.barraProgresso.classList.remove('oculto');
    tela.progresso.style.width = '0%';

    pedido.upload.addEventListener('progress', (evento) => {
      if (evento.lengthComputable) {
        const porcentagem = Math.round((evento.loaded / evento.total) * 100);
        tela.progresso.style.width = porcentagem + '%';
        tela.statusFoto.textContent = 'Enviando foto... ' + porcentagem + '%';
      }
    });

    pedido.addEventListener('load', () => {
      tela.barraProgresso.classList.add('oculto');
      let dados = {};
      try { dados = JSON.parse(pedido.responseText); } catch (falha) { /* vazio */ }
      if (pedido.status >= 200 && pedido.status < 300 && dados.url) resolve(dados);
      else reject(new Error(dados.erro || 'Falha ao enviar a foto (código ' + pedido.status + ').'));
    });
    pedido.addEventListener('error', () => {
      tela.barraProgresso.classList.add('oculto');
      reject(new Error('Sem conexão com o servidor ao enviar a foto.'));
    });

    pedido.send(formulario);
  });
}

/* ---------------------------------------------------- salvar produto ----- */

async function salvarProduto(evento) {
  evento.preventDefault();

  const nome = tela.campoNome.value.trim();
  if (!nome) {
    avisar('Informe o nome do produto.', 'erro');
    tela.campoNome.focus();
    return;
  }

  const preco = converterPreco(tela.campoPreco.value);
  if (preco === null) {
    avisar('Preço inválido. Use, por exemplo: 59,90', 'erro');
    tela.campoPreco.focus();
    return;
  }

  tela.botaoSalvar.disabled = true;
  tela.botaoSalvar.textContent = 'Salvando...';
  tela.statusFormulario.textContent = '';

  try {
    let enderecoImagem = estadoPainel.produtoEditando ? estadoPainel.produtoEditando.imagem : null;
    const imagemAntiga = enderecoImagem;

    // 1) Define a foto do produto:
    //    a) nova foto escolhida no celular -> envia para o R2;
    //    b) endereço digitado na opção avançada -> usa direto;
    //    c) botão "Remover foto" -> fica sem foto.
    const enderecoDigitado = tela.imagemManual.value.trim();
    if (estadoPainel.arquivoNovo) {
      const enviada = await enviarFoto(estadoPainel.arquivoNovo);
      enderecoImagem = enviada.url;
      tela.statusFoto.textContent = 'Foto enviada com sucesso para o armazenamento da Cloudflare.';
    } else if (enderecoDigitado) {
      enderecoImagem = enderecoDigitado;
    } else if (estadoPainel.fotoRemovida) {
      enderecoImagem = null;
    }

    // 2) Salva os dados
    const corpo = {
      nome,
      descricao: tela.campoDescricao.value.trim(),
      preco,
      categoria: tela.campoCategoria.value.trim() || 'Geral',
      imagem: enderecoImagem,
      ativo: tela.campoAtivo.checked
    };

    const produtoEditando = estadoPainel.produtoEditando;
    if (produtoEditando) {
      await requisicao('PUT', '/api/produtos/' + produtoEditando.id, corpo);
      avisar('Produto atualizado!', 'sucesso');
    } else {
      await requisicao('POST', '/api/produtos', corpo);
      avisar('Produto cadastrado!', 'sucesso');
    }

    // 3) Limpa a foto antiga do R2 quando ela foi trocada ou removida
    if (imagemAntiga && imagemAntiga !== enderecoImagem) {
      const chave = chaveDoEndereco(imagemAntiga);
      if (chave) {
        try { await requisicao('DELETE', '/api/imagens/' + encodeURIComponent(chave)); }
        catch (falha) { console.warn('Não foi possível apagar a foto antiga:', falha.message); }
      }
    }

    await carregarProdutos();
    tela.arquivoGaleria.value = '';
    tela.arquivoCamera.value = '';
    estadoPainel.arquivoNovo = null;
    estadoPainel.fotoRemovida = false;
    liberarPreviaLocal();
    trocarAba('produtos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (falha) {
    avisar(falha.message, 'erro');
    tela.statusFormulario.textContent = 'Não foi possível salvar: ' + falha.message;
  } finally {
    tela.botaoSalvar.disabled = false;
    tela.botaoSalvar.innerHTML = icone('disquete') + ' Salvar produto';
  }
}

/* Troca a foto direto da lista de produtos */
function escolherFotoParaTroca(produto) {
  const entrada = document.createElement('input');
  entrada.type = 'file';
  entrada.accept = 'image/*';
  entrada.addEventListener('change', async () => {
    const arquivo = entrada.files[0];
    if (!arquivo) return;

    avisar('Enviando nova foto...', 'salvo');
    try {
      const enviada = await enviarFoto(arquivo);
      await requisicao('PUT', '/api/produtos/' + produto.id, { imagem: enviada.url });

      const chaveAntiga = chaveDoEndereco(produto.imagem);
      if (chaveAntiga) {
        try { await requisicao('DELETE', '/api/imagens/' + encodeURIComponent(chaveAntiga)); }
        catch (falha) { console.warn('Foto antiga não removida:', falha.message); }
      }
      avisar('Foto do produto atualizada!', 'sucesso');
      await carregarProdutos();
    } catch (falha) {
      avisar(falha.message, 'erro');
    }
  });
  entrada.click();
}

/* --------------------------------------------------- configurações ------- */

async function carregarConfig() {
  try {
    const dados = await requisicao('GET', '/api/config', null, { semToken: true });
    const config = dados.config || {};
    tela.configNome.value = config.nome_loja || '';
    tela.configWhatsapp.value = config.whatsapp || '';
    tela.configMensagem.value = config.mensagem_padrao || '';
    tela.subtitulo.textContent = config.nome_loja || 'Catálogo de produtos';
  } catch (falha) {
    avisar('Não foi possível carregar as configurações: ' + falha.message, 'erro');
  }
}

async function salvarConfiguracoes(evento) {
  evento.preventDefault();
  tela.statusConfig.textContent = 'Salvando...';
  try {
    const dados = await requisicao('PUT', '/api/config', {
      nome_loja: tela.configNome.value.trim(),
      whatsapp: tela.configWhatsapp.value.trim(),
      mensagem_padrao: tela.configMensagem.value.trim()
    });
    tela.subtitulo.textContent = (dados.config && dados.config.nome_loja) || 'Catálogo de produtos';
    tela.statusConfig.textContent = 'Configurações salvas. Veja o resultado no catálogo.';
    avisar('Configurações salvas!', 'sucesso');
  } catch (falha) {
    tela.statusConfig.textContent = 'Não foi possível salvar: ' + falha.message;
    avisar(falha.message, 'erro');
  }
}

/* ------------------------------------------------------------ ajudantes -- */

function chaveDoEndereco(endereco) {
  if (!endereco || !endereco.startsWith('/imagens/')) return null;
  return endereco.slice('/imagens/'.length);
}

function converterPreco(valor) {
  const limpo = String(valor || '').trim().replace(/[^\d.,-]/g, '');
  if (!limpo) return 0;
  const numero = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  if (!Number.isFinite(numero) || numero < 0) return null;
  return Math.round(numero * 100) / 100;
}

function formatarNumeroParaCampo(valor) {
  return (Number(valor) || 0).toFixed(2).replace('.', ',');
}

function formatarPreco(valor) {
  const numero = Number(valor) || 0;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero);
  } catch (falha) {
    return 'R$ ' + numero.toFixed(2).replace('.', ',');
  }
}

function normalizar(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapar(texto) {
  return String(texto || '').replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[caractere]));
}

function avisar(mensagem, tipo = 'salvo') {
  const caixa = document.createElement('div');
  caixa.className = 'aviso aviso--' + tipo;
  caixa.textContent = mensagem;
  tela.avisos.appendChild(caixa);
  setTimeout(() => {
    caixa.style.transition = 'opacity 240ms ease';
    caixa.style.opacity = '0';
    setTimeout(() => caixa.remove(), 260);
  }, 4200);
}
