// Oficina Pages

// ─── MENSAGENS DA OFICINA ───────────────────────────
async function renderOficinaMensagens(el) {
  el.innerHTML = '<div class="loading">Carregando mensagens...</div>';

  try {
    const data = await api('/chat/conversas');

    if (!data.conversas.length) {
      el.innerHTML = `
        <h5 class="fw-bold mb-4"><i class="bi bi-chat-left-text text-tm-primary"></i> Mensagens</h5>
        <div class="empty-state">
          <i class="bi bi-chat-square-text"></i>
          <p>Nenhuma mensagem ainda</p>
          <small class="text-muted">Quando clientes pedirem para falar com um atendente, as conversas aparecerão aqui.</small>
        </div>`;
      return;
    }

    const conversasHtml = data.conversas.map(c => `
      <div class="card p-3 mb-2 conversa-item" style="cursor:pointer" data-id="${c.id}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${escapeHtml(c.cliente_nome)}</strong>
            <span class="badge bg-${c.status === 'atendente' ? 'success' : 'secondary'} ms-2">${c.status === 'atendente' ? 'Ativa' : 'Encerrada'}</span>
          </div>
          <small class="text-muted">${c.ultima_msg_em ? new Date(c.ultima_msg_em).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''}</small>
        </div>
        ${c.ultima_msg ? `<div class="small text-muted mt-1 text-truncate" style="max-width:300px">${escapeHtml(c.ultima_msg)}</div>` : ''}
      </div>`).join('');

    el.innerHTML = `
      <h5 class="fw-bold mb-4"><i class="bi bi-chat-left-text text-tm-primary"></i> Mensagens</h5>
      <div class="row g-3">
        <div class="col-md-4">
          <div id="lista-conversas">${conversasHtml}</div>
        </div>
        <div class="col-md-8">
          <div id="painel-conversa" class="card p-0 overflow-hidden" style="height:500px;display:flex;flex-direction:column">
            <div class="d-flex align-items-center justify-content-center h-100 text-muted">
              <div class="text-center">
                <i class="bi bi-chat-square-text" style="font-size:3rem;opacity:.3"></i>
                <p class="mt-2 small">Selecione uma conversa</p>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    // Click handler for conversations
    document.querySelectorAll('.conversa-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.conversa-item').forEach(i => i.style.borderColor = '');
        item.style.borderColor = 'var(--tm-primary)';
        abrirConversaOficina(parseInt(item.dataset.id));
      });
    });
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">Erro: ${escapeHtml(err.message || err.error || 'Erro')}</div>`;
  }
}

let oficinaChatPolling = null;

async function abrirConversaOficina(conversaId) {
  const painel = document.getElementById('painel-conversa');
  painel.innerHTML = '<div class="chat-loading"><span class="spinner-border spinner-border-sm"></span> Carregando...</div>';

  try {
    const data = await api(`/chat/mensagens/${conversaId}`);
    const isAtiva = data.conversa.status === 'atendente';

    const msgsHtml = data.mensagens.map(m => {
      let avatar = '';
      let cssClass = '';
      if (m.remetente === 'cliente') { avatar = '<i class="bi bi-person"></i>'; cssClass = 'chat-msg-cliente'; }
      else if (m.remetente === 'bot') { avatar = '<i class="bi bi-robot"></i>'; cssClass = 'chat-msg-bot'; }
      else { avatar = '<i class="bi bi-building"></i>'; cssClass = 'chat-msg-oficina'; }

      const html = escapeHtml(m.conteudo).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      const time = new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return `<div class="chat-msg ${cssClass}">
        <div class="chat-msg-avatar">${avatar}</div>
        <div class="chat-msg-content">
          <div class="chat-msg-bubble">${html}</div>
          <div class="chat-msg-time">${time}</div>
        </div>
      </div>`;
    }).join('');

    painel.innerHTML = `
      <div class="chat-messages" id="oficina-chat-msgs" style="flex:1;overflow-y:auto;padding:1rem">${msgsHtml}</div>
      ${isAtiva ? `
      <div class="chat-input-area" style="border-top:1px solid var(--tm-gray-200);padding:.75rem 1rem">
        <form id="oficina-chat-form" class="d-flex gap-2">
          <input type="text" id="oficina-chat-input" class="form-control" placeholder="Responder ao cliente..." autocomplete="off">
          <button type="submit" class="btn btn-tm-primary chat-send-btn"><i class="bi bi-send-fill"></i></button>
        </form>
      </div>` : `
      <div class="text-center py-3 bg-light small text-muted">Conversa encerrada</div>`}`;

    // Scroll to bottom
    const msgs = document.getElementById('oficina-chat-msgs');
    msgs.scrollTop = msgs.scrollHeight;

    // Send handler
    document.getElementById('oficina-chat-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('oficina-chat-input');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';

      try {
        await api('/chat/mensagem', { method: 'POST', body: { conversa_id: conversaId, conteudo: msg } });
        abrirConversaOficina(conversaId);
      } catch (err) {
        showToast('Erro ao enviar mensagem', 'error');
      }
    });

    // Polling for new messages
    if (oficinaChatPolling) clearInterval(oficinaChatPolling);
    if (isAtiva) {
      oficinaChatPolling = setInterval(async () => {
        try {
          const fresh = await api(`/chat/mensagens/${conversaId}`);
          const container = document.getElementById('oficina-chat-msgs');
          if (container && fresh.mensagens.length > container.querySelectorAll('.chat-msg').length) {
            abrirConversaOficina(conversaId);
          }
        } catch(e) {}
      }, 5000);
    }
  } catch (err) {
    painel.innerHTML = `<div class="alert alert-danger m-3">Erro ao carregar conversa</div>`;
  }
}

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

