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
