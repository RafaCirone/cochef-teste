# ADR-005 — Notificador como rotina idempotente, agendada e sob demanda

- **Estado:** aceito · **Data:** 11/10/2026

## Contexto

O ator "Sistema / Notificador Automatizado" precisa, sem ação de ninguém: marcar produtos vencidos (RB-04), avisar sobre validade crítica (RF-03) e lembrar turnos do dia (RF-15). Tudo isso depende da passagem do tempo, e não de um evento do usuário.

A solução óbvia é uma tarefa agendada. Mas, se a regra RB-04 depender só dela, existe uma janela em que um produto já vencido ainda aparece como consumível: basta o servidor ter ficado desligado à meia-noite ou o agendamento atrasar. Uma regra de negócio não pode depender de um temporizador ter disparado.

Alternativas: (a) só tarefa agendada; (b) calcular tudo na leitura, sem gravar estado; (c) rotina idempotente chamada pelos dois caminhos.

## Decisão

Uma única função, `executarRotinas(república)`, que:

- é **idempotente**: cada notificação tem uma chave única por ocorrência (`critico:<produto>:<validade>`), gravada com `INSERT OR IGNORE`; rodar de novo não repete nada;
- roda **por agendamento**, na subida do servidor e a cada hora, para todas as repúblicas;
- roda também **sob demanda**, antes de toda consulta e de toda baixa de estoque da república em questão.

O estado *Vencido* é gravado (e não apenas calculado), porque dispara efeitos: notificação e retorno do item coletivo à lista de compras.

## Consequências

**Positivas**
- RB-04 vale sempre, mesmo que o agendador nunca tenha rodado: a baixa de um item vencido é recusada porque a rotina roda antes da decisão.
- Os avisos chegam mesmo que ninguém abra o aplicativo, graças ao agendamento.
- Testes determinísticos: basta avançar o relógio injetado, sem esperar temporizador.

**Negativas**
- Uma consulta de leitura (`GET /api/produtos`, `GET /api/painel`) pode gravar no banco. Foge do esperado para um `GET`; foi aceito porque a gravação é idempotente e invisível para quem chama.
- Custo extra de três consultas indexadas por leitura de estoque. Medido: 16 ms com 2.000 produtos.

**Limitações**
- As notificações existem só dentro do aplicativo. Enviar por push ou e-mail (T-47) pede uma fila de saída, que se encaixa neste desenho: a rotina continuaria gravando a notificação e um despachante cuidaria do envio.
- "Hoje" é calculado em um único fuso, configurável por instalação (`COCHEF_FUSO`), e não por república.