async function verDetalheAgendamento(id) {
  const modal = new bootstrap.Modal(document.getElementById('modal-detalhe-agenda'));
  modal.show();
  const body = document.getElementById('modal-detalhe-agenda-body');
  body.innerHTML = '<div class="loading">Carregando...</div>';

  try {
    const data = await api(`/oficina/agendamento/${id}`);
    const a = data.agendamento;
    const dataFmt = new Date(a.data_hora).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const horaFmt = new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    body.innerHTML = `
      <div class="mb-3 d-flex justify-content-between align-items-center">
        <span class="small text-muted">#${String(a.id).padStart(5, '0')}</span>
        ${badgeStatus(a.status)}
      </div>

      <div class="rounded-3 p-3 mb-3" style="background:var(--tm-gray-50)">
        <h6 class="fw-bold small mb-2"><i class="bi bi-person"></i> Cliente</h6>
        <div class="fw-semibold">${escapeHtml(a.cliente_nome)}</div>
        ${a.cliente_telefone ? `<div class="small text-muted"><i class="bi bi-telephone"></i> ${escapeHtml(a.cliente_telefone)}</div>` : ''}
        <div class="small text-muted"><i class="bi bi-envelope"></i> ${escapeHtml(a.cliente_email)}</div>
      </div>

      <div class="rounded-3 p-3 mb-3" style="background:var(--tm-gray-50)">
        <h6 class="fw-bold small mb-2"><i class="bi bi-tools"></i> Serviço</h6>
        <div class="fw-semibold">${escapeHtml(a.servico)}</div>
        <div class="small text-muted">${escapeHtml(a.categoria)} · ~${a.duracao_minutos} min</div>
        <div class="fw-bold mt-1">${fmtMoney(a.valor_estimado)}</div>
      </div>

      <div class="rounded-3 p-3 mb-3" style="background:var(--tm-gray-50)">
        <h6 class="fw-bold small mb-2"><i class="bi bi-car-front"></i> Veículo</h6>
        <div class="fw-semibold">${escapeHtml(a.marca)} ${escapeHtml(a.modelo)} ${a.ano || ''}</div>
        <div class="placa-badge mt-1">${escapeHtml(a.placa)}</div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-6">
          <div class="small text-muted">Data</div>
          <div class="fw-semibold">${dataFmt}</div>
        </div>
        <div class="col-6">
          <div class="small text-muted">Horário</div>
          <div class="fw-semibold">${horaFmt}</div>
        </div>
      </div>

      ${a.status === 'solicitado' ? `
      <div class="d-flex gap-2 mt-3 pt-3" style="border-top:1px solid var(--tm-gray-200)">
        <button class="btn btn-tm-primary flex-grow-1" onclick="acaoAgendamentoModal(${a.id}, 'confirmar')">
          <i class="bi bi-check-lg"></i> Confirmar
        </button>
        <button class="btn btn-outline-danger flex-grow-1" onclick="acaoAgendamentoModal(${a.id}, 'recusar')">
          <i class="bi bi-x-lg"></i> Recusar
        </button>
      </div>` : ''}
      ${a.status === 'confirmado' ? `
      <div class="d-flex gap-2 mt-3 pt-3" style="border-top:1px solid var(--tm-gray-200)">
        <button class="btn btn-success flex-grow-1" onclick="acaoAgendamentoModal(${a.id}, 'concluir')">
          <i class="bi bi-check-circle"></i> Marcar como concluído
        </button>
        <button class="btn btn-outline-danger" onclick="acaoAgendamentoModal(${a.id}, 'cancelar')">
          <i class="bi bi-x-lg"></i> Cancelar
        </button>
      </div>` : ''}
    `;
  } catch (err) {
    body.innerHTML = '<div class="alert alert-danger">Erro ao carregar detalhes.</div>';
  }
}

