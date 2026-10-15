/**
 * ============================================================================
 *  CATÁLOGO DE PRODUTOS — API e roteamento
 *  Cloudflare Workers + D1 (dados) + R2 (imagens)
 * ============================================================================
 *
 *  Rotas públicas:
 *    GET    /                       -> catálogo (arquivo public/index.html)
 *    GET    /admin                  -> painel administrativo (public/admin.html)
 *    GET    /api/produtos           -> lista produtos
 *                                      filtros: ?q= &categoria= &ordem=
 *                                      ordem: recentes | preco_asc | preco_desc | nome
 *    GET    /api/produtos/:id       -> um produto
 *    GET    /api/categorias         -> lista de categorias usadas
 *    GET    /api/config             -> configurações públicas da loja
 *    GET    /imagens/<chave>        -> foto (R2; se não existir, usa public/demo)
 *
 *  Rotas do painel (exigem x-admin-token se ADMIN_TOKEN estiver definido):
 *    POST   /api/produtos           -> cria produto
 *    PUT    /api/produtos/:id       -> atualiza produto
 *    DELETE /api/produtos/:id       -> exclui produto (e a foto dele no R2)
 *    POST   /api/imagens            -> envia foto para o R2 (multipart/form-data, campo "arquivo")
 *    DELETE /api/imagens/<chave>    -> exclui foto do R2
 *    PUT    /api/config             -> salva configurações da loja
 * ============================================================================
 */

const TAMANHO_MAXIMO_FOTO = 8 * 1024 * 1024; // 8 MB
const TIPOS_ACEITOS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type,x-admin-token'
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const caminho = url.pathname;

    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS });
      }

      // ---------------------------------------------------------------- fotos
      if (caminho.startsWith('/imagens/')) {
        return await entregarFoto(request, env, caminho.slice('/imagens/'.length));
      }

      // ----------------------------------------------- validar chave do painel
      // Endpoint explícito para testar a chave antes de guardá-la no navegador.
      if (caminho === '/api/admin/validar' && request.method === 'GET') {
        if (!autorizado(request, env)) return erro('Chave do painel incorreta ou ausente.', 401);
        return json({ ok: true, mensagem: 'Chave do painel validada.' });
      }

      // ------------------------------------------------------------ catálogo
      if (caminho === '/api/produtos') {
        if (request.method === 'GET') return await listarProdutos(request, env);
        if (request.method === 'POST') return await criarProduto(request, env);
        return erro('Método não permitido nesta rota.', 405);
      }

      const rotaProduto = caminho.match(/^\/api\/produtos\/(\d+)$/);
      if (rotaProduto) {
        const id = Number(rotaProduto[1]);
        if (request.method === 'GET') return await obterProduto(env, id);
        if (request.method === 'PUT') return await atualizarProduto(request, env, id);
        if (request.method === 'DELETE') return await excluirProduto(request, env, id);
        return erro('Método não permitido nesta rota.', 405);
      }

      if (caminho === '/api/categorias' && request.method === 'GET') {
        return await listarCategorias(env);
      }

      // ---------------------------------------------------- configurações
      if (caminho === '/api/config') {
        if (request.method === 'GET') return await lerConfig(env);
        if (request.method === 'PUT') return await salvarConfig(request, env);
        return erro('Método não permitido nesta rota.', 405);
      }

      // ------------------------------------------------------------- fotos
      if (caminho === '/api/imagens' && request.method === 'POST') {
        return await enviarFoto(request, env);
      }

      const rotaImagem = caminho.match(/^\/api\/imagens\/(.+)$/);
      if (rotaImagem && request.method === 'DELETE') {
        return await excluirFoto(request, env, decodeURIComponent(rotaImagem[1]));
      }

      if (caminho === '/api/health') {
        return json({ ok: true, banco: !!env.DB, r2: !!env.IMAGENS });
      }

      if (caminho.startsWith('/api/')) {
        return erro('Rota da API não encontrada.', 404);
      }

      // ------------------------------------------------- arquivos estáticos
      // (index.html, admin.html, CSS, JS, ícone e fotos de demonstração)
      if (env.ASSETS) {
        const resposta = await env.ASSETS.fetch(request);
        // Endereços "bonitos" para o painel
        if (resposta.status === 404 && caminho === '/admin') {
          return env.ASSETS.fetch(new Request(new URL('/admin.html', url), { method: 'GET' }));
        }
        return resposta;
      }

      return erro('Não encontrado.', 404);
    } catch (falha) {
      console.error('Erro inesperado:', falha && falha.stack ? falha.stack : falha);
      return erro('Erro interno no servidor. Tente novamente.', 500, String((falha && falha.message) || falha));
    }
  }
};

