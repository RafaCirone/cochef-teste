# Revisão de observabilidade

Pergunta de partida: se um morador disser "o sistema errou a minha conta" ou "ficou fora do ar ontem", conseguimos descobrir o que houve?

| ID | Achado | Gravidade | Ação | Estado |
| :--- | :--- | :---: | :--- | :--- |
| O-01 | **Erro inesperado precisa deixar rastro.** Sem registro central, uma exceção não prevista viraria um 500 impossível de investigar. | Alta | Tratamento único em `http/app.ts`: o cliente recebe mensagem genérica com o identificador da requisição; o log recebe a mensagem e a pilha. O identificador também vai no cabeçalho `X-Request-Id`. | Tratado no desenho |
| O-02 | **Registro de requisições.** É preciso saber quem chamou o quê e quanto demorou. | Média | Uma linha JSON por requisição de API, na saída padrão: instante, identificador, método, caminho, status, duração, usuário, república e código do erro de negócio. Corpos e senhas não são registrados. | Tratado no desenho |
| O-03 | **Autoria das ações financeiras.** É preciso responder "quem aprovou esta compra?" e "quem fechou o mês?". | Alta | Tabela `auditoria` gravada na mesma transação da ação (RNF-07): aprovação, rejeição, fechamento, confirmação de acerto, alteração de morador, geração de escala e de convite. Consulta pelo administrador em `GET /api/auditoria` e na tela "Casa". Teste: "ações financeiras ficam na trilha de auditoria". | Tratado no desenho |
| O-04 | **RNF-03 (99% de disponibilidade) não é medido.** O sistema expõe `GET /saude` (que consulta o banco), mas nada o sonda nem acumula o histórico. | Média | A medição depende do ambiente de implantação: um monitor externo chamando `/saude` a cada minuto fornece o percentual mensal. O que o código garante hoje: encerramento limpo em `SIGTERM`, banco em modo WAL (resistente a queda no meio da escrita) e falha do agendador registrada sem derrubar o servidor. Tarefa T-49. | Backlog |
| O-05 | **Sem métricas agregadas.** A duração está em cada linha de log, mas não há latência p95 nem taxa de erro calculadas. | Baixa | Os logs em JSON permitem extrair isso com qualquer agregador. Painel de métricas: tarefa T-49. | Backlog |

## Exemplo de registro

```json
{"em":"2026-10-12T00:30:25.448Z","nivel":"info","idRequisicao":"1503fb3c-2c31-47b2-a570-e8e8c1b18be5","metodo":"POST","caminho":"/api/auth/login","status":200,"duracaoMs":405,"usuarioId":null,"republicaId":null}
{"em":"2026-10-12T00:30:23.349Z","nivel":"info","evento":"rotinas","republicas":1,"duracaoMs":10}
```

## Como investigar

| Situação | Onde olhar |
| :--- | :--- |
| "Minha conta está errada" | Tela Finanças: cada compra mostra pagador, estado e valor por pessoa. A auditoria mostra quem aprovou e quando. O saldo é sempre recalculável a partir desses lançamentos. |
| "Deu erro quando cliquei" | O identificador da requisição localiza a linha no log, com o código do erro de negócio ou a pilha. |
| "Não recebi o aviso" | Linha `evento: rotinas` no log confirma se o notificador rodou; a tabela `notificacao` mostra o que foi gerado. |
| "Estava fora do ar" | Histórico do monitor em `/saude`; no log, a linha `servidor_iniciado` marca cada reinício. |