async function acaoAgendamentoModal(id, acao) {
  let motivo = '';
  if (acao === 'recusar' || acao === 'cancelar') {
    motivo = prompt('Motivo (opcional):') || '';
  }
  try {
    await api(`/oficina/solicitacoes/${id}/acao`, { method: 'POST', body: { acao, motivo } });
    showToast('Status atualizado!', 'success');
    // Fechar modal e recarregar agenda
    bootstrap.Modal.getInstance(document.getElementById('modal-detalhe-agenda'))?.hide();
    await renderOficinaAgenda(document.getElementById('app-content'), getHashParams().params);
  } catch (err) {
    showToast(err.error || 'Erro', 'error');
  }
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
        tbody += `<div class="agenda-slot agenda-${a.status}" style="cursor:pointer" 
          onclick="verDetalheAgendamento(${a.id})"
          title="${escapeHtml(a.cliente_nome)} - ${escapeHtml(a.servico)}">
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
    </div>

    <!-- Modal detalhes agendamento -->
    <div class="modal fade" id="modal-detalhe-agenda" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold"><i class="bi bi-calendar-event"></i> Detalhes do Agendamento</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" id="modal-detalhe-agenda-body">
            <div class="loading">Carregando...</div>
          </div>
        </div>
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
  const historico = await api('/oficina/historico');

  // Dashboard cards
  const hojeCount = data.agendamentos_hoje.length;
  const hojeHtml = data.agendamentos_hoje.length > 0
    ? data.agendamentos_hoje.map(a => {
      const hora = new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `<div class="d-flex justify-content-between align-items-center py-2 border-bottom" style="border-color:var(--tm-gray-100)!important">
        <div>
          <strong class="small">${hora}</strong>
          <span class="ms-2 small">${escapeHtml(a.servico)}</span>
        </div>
        <div class="text-end">
          <span class="small text-muted">${escapeHtml(a.cliente_nome)}</span>
          ${badgeStatus(a.status)}
        </div>
      </div>`;
    }).join('')
    : '<div class="text-center text-muted py-3 small"><i class="bi bi-calendar-check"></i> Nenhum agendamento para hoje</div>';

  // Histórico
  const historicoHtml = historico.historico.length > 0
    ? historico.historico.slice(0, 10).map(h => {
      const dataFmt = new Date(h.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
      return `
      <tr>
        <td class="small">${dataFmt}</td>
        <td class="small">${escapeHtml(h.cliente_nome)}</td>
        <td class="small">${escapeHtml(h.servico)}</td>
        <td class="small">${escapeHtml(h.placa)}</td>
        <td class="small fw-bold">${fmtMoney(h.valor_estimado)}</td>
        <td>${h.qtd_estrelas ? `<span class="estrelas small">${'★'.repeat(h.qtd_estrelas)}</span>` : '<span class="text-muted small">—</span>'}</td>
      </tr>`;
    }).join('')
    : '<tr><td colspan="6" class="text-center text-muted py-3">Nenhum atendimento concluído</td></tr>';

  el.innerHTML = `
    <h3 class="mb-4"><i class="bi bi-graph-up text-tm-primary"></i> Painel da Oficina</h3>

    <!-- Dashboard rápido -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="card p-3 text-center">
          <div class="text-muted small">Hoje</div>
          <h2 class="mb-0">${hojeCount}</h2>
          <div class="small text-muted">agendamento(s)</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card p-3 text-center">
          <div class="text-muted small">Pendentes</div>
          <h2 class="mb-0 text-warning">${data.pendentes}</h2>
          <div class="small text-muted">solicitações</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card p-3 text-center">
          <div class="text-muted small">Receita do mês</div>
          <h2 class="mb-0 text-success" style="font-size:1.3rem">${fmtMoney(data.receita_mes)}</h2>
          <div class="small text-muted">${data.mes_total} atendimento(s)</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="card p-3 text-center">
          <div class="text-muted small">Avaliação</div>
          <h2 class="mb-0 estrelas">${parseFloat(data.nota_media).toFixed(1)} ★</h2>
          <div class="small text-muted">${data.total_avaliacoes} avaliações</div>
        </div>
      </div>
    </div>

    <!-- Agenda de hoje -->
    <div class="row g-3 mb-4">
      <div class="col-lg-6">
        <div class="card p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold mb-0"><i class="bi bi-calendar-day text-tm-primary"></i> Agenda de Hoje</h6>
            <a href="#oficina-agenda" class="small">Ver semana →</a>
          </div>
          ${hojeHtml}
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card p-4">
          <h6 class="fw-bold mb-3"><i class="bi bi-bar-chart text-tm-primary"></i> Resumo Geral</h6>
          <div class="row g-2">
            <div class="col-6">
              <div class="rounded-3 p-2 text-center" style="background:var(--tm-gray-50)">
                <div class="small text-muted">Solicitados</div>
                <div class="fw-bold text-warning">${data.por_status.solicitado || 0}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="rounded-3 p-2 text-center" style="background:var(--tm-gray-50)">
                <div class="small text-muted">Confirmados</div>
                <div class="fw-bold text-primary">${data.por_status.confirmado || 0}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="rounded-3 p-2 text-center" style="background:var(--tm-gray-50)">
                <div class="small text-muted">Concluídos</div>
                <div class="fw-bold text-success">${data.por_status.concluido || 0}</div>
              </div>
            </div>
            <div class="col-6">
              <div class="rounded-3 p-2 text-center" style="background:var(--tm-gray-50)">
                <div class="small text-muted">Receita total</div>
                <div class="fw-bold text-success">${fmtMoney(data.receita)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Histórico de atendimentos -->
    <div class="card p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="fw-bold mb-0"><i class="bi bi-clock-history text-tm-primary"></i> Histórico de Atendimentos</h6>
        <span class="small text-muted">${historico.historico.length} concluído(s)</span>
      </div>
      <div class="table-responsive">
        <table class="table table-sm">
          <thead><tr>
            <th>Data</th><th>Cliente</th><th>Serviço</th><th>Placa</th><th>Valor</th><th>Avaliação</th>
          </tr></thead>
          <tbody>${historicoHtml}</tbody>
        </table>
      </div>
    </div>`;
}

// ─── NOTIFICAÇÕES DA OFICINA ────────────────────────
async function renderOficinaNotificacoes(el) {
  el.innerHTML = '<div class="loading">Carregando notificações...</div>';

  try {
    const data = await api('/oficina/notificacoes');

    // Marcar como lidas
    if (data.nao_lidas > 0) {
      api('/oficina/notificacoes/ler', { method: 'POST', body: {} }).then(() => checkNotifBadgeOficina());
    }

    if (!data.notificacoes.length) {
      el.innerHTML = `
        <h5 class="fw-bold mb-4"><i class="bi bi-bell text-tm-primary"></i> Notificações</h5>
        <div class="empty-state">
          <i class="bi bi-bell-slash"></i>
          <p>Nenhuma notificação</p>
          <small class="text-muted">Você será notificado quando clientes agendarem ou cancelarem.</small>
        </div>`;
      return;
    }

    const iconesTipo = {
      novo_agendamento: { icon: 'bi-calendar-plus-fill', color: 'var(--tm-primary)' },
      cancelado: { icon: 'bi-x-circle-fill', color: 'var(--tm-danger)' },
      avaliacao: { icon: 'bi-star-fill', color: '#F59E0B' }
    };

    const notifHtml = data.notificacoes.map(n => {
      const icone = iconesTipo[n.tipo] || { icon: 'bi-info-circle-fill', color: 'var(--tm-primary)' };
      const tempo = timeAgoOficina(n.criado_em);
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

function timeAgoOficina(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Agora';
  if (diff < 3600) return Math.floor(diff / 60) + ' min';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd';
  return date.toLocaleDateString('pt-BR');
}
