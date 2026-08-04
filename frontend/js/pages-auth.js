// Login & Cadastro Pages

function renderLogin(el) {
  el.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-5">
        <div class="card p-4">
          <h3 class="text-center mb-4"><i class="bi bi-box-arrow-in-right text-tm-primary"></i> Entrar</h3>
          <form id="form-login">
            <div class="mb-3">
              <label class="form-label">E-mail</label>
              <input type="email" id="login-email" class="form-control" required autofocus>
            </div>
            <div class="mb-3">
              <label class="form-label">Senha</label>
              <div class="input-group">
                <input type="password" id="login-senha" class="form-control" required>
                <button type="button" class="btn btn-outline-secondary" onclick="togglePass('login-senha', this)"><i class="bi bi-eye"></i></button>
              </div>
            </div>
            <button class="btn btn-tm-primary w-100 mb-3">Entrar</button>
            <div class="text-center mb-3"><a href="#esqueci-senha" class="small">Esqueci minha senha</a></div>
            <hr>
            <div class="text-center">Não tem conta? <a href="#cadastro">Cadastre-se</a></div>
          </form>
        </div>
        <div class="card p-3 mt-3 small">
          <strong>Contas de teste:</strong><br>
          Admin: admin@techmotors.com<br>
          Cliente: joao@email.com<br>
          Oficina aprovada: jm@oficina.com<br>
          <em>Senha: Senha@123</em>
        </div>
      </div>
    </div>`;

  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: {
          email: document.getElementById('login-email').value,
          senha: document.getElementById('login-senha').value
        }
      });
      setAuth(data.token, data.user);
      showToast('Login realizado!', 'success');
      renderNavbar();
      if (data.user.tipo === 'cliente') navegarPara('cliente-home');
      else if (data.user.tipo === 'oficina') navegarPara('oficina-agenda');
      else if (data.user.tipo === 'admin') navegarPara('admin-dashboard');
    } catch (err) {
      showToast(err.error || 'Erro ao fazer login', 'error');
    }
  });
}

function renderCadastro(el, params) {
  let tipo = params.get('tipo') || 'cliente';
  if (!['cliente', 'oficina'].includes(tipo)) tipo = 'cliente';

  el.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-7">
        <div class="card p-4">
          <h3 class="mb-3"><i class="bi bi-person-plus text-tm-primary"></i> Criar Conta</h3>
          <ul class="nav nav-pills mb-3">
            <li class="nav-item">
              <button type="button" class="nav-link ${tipo === 'cliente' ? 'active bg-tm-primary' : ''}" onclick="alternarTipoCad('cliente')">
                <i class="bi bi-person"></i> Pessoa Física
              </button>
            </li>
            <li class="nav-item">
              <button type="button" class="nav-link ${tipo === 'oficina' ? 'active bg-tm-primary' : ''}" onclick="alternarTipoCad('oficina')">
                <i class="bi bi-building"></i> Pessoa Jurídica
              </button>
            </li>
          </ul>
          <div id="erros-cadastro"></div>
          <form id="form-cadastro">
            <input type="hidden" id="cad-tipo" value="${tipo}">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Nome completo *</label>
                <input id="cad-nome" class="form-control" required>
              </div>
              <div class="col-md-6" id="campo-cpf-wrap" ${tipo === 'oficina' ? 'style="display:none"' : ''}>
                <label class="form-label">CPF *</label>
                <input id="cad-cpf" class="form-control" placeholder="000.000.000-00">
              </div>
              <div class="col-md-6" id="campo-cnpj-wrap" ${tipo !== 'oficina' ? 'style="display:none"' : ''}>
                <label class="form-label">CNPJ *</label>
                <input id="cad-cnpj" class="form-control" placeholder="00.000.000/0001-00">
              </div>
              <div class="col-12" id="campos-pj" ${tipo !== 'oficina' ? 'style="display:none"' : ''}>
                <div class="row g-3">
                  <div class="col-md-6"><label class="form-label">Nome Fantasia *</label><input id="cad-nome-fantasia" class="form-control"></div>
                  <div class="col-md-6"><label class="form-label">Razão Social</label><input id="cad-razao-social" class="form-control"></div>
                  <div class="col-md-8"><label class="form-label">Logradouro</label><input id="cad-logradouro" class="form-control"></div>
                  <div class="col-md-4"><label class="form-label">Número</label><input id="cad-numero" class="form-control"></div>
                  <div class="col-md-5"><label class="form-label">Bairro</label><input id="cad-bairro" class="form-control"></div>
                  <div class="col-md-4"><label class="form-label">Cidade</label><input id="cad-cidade" class="form-control" value="Brasília"></div>
                  <div class="col-md-1"><label class="form-label">UF</label><input id="cad-uf" class="form-control" value="DF" maxlength="2"></div>
                  <div class="col-md-2"><label class="form-label">CEP</label><input id="cad-cep" class="form-control"></div>
                </div>
              </div>
              <div class="col-md-6"><label class="form-label">E-mail *</label><input type="email" id="cad-email" class="form-control" required></div>
              <div class="col-md-6"><label class="form-label">Telefone</label><input id="cad-telefone" class="form-control" placeholder="(61) 9...."></div>
              <div class="col-md-6">
                <label class="form-label">Senha *</label>
                <div class="input-group">
                  <input type="password" id="cad-senha" class="form-control" required>
                  <button type="button" class="btn btn-outline-secondary" onclick="togglePass('cad-senha',this)"><i class="bi bi-eye"></i></button>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Confirmar senha *</label>
                <div class="input-group">
                  <input type="password" id="cad-senha2" class="form-control" required>
                  <button type="button" class="btn btn-outline-secondary" onclick="togglePass('cad-senha2',this)"><i class="bi bi-eye"></i></button>
                </div>
              </div>
            </div>
            <div class="form-text mt-2"><i class="bi bi-info-circle"></i> Senha: mín. 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial.</div>
            <div class="form-check mt-3">
              <input type="checkbox" id="cad-aceite" class="form-check-input" required>
              <label for="cad-aceite" class="form-check-label">Aceito os Termos de Uso e Política de Privacidade (LGPD).</label>
            </div>
            <button class="btn btn-tm-primary w-100 mt-4">Criar Conta</button>
          </form>
        </div>
      </div>
    </div>`;

  document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errosDiv = document.getElementById('erros-cadastro');
    errosDiv.innerHTML = '';
    const tipo = document.getElementById('cad-tipo').value;
    const body = {
      tipo,
      nome: document.getElementById('cad-nome').value.trim(),
      email: document.getElementById('cad-email').value.trim(),
      telefone: document.getElementById('cad-telefone').value.trim(),
      senha: document.getElementById('cad-senha').value,
      senha2: document.getElementById('cad-senha2').value,
      aceite: document.getElementById('cad-aceite').checked
    };

    // Validação local
    const errosLocal = [];
    if (!body.nome) errosLocal.push('Nome é obrigatório.');
    if (!body.email) errosLocal.push('E-mail é obrigatório.');
    if (!body.senha || body.senha.length < 8) errosLocal.push('Senha deve ter pelo menos 8 caracteres.');
    if (body.senha !== body.senha2) errosLocal.push('Senhas não conferem.');
    if (!body.aceite) errosLocal.push('Aceite os termos de uso.');

    if (tipo === 'cliente') {
      body.cpf = document.getElementById('cad-cpf').value.trim();
      const cpfDigits = body.cpf.replace(/\D/g, '');
      if (cpfDigits.length !== 11) errosLocal.push('CPF deve ter 11 dígitos.');
    } else {
      body.cnpj = document.getElementById('cad-cnpj').value.trim();
      body.nome_fantasia = document.getElementById('cad-nome-fantasia').value.trim();
      body.razao_social = document.getElementById('cad-razao-social').value.trim();
      body.logradouro = document.getElementById('cad-logradouro').value.trim();
      body.numero = document.getElementById('cad-numero').value.trim();
      body.bairro = document.getElementById('cad-bairro').value.trim();
      body.cidade = document.getElementById('cad-cidade').value.trim();
      body.uf = document.getElementById('cad-uf').value.trim();
      body.cep = document.getElementById('cad-cep').value.trim();
      const cnpjDigits = body.cnpj.replace(/\D/g, '');
      if (cnpjDigits.length !== 14) errosLocal.push('CNPJ deve ter 14 dígitos.');
      if (!body.nome_fantasia) errosLocal.push('Nome fantasia é obrigatório.');
    }

    if (errosLocal.length > 0) {
      errosDiv.innerHTML = errosLocal.map(e => `<div class="alert alert-danger py-2">${escapeHtml(e)}</div>`).join('');
      return;
    }

    try {
      const data = await api('/auth/cadastro', { method: 'POST', body });
      setAuth(data.token, data.user);
      showToast('Cadastro realizado com sucesso!', 'success');
      renderNavbar();
      if (data.user.tipo === 'cliente') navegarPara('cliente-home');
      else navegarPara('oficina-aguardando');
    } catch (err) {
      const errosDiv = document.getElementById('erros-cadastro');
      if (err.errors) {
        errosDiv.innerHTML = err.errors.map(e => `<div class="alert alert-danger py-2">${escapeHtml(e)}</div>`).join('');
      } else {
        errosDiv.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.error || 'Erro ao cadastrar')}</div>`;
      }
    }
  });
}

function alternarTipoCad(tipo) {
  document.getElementById('cad-tipo').value = tipo;
  document.getElementById('campo-cpf-wrap').style.display = tipo === 'cliente' ? '' : 'none';
  document.getElementById('campo-cnpj-wrap').style.display = tipo === 'oficina' ? '' : 'none';
  document.getElementById('campos-pj').style.display = tipo === 'oficina' ? '' : 'none';
  document.querySelectorAll('.nav-pills .nav-link').forEach((btn, i) => {
    btn.className = 'nav-link' + ((i === 0 && tipo === 'cliente') || (i === 1 && tipo === 'oficina') ? ' active bg-tm-primary' : '');
  });
}

function togglePass(id, btn) {
  const inp = document.getElementById(id);
  const ico = btn.querySelector('i');
  if (inp.type === 'password') { inp.type = 'text'; ico.className = 'bi bi-eye-slash'; }
  else { inp.type = 'password'; ico.className = 'bi bi-eye'; }
}

// ─── PERFIL ─────────────────────────────────────────
async function renderPerfil(el) {
  el.innerHTML = '<div class="loading">Carregando perfil...</div>';

  try {
    const data = await api('/auth/perfil');
    const user = data.user;
    const extra = data.extra;
    const isOficina = user.tipo === 'oficina';
    const isCliente = user.tipo === 'cliente';

    const membroDesde = new Date(user.criado_em).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // Campos extras para oficina
    const camposOficina = isOficina ? `
      <hr class="my-4">
      <h6 class="fw-bold mb-3"><i class="bi bi-building text-tm-primary"></i> Dados da Oficina</h6>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Nome Fantasia *</label>
          <input id="perfil-nome-fantasia" class="form-control" value="${escapeHtml(extra.nome_fantasia || '')}">
        </div>
        <div class="col-md-6">
          <label class="form-label">CNPJ</label>
          <input class="form-control" value="${escapeHtml(extra.cnpj || '')}" disabled>
        </div>
        <div class="col-md-6">
          <label class="form-label">Logradouro</label>
          <input id="perfil-logradouro" class="form-control" value="${escapeHtml(extra.logradouro || '')}">
        </div>
        <div class="col-md-2">
          <label class="form-label">Número</label>
          <input id="perfil-numero" class="form-control" value="${escapeHtml(extra.numero || '')}">
        </div>
        <div class="col-md-4">
          <label class="form-label">Bairro</label>
          <input id="perfil-bairro" class="form-control" value="${escapeHtml(extra.bairro || '')}">
        </div>
        <div class="col-md-4">
          <label class="form-label">Cidade</label>
          <input id="perfil-cidade" class="form-control" value="${escapeHtml(extra.cidade || '')}">
        </div>
        <div class="col-md-2">
          <label class="form-label">UF</label>
          <input id="perfil-uf" class="form-control" value="${escapeHtml(extra.uf || 'DF')}" maxlength="2">
        </div>
        <div class="col-md-3">
          <label class="form-label">CEP</label>
          <input id="perfil-cep" class="form-control" value="${escapeHtml(extra.cep || '')}">
        </div>
        <div class="col-md-3">
          <label class="form-label">Latitude</label>
          <input id="perfil-lat" type="number" step="any" class="form-control" value="${extra.latitude || ''}" placeholder="-15.80">
        </div>
        <div class="col-md-3">
          <label class="form-label">Longitude</label>
          <input id="perfil-lng" type="number" step="any" class="form-control" value="${extra.longitude || ''}" placeholder="-47.90">
        </div>
        <div class="col-md-3 d-flex align-items-end">
          <button type="button" class="btn btn-outline-primary btn-sm w-100" id="btn-geolocalizar">
            <i class="bi bi-geo-alt"></i> Usar minha localização
          </button>
        </div>
      </div>` : '';

    // CPF (somente exibição para cliente)
    const campoCpf = isCliente ? `
      <div class="col-md-6">
        <label class="form-label">CPF</label>
        <input class="form-control" value="${escapeHtml(extra.cpf || '')}" disabled>
      </div>` : '';

    el.innerHTML = `
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="d-flex align-items-center gap-3 mb-4">
            <div class="position-relative">
              <div class="rounded-circle overflow-hidden d-flex align-items-center justify-content-center" id="perfil-avatar-container" style="width:80px;height:80px;background:var(--tm-primary-50);cursor:pointer" title="Clique para alterar foto">
                ${user.foto_url
                  ? `<img src="${user.foto_url}" style="width:100%;height:100%;object-fit:cover" id="perfil-avatar-img">`
                  : `<i class="bi bi-person-fill" style="font-size:2.5rem;color:var(--tm-primary)" id="perfil-avatar-icon"></i>`}
              </div>
              <label for="perfil-foto-input" class="position-absolute bottom-0 end-0 bg-tm-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width:28px;height:28px;cursor:pointer;border:2px solid #fff">
                <i class="bi bi-camera-fill" style="font-size:.75rem"></i>
              </label>
              <input type="file" id="perfil-foto-input" accept="image/jpeg,image/png,image/webp" class="d-none">
            </div>
            <div>
              <h4 class="fw-bold mb-0">Meu Perfil</h4>
              <span class="text-muted small">Membro desde ${membroDesde} · ${fmtStatus(user.status)}</span>
              ${user.foto_url ? `<br><button class="btn btn-sm btn-outline-danger mt-1" id="btn-remover-foto"><i class="bi bi-trash3"></i> Remover foto</button>` : ''}
            </div>
          </div>

          <div class="card p-4">
            <form id="form-perfil">
              <h6 class="fw-bold mb-3"><i class="bi bi-person text-tm-primary"></i> Informações Pessoais</h6>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Nome *</label>
                  <input id="perfil-nome" class="form-control" value="${escapeHtml(user.nome)}" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">E-mail</label>
                  <input class="form-control" value="${escapeHtml(user.email)}" disabled>
                  <div class="form-text">E-mail não pode ser alterado.</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Telefone</label>
                  <input id="perfil-telefone" class="form-control" value="${escapeHtml(user.telefone || '')}" placeholder="(61) 99999-0000">
                </div>
                ${campoCpf}
              </div>

              ${camposOficina}

              <hr class="my-4">
              <h6 class="fw-bold mb-3"><i class="bi bi-shield-lock text-tm-primary"></i> Alterar Senha <span class="text-muted fw-normal small">(opcional)</span></h6>
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">Senha atual</label>
                  <div class="input-group">
                    <input type="password" id="perfil-senha-atual" class="form-control">
                    <button type="button" class="btn btn-outline-secondary" onclick="togglePass('perfil-senha-atual',this)"><i class="bi bi-eye"></i></button>
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Nova senha</label>
                  <div class="input-group">
                    <input type="password" id="perfil-senha-nova" class="form-control">
                    <button type="button" class="btn btn-outline-secondary" onclick="togglePass('perfil-senha-nova',this)"><i class="bi bi-eye"></i></button>
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Confirmar nova senha</label>
                  <div class="input-group">
                    <input type="password" id="perfil-senha-nova2" class="form-control">
                    <button type="button" class="btn btn-outline-secondary" onclick="togglePass('perfil-senha-nova2',this)"><i class="bi bi-eye"></i></button>
                  </div>
                </div>
              </div>
              <div class="form-text"><i class="bi bi-info-circle"></i> Preencha os campos de senha apenas se quiser alterá-la.</div>

              <div id="perfil-erros" class="mt-3"></div>

              <div class="d-flex justify-content-end mt-4 gap-2">
                <button type="button" class="btn btn-outline-secondary" onclick="history.back()">Cancelar</button>
                <button type="submit" class="btn btn-tm-primary" id="btn-salvar-perfil">
                  <i class="bi bi-check-lg"></i> Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>`;

    // Upload de foto
    document.getElementById('perfil-foto-input')?.addEventListener('change', async function() {
      const file = this.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { showToast('Imagem muito grande (máx 5MB)', 'warning'); return; }

      const formData = new FormData();
      formData.append('foto', file);

      try {
        const token = getToken();
        const res = await fetch('/api/auth/foto', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw data;

        showToast('Foto atualizada!', 'success');
        // Atualizar avatar na página
        const container = document.getElementById('perfil-avatar-container');
        container.innerHTML = `<img src="${data.foto_url}" style="width:100%;height:100%;object-fit:cover">`;
        renderNavbar();
      } catch (err) {
        showToast(err.error || 'Erro ao enviar foto', 'error');
      }
    });

    document.getElementById('perfil-avatar-container')?.addEventListener('click', () => {
      document.getElementById('perfil-foto-input')?.click();
    });

    document.getElementById('btn-remover-foto')?.addEventListener('click', async () => {
      if (!confirm('Remover foto de perfil?')) return;
      try {
        await api('/auth/foto', { method: 'DELETE' });
        showToast('Foto removida', 'info');
        await renderPerfil(el);
      } catch (err) { showToast(err.error || 'Erro', 'error'); }
    });

    // Geolocalização para oficina
    document.getElementById('btn-geolocalizar')?.addEventListener('click', () => {
      if (!navigator.geolocation) { showToast('Geolocalização não suportada.', 'warning'); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          document.getElementById('perfil-lat').value = pos.coords.latitude.toFixed(6);
          document.getElementById('perfil-lng').value = pos.coords.longitude.toFixed(6);
          showToast('Localização capturada!', 'success');
        },
        () => showToast('Não foi possível obter localização.', 'error'),
        { timeout: 10000 }
      );
    });

    // Submit
    document.getElementById('form-perfil').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errosDiv = document.getElementById('perfil-erros');
      errosDiv.innerHTML = '';

      const body = {
        nome: document.getElementById('perfil-nome').value.trim(),
        telefone: document.getElementById('perfil-telefone').value.trim(),
        senha_atual: document.getElementById('perfil-senha-atual').value,
        senha_nova: document.getElementById('perfil-senha-nova').value,
        senha_nova2: document.getElementById('perfil-senha-nova2').value
      };

      // Validação local de senha
      if (body.senha_nova && body.senha_nova !== body.senha_nova2) {
        errosDiv.innerHTML = '<div class="alert alert-danger py-2">Novas senhas não conferem.</div>';
        return;
      }

      // Dados da oficina
      if (isOficina) {
        body.nome_fantasia = document.getElementById('perfil-nome-fantasia').value.trim();
        body.logradouro = document.getElementById('perfil-logradouro').value.trim();
        body.numero = document.getElementById('perfil-numero').value.trim();
        body.bairro = document.getElementById('perfil-bairro').value.trim();
        body.cidade = document.getElementById('perfil-cidade').value.trim();
        body.uf = document.getElementById('perfil-uf').value.trim();
        body.cep = document.getElementById('perfil-cep').value.trim();
        body.latitude = parseFloat(document.getElementById('perfil-lat').value) || null;
        body.longitude = parseFloat(document.getElementById('perfil-lng').value) || null;
      }

      const btn = document.getElementById('btn-salvar-perfil');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

      try {
        const resp = await api('/auth/perfil', { method: 'PUT', body });
        // Atualiza token e user no localStorage
        if (resp.token && resp.user) {
          setAuth(resp.token, resp.user);
          renderNavbar();
        }
        showToast(resp.message || 'Perfil atualizado!', 'success');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Salvar Alterações';
        // Limpar campos de senha
        document.getElementById('perfil-senha-atual').value = '';
        document.getElementById('perfil-senha-nova').value = '';
        document.getElementById('perfil-senha-nova2').value = '';
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Salvar Alterações';
        errosDiv.innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(err.error || 'Erro ao salvar')}</div>`;
      }
    });

  } catch (err) {
    el.innerHTML = `<div class="alert alert-danger">Erro ao carregar perfil: ${escapeHtml(err.message || err.error || 'Erro')}</div>`;
  }
}


