import os, sys, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(__file__)); import cache
NS = {"a": "http://www.w3.org/2005/Atom"}
def arxiv(q, n=40):
    url = "https://export.arxiv.org/api/query?" + urllib.parse.urlencode({"search_query": q, "max_results": n, "sortBy": "relevance"})
    k = cache.key("arxiv", url)
    if (hit := cache.get(k)) is not None: return hit
    time.sleep(3)
    root = ET.fromstring(urllib.request.urlopen(url, timeout=60).read()); out = []
    for e in root.findall("a:entry", NS):
        out.append({"id": e.find("a:id", NS).text.split("/abs/")[-1].rsplit("v", 1)[0],
                    "ano": int(e.find("a:published", NS).text[:4]),
                    "titulo": " ".join(e.find("a:title", NS).text.split()),
                    "resumo": " ".join(e.find("a:summary", NS).text.split())})
    cache.put(k, out); return out
