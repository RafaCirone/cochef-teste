# Revisão multidimensional

Revisão do sistema completo sob quatro lentes, feita em 11/10/2026 sobre o código da entrega. Cada achado tem identificador, gravidade, ação e estado.

| Dimensão | Achados | Corrigidos na revisão | Tratados no desenho | Aceitos com justificativa | Para o backlog |
| :--- | :---: | :---: | :---: | :---: | :---: |
| [Arquitetura](arquitetura.md) | 5 | 0 | 1 | 2 | 2 |
| [Performance](performance.md) | 4 | 0 | 1 | 3 | 0 |
| [Segurança](seguranca.md) | 9 | 2 | 2 | 3 | 2 |
| [Observabilidade](observabilidade.md) | 5 | 0 | 3 | 0 | 2 |

**Estados**

- **Corrigido na revisão:** defeito encontrado no código durante a revisão e consertado, com teste que falharia sem a correção.
- **Tratado no desenho:** risco conferido na revisão que o código já cobria; a linha registra onde e qual teste comprova.
- **Aceito:** risco conhecido que decidimos manter, com a justificativa.
- **Backlog:** virou tarefa em [tasks.md](../../tasks.md).

**Gravidade:** *alta* — viola requisito ou permite dano; *média* — degrada a qualidade ou cria risco plausível; *baixa* — melhoria.

Os dois defeitos corrigidos (S-01 e S-02) estavam no tratamento de endereços de requisição; o primeiro permitia derrubar o servidor com uma única requisição sem autenticação. As medições de performance saem do teste `RNF-01` em `npm test`.