// ─── ESQUECI SENHA ──────────────────────────────────
function renderEsqueciSenha(el) {
  el.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-5">
        <div class="card p-4">
          <div class="text-center mb-4">
            <div class="rounded-circle d-inline-flex align-items-center justify-content-center" style="width:64px;height:64px;background:var(--tm-primary-50)">
              <i class="bi bi-envelope-at" style="font-size:1.5rem;color:var(--tm-primary)"></i>
            </div>
            <h4 class="fw-bold mt-3">Esqueceu sua senha?</h4>
            <p class="text-muted small">Informe seu e-mail e enviaremos um link para redefinir sua senha.</p>
          </div>
          <div id="esqueci-msg"></div>
          <form id="form-esqueci">
            <div class="mb-3">
              <label class="form-label">E-mail cadastrado</label>
              <input type="email" id="esqueci-email" class="form-control" required autofocus placeholder="seu.email@exemplo.com">
            </div>
            <button type="submit" class="btn btn-tm-primary w-100" id="btn-esqueci">
              <i class="bi bi-send"></i> Enviar link de recuperação
            </button>
          </form>
          <div class="text-center mt-3">
            <a href="#login" class="small"><i class="bi bi-arrow-left"></i> Voltar ao login</a>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('form-esqueci').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('esqueci-email').value.trim();
    const btn = document.getElementById('btn-esqueci');
    const msgDiv = document.getElementById('esqueci-msg');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';

    try {
      const data = await api('/auth/esqueci-senha', { method: 'POST', body: { email } });
      msgDiv.innerHTML = `
        <div class="alert alert-success">
          <i class="bi bi-check-circle"></i> ${escapeHtml(data.message)}
        </div>`;
      btn.innerHTML = '<i class="bi bi-check"></i> Enviado';
    } catch (err) {
      msgDiv.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.error || 'Erro ao enviar')}</div>`;
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-send"></i> Enviar link de recuperação';
    }
  });
}

// ─── REDEFINIR SENHA ────────────────────────────────
async function renderRedefinirSenha(el, params) {
  const token = params.get('token');

  if (!token) {
    el.innerHTML = '<div class="alert alert-danger">Link inválido. Solicite um novo link de recuperação.</div>';
    return;
  }

  // Verificar se token é válido
  try {
    const check = await api(`/auth/verificar-token-reset/${token}`);
    if (!check.valido) {
      el.innerHTML = `
        <div class="row justify-content-center"><div class="col-md-5"><div class="card p-4 text-center">
          <i class="bi bi-x-circle" style="font-size:3rem;color:var(--tm-danger)"></i>
          <h5 class="fw-bold mt-3">Link expirado</h5>
          <p class="text-muted">Este link de recuperação é inválido ou expirou.</p>
          <a href="#esqueci-senha" class="btn btn-tm-primary">Solicitar novo link</a>
        </div></div></div>`;
      return;
    }
  } catch(e) {}

  el.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-5">
        <div class="card p-4">
          <div class="text-center mb-4">
            <div class="rounded-circle d-inline-flex align-items-center justify-content-center" style="width:64px;height:64px;background:var(--tm-success-50)">
              <i class="bi bi-shield-lock" style="font-size:1.5rem;color:var(--tm-success)"></i>
            </div>
            <h4 class="fw-bold mt-3">Nova senha</h4>
            <p class="text-muted small">Crie uma nova senha para sua conta.</p>
          </div>
          <div id="redefinir-msg"></div>
          <form id="form-redefinir">
            <div class="mb-3">
              <label class="form-label">Nova senha</label>
              <div class="input-group">
                <input type="password" id="redefinir-senha" class="form-control" required>
                <button type="button" class="btn btn-outline-secondary" onclick="togglePass('redefinir-senha',this)"><i class="bi bi-eye"></i></button>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label">Confirmar nova senha</label>
              <div class="input-group">
                <input type="password" id="redefinir-senha2" class="form-control" required>
                <button type="button" class="btn btn-outline-secondary" onclick="togglePass('redefinir-senha2',this)"><i class="bi bi-eye"></i></button>
              </div>
            </div>
            <div class="form-text mb-3"><i class="bi bi-info-circle"></i> Mín. 8 caracteres, 1 maiúscula, 1 número, 1 especial.</div>
            <button type="submit" class="btn btn-tm-primary w-100" id="btn-redefinir">
              <i class="bi bi-check-lg"></i> Redefinir senha
            </button>
          </form>
        </div>
      </div>
    </div>`;

  document.getElementById('form-redefinir').addEventListener('submit', async (e) => {
    e.preventDefault();
    const senha = document.getElementById('redefinir-senha').value;
    const senha2 = document.getElementById('redefinir-senha2').value;
    const btn = document.getElementById('btn-redefinir');
    const msgDiv = document.getElementById('redefinir-msg');

    if (senha !== senha2) {
      msgDiv.innerHTML = '<div class="alert alert-danger">Senhas não conferem.</div>';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

    try {
      const data = await api('/auth/redefinir-senha', { method: 'POST', body: { token, senha, senha2 } });
      msgDiv.innerHTML = `
        <div class="alert alert-success">
          <i class="bi bi-check-circle"></i> ${escapeHtml(data.message)}
        </div>`;
      btn.innerHTML = '<i class="bi bi-check"></i> Senha redefinida';
      setTimeout(() => navegarPara('login'), 2000);
    } catch (err) {
      msgDiv.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.error || 'Erro')}</div>`;
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-lg"></i> Redefinir senha';
    }
  });
}
