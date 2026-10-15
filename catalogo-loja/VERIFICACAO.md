# ✅ Relatório de verificação (o que foi realmente testado)

Este documento é um registro honesto do que foi executado durante a montagem
deste projeto. Nada aqui foi declarado como “testado” sem ter sido rodado.

Ferramentas usadas nos testes: **Node.js v20.20.2**, **Wrangler 4.86.0**,
**Chrome headless (Playwright)** — o mesmo motor de navegador do Chrome/Android.

---

## 1. Ambiente dos testes

| O que foi usado | Como |
|---|---|
| Servidor do site | `npx wrangler dev --ip 0.0.0.0 --port 8788 --local` |
| Banco de dados | D1 **local** (mesmo código SQL das migrações reais) |
| Fotos | R2 **local** (simulador do Wrangler, igual em comportamento) |
| Navegador | Chrome headless simulado como **celular Android 390×844 (tótil)** e como **computador 1440×900** |

> ⚠️ **O que NÃO foi feito:** não publiquei o projeto na sua conta da Cloudflare
> (não tenho acesso a ela). O que foi validado para publicação foi
> `npx wrangler deploy --dry-run`, que monta o pacote exatamente como na
> publicação real e confirma os bindings `DB` (D1), `IMAGENS` (R2) e `ASSETS`
> (arquivos do site) — 21 arquivos do site enviados, sem erros.
> Os passos reais de publicar (criar D1, criar bucket, aplicar migrações
> `--remote`) estão documentados no `TUTORIAL.md`.

## 2. Testes de navegador (24 verificações — todas passaram)

Executados em um catálogo real carregado no navegador, clicando nos botões como
um cliente faria:

| # | Verificação | Resultado |
|---|---|---|
| 1 | Catálogo abre no celular com 10 cartões | ✅ |
| 2 | Todas as 10 fotos carregam | ✅ 10/10 |
| 3 | Produtos de exemplo marcados com o selo “Exemplo editável” | ✅ 10 selos |
| 4 | Grade do celular com 2 colunas | ✅ |
| 5 | Pesquisa por nome (“fone”) filtra corretamente | ✅ 1 resultado |
| 6 | Mensagem de “nenhum produto encontrado” aparece | ✅ |
| 7 | Filtro por categoria (Acessórios) | ✅ 2 produtos |
| 8 | Ordenação por menor preço | ✅ R$ 45,00 primeiro |
| 9 | Janela do produto abre com foto maior, preço, descrição e botão de WhatsApp | ✅ |
| 10 | Pré-visualização da foto antes de salvar | ✅ (imagem local `blob:`) |
| 11 | Produto salvo aparece na lista do painel | ✅ |
| 12 | Produto novo aparece no catálogo público | ✅ |
| 13 | Foto do produto novo é servida pelo armazenamento (`/imagens/produtos/...`) | ✅ |
| 14 | Depois de **recarregar a página**, produto e foto continuam salvos | ✅ foto responde 200 |
| 15 | Exclusão pede confirmação antes de apagar | ✅ |
| 16 | Produto excluído sai da lista do painel | ✅ |
| 17 | Produto excluído sai do catálogo público | ✅ |
| 18 | Foto do produto excluído é apagada do armazenamento | ✅ responde 404 |
| 19 | “Trocar foto” direto pela lista do painel | ✅ |
| 20 | Nova foto guardada no armazenamento | ✅ |
| 21 | Opção avançada (foto já publicada, sem envio) | ✅ |
| 22 | Grade responsiva: 4 colunas no computador | ✅ |
| 23 | Foto com erro é trocada pela imagem substituta | ✅ site não quebra |
| 24 | Nenhum erro de JavaScript no console | ✅ |

Os resultados crus estão em `capturas/resultado-dos-testes.txt` e as telas em
`capturas/*.jpg`.

## 3. Testes da API (executados com `curl`)

