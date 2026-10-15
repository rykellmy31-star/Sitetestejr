/* ==========================================================================
   CATÁLOGO PÚBLICO — busca os produtos na API e monta a tela
   ========================================================================== */

const IMAGEM_SUBSTITUTA = '/sem-foto.svg';

const estado = {
  produtos: [],
  categorias: [],
  busca: '',
  categoria: 'Todas',
  ordem: 'recentes',
  config: {
    nome_loja: 'Minha Loja',
    whatsapp: '',
    moeda: 'BRL',
    mensagem_padrao: 'Olá! Tenho interesse neste produto: {produto} — {preco}.'
  },
  produtoAberto: null,
  avisoDeImagemJaMostrado: false
};

const el = {
  grade: document.getElementById('grade'),
  vazio: document.getElementById('vazio'),
  categorias: document.getElementById('categorias'),
  busca: document.getElementById('campo-busca'),
  limparBusca: document.getElementById('limpar-busca'),
  ordem: document.getElementById('campo-ordem'),
  titulo: document.getElementById('titulo-resultado'),
  texto: document.getElementById('texto-resultado'),
  limparFiltros: document.getElementById('limpar-filtros'),
  nomeLoja: document.getElementById('nome-loja'),
  nomeLojaRodape: document.getElementById('nome-loja-rodape'),
  contatoRodape: document.getElementById('contato-rodape'),
  avisos: document.getElementById('avisos'),
  janela: document.getElementById('janela'),
  janelaFechar: document.getElementById('janela-fechar'),
  janelaImagem: document.getElementById('janela-imagem'),
  janelaCategoria: document.getElementById('janela-categoria'),
  janelaNome: document.getElementById('janela-nome'),
  janelaPreco: document.getElementById('janela-preco'),
  janelaDescricao: document.getElementById('janela-descricao'),
  janelaDemo: document.getElementById('janela-demo'),
  janelaComprar: document.getElementById('janela-comprar'),
  janelaCopiar: document.getElementById('janela-copiar'),
  janelaMeta: document.getElementById('janela-meta')
};

/* ------------------------------------------------------------- início ---- */

iniciar();

async function iniciar() {
  mostrarEsqueletos();
  ligarEventos();

  try {
    const [config, produtos, categorias] = await Promise.all([
      buscarJson('/api/config').catch(() => null),
      buscarJson('/api/produtos'),
      buscarJson('/api/categorias')
    ]);

    if (config && config.config) Object.assign(estado.config, config.config);
    estado.produtos = (produtos && produtos.produtos) || [];
    estado.categorias = (categorias && categorias.categorias) || [];
  } catch (falha) {
    el.grade.innerHTML = '';
    el.vazio.classList.remove('oculto');
    el.vazio.querySelector('h3').textContent = 'Não foi possível carregar o catálogo';
    el.vazio.querySelector('p').textContent =
      'Verifique sua internet e recarregue a página. Se o problema continuar, avise o responsável pela loja.';
    el.limparFiltros.classList.add('oculto');
    avisar('Erro ao carregar os produtos: ' + (falha.message || falha), 'erro');
    return;
  }

  aplicarConfigNaTela();
  renderizarCategorias();
  renderizarProdutos();
  abrirProdutoPeloLink();
}

function ligarEventos() {
  let espera;
  el.busca.addEventListener('input', () => {
    estado.busca = el.busca.value;
    el.limparBusca.classList.toggle('oculto', !estado.busca);
    clearTimeout(espera);
    espera = setTimeout(renderizarProdutos, 160); // espera você parar de digitar
  });

  el.limparBusca.addEventListener('click', () => {
    el.busca.value = '';
    estado.busca = '';
    el.limparBusca.classList.add('oculto');
    renderizarProdutos();
    el.busca.focus();
  });

  el.ordem.addEventListener('change', () => {
    estado.ordem = el.ordem.value;
    renderizarProdutos();
  });

  el.limparFiltros.addEventListener('click', () => {
    el.busca.value = '';
    estado.busca = '';
    estado.categoria = 'Todas';
    el.limparBusca.classList.add('oculto');
    renderizarCategorias();
    renderizarProdutos();
  });

  el.janela.addEventListener('click', (evento) => {
    if (evento.target.hasAttribute('data-fechar')) fecharJanela();
  });
  el.janelaFechar.addEventListener('click', fecharJanela);
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && estado.produtoAberto) fecharJanela();
  });
  el.janelaComprar.addEventListener('click', () => {
    if (estado.produtoAberto) abrirWhatsApp(estado.produtoAberto);
  });
  el.janelaCopiar.addEventListener('click', copiarLinkDoProduto);

  window.addEventListener('hashchange', abrirProdutoPeloLink);
}

