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
        <li class="nav-item"><a class="nav-link" href="#cliente-veiculos"><i class="bi bi-car-front"></i> Veículos</a></li>`;
    } else if (user.tipo === 'oficina') {
      links = `
        <li class="nav-item"><a class="nav-link" href="#oficina-agenda"><i class="bi bi-calendar-week"></i> Agenda</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-solicitacoes"><i class="bi bi-inbox"></i> Solicitações</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-disponibilidade"><i class="bi bi-clock"></i> Disponibilidade</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-bloqueios"><i class="bi bi-ban"></i> Bloqueios</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-servicos"><i class="bi bi-tools"></i> Serviços</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-perfil"><i class="bi bi-building"></i> Perfil</a></li>
        <li class="nav-item"><a class="nav-link" href="#oficina-metricas"><i class="bi bi-graph-up"></i> Métricas</a></li>`;
    } else if (user.tipo === 'admin') {
      links = `
        <li class="nav-item"><a class="nav-link" href="#admin-dashboard"><i class="bi bi-speedometer2"></i> Dashboard</a></li>
        <li class="nav-item"><a class="nav-link" href="#admin-pendentes"><i class="bi bi-hourglass-split"></i> Aprovações</a></li>
        <li class="nav-item"><a class="nav-link" href="#admin-usuarios"><i class="bi bi-people"></i> Usuários</a></li>`;
    }
    authArea = `
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown">
          <i class="bi bi-person-circle"></i> ${escapeHtml(user.nome)}
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="#" onclick="logout()"><i class="bi bi-box-arrow-right"></i> Sair</a></li>
        </ul>
      </li>`;
  } else {
    authArea = `
      <li class="nav-item"><a class="nav-link" href="#login">Entrar</a></li>
      <li class="nav-item"><a class="nav-link btn btn-tm-accent text-white px-3 ms-2" href="#cadastro">Cadastrar</a></li>`;
  }

  nav.innerHTML = `
    <ul class="navbar-nav me-auto">${links}</ul>
    <ul class="navbar-nav">${authArea}</ul>`;
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
      // Cliente
      case 'cliente-home': await renderClienteHome(content); break;
      case 'cliente-busca': await renderClienteBusca(content, params); break;
      case 'cliente-oficina': await renderClienteOficina(content, params); break;
      case 'cliente-agendar': await renderClienteAgendar(content, params); break;
      case 'cliente-agendamentos': await renderClienteAgendamentos(content); break;
      case 'cliente-veiculos': await renderClienteVeiculos(content); break;
      case 'cliente-avaliar': await renderClienteAvaliar(content, params); break;
      // Oficina
      case 'oficina-agenda': await renderOficinaAgenda(content, params); break;
      case 'oficina-solicitacoes': await renderOficinaSolicitacoes(content, params); break;
      case 'oficina-disponibilidade': await renderOficinaDisponibilidade(content); break;
      case 'oficina-bloqueios': await renderOficinaBloqueios(content); break;
      case 'oficina-servicos': await renderOficinaServicos(content); break;
      case 'oficina-perfil': await renderOficinaPerfil(content); break;
      case 'oficina-metricas': await renderOficinaMetricas(content); break;
      case 'oficina-aguardando': await renderOficinaAguardando(content); break;
      // Admin
      case 'admin-dashboard': await renderAdminDashboard(content); break;
      case 'admin-pendentes': await renderAdminPendentes(content); break;
      case 'admin-oficina': await renderAdminOficina(content, params); break;
      case 'admin-usuarios': await renderAdminUsuarios(content, params); break;
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

// Init
window.addEventListener('hashchange', handleRoute);
window.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  handleRoute();
});
