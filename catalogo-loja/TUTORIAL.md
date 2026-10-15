# 📱 TUTORIAL COMPLETO — Catálogo de Produtos na Cloudflare

**Para quem usa somente o celular Android e nunca publicou um site.**
Leia com calma, faça um passo de cada vez e não pule etapas. Cada passo diz
exatamente **o que digitar** e **o que deve aparecer na tela**.

---

## 🎁 O que você recebeu

| Arquivo / pasta | Para que serve |
|---|---|
| `public/` | O site em si: a página do catálogo (`index.html`), o painel do administrador (`admin.html`), os estilos, os scripts e **10 fotos de produtos de demonstração** na pasta `public/demo`. |
| `src/worker.js` | O “cérebro” do site: controla os produtos, as fotos e o acesso ao banco de dados. |
| `migrations/` | Os arquivos SQL que criam as tabelas do banco e inserem os **10 produtos fictícios de exemplo**. |
| `wrangler.jsonc` | O arquivo de configuração da Cloudflare (onde se cola o ID do banco). |
| `preparar.sh` | Um atalho que cria o banco, cria o espaço das fotos e grava o ID no lugar certo — tudo de uma vez. |
| `preparar-tudo.sh` | Faz o serviço completo: instala o programa, configura e publica. É o “botão único”. |
| `README.md` | Explicação técnica curta (para quem já mexe com programação). |
| `VERIFICACAO.md` | Relatório do que foi realmente testado neste projeto. |
| `capturas/` | Fotos de como o site fica pronto (celular e computador). |

> ⚠️ **Importante sobre os produtos de demonstração:** os 10 produtos que vêm
> prontos são **fictícios** e servem só para mostrar o catálogo funcionando.
> Eles aparecem no site com um selo laranja escrito **“Exemplo editável”**.
> Edite, substitua ou exclua todos eles no painel quando quiser. Nenhum preço
> desses é “informação real” da sua loja.

---

## 🧰 Antes de começar: o que você vai precisar

1. **Celular Android** com internet (Wi-Fi ou dados móveis).
2. **Uma conta gratuita na Cloudflare** — vamos criar no passo 1. É de graça.
3. **O aplicativo Termux** — é um “terminal” (janela de comandos) para Android.
   Vamos instalar no passo 2. Ele é gratuito e não pede nada além de permissão de armazenamento.
4. **O arquivo ZIP do projeto** (o mesmo pacote onde está este tutorial) — você já tem.

⏱️ Tempo estimado: **30 a 45 minutos** na primeira vez.

> 💳 **Aviso honesto sobre o cartão de crédito:** a parte do site e do banco de
> dados (Workers + D1) é **100% gratuita e não pede cartão**. Já o **R2**
> (onde as fotos enviadas pelo painel são guardadas) exige cadastrar um cartão
> ou PayPal para ser **ativado**, mesmo no plano gratuito — a Cloudflare não
> cobra nada enquanto você ficar dentro do limite (10 GB de fotos, o que dá
> milhares de imagens). Se você **não quiser** cadastrar cartão, existe um
> caminho alternativo sem cartão explicado no **Passo 12 (Opção B)**.

---

# PARTE 1 — Criar a conta e instalar as ferramentas

## Passo 1 — Criar a conta na Cloudflare (5 min)

1. Abra o navegador (Chrome) do celular.
2. Digite: **dash.cloudflare.com/sign-up**
3. Preencha **e-mail** e uma **senha** forte e toque em **Sign up**.
4. A Cloudflare envia um **e-mail de confirmação**. Abra seu e-mail e toque no
   link de confirmação.
5. Volte ao navegador, faça login e pronto: você está dentro do painel.

> Anote o e-mail e a senha em um lugar seguro. Você vai usá-los novamente.

## Passo 2 — Instalar o Termux (10 min)

