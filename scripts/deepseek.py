"""Chamada ao DeepSeek com prefixo fixo, JSON estrito, limite de tokens e cache.

Uso em código: from deepseek import ask; ask(tarefa, entrada) -> (dict, tokens)
A chave é injetada pelo proxy; DEEPSEEK_API_KEY local pode ser qualquer valor.
"""
import json, os, sys, urllib.request, yaml
sys.path.insert(0, os.path.dirname(__file__)); import cache
CFG = yaml.safe_load(open(os.path.join(os.path.dirname(__file__), "..", "config.yaml")))["deepseek"]
PREFIXO = ("Você é um assistente de pesquisa em astrofísica. Responda SOMENTE com um objeto JSON "
           "válido (RFC 8259), sem texto fora do JSON, sem markdown, sem código. Seja conciso. "
           "Nunca invente referências: use apenas os IDs fornecidos na entrada.")
def ask(tarefa, entrada, max_tokens=None):
    msgs = [{"role": "system", "content": PREFIXO},
            {"role": "user", "content": f"TAREFA:\n{tarefa}\n\nENTRADA:\n{entrada}"}]
    body = {"model": CFG["model"], "messages": msgs, "temperature": CFG["temperature"],
            "max_tokens": max_tokens or CFG["max_tokens"], "response_format": {"type": "json_object"}}
    k = cache.key("deepseek", body)
    if (hit := cache.get(k)) is not None: return hit["json"], 0
    req = urllib.request.Request(CFG["url"], json.dumps(body).encode(), {
        "Authorization": f"Bearer {os.environ.get('DEEPSEEK_API_KEY', 'proxy-injected')}",
        "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r: resp = json.load(r)
    out = json.loads(resp["choices"][0]["message"]["content"])
    tok = resp.get("usage", {}).get("total_tokens", 0)
    cache.put(k, {"json": out, "tokens": tok})
    return out, tok
if __name__ == "__main__":
    print(json.dumps(ask(sys.argv[1], sys.stdin.read() if len(sys.argv) < 3 else sys.argv[2]), ensure_ascii=False))
