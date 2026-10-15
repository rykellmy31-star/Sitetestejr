#!/usr/bin/env bash
# ============================================================================
#  PREPARAR.SH — configura tudo na Cloudflare antes de publicar
#  Execute com:   sh preparar.sh
#
#  O que este script faz, na ordem:
#    1. Cria o banco de dados D1 chamado "catalogo-db"
#    2. Copia o ID do banco para o arquivo wrangler.jsonc (automaticamente)
#    3. Cria o bucket R2 chamado "catalogo-imagens"
#    4. Aplica as migrações (criação das tabelas e produtos de exemplo)
#
#  Se algo já existir, o script apenas avisa e continua.
# ============================================================================

set -u

NOME_BANCO="catalogo-db"
NOME_BUCKET="catalogo-imagens"
ARQUIVO_CONFIG="wrangler.jsonc"

azul()  { printf '\033[36m%s\033[0m\n' "$1"; }
verde() { printf '\033[32m%s\033[0m\n' "$1"; }
amarelo() { printf '\033[33m%s\033[0m\n' "$1"; }
erro()  { printf '\033[31m%s\033[0m\n' "$1"; }

if [ ! -f "$ARQUIVO_CONFIG" ]; then
  erro "Não encontrei o arquivo $ARQUIVO_CONFIG. Rode este script dentro da pasta do projeto."
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  erro "O Node.js não está instalado. Rode antes:  pkg install nodejs-lts"
  exit 1
fi

# --------------------------------------------------------------- 1) BANCO ---
azul "== Passo 1 de 4: criando (ou verificando) o banco de dados D1 =="
SAIDA_CRIACAO="$(npx wrangler d1 create "$NOME_BANCO" 2>&1 || true)"
printf '%s\n' "$SAIDA_CRIACAO"

ID_BANCO="$(printf '%s' "$SAIDA_CRIACAO" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"

if [ -z "$ID_BANCO" ]; then
  amarelo "O banco pode já existir. Tentando descobrir o ID pela lista de bancos..."
  LISTA="$(npx wrangler d1 list --json 2>/dev/null || true)"
  ID_BANCO="$(printf '%s' "$LISTA" | tr ',' '\n' | grep -A0 -B0 'uuid\|database_id' | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
fi

while [ -z "$ID_BANCO" ]; do
  amarelo "Não consegui descobrir o ID automaticamente."
  printf 'Cole aqui o ID do banco %s (aparece no painel da Cloudflare em Workers e Pages > D1):\n> ' "$NOME_BANCO"
  read -r ID_BANCO
  ID_BANCO="$(printf '%s' "$ID_BANCO" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
done

verde "ID do banco encontrado: $ID_BANCO"

# --------------------------------------------- 2) CONFIGURAR WRANGLER.JSONC -
azul "== Passo 2 de 4: gravando o ID no arquivo $ARQUIVO_CONFIG =="
if grep -q 'SUBSTITUA_PELO_ID_DO_SEU_BANCO_D1' "$ARQUIVO_CONFIG"; then
  cp "$ARQUIVO_CONFIG" "$ARQUIVO_CONFIG.backup"
  sed "s/SUBSTITUA_PELO_ID_DO_SEU_BANCO_D1/$ID_BANCO/" "$ARQUIVO_CONFIG.backup" > "$ARQUIVO_CONFIG"
  verde "Pronto! O arquivo foi atualizado (cópia de segurança: $ARQUIVO_CONFIG.backup)."
else
  amarelo "O arquivo já estava configurado. Nada foi alterado."
fi

# ---------------------------------------------------------------- 3) BUCKET -
azul "== Passo 3 de 4: criando (ou verificando) o bucket R2 das fotos =="
SAIDA_BUCKET="$(npx wrangler r2 bucket create "$NOME_BUCKET" 2>&1 || true)"
printf '%s\n' "$SAIDA_BUCKET"
case "$SAIDA_BUCKET" in
  *"already exists"*|*"already own"*) amarelo "O bucket já existia. Continuando." ;;
esac

# ------------------------------------------------------------- 4) MIGRAÇÕES -
azul "== Passo 4 de 4: criando as tabelas no banco (migrações) =="
npx wrangler d1 migrations apply "$NOME_BANCO" --remote

echo
verde "============================================================"
verde " Tudo pronto! Agora publique o site com o comando:"
verde ""
verde "     npx wrangler deploy"
verde ""
verde "============================================================"
