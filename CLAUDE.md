# Regras de delegação: Claude orquestra, DeepSeek executa

O servidor MCP `deepseek` (deepseek-as-subagent) dá ao DeepSeek V4.1 Flash um ciclo de agente
próprio (ler/editar arquivos, rodar comandos) dentro deste repositório.
Ferramentas principais: `delegate_to_deepseek` (pode editar e rodar comandos) e
`delegate_to_deepseek_readonly` (só lê/busca). Use sempre `model="flash"`.

## Divisão de papéis
**Claude (você) fica com:**
- Planejamento, decisões de arquitetura e de design.
- Revisão de TODO código vindo do DeepSeek (`git diff` + rodar testes) antes de aceitar ou commitar.
- Correção de bugs difíceis, problemas de concorrência/segurança e qualquer coisa sutil.

**DeepSeek fica com:**
- Boilerplate e código repetitivo.
- Dados de jogos: fases, itens, diálogos, tabelas de balanceamento.
- Escrever testes.
- Refatorações repetitivas (renomear, padronizar, mover em massa).
- Ler e resumir arquivos grandes (use a versão `_readonly`).
- Traduções.

## Antes de delegar
Escreva uma especificação curta e objetiva no `task`:
1. Objetivo (1–2 frases).
2. Arquivos que pode tocar (e os que não pode).
3. Critério de pronto (ex.: "`npm test` passa", "JSON válido no schema X").
4. Restrições (estilo, sem novas dependências etc.).

## Privacidade — obrigatório
Os dados enviados ao DeepSeek vão para servidores na China. **Nunca** envie nem peça para ele ler:
- arquivos `.env*`, chaves, tokens, senhas, certificados (`*.pem`, `*.key`, `id_*`);
- dados pessoais (nomes reais, e-mails, telefones, documentos, endereços de usuários).
Se a tarefa exigir esses arquivos, faça você mesmo. Na especificação, liste-os como proibidos.

## Ao fim de cada tarefa
Informe ao usuário:
- O que foi delegado (quantas chamadas, quais subtarefas) vs. feito por você.
- Estimativa de tokens consumidos pelo DeepSeek (use o relatório de uso devolvido pela ferramenta,
  se houver; senão estime ~4 caracteres/token de entrada+saída) e custo aproximado em US$
  pelos preços atuais do DeepSeek V4.1 Flash.
