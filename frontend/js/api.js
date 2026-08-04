// API Helper - TechMotors Frontend
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('tm_token');
}

function getUser() {
  const u = localStorage.getItem('tm_user');
  return u ? JSON.parse(u) : null;
}

function setAuth(token, user) {
  localStorage.setItem('tm_token', token);
  localStorage.setItem('tm_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('tm_token');
  localStorage.removeItem('tm_user');
}

function isLogado() {
  return !!getToken();
}

async function api(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const config = {
    headers,
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  if (res.status === 401) {
    clearAuth();
    navegarPara('login');
    throw new Error('Sessão expirada');
  }

  const data = await res.json();

  if (!res.ok) {
    throw { status: res.status, ...data };
  }

  return data;
}

// Helpers de formatação
function fmtData(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtMoney(v) {
  if (v === null || v === undefined || v === 0) return 'A combinar';
  return 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function fmtStatus(s) {
  const m = {
    'solicitado': 'Solicitado', 'confirmado': 'Confirmado', 'concluido': 'Concluído',
    'cancelado': 'Cancelado', 'recusado': 'Recusado',
    'pendente': 'Pendente', 'aprovada': 'Aprovada', 'rejeitada': 'Rejeitada',
    'ativo': 'Ativo', 'inativo': 'Inativo', 'bloqueado': 'Bloqueado', 'pendente_aprovacao': 'Aguardando Aprovação'
  };
  return m[s] || s;
}

function badgeStatus(s) {
  const c = {
    'solicitado': 'warning', 'confirmado': 'primary', 'concluido': 'success',
    'cancelado': 'secondary', 'recusado': 'danger',
    'pendente': 'warning', 'aprovada': 'success', 'rejeitada': 'danger',
    'pendente_aprovacao': 'warning', 'ativo': 'success', 'bloqueado': 'danger', 'inativo': 'secondary'
  }[s] || 'secondary';
  return `<span class="badge bg-${c}">${fmtStatus(s)}</span>`;
}

function estrelas(nota, total) {
  let html = '';
  for (let i = 0; i < 5; i++) html += i < Math.round(nota) ? '★' : '☆';
  if (total !== undefined) html += ` <span class="text-muted ms-1">${parseFloat(nota).toFixed(1)} (${total})</span>`;
  return `<span class="estrelas">${html}</span>`;
}

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const cls = { info: 'bg-info', success: 'bg-success', error: 'bg-danger', warning: 'bg-warning' }[type] || 'bg-info';
  const toast = document.createElement('div');
  toast.className = `toast show align-items-center text-white ${cls} border-0 mb-2`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(msg)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.closest('.toast').remove()"></button>
    </div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}