/* ==========================================================================
 *  PRODUTOS
 * ========================================================================== */

async function listarProdutos(request, env) {
  const url = new URL(request.url);
  const busca = (url.searchParams.get('q') || '').trim();
  const categoria = (url.searchParams.get('categoria') || '').trim();
  const ordem = (url.searchParams.get('ordem') || 'recentes').trim();

  // ?todos=1 (usado pelo painel) devolve também os produtos ocultos e
  // exige a chave do painel quando ela estiver configurada.
  const incluirOcultos = url.searchParams.get('todos') === '1' && autorizado(request, env);

  let sql = `SELECT id, nome, descricao, preco, categoria, imagem, ativo, demo, criado_em, atualizado_em
             FROM produtos WHERE 1 = 1`;
  const valores = [];
  if (!incluirOcultos) sql += ' AND ativo = 1';

  if (busca) {
    sql += ' AND (nome LIKE ? OR descricao LIKE ? OR categoria LIKE ?)';
    const filtro = `%${busca}%`;
    valores.push(filtro, filtro, filtro);
  }
  if (categoria && categoria.toLowerCase() !== 'todas') {
    sql += ' AND categoria = ?';
    valores.push(categoria);
  }
  sql += ' ORDER BY ' + ordenacaoSegura(ordem);

  const resultado = await env.DB.prepare(sql).bind(...valores).all();
  return json({ produtos: (resultado.results || []).map(formatarProduto), total: (resultado.results || []).length });
}

async function obterProduto(env, id) {
  const produto = await env.DB.prepare('SELECT * FROM produtos WHERE id = ?').bind(id).first();
  if (!produto) return erro('Produto não encontrado.', 404);
  return json({ produto: formatarProduto(produto) });
}

async function listarCategorias(env) {
  const resultado = await env.DB
    .prepare("SELECT categoria, COUNT(*) AS quantidade FROM produtos WHERE ativo = 1 AND categoria <> '' GROUP BY categoria ORDER BY categoria COLLATE NOCASE")
    .all();
  return json({ categorias: resultado.results || [] });
}

async function criarProduto(request, env) {
  if (!autorizado(request, env)) return erro('Acesso não autorizado. Informe a chave do painel.', 401);

  const dados = await lerJson(request);
  if (!dados) return erro('Dados inválidos.', 400);

  const validacao = validarProduto(dados, true);
  if (validacao.erro) return erro(validacao.erro, 400);

  const produto = validacao.produto;
  const resultado = await env.DB
    .prepare(`INSERT INTO produtos (nome, descricao, preco, categoria, imagem, ativo, demo, criado_em, atualizado_em)
              VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`)
    .bind(produto.nome, produto.descricao, produto.preco, produto.categoria, produto.imagem, produto.ativo)
    .run();

  const id = resultado.meta && resultado.meta.last_row_id;
  const criado = await env.DB.prepare('SELECT * FROM produtos WHERE id = ?').bind(id).first();
  return json({ produto: formatarProduto(criado), mensagem: 'Produto cadastrado com sucesso.' }, 201);
}