> **Por que o Termux?** Publicar o site exige rodar alguns comandos. O Termux é
> o aplicativo que dá ao seu Android uma janela de comandos igual à de um
> computador. Tenha paciência: você só vai *colar* os comandos, não precisa
> entender cada palavra.

1. Abra o navegador e vá em: **f-droid.org**
2. Toque em **Download F-Droid** e instale o aplicativo (o Android vai pedir
   permissão para **instalar aplicativos desconhecidos** — permita).
3. Abra o **F-Droid**, pesquise por **Termux** e toque em **Instalar**.
   - Se preferir, o Termux também está disponível em
     **github.com/termux/termux-app/releases** (baixe o arquivo que termina em
     `universal.apk`).
   - ⚠️ A versão da Play Store está desatualizada e pode não funcionar.
4. Abra o **Termux**. Vai aparecer uma tela preta com texto. Isso é normal.

## Passo 3 — Atualizar o Termux e instalar o Node.js (10 min)

No Termux, **toque e segure** em qualquer lugar da tela para abrir **Paste**
(colar). Cole os comandos abaixo **um por vez** e toque na tecla **Enter**
(na barra do teclado do Termux) depois de cada um:

```
pkg update -y && pkg upgrade -y
```

```
pkg install nodejs-lts git unzip nano -y
```

- A primeira vez pode demorar vários minutos e baixar uns 100 MB. **Não feche o aplicativo.**
- Se aparecer uma pergunta com `[Y/n]`, aperte **Enter**.
- Se o comando `nodejs-lts` der erro dizendo que não existe, use:

```
pkg install nodejs git unzip nano -y
```

Para conferir se deu certo, digite:

```
node -v
```

Deve aparecer algo como `v20.19.0` ou `v22.x.x`. ✅

## Passo 4 — Dar acesso aos arquivos do celular (1 min)

```
termux-setup-storage
```

Vai aparecer um pedido de permissão do Android → toque em **Permitir**.

## Passo 5 — Colocar o projeto dentro do Termux (3 min)

1. Confirme que o arquivo **ZIP do projeto** está na pasta **Download** do
   celular (se você baixou pelo navegador, ele já está lá).
2. No Termux, cole e execute:

```
cp ~/storage/downloads/catalogo-loja.zip ~/
```

> Se der erro “No such file or directory”, o nome ou o lugar do arquivo é
> outro. Descubra com: `ls ~/storage/downloads/` e use o nome que aparecer.

3. Descompacte:

```
cd ~ && unzip catalogo-loja.zip
```

4. Entre na pasta do projeto e instale o programa que publica o site:

```
cd ~/catalogo-loja && npm install
```

- Vai baixar uns 35 pacotes (1 a 3 minutos).
- Se aparecer algum aviso amarelo sobre pacotes opcionais, **pode ignorar**.
- Só pode aparecer erro real se faltar internet.

## Passo 6 — Entrar na sua conta Cloudflare pelo Termux (3 min)

```
npx wrangler login
```

1. O Termux pergunta se pode abrir o navegador → responda **y** (ou toque em
   **Open** / **Abrir**).
2. O Chrome abre a página da Cloudflare → toque em **Allow** (Permitir).
3. Volte ao Termux: deve aparecer **“Successfully logged in”**. ✅

> **Se o login não funcionar**, use o caminho alternativo:
> 1. No navegador, entre em **dash.cloudflare.com** → **My Profile** (ícone de
>    pessoa) → **API Tokens** → **Create Token** → use o modelo
>    **“Edit Cloudflare Workers”** → **Continue** → **Create Token**.
> 2. Copie o código que aparece (é longo).
> 3. No Termux, cole o comando abaixo trocando `COLE_SEU_TOKEN_AQUI` pelo código:
>
> ```
> export CLOUDFLARE_API_TOKEN=COLE_SEU_TOKEN_AQUI
> ```
>
> Esse comando vale enquanto o Termux estiver aberto. Se fechar o aplicativo,
> repita a colagem antes de rodar os próximos comandos.

