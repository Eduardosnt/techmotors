
// ═══════════════════════════════════════════
// Cliente Pages — Redesigned UX v2.0
// ═══════════════════════════════════════════

// Geolocalização
let userLocation = { lat: null, lng: null };

function obterLocalizacao() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { userLocation.lat = pos.coords.latitude; userLocation.lng = pos.coords.longitude; resolve(userLocation); },
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function fmtDistancia(km) {
  if (km === null) return '';
  if (km < 1) return `<span class="dist-tag"><i class="bi bi-geo-alt-fill"></i>${Math.round(km*1000)}m</span>`;
  return `<span class="dist-tag"><i class="bi bi-geo-alt-fill"></i>${km.toFixed(1)} km</span>`;
}

// Ícones por categoria
function catIcon(cat) {
  const icons = {
    'Manutenção Preventiva': 'bi-wrench', 'Suspensão': 'bi-arrows-expand',
    'Freios': 'bi-disc', 'Pneus': 'bi-circle', 'Elétrica': 'bi-lightning',
    'Climatização': 'bi-snow'
  };
  return icons[cat] || 'bi-tools';
}

// ─── HOME ───────────────────────────────────────────
async function renderClienteHome(el) {
  el.innerHTML = '<div class="loading">Preparando sua experiência...</div>';
  await obterLocalizacao();

  let url = '/cliente/home';
  if (userLocation.lat) url += `?lat=${userLocation.lat}&lng=${userLocation.lng}`;
  const data = await api(url);
  const user = getUser();
  const firstName = user.nome.split(' ')[0];

  const categoriasHtml = data.categorias.map(c => `
    <div class="col-4 col-md-2">
      <a href="#cliente-busca?categoria=${encodeURIComponent(c.categoria)}" class="text-decoration-none">
        <div class="categoria-card">
          <i class="bi ${catIcon(c.categoria)} categoria-icon"></i>
          <div class="mt-2 small fw-medium text-dark">${escapeHtml(c.categoria)}</div>
        </div>
      </a>
    </div>`).join('');

  const oficinasHtml = data.oficinas.map(o => {
    const dist = calcularDistanciaKm(userLocation.lat, userLocation.lng, o.latitude, o.longitude);
    return `
    <div class="col-md-6 col-lg-4">
      <a href="#cliente-oficina?id=${o.usuario_id}" class="text-decoration-none">
        <div class="card card-oficina p-3 h-100">
          <div class="d-flex justify-content-between align-items-start">
            <h6 class="text-tm-primary fw-bold mb-1">${escapeHtml(o.nome_fantasia)}</h6>
            ${dist !== null ? fmtDistancia(dist) : ''}
          </div>
          <div class="mb-2">${estrelas(o.nota_media, o.total_avaliacoes)}</div>
          <div class="text-muted small"><i class="bi bi-geo-alt"></i> ${escapeHtml(o.bairro || '')}, ${escapeHtml(o.cidade || '')}</div>
        </div>
      </a>
    </div>`;
  }).join('');

  const locBadge = userLocation.lat
    ? '<span class="loc-badge active"><i class="bi bi-geo-alt-fill"></i> GPS ativo</span>'
    : '<span class="loc-badge inactive"><i class="bi bi-geo-alt"></i> Sem localização</span>';

  el.innerHTML = `
    <div class="hero">
      <div class="container">
        <h2>Olá, ${escapeHtml(firstName)} 👋</h2>
        <p>Encontre a oficina ideal para o seu veículo</p>
        <div class="search-glass mt-3">
          <form id="form-busca-home" class="d-flex gap-2">
            <input id="busca-home-q" class="form-control" placeholder="O que você precisa? Ex: troca de óleo, alinhamento...">
            <button class="btn btn-tm-accent px-4"><i class="bi bi-search"></i></button>
          </form>
        </div>
      </div>
    </div>

    <div class="section-header mt-4">
      <h4>Serviços</h4>
      <a href="#cliente-busca" class="text-decoration-none small fw-medium">Ver todos <i class="bi bi-arrow-right"></i></a>
    </div>
    <div class="row g-2 g-md-3">${categoriasHtml}</div>

    <div class="section-header mt-4">
      <h4>${userLocation.lat ? 'Oficinas próximas' : 'Oficinas em destaque'}</h4>
      ${locBadge}
    </div>
    <div class="row g-3">${oficinasHtml}</div>`;

  document.getElementById('form-busca-home').addEventListener('submit', (e) => {
    e.preventDefault();
    navegarPara('cliente-busca', { q: document.getElementById('busca-home-q').value });
  });
}

// ─── BUSCA ──────────────────────────────────────────
async function renderClienteBusca(el, params) {
  el.innerHTML = '<div class="loading">Buscando oficinas...</div>';
  const q = params.get('q') || '', categoria = params.get('categoria') || '', cidade = params.get('cidade') || '';
  if (!userLocation.lat) await obterLocalizacao();
  const locQuery = userLocation.lat ? `&lat=${userLocation.lat}&lng=${userLocation.lng}` : '';

  const data = await api(`/cliente/busca?q=${encodeURIComponent(q)}&categoria=${encodeURIComponent(categoria)}&cidade=${encodeURIComponent(cidade)}${locQuery}`);
  const catOptions = data.categorias.map(c => `<option ${categoria===c.categoria?'selected':''}>${escapeHtml(c.categoria)}</option>`).join('');

  const oficinasHtml = data.oficinas.length === 0
    ? `<div class="empty-state"><i class="bi bi-search"></i><p>Nenhuma oficina encontrada.<br><small class="text-muted">Tente outros filtros.</small></p></div>`
    : data.oficinas.map(o => {
      const dist = calcularDistanciaKm(userLocation.lat, userLocation.lng, o.latitude, o.longitude);
      const servicos = o.servicos_preview && o.servicos_preview.length
        ? `<div class="mt-2 d-flex flex-wrap gap-1">${o.servicos_preview.map(s => `<span class="badge bg-light text-dark fw-normal" style="font-size:.7rem">${escapeHtml(s)}</span>`).join('')}</div>`
        : '';
      return `
      <div class="col-md-6 col-lg-4">
        <a href="#cliente-oficina?id=${o.usuario_id}" class="text-decoration-none">
          <div class="card card-oficina p-3 h-100">
            <div class="d-flex justify-content-between align-items-start">
              <h6 class="text-tm-primary fw-bold mb-1">${escapeHtml(o.nome_fantasia)}</h6>
              ${dist !== null ? fmtDistancia(dist) : ''}
            </div>
            <div class="mb-1">${estrelas(o.nota_media, o.total_avaliacoes)}</div>
            <div class="text-muted small"><i class="bi bi-geo-alt"></i> ${escapeHtml(o.bairro||'')}, ${escapeHtml(o.cidade||'')}/${escapeHtml(o.uf||'')}</div>
            ${o.telefone ? `<div class="text-muted small"><i class="bi bi-telephone"></i> ${escapeHtml(o.telefone)}</div>` : ''}
            ${servicos}
            <div class="mt-2 pt-2" style="border-top:1px solid var(--tm-gray-100)">
              <span class="btn btn-sm btn-tm-accent w-100"><i class="bi bi-calendar-plus"></i> Ver detalhes e agendar</span>
            </div>
          </div>
        </a>
      </div>`;
    }).join('');

  el.innerHTML = `
    <div class="d-flex align-items-center gap-2 mb-3">
      <a href="#cliente-home" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left"></i></a>
      <h5 class="mb-0 fw-bold">Buscar Oficinas</h5>
    </div>
    <div class="card p-3 mb-4">
      <form id="form-busca" class="row g-2 align-items-end">
        <div class="col-md-4"><label class="form-label">Serviço ou oficina</label>
          <input id="busca-q" value="${escapeHtml(q)}" class="form-control" placeholder="Ex: troca de óleo"></div>
        <div class="col-md-3"><label class="form-label">Categoria</label>
          <select id="busca-cat" class="form-select"><option value="">Todas</option>${catOptions}</select></div>
        <div class="col-md-3"><label class="form-label">Cidade</label>
          <input id="busca-cidade" value="${escapeHtml(cidade)}" class="form-control" placeholder="Brasília"></div>
        <div class="col-md-2"><button class="btn btn-tm-primary w-100"><i class="bi bi-search"></i> Filtrar</button></div>
      </form>
    </div>
    <p class="text-muted small mb-3">${data.oficinas.length} resultado(s) ${userLocation.lat ? '· ordenados por proximidade' : ''}</p>
    <div class="row g-3">${oficinasHtml}</div>`;

  document.getElementById('form-busca').addEventListener('submit', (e) => {
    e.preventDefault();
    navegarPara('cliente-busca', { q: document.getElementById('busca-q').value, categoria: document.getElementById('busca-cat').value, cidade: document.getElementById('busca-cidade').value });
  });
}

