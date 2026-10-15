# Catálogo de Produtos — Cloudflare Workers + D1 + R2

Catálogo de produtos com painel administrativo (incluindo envio de fotos pelo
celular), rodando 100% na Cloudflare:

- **Workers** → serve o site, o painel e a API (`src/worker.js`)
- **D1** (banco SQL) → produtos e configurações da loja
- **R2** (armazenamento) → fotos enviadas pelo painel
- **Assets** → HTML, CSS, JS, ícone e as fotos de demonstração (`public/`)

> 📱 **Só quer publicar e usar?** O passo a passo para leigos (celular Android)
> está em **[`TUTORIAL.md`](TUTORIAL.md)**.

---

## 1. Publicar (resumo)

```bash
# 1. instalar o wrangler
npm install

# 2. entrar na sua conta Cloudflare
npx wrangler login

# 3. criar o banco D1 e copiar o ID para o wrangler.jsonc
npx wrangler d1 create catalogo-db          # cole o ID retornado no wrangler.jsonc

# 4. criar o bucket das fotos
npx wrangler r2 bucket create catalogo-imagens

# 5. criar as tabelas e os produtos de exemplo
npx wrangler d1 migrations apply catalogo-db --remote

# 6. publicar
npx wrangler deploy
```

Os passos 3 a 5 podem ser feitos por um só comando: `sh preparar.sh`
(e `sh preparar-tudo.sh` faz instalação + configuração + publicação).

> ⚠️ **Não use o editor de código do painel da Cloudflare** (“Editar código” /
> *Quick Edit*): ele só aceita um único arquivo de script e responde
> *“Este carregador ainda não suporta projetos que exigem um processo de
> compilação… use `wrangler deploy`”* — que é justamente o comportamento
> esperado, porque o projeto usa `wrangler.jsonc` com `assets`, D1 e R2.
> Publicar e atualizar é sempre por `npx wrangler deploy`.

### Antes de publicar, confira

| Item | Onde |
|---|---|
| `database_id` do D1 não pode continuar como `SUBSTITUA_PELO_ID_DO_SEU_BANCO_D1` | `wrangler.jsonc` |
| Bucket R2 chamado `catalogo-imagens` (ou ajuste `bucket_name`) | `wrangler.jsonc` |
| Migrações aplicadas (`0001` e `0002`) | `npx wrangler d1 migrations list catalogo-db --remote` |
| Senha do painel (opcional, recomendada) | `npx wrangler secret put ADMIN_TOKEN` |

> ⚠️ O R2 exige cadastro de cartão/PayPal para ser **ativado**, mesmo no plano
> gratuito (10 GB). O plano gratuito dos Workers e do D1 não exige cartão.
> Se preferir não cadastrar cartão, use a “Opção B” do `TUTORIAL.md` (fotos
> publicadas na pasta `public/demo`).

## 2. Rodar no computador (testes locais)

```bash
npm install
npx wrangler d1 migrations apply catalogo-db --local   # cria o banco local
npx wrangler dev                                        # http://localhost:8787
```

O `wrangler dev` usa um banco D1 e um bucket R2 **locais** (pasta `.wrangler/`),
então você pode testar sem tocar nos dados de produção.

## 3. Rotas da API

| Método | Rota | O que faz |
|---|---|---|
| GET | `/api/produtos` | Lista produtos ativos. Filtros: `?q=` (busca por nome/descrição/categoria), `?categoria=`, `?ordem=recentes\|preco_asc\|preco_desc\|nome` |
| GET | `/api/produtos?todos=1` | Lista **todos** (inclusive ocultos). Exige a chave do painel |
| GET | `/api/produtos/:id` | Um produto |
| GET | `/api/categorias` | Categorias com a quantidade de produtos |
| GET | `/api/config` | Nome da loja, WhatsApp, moeda e mensagem padrão |
| GET | `/imagens/<chave>` | Foto: procura no R2 e, se não existir, usa `public/demo` |
| GET | `/api/health` | Diagnóstico: `{ok, banco, r2}` |
| POST | `/api/produtos` | Cria produto *(exige chave)* |
| PUT | `/api/produtos/:id` | Atualiza produto *(exige chave)* |
| DELETE | `/api/produtos/:id` | Exclui produto e apaga a foto do R2 *(exige chave)* |
| POST | `/api/imagens` | Envia foto (`multipart/form-data`, campo `arquivo`) para o R2 *(exige chave)* |
| DELETE | `/api/imagens/<chave>` | Apaga uma foto do R2 *(exige chave)* |
| PUT | `/api/config` | Salva as configurações da loja *(exige chave)* |

