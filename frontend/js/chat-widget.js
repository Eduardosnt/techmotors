// ═══════════════════════════════════════════
// TechMotors Chat Widget — Bot + Atendente
// ═══════════════════════════════════════════

let chatState = { open: false, conversaId: null, status: 'bot', polling: null };

function initChatWidget() {
  // Só mostra para usuários logados
  if (!getUser()) { removeChatWidget(); return; }

  // Se já existe o widget, não recria
  if (document.getElementById('chat-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'chat-widget';
  widget.innerHTML = `
    <button id="chat-fab" class="chat-fab" title="Chat de suporte">
      <i class="bi bi-chat-dots-fill"></i>
      <span class="chat-fab-badge d-none">!</span>
    </button>
    <div id="chat-window" class="chat-window d-none">
      <div class="chat-header">
        <div class="d-flex align-items-center gap-2">
          <div class="chat-avatar">
            <i class="bi bi-robot"></i>
          </div>
          <div>
            <div class="chat-header-title">TechMotors Suporte</div>
            <div class="chat-header-status" id="chat-status-text">Assistente virtual</div>
          </div>
        </div>
        <div class="d-flex gap-1">
          <button class="chat-header-btn" id="chat-new-btn" title="Nova conversa"><i class="bi bi-plus-lg"></i></button>
          <button class="chat-header-btn" id="chat-close-btn" title="Fechar"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input-area">
        <form id="chat-form" class="d-flex gap-2">
          <input type="text" id="chat-input" class="form-control" placeholder="Digite sua mensagem..." autocomplete="off">
          <button type="submit" class="btn btn-tm-primary chat-send-btn"><i class="bi bi-send-fill"></i></button>
        </form>
      </div>
    </div>`;
  document.body.appendChild(widget);

  // Events
  document.getElementById('chat-fab').addEventListener('click', toggleChat);
  document.getElementById('chat-close-btn').addEventListener('click', toggleChat);
  document.getElementById('chat-new-btn').addEventListener('click', novaCoversa);
  document.getElementById('chat-form').addEventListener('submit', enviarMensagem);
}

function removeChatWidget() {
  const el = document.getElementById('chat-widget');
  if (el) el.remove();
  if (chatState.polling) { clearInterval(chatState.polling); chatState.polling = null; }
}

async function toggleChat() {
  chatState.open = !chatState.open;
  const win = document.getElementById('chat-window');
  const fab = document.getElementById('chat-fab');

  if (chatState.open) {
    win.classList.remove('d-none');
    fab.classList.add('active');
    if (!chatState.conversaId) await iniciarConversa();
    scrollChat();
    document.getElementById('chat-input').focus();
    startPolling();
  } else {
    win.classList.add('d-none');
    fab.classList.remove('active');
    stopPolling();
  }
}

async function iniciarConversa() {
  const msgs = document.getElementById('chat-messages');
  msgs.innerHTML = '<div class="chat-loading"><span class="spinner-border spinner-border-sm"></span> Conectando...</div>';

  try {
    const data = await api('/chat/iniciar', { method: 'POST', body: {} });
    chatState.conversaId = data.conversa.id;
    chatState.status = data.conversa.status;
    renderMensagens(data.mensagens);
    updateStatusUI();
  } catch (err) {
    msgs.innerHTML = '<div class="chat-system-msg">Erro ao conectar. Tente novamente.</div>';
  }
}

async function novaCoversa() {
  // Encerra conversa atual
  if (chatState.conversaId) {
    try { await api(`/chat/encerrar/${chatState.conversaId}`, { method: 'POST', body: {} }); } catch(e) {}
  }
  chatState.conversaId = null;
  chatState.status = 'bot';
  await iniciarConversa();
}

async function enviarMensagem(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg || !chatState.conversaId) return;

  input.value = '';
  appendMessage('cliente', msg);
  scrollChat();

  try {
    const data = await api('/chat/mensagem', {
      method: 'POST',
      body: { conversa_id: chatState.conversaId, conteudo: msg }
    });

    // Bot responses
    if (data.respostas && data.respostas.length > 0) {
      for (const r of data.respostas) {
        await sleep(500 + Math.random() * 500);
        appendMessage(r.remetente, r.conteudo);
      }
    }

    // Refresh status
    await refreshConversa();
    scrollChat();
  } catch (err) {
    appendMessage('bot', '⚠️ Erro ao enviar mensagem. Tente novamente.');
  }
}

function renderMensagens(mensagens) {
  const container = document.getElementById('chat-messages');
  container.innerHTML = '';
  mensagens.forEach(m => appendMessage(m.remetente, m.conteudo, m.criado_em));
  scrollChat();
}

function appendMessage(remetente, conteudo, timestamp) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg-${remetente}`;

  const time = timestamp ? new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

  // Parse markdown bold
  const html = escapeHtml(conteudo)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  let avatar = '';
  if (remetente === 'bot') avatar = '<i class="bi bi-robot"></i>';
  else if (remetente === 'oficina') avatar = '<i class="bi bi-building"></i>';
  else avatar = '<i class="bi bi-person"></i>';

  div.innerHTML = `
    <div class="chat-msg-avatar">${avatar}</div>
    <div class="chat-msg-content">
      <div class="chat-msg-bubble">${html}</div>
      ${time ? `<div class="chat-msg-time">${time}</div>` : ''}
    </div>`;
  container.appendChild(div);
}

function scrollChat() {
  const container = document.getElementById('chat-messages');
  if (container) container.scrollTop = container.scrollHeight;
}

function updateStatusUI() {
  const statusEl = document.getElementById('chat-status-text');
  const avatarEl = document.querySelector('.chat-avatar i');
  if (chatState.status === 'atendente') {
    statusEl.textContent = 'Falando com atendente';
    statusEl.style.color = '#10B981';
    if (avatarEl) avatarEl.className = 'bi bi-person-workspace';
  } else {
    statusEl.textContent = 'Assistente virtual';
    statusEl.style.color = '';
    if (avatarEl) avatarEl.className = 'bi bi-robot';
  }
}

async function refreshConversa() {
  if (!chatState.conversaId) return;
  try {
    const data = await api(`/chat/mensagens/${chatState.conversaId}`);
    if (data.conversa.status !== chatState.status) {
      chatState.status = data.conversa.status;
      updateStatusUI();
    }
  } catch(e) {}
}

// Polling for new messages (when talking to atendente)
function startPolling() {
  stopPolling();
  chatState.polling = setInterval(async () => {
    if (chatState.status !== 'atendente' || !chatState.conversaId) return;
    try {
      const data = await api(`/chat/mensagens/${chatState.conversaId}`);
      const container = document.getElementById('chat-messages');
      const currentCount = container.querySelectorAll('.chat-msg').length;
      if (data.mensagens.length > currentCount) {
        renderMensagens(data.mensagens);
      }
    } catch(e) {}
  }, 5000);
}

function stopPolling() {
  if (chatState.polling) { clearInterval(chatState.polling); chatState.polling = null; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Auto-init on page load and navigation
document.addEventListener('DOMContentLoaded', initChatWidget);
window.addEventListener('hashchange', () => setTimeout(initChatWidget, 100));
