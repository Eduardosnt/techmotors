// Admin Pages — Enhanced v2.0

async function renderAdminDashboard(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/admin/dashboard');

  const mesesNome = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const porMesHtml = data.por_mes.reverse().map(m => {
    const [ano, mes] = m.mes.split('-');
    return `<div class="d-flex justify-content-between align-items-center py-2 border-bottom" style="border-color:var(--tm-gray-100)!important">
      <span class="small fw-medium">${mesesNome[parseInt(mes)-1]}/${ano}</span>
      <div><span class="badge bg-primary bg-opacity-10 text-primary me-1">${m.total} agend.</span>
      <span class="badge bg-success bg-opacity-10 text-success">${m.concluidos} concl.</span></div>
    </div>`;
  }).join('');

  const topHtml = data.top_oficinas.map((o, i) => `
    <div class="d-flex justify-content-between align-items-center py-2 border-bottom" style="border-color:var(--tm-gray-100)!important">
      <div><span class="fw-bold me-2">${i+1}º</span>${escapeHtml(o.nome_fantasia)}</div>
      <div class="estrelas small">${parseFloat(o.nota_media).toFixed(1)} ★ <span class="text-muted">(${o.total_avaliacoes})</span></div>
    </div>`).join('');

  let recentesHtml = data.recentes.map(r => `
    <tr>
      <td class="small">${fmtData(r.data_hora)}</td>
      <td class="small">${escapeHtml(r.cliente)}</td>
      <td class="small">${escapeHtml(r.nome_fantasia)}</td>
      <td class="small">${escapeHtml(r.servico)}</td>
      <td>${badgeStatus(r.status)}</td>
    </tr>`).join('');

  el.innerHTML = `
    <h3 class="mb-4"><i class="bi bi-speedometer2 text-tm-primary"></i> Dashboard Administrativo</h3>
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Clientes</div><h3>${data.total_clientes}</h3></div></div>
      <div class="col-6 col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Oficinas</div><h3 class="text-success">${data.total_oficinas}</h3></div></div>
      <div class="col-6 col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Pendentes</div><h3 class="text-warning">${data.pendentes}</h3></div></div>
      <div class="col-6 col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Agendamentos</div><h3>${data.total_agendamentos}</h3></div></div>
      <div class="col-6 col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Taxa Conclusão</div><h3 class="text-tm-primary">${data.taxa_conclusao}%</h3></div></div>
      <div class="col-6 col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Receita Total</div><h3 class="text-success" style="font-size:1.1rem">${fmtMoney(data.receita_total)}</h3></div></div>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-md-6"><div class="card p-4">
        <h6 class="fw-bold mb-3"><i class="bi bi-bar-chart text-tm-primary"></i> Agendamentos por Mês</h6>
        ${porMesHtml || '<p class="text-muted small">Sem dados</p>'}
      </div></div>
      <div class="col-md-6"><div class="card p-4">
        <h6 class="fw-bold mb-3"><i class="bi bi-trophy text-warning"></i> Top Oficinas</h6>
        ${topHtml || '<p class="text-muted small">Sem dados</p>'}
        <a href="#admin-ranking" class="small mt-2 d-block">Ver ranking completo →</a>
      </div></div>
    </div>

    <div class="card p-4">
      <h6 class="fw-bold mb-3"><i class="bi bi-clock-history text-tm-primary"></i> Agendamentos Recentes</h6>
      <div class="table-responsive">
        <table class="table table-sm table-hover">
          <thead><tr><th>Data</th><th>Cliente</th><th>Oficina</th><th>Serviço</th><th>Status</th></tr></thead>
          <tbody>${recentesHtml}</tbody>
        </table>
      </div>
    </div>`;
}

