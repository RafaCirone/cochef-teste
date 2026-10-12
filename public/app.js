// CoChef — interface web. Sem dependências e sem HTML inline vindo do usuário:
// todo texto dinâmico passa por `e()` antes de entrar no DOM (defesa contra XSS, somada à CSP do servidor).

const $app = document.getElementById('app');
const $modal = document.getElementById('modal');
const $avisos = document.getElementById('avisos');

const estado = { sessao: lerSessao(), aba: 'painel', modoEntrada: 'entrar' };

function lerSessao() {
  try {
    return JSON.parse(localStorage.getItem('cochef.sessao'));
  } catch {
    return null;
  }
}
function guardarSessao(sessao) {
  estado.sessao = sessao;
  try {
    if (sessao) localStorage.setItem('cochef.sessao', JSON.stringify(sessao));
    else localStorage.removeItem('cochef.sessao');
  } catch { /* armazenamento indisponível: a sessão vale só até recarregar */ }
}

// ---------- utilidades ----------
const e = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const moeda = (centavos) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const diaSemana = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
const qtd = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const hojeLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const souAdmin = () => estado.sessao?.usuario.perfil === 'ADMIN';
const eu = () => estado.sessao.usuario;

function avisar(mensagem, erro = false) {
  const el = document.createElement('div');
  el.className = `aviso${erro ? ' erro' : ''}`;
  el.textContent = mensagem;
  $avisos.append(el);
  setTimeout(() => el.remove(), erro ? 6000 : 3000);
}

