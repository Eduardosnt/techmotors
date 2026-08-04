// Oficina Pages

async function renderOficinaAguardando(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/oficina/status');
  const o = data.oficina;
  if (o && o.status_aprovacao === 'aprovada') { navegarPara('oficina-agenda'); return; }

  el.innerHTML = `
    <div class="row justify-content-center"><div class="col-md-6"><div class="card p-4 text-center">
      <i class="bi bi-hourglass-split" style="font-size:4rem;color:var(--tm-accent)"></i>
      <h3 class="mt-3">Aguardando aprovação</h3>
      <p class="text-muted">Seu cadastro está em análise pelo administrador.</p>
      ${o && o.status_aprovacao === 'rejeitada' ? `<div class="alert alert-danger"><strong>Cadastro rejeitado.</strong><br>${escapeHtml(o.motivo_rejeicao || '')}</div>` : ''}
      <div class="text-start mt-4">
        <strong>Dados enviados:</strong>
        <ul>
          <li>Nome fantasia: ${escapeHtml(o?.nome_fantasia || '')}</li>
          <li>CNPJ: ${escapeHtml(o?.cnpj || '')}</li>
        </ul>
      </div>
    </div></div></div>`;
}

async function renderOficinaAgenda(el, params) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const inicio = params ? params.get('inicio') : null;
  const url = inicio ? `/oficina/agenda?inicio=${inicio}` : '/oficina/agenda';
  const data = await api(url);

  const diasNome = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(data.inicio + 'T12:00:00');
    d.setDate(d.getDate() + i);
    dias.push(d.toISOString().split('T')[0]);
  }

  // Build grid
  const grid = {};
  data.agendamentos.forEach(a => {
    const dt = new Date(a.data_hora);
    const day = dt.toISOString().split('T')[0];
    const hour = String(dt.getHours()).padStart(2, '0');
    if (!grid[day]) grid[day] = {};
    grid[day][hour] = a;
  });

  let thead = '<th>Horário</th>' + dias.map(d => {
    const dt = new Date(d + 'T12:00:00');
    return `<th>${diasNome[dt.getDay()]}<br><small>${dt.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</small></th>`;
  }).join('');

  let tbody = '';
  for (let h = 8; h < 19; h++) {
    const hStr = String(h).padStart(2, '0');
    tbody += `<tr><td><strong>${hStr}:00</strong></td>`;
    dias.forEach(d => {
      const a = grid[d] && grid[d][hStr];
      tbody += '<td>';
      if (a) {
        tbody += `<div class="agenda-slot agenda-${a.status}" title="${escapeHtml(a.cliente_nome)} - ${escapeHtml(a.servico)}">
          <strong>${escapeHtml(a.servico)}</strong><br><small>${escapeHtml(a.cliente_nome)} (${escapeHtml(a.placa)})</small></div>`;
      }
      tbody += '</td>';
    });
    tbody += '</tr>';
  }

  const prevWeek = new Date(data.inicio + 'T12:00:00');
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(data.inicio + 'T12:00:00');
  nextWeek.setDate(nextWeek.getDate() + 7);

  const inicioFmt = new Date(data.inicio + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
  const fimFmt = new Date(data.fim + 'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});

  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap">
      <h3 class="mb-0"><i class="bi bi-calendar-week text-tm-primary"></i> Agenda da Semana</h3>
      <div>
        <a class="btn btn-sm btn-outline-secondary" href="#oficina-agenda?inicio=${prevWeek.toISOString().split('T')[0]}"><i class="bi bi-chevron-left"></i></a>
        <span class="mx-2">${inicioFmt} — ${fimFmt}</span>
        <a class="btn btn-sm btn-outline-secondary" href="#oficina-agenda?inicio=${nextWeek.toISOString().split('T')[0]}"><i class="bi bi-chevron-right"></i></a>
        <a class="btn btn-sm btn-tm-primary ms-2" href="#oficina-agenda">Hoje</a>
      </div>
    </div>
    ${data.pendentes > 0 ? `<div class="alert alert-warning d-flex justify-content-between align-items-center">
      <span><i class="bi bi-bell-fill"></i> Você tem <strong>${data.pendentes}</strong> solicitação(ões) pendente(s)</span>
      <a href="#oficina-solicitacoes" class="btn btn-sm btn-tm-accent">Ver solicitações</a>
    </div>` : ''}
    <div class="card p-3">
      <div class="agenda-wrapper">
        <table class="agenda-tabela"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
      </div>
      <div class="mt-3 small">
        <span class="badge agenda-confirmado">Confirmado</span>
        <span class="badge agenda-solicitado">Solicitado</span>
      </div>
    </div>`;
}

async function renderOficinaSolicitacoes(el, params) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const statusFiltro = (params && params.get('status')) || 'solicitado';
  const data = await api(`/oficina/solicitacoes?status=${statusFiltro}`);

  const tabs = ['solicitado','confirmado','concluido','recusado','cancelado'];
  const tabNames = ['Solicitadas','Confirmadas','Concluídas','Recusadas','Canceladas'];
  let tabsHtml = tabs.map((k, i) =>
    `<li class="nav-item"><a class="nav-link ${statusFiltro === k ? 'active bg-tm-primary' : ''}" href="#oficina-solicitacoes?status=${k}">${tabNames[i]}</a></li>`
  ).join('');

  let agsHtml = data.agendamentos.length === 0
    ? '<div class="alert alert-info">Nenhum agendamento nesta categoria.</div>'
    : data.agendamentos.map(a => {
      let acoes = '';
      if (a.status === 'solicitado') {
        acoes = `<button class="btn btn-sm btn-success" onclick="acaoSolicitacao(${a.id},'confirmar')"><i class="bi bi-check"></i> Confirmar</button>
          <button class="btn btn-sm btn-outline-danger" onclick="acaoSolicitacao(${a.id},'recusar')"><i class="bi bi-x"></i> Recusar</button>`;
      } else if (a.status === 'confirmado') {
        acoes = `<button class="btn btn-sm btn-tm-primary" onclick="acaoSolicitacao(${a.id},'concluir')"><i class="bi bi-check-all"></i> Concluído</button>
          <button class="btn btn-sm btn-outline-danger" onclick="acaoSolicitacao(${a.id},'cancelar')"><i class="bi bi-x-circle"></i> Cancelar</button>`;
      }
      return `<div class="card p-3 mb-3"><div class="row g-2">
        <div class="col-md-8">
          <h5 class="mb-1"><i class="bi bi-calendar text-tm-primary"></i> ${fmtData(a.data_hora)}</h5>
          <div><i class="bi bi-person"></i> <strong>${escapeHtml(a.cliente_nome)}</strong> ${a.cliente_tel ? '<span class="text-muted small">· ' + escapeHtml(a.cliente_tel) + '</span>' : ''}</div>
          <div><i class="bi bi-car-front"></i> ${escapeHtml(a.marca)} ${escapeHtml(a.modelo)} ${a.ano} — ${escapeHtml(a.placa)}</div>
          <div><i class="bi bi-tools"></i> ${escapeHtml(a.servico)} · ~${a.duracao_minutos} min · ${fmtMoney(a.valor_estimado)}</div>
        </div>
        <div class="col-md-4 d-flex flex-column align-items-md-end gap-2">
          ${badgeStatus(a.status)}
          <div class="d-flex flex-wrap gap-1">${acoes}</div>
        </div>
      </div></div>`;
    }).join('');

  el.innerHTML = `
    <h3 class="mb-3"><i class="bi bi-inbox text-tm-primary"></i> Solicitações de Agendamento</h3>
    <ul class="nav nav-pills mb-3">${tabsHtml}</ul>
    ${agsHtml}`;
}

async function acaoSolicitacao(id, acao) {
  let motivo = '';
  if (acao === 'recusar') {
    motivo = prompt('Motivo da recusa:');
    if (motivo === null) return;
  } else if (acao === 'cancelar') {
    motivo = prompt('Motivo do cancelamento (opcional):') || '';
  } else {
    if (!confirm(`Deseja ${acao} este agendamento?`)) return;
  }
  try {
    await api(`/oficina/solicitacoes/${id}/acao`, { method: 'POST', body: { acao, motivo } });
    showToast('Status atualizado.', 'success');
    await renderOficinaSolicitacoes(document.getElementById('app-content'), new URLSearchParams(window.location.hash.split('?')[1] || ''));
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

async function renderOficinaDisponibilidade(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/oficina/disponibilidade');
  const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const atual = {};
  data.disponibilidade.forEach(d => atual[d.dia_semana] = d);

  let rows = dias.map((nome, i) => {
    const a = atual[i];
    return `<tr>
      <td><input type="checkbox" id="disp-ativo-${i}" ${a ? 'checked' : ''}></td>
      <td>${nome}</td>
      <td><input type="time" id="disp-inicio-${i}" value="${a ? a.hora_inicio.substring(0,5) : '08:00'}" class="form-control" style="max-width:120px"></td>
      <td><input type="time" id="disp-fim-${i}" value="${a ? a.hora_fim.substring(0,5) : '18:00'}" class="form-control" style="max-width:120px"></td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <h3 class="mb-4"><i class="bi bi-clock text-tm-primary"></i> Disponibilidade Semanal</h3>
    <div class="card p-4">
      <form id="form-disp">
        <table class="table"><thead><tr><th></th><th>Dia</th><th>Início</th><th>Fim</th></tr></thead><tbody>${rows}</tbody></table>
        <button class="btn btn-tm-primary">Salvar Disponibilidade</button>
      </form>
    </div>`;

  document.getElementById('form-disp').addEventListener('submit', async (e) => {
    e.preventDefault();
    const diasData = dias.map((_, i) => ({
      dia_semana: i,
      ativo: document.getElementById(`disp-ativo-${i}`).checked,
      hora_inicio: document.getElementById(`disp-inicio-${i}`).value,
      hora_fim: document.getElementById(`disp-fim-${i}`).value
    }));
    try {
      await api('/oficina/disponibilidade', { method: 'PUT', body: { dias: diasData } });
      showToast('Disponibilidade atualizada.', 'success');
    } catch (err) { showToast(err.error || 'Erro', 'error'); }
  });
}

async function renderOficinaBloqueios(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/oficina/bloqueios');

  let bloqueiosHtml = data.bloqueios.length === 0
    ? '<p class="text-muted">Nenhum bloqueio cadastrado.</p>'
    : data.bloqueios.map(b => `
      <div class="d-flex justify-content-between align-items-center border-bottom py-2">
        <div>
          <strong>${fmtData(b.data_inicio)}</strong> até <strong>${fmtData(b.data_fim)}</strong>
          ${b.motivo ? `<div class="text-muted small">${escapeHtml(b.motivo)}</div>` : ''}
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="excluirBloqueio(${b.id})"><i class="bi bi-trash"></i></button>
      </div>`).join('');

  el.innerHTML = `
    <h3 class="mb-4"><i class="bi bi-ban text-tm-primary"></i> Bloquear Datas</h3>
    <div class="card p-4 mb-4">
      <h5>Novo bloqueio</h5>
      <form id="form-bloqueio" class="row g-3">
        <div class="col-md-3"><label class="form-label">Início</label><input type="datetime-local" id="bloq-inicio" class="form-control" required></div>
        <div class="col-md-3"><label class="form-label">Fim</label><input type="datetime-local" id="bloq-fim" class="form-control" required></div>
        <div class="col-md-4"><label class="form-label">Motivo</label><input id="bloq-motivo" class="form-control" placeholder="Ex: Feriado"></div>
        <div class="col-md-2 d-flex align-items-end"><button class="btn btn-tm-primary w-100">Bloquear</button></div>
      </form>
    </div>
    <div class="card p-4"><h5>Bloqueios cadastrados</h5>${bloqueiosHtml}</div>`;

  document.getElementById('form-bloqueio').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/oficina/bloqueios', { method: 'POST', body: {
        data_inicio: document.getElementById('bloq-inicio').value,
        data_fim: document.getElementById('bloq-fim').value,
        motivo: document.getElementById('bloq-motivo').value
      }});
      showToast('Datas bloqueadas.', 'success');
      await renderOficinaBloqueios(el);
    } catch (err) { showToast(err.error || 'Erro', 'error'); }
  });
}

async function excluirBloqueio(id) {
  if (!confirm('Remover bloqueio?')) return;
  try {
    await api(`/oficina/bloqueios/${id}`, { method: 'DELETE' });
    showToast('Bloqueio removido.', 'success');
    await renderOficinaBloqueios(document.getElementById('app-content'));
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

async function renderOficinaServicos(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/oficina/servicos');

  let catOptions = data.catalogo.map(c => `<option value="${c.id}">${escapeHtml(c.nome)} (${escapeHtml(c.categoria)})</option>`).join('');

  let meusHtml = data.meus_servicos.map(s => `
    <tr>
      <td>${escapeHtml(s.servico_nome)}</td>
      <td>${escapeHtml(s.preco_modalidade)}</td>
      <td>${fmtMoney(s.preco)}</td>
      <td>${s.duracao_minutos} min</td>
      <td><button class="btn btn-sm btn-outline-danger" onclick="excluirServico(${s.id})"><i class="bi bi-trash"></i></button></td>
    </tr>`).join('');

  el.innerHTML = `
    <h3 class="mb-3"><i class="bi bi-tools text-tm-primary"></i> Serviços Oferecidos</h3>
    <div class="card p-4 mb-4">
      <h5>Adicionar serviço do catálogo</h5>
      <form id="form-servico" class="row g-2">
        <div class="col-md-4"><label class="form-label small">Serviço</label><select id="srv-id" class="form-select" required><option value="">Selecione...</option>${catOptions}</select></div>
        <div class="col-md-3"><label class="form-label small">Modalidade</label><select id="srv-mod" class="form-select"><option value="fixo">Fixo</option><option value="a_partir_de" selected>A partir de</option><option value="orcamento">Sob orçamento</option></select></div>
        <div class="col-md-2"><label class="form-label small">Preço (R$)</label><input type="number" step="0.01" id="srv-preco" class="form-control"></div>
        <div class="col-md-2"><label class="form-label small">Duração (min)</label><input type="number" id="srv-dur" class="form-control" value="60" required></div>
        <div class="col-md-1 d-flex align-items-end"><button class="btn btn-tm-primary w-100">+</button></div>
      </form>
    </div>
    <div class="card p-3">
      <table class="table"><thead><tr><th>Serviço</th><th>Modalidade</th><th>Preço</th><th>Duração</th><th></th></tr></thead><tbody>${meusHtml}</tbody></table>
    </div>`;

  document.getElementById('form-servico').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/oficina/servicos', { method: 'POST', body: {
        servico_id: parseInt(document.getElementById('srv-id').value),
        preco_modalidade: document.getElementById('srv-mod').value,
        preco: document.getElementById('srv-preco').value || null,
        duracao: parseInt(document.getElementById('srv-dur').value)
      }});
      showToast('Serviço adicionado.', 'success');
      await renderOficinaServicos(el);
    } catch (err) { showToast(err.error || 'Erro', 'error'); }
  });
}

async function excluirServico(id) {
  if (!confirm('Remover serviço?')) return;
  try {
    await api(`/oficina/servicos/${id}`, { method: 'DELETE' });
    showToast('Serviço removido.', 'success');
    await renderOficinaServicos(document.getElementById('app-content'));
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

async function renderOficinaPerfil(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/oficina/perfil');
  const o = data.perfil;

  el.innerHTML = `
    <h3 class="mb-4"><i class="bi bi-building text-tm-primary"></i> Perfil da Oficina</h3>
    <div class="card p-4">
      <form id="form-perfil" class="row g-3">
        <div class="col-md-6"><label class="form-label">Nome responsável</label><input id="prf-nome" class="form-control" value="${escapeHtml(o.nome)}"></div>
        <div class="col-md-6"><label class="form-label">Telefone</label><input id="prf-tel" class="form-control" value="${escapeHtml(o.telefone || '')}"></div>
        <div class="col-md-6"><label class="form-label">Nome Fantasia</label><input id="prf-nf" class="form-control" value="${escapeHtml(o.nome_fantasia)}"></div>
        <div class="col-md-6"><label class="form-label">Razão Social</label><input id="prf-rs" class="form-control" value="${escapeHtml(o.razao_social || '')}"></div>
        <div class="col-md-8"><label class="form-label">Logradouro</label><input id="prf-log" class="form-control" value="${escapeHtml(o.logradouro || '')}"></div>
        <div class="col-md-4"><label class="form-label">Número</label><input id="prf-num" class="form-control" value="${escapeHtml(o.numero || '')}"></div>
        <div class="col-md-5"><label class="form-label">Bairro</label><input id="prf-bairro" class="form-control" value="${escapeHtml(o.bairro || '')}"></div>
        <div class="col-md-4"><label class="form-label">Cidade</label><input id="prf-cidade" class="form-control" value="${escapeHtml(o.cidade || '')}"></div>
        <div class="col-md-1"><label class="form-label">UF</label><input id="prf-uf" class="form-control" value="${escapeHtml(o.uf || '')}" maxlength="2"></div>
        <div class="col-md-2"><label class="form-label">CEP</label><input id="prf-cep" class="form-control" value="${escapeHtml(o.cep || '')}"></div>
        <div class="col-md-6"><label class="form-label">E-mail</label><input class="form-control" value="${escapeHtml(o.email)}" disabled></div>
        <div class="col-md-6"><label class="form-label">CNPJ</label><input class="form-control" value="${escapeHtml(o.cnpj)}" disabled></div>
        <div class="col-12"><button class="btn btn-tm-primary">Salvar Alterações</button></div>
      </form>
    </div>`;

  document.getElementById('form-perfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/oficina/perfil', { method: 'PUT', body: {
        nome: document.getElementById('prf-nome').value,
        telefone: document.getElementById('prf-tel').value,
        nome_fantasia: document.getElementById('prf-nf').value,
        razao_social: document.getElementById('prf-rs').value,
        logradouro: document.getElementById('prf-log').value,
        numero: document.getElementById('prf-num').value,
        bairro: document.getElementById('prf-bairro').value,
        cidade: document.getElementById('prf-cidade').value,
        uf: document.getElementById('prf-uf').value,
        cep: document.getElementById('prf-cep').value
      }});
      showToast('Perfil atualizado.', 'success');
    } catch (err) { showToast(err.error || 'Erro', 'error'); }
  });
}

async function renderOficinaMetricas(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/oficina/metricas');

  el.innerHTML = `
    <h3 class="mb-4"><i class="bi bi-graph-up text-tm-primary"></i> Painel de Métricas</h3>
    <div class="row g-3 mb-4">
      <div class="col-md-3"><div class="card p-3 text-center"><div class="text-muted small">Solicitados</div><h2 class="text-warning">${data.por_status.solicitado || 0}</h2></div></div>
      <div class="col-md-3"><div class="card p-3 text-center"><div class="text-muted small">Confirmados</div><h2 class="text-tm-primary">${data.por_status.confirmado || 0}</h2></div></div>
      <div class="col-md-3"><div class="card p-3 text-center"><div class="text-muted small">Concluídos</div><h2 class="text-success">${data.por_status.concluido || 0}</h2></div></div>
      <div class="col-md-3"><div class="card p-3 text-center"><div class="text-muted small">Atendimentos no mês</div><h2>${data.mes_total}</h2></div></div>
    </div>
    <div class="row g-3">
      <div class="col-md-6"><div class="card p-4"><h5>Nota média</h5><h1 class="estrelas">${parseFloat(data.nota_media).toFixed(1)} ★</h1><p class="text-muted">${data.total_avaliacoes} avaliações</p></div></div>
      <div class="col-md-6"><div class="card p-4"><h5>Receita estimada (concluídos)</h5><h1 class="text-success">${fmtMoney(data.receita)}</h1><p class="text-muted small">Soma dos valores estimados</p></div></div>
    </div>`;
}
