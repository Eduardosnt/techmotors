// Admin Pages

async function renderAdminDashboard(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/admin/dashboard');

  let recentesHtml = data.recentes.map(r => `
    <tr>
      <td>${fmtData(r.data_hora)}</td>
      <td>${escapeHtml(r.cliente)}</td>
      <td>${escapeHtml(r.nome_fantasia)}</td>
      <td>${escapeHtml(r.servico)}</td>
      <td>${badgeStatus(r.status)}</td>
    </tr>`).join('');

  el.innerHTML = `
    <h3 class="mb-4"><i class="bi bi-speedometer2 text-tm-primary"></i> Dashboard Administrativo</h3>
    <div class="row g-3 mb-4">
      <div class="col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Clientes</div><h3>${data.total_clientes}</h3></div></div>
      <div class="col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Oficinas Ativas</div><h3 class="text-success">${data.total_oficinas}</h3></div></div>
      <div class="col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Pendentes</div><h3 class="text-warning">${data.pendentes}</h3><a href="#admin-pendentes" class="small">ver</a></div></div>
      <div class="col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Agendamentos</div><h3>${data.total_agendamentos}</h3></div></div>
      <div class="col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Concluídos</div><h3 class="text-tm-primary">${data.concluidos}</h3></div></div>
      <div class="col-md-2"><div class="card p-3 text-center"><div class="text-muted small">Avaliações</div><h3>${data.total_avaliacoes}</h3></div></div>
    </div>
    <div class="card p-4">
      <h5>Agendamentos recentes</h5>
      <table class="table table-sm">
        <thead><tr><th>Data</th><th>Cliente</th><th>Oficina</th><th>Serviço</th><th>Status</th></tr></thead>
        <tbody>${recentesHtml}</tbody>
      </table>
    </div>`;
}

async function renderAdminPendentes(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/admin/pendentes');

  if (data.pendentes.length === 0) {
    el.innerHTML = `<h3 class="mb-4"><i class="bi bi-hourglass-split text-tm-primary"></i> Oficinas Aguardando Aprovação</h3>
      <div class="alert alert-success">Nenhuma oficina pendente.</div>`;
    return;
  }

  let html = data.pendentes.map(o => `
    <div class="card p-3 mb-3">
      <div class="row align-items-center">
        <div class="col-md-8">
          <h5>${escapeHtml(o.nome_fantasia)}</h5>
          <div><strong>Razão Social:</strong> ${escapeHtml(o.razao_social || '')}</div>
          <div><strong>CNPJ:</strong> ${escapeHtml(o.cnpj)}</div>
          <div><strong>Endereço:</strong> ${escapeHtml(o.logradouro || '')} ${escapeHtml(o.numero || '')}, ${escapeHtml(o.bairro || '')} — ${escapeHtml(o.cidade || '')}/${escapeHtml(o.uf || '')}</div>
          <div><strong>Responsável:</strong> ${escapeHtml(o.nome)} · ${escapeHtml(o.email)} · ${escapeHtml(o.telefone || '')}</div>
          <div class="text-muted small">Cadastrada em ${fmtData(o.criado_em)}</div>
        </div>
        <div class="col-md-4 text-end">
          <a href="#admin-oficina?id=${o.usuario_id}" class="btn btn-outline-primary mb-1"><i class="bi bi-eye"></i> Detalhes</a>
          <button class="btn btn-success mb-1" onclick="aprovarOficina(${o.usuario_id})"><i class="bi bi-check"></i> Aprovar</button>
          <button class="btn btn-outline-danger mb-1" onclick="rejeitarOficina(${o.usuario_id})"><i class="bi bi-x"></i> Rejeitar</button>
        </div>
      </div>
    </div>`).join('');

  el.innerHTML = `<h3 class="mb-4"><i class="bi bi-hourglass-split text-tm-primary"></i> Oficinas Aguardando Aprovação (${data.pendentes.length})</h3>${html}`;
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

async function renderAdminOficina(el, params) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const id = params.get('id');
  const data = await api(`/admin/oficina/${id}`);
  const o = data.oficina;

  let servicosHtml = data.servicos.length > 0
    ? '<ul>' + data.servicos.map(s => `<li>${escapeHtml(s.nome)} — ${fmtMoney(s.preco)} · ${s.duracao_minutos} min</li>`).join('') + '</ul>'
    : '<p class="text-muted">Nenhum serviço cadastrado.</p>';

  let acoesHtml = '';
  if (o.status_aprovacao === 'pendente') {
    acoesHtml = `<hr><div class="d-flex gap-2">
      <button class="btn btn-success btn-lg" onclick="aprovarOficina(${o.usuario_id})"><i class="bi bi-check"></i> Aprovar</button>
      <button class="btn btn-outline-danger btn-lg" onclick="rejeitarOficina(${o.usuario_id})"><i class="bi bi-x"></i> Rejeitar</button>
    </div>`;
  } else if (o.status_aprovacao === 'rejeitada') {
    acoesHtml = `<div class="alert alert-danger mt-3"><strong>Motivo da rejeição:</strong> ${escapeHtml(o.motivo_rejeicao || '')}</div>`;
  }

  el.innerHTML = `
    <a href="#admin-pendentes" class="text-decoration-none mb-3 d-inline-block"><i class="bi bi-arrow-left"></i> Voltar</a>
    <div class="card p-4">
      <h3>${escapeHtml(o.nome_fantasia)} ${badgeStatus(o.status_aprovacao)}</h3>
      <hr>
      <div class="row">
        <div class="col-md-6">
          <h5>Dados da Empresa</h5>
          <p><strong>Razão Social:</strong> ${escapeHtml(o.razao_social || '')}<br>
          <strong>CNPJ:</strong> ${escapeHtml(o.cnpj)}<br>
          <strong>Endereço:</strong> ${escapeHtml(o.logradouro || '')} ${escapeHtml(o.numero || '')}, ${escapeHtml(o.bairro || '')}<br>
          ${escapeHtml(o.cidade || '')}/${escapeHtml(o.uf || '')} — CEP ${escapeHtml(o.cep || '')}</p>
        </div>
        <div class="col-md-6">
          <h5>Responsável</h5>
          <p><strong>Nome:</strong> ${escapeHtml(o.nome)}<br>
          <strong>E-mail:</strong> ${escapeHtml(o.email)}<br>
          <strong>Telefone:</strong> ${escapeHtml(o.telefone || '')}<br>
          <strong>Cadastrada em:</strong> ${fmtData(o.criado_em)}</p>
        </div>
      </div>
      <h5>Serviços cadastrados (${data.servicos.length})</h5>
      ${servicosHtml}
      ${acoesHtml}
    </div>`;
}

