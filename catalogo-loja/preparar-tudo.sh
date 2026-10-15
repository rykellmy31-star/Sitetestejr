#!/usr/bin/env bash
# ============================================================================
#  PREPARAR-TUDO.SH — faz tudo de uma vez
#  Execute com:   sh preparar-tudo.sh
#
#  1. Instala o programa que publica o site (wrangler)
#  2. Confere se você está conectado na sua conta Cloudflare
#  3. Cria o banco D1, o bucket R2 e grava o ID no wrangler.jsonc
#  4. Cria as tabelas e os produtos de exemplo
#  5. Publica o site e mostra o endereço
# ============================================================================

set -u

azul()    { printf '\033[36m%s\033[0m\n' "$1"; }
verde()   { printf '\033[32m%s\033[0m\n' "$1"; }
amarelo() { printf '\033[33m%s\033[0m\n' "$1"; }
erro()    { printf '\033[31m%s\033[0m\n' "$1"; }

if [ ! -f "wrangler.jsonc" ]; then
  erro "Rode este script dentro da pasta do projeto (ex.: cd ~/catalogo-loja)."
  exit 1
fi

# --------------------------------------------------------- 1) INSTALAÇÃO ----
azul "== 1 de 5: instalando o programa que publica o site =="
if [ -d "node_modules/wrangler" ]; then
  verde "Já estava instalado."
else
  npm install || { erro "Falha ao instalar. Confira a internet e tente de novo."; exit 1; }
fi

# -------------------------------------------------------------- 2) LOGIN ----
azul "== 2 de 5: conferindo se você está conectado na Cloudflare =="
if npx wrangler whoami >/dev/null 2>&1; then
  verde "Conectado. ✅"
else
  amarelo "Você ainda não entrou na conta. Abrindo a página de login..."
  npx wrangler login || {
    erro "Não foi possível entrar. Tente novamente ou use um token:"
    erro "  export CLOUDFLARE_API_TOKEN=seu_token_aqui"
    exit 1
  }
fi

# ---------------------------------------------------------- 3 e 4) SETUP ----
azul "== 3 e 4 de 5: criando banco, fotos e tabelas =="
sh preparar.sh || { erro "Algo deu errado na configuração. Leia a mensagem acima."; exit 1; }

# ------------------------------------------------------------ 5) PUBLICAR --
azul "== 5 de 5: publicando o site =="
npx wrangler deploy

echo
verde "============================================================"
verde " Pronto! Procure acima a linha que começa com https://"
verde " Ela é o endereço do seu catálogo."
verde ""
verde " Para abrir o painel, acrescente /admin no final do endereço."
verde "============================================================"
