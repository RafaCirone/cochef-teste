# ADR-004 — Autenticação com JWT, senhas com scrypt e perfil relido a cada requisição

- **Estado:** aceito · **Data:** 11/10/2026 · **Altera:** RNF-02 da especificação original

## Contexto

O RNF-02 original pedia senhas com *bcrypt* e token JWT em todas as requisições privadas. Duas tensões apareceram:

1. **bcrypt não existe na biblioteca padrão do Node.** Usá-lo exigiria a primeira dependência externa do projeto, contrariando o ADR-001.
2. **JWT puro não é revogável.** O sistema tem regras que precisam valer na hora: desativar um morador (RF-12) e rebaixar um administrador. Com as permissões gravadas no token, quem foi desativado continuaria entrando até o token expirar.

## Decisão

1. **Senhas com scrypt** (`node:crypto`), salt aleatório de 16 bytes por usuário e custo N = 2^17, r = 8, p = 1, que é a configuração recomendada pela OWASP. Os parâmetros são gravados junto do hash (`scrypt$17$8$1$salt$hash`), o que permite elevar o custo depois sem invalidar senhas. O RNF-02 foi atualizado na spec.
2. **Token JWT assinado com HS256**, validade de 8 horas, emitido e verificado por código próprio que aceita exclusivamente HS256.
3. **O token carrega apenas o identificador do usuário.** Perfil, república e situação (ativo ou não) são lidos do banco a cada requisição.
4. **Segredo de assinatura fora do código:** vem da variável `COCHEF_JWT_SEGREDO` ou é gerado na primeira execução e guardado em arquivo ignorado pelo Git.
5. O token é enviado no cabeçalho `Authorization`, e não em cookie.

## Consequências

**Positivas**
- scrypt é resistente a ataques com hardware dedicado por exigir memória, propriedade que o bcrypt não tem. A troca não reduz a proteção pedida pelo requisito.
- Desativação e mudança de perfil valem imediatamente (verificado em teste).
- Sem cookie, não há envio automático de credencial pelo navegador, o que elimina CSRF.
- Aceitar um único algoritmo fecha os ataques de troca de algoritmo (`alg: none`, confusão entre chaves).

**Negativas**
- Uma consulta ao banco por requisição autenticada. Com SQLite local, custa microssegundos.
- Cada login custa cerca de 0,4 s de processamento e cerca de 130 MB de memória durante o cálculo. O limite de tentativas por IP contém o abuso.
- Implementar JWT à mão é um risco que normalmente se evita. Foi aceito porque o escopo é mínimo (um algoritmo, três campos) e há testes para token expirado, adulterado, assinado com outro segredo e `alg: none`.

**Limitações**
- O token fica no `localStorage` do navegador e pode ser lido por um script injetado. Mitigações: política de segurança de conteúdo que proíbe scripts inline e de terceiros, e escape de todo texto exibido.
- Não há renovação de token nem recuperação de senha (backlog, T-48).