/* ------------------------------------------------------ config na tela ---- */

function aplicarConfigNaTela() {
  const nome = estado.config.nome_loja || 'Minha Loja';
  document.title = nome + ' — Catálogo de produtos';
  el.nomeLoja.textContent = nome;
  el.nomeLojaRodape.textContent = nome;
  el.contatoRodape.textContent = estado.config.whatsapp
    ? 'WhatsApp da loja: ' + formatarTelefone(estado.config.whatsapp)
    : 'WhatsApp da loja ainda não configurado (ajuste no painel administrativo).';
}

/* ------------------------------------------------------- categorias ------ */

function renderizarCategorias() {
  const contagem = new Map();
  for (const produto of estado.produtos) {
    const chave = produto.categoria || 'Geral';
    contagem.set(chave, (contagem.get(chave) || 0) + 1);
  }

  const lista = [{ nome: 'Todas', quantidade: estado.produtos.length }];
  for (const item of estado.categorias) {
    lista.push({ nome: item.categoria, quantidade: item.quantidade });
  }

  el.categorias.innerHTML = '';
  for (const categoria of lista) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'chip' + (estado.categoria === categoria.nome ? ' chip--ativo' : '');
    botao.innerHTML =
      escapar(categoria.nome) + '<span class="chip__contagem">' + categoria.quantidade + '</span>';
    botao.addEventListener('click', () => {
      estado.categoria = categoria.nome;
      renderizarCategorias();
      renderizarProdutos();
    });
    el.categorias.appendChild(botao);
  }
}

/* --------------------------------------------------------- produtos ------ */

function produtosFiltrados() {
  const termo = normalizar(estado.busca);
  let lista = estado.produtos.filter((produto) => {
    const combinaCategoria = estado.categoria === 'Todas' || produto.categoria === estado.categoria;
    if (!combinaCategoria) return false;
    if (!termo) return true;
    return (
      normalizar(produto.nome).includes(termo) ||
      normalizar(produto.descricao).includes(termo) ||
      normalizar(produto.categoria).includes(termo)
    );
  });

  switch (estado.ordem) {
    case 'preco_asc':
      lista = lista.slice().sort((a, b) => a.preco - b.preco || a.nome.localeCompare(b.nome, 'pt-BR'));
      break;
    case 'preco_desc':
      lista = lista.slice().sort((a, b) => b.preco - a.preco || a.nome.localeCompare(b.nome, 'pt-BR'));
      break;
    case 'nome':
      lista = lista.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      break;
    default:
      lista = lista.slice().sort((a, b) => b.id - a.id);
  }
  return lista;
}

function renderizarProdutos() {
  const lista = produtosFiltrados();

  el.grade.innerHTML = '';
  el.vazio.classList.toggle('oculto', lista.length > 0);
  el.limparFiltros.classList.toggle('oculto', lista.length > 0);

  el.titulo.textContent = estado.categoria === 'Todas' ? 'Todos os produtos' : estado.categoria;
  el.texto.textContent =
    lista.length === 1 ? '1 produto encontrado' : lista.length + ' produtos encontrados';

  const fragmento = document.createDocumentFragment();
  lista.forEach((produto, indice) => fragmento.appendChild(criarCartao(produto, indice)));
  el.grade.appendChild(fragmento);
}

