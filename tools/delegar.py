#!/usr/bin/env python3
"""Delega uma instrução a DeepSeek, Kimi (Moonshot) ou OpenRouter.

Uso: python3 tools/delegar.py [--provider deepseek|kimi|openrouter] "instrução"
Chave lida de DEEPSEEK_API_KEY, MOONSHOT_API_KEY ou OPENROUTER_API_KEY.
"""
import argparse, json, os, sys, urllib.request

PROVIDERS = {
    "deepseek": ("https://api.deepseek.com/chat/completions", "DEEPSEEK_API_KEY", "deepseek-chat"),
    "kimi": ("https://api.moonshot.ai/v1/chat/completions", "MOONSHOT_API_KEY", "kimi-latest"),
    "openrouter": ("https://openrouter.ai/api/v1/chat/completions", "OPENROUTER_API_KEY", "deepseek/deepseek-chat"),
}

p = argparse.ArgumentParser()
p.add_argument("--provider", default=os.environ.get("DELEGAR_PROVIDER", "deepseek"), choices=PROVIDERS)
p.add_argument("--model")
p.add_argument("instrucao", nargs="?")
a = p.parse_args()
url, key_var, model = PROVIDERS[a.provider]
key = os.environ.get(key_var) or sys.exit(f"Defina {key_var}")
prompt = a.instrucao or sys.stdin.read()
body = json.dumps({"model": a.model or os.environ.get("DELEGAR_MODEL", model),
                   "messages": [{"role": "user", "content": prompt}]}).encode()
req = urllib.request.Request(url, body, {"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
with urllib.request.urlopen(req, timeout=300) as r:
    print(json.load(r)["choices"][0]["message"]["content"])
