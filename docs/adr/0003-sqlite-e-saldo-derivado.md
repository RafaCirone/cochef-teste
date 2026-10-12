# ADR-003 — SQLite, dinheiro em centavos inteiros e saldo derivado

- **Estado:** aceito · **Data:** 11/10/2026

## Contexto

O sistema precisa de persistência durável (restrição 3.2) e de consistência forte nas finanças: um rateio pela metade ou um saldo divergente dos lançamentos destrói a confiança dos moradores, que é o valor central do produto. Os dados são relacionais e pequenos (dezenas de usuários, milhares de linhas por casa).

Três decisões de modelagem precisavam ser tomadas juntas: onde guardar, como representar dinheiro e se o saldo é guardado ou calculado.

## Decisão

1. **SQLite em arquivo único**, em modo WAL, com chaves estrangeiras ligadas e as invariantes do domínio escritas como restrições (`CHECK`, `UNIQUE`, índice único parcial).
2. **Dinheiro em centavos, como inteiro.** Nunca ponto flutuante. A divisão de uma compra produz cotas inteiras e o resíduo fica com o pagador (RB-05).
3. **O saldo não é armazenado.** É sempre calculado a partir de compras aprovadas, cotas e acertos pagos.
4. **Cada caso de uso roda em uma transação** (`Banco.transacao`), com `BEGIN IMMEDIATE`.

## Consequências

**Positivas**
- Nenhum serviço de banco para instalar; o backup é a cópia de um arquivo.
- Não existe "saldo fora de sincronia": não há segundo lugar onde o valor esteja guardado. A soma dos saldos da casa é zero por construção, e isso é verificado em teste.
- Restrições no banco pegam erros que escapem da aplicação.
- Somas em centavos são exatas.

**Negativas**
- Calcular o saldo a cada consulta custa mais do que ler uma coluna. Medido: 2 ms com 500 compras (RNF-01 pede menos de 1,5 s).
- SQLite admite um escritor por vez. Com um processo e transações de milissegundos, não há disputa na carga prevista.
- Mudanças de esquema ainda não têm ferramenta de migração: hoje o esquema é criado com `CREATE TABLE IF NOT EXISTS`.

**Limitações e saída**
- Se o sistema passar a atender muitas casas com escrita concorrente intensa, a troca natural é PostgreSQL. O SQL usado é padrão, exceto `INSERT OR IGNORE` e o índice parcial, ambos com equivalente direto.
- Um produto tem uma única validade; lotes exigiriam uma tabela nova (backlog, T-46).
