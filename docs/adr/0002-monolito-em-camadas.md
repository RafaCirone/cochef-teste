# ADR-002 — Monólito em camadas com domínio puro

- **Estado:** aceito · **Data:** 11/10/2026

## Contexto

O sistema tem quatro áreas (estoque, lista de compras, finanças e escala) fortemente ligadas: a baixa de estoque alimenta a lista, a desativação de um morador depende do saldo financeiro e altera a escala. A carga é a de uma casa: poucas pessoas, poucas requisições. A diretriz do projeto pede que o código reflita a especificação e que as regras de negócio fiquem separadas dos detalhes técnicos.

Alternativas consideradas: (a) serviços separados por área; (b) monólito sem separação interna, com regras dentro das rotas; (c) monólito em camadas.

## Decisão

Um **único processo** que serve API e interface, organizado em três camadas com dependência em um só sentido:

1. **`dominio/`** — funções puras (rateio, acerto, validade, rodízio). Sem banco, sem HTTP, sem relógio.
2. **`servicos/`** — casos de uso. Decidem permissões, abrem transações, chamam o domínio, gravam e notificam.
3. **`http/`** — autenticação, validação de formato e tradução de erros. Nenhuma regra de negócio.

O tempo ("hoje") é uma dependência injetada (`Relogio`), porque validade, escala e fechamento dependem dele.

## Consequências

**Positivas**
- Cada regra da spec tem um endereço previsível no código, o que sustenta a matriz de rastreabilidade.
- As regras mais delicadas (dinheiro) são testadas isoladamente, sem subir servidor.
- Operações que cruzam áreas são uma chamada de função dentro de uma transação, e não uma coordenação entre serviços.
- Um processo e um arquivo de banco: implantação e backup triviais.

**Negativas**
- Escala apenas verticalmente; não há como escalar só uma área.
- A disciplina das camadas depende de revisão: nada impede tecnicamente uma rota de consultar o banco.

**Limitações**
- A interface é servida pelo mesmo processo; uma falha derruba tudo de uma vez. Aceitável para o porte, e relevante para o RNF-03 (ver revisão de observabilidade).
