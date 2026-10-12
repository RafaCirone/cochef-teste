# Tarefas — CoChef

Tarefas atômicas derivadas da [spec.md](spec.md) e do [plan.md](plan.md). Cada tarefa cabe em uma branch e um pull request, cita o requisito que atende e só é marcada como concluída quando o teste correspondente passa.

**Convenções:** branch `tipo/T-xx-descricao-curta` (por exemplo, `feat/T-12-baixa-de-estoque`); o pull request cita a tarefa e o requisito; fluxo completo em [CONTRIBUTING.md](CONTRIBUTING.md).

## Fase 0 — Fundação

| ID | Tarefa | Requisitos | Artefatos | Pronto quando | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| T-01 | Criar estrutura do projeto, scripts e configuração do TypeScript | ADR-001 | `package.json`, `tsconfig.json` | `npm run typecheck` passa | ✅ |
| T-02 | Definir o esquema do banco com restrições e índices | RNF-05, ADR-003 | `src/db.ts` | Banco sobe do zero; restrições recusam dados inválidos | ✅ |
| T-03 | Criar relógio injetável e operações de data | RF-03 | `src/relogio.ts`, `src/dominio/datas.ts` | Testes de datas (bissexto, virada de ano) | ✅ |
| T-04 | Montar o pipeline HTTP: roteador, corpo JSON com limite, erros padronizados, arquivos estáticos | RNF-02 | `src/http/` | Entradas malformadas devolvem 4xx, nunca 500 | ✅ |
| T-05 | Validação de entrada na fronteira | RNF-02 | `src/validacao.ts` | Tipos, limites e datas inválidas são recusados | ✅ |
| T-06 | Configurar integração contínua | — | `.github/workflows/ci.yml` | Pull request roda tipos e testes | ✅ |

## Fase 1 — Contas e perfis

| ID | Tarefa | Requisitos | Artefatos | Pronto quando | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| T-07 | Hash de senha com scrypt e salt | RNF-02, ADR-004 | `src/seguranca/senha.ts` | Mesma senha gera hashes diferentes; hash adulterado é recusado | ✅ |
| T-08 | Emissão e verificação de JWT HS256 | RNF-02, ADR-004 | `src/seguranca/token.ts` | Token expirado, adulterado ou `alg: none` é recusado | ✅ |
| T-09 | Cadastro criando república (admin) ou entrando por convite (morador) | RF-13 | `src/servicos/auth.ts` | Perfis corretos; e-mail único; convite inválido recusado | ✅ |
| T-10 | Login com resposta única para qualquer falha e limite de tentativas | RNF-02 | `auth.ts`, `http/app.ts` | Senha errada e e-mail inexistente são indistinguíveis; 429 após o limite | ✅ |
| T-11 | Autenticação por requisição com perfil relido do banco; isolamento por república | RNF-02, RNF-06 | `auth.ts`, `contexto.ts` | Rotas privadas dão 401 sem token; dados de outra casa dão 404 | ✅ |

## Fase 2 — Estoque e lista de compras

| ID | Tarefa | Requisitos | Artefatos | Pronto quando | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| T-12 | Cadastro de produto com classificação e dono | RF-01, RB-01 | `servicos/estoque.ts` | Item individual fica com quem cadastrou; vencido é recusado | ✅ |
| T-13 | Baixa de estoque com histórico e estado *Esgotado* | RF-02 | `estoque.ts` | Quantidade decrementa; excesso é recusado | ✅ |
| T-14 | Bloqueio de movimentação de item individual alheio | RF-07, RB-01 | `estoque.ts` | 403 com mensagem de propriedade, inclusive para admin | ✅ |
| T-15 | Classificação de validade (OK, crítica, vencida) | RF-03, RB-04 | `dominio/validade.ts` | Limites: 4 dias OK, 3 dias crítica, ontem vencida | ✅ |
| T-16 | Rotina do notificador: vencidos, validade crítica, lembrete de turno | RF-03, RB-04, RF-15, ADR-005 | `servicos/rotinas.ts` | Idempotente: rodar duas vezes não duplica avisos | ✅ |
| T-17 | Sugestão automática na lista ao atingir o mínimo | RF-04 | `servicos/lista.ts`, `estoque.ts` | Entra uma única vez; individual nunca entra | ✅ |
| T-18 | Reposição com baixa da sugestão pendente | RF-14 | `estoque.ts`, `lista.ts` | Repor acima do mínimo marca a sugestão como comprada | ✅ |
| T-19 | Lista de compras manual com permissões de remoção | RF-16 | `lista.ts` | Só o autor ou o admin remove | ✅ |
| T-20 | Painel com destaque de validade crítica | RF-03 | `servicos/painel.ts` | Painel lista só itens críticos ativos | ✅ |

## Fase 3 — Finanças