async function api(metodo, caminho, corpo) {
  const resposta = await fetch(`/api${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(estado.sessao ? { Authorization: `Bearer ${estado.sessao.token}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (resposta.status === 401 && estado.sessao) {
    guardarSessao(null);
    desenhar();
  }
  if (!resposta.ok) throw new Error(dados?.erro?.mensagem ?? 'Não foi possível concluir a ação.');
  return dados;
}

/** Executa uma ação, mostra o resultado e redesenha a tela. */
async function agir(funcao, mensagemOk) {
  try {
    await funcao();
    if (mensagemOk) avisar(mensagemOk);
    await desenhar();
    return true;
  } catch (erro) {
    avisar(erro.message, true);
    return false;
  }
}

/** Formulário em diálogo modal. `campos`: [{ nome, rotulo, tipo, valor, opcoes, obrigatorio, passo, min }]. */
function perguntar(titulo, campos, textoBotao = 'Confirmar') {
  return new Promise((resolver) => {
    $modal.innerHTML = `
      <form method="dialog">
        <h2>${e(titulo)}</h2>
        ${campos.map(campoHtml).join('')}
        <div class="acoes">
          <button class="btn" type="button" data-fechar>Cancelar</button>
          <button class="btn primario" type="submit">${e(textoBotao)}</button>
        </div>
      </form>`;
    const form = $modal.querySelector('form');
    let resultado = null;
    $modal.querySelector('[data-fechar]').onclick = () => $modal.close();
    form.onsubmit = () => { resultado = valores(form, campos); };
    $modal.onclose = () => resolver(resultado);
    $modal.showModal();
  });
}

function campoHtml(c) {
  const comum = `name="${e(c.nome)}" ${c.obrigatorio === false ? '' : 'required'}`;
  if (c.tipo === 'texto-fixo') return `<p class="suave">${e(c.rotulo)}</p>`;
  if (c.tipo === 'select') {
    return `<label>${e(c.rotulo)}<select ${comum}>${c.opcoes.map(([v, r]) => `<option value="${e(v)}" ${String(v) === String(c.valor) ? 'selected' : ''}>${e(r)}</option>`).join('')}</select></label>`;
  }
  const extras = [
    c.passo ? `step="${e(c.passo)}"` : '', c.min !== undefined ? `min="${e(c.min)}"` : '', c.max !== undefined ? `max="${e(c.max)}"` : '',
    c.tamanhoMin ? `minlength="${c.tamanhoMin}"` : '', c.completar ? `autocomplete="${c.completar}"` : '', c.dica ? `placeholder="${e(c.dica)}"` : '',
  ].join(' ');
  return `<label>${e(c.rotulo)}<input type="${c.tipo ?? 'text'}" ${comum} value="${e(c.valor ?? '')}" ${extras}></label>`;
}

function valores(form, campos) {
  const dados = {};
  for (const c of campos) {
    if (c.tipo === 'texto-fixo') continue;
    const bruto = form.elements[c.nome].value.trim();
    if (bruto === '') dados[c.nome] = null;
    else dados[c.nome] = c.tipo === 'number' || c.numerico ? Number(bruto.replace(',', '.')) : bruto;
  }
  return dados;
}

// ---------- entrada (login / cadastro) ----------
function telaEntrada() {
  const modo = estado.modoEntrada;
  const campos = {
    entrar: [
      { nome: 'email', rotulo: 'E-mail', tipo: 'email', completar: 'email' },
      { nome: 'senha', rotulo: 'Senha', tipo: 'password', completar: 'current-password' },
    ],
    criar: [
      { nome: 'nome', rotulo: 'Seu nome', completar: 'name', tamanhoMin: 2 },
      { nome: 'nomeRepublica', rotulo: 'Nome da república', tamanhoMin: 2 },
      { nome: 'email', rotulo: 'E-mail', tipo: 'email', completar: 'email' },
      { nome: 'senha', rotulo: 'Senha (mínimo de 8 caracteres)', tipo: 'password', completar: 'new-password', tamanhoMin: 8 },
    ],
    convite: [
      { nome: 'nome', rotulo: 'Seu nome', completar: 'name', tamanhoMin: 2 },
      { nome: 'codigoConvite', rotulo: 'Código de convite', dica: 'Peça ao administrador da casa', tamanhoMin: 6 },
      { nome: 'email', rotulo: 'E-mail', tipo: 'email', completar: 'email' },
      { nome: 'senha', rotulo: 'Senha (mínimo de 8 caracteres)', tipo: 'password', completar: 'new-password', tamanhoMin: 8 },
    ],
  }[modo];
  const rotulos = { entrar: 'Entrar', criar: 'Criar república', convite: 'Tenho convite' };
  $app.innerHTML = `
    <div class="entrada">
      <div class="logo"><img src="/icone.svg" alt=""><div><h1>CoChef</h1><p class="suave">A cozinha da república, organizada.</p></div></div>
      <div class="seletor" role="group" aria-label="O que você quer fazer">
        ${Object.entries(rotulos).map(([m, r]) => `<button type="button" data-acao="modo-entrada" data-modo="${m}" aria-pressed="${m === modo}">${r}</button>`).join('')}
      </div>
      <form class="cartao" data-form="entrada">
        ${campos.map(campoHtml).join('')}
        <button class="btn primario cheio" type="submit">${rotulos[modo]}</button>
      </form>
    </div>`;
  $app.querySelector('form').onsubmit = async (ev) => {
    ev.preventDefault();
    const botao = ev.target.querySelector('button[type=submit]');
    botao.disabled = true;
    try {
      const dados = valores(ev.target, campos);
      guardarSessao(await api('POST', modo === 'entrar' ? '/auth/login' : '/auth/registro', dados));
      estado.aba = 'painel';
      await desenhar();
    } catch (erro) {
      avisar(erro.message, true);
      botao.disabled = false;
    }
  };
}

// ---------- casca (topo + abas) ----------
const ICONES = {
  painel: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  estoque: '<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>',
  lista: '<path d="M6 6h15l-2 9H8z"/><path d="M6 6L5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
  financas: '<circle cx="12" cy="12" r="9"/><path d="M12 6.500v11M15 9.500c-.500-1-1.600-1.500-3-1.500-1.700 0-3 .800-3 2.100 0 2.900 6 1.500 6 4.400 0 1.300-1.300 2.100-3 2.100-1.400 0-2.500-.500-3-1.500"/>',
  escala: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};
const ABAS = [['painel', 'Painel'], ['estoque', 'Estoque'], ['lista', 'Compras'], ['financas', 'Finanças'], ['escala', 'Escala']];

function casca(conteudo, naoLidas = 0) {
  return `
    <header class="topo">
      <div class="titulo"><h1>CoChef</h1><small>${e(eu().nome)} · ${souAdmin() ? 'Administrador' : 'Morador'}</small></div>
      <button class="icone-btn" data-acao="ir" data-aba="avisos" aria-label="Notificações">Avisos${naoLidas ? `<span class="contador">${naoLidas}</span>` : ''}</button>
      <button class="icone-btn" data-acao="ir" data-aba="casa">Casa</button>
    </header>
    <main>${conteudo}</main>
    <nav class="abas" aria-label="Seções">
      ${ABAS.map(([id, nome]) => `<button data-acao="ir" data-aba="${id}" ${estado.aba === id ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[id]}</svg>${nome}</button>`).join('')}
    </nav>`;
}

// ---------- painel ----------
function seloValidade(p) {
  if (p.status === 'ESGOTADO') return '<span class="selo">Esgotado</span>';
  if (p.status === 'VENCIDO') return '<span class="selo perigo">Vencido</span>';
  if (p.status === 'DESCARTADO') return '<span class="selo">Descartado</span>';
  if (p.estadoValidade === 'CRITICA') return `<span class="selo alerta">${p.diasParaVencer === 0 ? 'Vence hoje' : `Vence em ${p.diasParaVencer} d`}</span>`;
  return '';
}

async function telaPainel() {
  const p = await api('GET', '/painel');
  const saldo = p.meuSaldoCentavos;
  const html = `
    ${p.validadeCritica.length ? `
      <section class="cartao critico">
        <div class="cabecalho"><h2>Validade crítica</h2><span class="selo alerta">${p.validadeCritica.length} ${p.validadeCritica.length === 1 ? 'item' : 'itens'}</span></div>
        <ul class="lista">${p.validadeCritica.map((x) => `
          <li><div class="info"><strong>${e(x.nome)}</strong><span>${qtd(x.quantidade)} ${e(x.unidade)} · vence ${dataBr(x.validade)}${x.classificacao === 'INDIVIDUAL' ? ' · seu item' : ''}</span></div>${seloValidade(x)}</li>`).join('')}
        </ul>
      </section>` : ''}
    <section class="grade">
      <button class="cartao" data-acao="ir" data-aba="financas"><h3>Meu saldo</h3><span class="numero ${saldo > 0 ? 'positivo' : saldo < 0 ? 'negativo' : ''}">${moeda(saldo)}</span><span class="suave">${saldo > 0 ? 'a receber' : saldo < 0 ? 'a pagar' : 'tudo certo'}</span></button>
      <button class="cartao" data-acao="ir" data-aba="lista"><h3>Lista de compras</h3><span class="numero">${p.itensNaLista}</span><span class="suave">${p.itensNaLista === 1 ? 'item pendente' : 'itens pendentes'}</span></button>
      ${souAdmin() ? `<button class="cartao" data-acao="ir" data-aba="financas"><h3>Para aprovar</h3><span class="numero">${p.comprasAguardandoAprovacao}</span><span class="suave">compras aguardando</span></button>` : ''}
      <button class="cartao" data-acao="ir" data-aba="escala"><h3>Trocas</h3><span class="numero">${p.trocasParaResponder}</span><span class="suave">pedidos para você</span></button>
    </section>
    <section class="cartao">
      <h2>Meus próximos turnos</h2>
      ${p.meusTurnos.length ? `<ul class="lista">${p.meusTurnos.map((t) => turnoHtml(t, p.hoje, [])).join('')}</ul>` : '<p class="vazio">Nenhum turno pendente nos próximos dias.</p>'}
    </section>`;
  return { html, naoLidas: p.notificacoesNaoLidas };
}

// ---------- estoque ----------
async function telaEstoque() {
  const [produtos, consumos] = await Promise.all([api('GET', '/produtos?todos=1'), api('GET', '/consumos')]);
  const ativos = produtos.filter((p) => p.status === 'ATIVO' || p.status === 'ESGOTADO');
  const baixados = produtos.filter((p) => p.status === 'VENCIDO' || p.status === 'DESCARTADO');
  const linha = (p) => `
    <li>
      <div class="info">
        <strong>${e(p.nome)} ${seloValidade(p)} ${p.abaixoDoMinimo && p.status !== 'VENCIDO' ? '<span class="selo marca">No mínimo</span>' : ''}</strong>
        <span>${qtd(p.quantidade)} ${e(p.unidade)} · ${p.classificacao === 'COLETIVO' ? 'Coletivo' : `Individual · ${e(p.donoNome)}`}${p.validade ? ` · val. ${dataBr(p.validade)}` : ''}</span>
      </div>
      <div class="acoes">
        ${p.meu && p.status === 'ATIVO' ? `<button class="btn primario" data-acao="consumir" data-id="${p.id}">Usar</button>` : ''}
        ${p.meu && p.status !== 'DESCARTADO' ? `<button class="btn" data-acao="repor" data-id="${p.id}">Repor</button>` : ''}
        ${p.meu && p.status !== 'DESCARTADO' ? `<button class="btn perigo" data-acao="descartar" data-id="${p.id}" aria-label="Descartar ${e(p.nome)}">✕</button>` : ''}
      </div>
    </li>`;
  estado.cache = { produtos };
  return { html: `
    <section class="cartao">
      <details>
        <summary>Cadastrar produto</summary>
        <form data-form="produto">
          <label>Nome<input name="nome" required maxlength="80"></label>
          <div class="linha-form">
            <label>Quantidade<input name="quantidade" type="number" step="0.001" min="0.001" required></label>
            <label>Unidade<input name="unidade" required maxlength="12" placeholder="un, kg, L"></label>
          </div>
          <div class="linha-form">
            <label>Uso<select name="classificacao"><option value="COLETIVO">Coletivo</option><option value="INDIVIDUAL">Individual (só meu)</option></select></label>
            <label>Validade<input name="validade" type="date" min="${hojeLocal()}"></label>
          </div>
          <label>Quantidade mínima (só coletivo, opcional)<input name="quantidadeMinima" type="number" step="0.001" min="0"></label>
          <button class="btn primario cheio" type="submit">Cadastrar</button>
        </form>
      </details>
    </section>
    <section class="cartao">
      <h2>Em estoque</h2>
      ${ativos.length ? `<ul class="lista">${ativos.map(linha).join('')}</ul>` : '<p class="vazio">Nada cadastrado ainda. Comece pelo que está na geladeira.</p>'}
    </section>
    ${baixados.length ? `<section class="cartao"><details><summary>Vencidos e descartados (${baixados.length})</summary><ul class="lista">${baixados.map(linha).join('')}</ul></details></section>` : ''}
    <section class="cartao"><details><summary>Histórico de consumo</summary>
      ${consumos.length ? `<ul class="lista">${consumos.map((c) => `<li><div class="info"><strong>${e(c.produto)}</strong><span>${qtd(c.quantidade)} ${e(c.unidade)} · ${e(c.morador)} · ${dataBr(c.registradoEm)}</span></div></li>`).join('')}</ul>` : '<p class="vazio">Nenhum consumo registrado.</p>'}
    </details></section>` };
}

// ---------- lista de compras ----------
async function telaLista() {
  const itens = await api('GET', '/lista');
  const pendentes = itens.filter((i) => i.status === 'PENDENTE');
  const comprados = itens.filter((i) => i.status === 'COMPRADO');
  return { html: `
    <section class="cartao">
      <form data-form="item-lista" class="em-linha"><input name="nome" required maxlength="80" placeholder="Adicionar item…" aria-label="Novo item"><button class="btn primario" type="submit">Adicionar</button></form>
    </section>
    <section class="cartao">
      <h2>Para comprar</h2>
      ${pendentes.length ? `<ul class="lista">${pendentes.map((i) => `
        <li>
          <div class="info"><strong>${e(i.nome)} ${i.origem === 'AUTOMATICA' ? '<span class="selo marca">Estoque baixo</span>' : ''}</strong><span>${i.origem === 'AUTOMATICA' ? 'Incluído automaticamente' : `Por ${e(i.criadorNome)}`}</span></div>
          <div class="acoes">
            <button class="btn primario" data-acao="comprado" data-id="${i.id}">Comprei</button>
            ${souAdmin() || (i.origem === 'MANUAL' && i.criadoPor === eu().id) ? `<button class="btn perigo" data-acao="remover-item" data-id="${i.id}" aria-label="Remover ${e(i.nome)}">✕</button>` : ''}
          </div>
        </li>`).join('')}</ul>` : '<p class="vazio">Lista vazia. A despensa agradece.</p>'}
    </section>
    ${comprados.length ? `<section class="cartao"><h2>Comprados neste mês</h2><ul class="lista">${comprados.map((i) => `<li class="riscado"><div class="info"><strong>${e(i.nome)}</strong><span>${e(i.compradorNome ?? '')} · ${dataBr(i.compradoEm)}</span></div></li>`).join('')}</ul></section>` : ''}` };
}

// ---------- finanças ----------
const SELO_COMPRA = { PENDENTE: '<span class="selo alerta">Aguardando aprovação</span>', APROVADA: '<span class="selo ok">Aprovada</span>', REJEITADA: '<span class="selo perigo">Rejeitada</span>' };
const SELO_ACERTO = { PENDENTE: '<span class="selo alerta">A pagar</span>', PAGO: '<span class="selo ok">Pago</span>', SUBSTITUIDO: '<span class="selo">Substituído</span>' };

async function telaFinancas() {
  const [balanco, compras, casa] = await Promise.all([api('GET', '/balanco'), api('GET', '/compras'), api('GET', '/republica')]);
  const ativos = casa.membros.filter((m) => m.ativo);
  const hoje = hojeLocal();
  return { html: `
    <section class="cartao">
      <h2>Saldos</h2>
      <ul class="lista">${balanco.saldos.filter((s) => s.ativo || s.saldoCentavos !== 0).map((s) => `
        <li><div class="info"><strong>${e(s.nome)}${s.usuarioId === eu().id ? ' (você)' : ''}</strong><span>${s.saldoCentavos > 0 ? 'tem a receber' : s.saldoCentavos < 0 ? 'tem a pagar' : 'em dia'}</span></div>
        <span class="numero ${s.saldoCentavos > 0 ? 'positivo' : s.saldoCentavos < 0 ? 'negativo' : ''}">${moeda(s.saldoCentavos)}</span></li>`).join('')}
      </ul>
    </section>
    <section class="cartao">
      <h2>Quem deve para quem</h2>
      ${balanco.transferenciasSugeridas.length ? `<ul class="lista">${balanco.transferenciasSugeridas.map((t) => `<li><div class="info"><strong>${e(t.devedorNome)} → ${e(t.credorNome)}</strong></div><span>${moeda(t.valorCentavos)}</span></li>`).join('')}</ul>
        <p class="suave">Estes valores viram acertos quando o administrador fecha o mês.</p>` : '<p class="vazio">Ninguém deve nada a ninguém.</p>'}
    </section>
    <section class="cartao">
      <details>
        <summary>Registrar compra coletiva</summary>
        <form data-form="compra">
          <label>Descrição<input name="descricao" required maxlength="120" placeholder="Mercado da semana"></label>
          <div class="linha-form">
            <label>Valor total (R$)<input name="valor" type="number" step="0.01" min="0.01" required></label>
            <label>Data<input name="data" type="date" value="${hoje}" max="${hoje}" required></label>
          </div>
          <label>Quem pagou<select name="pagadorId">${ativos.map((m) => `<option value="${m.id}" ${m.id === eu().id ? 'selected' : ''}>${e(m.nome)}</option>`).join('')}</select></label>
          <p class="suave">${souAdmin() ? 'Como administrador, sua compra entra no rateio na hora.' : 'A compra entra no rateio depois que o administrador aprovar.'} O valor é dividido igualmente entre os ${ativos.length} moradores ativos.</p>
          <button class="btn primario cheio" type="submit">Registrar</button>
        </form>
      </details>
    </section>
    <section class="cartao">
      <h2>Compras</h2>
      ${compras.length ? `<ul class="lista">${compras.map((c) => `
        <li>
          <div class="info"><strong>${e(c.descricao)} · ${moeda(c.valorCentavos)}</strong>
            <span>${dataBr(c.data)} · pago por ${e(c.pagadorNome)} ${SELO_COMPRA[c.status]}${c.motivoRejeicao ? ` · ${e(c.motivoRejeicao)}` : ''}${c.cotas.length ? ` · ${moeda(Math.min(...c.cotas.map((x) => x.valorCentavos)))} por pessoa` : ''}</span></div>
          ${souAdmin() && c.status === 'PENDENTE' ? `<div class="acoes"><button class="btn primario" data-acao="aprovar" data-id="${c.id}">Aprovar</button><button class="btn perigo" data-acao="rejeitar" data-id="${c.id}">Rejeitar</button></div>` : ''}
        </li>`).join('')}</ul>` : '<p class="vazio">Nenhuma compra registrada.</p>'}
    </section>
    <section class="cartao">
      <div class="cabecalho"><h2>Fechamentos</h2>${souAdmin() ? '<button class="btn" data-acao="fechar-mes">Fechar mês</button>' : ''}</div>
      ${balanco.fechamentos.length ? balanco.fechamentos.map((f) => `
        <div class="dia"><h3>${e(f.periodo.split('-').reverse().join('/'))} · fechado por ${e(f.fechadoPor)}</h3>
          ${f.acertos.length ? `<ul class="lista">${f.acertos.map((a) => `
            <li><div class="info"><strong>${e(a.devedorNome)} → ${e(a.credorNome)}</strong><span>${moeda(a.valorCentavos)} ${SELO_ACERTO[a.status]}</span></div>
              ${a.status === 'PENDENTE' && a.devedorId !== eu().id && (a.credorId === eu().id || souAdmin()) ? `<button class="btn primario" data-acao="confirmar-acerto" data-id="${a.id}">Recebido</button>` : ''}
            </li>`).join('')}</ul>` : '<p class="suave">Sem acertos: todos estavam em dia.</p>'}
        </div>`).join('') : '<p class="vazio">Nenhum mês fechado ainda.</p>'}
    </section>` };
}

// ---------- escala ----------
const NOME_TURNO = { LIMPEZA: 'Limpeza', REFEICAO: 'Refeição' };

function turnoHtml(t, hoje, trocasAbertas) {
  const meu = t.responsavelId === eu().id;
  const emTroca = trocasAbertas.some((x) => x.turnoSolicitante.id === t.id || x.turnoSolicitado.id === t.id);
  const futuroOuHoje = t.data >= hoje;
  return `
    <li>
      <div class="info"><strong>${NOME_TURNO[t.tipo]} · ${e(t.responsavelNome)}${meu ? ' (você)' : ''}</strong>
        <span>${e(diaSemana(t.data))} ${t.status === 'CONCLUIDO' ? '<span class="selo ok">Feito</span>' : t.atrasado ? '<span class="selo perigo">Atrasado</span>' : ''}${emTroca ? ' <span class="selo alerta">Troca pedida</span>' : ''}</span></div>
      <div class="acoes">
        ${meu && t.status === 'PENDENTE' && t.data <= hoje ? `<button class="btn primario" data-acao="concluir-turno" data-id="${t.id}">Concluir</button>` : ''}
        ${!meu && t.status === 'PENDENTE' && futuroOuHoje && !emTroca ? `<button class="btn" data-acao="pedir-troca" data-id="${t.id}">Trocar</button>` : ''}
      </div>
    </li>`;
}

async function telaEscala() {
  const { turnos, trocas } = await api('GET', '/escala');
  const hoje = hojeLocal();
  estado.cache = { turnos, hoje };
  const dias = [...new Set(turnos.map((t) => t.data))];
  return { html: `
    ${trocas.length ? `<section class="cartao"><h2>Pedidos de troca</h2><ul class="lista">${trocas.map((x) => {
      const paraMim = x.solicitadoId === eu().id;
      return `<li><div class="info"><strong>${paraMim ? `${e(x.solicitanteNome)} quer trocar com você` : `Você pediu a ${e(x.solicitadoNome)}`}</strong>
        <span>${NOME_TURNO[x.turnoSolicitante.tipo]} de ${dataBr(x.turnoSolicitante.data)} ⇄ ${NOME_TURNO[x.turnoSolicitado.tipo]} de ${dataBr(x.turnoSolicitado.data)}</span></div>
        <div class="acoes">${paraMim
          ? `<button class="btn primario" data-acao="aceitar-troca" data-id="${x.id}">Aceitar</button><button class="btn perigo" data-acao="recusar-troca" data-id="${x.id}">Recusar</button>`
          : `<button class="btn" data-acao="cancelar-troca" data-id="${x.id}">Cancelar</button>`}</div></li>`;
    }).join('')}</ul></section>` : ''}
    ${souAdmin() ? `<section class="cartao"><details ${turnos.length ? '' : 'open'}><summary>Gerar escala</summary>
      <form data-form="escala">
        <div class="linha-form">
          <label>A partir de<input name="inicio" type="date" value="${hoje}" min="${hoje}" required></label>
          <label>Por quantos dias<input name="dias" type="number" min="1" max="60" value="14" required></label>
        </div>
        <label>Tarefas<select name="tipos"><option value="LIMPEZA,REFEICAO">Limpeza e refeição</option><option value="LIMPEZA">Só limpeza</option><option value="REFEICAO">Só refeição</option></select></label>
        <p class="suave">O rodízio continua de onde parou. Dias que já têm turno não são alterados.</p>
        <button class="btn primario cheio" type="submit">Gerar</button>
      </form></details></section>` : ''}
    <section class="cartao">
      <h2>Escala</h2>
      ${dias.length ? dias.map((d) => `<div class="dia ${d === hoje ? 'hoje' : ''}"><h3>${d === hoje ? 'Hoje · ' : ''}${e(diaSemana(d))}</h3><ul class="lista">${turnos.filter((t) => t.data === d).map((t) => turnoHtml(t, hoje, trocas)).join('')}</ul></div>`).join('')
        : `<p class="vazio">Ainda não há escala. ${souAdmin() ? 'Gere a primeira acima.' : 'Peça ao administrador para gerar.'}</p>`}
    </section>` };
}

// ---------- casa e avisos ----------
async function telaCasa() {
  const casa = await api('GET', '/republica');
  const auditoria = souAdmin() ? await api('GET', '/auditoria') : [];
  return { html: `
    <section class="cartao">
      <h2>${e(casa.nome)}</h2>
      ${casa.codigoConvite ? `<p class="suave">Código de convite para novos moradores:</p><div class="em-linha"><input readonly value="${e(casa.codigoConvite)}" aria-label="Código de convite"><button class="btn" data-acao="novo-convite">Gerar novo</button></div>` : ''}
    </section>
    <section class="cartao">
      <h2>Moradores</h2>
      <ul class="lista">${casa.membros.map((m) => `
        <li><div class="info"><strong>${e(m.nome)}${m.id === eu().id ? ' (você)' : ''}</strong><span>${m.perfil === 'ADMIN' ? '<span class="selo marca">Administrador</span>' : 'Morador'} ${m.ativo ? '' : '<span class="selo">Inativo</span>'}${m.email ? ` · ${e(m.email)}` : ''}</span></div>
          ${souAdmin() ? `<div class="acoes">
            <button class="btn" data-acao="perfil" data-id="${m.id}" data-perfil="${m.perfil === 'ADMIN' ? 'MORADOR' : 'ADMIN'}">${m.perfil === 'ADMIN' ? 'Tirar admin' : 'Tornar admin'}</button>
            <button class="btn ${m.ativo ? 'perigo' : ''}" data-acao="ativo" data-id="${m.id}" data-ativo="${m.ativo ? '0' : '1'}">${m.ativo ? 'Desativar' : 'Reativar'}</button></div>` : ''}
        </li>`).join('')}</ul>
    </section>
    ${souAdmin() ? `<section class="cartao"><details><summary>Auditoria</summary>${auditoria.length ? `<ul class="lista">${auditoria.map((a) => `<li><div class="info"><strong>${e(a.acao.replaceAll('_', ' ').toLowerCase())}</strong><span>${e(a.usuario)} · ${dataBr(a.criadoEm)} · ${e(a.detalhe)}</span></div></li>`).join('')}</ul>` : '<p class="vazio">Sem registros.</p>'}</details></section>` : ''}
    <button class="btn cheio" data-acao="sair">Sair</button>` };
}

async function telaAvisos() {
  const ns = await api('GET', '/notificacoes');
  return { html: `
    <section class="cartao">
      <div class="cabecalho"><h2>Avisos</h2>${ns.some((n) => !n.lida) ? '<button class="btn" data-acao="ler-todas">Marcar como lidos</button>' : ''}</div>
      ${ns.length ? `<ul class="lista">${ns.map((n) => `<li><div class="info"><strong>${n.lida ? '' : '<span class="selo marca">Novo</span> '}${e(n.mensagem)}</strong><span>${dataBr(n.criadoEm)}</span></div></li>`).join('')}</ul>` : '<p class="vazio">Nenhum aviso por enquanto.</p>'}
    </section>`, naoLidas: ns.filter((n) => !n.lida).length };
}

// ---------- desenho ----------
const TELAS = { painel: telaPainel, estoque: telaEstoque, lista: telaLista, financas: telaFinancas, escala: telaEscala, casa: telaCasa, avisos: telaAvisos };
let naoLidasAtual = 0;

async function desenhar() {
  if (!estado.sessao) return telaEntrada();
  try {
    const abertos = [...$app.querySelectorAll('details[open] > summary')].map((s) => s.textContent);
    const { html, naoLidas } = await TELAS[estado.aba]();
    if (naoLidas !== undefined) naoLidasAtual = naoLidas;
    if (!estado.sessao) return;
    $app.innerHTML = casca(html, naoLidasAtual);
    for (const s of $app.querySelectorAll('details > summary')) if (abertos.includes(s.textContent)) s.parentElement.open = true;
  } catch (erro) {
    if (estado.sessao) avisar(erro.message, true);
  }
}

// ---------- ações ----------
const ACOES = {
  'modo-entrada': (d) => { estado.modoEntrada = d.modo; telaEntrada(); },
  ir: (d) => { estado.aba = d.aba; window.scrollTo(0, 0); desenhar(); },
  sair: () => { guardarSessao(null); desenhar(); },

  async consumir(d) {
    const p = estado.cache.produtos.find((x) => x.id === Number(d.id));
    const r = await perguntar(`Usar ${p.nome}`, [{ nome: 'quantidade', rotulo: `Quantidade (${p.unidade}) — há ${qtd(p.quantidade)}`, tipo: 'number', passo: '0.001', min: '0.001', max: p.quantidade, valor: Math.min(1, p.quantidade) }], 'Dar baixa');
    if (r) agir(() => api('POST', `/produtos/${d.id}/consumo`, r), 'Baixa registrada.');
  },
  async repor(d) {
    const p = estado.cache.produtos.find((x) => x.id === Number(d.id));
    const r = await perguntar(`Repor ${p.nome}`, [
      { nome: 'quantidade', rotulo: `Quantidade comprada (${p.unidade})`, tipo: 'number', passo: '0.001', min: '0.001' },
      { nome: 'validade', rotulo: 'Validade do novo lote', tipo: 'date', min: hojeLocal(), obrigatorio: p.status !== 'ATIVO' && Boolean(p.validade) },
    ], 'Repor');
    if (r) agir(() => api('POST', `/produtos/${d.id}/reposicao`, r), 'Estoque atualizado.');
  },
  async descartar(d) {
    const p = estado.cache.produtos.find((x) => x.id === Number(d.id));
    const r = await perguntar(`Descartar ${p.nome}?`, [{ tipo: 'texto-fixo', rotulo: 'O produto sai do estoque definitivamente.' }], 'Descartar');
    if (r) agir(() => api('POST', `/produtos/${d.id}/descarte`, {}), 'Produto descartado.');
  },
  comprado: (d) => agir(() => api('POST', `/lista/${d.id}/comprado`, {})),
  'remover-item': (d) => agir(() => api('DELETE', `/lista/${d.id}`)),
  aprovar: (d) => agir(() => api('POST', `/compras/${d.id}/aprovacao`, {}), 'Compra aprovada e rateada.'),
  async rejeitar(d) {
    const r = await perguntar('Rejeitar compra', [{ nome: 'motivo', rotulo: 'Motivo (o morador será avisado)' }], 'Rejeitar');
    if (r) agir(() => api('POST', `/compras/${d.id}/rejeicao`, r), 'Compra rejeitada.');
  },
  async 'fechar-mes'() {
    const r = await perguntar('Fechar mês', [
      { nome: 'periodo', rotulo: 'Mês', tipo: 'month', valor: hojeLocal().slice(0, 7), max: hojeLocal().slice(0, 7) },
      { tipo: 'texto-fixo', rotulo: 'O mês deixa de aceitar compras e os saldos atuais viram acertos a pagar.' },
    ], 'Fechar');
    if (r) agir(() => api('POST', '/fechamentos', r), 'Mês fechado.');
  },
  'confirmar-acerto': (d) => agir(() => api('POST', `/acertos/${d.id}/confirmacao`, {}), 'Pagamento confirmado.'),
  'concluir-turno': (d) => agir(() => api('POST', `/turnos/${d.id}/conclusao`, {}), 'Turno concluído.'),
  async 'pedir-troca'(d) {
    const { turnos, hoje } = estado.cache;
    const meus = turnos.filter((t) => t.responsavelId === eu().id && t.status === 'PENDENTE' && t.data >= hoje);
    if (!meus.length) return avisar('Você não tem turno pendente para oferecer em troca.', true);
    const r = await perguntar('Propor troca', [{ nome: 'meuTurnoId', rotulo: 'Qual turno seu você oferece?', tipo: 'select', numerico: true, opcoes: meus.map((t) => [t.id, `${NOME_TURNO[t.tipo]} · ${diaSemana(t.data)}`]) }], 'Pedir troca');
    if (r) agir(() => api('POST', '/trocas', { meuTurnoId: r.meuTurnoId, outroTurnoId: Number(d.id) }), 'Pedido enviado.');
  },
  'aceitar-troca': (d) => agir(() => api('POST', `/trocas/${d.id}/aceite`, {}), 'Troca feita.'),
  'recusar-troca': (d) => agir(() => api('POST', `/trocas/${d.id}/recusa`, {})),
  'cancelar-troca': (d) => agir(() => api('POST', `/trocas/${d.id}/cancelamento`, {})),
  'novo-convite': () => agir(() => api('POST', '/republica/convite', {}), 'Novo código gerado. O anterior deixou de valer.'),
  perfil: (d) => agir(async () => {
    await api('PATCH', `/moradores/${d.id}`, { perfil: d.perfil });
    if (Number(d.id) === eu().id) guardarSessao({ ...estado.sessao, usuario: await api('GET', '/eu') });
  }),
  ativo: (d) => agir(() => api('PATCH', `/moradores/${d.id}`, { ativo: d.ativo === '1' })),
  'ler-todas': () => agir(() => api('POST', '/notificacoes/lidas', {})),
};

const FORMULARIOS = {
  produto: (f) => api('POST', '/produtos', {
    nome: f.nome.value, quantidade: Number(f.quantidade.value), unidade: f.unidade.value, classificacao: f.classificacao.value,
    validade: f.validade.value || null, quantidadeMinima: f.quantidadeMinima.value === '' ? null : Number(f.quantidadeMinima.value),
  }),
  'item-lista': (f) => api('POST', '/lista', { nome: f.nome.value }),
  compra: (f) => api('POST', '/compras', {
    descricao: f.descricao.value, valorCentavos: Math.round(Number(f.valor.value) * 100), pagadorId: Number(f.pagadorId.value), data: f.data.value,
  }),
  escala: (f) => api('POST', '/escala', { inicio: f.inicio.value, dias: Number(f.dias.value), tipos: f.tipos.value.split(',') }),
};

document.addEventListener('click', (ev) => {
  const alvo = ev.target.closest('[data-acao]');
  if (alvo && ACOES[alvo.dataset.acao]) ACOES[alvo.dataset.acao](alvo.dataset);
});

document.addEventListener('submit', async (ev) => {
  const nome = ev.target.dataset?.form;
  if (!FORMULARIOS[nome]) return;
  ev.preventDefault();
  const botao = ev.target.querySelector('button[type=submit]');
  botao.disabled = true;
  const elementos = ev.target.elements;
  const deuCerto = await agir(() => FORMULARIOS[nome](elementos), 'Salvo.');
  if (!deuCerto) botao.disabled = false;
});

desenhar();
