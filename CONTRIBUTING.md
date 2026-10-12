# Como contribuir

Fluxo de trabalho da equipe. O objetivo é que a especificação, o código e os testes mudem juntos.

## Fluxo

1. **Issue.** Toda mudança começa em uma issue que cita a tarefa de [tasks.md](tasks.md) e o requisito da [spec.md](spec.md). Se o requisito ainda não existe, a issue é para escrevê-lo.
2. **Branch** a partir da `main`: `tipo/T-xx-descricao-curta`, com tipo `feat`, `fix`, `docs`, `test` ou `refactor`. Exemplo: `feat/T-26-fechamento-mensal`.
3. **Commits pequenos**, no formato `tipo(área): o que mudou (RF-xx)`. Exemplo: `feat(financas): bloqueia compra em mês fechado (RF-09, RB-08)`.
4. **Pull request** para a `main`, usando a lista de conferência abaixo. O CI precisa passar.
5. **Revisão** por pelo menos um integrante que não seja o autor. Ninguém aprova o próprio pull request.
6. **Merge por squash**, fechando a issue (`Closes #n`).

Configurem a `main` como branch protegida no GitHub: sem push direto, com CI e uma aprovação obrigatórios.

## Lista de conferência do pull request

```markdown
## O que muda
<!-- Uma ou duas frases. -->

Tarefa: T-xx · Requisitos: RF-xx, RB-xx · Closes #

## Conferência
- [ ] A spec descreve o comportamento que este PR implementa (ou foi atualizada neste PR, com linha no histórico de mudanças)
- [ ] Há teste com o identificador do requisito no nome, cobrindo o caminho permitido e o bloqueado
- [ ] A matriz de rastreabilidade (spec.md §9) aponta para o código e o teste
- [ ] A regra está na camada de serviços ou de domínio, e não na rota nem só na interface
- [ ] `npm test` e `npm run typecheck` passam
- [ ] Decisão estrutural nova? Há um ADR em docs/adr/
- [ ] tasks.md atualizado
```

## Mudança de requisito

Um requisito nunca muda só no código. A ordem é: (1) alterar a spec, mantendo o identificador e acrescentando uma linha ao histórico de mudanças; (2) ajustar ou criar o teste; (3) alterar o código. Os três vão no mesmo pull request. Divergência entre spec e código é tratada como defeito.

## Trabalho com agente de codificação

1. O agente recebe **uma tarefa** de `tasks.md` por vez, com o texto EARS do requisito e as regras de negócio citadas.
2. Pede-se primeiro o teste (com o identificador no nome), depois a implementação.
3. Quem dirige o agente lê o diff inteiro, roda `npm test` e confere a linha da matriz de rastreabilidade antes de abrir o pull request.
4. O que o agente gera passa pela mesma revisão humana que qualquer outro código. Quem abre o pull request responde por ele.

## Novo ADR

Copie o formato dos existentes em `docs/adr/` (Contexto, Decisão, Consequências), numere em sequência e referencie-o no [plan.md](plan.md). Um ADR aceito não é reescrito: se a decisão mudar, cria-se outro que o substitui.
