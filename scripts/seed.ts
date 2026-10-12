/**
 * Popula o banco com uma república de demonstração. Só roda em banco vazio.
 * Uso: npm run seed
 */
import { carregarConfig } from '../src/config.ts';
import { Banco } from '../src/db.ts';
import { relogioReal } from '../src/relogio.ts';
import { somarDias } from '../src/dominio/datas.ts';
import type { Contexto, Usuario } from '../src/servicos/contexto.ts';
import * as auth from '../src/servicos/auth.ts';
import * as estoque from '../src/servicos/estoque.ts';
import * as lista from '../src/servicos/lista.ts';
import * as financas from '../src/servicos/financas.ts';
import * as escala from '../src/servicos/escala.ts';

const config = carregarConfig();
const ctx: Contexto = { db: new Banco(config.caminhoBanco), relogio: relogioReal(config.fuso), config };

if (ctx.db.um('SELECT 1 AS x FROM republica')) {
  console.log('O banco já tem dados; nada foi alterado. Apague dados/cochef.db para recomeçar.');
  process.exit(0);
}

const SENHA = 'cochef-demo';
const hoje = ctx.relogio.hoje();

const lia = (await auth.registrar(ctx, { nome: 'Lia', email: 'lia@demo.cochef', senha: SENHA, nomeRepublica: 'República Panela Velha' })).usuario;
const convite = ctx.db.um<{ codigo_convite: string }>('SELECT codigo_convite FROM republica WHERE id = ?', lia.republicaId)!.codigo_convite;
const entrar = async (nome: string, email: string): Promise<Usuario> =>
  (await auth.registrar(ctx, { nome, email, senha: SENHA, codigoConvite: convite })).usuario;
const caio = await entrar('Caio', 'caio@demo.cochef');
const bruna = await entrar('Bruna', 'bruna@demo.cochef');

const produto = (u: Usuario, nome: string, quantidade: number, unidade: string, dias: number | null, extra: Partial<estoque.NovoProduto> = {}) =>
  estoque.cadastrarProduto(ctx, u, { nome, quantidade, unidade, validade: dias === null ? null : somarDias(hoje, dias), classificacao: 'COLETIVO', quantidadeMinima: null, ...extra });

produto(lia, 'Arroz', 5, 'kg', 240, { quantidadeMinima: 1 });
produto(lia, 'Feijão', 2, 'kg', 180, { quantidadeMinima: 1 });
const cafe = produto(caio, 'Café', 2, 'pct', 90, { quantidadeMinima: 1 });
produto(bruna, 'Leite', 3, 'L', 2, { quantidadeMinima: 2 });
produto(lia, 'Presunto', 200, 'g', 1);
produto(caio, 'Detergente', 2, 'un', null, { quantidadeMinima: 1 });
produto(bruna, 'Iogurte grego', 4, 'un', 3, { classificacao: 'INDIVIDUAL' });
produto(caio, 'Whey', 1, 'pote', 300, { classificacao: 'INDIVIDUAL' });

estoque.consumirProduto(ctx, bruna, cafe.id, 1); // atinge o mínimo → entra na lista
lista.adicionarItem(ctx, caio, 'Papel toalha');

financas.registrarCompra(ctx, lia, { descricao: 'Mercado da semana', valorCentavos: 18990, pagadorId: lia.id, data: hoje });
financas.registrarCompra(ctx, lia, { descricao: 'Botijão de gás', valorCentavos: 11000, pagadorId: caio.id, data: hoje });
financas.registrarCompra(ctx, bruna, { descricao: 'Feira', valorCentavos: 6450, pagadorId: bruna.id, data: hoje });

escala.gerarEscala(ctx, lia, hoje, 14, ['LIMPEZA', 'REFEICAO']);

console.log(`República de demonstração criada. Entre com a senha "${SENHA}" em uma das contas:
  lia@demo.cochef    (administradora)
  caio@demo.cochef   (morador)
  bruna@demo.cochef  (morador)`);
ctx.db.fechar();
