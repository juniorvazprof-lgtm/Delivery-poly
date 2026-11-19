import json,html
NOMES={'cliente':'Cliente','gerente':'Gerente','designer':'Designer','programador':'Programador','revisor':'Revisor'}
IA={'gerente','designer','programador','revisor'}
out=['<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Roteiro do apresentador</title><style>',
'body{font:13px/1.35 system-ui,sans-serif;color:#1E2333;margin:0;padding:14px}h1{font-size:20px;margin:0 0 2px}.sub{color:#475569;margin:0 0 8px}',
'table{border-collapse:collapse;width:100%}th,td{border:1px solid #CBD5E1;padding:4px 6px;vertical-align:top;text-align:left}th{background:#F1F5F9}',
'.ia{color:#1D4ED8;font-weight:700}.bot{color:#64748B;font-weight:700}.pagina{break-after:page;margin-bottom:24px}',
'@media print{@page{size:A4;margin:10mm}body{padding:0}.pagina:last-child{break-after:auto}}</style></head><body>']
for k in ['lanchonete','petshop','escola','banda']:
    c=json.load(open(f'src/data/scenarios/{k}.json'))
    out.append(f'<section class="pagina"><h1>{html.escape(c["nome"])}</h1><p class="sub">Pedido: “{html.escape(c["pedido"])}” · Legenda: <span class="ia">IA</span> pensa e decide · <span class="bot">ROTEIRO</span> segue script pronto</p><table><tr><th>#</th><th>Quem</th><th>Diga assim</th><th>Pergunte ao público</th></tr>')
    for n,e in enumerate(c['etapas'],1):
        t='ia' if e['agente'] in IA else 'bot'
        out.append(f'<tr><td>{n}</td><td><span class="{t}">{NOMES[e["agente"]]}<br>{"IA" if t=="ia" else "ROTEIRO"}</span></td><td>{html.escape(e["explicacao"])}</td><td>{html.escape(e.get("perguntaPublico",""))}</td></tr>')
    out.append('</table><p class="sub">Atalhos: Espaço pausa · ← → voltam/avançam · P modo apresentação · G gira a câmera.</p></section>')
out.append('</body></html>'); open('roteiro.html','w').write('\n'.join(out))