---

# PARTE 2 — Criar o banco de dados e o espaço das fotos

## Passo 7 — Configurar tudo com um único comando

Dentro da pasta do projeto (o prompt mostra `~/catalogo-loja`), rode:

```
sh preparar.sh
```

O que ele faz, na ordem:

1. **Cria o banco de dados D1** chamado `catalogo-db`.
2. **Copia o ID do banco** para dentro do arquivo `wrangler.jsonc`
   automaticamente (é o passo mais chato e agora é automático).
3. **Cria o espaço de fotos R2** chamado `catalogo-imagens`.
4. **Cria as tabelas** e insere os 10 produtos de exemplo.

No fim deve aparecer:

```
============================================================
 Tudo pronto! Agora publique o site com o comando:

     npx wrangler deploy

============================================================
```

> **Erro comum:** se aparecer uma mensagem pedindo para ativar o **R2** e você
> ainda não cadastrou cartão, faça assim:
> 1. No navegador: **dash.cloudflare.com** → menu (☰) → **R2 Object Storage** →
>    **Enable R2 / Start using R2** → cadastre o cartão ou PayPal (não há
>    cobrança dentro do limite gratuito).
> 2. Volte ao Termux e rode `sh preparar.sh` de novo.
> 3. Se você **não quer** cadastrar cartão, pule para o **Passo 12 – Opção B**.

Para conferir se o banco ficou certo:

```
npx wrangler d1 execute catalogo-db --remote --command "SELECT COUNT(*) AS total FROM produtos;"
```

Deve responder `total = 10`.

---

# PARTE 3 — Publicar o site

## Passo 8 — Publicar (2 min)

```
npx wrangler deploy
```

No fim, aparece uma linha assim:

```
Uploaded catalogo-loja (X sec)
Deployed catalogo-loja triggers (X sec)
  https://catalogo-loja.SEU-NOME.workers.dev
```

**Esse endereço é o seu site!** Copie, cole no navegador e veja o catálogo
funcionando com as 10 fotos de exemplo.

> 💡 **Dica:** no Termux, para copiar o endereço, toque e segure sobre o texto e
> escolha **Copy**. Depois cole na barra de endereços do Chrome.

## ⚠️ Se aparecer esta mensagem: “Este carregador ainda não suporta projetos que exigem um processo de compilação…”

**Pode ficar tranquilo: o problema NÃO é o seu projeto e nada está quebrado.**

Essa frase é do próprio painel da Cloudflare (a tela **“Editar código”**, também
chamada de *Quick Edit*). Ela aparece quando alguém tenta abrir ou enviar o
projeto **pelo navegador**, e não pelo comando no Termux.

**Por que isso acontece?** O editor de código do painel só aceita **um único
arquivo de código simples**. O nosso projeto é maior que isso:

- tem a pasta `public/` com HTML, CSS, JS, ícones e 10 fotos;
- tem vários arquivos de código no Worker;
- tem o arquivo `wrangler.jsonc` com os “bindings” (D1 para os produtos, R2
  para as fotos e assets para os arquivos do site).

Quando o painel encontra uma pasta com vários arquivos + configuração do
Wrangler, ele responde exatamente com essa mensagem — e ele mesmo já diz a
solução no final: **use `wrangler deploy`**. Ou seja, é o painel avisando que
esse caminho não serve para este tipo de projeto.

### O que fazer

1. **Feche (ou ignore) essa tela do painel.**
2. Volte para o **Termux** e rode, dentro da pasta do projeto:

```
cd ~/catalogo-loja && npx wrangler deploy
```

3. Pronto: o site é publicado e o endereço aparece na tela (veja o Passo 8).

### O que dá e o que não dá para fazer pelo painel da Cloudflare

