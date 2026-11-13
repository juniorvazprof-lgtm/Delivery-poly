#!/usr/bin/env bash
# Inicia o servidor MCP do DeepSeek; instala antes (setup.sh) se ainda não estiver instalado.
# Toda saída do setup vai para stderr para não corromper o protocolo MCP (stdout).
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN=/opt/deepseek-mcp/venv/bin/deepseek-mcp
[ -x "$BIN" ] || bash "$DIR/setup.sh" >&2
export DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY:-proxy-injected}"
export DEEPSEEK_WORKSPACE="${DEEPSEEK_WORKSPACE:-$DIR}"
exec "$BIN" "$@"