A chave vai no cabeçalho `x-admin-token`. Se a variável `ADMIN_TOKEN` não
estiver definida no Worker, o painel fica **aberto** (útil só em testes).

## 4. Estrutura do projeto

```
catalogo-loja/
├── public/                  # arquivos do site (servidos pelo binding ASSETS)
│   ├── index.html           # catálogo (grade, busca, filtros, janela do produto)
│   ├── admin.html           # painel do administrador
│   ├── sem-foto.svg         # imagem substituta quando a foto falha/falta
│   ├── icone.svg            # ícone do site (favicon)
│   ├── css/estilos.css      # todo o design (responsivo: celular e computador)
│   ├── js/icones.js         # ícones SVG (não dependem de internet nem de emoji)
│   ├── js/catalogo.js       # lógica do catálogo público
│   ├── js/painel.js         # lógica do painel (envio de foto, edição, exclusão)
│   └── demo/                # 10 fotos dos produtos de exemplo
├── src/worker.js            # API + roteamento + entrega das imagens
├── migrations/
│   ├── 0001_init.sql        # tabelas produtos e configuracoes
│   └── 0002_produtos_demo.sql  # 10 produtos fictícios (demo = 1)
├── wrangler.jsonc           # bindings: DB (D1), IMAGENS (R2), ASSETS
├── preparar.sh              # cria D1 + R2 + migrações e grava o ID
├── preparar-tudo.sh         # instala + configura + publica
├── TUTORIAL.md              # passo a passo para leigos (celular Android)
└── VERIFICACAO.md           # o que foi testado de verdade neste projeto
```

## 5. Banco de dados

Tabela `produtos`: `id`, `nome`, `descricao`, `preco`, `categoria`, `imagem`,
`ativo` (1 mostra / 0 oculta), `demo` (1 = exemplo editável), `criado_em`,
`atualizado_em`.

Tabela `configuracoes`: `chave`/`valor` (`nome_loja`, `whatsapp`, `moeda`,
`mensagem_padrao`).

Novas migrações: crie `migrations/0003_algo.sql` e rode
`npx wrangler d1 migrations apply catalogo-db --remote`.

## 6. Segurança

- `ADMIN_TOKEN` protege criar/editar/excluir produto, enviar/apagar foto e salvar configurações.
- O token fica guardado no `localStorage` do navegador do administrador.
- Uploads: no máximo 8 MB e apenas JPG, PNG, WEBP ou GIF — o Worker confere a
  assinatura real do arquivo, não só a extensão.
- Textos são escapados no site (proteção contra HTML/script malicioso).
- Nome da foto é gerado pelo Worker (não usa o nome enviado pelo usuário).

## 7. Problemas comuns

| Sintoma | Causa provável / solução |
|---|---|
| `Database not found: catalogo-db` | O `database_id` no `wrangler.jsonc` está errado ou as migrações não foram aplicadas `--remote`. |
| Fotos somem depois de reabrir | O produto está guardando uma foto que não foi enviada ao R2. Reenvie pelo painel. |
| `Acesso não autorizado` no painel | Falta colar a chave no campo **Chave de acesso** do painel. |
| Página abre sem os produtos | As migrações não rodaram: `npx wrangler d1 migrations apply catalogo-db --remote`. |
| Erro ao criar o bucket R2 | O R2 ainda não foi ativado na conta (exige cartão/PayPal). |