| Dá para fazer pelo navegador (dash.cloudflare.com) | Só pelo comando no Termux |
|---|---|
| Ver métricas, acessos, erros e logs do site | **Publicar / atualizar o site** (`npx wrangler deploy`) |
| Ver os dados dos produtos (D1 → *Console*) | **Criar as tabelas** (`npx wrangler d1 migrations apply catalogo-db --remote`) |
| Ver e baixar as fotos guardadas (R2) | **Criar a senha do painel** (`npx wrangler secret put ADMIN_TOKEN`) |
| Criar o banco D1 e o bucket R2, se preferir pela tela | Publicar as fotos de um produto novo (feito pelo painel do site, sem comando) |
| Ver e copiar o endereço do site (*.workers.dev*) | — |

> 🔁 **E se eu não conseguir usar o Termux de jeito nenhum?** Existe um caminho
> alternativo: colocar o projeto no GitHub e ligar a Cloudflare nele
> (*Workers Builds*). Nesse caso, quem monta e publica o site é a própria
> Cloudflare, na nuvem, sem terminal no celular. É mais trabalhoso de montar na
> primeira vez e precisa de conta no GitHub — se quiser seguir por esse caminho,
> me peça e eu escrevo o guia específico.

> 💡 **A parte boa:** no dia a dia você **não precisa** mexer em código nem rodar
> comandos. Cadastrar, editar, trocar foto e excluir produtos é tudo pelo
> **painel do site** (`.../admin`), direto do celular. O comando
> `npx wrangler deploy` só é necessário quando **eu te enviar arquivos novos**
> do projeto — e, nesse caso, seus produtos e fotos não são apagados, porque
> ficam guardados no D1 e no R2, separados do site.

## Passo 9 — Abrir o painel do administrador

No navegador, digite o mesmo endereço acrescentando `/admin` no final:

```
https://catalogo-loja.SEU-NOME.workers.dev/admin
```

Você verá o painel com as abas **Produtos**, **Cadastrar produto** e
**Configurações da loja**.

> 🔐 **Atenção:** neste momento o painel está **aberto** — qualquer pessoa que
> descobrir o endereço poderia mexer nos produtos. O passo 11 resolve isso.
> Faça agora mesmo, antes de divulgar o site.

## Passo 10 — Configurar o nome da loja e o WhatsApp

1. No painel, toque na aba **Configurações da loja**.
2. **Nome da loja:** escreva o nome que vai aparecer no topo do site.
3. **WhatsApp:** escreva **somente números**, começando com 55 (Brasil) + DDD +
   número. Exemplo: `5573999998888`.
4. **Mensagem que o cliente envia:** já vem preenchida. Você pode usar
   `{produto}`, `{preco}`, `{categoria}`, `{link}` e `{loja}` no meio do texto.
5. Toque em **Salvar configurações** e depois em **Ver catálogo** (botão no topo)
   para conferir. Toque em **Comprar pelo WhatsApp** em qualquer produto para
   testar: o WhatsApp deve abrir com a mensagem já escrita.

## Passo 11 — Proteger o painel com uma senha (ADMIN_TOKEN)

Isso impede que estranhos alterem seus produtos.

1. No Termux, rode (troque pelo seu segredo, sem espaços nem acentos):

```
cd ~/catalogo-loja && npx wrangler secret put ADMIN_TOKEN
```

2. O Termux vai pedir o valor: **digite a sua senha** e aperte **Enter**.
   (Ela não aparece na tela enquanto você digita — é assim mesmo.)
3. Deve aparecer **“Successfully created secret”**. ✅
4. Volte ao painel no navegador, **recarregue a página** e cole essa mesma
   senha no campo **Chave de acesso (ADMIN_TOKEN)** → **Salvar chave**.
   Pronto: só quem tem a senha consegue salvar produtos.

> Se você esquecer a senha: rode o comando do passo 11 de novo com uma nova
> senha e cole a nova no painel.

## Passo 12 — Cadastrar seus produtos de verdade