async function atualizarProduto(request, env, id) {
  if (!autorizado(request, env)) return erro('Acesso não autorizado. Informe a chave do painel.', 401);

  const atual = await env.DB.prepare('SELECT * FROM produtos WHERE id = ?').bind(id).first();
  if (!atual) return erro('Produto não encontrado.', 404);

  const dados = await lerJson(request);
  if (!dados) return erro('Dados inválidos.', 400);

  const validacao = validarProduto(dados, false, atual);
  if (validacao.erro) return erro(validacao.erro, 400);

  const p = validacao.produto;
  await env.DB
    .prepare(`UPDATE produtos
              SET nome = ?, descricao = ?, preco = ?, categoria = ?, imagem = ?, ativo = ?, atualizado_em = datetime('now')
              WHERE id = ?`)
    .bind(p.nome, p.descricao, p.preco, p.categoria, p.imagem, p.ativo, id)
    .run();

  const atualizado = await env.DB.prepare('SELECT * FROM produtos WHERE id = ?').bind(id).first();
  return json({ produto: formatarProduto(atualizado), mensagem: 'Produto atualizado com sucesso.' });
}

async function excluirProduto(request, env, id) {
  if (!autorizado(request, env)) return erro('Acesso não autorizado. Informe a chave do painel.', 401);

  const produto = await env.DB.prepare('SELECT * FROM produtos WHERE id = ?').bind(id).first();
  if (!produto) return erro('Produto não encontrado.', 404);

  await env.DB.prepare('DELETE FROM produtos WHERE id = ?').bind(id).run();

  // Remove a foto do R2 (se o produto tinha uma foto enviada pelo painel).
  const chave = chaveDaImagem(produto.imagem);
  if (chave && env.IMAGENS) {
    try {
      const aindaUsada = await env.DB
        .prepare('SELECT COUNT(*) AS total FROM produtos WHERE imagem = ?')
        .bind(produto.imagem)
        .first();
      if (!aindaUsada || aindaUsada.total === 0) await env.IMAGENS.delete(chave);
    } catch (e) {
      console.warn('Não foi possível apagar a foto do R2:', e);
    }
  }

  return json({ mensagem: 'Produto excluído com sucesso.' });
}

function validarProduto(dados, exigirTudo, atual) {
  const base = atual || { nome: '', descricao: '', preco: 0, categoria: 'Geral', imagem: null, ativo: 1 };

  const nome = limitar(dados.nome !== undefined ? dados.nome : base.nome, 120).trim();
  if (!nome) return { erro: 'Informe o nome do produto.' };

  const descricao = limitar(dados.descricao !== undefined ? dados.descricao : base.descricao, 2000).trim();

  let preco;
  if (dados.preco === undefined || dados.preco === null || dados.preco === '') {
    preco = Number(base.preco) || 0;
  } else {
    preco = typeof dados.preco === 'number'
      ? dados.preco
      : Number(String(dados.preco).replace(/\./g, '').replace(',', '.'));
  }
  if (!Number.isFinite(preco) || preco < 0) return { erro: 'O preço precisa ser um número maior ou igual a zero.' };
  preco = Math.round(preco * 100) / 100;

  const categoria = limitar(dados.categoria !== undefined ? dados.categoria : base.categoria, 60).trim() || 'Geral';

  let imagem = base.imagem;
  if (dados.imagem !== undefined) {
    imagem = dados.imagem === null || dados.imagem === '' ? null : limitar(dados.imagem, 600).trim();
    if (imagem && !/^\/imagens\/[\w\-./%]+$/.test(imagem) && !/^https:\/\//.test(imagem)) {
      return { erro: 'Endereço de imagem inválido.' };
    }
  }

  let ativo = base.ativo;
  if (dados.ativo !== undefined) ativo = dados.ativo === false || dados.ativo === 0 || dados.ativo === '0' ? 0 : 1;

  if (exigirTudo && !nome) return { erro: 'Informe o nome do produto.' };

  return { produto: { nome, descricao, preco, categoria, imagem, ativo } };
}

function formatarProduto(linha) {
  if (!linha) return null;
  return {
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao || '',
    preco: Number(linha.preco) || 0,
    categoria: linha.categoria || 'Geral',
    imagem: linha.imagem || null,
    ativo: Number(linha.ativo) === 1,
    demo: Number(linha.demo) === 1,
    criado_em: linha.criado_em,
    atualizado_em: linha.atualizado_em
  };
}

