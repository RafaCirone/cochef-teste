# Revisão de performance

Critério: RNF-01 (consultas de estoque e saldo em menos de 1,5 s). Medições do teste `RNF-01: desempenho das consultas`, com 2.000 produtos, 500 compras aprovadas e 6 moradores, SQLite em memória, incluindo a ida e volta HTTP local.

| Consulta | Tempo medido | Limite | Folga |
| :--- | ---: | ---: | ---: |
| `GET /api/produtos` (2.000 itens, com rotina do notificador) | 16 ms | 1.500 ms | ~90× |
| `GET /api/balanco` (saldos + quem deve para quem) | 2 ms | 1.500 ms | ~750× |
| `GET /api/painel` | 15 ms | 1.500 ms | ~100× |
| `GET /api/compras` (200 mais recentes, com cotas) | 7 ms | 1.500 ms | ~200× |

Os números variam alguns milissegundos entre execuções e máquinas; a ordem de grandeza é o que importa.

| ID | Achado | Gravidade | Ação | Estado |
| :--- | :--- | :---: | :--- | :--- |
| P-01 | **Filtros mais usados precisam de índice.** Estoque, compras, turnos e notificações são sempre filtrados por república (ou usuário) e estado; sem índice, cada consulta varreria a tabela inteira. | Média | Índices declarados em `db.ts`: `produto(republica_id, status, validade)`, `compra(republica_id, status, data)`, `cota(usuario_id)`, `turno(responsavel_id, status, data)`, `notificacao(usuario_id, lida)`, entre outros. As medições acima já os incluem. | Tratado no desenho |
| P-02 | **Consulta por item na listagem de compras.** `listarCompras` busca as cotas de cada compra em uma consulta separada (padrão N+1). | Baixa | Mantido: a listagem é limitada a 200 compras e mede 7 ms. Uma junção única complicaria o código sem ganho perceptível. Reavaliar se o limite subir. | Aceito |
| P-03 | **Saldo recalculado a cada consulta.** Quatro subconsultas agregadas por morador. | Baixa | Mantido por decisão do [ADR-003](../adr/0003-sqlite-e-saldo-derivado.md): saldo derivado não diverge dos lançamentos. Mede 2 ms com 500 compras. | Aceito |
| P-04 | **Login caro por desenho.** O scrypt consome cerca de 0,4 s de processador e 130 MB por tentativa. | Baixa | É o custo que protege as senhas. O cálculo é assíncrono (não trava as outras requisições) e o limite de 30 tentativas por IP a cada 15 minutos contém o abuso. O custo é configurável (`COCHEF_SCRYPT_LOGN`). | Aceito |

**Fora da medição:** carga concorrente de muitas repúblicas. O desenho (um processo, um escritor) atende ao uso previsto; os limites e a saída estão no ADR-003.