| ID | Tarefa | Requisitos | Artefatos | Pronto quando | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| T-21 | Rateio em centavos com resíduo para o pagador | RB-02, RB-05 | `dominio/rateio.ts` | Soma das cotas = valor, para qualquer valor e tamanho de casa | ✅ |
| T-22 | Registro de compra: efetiva (admin) ou pendente (morador) | RF-05, RF-08 | `servicos/financas.ts` | Compra de morador não altera saldos | ✅ |
| T-23 | Aprovação e rejeição com motivo | RF-08 | `financas.ts` | Só admin decide; não decide duas vezes | ✅ |
| T-24 | Saldo líquido derivado dos lançamentos | RF-05, RB-03 | `financas.ts` | Saldos da casa somam zero; pagamento abate dívida antes de gerar crédito | ✅ |
| T-25 | Simplificação de dívidas ("quem deve para quem") | RB-03 | `dominio/acerto.ts` | No máximo n−1 transferências; zera todos os saldos | ✅ |
| T-26 | Fechamento mensal com bloqueio do período | RF-09, RB-08 | `financas.ts` | Mês fechado recusa compras; pendências impedem o fechamento | ✅ |
| T-27 | Confirmação de acerto por credor ou admin | RF-10, RB-09 | `financas.ts` | Devedor não confirma; saldo zera após o pagamento | ✅ |
| T-28 | Trilha de auditoria das ações financeiras e administrativas | RNF-07 | `contexto.ts` | Aprovação e fechamento aparecem na auditoria | ✅ |

## Fase 4 — Escala e moradores

| ID | Tarefa | Requisitos | Artefatos | Pronto quando | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| T-29 | Rodízio com continuidade | RF-11 | `dominio/escala.ts` | Continua após o último responsável | ✅ |
| T-30 | Geração da escala preservando turnos existentes | RF-11 | `servicos/escala.ts` | Gerar de novo não duplica; limpeza e refeição do dia com pessoas diferentes | ✅ |
| T-31 | Conclusão de turno | RF-15 | `escala.ts` | Só o responsável, só a partir do dia | ✅ |
| T-32 | Pedido, aceite, recusa e cancelamento de troca | RF-06, RB-10 | `escala.ts` | Calendário só muda com o aceite; troca vencida é cancelada | ✅ |
| T-33 | Promoção, rebaixamento e desativação de moradores | RF-12, RB-06, RB-07 | `servicos/republica.ts` | Último admin protegido; saldo em aberto impede a saída | ✅ |
| T-34 | Código de convite regenerável | RF-13 | `republica.ts` | Código antigo deixa de valer | ✅ |

## Fase 5 — Interface

| ID | Tarefa | Requisitos | Artefatos | Pronto quando | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| T-35 | Entrada: login, criar república, entrar com convite | RF-13 | `public/app.js` | Os três caminhos funcionam | ✅ |
| T-36 | Painel, estoque e lista de compras | RF-01 a RF-04, RF-14, RF-16 | `public/` | Ações indisponíveis não aparecem (e o servidor as recusa) | ✅ |
| T-37 | Finanças: saldos, compras, aprovação, fechamento, acertos | RF-05, RF-08 a RF-10 | `public/` | Ações de admin só aparecem para admin | ✅ |
| T-38 | Escala, trocas, casa e avisos | RF-06, RF-11, RF-12, RF-15 | `public/` | Fluxo de troca completo pela interface | ✅ |
| T-39 | Layout mobile-first a partir de 360 px, com tema claro e escuro | RNF-04 | `public/estilo.css` | Sem rolagem horizontal nem sobreposição em 360 px | ✅ |

## Fase 6 — Qualidade e documentação

| ID | Tarefa | Requisitos | Artefatos | Pronto quando | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| T-40 | Teste de desempenho das consultas | RNF-01 | `tests/estoque.test.ts` | Consultas abaixo de 1,5 s com 2.000 produtos e 500 compras | ✅ |
| T-41 | Cabeçalhos de segurança, CSP e proteção contra travessia de diretório | RNF-02 | `http/app.ts` | Teste de cabeçalhos e de `/../` | ✅ |
| T-42 | Logs estruturados, identificador de requisição e `/saude` | RNF-03 | `http/app.ts`, `servidor.ts` | Uma linha JSON por requisição | ✅ |
| T-43 | Revisão multidimensional e correção dos achados | — | `docs/review/` | Cada achado tem ação e estado | ✅ |
| T-44 | Dados de demonstração | — | `scripts/seed.ts` | `npm run seed` cria uma casa navegável | ✅ |
| T-45 | Matriz de rastreabilidade e evidências de teste | — | `spec.md` §9, `docs/testes.md` | Todo RF, RNF e RB tem linha na matriz | ✅ |

## Próximas tarefas (backlog técnico)

| ID | Tarefa | Origem |
| :--- | :--- | :--- |
| T-46 | Lotes por produto, cada um com sua validade | US-16; revisão de arquitetura A-02 |
| T-47 | Envio de avisos por push ou e-mail | US-17 |
| T-48 | Recuperação de senha e encerramento de sessão no servidor | Revisão de segurança S-06 |
| T-49 | Métricas agregadas (latência p95, taxa de erro) e medição de disponibilidade | Revisão de observabilidade O-04 |
| T-50 | Teste automatizado de interface em 360 px no CI | Revisão de arquitetura A-05 |
