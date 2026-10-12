# Revisão de segurança

Critérios: OWASP Top 10 (2021) e as ameaças levantadas em [docs/seguranca.md](../seguranca.md). Revisão manual do código mais testes de abuso em `tests/auth.test.ts`.

| ID | Achado | Categoria | Gravidade | Ação | Estado |
| :--- | :--- | :--- | :---: | :--- | :--- |
| S-01 | **Requisição com endereço malformado derrubava o processo.** A URL era interpretada fora do bloco de tratamento de erros; um alvo como `//` gerava exceção não tratada e encerrava o servidor para todos (negação de serviço com uma única requisição, sem autenticação). | A05 | **Alta** | Interpretação movida para dentro do tratamento; devolve 400. Teste: "alvo de requisição malformado devolve 400 e não derruba o servidor". | Corrigido |
| S-02 | **Parâmetro de rota com codificação inválida gerava erro 500.** `decodeURIComponent` lançava exceção para sequências como `%E0%A4%A`. | A05 | Média | Decodificação removida: parâmetros de rota são sempre identificadores numéricos, validados por `idDeRota`. Coberto pelo mesmo teste de S-01. | Corrigido |
| S-03 | **Risco de permissões presas ao token.** Se o perfil viajasse dentro do JWT, um morador desativado ou um administrador rebaixado manteria o acesso até o token expirar. | A01 | **Alta** | O token carrega só o identificador; perfil e situação são relidos do banco a cada requisição ([ADR-004](../adr/0004-autenticacao-jwt-e-scrypt.md)). Testes: "rebaixamento vale na hora" e "desativar encerra o acesso na hora". | Tratado no desenho |
| S-04 | **Risco de o login revelar quais e-mails têm conta**, pela mensagem ou pelo tempo de resposta (sem usuário, não haveria cálculo de hash). | A07 | Média | Mensagem única para e-mail inexistente, senha errada e conta desativada; quando o e-mail não existe, calcula-se um hash de mesmo custo. Teste: "senha errada e e-mail inexistente dão a mesma resposta" (o teste cobre a mensagem; a igualdade de tempo não é medida). | Tratado no desenho |
| S-05 | **Token guardado no `localStorage`**, legível por qualquer script que rode na página. | A03 | Média | Aceito, com duas barreiras contra injeção de script: política de segurança de conteúdo `default-src 'self'` (sem scripts ou estilos inline, sem origens externas) e escape de todo texto dinâmico na interface (`e()` em `app.js`). A alternativa (cookie `HttpOnly`) traria CSRF e exigiria proteção própria. | Aceito |
| S-06 | **Sem recuperação de senha e sem encerramento de sessão no servidor.** "Sair" apaga o token só no navegador; ele segue válido por até 8 horas. | A07 | Média | Recuperação exige envio de e-mail, fora do escopo do MVP. O prazo curto do token e a desativação imediata pelo administrador limitam o dano. Tarefa T-48. | Backlog |
| S-07 | **O administrador pode aprovar uma compra em que ele mesmo é o pagador**, sem segunda conferência. | A04 | Baixa | Aceito: muitas casas têm um só administrador, e exigir um segundo aprovador travaria o uso. Compensação: toda compra e todo rateio são visíveis a todos os moradores, e a aprovação fica na auditoria. | Aceito |
| S-08 | **O cadastro informa quando o e-mail já está em uso.** | A07 | Baixa | Aceito: é necessário para a pessoa entender por que o cadastro falhou. As rotas de autenticação têm limite de tentativas por IP. | Aceito |
| S-09 | **Limite de tentativas em memória e por IP.** Zera ao reiniciar; atrás de um proxy reverso, todos os clientes compartilham o IP do proxy. | A04 | Média | Suficiente para a implantação direta prevista. Em implantação com proxy, o limite deve ir para o proxy (ou o servidor passar a confiar em `X-Forwarded-For` de origem conhecida). Registrado como pré-requisito de implantação em `docs/seguranca.md`. | Backlog |

## Verificações que não geraram achado

| Verificação | Resultado |
| :--- | :--- |
| Injeção de SQL | Todas as consultas são parametrizadas; nenhum valor de entrada é concatenado em SQL. Teste com carga maliciosa no nome do produto. |
| Acesso entre repúblicas (IDOR) | Toda busca por identificador filtra também por `republica_id`; recurso de outra casa responde 404. Teste de isolamento. |
| Escalada de privilégio | As cinco ações de administrador são recusadas com 403 para morador comum. Teste dedicado. |
| Travessia de diretório nos arquivos estáticos | Caminho normalizado e conferido contra a pasta `public/`. Teste com `..%2f`. |
| Segredos no repositório | Nenhum. O segredo do token é gerado em tempo de execução e fica em pasta ignorada pelo Git. |
| Senhas | Nunca gravadas em claro, nunca devolvidas pela API, nunca escritas em log. Teste dedicado. |
| Corpo de requisição | Limite de 64 KB; exige `application/json`; JSON inválido responde 400. |
| Dependências vulneráveis (A06) | Não há dependências em produção ([ADR-001](../adr/0001-node-typescript-sem-dependencias.md)). |