function criarCartao(produto, indice) {
  const cartao = document.createElement('article');
  cartao.className = 'cartao';
  cartao.style.animationDelay = Math.min(indice * 35, 300) + 'ms';

  // ---- foto (com carregamento otimizado e imagem substituta) ----
  const midia = document.createElement('div');
  midia.className = 'cartao__midia';
  midia.addEventListener('click', () => abrirJanela(produto));

  const foto = document.createElement('img');
  foto.className = 'cartao__foto';
  foto.alt = 'Foto do produto ' + produto.nome;
  foto.loading = indice < 4 ? 'eager' : 'lazy';   // as primeiras carregam na hora
  foto.decoding = 'async';
  foto.width = 900;
  foto.height = 900;
  foto.src = produto.imagem || IMAGEM_SUBSTITUTA;
  foto.addEventListener('load', () => foto.classList.add('cartao__foto--pronta'));
  foto.addEventListener('error', () => tratarErroImagem(foto));
  midia.appendChild(foto);

  if (produto.demo) {
    const selo = document.createElement('span');
    selo.className = 'cartao__selo';
    selo.innerHTML = icone('frasco') + ' Exemplo editável';
    midia.appendChild(selo);
  }

  const etiqueta = document.createElement('span');
  etiqueta.className = 'cartao__categoria';
  etiqueta.textContent = produto.categoria;
  midia.appendChild(etiqueta);

  // ---- dados ----
  const corpo = document.createElement('div');
  corpo.className = 'cartao__corpo';

  const nome = document.createElement('h3');
  nome.className = 'cartao__nome';
  nome.textContent = produto.nome;
  nome.style.cursor = 'pointer';
  nome.addEventListener('click', () => abrirJanela(produto));

  const descricao = document.createElement('p');
  descricao.className = 'cartao__descricao';
  descricao.textContent = produto.descricao || 'Sem descrição cadastrada.';

  const rodape = document.createElement('div');
  rodape.className = 'cartao__rodape';

  const preco = document.createElement('span');
  preco.className = 'cartao__preco';
  preco.textContent = formatarPreco(produto.preco);

  const acoes = document.createElement('div');
  acoes.className = 'cartao__acoes';

  const detalhes = document.createElement('button');
  detalhes.type = 'button';
  detalhes.className = 'botao botao--claro botao--pequeno';
  detalhes.textContent = 'Ver detalhes';
  detalhes.addEventListener('click', () => abrirJanela(produto));

  const comprar = document.createElement('button');
  comprar.type = 'button';
  comprar.className = 'botao botao--zap botao--pequeno';
  comprar.title = 'Comprar pelo WhatsApp';
  comprar.setAttribute('aria-label', 'Comprar ' + produto.nome + ' pelo WhatsApp');
  comprar.innerHTML = icone('whatsapp') + '<span class="apenas-leitor">Comprar ' + escapar(produto.nome) + ' pelo WhatsApp</span>';
  comprar.addEventListener('click', () => abrirWhatsApp(produto));

  acoes.append(detalhes, comprar);
  rodape.append(preco, acoes);
  corpo.append(nome, descricao, rodape);
  cartao.append(midia, corpo);

  return cartao;
}

/* ----------------------------------------------------------- janela ------ */

function abrirJanela(produto) {
  estado.produtoAberto = produto;

  el.janelaImagem.src = produto.imagem || IMAGEM_SUBSTITUTA;
  el.janelaImagem.alt = 'Foto do produto ' + produto.nome;
  el.janelaImagem.onerror = () => tratarErroImagem(el.janelaImagem);
  el.janelaCategoria.textContent = produto.categoria;
  el.janelaNome.textContent = produto.nome;
  el.janelaPreco.textContent = formatarPreco(produto.preco);
  el.janelaDescricao.textContent = produto.descricao || 'Este produto ainda não tem descrição cadastrada.';
  el.janelaDemo.classList.toggle('oculto', !produto.demo);
  el.janelaMeta.textContent = 'Código do produto: #' + produto.id;

  el.janela.classList.add('janela--aberta');
  document.body.style.overflow = 'hidden';
  el.janelaFechar.focus();

  if (location.hash !== '#produto-' + produto.id) {
    history.replaceState(null, '', '#produto-' + produto.id);
  }
}