function ordenacaoSegura(ordem) {
  switch (ordem) {
    case 'preco_asc': return 'preco ASC, nome COLLATE NOCASE ASC';
    case 'preco_desc': return 'preco DESC, nome COLLATE NOCASE ASC';
    case 'nome': return 'nome COLLATE NOCASE ASC';
    default: return 'id DESC';
  }
}

/* ==========================================================================
 *  CONFIGURAÇÕES DA LOJA (nome, WhatsApp, moeda, mensagem)
 * ========================================================================== */

const CHAVES_CONFIG = ['nome_loja', 'whatsapp', 'moeda', 'mensagem_padrao'];

async function lerConfig(env) {
  const resultado = await env.DB.prepare('SELECT chave, valor FROM configuracoes').all();
  const config = { nome_loja: 'Minha Loja', whatsapp: '', moeda: 'BRL', mensagem_padrao: '' };
  for (const linha of resultado.results || []) {
    if (CHAVES_CONFIG.includes(linha.chave)) config[linha.chave] = linha.valor;
  }
  return json({
    config,
    painel_protegido: !!(env.ADMIN_TOKEN && String(env.ADMIN_TOKEN).trim())
  });
}

async function salvarConfig(request, env) {
  if (!autorizado(request, env)) return erro('Acesso não autorizado. Informe a chave do painel.', 401);

  const dados = await lerJson(request);
  if (!dados) return erro('Dados inválidos.', 400);

  const instrucoes = [];
  for (const chave of CHAVES_CONFIG) {
    if (dados[chave] === undefined) continue;
    let valor = limitar(dados[chave], 500).trim();
    if (chave === 'whatsapp') valor = valor.replace(/[^\d]/g, ''); // só números: 55 + DDD + número
    instrucoes.push(
      env.DB
        .prepare('INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor')
        .bind(chave, valor)
    );
  }
  if (instrucoes.length) await env.DB.batch(instrucoes);

  const salvas = await env.DB.prepare('SELECT chave, valor FROM configuracoes').all();
  const config = {};
  for (const linha of salvas.results || []) config[linha.chave] = linha.valor;

  return json({ mensagem: 'Configurações salvas.', config });
}

/* ==========================================================================
 *  IMAGENS (Cloudflare R2)
 * ========================================================================== */

// Envia a foto para o R2 e devolve o endereço público (/imagens/...)
async function enviarFoto(request, env) {
  if (!autorizado(request, env)) return erro('Acesso não autorizado. Informe a chave do painel.', 401);
  if (!env.IMAGENS) return erro('O armazenamento de imagens (R2) não está configurado no Worker.', 500);

  const tipo = request.headers.get('content-type') || '';
  if (!tipo.includes('multipart/form-data')) {
    return erro('Envie a foto como formulário multipart/form-data no campo "arquivo".', 400);
  }

  let formulario;
  try {
    formulario = await request.formData();
  } catch (e) {
    return erro('Não foi possível ler o arquivo enviado.', 400);
  }

  const arquivo = formulario.get('arquivo') || formulario.get('file');
  if (!arquivo || typeof arquivo === 'string') return erro('Selecione uma foto para enviar.', 400);

  if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
    return erro('A foto é muito grande (máximo 8 MB). Reduza o tamanho e tente novamente.', 413);
  }

  const extensao = TIPOS_ACEITOS[arquivo.type];
  if (!extensao) return erro('Formato não aceito. Use JPG, PNG, WEBP ou GIF.', 415);

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (!assinaturaValida(bytes, arquivo.type)) {
    return erro('O arquivo enviado não parece ser uma imagem válida.', 400);
  }

  const chave = `produtos/${Date.now()}-${aleatorio(6)}.${extensao}`;
  await env.IMAGENS.put(chave, bytes, {
    httpMetadata: {
      contentType: arquivo.type,
      cacheControl: 'public, max-age=31536000, immutable'
    }
  });

  return json({
    mensagem: 'Foto enviada para o armazenamento.',
    chave,
    url: `/imagens/${chave}`
  }, 201);
}

