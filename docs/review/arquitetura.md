# Revisão de arquitetura

Critérios: aderência às camadas do [ADR-002](../adr/0002-monolito-em-camadas.md), alinhamento entre spec e código, coesão dos módulos e pontos de extensão.

| ID | Achado | Gravidade | Ação | Estado |
| :--- | :--- | :---: | :--- | :--- |
| A-01 | **Risco de dependência circular entre serviços.** A rotina do notificador precisa do módulo de lista (para devolver itens vencidos à lista), que por sua vez precisa do de notificações. | Média | A rotina vive em módulo próprio, `servicos/rotinas.ts`, que depende dos dois; nenhum deles depende dela. Conferido: não há ciclo de importação em `src/`. | Tratado no desenho |
| A-02 | **Um produto tem uma única validade.** Repor um produto ativo com outro vencimento sobrescreve ou mantém a validade anterior; o estoque real pode ter dois lotes. | Média | Limitação declarada na spec (fora do escopo) e no ADR-003. A reposição de produto vencido ou esgotado exige a nova validade, o que cobre o caso mais comum. Lotes: tarefa T-46. | Backlog |
| A-03 | **Leitura com efeito colateral.** `GET /api/produtos` e `GET /api/painel` executam a rotina que pode gravar (marcar vencidos, criar notificações). | Baixa | Decisão deliberada, registrada no [ADR-005](../adr/0005-notificador-idempotente.md): é o que garante RB-04 sem depender do agendador. A gravação é idempotente. | Aceito |
| A-04 | **Revalidação da troca fora da transação.** Em `responderTroca`, a conferência de que os turnos ainda valem acontece antes de abrir a transação que inverte os responsáveis. | Baixa | Sem risco no desenho atual: o acesso ao banco é síncrono e não há `await` entre a conferência e a gravação, então nenhuma outra requisição se intercala. A separação existe para que o cancelamento do pedido inválido seja gravado mesmo com a recusa. Comentado no código. Precisa ser revisto se o banco passar a ser assíncrono (ADR-003). | Aceito |
| A-05 | **RNF-04 sem verificação automatizada.** A adequação a 360 px foi conferida por inspeção, e não por teste no CI. | Média | Inspeção registrada em [evidências](../evidencias/) (sem rolagem horizontal, sem conteúdo cortado, sem erro de console em 360 px e 1280 px). Automatizar exigiria um navegador como dependência de desenvolvimento: tarefa T-50. | Backlog |

## Conferência de aderência spec × código

- Todos os 16 RF, 7 RNF e 10 RB têm linha na [matriz de rastreabilidade](../../spec.md#9-rastreabilidade) com módulo e teste.
- Nenhuma rota contém regra de negócio: `http/rotas.ts` só valida formato e chama um serviço.
- `dominio/` não importa nada fora de si; nenhum serviço lê o relógio do sistema diretamente.
- Divergências encontradas entre a spec original e o que o domínio exigia foram resolvidas **na spec**, com registro no histórico de mudanças (RF-03 × glossário; aprovação de compras; forma da troca de turnos).