| Teste | Resultado |
|---|---|
| `GET /api/health` → `{ok:true, banco:true, r2:true}` | ✅ |
| Listagem de produtos (10 itens, campos completos) | ✅ |
| Filtro por categoria e busca por texto (com acento) | ✅ |
| Ordenação por preço crescente | ✅ |
| Upload de foto para o R2 (`POST /api/imagens`) | ✅ devolve `/imagens/produtos/...` |
| Foto enviada é entregue de volta pelo Worker | ✅ `image/jpeg` |
| Criar produto com preço em formato brasileiro (`1.234,50`) → `1234.5` | ✅ |
| Editar produto / ocultar produto (sai do catálogo público) | ✅ |
| Painel enxerga produtos ocultos (`?todos=1`) | ✅ 11 itens |
| Excluir produto e **apagar a foto do R2** | ✅ foto passa a responder 404 |
| Excluir produto de exemplo: a foto de demonstração continua disponível | ✅ |
| Validações: nome vazio, preço inválido, preço negativo, endereço de imagem suspeito | ✅ todas bloqueadas |
| Upload de arquivo que não é imagem (mesmo com extensão .jpg) | ✅ recusado |
| Foto inexistente e rota desconhecida | ✅ 404 |
| **Com `ADMIN_TOKEN` definido:** upload/criar/editar/excluir/salvar configurações **sem** a chave → 401 | ✅ |
| **Com chave correta** → tudo funciona (201/200) | ✅ |
| `GET /api/config` informa `painel_protegido: true` quando há chave | ✅ |
| Salvar configurações (nome da loja, WhatsApp formatado só com números) | ✅ |
| `/admin` abre o painel; `/`, `/css/estilos.css`, `/js/*.js`, `/imagens/*.jpg` respondem 200 | ✅ |

## 4. Testes do script de configuração (`preparar.sh`)

O script foi executado com um “Wrangler de mentira” (simulando as respostas da
Cloudflare) para confirmar que ele:

1. captura o ID do banco D1 na saída do comando; ✅
2. grava o ID no lugar certo do `wrangler.jsonc` (criando um backup do arquivo); ✅
3. segue em frente quando o banco/bucket já existe; ✅
4. aplica as migrações no fim. ✅

Depois disso, o `wrangler.jsonc` **com o ID preenchido** passou no
`wrangler deploy --dry-run` sem erros, confirmando que o formato da
configuração está correto.

## 5. Verificação das imagens

- 10 fotos de produtos fictícios geradas para este projeto, **arquivos reais
  dentro do pacote** (`public/demo/`), cada uma com 1254×1254 px (quadradas,
  proporção consistente) e entre 48 KB e 177 KB.
- As fotos **não dependem de nenhum site externo** e não usam endereços
  inventados: o Worker procura no R2 e, se não achar, entrega o arquivo da
  pasta `public/demo`.
- Existe uma imagem substituta (`public/sem-foto.svg`) usada quando um produto
  fica sem foto ou quando a foto falha ao carregar — testado e aprovado.
- Ícone do site: `public/icone.svg`. Os ícones da interface são SVG escritos no
  projeto (não dependem de fonte de emoji nem de internet).

## 6. Limitações conhecidas (transparência)

1. **Publicação real na Cloudflare não foi executada** por falta de acesso a
   uma conta Cloudflare. O pacote de publicação (`--dry-run`) foi validado.
2. **O R2 exige cartão/PayPal cadastrado para ser ativado**, mesmo no plano
   gratuito (não há cobrança dentro do limite de 10 GB). Quem não quiser
   cadastrar cartão pode usar a “Opção B” do `TUTORIAL.md` (fotos publicadas
   junto com o site, cadastradas pelo campo “foto já publicada” do painel).
3. O painel **não tem tela de login separada**: a proteção é pelo
   `ADMIN_TOKEN` (cabeçalho `x-admin-token`), guardado no navegador do
   administrador. Sem definir o `ADMIN_TOKEN`, o painel fica aberto — o painel
   avisa isso em letras claras na tela.
4. Não existe login multiusuário, nem controle de estoque, nem carrinho de
   compras: o objetivo é um **catálogo com pedido direto pelo WhatsApp**.
