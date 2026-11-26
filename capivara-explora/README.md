# 🦫 Capivara Explora

Web app 3D (Three.js, mobile-first, tela vertical) em que uma capivara controlada por IA explora um mundo low poly,
aprende com as consequências das próprias ações e mostra o que está pensando.

## Como rodar
Arquivos estáticos, sem build. Sirva a pasta com qualquer servidor HTTP:

```bash
cd capivara-explora && python3 -m http.server 8000
# abra http://localhost:8000 (ou o IP da máquina no celular)
```

## Cérebro
- ⚙️ → **DeepSeek** (padrão, modelo `deepseek-flash`), **Gemini** ou **Offline**. Cada um guarda sua própria chave no localStorage.
- Gemini: modelo padrão `gemini-2.5-flash`.
- **Offline**: ações aleatórias coerentes com os status e frases prontas — para testar sem gastar.

O loop de IA está em `app.js` (seção 5e `aiLoop`): percepção → prompt → DeepSeek ou Gemini (timeout 10 s, fallback offline)
→ validação → execução com efeitos ocultos → memória. Uma chamada por vez, intervalo mínimo de 4 s.