async function renderAdminUsuarios(el, params) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const tipoFiltro = (params && params.get('tipo')) || '';
  const data = await api(`/admin/usuarios${tipoFiltro ? '?tipo=' + tipoFiltro : ''}`);

  let tabsHtml = [
    { k: '', n: 'Todos' }, { k: 'cliente', n: 'Clientes' }, { k: 'oficina', n: 'Oficinas' }
  ].map(t => `<li class="nav-item"><a class="nav-link ${tipoFiltro === t.k ? 'active bg-tm-primary' : ''}" href="#admin-usuarios${t.k ? '?tipo=' + t.k : ''}">${t.n}</a></li>`).join('');

  let usersHtml = data.usuarios.map(u => `
    <tr>
      <td>${escapeHtml(u.nome)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td><span class="badge bg-secondary">${u.tipo}</span></td>
      <td>${badgeStatus(u.status)}</td>
      <td>${new Date(u.criado_em).toLocaleDateString('pt-BR')}</td>
      <td>
        <select class="form-select form-select-sm d-inline-block w-auto" onchange="alterarStatusUsuario(${u.id}, this.value)">
          ${['ativo','inativo','bloqueado'].map(s => `<option value="${s}" ${u.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('');

  el.innerHTML = `
    <h3 class="mb-3"><i class="bi bi-people text-tm-primary"></i> Gestão de Usuários</h3>
    <ul class="nav nav-pills mb-3">${tabsHtml}</ul>
    <div class="card p-3">
      <table class="table table-hover">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Tipo</th><th>Status</th><th>Cadastrado</th><th>Ação</th></tr></thead>
        <tbody>${usersHtml}</tbody>
      </table>
    </div>`;
}

async function alterarStatusUsuario(id, status) {
  try {
    await api(`/admin/usuarios/${id}/status`, { method: 'PUT', body: { status } });
    showToast('Status atualizado.', 'success');
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}