// ─── DETALHES DA OFICINA ────────────────────────────
async function renderClienteOficina(el, params) {
  el.innerHTML = '<div class="loading">Carregando detalhes...</div>';
  const id = params.get('id');
  const data = await api(`/cliente/oficina/${id}`);
  const o = data.oficina;
  const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const dist = calcularDistanciaKm(userLocation.lat, userLocation.lng, o.latitude, o.longitude);

  const servicosHtml = data.servicos.map(s => {
    let preco = s.preco_modalidade==='fixo' ? fmtMoney(s.preco) : s.preco_modalidade==='a_partir_de' ? 'A partir de '+fmtMoney(s.preco) : 'Sob orçamento';
    return `<div class="col-md-6"><div class="p-3 rounded-3" style="background:var(--tm-gray-50);border:1px solid var(--tm-gray-200)">
      <div class="d-flex justify-content-between align-items-start">
        <strong class="small">${escapeHtml(s.servico_nome)}</strong>
        <span class="badge bg-primary bg-opacity-10 text-primary">${preco}</span>
      </div>
      <div class="small text-muted mt-1"><i class="bi bi-clock"></i> ~${s.duracao_minutos} min · ${escapeHtml(s.categoria)}</div>
    </div></div>`;
  }).join('');

  const dispHtml = data.disponibilidade.map(d =>
    `<div class="d-flex justify-content-between py-1 border-bottom" style="border-color:var(--tm-gray-100)!important">
      <span class="small fw-medium">${dias[d.dia_semana]}</span>
      <span class="small text-muted">${d.hora_inicio.substring(0,5)} — ${d.hora_fim.substring(0,5)}</span>
    </div>`
  ).join('');

  // Mini mapa - usa OpenStreetMap embed que abre no Google Maps ao clicar
  const hasCoords = o.latitude && o.longitude;
  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${o.latitude},${o.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.logradouro + ' ' + o.numero + ' ' + o.bairro + ' ' + o.cidade + ' ' + o.uf)}`;
  const miniMapHtml = hasCoords
    ? `<div class="card p-0 overflow-hidden mb-3 mini-map-container">
        <a href="${googleMapsUrl}" target="_blank" rel="noopener" title="Abrir no Google Maps" class="d-block position-relative">
          <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=${o.longitude-0.005},${o.latitude-0.003},${o.longitude+0.005},${o.latitude+0.003}&layer=mapnik&marker=${o.latitude},${o.longitude}"
            style="width:100%;height:200px;border:none;pointer-events:none;">
          </iframe>
          <div class="mini-map-overlay">
            <i class="bi bi-box-arrow-up-right"></i> Abrir no Google Maps
          </div>
        </a>
      </div>`
    : `<div class="card p-3 mb-3 text-center">
        <a href="${googleMapsUrl}" target="_blank" rel="noopener" class="text-decoration-none">
          <i class="bi bi-geo-alt-fill text-tm-primary" style="font-size:2rem"></i>
          <div class="small fw-medium mt-1">Ver localização no Google Maps</div>
          <div class="small text-muted">${escapeHtml(o.logradouro)} ${escapeHtml(o.numero)}, ${escapeHtml(o.bairro)}</div>
        </a>
      </div>`;

  // Avaliações preview (máximo 3 na página, com botão para ver todas)
  const avalsPreview = data.avaliacoes.slice(0, 3).map(a => `
    <div class="p-3 rounded-3 mb-2" style="background:var(--tm-gray-50)">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="estrelas">${'★'.repeat(a.qtd_estrelas)}${'☆'.repeat(5-a.qtd_estrelas)}</span>
        <small class="text-muted">${new Date(a.criado_em).toLocaleDateString('pt-BR')}</small>
      </div>
      ${a.comentario ? `<p class="mb-1 small">"${escapeHtml(a.comentario)}"</p>` : ''}
      <small class="text-muted fw-medium">— ${escapeHtml(a.cliente_nome)}</small>
    </div>`).join('');

  const avalsSection = data.avaliacoes.length > 0
    ? `<div class="card p-4 mt-3">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="fw-bold mb-0"><i class="bi bi-chat-quote text-tm-primary"></i> Avaliações</h6>
          <button class="btn btn-sm btn-outline-primary" id="btn-ver-avaliacoes">
            <i class="bi bi-star"></i> Ver todas (${o.total_avaliacoes})
          </button>
        </div>
        <div id="avaliacoes-container">${avalsPreview}</div>
      </div>`
    : '';

  // Estrelas clicáveis no header
  const estrelasHtml = `<span class="estrelas-clicaveis" id="estrelas-header" style="cursor:pointer" title="Clique para ver avaliações">
    ${'★'.repeat(Math.round(o.nota_media))}${'☆'.repeat(5 - Math.round(o.nota_media))}
    <span class="text-muted ms-1">${parseFloat(o.nota_media || 0).toFixed(1)} (${o.total_avaliacoes || 0})</span>
  </span>`;

  el.innerHTML = `
    <div class="d-flex align-items-center gap-2 mb-3">
      <a href="#cliente-busca" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left"></i></a>
      <span class="small text-muted">Detalhes da oficina</span>
    </div>
    <div class="card p-4 mb-3">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">
        <div>
          <h4 class="text-tm-primary fw-bold mb-1">${escapeHtml(o.nome_fantasia)}</h4>
          <div class="d-flex align-items-center gap-2 mb-2">
            ${estrelasHtml}
            ${dist !== null ? fmtDistancia(dist) : ''}
          </div>
          <div class="text-muted small mb-1"><i class="bi bi-geo-alt"></i> ${escapeHtml(o.logradouro)} ${escapeHtml(o.numero)}, ${escapeHtml(o.bairro)} — ${escapeHtml(o.cidade)}/${escapeHtml(o.uf)}</div>
          ${o.telefone ? `<div class="text-muted small"><i class="bi bi-telephone"></i> ${escapeHtml(o.telefone)}</div>` : ''}
        </div>
        <div class="d-flex gap-2">
          <button id="btn-favoritar" class="btn btn-outline-danger btn-lg" title="Favoritar">
            <i class="bi bi-heart"></i>
          </button>
          <a href="#cliente-agendar?oficina_id=${id}" class="btn btn-tm-accent btn-lg">
            <i class="bi bi-calendar-plus"></i> Agendar
          </a>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-lg-8">
        <div class="card p-4">
          <h6 class="fw-bold mb-3"><i class="bi bi-tools text-tm-primary"></i> Serviços oferecidos</h6>
          <div class="row g-2">${servicosHtml}</div>
        </div>
        ${avalsSection}
      </div>
      <div class="col-lg-4">
        ${miniMapHtml}
        <div class="card p-4">
          <h6 class="fw-bold mb-3"><i class="bi bi-clock text-tm-primary"></i> Horários</h6>
          ${dispHtml}
        </div>
      </div>
    </div>

    <!-- Modal de todas as avaliações -->
    <div class="modal fade" id="modal-avaliacoes" tabindex="-1">
      <div class="modal-dialog modal-dialog-scrollable modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold"><i class="bi bi-star-fill text-warning"></i> Avaliações — ${escapeHtml(o.nome_fantasia)}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" id="modal-avaliacoes-body">
            <div class="loading">Carregando avaliações...</div>
          </div>
        </div>
      </div>
    </div>`;

  // Event: clicar nas estrelas ou botão "Ver todas" abre modal com todas as avaliações
  async function abrirAvaliacoes() {
    const modal = new bootstrap.Modal(document.getElementById('modal-avaliacoes'));
    modal.show();
    const body = document.getElementById('modal-avaliacoes-body');
    try {
      const resp = await api(`/cliente/oficina/${id}/avaliacoes`);
      if (!resp.avaliacoes.length) {
        body.innerHTML = '<div class="empty-state"><i class="bi bi-chat-square-text"></i><p>Nenhuma avaliação ainda</p></div>';
        return;
      }
      const mediaHtml = `
        <div class="text-center mb-4 p-3 rounded-3" style="background:var(--tm-primary-50)">
          <div style="font-size:2.5rem;letter-spacing:2px" class="estrelas">${'★'.repeat(Math.round(o.nota_media))}${'☆'.repeat(5-Math.round(o.nota_media))}</div>
          <div class="fw-bold fs-4">${parseFloat(o.nota_media||0).toFixed(1)} / 5.0</div>
          <div class="text-muted small">${o.total_avaliacoes} avaliação(ões)</div>
        </div>`;
      const listaHtml = resp.avaliacoes.map(a => `
        <div class="p-3 rounded-3 mb-2" style="background:var(--tm-gray-50)">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <div>
              <span class="estrelas">${'★'.repeat(a.qtd_estrelas)}${'☆'.repeat(5-a.qtd_estrelas)}</span>
              <strong class="ms-2 small">${escapeHtml(a.cliente_nome)}</strong>
            </div>
            <small class="text-muted">${new Date(a.criado_em).toLocaleDateString('pt-BR')}</small>
          </div>
          ${a.comentario ? `<p class="mb-0 small mt-1">"${escapeHtml(a.comentario)}"</p>` : '<p class="mb-0 small text-muted mt-1"><em>Sem comentário</em></p>'}
        </div>`).join('');
      body.innerHTML = mediaHtml + listaHtml;
    } catch (err) {
      body.innerHTML = '<div class="alert alert-danger">Erro ao carregar avaliações.</div>';
    }
  }

  document.getElementById('estrelas-header')?.addEventListener('click', abrirAvaliacoes);
  document.getElementById('btn-ver-avaliacoes')?.addEventListener('click', abrirAvaliacoes);

  // Favorite toggle
  const btnFav = document.getElementById('btn-favoritar');
  if (btnFav) {
    // Check if already favorited
    api(`/cliente/favorito/${id}`).then(data => {
      if (data.favoritado) {
        btnFav.innerHTML = '<i class="bi bi-heart-fill"></i>';
        btnFav.classList.add('btn-danger');
        btnFav.classList.remove('btn-outline-danger');
      }
    }).catch(() => {});

    btnFav.addEventListener('click', async () => {
      const isFav = btnFav.classList.contains('btn-danger');
      try {
        if (isFav) {
          await api(`/cliente/favoritos/${id}`, { method: 'DELETE' });
          btnFav.innerHTML = '<i class="bi bi-heart"></i>';
          btnFav.classList.remove('btn-danger');
          btnFav.classList.add('btn-outline-danger');
          showToast('Removido dos favoritos', 'info');
        } else {
          await api(`/cliente/favoritos/${id}`, { method: 'POST', body: {} });
          btnFav.innerHTML = '<i class="bi bi-heart-fill"></i>';
          btnFav.classList.add('btn-danger');
          btnFav.classList.remove('btn-outline-danger');
          showToast('Oficina favoritada! ❤️', 'success');
        }
      } catch (err) { showToast(err.error || 'Erro', 'error'); }
    });
  }
}

// ─── AGENDAMENTO WIZARD ─────────────────────────────
let agendaState = { oficina_id: null, servico_ids: [], data: '', hora: '', veiculo_id: null };

async function renderClienteAgendar(el, params) {
  const oficina_id = params.get('oficina_id') || agendaState.oficina_id;
  const passo = parseInt(params.get('passo') || '1');
  agendaState.oficina_id = oficina_id;

  el.innerHTML = '<div class="loading">Carregando...</div>';
  const oData = await api(`/cliente/oficina/${oficina_id}`);
  const oficina = oData.oficina;

  const passos = [1,2,3,4].map((n, i) => {
    const titulos = ['Serviço','Agenda','Veículo','Confirmar'];
    return `<div class="passo ${passo < n ? 'inativo' : ''}"><div class="passo-num">${passo > n ? '<i class="bi bi-check"></i>' : n}</div><div class="passo-titulo">${titulos[i]}</div></div>`;
  }).join('');

  let content = '';
  if (passo === 1) content = await renderAgendarPasso1(oficina_id, oData.servicos);
  else if (passo === 2) content = await renderAgendarPasso2(oficina_id);
  else if (passo === 3) content = await renderAgendarPasso3(oficina_id);
  else if (passo === 4) content = await renderAgendarPasso4(oficina_id, oficina);

  el.innerHTML = `
    <div class="d-flex align-items-center gap-2 mb-3">
      <a href="#cliente-oficina?id=${oficina_id}" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left"></i></a>
      <h5 class="mb-0 fw-bold">${escapeHtml(oficina.nome_fantasia)}</h5>
    </div>
    <div class="wizard-steps">${passos}</div>
    ${content}`;
}

async function renderAgendarPasso1(oficina_id, servicos) {
  const html = servicos.map(s => {
    let preco = s.preco_modalidade==='fixo' ? fmtMoney(s.preco) : s.preco_modalidade==='a_partir_de' ? 'A partir de '+fmtMoney(s.preco) : 'Sob orçamento';
    const checked = agendaState.servico_ids.includes(s.servico_id);
    return `<div class="col-md-6">
      <label class="servico-card border rounded p-3 d-flex align-items-start gap-3 w-100 ${checked?'selecionado':''}">
        <input type="checkbox" class="servico-check form-check-input mt-1 flex-shrink-0" value="${s.servico_id}" ${checked?'checked':''}>
        <div class="flex-grow-1">
          <strong>${escapeHtml(s.servico_nome)}</strong>
          <div class="d-flex justify-content-between align-items-center mt-1">
            <span class="small text-muted"><i class="bi bi-clock"></i> ${s.duracao_minutos} min</span>
            <span class="small fw-semibold text-tm-primary">${preco}</span>
          </div>
        </div>
      </label>
    </div>`;
  }).join('');

  setTimeout(() => {
    document.querySelectorAll('.servico-check').forEach(chk => {
      chk.addEventListener('change', function() { this.closest('label').classList.toggle('selecionado', this.checked); });
    });
    document.getElementById('btn-passo1')?.addEventListener('click', () => {
      const sel = [...document.querySelectorAll('.servico-check:checked')].map(c => parseInt(c.value));
      if (!sel.length) { showToast('Selecione pelo menos um serviço.', 'warning'); return; }
      agendaState.servico_ids = sel;
      navegarPara('cliente-agendar', { oficina_id, passo: '2' });
    });
  }, 50);

  return `
    <div class="card p-4">
      <h6 class="fw-bold mb-1">Selecione os serviços</h6>
      <p class="text-muted small mb-3">Escolha um ou mais serviços para agendar</p>
      <div class="row g-2 mb-3">${html}</div>
      <button id="btn-passo1" class="btn btn-tm-primary">Continuar <i class="bi bi-arrow-right"></i></button>
    </div>`;
}

async function renderAgendarPasso2(oficina_id) {
  if (!agendaState.servico_ids.length) { navegarPara('cliente-agendar', { oficina_id, passo:'1' }); return ''; }
  const dataSel = agendaState.data || new Date(Date.now()+86400000).toISOString().split('T')[0];
  const slotsData = await api(`/cliente/horarios?oficina_id=${oficina_id}&data=${dataSel}&duracao=60`);

  const slotsHtml = slotsData.slots.length === 0
    ? '<div class="text-center py-4 text-muted"><i class="bi bi-calendar-x" style="font-size:2rem"></i><p class="mt-2 small">Nenhum horário disponível neste dia</p></div>'
    : slotsData.slots.map(h => `<span class="slot-horario" data-hora="${h}">${h}</span>`).join('');

  setTimeout(() => {
    document.querySelectorAll('.slot-horario').forEach(s => {
      s.addEventListener('click', function() {
        document.querySelectorAll('.slot-horario').forEach(x => x.classList.remove('selecionado'));
        this.classList.add('selecionado');
        agendaState.hora = this.dataset.hora;
      });
    });
    document.getElementById('agendar-data')?.addEventListener('change', function() { agendaState.data = this.value; navegarPara('cliente-agendar', { oficina_id, passo:'2' }); });
    document.getElementById('btn-passo2')?.addEventListener('click', () => {
      if (!agendaState.hora) { showToast('Selecione um horário.', 'warning'); return; }
      agendaState.data = dataSel;
      navegarPara('cliente-agendar', { oficina_id, passo: '3' });
    });
  }, 50);

  return `
    <div class="card p-4">
      <h6 class="fw-bold mb-3">Escolha data e horário</h6>
      <div class="row g-3 mb-3">
        <div class="col-md-4">
          <label class="form-label">Data</label>
          <input type="date" id="agendar-data" class="form-control" min="${new Date().toISOString().split('T')[0]}" value="${dataSel}">
        </div>
        <div class="col-md-8">
          <label class="form-label">Horários disponíveis</label>
          <div class="p-3 rounded-3" style="background:var(--tm-gray-50)">${slotsHtml}</div>
        </div>
      </div>
      <div class="d-flex gap-2">
        <a href="#cliente-agendar?oficina_id=${oficina_id}&passo=1" class="btn btn-outline-secondary"><i class="bi bi-arrow-left"></i></a>
        <button id="btn-passo2" class="btn btn-tm-primary" ${!slotsData.slots.length?'disabled':''}>Continuar <i class="bi bi-arrow-right"></i></button>
      </div>
    </div>`;
}

async function renderAgendarPasso3(oficina_id) {
  const vData = await api('/cliente/veiculos');
  if (!vData.veiculos.length) {
    return `<div class="card p-4"><div class="empty-state"><i class="bi bi-car-front"></i><p>Nenhum veículo cadastrado</p><a href="#cliente-veiculos" class="btn btn-tm-primary mt-2">Cadastrar veículo</a></div></div>`;
  }

  const html = vData.veiculos.map(v => `
    <div class="col-md-6">
      <label class="veiculo-card d-flex align-items-center gap-3 w-100" style="cursor:pointer">
        <input type="radio" name="veiculo" value="${v.id}" class="veiculo-radio d-none">
        <div class="veiculo-icon"><i class="bi bi-${v.tipo==='moto'?'bicycle':'car-front'}"></i></div>
        <div class="flex-grow-1">
          <strong>${escapeHtml(v.marca)} ${escapeHtml(v.modelo)}</strong>
          <div class="small text-muted">${v.ano} · ${escapeHtml(v.placa)}</div>
        </div>
        <i class="bi bi-check-circle-fill text-tm-primary d-none check-icon"></i>
      </label>
    </div>`).join('');

  setTimeout(() => {
    document.querySelectorAll('.veiculo-card').forEach(card => {
      card.addEventListener('click', function() {
        document.querySelectorAll('.veiculo-card').forEach(c => { c.style.borderColor=''; c.querySelector('.check-icon').classList.add('d-none'); });
        this.style.borderColor = 'var(--tm-primary)';
        this.querySelector('.check-icon').classList.remove('d-none');
        this.querySelector('.veiculo-radio').checked = true;
      });
    });
    document.getElementById('btn-passo3')?.addEventListener('click', () => {
      const sel = document.querySelector('.veiculo-radio:checked');
      if (!sel) { showToast('Selecione um veículo.', 'warning'); return; }
      agendaState.veiculo_id = parseInt(sel.value);
      navegarPara('cliente-agendar', { oficina_id, passo: '4' });
    });
  }, 50);

  return `
    <div class="card p-4">
      <h6 class="fw-bold mb-3">Selecione o veículo</h6>
      <div class="row g-3 mb-3">${html}</div>
      <div class="d-flex gap-2">
        <a href="#cliente-agendar?oficina_id=${oficina_id}&passo=2" class="btn btn-outline-secondary"><i class="bi bi-arrow-left"></i></a>
        <button id="btn-passo3" class="btn btn-tm-primary">Continuar <i class="bi bi-arrow-right"></i></button>
      </div>
    </div>`;
}

async function renderAgendarPasso4(oficina_id, oficina) {
  const vData = await api('/cliente/veiculos');
  const v = vData.veiculos.find(x => x.id === agendaState.veiculo_id);
  const dataFmt = new Date(agendaState.data+'T12:00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });

  setTimeout(() => {
    document.getElementById('btn-confirmar')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-confirmar');
      btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';
      try {
        await api('/cliente/agendar', { method:'POST', body:{ oficina_id:parseInt(oficina_id), servico_ids:agendaState.servico_ids, data:agendaState.data, hora:agendaState.hora, veiculo_id:agendaState.veiculo_id }});
        agendaState = { oficina_id:null, servico_ids:[], data:'', hora:'', veiculo_id:null };
        showToast('Agendamento solicitado com sucesso!', 'success');
        navegarPara('cliente-agendamentos');
      } catch (err) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle"></i> Confirmar'; showToast(err.error||'Erro', 'error'); }
    });
  }, 50);

  return `
    <div class="card p-4 mb-3">
      <h6 class="fw-bold mb-3"><i class="bi bi-clipboard-check text-tm-primary"></i> Confirmação do agendamento</h6>
      <div class="rounded-3 p-3 mb-3" style="background:var(--tm-gray-50)">
        <div class="row g-3">
          <div class="col-sm-6">
            <div class="small text-muted mb-1">Oficina</div>
            <div class="fw-semibold">${escapeHtml(oficina.nome_fantasia)}</div>
          </div>
          <div class="col-sm-6">
            <div class="small text-muted mb-1">Data e hora</div>
            <div class="fw-semibold">${dataFmt}<br>${agendaState.hora}</div>
          </div>
          <div class="col-sm-6">
            <div class="small text-muted mb-1">Veículo</div>
            <div class="fw-semibold">${v ? escapeHtml(v.marca)+' '+escapeHtml(v.modelo) : ''} <span class="text-muted">(${v?escapeHtml(v.placa):''})</span></div>
          </div>
          <div class="col-sm-6">
            <div class="small text-muted mb-1">Pagamento</div>
            <div class="fw-semibold">Direto na oficina</div>
          </div>
        </div>
      </div>
      <div class="alert alert-light border small mb-0"><i class="bi bi-info-circle text-tm-primary"></i> A oficina confirmará seu horário em breve.</div>
    </div>
    <div class="d-flex gap-2">
      <a href="#cliente-agendar?oficina_id=${oficina_id}&passo=3" class="btn btn-outline-secondary"><i class="bi bi-arrow-left"></i></a>
      <button id="btn-confirmar" class="btn btn-tm-accent btn-lg flex-grow-1"><i class="bi bi-check-circle"></i> Confirmar Solicitação</button>
    </div>`;
}

// ─── MEUS AGENDAMENTOS ──────────────────────────────
async function renderClienteAgendamentos(el) {
  el.innerHTML = '<div class="loading">Carregando agendamentos...</div>';
  const data = await api('/cliente/agendamentos');

  if (!data.agendamentos.length) {
    el.innerHTML = `
      <h5 class="fw-bold mb-4">Meus Agendamentos</h5>
      <div class="empty-state">
        <i class="bi bi-calendar-plus"></i>
        <p>Nenhum agendamento ainda</p>
        <a href="#cliente-busca" class="btn btn-tm-primary mt-2">Encontrar oficina</a>
      </div>`;
    return;
  }

  // Group by status
  const statusOrder = ['confirmado','solicitado','concluido','cancelado','recusado'];
  const grouped = {};
  data.agendamentos.forEach(a => { if(!grouped[a.status]) grouped[a.status]=[];  grouped[a.status].push(a); });

  const html = statusOrder.filter(s => grouped[s]).map(status => {
    const items = grouped[status].map(a => `
      <div class="card agendamento-card p-3 mb-2" data-status="${a.status}">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <strong>${escapeHtml(a.nome_fantasia)}</strong>
              ${badgeStatus(a.status)}
            </div>
            <div class="small text-muted"><i class="bi bi-tools"></i> ${escapeHtml(a.servico)}</div>
            <div class="small text-muted"><i class="bi bi-calendar3"></i> ${fmtData(a.data_hora)}</div>
            <div class="small text-muted"><i class="bi bi-car-front"></i> ${escapeHtml(a.marca)} ${escapeHtml(a.modelo)} · ${escapeHtml(a.placa)}</div>
          </div>
          <div class="text-end">
            <div class="fw-bold text-tm-primary">${fmtMoney(a.valor_estimado)}</div>
            ${['solicitado','confirmado'].includes(a.status) ?
              `<button class="btn btn-sm btn-outline-danger mt-2" onclick="cancelarAgendamento(${a.id})"><i class="bi bi-x-lg"></i> Cancelar</button>` : ''}
            ${a.status==='concluido' ?
              `<div class="d-flex gap-1 mt-2">
                <a href="#cliente-avaliar?id=${a.id}" class="btn btn-sm btn-tm-primary"><i class="bi bi-star"></i> Avaliar</a>
                <a href="#cliente-comprovante?id=${a.id}" class="btn btn-sm btn-outline-secondary"><i class="bi bi-receipt"></i> Recibo</a>
              </div>` : ''}
          </div>
        </div>
      </div>`).join('');
    return items;
  }).join('');

  el.innerHTML = `<h5 class="fw-bold mb-4">Meus Agendamentos</h5>${html}`;
}

async function cancelarAgendamento(id) {
  if (!confirm('Deseja cancelar este agendamento?')) return;
  try {
    await api(`/cliente/cancelar/${id}`, { method:'POST', body:{ motivo:'Cancelado pelo cliente' }});
    showToast('Agendamento cancelado.', 'success');
    await renderClienteAgendamentos(document.getElementById('app-content'));
  } catch (err) { showToast(err.error||'Erro', 'error'); }
}

// ─── VEÍCULOS ───────────────────────────────────────

// Dados de marcas/modelos populares para autocomplete
const marcasPopulares = {
  carro: ['Chevrolet','Fiat','Ford','Honda','Hyundai','Jeep','Nissan','Peugeot','Renault','Toyota','Volkswagen'],
  moto: ['Honda','Yamaha','Suzuki','Kawasaki','BMW','Ducati','Triumph','Harley-Davidson']
};

function validarPlaca(placa) {
  // Remove espaços e hífens para normalizar
  const p = placa.replace(/[\s-]/g, '').toUpperCase();
  // Placa antiga: ABC1234
  if (/^[A-Z]{3}\d{4}$/.test(p)) return { valida: true, formato: 'antiga', normalizada: p.substring(0,3) + '-' + p.substring(3) };
  // Placa Mercosul: ABC1D23
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(p)) return { valida: true, formato: 'mercosul', normalizada: p.substring(0,3) + p.substring(3,4) + p.substring(4,5) + p.substring(5) };
  // Tenta com hífen: ABC-1234 ou ABC-1D23
  if (/^[A-Z]{3}-?\d{4}$/.test(p)) return { valida: true, formato: 'antiga', normalizada: p.substring(0,3) + '-' + p.replace(/[A-Z-]/g,'') };
  if (/^[A-Z]{3}-?\d[A-Z]\d{2}$/.test(p)) return { valida: true, formato: 'mercosul', normalizada: p.replace(/-/g,'') };
  return { valida: false, formato: null, normalizada: placa };
}

async function renderClienteVeiculos(el) {
  el.innerHTML = '<div class="loading">Carregando...</div>';
  const data = await api('/cliente/veiculos');

  const veiculosHtml = data.veiculos.map(v => `
    <div class="col-md-6 col-lg-4">
      <div class="veiculo-card">
        <div class="d-flex align-items-center gap-3">
          <div class="veiculo-icon">
            <i class="bi bi-${v.tipo==='moto'?'bicycle':'car-front'}"></i>
          </div>
          <div class="flex-grow-1">
            <strong>${escapeHtml(v.marca)} ${escapeHtml(v.modelo)}</strong>
            <div class="small text-muted">${v.ano || '—'} · ${v.tipo==='moto'?'Motocicleta':'Automóvel'}</div>
          </div>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3 pt-2" style="border-top:1px solid var(--tm-gray-100)">
          <div class="placa-badge">${escapeHtml(v.placa)}</div>
          <button class="btn btn-sm btn-outline-danger" onclick="excluirVeiculo(${v.id})"><i class="bi bi-trash3"></i></button>
        </div>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="fw-bold mb-0">Meus Veículos</h5>
      <button class="btn btn-tm-primary btn-sm" id="btn-add-veiculo">
        <i class="bi bi-plus-lg"></i> Adicionar
      </button>
    </div>

    <div id="form-veiculo-card" class="card p-4 mb-4 ${data.veiculos.length ? 'd-none' : ''}">
      <h6 class="fw-bold mb-1">Cadastrar Veículo</h6>
      <p class="text-muted small mb-3">Aceita placa antiga (ABC-1234) ou Mercosul (ABC1D23)</p>
      <form id="form-veiculo">
        <div class="row g-3">
          <div class="col-md-4 col-6">
            <label class="form-label">Placa *</label>
            <input id="v-placa" class="form-control text-uppercase" placeholder="ABC1D23 ou ABC-1234" required maxlength="8">
            <div id="v-placa-feedback" class="form-text"></div>
          </div>
          <div class="col-md-2 col-6">
            <label class="form-label">Tipo</label>
            <select id="v-tipo" class="form-select">
              <option value="carro">🚗 Automóvel</option>
              <option value="moto">🏍️ Motocicleta</option>
            </select>
          </div>
          <div class="col-md-3 col-6">
            <label class="form-label">Marca *</label>
            <input id="v-marca" class="form-control" list="lista-marcas" required placeholder="Ex: Honda">
            <datalist id="lista-marcas"></datalist>
          </div>
          <div class="col-md-3 col-6">
            <label class="form-label">Modelo *</label>
            <input id="v-modelo" class="form-control" required placeholder="Ex: Civic">
          </div>
          <div class="col-md-2 col-4">
            <label class="form-label">Ano</label>
            <input type="number" id="v-ano" min="1980" max="2030" class="form-control" placeholder="2020">
          </div>
          <div class="col-md-10 col-8 d-flex align-items-end gap-2">
            <button type="submit" class="btn btn-tm-accent" id="btn-cadastrar-veiculo">
              <i class="bi bi-plus-circle"></i> Cadastrar Veículo
            </button>
            <button type="button" class="btn btn-outline-secondary" onclick="document.getElementById('form-veiculo-card').classList.add('d-none')">Cancelar</button>
          </div>
        </div>
      </form>
    </div>

    ${data.veiculos.length ? `<div class="row g-3">${veiculosHtml}</div>` :
      `<div class="empty-state mt-2"><i class="bi bi-car-front"></i><p>Nenhum veículo cadastrado.<br><small>Adicione seu primeiro veículo acima.</small></p></div>`}`;

  // Event listeners
  document.getElementById('btn-add-veiculo')?.addEventListener('click', () => {
    document.getElementById('form-veiculo-card').classList.remove('d-none');
    document.getElementById('v-placa')?.focus();
  });

  // Validação de placa em tempo real
  document.getElementById('v-placa')?.addEventListener('input', function() {
    const result = validarPlaca(this.value);
    const fb = document.getElementById('v-placa-feedback');
    if (this.value.length >= 7) {
      if (result.valida) {
        fb.innerHTML = `<span class="text-success"><i class="bi bi-check-circle"></i> Placa ${result.formato === 'mercosul' ? 'Mercosul' : 'formato antigo'}</span>`;
        this.classList.remove('is-invalid');
        this.classList.add('is-valid');
      } else {
        fb.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle"></i> Placa inválida</span>`;
        this.classList.remove('is-valid');
        this.classList.add('is-invalid');
      }
    } else {
      fb.innerHTML = '';
      this.classList.remove('is-valid', 'is-invalid');
    }
  });

  // Atualiza lista de marcas quando tipo muda
  function atualizarMarcas() {
    const tipo = document.getElementById('v-tipo').value;
    const datalist = document.getElementById('lista-marcas');
    datalist.innerHTML = marcasPopulares[tipo].map(m => `<option value="${m}">`).join('');
  }
  document.getElementById('v-tipo')?.addEventListener('change', atualizarMarcas);
  atualizarMarcas();

  // Submit
  document.getElementById('form-veiculo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const placaInput = document.getElementById('v-placa').value;
    const result = validarPlaca(placaInput);

    if (!result.valida) {
      showToast('Placa inválida. Use formato ABC-1234 ou ABC1D23.', 'warning');
      return;
    }

    const marca = document.getElementById('v-marca').value.trim();
    const modelo = document.getElementById('v-modelo').value.trim();
    const anoVal = document.getElementById('v-ano').value;
    const tipo = document.getElementById('v-tipo').value;

    if (!marca || !modelo) {
      showToast('Marca e modelo são obrigatórios.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-cadastrar-veiculo');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Cadastrando...';

    try {
      await api('/cliente/veiculos', {
        method: 'POST',
        body: {
          placa: result.normalizada,
          marca: marca,
          modelo: modelo,
          ano: anoVal ? parseInt(anoVal) : null,
          tipo: tipo
        }
      });
      showToast('Veículo cadastrado com sucesso!', 'success');
      await renderClienteVeiculos(el);
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-plus-circle"></i> Cadastrar Veículo';
      showToast(err.error || 'Erro ao cadastrar veículo', 'error');
    }
  });
}