1. No painel, aba **Cadastrar produto**.
2. Toque em **Foto do produto** (ou em **Tirar foto agora** para fotografar na hora).
3. Escolha a foto na galeria. **A pré-visualização aparece na tela** — confira se
   é a imagem certa.
4. Preencha **Nome**, **Preço** (ex.: `59,90`) e **Categoria** (pode escrever uma
   nova, como “Vestuário”, ou escolher uma existente).
5. Escreva a **Descrição** (material, tamanhos, prazo de entrega…).
6. Toque em **Salvar produto**.
   - A foto é enviada para o armazenamento da Cloudflare (aparece uma barrinha de
     progresso) e o produto aparece na lista e no catálogo imediatamente.
7. Repita para todos os seus produtos. Depois **exclua os 10 de exemplo**: aba
   **Produtos** → botão **Excluir** no produto de exemplo → **Sim, excluir
   definitivamente**.

### Opção B — sem cartão de crédito (somente se você não quiser cadastrar cartão)

Se você não ativou o R2, o painel vai recusar o envio de fotos. Nesse caso você
pode publicar as fotos junto com o site:

1. No app **Arquivos** do celular, crie uma pasta chamada `fotos-catalogo` e
   coloque suas fotos nela.
2. No Termux, copie as fotos para a pasta do projeto:

```
cd ~/catalogo-loja && cp ~/storage/downloads/fotos-catalogo/* public/demo/
```

> Se as fotos estiverem em outra pasta, descubra o caminho com
> `ls ~/storage/downloads/` ou `ls /sdcard/Pictures/`.

3. Publique de novo: `npx wrangler deploy`
4. No painel, ao cadastrar o produto, abra **“Opção avançada: usar uma foto já
   publicada”** e escreva o endereço da foto, por exemplo
   `/imagens/camiseta-azul.jpg` (repare: o endereço começa com `/imagens/` mesmo
   que o arquivo esteja em `public/demo/`). Salve o produto.

Assim você continua tendo fotos no catálogo, sem precisar de cartão e sem R2.
A diferença é que, a cada novo produto, você precisa copiar a foto e publicado
o site novamente.

---

# PARTE 4 — Usar o painel no dia a dia

## Trocar a foto de um produto

Aba **Produtos** → botão **Trocar foto** → escolha a nova foto → aguarde a
mensagem **“Foto do produto atualizada!”**. A foto antiga é apagada
automaticamente do armazenamento para não ocupar espaço.

## Editar nome, preço ou descrição

Aba **Produtos** → botão **Editar** → mude o que quiser → **Salvar produto**.
Para tirar a foto, use **Remover foto** antes de salvar.

## Esconder um produto sem excluir

Aba **Produtos** → **Editar** → desmarque **“Mostrar este produto no catálogo”**
→ **Salvar produto**. Ele some do site, mas continua no painel para você
reativar depois.

## Excluir um produto

Aba **Produtos** → **Excluir** → confirme em **“Sim, excluir definitivamente”**.
A foto dele também é apagada do armazenamento.

## Publicar novidades do site (quando eu te enviar arquivos novos)

```
cd ~/catalogo-loja && npx wrangler deploy
```

O comando **não apaga** seus produtos nem suas fotos: eles ficam no banco de
dados (D1) e no armazenamento (R2), separados do site.

---

# PARTE 5 — Se algo der errado