// ─── APROVAÇÕES ─────────────────────────────────────
async function renderAdminPendentes(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/admin/pendentes');

  if (data.pendentes.length === 0) {
    el.innerHTML = `<h3 class="mb-4"><i class="bi bi-hourglass-split text-tm-primary"></i> Oficinas Aguardando Aprovação</h3>
      <div class="alert alert-success"><i class="bi bi-check-circle"></i> Nenhuma oficina pendente.</div>`;
    return;
  }

  let html = data.pendentes.map(o => `
    <div class="card p-3 mb-3">
      <div class="row align-items-center">
        <div class="col-md-8">
          <h5 class="fw-bold">${escapeHtml(o.nome_fantasia)}</h5>
          <div class="small"><strong>CNPJ:</strong> ${escapeHtml(o.cnpj)} · <strong>Razão:</strong> ${escapeHtml(o.razao_social || '—')}</div>
          <div class="small"><strong>Endereço:</strong> ${escapeHtml(o.logradouro || '')} ${escapeHtml(o.numero || '')}, ${escapeHtml(o.bairro || '')} — ${escapeHtml(o.cidade || '')}/${escapeHtml(o.uf || '')}</div>
          <div class="small"><strong>Responsável:</strong> ${escapeHtml(o.nome)} · ${escapeHtml(o.email)} · ${escapeHtml(o.telefone || '')}</div>
          <div class="text-muted small mt-1">Cadastrada em ${fmtData(o.criado_em)}</div>
        </div>
        <div class="col-md-4 text-end mt-2 mt-md-0">
          <a href="#admin-oficina?id=${o.usuario_id}" class="btn btn-outline-primary btn-sm mb-1"><i class="bi bi-eye"></i> Detalhes</a>
          <button class="btn btn-success btn-sm mb-1" onclick="aprovarOficina(${o.usuario_id})"><i class="bi bi-check"></i> Aprovar</button>
          <button class="btn btn-outline-danger btn-sm mb-1" onclick="rejeitarOficina(${o.usuario_id})"><i class="bi bi-x"></i> Rejeitar</button>
        </div>
      </div>
    </div>`).join('');

  el.innerHTML = `<h3 class="mb-4"><i class="bi bi-hourglass-split text-tm-primary"></i> Aprovações (${data.pendentes.length})</h3>${html}`;
}