async function excluirVeiculo(id) {
  if (!confirm('Remover este veículo?')) return;
  try {
    await api(`/cliente/veiculos/${id}`, { method: 'DELETE' });
    showToast('Veículo removido.', 'success');
    await renderClienteVeiculos(document.getElementById('app-content'));
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

// ─── AVALIAR ────────────────────────────────────────
async function renderClienteAvaliar(el, params) {
  const id = params.get('id');
  el.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-5">
        <div class="card p-4">
          <div class="text-center mb-4">
            <div class="rounded-circle d-inline-flex align-items-center justify-content-center" style="width:64px;height:64px;background:var(--tm-warning-50)">
              <i class="bi bi-star-fill" style="font-size:1.5rem;color:var(--tm-warning)"></i>
            </div>
            <h5 class="fw-bold mt-3">Como foi sua experiência?</h5>
            <p class="text-muted small">Sua avaliação ajuda outros clientes</p>
          </div>
          <form id="form-avaliar">
            <div class="text-center mb-4" style="font-size:2.5rem;letter-spacing:4px">
              ${[1,2,3,4,5].map(i => `<label style="cursor:pointer"><input type="radio" name="estrelas" value="${i}" hidden><span class="estrela-sel">☆</span></label>`).join('')}
            </div>
            <label class="form-label">Comentário <span class="text-muted small">(opcional)</span></label>
            <textarea id="aval-comentario" class="form-control mb-4" rows="3" placeholder="O que achou do atendimento?"></textarea>
            <button class="btn btn-tm-accent w-100 btn-lg"><i class="bi bi-send"></i> Enviar Avaliação</button>
          </form>
        </div>
      </div>
    </div>`;

  document.querySelectorAll('input[name=estrelas]').forEach((r, i, arr) => {
    r.addEventListener('change', () => arr.forEach((x, j) => x.nextElementSibling.textContent = j<=i ? '★' : '☆'));
  });

  document.getElementById('form-avaliar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sel = document.querySelector('input[name=estrelas]:checked');
    if (!sel) { showToast('Selecione uma nota.', 'warning'); return; }
    try {
      await api('/cliente/avaliar', { method:'POST', body:{ agendamento_id:parseInt(id), estrelas:parseInt(sel.value), comentario:document.getElementById('aval-comentario').value }});
      showToast('Avaliação enviada. Obrigado!', 'success');
      navegarPara('cliente-agendamentos');
    } catch (err) { showToast(err.error||'Erro', 'error'); }
  });
}


// ─── HISTÓRICO DE SERVIÇOS ──────────────────────────
async function renderClienteHistorico(el) {
  el.innerHTML = '<div class="loading">Carregando histórico...</div>';

  try {
    const vData = await api('/cliente/veiculos');
    const data = await api('/cliente/historico');

    // Filtro por veículo
    const veiculoOptions = vData.veiculos.map(v =>
      `<option value="${v.id}">${escapeHtml(v.marca)} ${escapeHtml(v.modelo)} (${escapeHtml(v.placa)})</option>`
    ).join('');

    const historicoHtml = data.historico.length === 0
      ? `<div class="empty-state mt-3"><i class="bi bi-clock-history"></i><p>Nenhum serviço concluído ainda</p><small class="text-muted">Seus serviços finalizados aparecerão aqui como um histórico do veículo.</small></div>`
      : data.historico.map(h => {
        const dataFmt = new Date(h.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        return `
        <div class="d-flex gap-3 mb-3">
          <div class="text-center" style="min-width:50px">
            <div class="rounded-circle d-flex align-items-center justify-content-center mx-auto" style="width:40px;height:40px;background:var(--tm-success-50)">
              <i class="bi bi-check-lg" style="color:var(--tm-success)"></i>
            </div>
            <div class="border-start mx-auto" style="width:1px;height:20px;border-color:var(--tm-gray-200)!important"></div>
          </div>
          <div class="card p-3 flex-grow-1">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <strong>${escapeHtml(h.servico)}</strong>
                <span class="badge bg-light text-dark ms-1" style="font-size:.7rem">${escapeHtml(h.categoria)}</span>
                <div class="small text-muted mt-1"><i class="bi bi-building"></i> ${escapeHtml(h.nome_fantasia)}</div>
                <div class="small text-muted"><i class="bi bi-car-front"></i> ${escapeHtml(h.marca)} ${escapeHtml(h.modelo)} · ${escapeHtml(h.placa)}</div>
              </div>
              <div class="text-end">
                <div class="small text-muted">${dataFmt}</div>
                <div class="fw-bold">${fmtMoney(h.valor_estimado)}</div>
                ${h.qtd_estrelas ? `<div class="estrelas small">${'★'.repeat(h.qtd_estrelas)}${'☆'.repeat(5-h.qtd_estrelas)}</div>` : ''}
                <a href="#cliente-comprovante?id=${h.id}" class="btn btn-sm btn-outline-secondary mt-1"><i class="bi bi-receipt"></i></a>
              </div>
            </div>
          </div>
        </div>`;
      }).join('');

    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h5 class="fw-bold mb-0"><i class="bi bi-clock-history text-tm-primary"></i> Histórico de Serviços</h5>
        <div class="d-flex gap-2 align-items-center">
          <select id="filtro-veiculo" class="form-select form-select-sm" style="width:auto">
            <option value="">Todos os veículos</option>
            ${veiculoOptions}
          </select>
        </div>
      </div>
      <div id="historico-lista">${historicoHtml}</div>`;

    document.getElementById('filtro-veiculo')?.addEventListener('change', async function() {
      const vId = this.value;
      const url = vId ? `/cliente/historico?veiculo_id=${vId}` : '/cliente/historico';
      const fresh = await api(url);
      const lista = document.getElementById('historico-lista');
      if (!fresh.historico.length) {
        lista.innerHTML = '<div class="empty-state"><i class="bi bi-clock-history"></i><p>Nenhum serviço para este veículo</p></div>';
      } else {
        // Re-render (simplificado - recarrega a página)
        await renderClienteHistorico(el);
        document.getElementById('filtro-veiculo').value = vId;
      }
    });
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">Erro: ${escapeHtml(err.message || err.error || 'Erro')}</div>`;
  }
}

// ─── FAVORITOS ──────────────────────────────────────
async function renderClienteFavoritos(el) {
  el.innerHTML = '<div class="loading">Carregando favoritos...</div>';

  try {
    const data = await api('/cliente/favoritos');

    if (!data.favoritos.length) {
      el.innerHTML = `
        <h5 class="fw-bold mb-4"><i class="bi bi-heart text-tm-primary"></i> Oficinas Favoritas</h5>
        <div class="empty-state">
          <i class="bi bi-heart"></i>
          <p>Nenhuma oficina favoritada</p>
          <small class="text-muted">Favorite oficinas para acessá-las rapidamente.</small>
          <div class="mt-3"><a href="#cliente-busca" class="btn btn-tm-primary">Buscar oficinas</a></div>
        </div>`;
      return;
    }

    const oficinasHtml = data.favoritos.map(f => {
      const dist = calcularDistanciaKm(userLocation.lat, userLocation.lng, f.latitude, f.longitude);
      return `
      <div class="col-md-6 col-lg-4">
        <div class="card card-oficina p-3 h-100 position-relative">
          <button class="btn btn-sm position-absolute top-0 end-0 m-2 text-danger" onclick="removerFavorito(${f.oficina_id}, this)" title="Remover">
            <i class="bi bi-heart-fill"></i>
          </button>
          <a href="#cliente-oficina?id=${f.oficina_id}" class="text-decoration-none">
            <h6 class="text-tm-primary fw-bold mb-1 pe-4">${escapeHtml(f.nome_fantasia)}</h6>
            <div class="mb-1">${estrelas(f.nota_media, f.total_avaliacoes)}</div>
            <div class="text-muted small"><i class="bi bi-geo-alt"></i> ${escapeHtml(f.bairro || '')}, ${escapeHtml(f.cidade || '')}/${escapeHtml(f.uf || '')}</div>
            ${dist !== null ? `<div class="mt-1">${fmtDistancia(dist)}</div>` : ''}
          </a>
          <div class="mt-2 pt-2" style="border-top:1px solid var(--tm-gray-100)">
            <a href="#cliente-agendar?oficina_id=${f.oficina_id}" class="btn btn-sm btn-tm-accent w-100"><i class="bi bi-calendar-plus"></i> Agendar</a>
          </div>
        </div>
      </div>`;
    }).join('');

    el.innerHTML = `
      <h5 class="fw-bold mb-4"><i class="bi bi-heart-fill text-danger"></i> Oficinas Favoritas</h5>
      <div class="row g-3">${oficinasHtml}</div>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">Erro: ${escapeHtml(err.message || err.error || 'Erro')}</div>`;
  }
}

async function removerFavorito(oficinaId, btn) {
  try {
    await api(`/cliente/favoritos/${oficinaId}`, { method: 'DELETE' });
    btn.closest('.col-md-6').remove();
    showToast('Removido dos favoritos', 'info');
  } catch (err) { showToast(err.error || 'Erro', 'error'); }
}

// ─── NOTIFICAÇÕES ───────────────────────────────────
async function renderClienteNotificacoes(el) {
  el.innerHTML = '<div class="loading">Carregando notificações...</div>';

  try {
    const data = await api('/cliente/notificacoes');

    // Marcar todas como lidas
    if (data.nao_lidas > 0) {
      api('/cliente/notificacoes/ler', { method: 'POST', body: {} }).then(() => checkNotifBadge());
    }

    if (!data.notificacoes.length) {
      el.innerHTML = `
        <h5 class="fw-bold mb-4"><i class="bi bi-bell text-tm-primary"></i> Notificações</h5>
        <div class="empty-state">
          <i class="bi bi-bell-slash"></i>
          <p>Nenhuma notificação</p>
          <small class="text-muted">Você será notificado sobre atualizações nos seus agendamentos.</small>
        </div>`;
      return;
    }

    const iconesTipo = {
      confirmado: { icon: 'bi-check-circle-fill', color: 'var(--tm-primary)' },
      recusado: { icon: 'bi-x-circle-fill', color: 'var(--tm-danger)' },
      concluido: { icon: 'bi-trophy-fill', color: 'var(--tm-success)' },
      cancelado: { icon: 'bi-slash-circle-fill', color: 'var(--tm-gray-500)' },
      lembrete: { icon: 'bi-alarm-fill', color: 'var(--tm-warning)' }
    };

    const notifHtml = data.notificacoes.map(n => {
      const icone = iconesTipo[n.tipo] || { icon: 'bi-info-circle-fill', color: 'var(--tm-primary)' };
      const tempo = timeAgo(n.criado_em);
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
            ${n.link ? `<a href="${n.link}" class="small">Ver detalhes →</a>` : ''}
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

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Agora';
  if (diff < 3600) return Math.floor(diff / 60) + ' min';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd';
  return date.toLocaleDateString('pt-BR');
}

// ─── COMPROVANTE / RECIBO ───────────────────────────
async function renderClienteComprovante(el, params) {
  el.innerHTML = '<div class="loading">Gerando comprovante...</div>';

  try {
    const id = params.get('id');
    const data = await api(`/cliente/comprovante/${id}`);
    const c = data.comprovante;

    const dataFmt = new Date(c.data_hora).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const horaFmt = new Date(c.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    el.innerHTML = `
      <div class="row justify-content-center">
        <div class="col-md-7">
          <div class="d-flex align-items-center gap-2 mb-3">
            <button class="btn btn-outline-secondary btn-sm" onclick="history.back()"><i class="bi bi-arrow-left"></i></button>
            <span class="small text-muted">Comprovante de Serviço</span>
          </div>
          <div class="card p-4" id="comprovante-card">
            <div class="text-center mb-4 pb-3" style="border-bottom:2px dashed var(--tm-gray-200)">
              <i class="bi bi-wrench-adjustable-circle" style="font-size:2.5rem;color:var(--tm-primary)"></i>
              <h4 class="fw-bold mt-2 mb-0">TechMotors</h4>
              <div class="small text-muted">Comprovante de Agendamento</div>
            </div>

            <div class="row g-3 mb-4">
              <div class="col-6">
                <div class="small text-muted">Nº do Agendamento</div>
                <div class="fw-bold">#${String(c.id).padStart(5, '0')}</div>
              </div>
              <div class="col-6 text-end">
                <div class="small text-muted">Status</div>
                <div>${badgeStatus(c.status)}</div>
              </div>
            </div>

            <div class="rounded-3 p-3 mb-3" style="background:var(--tm-gray-50)">
              <h6 class="fw-bold small mb-2 text-uppercase" style="letter-spacing:.5px">Oficina</h6>
              <div class="fw-semibold">${escapeHtml(c.nome_fantasia)}</div>
              <div class="small text-muted">CNPJ: ${escapeHtml(c.cnpj)}</div>
              <div class="small text-muted">${escapeHtml(c.logradouro)} ${escapeHtml(c.numero)}, ${escapeHtml(c.bairro)} — ${escapeHtml(c.cidade)}/${escapeHtml(c.uf)}</div>
              ${c.oficina_telefone ? `<div class="small text-muted"><i class="bi bi-telephone"></i> ${escapeHtml(c.oficina_telefone)}</div>` : ''}
            </div>

            <div class="rounded-3 p-3 mb-3" style="background:var(--tm-gray-50)">
              <h6 class="fw-bold small mb-2 text-uppercase" style="letter-spacing:.5px">Cliente</h6>
              <div class="fw-semibold">${escapeHtml(c.cliente_nome)}</div>
              <div class="small text-muted">${escapeHtml(c.cliente_email)}</div>
            </div>

            <div class="rounded-3 p-3 mb-3" style="background:var(--tm-gray-50)">
              <h6 class="fw-bold small mb-2 text-uppercase" style="letter-spacing:.5px">Serviço</h6>
              <div class="d-flex justify-content-between">
                <div>
                  <div class="fw-semibold">${escapeHtml(c.servico)}</div>
                  <div class="small text-muted">${escapeHtml(c.categoria)} · ~${c.duracao_minutos} min</div>
                </div>
                <div class="fw-bold">${fmtMoney(c.valor_estimado)}</div>
              </div>
            </div>

            <div class="rounded-3 p-3 mb-3" style="background:var(--tm-gray-50)">
              <h6 class="fw-bold small mb-2 text-uppercase" style="letter-spacing:.5px">Veículo</h6>
              <div class="fw-semibold">${escapeHtml(c.marca)} ${escapeHtml(c.modelo)} ${c.ano || ''}</div>
              <div class="placa-badge mt-1">${escapeHtml(c.placa)}</div>
            </div>

            <div class="row g-3 mb-4">
              <div class="col-6">
                <div class="small text-muted">Data</div>
                <div class="fw-semibold">${dataFmt}</div>
              </div>
              <div class="col-6">
                <div class="small text-muted">Horário</div>
                <div class="fw-semibold">${horaFmt}</div>
              </div>
            </div>

            <div class="text-center pt-3" style="border-top:2px dashed var(--tm-gray-200)">
              <div class="small text-muted">Pagamento realizado diretamente na oficina</div>
              <div class="small text-muted mt-1">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>

          <div class="d-flex gap-2 mt-3 justify-content-center">
            <button class="btn btn-tm-primary" onclick="imprimirComprovante()">
              <i class="bi bi-printer"></i> Imprimir
            </button>
            <button class="btn btn-outline-secondary" onclick="history.back()">
              <i class="bi bi-arrow-left"></i> Voltar
            </button>
          </div>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">Erro: ${escapeHtml(err.message || err.error || 'Erro')}</div>`;
  }
}

function imprimirComprovante() {
  const card = document.getElementById('comprovante-card');
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Comprovante TechMotors</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <style>body{padding:2rem;font-family:sans-serif} .placa-badge{display:inline-block;padding:4px 10px;border:2px solid #ccc;border-radius:4px;font-family:monospace;font-weight:700;letter-spacing:1px}</style>
    </head><body>${card.innerHTML}<script>setTimeout(()=>{window.print();window.close()},500)<\/script></body></html>`);
}
