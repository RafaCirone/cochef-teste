# Segurança e SSDLC

Como a segurança entra em cada etapa do desenvolvimento do CoChef, quais ameaças consideramos e o que protege contra cada uma. Os achados da revisão estão em [docs/review/seguranca.md](review/seguranca.md).

## 1. O que protegemos

| Ativo | Por que importa | Quem não deve alcançá-lo |
| :--- | :--- | :--- |
| Credenciais (senha, token) | Dão acesso à conta | Qualquer um além do dono |
| Lançamentos financeiros e saldos | Determinam quem paga quanto; base da confiança entre moradores | Alteração por quem não tem o perfil; qualquer acesso de outra república |
| Itens individuais | Propriedade de um morador (RB-01) | Movimentação por outros moradores, inclusive o administrador |
| Código de convite | Quem o tem entra na casa | Quem não foi convidado |
| Dados pessoais (nome, e-mail) | Privacidade (LGPD) | Outras repúblicas; e-mails só são visíveis ao administrador da casa |

## 2. Segurança ao longo do ciclo (SSDLC)

| Etapa | Prática adotada | Evidência |
| :--- | :--- | :--- |
| **Requisitos** | Requisitos de segurança escritos em EARS, ao lado dos funcionais (RNF-02, RNF-06, RNF-07). Comportamentos indesejados especificados com `IF … THEN` (RF-07, e as exceções de RF-05, RF-08, RF-10, RF-12). | [spec.md](../spec.md) §3 a §5 |
| **Desenho** | Modelagem de ameaças (seção 3). Decisões de autenticação registradas em ADR. Permissão decidida em um único lugar (camada de serviços); isolamento por república em toda consulta. | [ADR-004](adr/0004-autenticacao-jwt-e-scrypt.md), [plan.md](../plan.md) §2 |
| **Implementação** | Consultas sempre parametrizadas; validação de toda entrada na fronteira; segredo fora do código; nenhuma dependência de terceiros em produção; saída da interface sempre escapada. | `src/validacao.ts`, `src/db.ts`, [ADR-001](adr/0001-node-typescript-sem-dependencias.md) |
| **Verificação** | Testes de abuso automatizados: sem token, token adulterado ou expirado, outra república, perfil insuficiente, entrada malformada, injeção de SQL, travessia de diretório, excesso de tentativas. Revisão de segurança antes da entrega. | `tests/auth.test.ts`, [revisão](review/seguranca.md) |
| **Integração** | Todo pull request roda verificação de tipos e a suíte completa; revisão obrigatória por outro integrante, com atenção a mudanças em `seguranca/`, `http/` e nas permissões dos serviços. | `.github/workflows/ci.yml`, [CONTRIBUTING.md](../CONTRIBUTING.md) |
| **Implantação** | Lista de pré-requisitos (seção 5). | Este documento |
| **Operação** | Log estruturado por requisição, trilha de auditoria das ações sensíveis, verificação de saúde. | [revisão de observabilidade](review/observabilidade.md) |

## 3. Modelo de ameaças (STRIDE)

| Ameaça | Cenário | Controle | Teste |
| :--- | :--- | :--- | :--- |
| **S** — falsificação de identidade | Adivinhar senhas por tentativa | scrypt caro; limite de 30 tentativas por IP a cada 15 min; senha mínima de 8 caracteres | "após o limite, novas tentativas recebem 429" |
| | Forjar ou alterar um token | Assinatura HMAC-SHA256 conferida em tempo constante; só HS256 é aceito | "token válido devolve o usuário; expirado, adulterado…"; "alg: none é recusado" |
| | Descobrir quais e-mails têm conta | Resposta única no login | "senha errada e e-mail inexistente dão a mesma resposta" |
| **T** — adulteração | Injeção de SQL | Consultas parametrizadas | "injeção de SQL em campos de texto é tratada como texto" |
| | Alterar saldo diretamente | O saldo não é um campo: é derivado dos lançamentos ([ADR-003](adr/0003-sqlite-e-saldo-derivado.md)) | "RB-05 … os saldos somam zero" |
| | Lançar compra em mês já fechado | RB-08 | "fechamento … congela o mês" |
| **R** — repúdio | "Não fui eu que aprovei" | Trilha de auditoria gravada na mesma transação da ação | "ações financeiras ficam na trilha de auditoria" |
| | Devedor declarar que pagou | Só o credor ou o administrador confirma (RB-09) | "RF-10: … o devedor não" |
| **I** — vazamento | Ler dados de outra república | Filtro por república em toda consulta; resposta 404 | "isolamento: uma república não enxerga…" |
| | Vazamento do banco expor senhas | Hash scrypt com salt por usuário | "a senha nunca é gravada em claro…" |
| | Ler arquivos do servidor pela rota de estáticos | Caminho normalizado e confinado a `public/` | "proteção contra travessia de diretório" |
| | Mensagem de erro expor detalhes internos | Erro inesperado devolve texto genérico e um identificador; a pilha vai só para o log | — (inspeção de `http/app.ts`) |
| **D** — negação de serviço | Requisição malformada derrubar o processo | Toda a requisição é tratada dentro de um único bloco de erros | "alvo de requisição malformado devolve 400…" |
| | Corpo gigante | Limite de 64 KB | — (inspeção de `http/app.ts`) |
| **E** — elevação de privilégio | Morador executar ação de administrador | `exigirAdmin` nos serviços; perfil relido do banco a cada requisição | "morador comum não acessa funções de administrador" |
| | Usar item individual de outra pessoa | RB-01, sem exceção para o administrador | "RF-07 / RB-01 …" |
| | Deixar a casa sem administrador, ou tomar a administração | RB-06; só administrador altera perfis | "RF-12 / RB-06 …" |
| | Script injetado na página (XSS) agir como o usuário | Política de conteúdo sem inline nem origens externas; escape de todo texto | "cabeçalhos de segurança…" (a política); escape por inspeção de `app.js` |

## 4. Riscos aceitos

Registrados com justificativa na [revisão de segurança](review/seguranca.md): token no `localStorage` (S-05), ausência de recuperação de senha e de encerramento de sessão no servidor (S-06), administrador aprovando a própria compra (S-07), cadastro que informa e-mail já usado (S-08) e limite de tentativas em memória (S-09).

## 5. Pré-requisitos de implantação

O servidor fala HTTP puro e foi desenhado para ficar atrás de um terminador TLS. Antes de expor à internet:

1. **HTTPS obrigatório** no proxy reverso, com redirecionamento de HTTP e cabeçalho `Strict-Transport-Security`. Sem isso, senha e token trafegam em claro.
2. **`COCHEF_JWT_SEGREDO`** definido por variável de ambiente (32 caracteres ou mais), e não pelo arquivo gerado automaticamente.
3. **Limite de tentativas no proxy**, já que atrás dele o servidor enxerga um único IP (S-09).
4. **Backup do arquivo do banco** (`dados/cochef.db`) e permissão de leitura restrita ao usuário do serviço.
5. **Monitor externo** em `/saude`, para medir o RNF-03.

## 6. Dados pessoais

O sistema guarda nome, e-mail e hash de senha, o mínimo para identificar o morador dentro da casa. O e-mail só é exibido ao administrador da própria república. Não há compartilhamento com terceiros nem coleta de dados de navegação. A desativação preserva os lançamentos financeiros (necessários às contas dos demais moradores); a exclusão definitiva a pedido do titular ainda não tem fluxo no sistema e hoje exigiria intervenção direta no banco.