async function aprovarOficina(id) {
  if (!confirm('Aprovar esta oficina?')) return;
  try {
    await api(`/admin/aprovar/${id}`, { method: 'POST' });
    showToast('Oficina aprovada!', 'success');
    await renderAdminPendentes(document.getElementById('app-content'));
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

async function rejeitarOficina(id) {
  const motivo = prompt('Motivo da rejeição:');
  if (motivo === null) return;
  try {
    await api(`/admin/rejeitar/${id}`, { method: 'POST', body: { motivo } });
    showToast('Oficina rejeitada.', 'warning');
    await renderAdminPendentes(document.getElementById('app-content'));
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

// ─── OFICINA DETALHES ───────────────────────────────
async function renderAdminOficina(el, params) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const id = params.get('id');
  const data = await api(`/admin/oficina/${id}`);
  const o = data.oficina;

  let servicosHtml = data.servicos.length > 0
    ? `<div class="row g-2">${data.servicos.map(s => `<div class="col-md-6"><div class="rounded-3 p-2" style="background:var(--tm-gray-50)"><strong class="small">${escapeHtml(s.nome)}</strong> · ${fmtMoney(s.preco)} · ${s.duracao_minutos}min</div></div>`).join('')}</div>`
    : '<p class="text-muted small">Nenhum serviço cadastrado.</p>';

  let acoesHtml = '';
  if (o.status_aprovacao === 'pendente') {
    acoesHtml = `<div class="d-flex gap-2 mt-3">
      <button class="btn btn-success" onclick="aprovarOficina(${o.usuario_id})"><i class="bi bi-check"></i> Aprovar</button>
      <button class="btn btn-outline-danger" onclick="rejeitarOficina(${o.usuario_id})"><i class="bi bi-x"></i> Rejeitar</button>
    </div>`;
  }

  el.innerHTML = `
    <div class="d-flex align-items-center gap-2 mb-3">
      <button class="btn btn-outline-secondary btn-sm" onclick="history.back()"><i class="bi bi-arrow-left"></i></button>
      <span class="small text-muted">Detalhes da Oficina</span>
    </div>
    <div class="card p-4">
      <div class="d-flex justify-content-between align-items-start flex-wrap">
        <div><h3 class="fw-bold">${escapeHtml(o.nome_fantasia)}</h3>${badgeStatus(o.status_aprovacao)}</div>
        <div class="text-end"><div class="estrelas">${parseFloat(o.nota_media||0).toFixed(1)} ★</div><small class="text-muted">${o.total_avaliacoes} avaliações</small></div>
      </div>
      <hr>
      <div class="row g-3">
        <div class="col-md-6">
          <h6 class="fw-bold">Dados da Empresa</h6>
          <p class="small mb-1"><strong>CNPJ:</strong> ${escapeHtml(o.cnpj)}</p>
          <p class="small mb-1"><strong>Razão Social:</strong> ${escapeHtml(o.razao_social || '—')}</p>
          <p class="small mb-1"><strong>Endereço:</strong> ${escapeHtml(o.logradouro||'')} ${escapeHtml(o.numero||'')}, ${escapeHtml(o.bairro||'')} — ${escapeHtml(o.cidade||'')}/${escapeHtml(o.uf||'')}</p>
          <p class="small mb-1"><strong>CEP:</strong> ${escapeHtml(o.cep||'')}</p>
        </div>
        <div class="col-md-6">
          <h6 class="fw-bold">Responsável</h6>
          <p class="small mb-1"><strong>Nome:</strong> ${escapeHtml(o.nome)}</p>
          <p class="small mb-1"><strong>E-mail:</strong> ${escapeHtml(o.email)}</p>
          <p class="small mb-1"><strong>Telefone:</strong> ${escapeHtml(o.telefone||'—')}</p>
          <p class="small mb-1"><strong>Cadastro:</strong> ${fmtData(o.criado_em)}</p>
        </div>
      </div>
      <hr>
      <h6 class="fw-bold">Serviços (${data.servicos.length})</h6>
      ${servicosHtml}
      ${acoesHtml}
    </div>`;
}

// ─── USUÁRIOS (com busca) ───────────────────────────
async function renderAdminUsuarios(el, params) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const tipoFiltro = (params && params.get('tipo')) || '';
  const busca = (params && params.get('busca')) || '';
  const statusFiltro = (params && params.get('status')) || '';
  const url = `/admin/usuarios?tipo=${tipoFiltro}&busca=${encodeURIComponent(busca)}&status=${statusFiltro}`;
  const data = await api(url);

  const tabs = [
    { k: '', n: 'Todos' }, { k: 'cliente', n: 'Clientes' }, { k: 'oficina', n: 'Oficinas' }
  ].map(t => `<li class="nav-item"><a class="nav-link ${tipoFiltro === t.k ? 'active bg-tm-primary' : ''}" href="#admin-usuarios${t.k ? '?tipo=' + t.k : ''}">${t.n}</a></li>`).join('');

  let usersHtml = data.usuarios.map(u => `
    <tr style="cursor:pointer" onclick="navegarPara('admin-usuario', {id:'${u.id}'})">
      <td class="small">
        ${u.foto_url ? `<img src="${u.foto_url}" class="rounded-circle me-1" style="width:24px;height:24px;object-fit:cover">` : '<i class="bi bi-person-circle me-1"></i>'}
        ${escapeHtml(u.nome)}
      </td>
      <td class="small">${escapeHtml(u.email)}</td>
      <td><span class="badge bg-secondary">${u.tipo}</span></td>
      <td>${badgeStatus(u.status)}</td>
      <td class="small">${new Date(u.criado_em).toLocaleDateString('pt-BR')}</td>
      <td onclick="event.stopPropagation()">
        <select class="form-select form-select-sm d-inline-block w-auto" onchange="alterarStatusUsuario(${u.id}, this.value)">
          ${['ativo','inativo','bloqueado'].map(s => `<option value="${s}" ${u.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('');

  el.innerHTML = `
    <h3 class="mb-3"><i class="bi bi-people text-tm-primary"></i> Gestão de Usuários</h3>
    <ul class="nav nav-pills mb-3">${tabs}</ul>
    <div class="card p-3 mb-3">
      <form id="form-busca-usuarios" class="d-flex gap-2">
        <input type="text" id="busca-usuario-q" class="form-control" placeholder="Buscar por nome ou e-mail..." value="${escapeHtml(busca)}">
        <button class="btn btn-tm-primary"><i class="bi bi-search"></i></button>
      </form>
    </div>
    <div class="card p-3">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Tipo</th><th>Status</th><th>Cadastro</th><th>Ação</th></tr></thead>
          <tbody>${usersHtml || '<tr><td colspan="6" class="text-center text-muted">Nenhum resultado</td></tr>'}</tbody>
        </table>
      </div>
      <div class="small text-muted mt-2">${data.usuarios.length} usuário(s) · Clique na linha para ver detalhes</div>
    </div>`;

  document.getElementById('form-busca-usuarios').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('busca-usuario-q').value;
    navegarPara('admin-usuarios', { tipo: tipoFiltro, busca: q });
  });
}

async function alterarStatusUsuario(id, status) {
  try {
    await api(`/admin/usuarios/${id}/status`, { method: 'PUT', body: { status } });
    showToast('Status atualizado.', 'success');
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

// ─── DETALHE DO USUÁRIO ─────────────────────────────
async function renderAdminUsuarioDetalhe(el, params) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const id = params.get('id');
  const data = await api(`/admin/usuario/${id}`);
  const u = data.user;
  const extra = data.extra;

  let conteudoExtra = '';
  if (u.tipo === 'cliente') {
    const veiculosHtml = (extra.veiculos || []).map(v =>
      `<span class="badge bg-light text-dark me-1 mb-1">${escapeHtml(v.marca)} ${escapeHtml(v.modelo)} · ${escapeHtml(v.placa)}</span>`
    ).join('') || '<span class="text-muted small">Nenhum</span>';

    const agHtml = (extra.agendamentos || []).slice(0, 10).map(a => `
      <tr><td class="small">${fmtData(a.data_hora)}</td><td class="small">${escapeHtml(a.nome_fantasia)}</td><td class="small">${escapeHtml(a.servico)}</td><td>${badgeStatus(a.status)}</td></tr>
    `).join('');

    conteudoExtra = `
      <div class="row g-3">
        <div class="col-md-6"><div class="card p-3"><h6 class="fw-bold small">CPF</h6><p class="mb-0">${escapeHtml(extra.cpf || '—')}</p></div></div>
        <div class="col-md-6"><div class="card p-3"><h6 class="fw-bold small">Veículos</h6><div>${veiculosHtml}</div></div></div>
      </div>
      <div class="card p-3 mt-3">
        <h6 class="fw-bold small">Agendamentos (${(extra.agendamentos||[]).length})</h6>
        ${agHtml ? `<table class="table table-sm mb-0"><thead><tr><th>Data</th><th>Oficina</th><th>Serviço</th><th>Status</th></tr></thead><tbody>${agHtml}</tbody></table>` : '<p class="text-muted small mb-0">Nenhum</p>'}
      </div>
      ${(extra.avaliacoes||[]).length ? `<div class="card p-3 mt-3"><h6 class="fw-bold small">Avaliações feitas (${extra.avaliacoes.length})</h6>${extra.avaliacoes.map(a => `<div class="small"><span class="estrelas">${'★'.repeat(a.qtd_estrelas)}</span> ${escapeHtml(a.nome_fantasia)}</div>`).join('')}</div>` : ''}`;
  } else if (u.tipo === 'oficina' && extra.oficina) {
    const o = extra.oficina;
    const agHtml = (extra.agendamentos || []).slice(0, 10).map(a => `
      <tr><td class="small">${fmtData(a.data_hora)}</td><td class="small">${escapeHtml(a.cliente_nome)}</td><td class="small">${escapeHtml(a.servico)}</td><td>${badgeStatus(a.status)}</td></tr>
    `).join('');

    conteudoExtra = `
      <div class="card p-3"><h6 class="fw-bold small">Dados da Oficina</h6>
        <p class="small mb-1"><strong>${escapeHtml(o.nome_fantasia)}</strong> · CNPJ: ${escapeHtml(o.cnpj)}</p>
        <p class="small mb-1">${escapeHtml(o.logradouro||'')} ${escapeHtml(o.numero||'')}, ${escapeHtml(o.bairro||'')} — ${escapeHtml(o.cidade||'')}/${escapeHtml(o.uf||'')}</p>
        <p class="small mb-0">Nota: <span class="estrelas">${parseFloat(o.nota_media||0).toFixed(1)} ★</span> (${o.total_avaliacoes} avaliações) · Status: ${badgeStatus(o.status_aprovacao)}</p>
      </div>
      <div class="card p-3 mt-3">
        <h6 class="fw-bold small">Serviços (${(extra.servicos||[]).length})</h6>
        ${(extra.servicos||[]).map(s => `<span class="badge bg-light text-dark me-1 mb-1">${escapeHtml(s.nome)} · ${escapeHtml(s.categoria)}</span>`).join('') || '<span class="text-muted small">Nenhum</span>'}
      </div>
      <div class="card p-3 mt-3">
        <h6 class="fw-bold small">Agendamentos (${(extra.agendamentos||[]).length})</h6>
        ${agHtml ? `<table class="table table-sm mb-0"><thead><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Status</th></tr></thead><tbody>${agHtml}</tbody></table>` : '<p class="text-muted small mb-0">Nenhum</p>'}
      </div>`;
  }

  el.innerHTML = `
    <div class="d-flex align-items-center gap-2 mb-3">
      <button class="btn btn-outline-secondary btn-sm" onclick="history.back()"><i class="bi bi-arrow-left"></i></button>
      <span class="small text-muted">Detalhes do Usuário</span>
    </div>
    <div class="card p-4 mb-3">
      <div class="d-flex align-items-center gap-3">
        <div class="rounded-circle overflow-hidden d-flex align-items-center justify-content-center" style="width:64px;height:64px;background:var(--tm-primary-50)">
          ${u.foto_url ? `<img src="${u.foto_url}" style="width:100%;height:100%;object-fit:cover">` : '<i class="bi bi-person-fill" style="font-size:2rem;color:var(--tm-primary)"></i>'}
        </div>
        <div class="flex-grow-1">
          <h4 class="fw-bold mb-0">${escapeHtml(u.nome)}</h4>
          <div class="small text-muted">${escapeHtml(u.email)} · ${escapeHtml(u.telefone || '—')}</div>
          <div>${badgeStatus(u.status)} <span class="badge bg-secondary ms-1">${u.tipo}</span></div>
        </div>
        <div>
          <select class="form-select form-select-sm" onchange="alterarStatusUsuario(${u.id}, this.value)">
            ${['ativo','inativo','bloqueado'].map(s => `<option value="${s}" ${u.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="small text-muted mt-2">Cadastrado em ${fmtData(u.criado_em)}</div>
    </div>
    ${conteudoExtra}`;
}

// ─── CATÁLOGO DE SERVIÇOS ───────────────────────────
async function renderAdminCatalogo(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/admin/catalogo');

  // Agrupar por categoria
  const categorias = {};
  data.servicos.forEach(s => {
    if (!categorias[s.categoria]) categorias[s.categoria] = [];
    categorias[s.categoria].push(s);
  });

  let catalogoHtml = Object.entries(categorias).map(([cat, servicos]) => `
    <div class="mb-3">
      <h6 class="fw-bold small text-uppercase text-muted">${escapeHtml(cat)}</h6>
      ${servicos.map(s => `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom" style="border-color:var(--tm-gray-100)!important">
          <div>
            <span class="${!s.ativo ? 'text-decoration-line-through text-muted' : ''}">${escapeHtml(s.nome)}</span>
            ${s.descricao ? `<span class="small text-muted ms-1">(${escapeHtml(s.descricao)})</span>` : ''}
            ${!s.ativo ? '<span class="badge bg-secondary ms-1">Inativo</span>' : ''}
          </div>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-primary" onclick="editarServicoCatalogo(${s.id}, '${escapeHtml(s.nome)}', '${escapeHtml(s.categoria)}', '${escapeHtml(s.descricao||'')}', ${s.ativo})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="excluirServicoCatalogo(${s.id})"><i class="bi bi-trash3"></i></button>
          </div>
        </div>`).join('')}
    </div>`).join('');

  el.innerHTML = `
    <h3 class="mb-4"><i class="bi bi-journal-text text-tm-primary"></i> Catálogo de Serviços</h3>
    <div class="card p-4 mb-3">
      <h6 class="fw-bold mb-3">Adicionar Serviço</h6>
      <form id="form-add-catalogo" class="row g-2 align-items-end">
        <div class="col-md-3"><label class="form-label">Nome *</label><input id="cat-nome" class="form-control" required></div>
        <div class="col-md-3"><label class="form-label">Categoria *</label><input id="cat-categoria" class="form-control" list="cat-lista" required>
          <datalist id="cat-lista">${Object.keys(categorias).map(c => `<option value="${c}">`).join('')}</datalist></div>
        <div class="col-md-4"><label class="form-label">Descrição</label><input id="cat-descricao" class="form-control"></div>
        <div class="col-md-2"><button class="btn btn-tm-primary w-100"><i class="bi bi-plus"></i> Adicionar</button></div>
      </form>
    </div>
    <div class="card p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="fw-bold mb-0">Serviços cadastrados</h6>
        <span class="text-muted small">${data.servicos.length} serviço(s)</span>
      </div>
      ${catalogoHtml}
    </div>`;

  document.getElementById('form-add-catalogo').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/admin/catalogo', { method: 'POST', body: {
        nome: document.getElementById('cat-nome').value.trim(),
        categoria: document.getElementById('cat-categoria').value.trim(),
        descricao: document.getElementById('cat-descricao').value.trim()
      }});
      showToast('Serviço adicionado!', 'success');
      await renderAdminCatalogo(el);
    } catch (err) { showToast(err.error || 'Erro', 'error'); }
  });
}

async function editarServicoCatalogo(id, nome, categoria, descricao, ativo) {
  const novoNome = prompt('Nome do serviço:', nome);
  if (!novoNome) return;
  const novaCat = prompt('Categoria:', categoria);
  if (!novaCat) return;
  const novaDesc = prompt('Descrição:', descricao);
  const novoAtivo = confirm('Serviço ativo?') ? 1 : 0;
  try {
    await api(`/admin/catalogo/${id}`, { method: 'PUT', body: { nome: novoNome, categoria: novaCat, descricao: novaDesc || '', ativo: novoAtivo } });
    showToast('Catálogo atualizado!', 'success');
    await renderAdminCatalogo(document.getElementById('app-content'));
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

async function excluirServicoCatalogo(id) {
  if (!confirm('Remover este serviço do catálogo? Oficinas que o utilizam perderão a referência.')) return;
  try {
    await api(`/admin/catalogo/${id}`, { method: 'DELETE' });
    showToast('Serviço removido.', 'info');
    await renderAdminCatalogo(document.getElementById('app-content'));
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

// ─── RANKING DE OFICINAS ────────────────────────────
async function renderAdminRanking(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/admin/ranking');

  const porNotaHtml = data.por_nota.map((o, i) => `
    <tr onclick="navegarPara('admin-oficina', {id:'${o.usuario_id}'})" style="cursor:pointer">
      <td><span class="fw-bold">${i+1}º</span></td>
      <td>${escapeHtml(o.nome_fantasia)}</td>
      <td><span class="estrelas">${parseFloat(o.nota_media).toFixed(1)} ★</span></td>
      <td>${o.total_avaliacoes}</td>
      <td class="small text-muted">${escapeHtml(o.cidade||'')}/${escapeHtml(o.uf||'')}</td>
    </tr>`).join('');

  const porVolumeHtml = data.por_volume.map((o, i) => `
    <tr onclick="navegarPara('admin-oficina', {id:'${o.usuario_id}'})" style="cursor:pointer">
      <td><span class="fw-bold">${i+1}º</span></td>
      <td>${escapeHtml(o.nome_fantasia)}</td>
      <td>${o.total_agendamentos}</td>
      <td class="text-success">${o.concluidos}</td>
      <td class="fw-bold">${fmtMoney(o.receita)}</td>
    </tr>`).join('');

  el.innerHTML = `
    <h3 class="mb-4"><i class="bi bi-trophy text-warning"></i> Ranking de Oficinas</h3>
    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card p-4">
          <h6 class="fw-bold mb-3"><i class="bi bi-star-fill text-warning"></i> Por Avaliação</h6>
          <div class="table-responsive">
            <table class="table table-sm table-hover">
              <thead><tr><th>#</th><th>Oficina</th><th>Nota</th><th>Avaliações</th><th>Local</th></tr></thead>
              <tbody>${porNotaHtml || '<tr><td colspan="5" class="text-muted text-center">Sem dados</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card p-4">
          <h6 class="fw-bold mb-3"><i class="bi bi-graph-up-arrow text-tm-primary"></i> Por Volume</h6>
          <div class="table-responsive">
            <table class="table table-sm table-hover">
              <thead><tr><th>#</th><th>Oficina</th><th>Agendamentos</th><th>Concluídos</th><th>Receita</th></tr></thead>
              <tbody>${porVolumeHtml || '<tr><td colspan="5" class="text-muted text-center">Sem dados</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── MODERAÇÃO DE AVALIAÇÕES ────────────────────────
async function renderAdminAvaliacoes(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/admin/avaliacoes');

  const avalsHtml = data.avaliacoes.map(a => `
    <div class="card p-3 mb-2 ${a.ocultada ? 'opacity-50' : ''}">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <span class="estrelas">${'★'.repeat(a.qtd_estrelas)}${'☆'.repeat(5-a.qtd_estrelas)}</span>
            <strong class="small">${escapeHtml(a.cliente_nome)}</strong>
            <span class="small text-muted">→</span>
            <span class="small fw-medium">${escapeHtml(a.nome_fantasia)}</span>
          </div>
          ${a.comentario ? `<p class="mb-0 small">"${escapeHtml(a.comentario)}"</p>` : '<p class="mb-0 small text-muted"><em>Sem comentário</em></p>'}
          <small class="text-muted">${new Date(a.criado_em).toLocaleDateString('pt-BR')}</small>
          ${a.ocultada ? ' <span class="badge bg-danger">Ocultada</span>' : ''}
        </div>
        <div>
          ${a.ocultada
            ? `<button class="btn btn-sm btn-outline-success" onclick="restaurarAvaliacao(${a.id})"><i class="bi bi-eye"></i> Restaurar</button>`
            : `<button class="btn btn-sm btn-outline-danger" onclick="ocultarAvaliacao(${a.id})"><i class="bi bi-eye-slash"></i> Ocultar</button>`}
        </div>
      </div>
    </div>`).join('');

  const ocultadas = data.avaliacoes.filter(a => a.ocultada).length;

  el.innerHTML = `
    <h3 class="mb-4"><i class="bi bi-chat-square-quote text-tm-primary"></i> Moderação de Avaliações</h3>
    <div class="d-flex justify-content-between align-items-center mb-3">
      <span class="text-muted small">${data.avaliacoes.length} avaliação(ões) · ${ocultadas} ocultada(s)</span>
    </div>
    ${avalsHtml || '<div class="empty-state"><i class="bi bi-chat-square-text"></i><p>Nenhuma avaliação</p></div>'}`;
}

async function ocultarAvaliacao(id) {
  if (!confirm('Ocultar esta avaliação? Ela não aparecerá mais para os clientes.')) return;
  try {
    await api(`/admin/avaliacoes/${id}/ocultar`, { method: 'POST', body: {} });
    showToast('Avaliação ocultada.', 'info');
    await renderAdminAvaliacoes(document.getElementById('app-content'));
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

async function restaurarAvaliacao(id) {
  try {
    await api(`/admin/avaliacoes/${id}/restaurar`, { method: 'POST', body: {} });
    showToast('Avaliação restaurada.', 'success');
    await renderAdminAvaliacoes(document.getElementById('app-content'));
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

// ─── NOTIFICAÇÕES DO ADMIN ──────────────────────────
async function renderAdminNotificacoes(el) {
  el.innerHTML = '<div class="loading">Carregando notificações...</div>';

  try {
    const data = await api('/admin/notificacoes');

    if (data.nao_lidas > 0) {
      api('/admin/notificacoes/ler', { method: 'POST', body: {} }).then(() => checkNotifBadgeAdmin());
    }

    if (!data.notificacoes.length) {
      el.innerHTML = `
        <h5 class="fw-bold mb-4"><i class="bi bi-bell text-tm-primary"></i> Notificações</h5>
        <div class="empty-state">
          <i class="bi bi-bell-slash"></i>
          <p>Nenhuma notificação</p>
          <small class="text-muted">Você será notificado quando novas oficinas se cadastrarem.</small>
        </div>`;
      return;
    }

    const iconesTipo = {
      nova_oficina: { icon: 'bi-building-fill-add', color: 'var(--tm-accent)' },
      novo_usuario: { icon: 'bi-person-plus-fill', color: 'var(--tm-primary)' }
    };

    const notifHtml = data.notificacoes.map(n => {
      const icone = iconesTipo[n.tipo] || { icon: 'bi-info-circle-fill', color: 'var(--tm-primary)' };
      const agora = new Date();
      const data_notif = new Date(n.criado_em);
      const diff = Math.floor((agora - data_notif) / 1000);
      let tempo = '';
      if (diff < 60) tempo = 'Agora';
      else if (diff < 3600) tempo = Math.floor(diff / 60) + ' min';
      else if (diff < 86400) tempo = Math.floor(diff / 3600) + 'h';
      else if (diff < 604800) tempo = Math.floor(diff / 86400) + 'd';
      else tempo = data_notif.toLocaleDateString('pt-BR');

      return `
      <div class="card p-3 mb-2 ${n.lida ? 'opacity-75' : ''}" style="${!n.lida ? 'border-left:3px solid ' + icone.color : ''}">
        <div class="d-flex gap-3 align-items-start">
          <i class="bi ${icone.icon}" style="font-size:1.3rem;color:${icone.color};margin-top:2px"></i>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center">
              <strong class="small">${escapeHtml(n.titulo)}</strong>
              <small class="text-muted">${tempo}</small>
            </div>
            <p class="mb-0 small text-muted">${escapeHtml(n.mensagem)}</p>
            ${n.link ? `<a href="${n.link}" class="small">Ver →</a>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="fw-bold mb-0"><i class="bi bi-bell text-tm-primary"></i> Notificações</h5>
        <span class="text-muted small">${data.notificacoes.length} notificação(ões)</span>
      </div>
      ${notifHtml}`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">Erro: ${escapeHtml(err.message || err.error || 'Erro')}</div>`;
  }
}
