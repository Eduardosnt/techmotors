// TechMotors SPA Router
let currentPage = '';

function navegarPara(page, params = {}) {
  const hash = page + (Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '');
  window.location.hash = hash;
}

function getHashParams() {
  const hash = window.location.hash.slice(1);
  const [page, queryStr] = hash.split('?');
  const params = new URLSearchParams(queryStr || '');
  return { page: page || '', params };
}

function renderNavbar() {
  const user = getUser();
  const nav = document.getElementById('navbar-content');

  let links = '';
  let authArea = '';

  if (user) {
    if (user.tipo === 'cliente') {
      links = `
        <li class="nav-item"><a class="nav-link" href="#cliente-home"><i class="bi bi-house"></i> Início</a></li>
        <li class="nav-item"><a class="nav-link" href="#cliente-busca"><i class="bi bi-search"></i> Buscar</a></li>
        <li class="nav-item"><a class="nav-link" href="#cliente-agendamentos"><i class="bi bi-calendar-check"></i> Agendamentos</a></li>
        <li class="nav-item"><a class="nav-link" href="#cliente-historico"><i class="bi bi-clock-history"></i> Histórico</a></li>
        <li class="nav-item"><a class="nav-link" href="#cliente-favoritos"><i class="bi bi-heart"></i> Favoritos</a></li>
        <li class="nav-item"><a class="nav-link" href="#cliente-veiculos"><i class="bi bi-car-front"></i> Veículos</a></li>
        <li class="nav-item"><a class="nav-link position-relative" href="#cliente-notificacoes"><i class="bi bi-bell"></i> <span id="notif-badge" class="d-none badge bg-danger position-absolute" style="top:2px;right:2px;font-size:.6rem;padding:2px 5px">0</span></a></li>`;
    } else if (user.tipo === 'oficina') {
      links = `
        <li class="nav-item"><a class="nav-link" href="#oficina-agenda"><i class="bi bi-calendar-week"></i> Agenda</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-solicitacoes"><i class="bi bi-inbox"></i> Solicitações</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-mensagens"><i class="bi bi-chat-left-text"></i> Mensagens</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-disponibilidade"><i class="bi bi-clock"></i> Disponibilidade</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-bloqueios"><i class="bi bi-ban"></i> Bloqueios</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-servicos"><i class="bi bi-tools"></i> Serviços</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-metricas"><i class="bi bi-graph-up"></i> Métricas</a></li>
        <li class="nav-item"><a class="nav-link position-relative" href="#oficina-notificacoes"><i class="bi bi-bell"></i> <span id="notif-badge-ofi" class="d-none badge bg-danger position-absolute" style="top:2px;right:2px;font-size:.6rem;padding:2px 5px">0</span></a></li>`;
    } else if (user.tipo === 'admin') {
      links = `
        <li class="nav-item"><a class="nav-link" href="#admin-dashboard"><i class="bi bi-speedometer2"></i> Dashboard</a></li>
        <li class="nav-item"><a class="nav-link" href="#admin-pendentes"><i class="bi bi-hourglass-split"></i> Aprovações</a></li>
        <li class="nav-item"><a class="nav-link" href="#admin-usuarios"><i class="bi bi-people"></i> Usuários</a></li>
        <li class="nav-item"><a class="nav-link" href="#admin-catalogo"><i class="bi bi-journal-text"></i> Catálogo</a></li>
        <li class="nav-item"><a class="nav-link" href="#admin-ranking"><i class="bi bi-trophy"></i> Ranking</a></li>
        <li class="nav-item"><a class="nav-link" href="#admin-avaliacoes"><i class="bi bi-chat-square-quote"></i> Avaliações</a></li>
        <li class="nav-item"><a class="nav-link position-relative" href="#admin-notificacoes"><i class="bi bi-bell"></i> <span id="notif-badge-admin" class="d-none badge bg-danger position-absolute" style="top:2px;right:2px;font-size:.6rem;padding:2px 5px">0</span></a></li>`;
    }
    authArea = `
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown">
          ${user.foto_url
            ? `<img src="${user.foto_url}" class="rounded-circle me-1" style="width:28px;height:28px;object-fit:cover">`
            : `<i class="bi bi-person-circle"></i>`} ${escapeHtml(user.nome)}
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="#perfil"><i class="bi bi-person-gear"></i> Meu Perfil</a></li>
          <li><hr class="dropdown-divider"></li>
          <li class="px-3 py-2">
            <div class="small text-muted mb-1 fw-medium">Tema</div>
            <div class="btn-group btn-group-sm w-100" role="group">
              <input type="radio" class="btn-check" name="theme-opt" id="theme-light" value="light">
              <label class="btn btn-outline-secondary" for="theme-light"><i class="bi bi-sun"></i></label>
              <input type="radio" class="btn-check" name="theme-opt" id="theme-system" value="system">
              <label class="btn btn-outline-secondary" for="theme-system"><i class="bi bi-circle-half"></i></label>
              <input type="radio" class="btn-check" name="theme-opt" id="theme-dark" value="dark">
              <label class="btn btn-outline-secondary" for="theme-dark"><i class="bi bi-moon-stars"></i></label>
            </div>
          </li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" onclick="logout()"><i class="bi bi-box-arrow-right"></i> Sair</a></li>
        </ul>
      </li>`;
  } else {
    authArea = `
      <li class="nav-item"><a class="nav-link" href="#login">Entrar</a></li>
      <li class="nav-item"><a class="nav-link btn btn-tm-accent text-white px-3 ms-2" href="#cadastro">Cadastrar</a></li>
      <li class="nav-item ms-2">
        <button class="nav-link" id="btn-theme-toggle" title="Alternar tema">
          <i class="bi bi-circle-half"></i>
        </button>
      </li>`;
  }

  nav.innerHTML = `
    <ul class="navbar-nav me-auto">${links}</ul>
    <ul class="navbar-nav ms-auto">${authArea}</ul>`;

  // Highlight active nav link
  const currentHash = window.location.hash.split('?')[0];
  nav.querySelectorAll('.nav-link[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href === currentHash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Theme toggle (radio buttons for logged users)
  const currentTheme = localStorage.getItem('tm_theme') || 'system';
  const themeRadio = document.getElementById(`theme-${currentTheme}`);
  if (themeRadio) themeRadio.checked = true;
  document.querySelectorAll('input[name="theme-opt"]').forEach(radio => {
    radio.addEventListener('change', function() {
      const theme = this.value;
      localStorage.setItem('tm_theme', theme);
      let apply = theme;
      if (apply === 'system') {
        apply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', apply);
    });
  });

  // Theme toggle (simple button for non-logged users)
  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    const themes = ['light', 'system', 'dark'];
    const icons = ['bi-sun', 'bi-circle-half', 'bi-moon-stars'];
    let cur = localStorage.getItem('tm_theme') || 'system';
    let idx = (themes.indexOf(cur) + 1) % themes.length;
    localStorage.setItem('tm_theme', themes[idx]);
    let apply = themes[idx];
    if (apply === 'system') {
      apply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', apply);
    const btn = document.getElementById('btn-theme-toggle');
    btn.querySelector('i').className = 'bi ' + icons[idx];
  });

  // Check notification badge
  if (user && user.tipo === 'cliente') {
    checkNotifBadge();
  }
  if (user && user.tipo === 'oficina') {
    checkNotifBadgeOficina();
  }
  if (user && user.tipo === 'admin') {
    checkNotifBadgeAdmin();
  }
}

function logout() {
  clearAuth();
  renderNavbar();
  navegarPara('');
}

// Router
async function handleRoute() {
  const { page, params } = getHashParams();
  const fullHash = window.location.hash;
  // Always re-render if hash changed (including params)
  if (fullHash === handleRoute._lastHash) return;
  handleRoute._lastHash = fullHash;
  currentPage = page;

  const content = document.getElementById('app-content');
  const user = getUser();

  // Redirect if logged in and going to home
  if (!page && user) {
    if (user.tipo === 'cliente') { navegarPara('cliente-home'); return; }
    if (user.tipo === 'oficina') { navegarPara('oficina-agenda'); return; }
    if (user.tipo === 'admin') { navegarPara('admin-dashboard'); return; }
  }

  renderNavbar();

  try {
    switch (page) {
      case '': case 'home': renderLanding(content); break;
      case 'login': renderLogin(content); break;
      case 'cadastro': renderCadastro(content, params); break;
      case 'perfil': await renderPerfil(content); break;
      case 'esqueci-senha': renderEsqueciSenha(content); break;
      case 'redefinir-senha': renderRedefinirSenha(content, params); break;
      // Cliente
      case 'cliente-home': await renderClienteHome(content); break;
      case 'cliente-busca': await renderClienteBusca(content, params); break;
      case 'cliente-oficina': await renderClienteOficina(content, params); break;
      case 'cliente-agendar': await renderClienteAgendar(content, params); break;
      case 'cliente-agendamentos': await renderClienteAgendamentos(content); break;
      case 'cliente-historico': await renderClienteHistorico(content); break;
      case 'cliente-favoritos': await renderClienteFavoritos(content); break;
      case 'cliente-notificacoes': await renderClienteNotificacoes(content); break;
      case 'cliente-comprovante': await renderClienteComprovante(content, params); break;
      case 'cliente-veiculos': await renderClienteVeiculos(content); break;
      case 'cliente-avaliar': await renderClienteAvaliar(content, params); break;
      // Oficina
      case 'oficina-agenda': await renderOficinaAgenda(content, params); break;
      case 'oficina-solicitacoes': await renderOficinaSolicitacoes(content, params); break;
      case 'oficina-mensagens': await renderOficinaMensagens(content); break;
      case 'oficina-disponibilidade': await renderOficinaDisponibilidade(content); break;
      case 'oficina-bloqueios': await renderOficinaBloqueios(content); break;
      case 'oficina-servicos': await renderOficinaServicos(content); break;
      case 'oficina-perfil': await renderOficinaPerfil(content); break;
      case 'oficina-metricas': await renderOficinaMetricas(content); break;
      case 'oficina-notificacoes': await renderOficinaNotificacoes(content); break;
      case 'oficina-aguardando': await renderOficinaAguardando(content); break;
      // Admin
      case 'admin-dashboard': await renderAdminDashboard(content); break;
      case 'admin-pendentes': await renderAdminPendentes(content); break;
      case 'admin-oficina': await renderAdminOficina(content, params); break;
      case 'admin-usuarios': await renderAdminUsuarios(content, params); break;
      case 'admin-usuario': await renderAdminUsuarioDetalhe(content, params); break;
      case 'admin-catalogo': await renderAdminCatalogo(content); break;
      case 'admin-ranking': await renderAdminRanking(content); break;
      case 'admin-avaliacoes': await renderAdminAvaliacoes(content); break;
      case 'admin-notificacoes': await renderAdminNotificacoes(content); break;
      default: content.innerHTML = '<div class="alert alert-warning">Página não encontrada.</div>';
    }
  } catch (err) {
    if (err.status === 401) return;
    content.innerHTML = `<div class="alert alert-danger">Erro: ${escapeHtml(err.message || err.error || 'Erro desconhecido')}</div>`;
  }
}

// Landing Page
function renderLanding(el) {
  el.innerHTML = `
    <div class="hero text-center">
      <div class="container">
        <h1 class="display-4 fw-bold"><i class="bi bi-wrench-adjustable-circle"></i> TechMotors</h1>
        <p class="lead">Agende serviços automotivos em oficinas de confiança — sem complicação</p>
        <div class="mt-4">
          <a href="#cadastro?tipo=cliente" class="btn btn-tm-accent btn-lg me-2"><i class="bi bi-person-plus"></i> Sou Cliente</a>
          <a href="#cadastro?tipo=oficina" class="btn btn-light btn-lg"><i class="bi bi-shop"></i> Sou Oficina</a>
        </div>
      </div>
    </div>
    <div class="row mt-5 g-4">
      <div class="col-md-4"><div class="card p-4 h-100 text-center">
        <i class="bi bi-search categoria-icon"></i><h5 class="mt-3">Encontre oficinas</h5>
        <p class="text-muted">Busque por serviço, localização e veja avaliações reais.</p>
      </div></div>
      <div class="col-md-4"><div class="card p-4 h-100 text-center">
        <i class="bi bi-calendar-check categoria-icon"></i><h5 class="mt-3">Agende em segundos</h5>
        <p class="text-muted">Escolha data e horário e receba confirmação imediata.</p>
      </div></div>
      <div class="col-md-4"><div class="card p-4 h-100 text-center">
        <i class="bi bi-shield-check categoria-icon"></i><h5 class="mt-3">Pagamento presencial</h5>
        <p class="text-muted">Sem intermediação financeira — você paga direto na oficina.</p>
      </div></div>
    </div>`;
}

// Notification badge check
async function checkNotifBadge() {
  try {
    const data = await api('/cliente/notificacoes');
    const badge = document.getElementById('notif-badge');
    if (badge) {
      if (data.nao_lidas > 0) {
        badge.textContent = data.nao_lidas > 9 ? '9+' : data.nao_lidas;
        badge.classList.remove('d-none');
      } else {
        badge.classList.add('d-none');
      }
    }
  } catch(e) {}
}

async function checkNotifBadgeOficina() {
  try {
    const data = await api('/oficina/notificacoes');
    const badge = document.getElementById('notif-badge-ofi');
    if (badge) {
      if (data.nao_lidas > 0) {
        badge.textContent = data.nao_lidas > 9 ? '9+' : data.nao_lidas;
        badge.classList.remove('d-none');
      } else {
        badge.classList.add('d-none');
      }
    }
  } catch(e) {}
}

async function checkNotifBadgeAdmin() {
  try {
    const data = await api('/admin/notificacoes');
    const badge = document.getElementById('notif-badge-admin');
    if (badge) {
      if (data.nao_lidas > 0) {
        badge.textContent = data.nao_lidas > 9 ? '9+' : data.nao_lidas;
        badge.classList.remove('d-none');
      } else {
        badge.classList.add('d-none');
      }
    }
  } catch(e) {}
}

// Init
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  handleRoute();
});