function fecharJanela() {
  el.janela.classList.remove('janela--aberta');
  document.body.style.overflow = '';
  estado.produtoAberto = null;
  if (location.hash.startsWith('#produto-')) {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

function abrirProdutoPeloLink() {
  const encontrado = location.hash.match(/^#produto-(\d+)$/);
  if (!encontrado) return;
  const produto = estado.produtos.find((item) => item.id === Number(encontrado[1]));
  if (produto) abrirJanela(produto);
}

/* --------------------------------------------------------- WhatsApp ------ */

function abrirWhatsApp(produto) {
  const numero = (estado.config.whatsapp || '').replace(/\D/g, '');
  if (!numero) {
    avisar('O WhatsApp da loja ainda não foi configurado no painel administrativo.', 'erro');
    return;
  }

  const linkDoProduto = location.origin + location.pathname + '#produto-' + produto.id;
  const mensagem = (estado.config.mensagem_padrao || 'Olá! Tenho interesse no produto {produto}.')
    .replace(/\{produto\}/g, produto.nome)
    .replace(/\{preco\}/g, formatarPreco(produto.preco))
    .replace(/\{categoria\}/g, produto.categoria)
    .replace(/\{link\}/g, linkDoProduto)
    .replace(/\{loja\}/g, estado.config.nome_loja || '');

  const endereco = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(mensagem);
  window.open(endereco, '_blank', 'noopener');
}

async function copiarLinkDoProduto() {
  if (!estado.produtoAberto) return;
  const link = location.origin + location.pathname + '#produto-' + estado.produtoAberto.id;
  try {
    await navigator.clipboard.writeText(link);
    avisar('Link do produto copiado!', 'sucesso');
  } catch (falha) {
    avisar('Copie o link manualmente: ' + link, 'salvo');
  }
}

/* ---------------------------------------------------------- ajudantes ----- */

function mostrarEsqueletos() {
  el.grade.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const item = document.createElement('div');
    item.className = 'esqueleto';
    item.innerHTML =
      '<div class="esqueleto__img brilho"></div>' +
      '<div class="esqueleto__linha brilho"></div>' +
      '<div class="esqueleto__linha esqueleto__linha--curta brilho"></div>' +
      '<div class="esqueleto__linha brilho"></div>';
    el.grade.appendChild(item);
  }
}

function tratarErroImagem(imagem) {
  if (imagem.dataset.substituta === 'sim') return;
  imagem.dataset.substituta = 'sim';
  imagem.src = IMAGEM_SUBSTITUTA;
  imagem.classList.add('cartao__foto--pronta');
  if (!estado.avisoDeImagemJaMostrado) {
    estado.avisoDeImagemJaMostrado = true;
    avisar('Uma foto não pôde ser carregada e foi substituída por uma imagem padrão.', 'salvo');
  }
}

function formatarPreco(valor) {
  const numero = Number(valor) || 0;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: estado.config.moeda || 'BRL' }).format(numero);
  } catch (falha) {
    return 'R$ ' + numero.toFixed(2).replace('.', ',');
  }
}

function formatarTelefone(numero) {
  const digitos = String(numero).replace(/\D/g, '');
  if (digitos.length === 13) return '+' + digitos.slice(0, 2) + ' (' + digitos.slice(2, 4) + ') ' + digitos.slice(4, 9) + '-' + digitos.slice(9);
  return '+' + digitos;
}

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // ignora acentos na pesquisa
}

function escapar(texto) {
  return String(texto || '').replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[caractere]));
}

async function buscarJson(endereco) {
  const resposta = await fetch(endereco, { headers: { accept: 'application/json' } });
  if (!resposta.ok) {
    let detalhe = 'Erro ' + resposta.status;
    try {
      const dados = await resposta.json();
      if (dados.erro) detalhe = dados.erro;
    } catch (falha) { /* resposta sem JSON */ }
    throw new Error(detalhe);
  }
  return resposta.json();
}

function avisar(mensagem, tipo = 'salvo') {
  const caixa = document.createElement('div');
  caixa.className = 'aviso aviso--' + tipo;
  caixa.textContent = mensagem;
  el.avisos.appendChild(caixa);
  setTimeout(() => {
    caixa.style.transition = 'opacity 240ms ease';
    caixa.style.opacity = '0';
    setTimeout(() => caixa.remove(), 260);
  }, 4200);
}