async function excluirFoto(request, env, chave) {
  if (!autorizado(request, env)) return erro('Acesso não autorizado. Informe a chave do painel.', 401);
  if (!env.IMAGENS) return erro('O armazenamento de imagens (R2) não está configurado no Worker.', 500);
  if (!chave || chave.includes('..')) return erro('Chave de imagem inválida.', 400);

  await env.IMAGENS.delete(chave);
  return json({ mensagem: 'Foto excluída do armazenamento.' });
}

// Entrega a foto: primeiro tenta o R2; se não existir, usa o arquivo
// da pasta public/demo (fotos de demonstração que vem no projeto).
async function entregarFoto(request, env, chave) {
  const chaveLimpa = decodeURIComponent(chave).replace(/^\/+/, '');
  if (!chaveLimpa || chaveLimpa.includes('..')) return erro('Imagem não encontrada.', 404);

  if (env.IMAGENS) {
    const objeto = await env.IMAGENS.get(chaveLimpa);
    if (objeto) {
      const cabecalhos = new Headers();
      objeto.writeHttpMetadata(cabecalhos);
      cabecalhos.set('etag', objeto.httpEtag);
      cabecalhos.set('cache-control', cabecalhos.get('cache-control') || 'public, max-age=86400');
      return new Response(objeto.body, { headers: cabecalhos });
    }
  }

  if (env.ASSETS) {
    const url = new URL(request.url);
    const tentativas = [`/demo/${chaveLimpa}`];
    const nomeArquivo = chaveLimpa.split('/').pop();
    if (nomeArquivo && nomeArquivo !== chaveLimpa) tentativas.push(`/demo/${nomeArquivo}`);
    for (const caminho of tentativas) {
      const resposta = await env.ASSETS.fetch(new Request(new URL(caminho, url), { method: 'GET' }));
      if (resposta.ok) {
        const cabecalhos = new Headers(resposta.headers);
        cabecalhos.set('cache-control', 'public, max-age=86400');
        return new Response(resposta.body, { status: 200, headers: cabecalhos });
      }
    }
  }

  return erro('Imagem não encontrada.', 404);
}

function chaveDaImagem(endereco) {
  if (!endereco || typeof endereco !== 'string') return null;
  if (!endereco.startsWith('/imagens/')) return null;
  return endereco.slice('/imagens/'.length);
}

function assinaturaValida(bytes, tipo) {
  if (bytes.length < 12) return false;
  const d = bytes;
  if (tipo === 'image/jpeg') return d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff;
  if (tipo === 'image/png') return d[0] === 0x89 && d[1] === 0x50 && d[2] === 0x4e && d[3] === 0x47;
  if (tipo === 'image/gif') return d[0] === 0x47 && d[1] === 0x49 && d[2] === 0x46;
  if (tipo === 'image/webp') {
    return d[0] === 0x52 && d[1] === 0x49 && d[2] === 0x46 && d[3] === 0x46 &&
           d[8] === 0x57 && d[9] === 0x45 && d[10] === 0x42 && d[11] === 0x50;
  }
  return false;
}

/* ==========================================================================
 *  AJUDANTES
 * ========================================================================== */

function autorizado(request, env) {
  const token = (env.ADMIN_TOKEN || '').trim();
  // Fail closed: sem segredo configurado, nenhuma operação administrativa é autorizada.
  if (!token) return false;
  return (request.headers.get('x-admin-token') || '') === token;
}

async function lerJson(request) {
  try {
    return await request.json();
  } catch (e) {
    return null;
  }
}

function limitar(valor, maximo) {
  return String(valor === undefined || valor === null ? '' : valor).slice(0, maximo);
}

function aleatorio(tamanho) {
  const caracteres = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let saida = '';
  const sorteio = new Uint8Array(tamanho);
  crypto.getRandomValues(sorteio);
  for (const n of sorteio) saida += caracteres[n % caracteres.length];
  return saida;
}

function json(corpo, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS }
  });
}

function erro(mensagem, status = 400, detalhe) {
  const corpo = { erro: mensagem };
  if (detalhe) corpo.detalhe = detalhe;
  return json(corpo, status);
}
