# Cozinha de República (CoChef)

Projeto final da disciplina de Modelagem de Sistemas.

**Integrantes:** Kauê Stang (10438583) · Leonardo Fernandes Barreto (10735590) · Rafael Carreno Morra Cirone (10439063)

> **Visão:** uma plataforma única e colaborativa para a cozinha de moradias compartilhadas, que reduz o desperdício por validade vencida, dá transparência às contas e organiza as tarefas entre os moradores.

O CoChef liga o que as outras ferramentas tratam em separado: o **estoque** alimenta a **lista de compras**, as **compras coletivas** viram **rateio** e **acerto de contas**, e a **escala** distribui limpeza e refeições.

| Painel | Estoque | Finanças |
| :---: | :---: | :---: |
| ![Painel](docs/evidencias/painel-360px.png) | ![Estoque](docs/evidencias/estoque-360px.png) | ![Finanças](docs/evidencias/financas-360px.png) |

## Como executar

Requisito único: **Node.js 22.18 ou superior**. Não há dependências para instalar.

```bash
npm run seed    # opcional: cria uma república de demonstração
npm start       # http://localhost:3000
```

Contas de demonstração (senha `cochef-demo`): `lia@demo.cochef` (administradora), `caio@demo.cochef` e `bruna@demo.cochef` (moradores). Sem o `seed`, comece em "Criar república".

| Comando | O que faz |
| :--- | :--- |
| `npm start` | Sobe o servidor (API e interface) |
| `npm run dev` | Sobe o servidor e reinicia a cada alteração |
| `npm test` | Roda os 84 testes automatizados |
| `npm run test:cobertura` | Testes com relatório de cobertura |
| `npm run typecheck` | Verificação de tipos (requer `npm install`, que baixa só o TypeScript) |
| `npm run seed` | Popula um banco vazio com dados de demonstração |

Os dados ficam em `dados/cochef.db` e sobrevivem a reinícios. Configuração opcional por variáveis de ambiente: veja [.env.example](.env.example).

## Documentação

| Documento | Conteúdo |
| :--- | :--- |
| [spec.md](spec.md) | Problema, personas, requisitos em EARS, regras de negócio, backlog, casos de uso, modelo de domínio e matriz de rastreabilidade |
| [plan.md](plan.md) | Arquitetura, estrutura do código, modelo de dados, API e fases de entrega |
| [tasks.md](tasks.md) | Tarefas atômicas derivadas da spec, com requisito e critério de pronto |
| [docs/adr/](docs/adr/) | Cinco registros de decisão de arquitetura |
| [docs/review/](docs/review/) | Revisão multidimensional: arquitetura, performance, segurança e observabilidade |
| [docs/seguranca.md](docs/seguranca.md) | SSDLC, modelo de ameaças e pré-requisitos de implantação |
| [docs/testes.md](docs/testes.md) | Estratégia de testes e evidências de qualidade |
| [docs/glossario.md](docs/glossario.md) · [docs/benchmark.md](docs/benchmark.md) | Linguagem do domínio e análise de soluções existentes |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Fluxo de Git: issues, branches, pull requests e revisão |

## O problema

- **Estoque e validade sem controle.** Compra-se em dobro o que já havia, enquanto o que está no fundo da geladeira estraga.
- **Conflito na divisão das contas.** É difícil separar compra coletiva de item individual e saber quem deve quanto a quem.
- **Tarefas sem dono claro.** Ninguém sabe ao certo de quem é a vez de limpar ou cozinhar.

**Público-alvo:** estudantes e jovens profissionais, de 18 a 30 anos, que moram em repúblicas, pensionatos ou apartamentos compartilhados.

## O que o sistema faz

| Área | Funcionalidades | Regras em destaque |
| :--- | :--- | :--- |
| **Estoque** | Cadastro com uso coletivo ou individual, baixa, reposição, descarte, histórico | Item individual só é movimentado pelo dono, nem o administrador pode; vencido não se consome |
| **Validade** | Destaque no painel e aviso a 3 dias ou menos do vencimento | Vencidos saem sozinhos do estoque ativo |
| **Lista de compras** | Itens manuais e sugestão automática quando o coletivo atinge o mínimo | Uma sugestão por produto; repor dá baixa na sugestão |
| **Finanças** | Compras coletivas, aprovação, rateio, saldos, "quem deve para quem", fechamento mensal, confirmação de pagamento | Divisão igual entre os ativos, em centavos exatos; mês fechado não aceita lançamento; devedor não confirma o próprio pagamento |
| **Escala** | Rodízio de limpeza e refeição, conclusão de turno, troca entre moradores | A troca só vale com o aceite do outro morador |
| **Casa** | Convite, perfis, desativação de moradores, auditoria | Sempre há um administrador; ninguém sai devendo |

### Perfis

| Perfil | Papel |
| :--- | :--- |
| **Morador** | Usa o estoque, a lista e a escala; registra compras, que aguardam aprovação |
| **Administrador** | Tudo que o morador faz, mais: aprova compras, fecha o mês, gera a escala e gere os moradores |
| **Sistema** | Marca vencidos, avisa sobre validade, sugere compras e lembra turnos |

### Fora do escopo

Pagamento dentro do aplicativo, integração com supermercados, recomendação de receitas por IA (o projeto não usa IA nem LLM), lotes com validades diferentes e avisos por push ou e-mail. Detalhes na [spec](spec.md#1-problema-e-escopo).

## Tecnologia

Node.js 22 com TypeScript executado nativamente, SQLite embutido (`node:sqlite`) e interface em HTML, CSS e JavaScript sem framework. Nenhuma dependência em produção. As razões estão nos [ADRs](docs/adr/).

```
src/dominio/    regras puras (rateio, acerto, validade, rodízio)
src/servicos/   casos de uso, permissões e transações
src/http/       API, autenticação e arquivos estáticos
public/         interface web
tests/          testes nomeados pelos requisitos que verificam
```