| O que aparece | O que fazer |
|---|---|
| `command not found: npx` | Você não instalou o Node.js. Rode `pkg install nodejs-lts -y` e tente de novo. |
| `No such file or directory` no `cp` do ZIP | O nome do arquivo está diferente. Veja com `ls ~/storage/downloads/` e use o nome exato. |
| `You need to be logged in` | Rode `npx wrangler login` de novo (ou cole o `export CLOUDFLARE_API_TOKEN=...`). |
| `A database with that name already exists` | Normal, o banco já foi criado antes. O `preparar.sh` continua sozinho. |
| Erro pedindo para ativar o R2 | Veja o quadro do Passo 7 (cadastrar cartão) ou use a **Opção B** do Passo 12. |
| `Este carregador ainda não suporta projetos que exigem um processo de compilação... use wrangler deploy` | Você abriu a tela **“Editar código”** do painel da Cloudflare (que só aceita um único arquivo simples). Feche essa tela e publique pelo Termux: `cd ~/catalogo-loja && npx wrangler deploy`. Veja o quadro logo antes do Passo 9. |
| `SUBSTITUA_PELO_ID_DO_SEU_BANCO_D1` ainda aparece | O `preparar.sh` não conseguiu gravar. Edite o arquivo com `nano wrangler.jsonc`, troque o texto pelo ID do banco (veja em dash.cloudflare.com → **Workers & Pages → D1**), salve com **Ctrl+O**, **Enter**, e saia com **Ctrl+X**. |
| A página abre, mas as fotos não aparecem | Publique novamente (`npx wrangler deploy`). Se o problema for só em fotos novas, refaça o envio pelo painel. |
| “Erro interno no servidor” no painel | Confira se as migrações rodaram: `cd ~/catalogo-loja && npx wrangler d1 migrations apply catalogo-db --remote`. |
| O painel diz “Acesso não autorizado” | Você criou o `ADMIN_TOKEN`: cole a senha no campo **Chave de acesso** do painel e toque em **Salvar chave**. |
| O WhatsApp não abre | Confira se o número está só com números e começa com 55. Ex.: `5573999998888`. |
| Termux fecha sozinho em celulares com pouca memória | Antes de rodar comandos longos, feche outros aplicativos. Rode `npx wrangler deploy` sozinho, sem mais nada aberto. |

---

## ✅ Checklist final (marque tudo antes de divulgar)

- [ ] O endereço `https://catalogo-loja.SEU-NOME.workers.dev` abre o catálogo com fotos.
- [ ] O endereço `.../admin` abre o painel.
- [ ] Nome da loja e WhatsApp estão corretos (aba **Configurações da loja**).
- [ ] O botão **Comprar pelo WhatsApp** abre a conversa com a mensagem pronta.
- [ ] Você conseguiu cadastrar um produto novo com foto da galeria.
- [ ] Você excluiu (ou editou) os 10 produtos de exemplo.
- [ ] A senha do painel está configurada (`ADMIN_TOKEN`) e salva no seu celular.
- [ ] Depois de atualizar a página (ou reabrir o navegador), os produtos continuam lá.

---

## 📸 Como o site fica pronto

Dentro da pasta `capturas/` do projeto você encontra as telas reais do site
testado (não são desenhos):

| Arquivo | O que mostra |
|---|---|
| `catalogo-celular.jpg` | Catálogo completo visto no celular |
| `catalogo-tela-pequena.jpg` | Catálogo em tela pequena (360 px de largura) |
| `janela-do-produto-celular.jpg` | Janela do produto com foto maior e botão do WhatsApp |
| `painel-cadastro-celular.jpg` | Painel, aba “Cadastrar produto”, com a pré-visualização da foto |
| `painel-lista-celular.jpg` | Painel, lista de produtos com os botões Editar / Trocar foto / Excluir |
| `painel-confirmar-exclusao.jpg` | Aviso de confirmação antes de excluir |
| `catalogo-computador.jpg` e `painel-computador.jpg` | As mesmas telas no computador |
| `resultado-dos-testes.txt` | Lista dos 24 testes automáticos que passaram |

---

## 💰 Quanto custa

| Serviço | Cobrança | Limite gratuito |
|---|---|---|
| Workers (o site) | grátis | 100.000 visitas por dia |
| D1 (produtos) | grátis | 5 GB de dados |
| R2 (fotos) | grátis dentro do limite | 10 GB de fotos + 1 milhão de envios/mês |

Um catálogo pequeno ou médio fica dentro do plano gratuito com folga.
Nada é cobrado sem você configurar e aprovar.
