#!/usr/bin/env bash
# Instala o servidor MCP deepseek-as-subagent (github.com/PsChina/deepseek-as-subagent)
# em /opt/deepseek-mcp. Idempotente: se a versão fixada já estiver instalada, sai na hora.
set -euo pipefail

REPO_URL="https://github.com/PsChina/deepseek-as-subagent.git"
PINNED_COMMIT="4144047"          # commit auditado em 2026-11-13; troque só após nova revisão
PREFIX="/opt/deepseek-mcp"
MARKER="$PREFIX/.installed-$PINNED_COMMIT"

if [ -x "$PREFIX/venv/bin/deepseek-mcp" ] && [ -f "$MARKER" ]; then
  echo "deepseek-mcp $PINNED_COMMIT já instalado"; exit 0
fi

command -v uv >/dev/null 2>&1 || pip install -q uv
mkdir -p "$PREFIX"
if [ ! -d "$PREFIX/src/.git" ]; then
  git clone -q --filter=blob:none "$REPO_URL" "$PREFIX/src"
fi
git -C "$PREFIX/src" fetch -q origin
git -C "$PREFIX/src" checkout -q "$PINNED_COMMIT"

# O pacote exige Python 3.10–3.12; o uv baixa um 3.12 se o sistema não tiver.
uv venv -q --allow-existing --python 3.12 "$PREFIX/venv"
# Dependências com hash verificado (requirements.lock do projeto) e o pacote sem deps extras.
uv pip install -q --python "$PREFIX/venv/bin/python" --require-hashes -r "$PREFIX/src/requirements.lock"
uv pip install -q --python "$PREFIX/venv/bin/python" --no-deps --no-build-isolation "$PREFIX/src"

rm -f "$PREFIX"/.installed-*
touch "$MARKER"
echo "deepseek-mcp $PINNED_COMMIT instalado em $PREFIX"
