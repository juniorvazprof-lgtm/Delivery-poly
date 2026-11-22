# P15 — Confiabilidade de detecção de períodos TESS vs. magnitude (T = 12–18)

**Pergunta:** a partir de que magnitude TESS a recuperação de períodos deixa de ser confiável,
como isso depende de amplitude e período, e qual é a taxa de falsos positivos?

**Desenho (definido pelo orquestrador):**
1. Curvas reais de FFI (HLSP no MAST) de estrelas *não variáveis* em T = 12–18, em bins de 0,5 mag.
   Elas fornecem ruído real (inclusive sistemáticas de 13,7 d e de luz espalhada).
2. Injeção de senoides com P ∈ [0,1; 13] d (log-uniforme), A ∈ [0,5; 50] ppt (log-uniforme).
3. Recuperação com Lomb–Scargle (astropy); acerto se |P_rec − P_inj|/P_inj < 1%;
   registrar separadamente aliases (P/2, 2P).
4. Falsos positivos: mesmas curvas sem injeção; pico com FAP < 1% conta como detecção espúria.
5. Saída: completude(T, A), FPR(T), magnitude T₅₀ onde a completude cai para 50% em cada amplitude.

**Verificação:** tudo numérico, semente fixa, reprodutível. Teste de sanidade: em ruído branco
gaussiano puro, a completude deve seguir a previsão analítica de SNR.
