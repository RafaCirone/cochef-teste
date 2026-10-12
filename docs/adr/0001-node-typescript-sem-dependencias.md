# ADR-001 — Node.js com TypeScript nativo e nenhuma dependência externa

- **Estado:** aceito · **Data:** 11/10/2026

## Contexto

O CoChef é um sistema web pequeno, mantido por três pessoas, que precisa rodar na máquina de qualquer integrante e de quem for avaliar o projeto. O foco do trabalho é a qualidade da especificação e das regras de negócio, não a tecnologia. Cada biblioteca adicionada traz versões para acompanhar, vulnerabilidades de terceiros para monitorar e passos de instalação que podem falhar (em especial módulos nativos no Windows).

O Node.js 22 passou a oferecer, na própria plataforma, o que antes exigia bibliotecas: execução direta de arquivos TypeScript, banco SQLite (`node:sqlite`), executor de testes com cobertura (`node:test`), servidor HTTP e criptografia (`node:crypto`).

## Decisão

Escrever o sistema inteiro em **TypeScript executado nativamente pelo Node.js 22.18 ou superior**, usando **apenas a biblioteca padrão**:

| Necessidade | Solução |
| :--- | :--- |
| Servidor e rotas | `node:http` + roteador próprio de cerca de 50 linhas |
| Banco de dados | `node:sqlite` |
| Hash de senha e token | `node:crypto` (scrypt, HMAC-SHA256) |
| Testes e cobertura | `node:test` |
| Validação de entrada | módulo próprio (`src/validacao.ts`) |
| Interface | HTML, CSS e JavaScript sem framework nem etapa de build |

As únicas dependências são de desenvolvimento e opcionais: `typescript` e `@types/node`, usadas pela verificação de tipos.

## Consequências

**Positivas**
- `npm start` funciona logo após clonar o repositório, sem `npm install`.
- Superfície de cadeia de suprimentos nula em produção: não há código de terceiros para auditar ou atualizar.
- Nenhuma etapa de compilação: o arquivo que se lê é o arquivo que roda.

**Negativas**
- Escrevemos e mantemos o que um framework daria pronto: roteamento, leitura de corpo, cabeçalhos de segurança, limite de tentativas e validação. É pouco código, mas é nosso, e por isso está coberto por testes específicos.
- A execução nativa de TypeScript só remove anotações de tipo: recursos como `enum` e propriedades declaradas no construtor não podem ser usados (o `tsconfig.json` impõe isso com `erasableSyntaxOnly`).
- `node:sqlite` ainda é marcado como experimental no Node 22 e sua API pode mudar.

**Limitações e mitigação**
- Exige Node.js 22.18 ou superior (declarado em `engines`).
- Todo acesso ao banco passa pela classe `Banco` (`src/db.ts`); trocar o driver afeta um arquivo.
- Como não há bcrypt na biblioteca padrão, o requisito RNF-02 foi alterado para scrypt (ver ADR-004).
