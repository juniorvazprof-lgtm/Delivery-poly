"""Cache SQLite chave->valor (cache/cache.sqlite). Nunca repetir chamada idêntica."""
import hashlib, json, os, sqlite3
_DB = os.path.join(os.path.dirname(__file__), "..", "cache", "cache.sqlite")
os.makedirs(os.path.dirname(_DB), exist_ok=True)
_c = sqlite3.connect(_DB)
_c.execute("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)")
def key(*parts): return hashlib.sha256(json.dumps(parts, sort_keys=True).encode()).hexdigest()
def get(k):
    r = _c.execute("SELECT v FROM kv WHERE k=?", (k,)).fetchone()
    return json.loads(r[0]) if r else None
def put(k, v):
    _c.execute("INSERT OR REPLACE INTO kv VALUES (?,?)", (k, json.dumps(v, ensure_ascii=False))); _c.commit()
