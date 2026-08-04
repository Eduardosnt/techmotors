import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../config/database';
import { gerarToken, autenticar, AuthRequest } from '../middleware/auth';

const router = Router();

// Configuração do multer para upload de fotos
const uploadsDir = path.join(__dirname, '../../../frontend/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `perfil-${req.user?.id || 'unknown'}-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Formato inválido. Use JPG, PNG ou WebP.'));
  }
});

// Configuração do transporter de e-mail
// Para Gmail: ative "Senhas de app" em https://myaccount.google.com/apppasswords
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'seu.email@gmail.com',
    pass: process.env.EMAIL_PASS || 'sua-senha-de-app'
  }
});

// Armazena tokens de reset temporariamente (em produção usaria tabela no DB)
const resetTokens = new Map<string, { userId: number; expires: number }>();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
      return;
    }

    const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email) as any;

    if (!user || !await bcrypt.compare(senha, user.senha)) {
      res.status(401).json({ error: 'E-mail ou senha inválidos' });
      return;
    }

    if (user.status === 'bloqueado') {
      res.status(403).json({ error: 'Sua conta está bloqueada.' });
      return;
    }

    const token = gerarToken({
      id: user.id, nome: user.nome, email: user.email,
      tipo: user.tipo, status: user.status
    });

    res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo, status: user.status, foto_url: user.foto_url } });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
});

// POST /api/auth/cadastro
router.post('/cadastro', async (req: Request, res: Response) => {
  try {
    const { nome, email, senha, senha2, telefone, tipo, aceite, cpf, cnpj, nome_fantasia, razao_social, logradouro, numero, bairro, cidade, uf, cep } = req.body;

    const erros: string[] = [];
    if (!nome) erros.push('Nome obrigatório.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.push('E-mail inválido.');
    if (!senhaForte(senha || '')) erros.push('Senha deve ter mín. 8 caracteres, 1 maiúscula, 1 número e 1 caractere especial.');
    if (senha !== senha2) erros.push('Senhas não conferem.');
    if (!aceite && aceite !== 'true' && aceite !== true) erros.push('Você precisa aceitar os Termos de Uso.');

    if (tipo === 'cliente') {
      const cpfLimpo = (cpf || '').replace(/\D/g, '');
      if (cpfLimpo.length !== 11) erros.push('CPF inválido (deve ter 11 dígitos).');
    } else if (tipo === 'oficina') {
      const cnpjLimpo = (cnpj || '').replace(/\D/g, '');
      if (cnpjLimpo.length !== 14) erros.push('CNPJ inválido (deve ter 14 dígitos).');
      if (!nome_fantasia) erros.push('Nome fantasia obrigatório.');
    } else {
      erros.push('Tipo de cadastro inválido.');
    }

    if (erros.length > 0) { res.status(400).json({ errors: erros }); return; }

    const existing = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (existing) { res.status(400).json({ errors: ['E-mail já cadastrado.'] }); return; }

    const hash = await bcrypt.hash(senha, 10);
    const status = tipo === 'oficina' ? 'pendente_aprovacao' : 'ativo';

    const transaction = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO usuarios (nome, email, senha, telefone, tipo, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(nome, email, hash, telefone || null, tipo, status);
      const uid = result.lastInsertRowid as number;

      if (tipo === 'cliente') {
        const cpfLimpo = (cpf || '').replace(/\D/g, '');
        const cpfFmt = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        db.prepare('INSERT INTO clientes (usuario_id, cpf) VALUES (?, ?)').run(uid, cpfFmt);
      } else {
        db.prepare(
          'INSERT INTO oficinas (usuario_id, cnpj, nome_fantasia, razao_social, logradouro, numero, bairro, cidade, uf, cep, status_aprovacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(uid, cnpj, nome_fantasia, razao_social || '', logradouro || '', numero || '', bairro || '', cidade || '', uf || 'DF', cep || '', 'pendente');
      }

      return uid;
    });

    const uid = transaction();

    // Notificar admin se for oficina pendente
    if (tipo === 'oficina') {
      const admins = db.prepare("SELECT id FROM usuarios WHERE tipo='admin'").all() as any[];
      for (const adm of admins) {
        db.prepare('INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link) VALUES (?, ?, ?, ?, ?)')
          .run(adm.id, 'nova_oficina', '🏪 Nova oficina aguardando aprovação', `${nome_fantasia || nome} se cadastrou e aguarda aprovação.`, '#admin-pendentes');
      }
    }

    const token = gerarToken({ id: uid as number, nome, email, tipo, status });
    res.status(201).json({ token, user: { id: uid, nome, email, tipo, status } });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      if (err.message.includes('cpf')) res.status(400).json({ errors: ['CPF já cadastrado.'] });
      else if (err.message.includes('cnpj')) res.status(400).json({ errors: ['CNPJ já cadastrado.'] });
      else if (err.message.includes('email')) res.status(400).json({ errors: ['E-mail já cadastrado.'] });
      else res.status(400).json({ errors: ['Registro duplicado.'] });
    } else {
      res.status(500).json({ error: 'Erro ao cadastrar: ' + err.message });
    }
  }
});

// GET /api/auth/me
router.get('/me', autenticar, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// GET /api/auth/perfil — dados completos do perfil
router.get('/perfil', autenticar, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT id, nome, email, telefone, tipo, status, foto_url, criado_em FROM usuarios WHERE id=?').get(req.user!.id) as any;
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }

    let extra: any = {};
    if (user.tipo === 'cliente') {
      extra = db.prepare('SELECT cpf FROM clientes WHERE usuario_id=?').get(user.id) || {};
    } else if (user.tipo === 'oficina') {
      extra = db.prepare('SELECT * FROM oficinas WHERE usuario_id=?').get(user.id) || {};
    }

    res.json({ user, extra });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/foto — upload de foto de perfil
router.post('/foto', autenticar, (req: AuthRequest, res: Response) => {
  upload.single('foto')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Erro no upload' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Nenhuma imagem enviada' });
      return;
    }
    try {
      const fotoUrl = `/uploads/${req.file.filename}`;

      // Remove foto antiga se existir
      const old = db.prepare('SELECT foto_url FROM usuarios WHERE id=?').get(req.user!.id) as any;
      if (old && old.foto_url) {
        const oldPath = path.join(uploadsDir, path.basename(old.foto_url));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      db.prepare("UPDATE usuarios SET foto_url=?, atualizado_em=datetime('now','localtime') WHERE id=?")
        .run(fotoUrl, req.user!.id);

      res.json({ foto_url: fotoUrl, message: 'Foto atualizada!' });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
});

// DELETE /api/auth/foto — remover foto de perfil
router.delete('/foto', autenticar, (req: AuthRequest, res: Response) => {
  try {
    const old = db.prepare('SELECT foto_url FROM usuarios WHERE id=?').get(req.user!.id) as any;
    if (old && old.foto_url) {
      const oldPath = path.join(uploadsDir, path.basename(old.foto_url));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    db.prepare("UPDATE usuarios SET foto_url=NULL, atualizado_em=datetime('now','localtime') WHERE id=?")
      .run(req.user!.id);
    res.json({ message: 'Foto removida.' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /api/auth/perfil — atualizar perfil
router.put('/perfil', autenticar, async (req: AuthRequest, res: Response) => {
  try {
    const { nome, telefone, senha_atual, senha_nova, senha_nova2 } = req.body;
    const userId = req.user!.id;

    // Validações básicas
    if (!nome || nome.trim().length < 2) {
      res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres.' }); return;
    }

    // Se quer alterar senha, valida a atual
    if (senha_nova) {
      if (!senha_atual) { res.status(400).json({ error: 'Informe a senha atual para alterá-la.' }); return; }
      const userDb = db.prepare('SELECT senha FROM usuarios WHERE id=?').get(userId) as any;
      const senhaOk = await bcrypt.compare(senha_atual, userDb.senha);
      if (!senhaOk) { res.status(400).json({ error: 'Senha atual incorreta.' }); return; }
      if (!senhaForte(senha_nova)) { res.status(400).json({ error: 'Nova senha deve ter mín. 8 caracteres, 1 maiúscula, 1 número e 1 caractere especial.' }); return; }
      if (senha_nova !== senha_nova2) { res.status(400).json({ error: 'Novas senhas não conferem.' }); return; }

      const hash = await bcrypt.hash(senha_nova, 10);
      db.prepare("UPDATE usuarios SET nome=?, telefone=?, senha=?, atualizado_em=datetime('now','localtime') WHERE id=?")
        .run(nome.trim(), telefone || null, hash, userId);
    } else {
      db.prepare("UPDATE usuarios SET nome=?, telefone=?, atualizado_em=datetime('now','localtime') WHERE id=?")
        .run(nome.trim(), telefone || null, userId);
    }

    // Atualiza dados específicos do tipo
    const tipo = req.user!.tipo;
    if (tipo === 'oficina') {
      const { nome_fantasia, logradouro, numero, bairro, cidade, uf, cep, latitude, longitude } = req.body;
      if (nome_fantasia) {
        db.prepare(
          'UPDATE oficinas SET nome_fantasia=?, logradouro=?, numero=?, bairro=?, cidade=?, uf=?, cep=?, latitude=?, longitude=? WHERE usuario_id=?'
        ).run(nome_fantasia, logradouro||'', numero||'', bairro||'', cidade||'', uf||'DF', cep||'', latitude||null, longitude||null, userId);
      }
    }

    // Retorna dados atualizados
    const updated = db.prepare('SELECT id, nome, email, telefone, tipo, status, foto_url FROM usuarios WHERE id=?').get(userId) as any;
    const token = gerarToken({ id: updated.id, nome: updated.nome, email: updated.email, tipo: updated.tipo, status: updated.status });
    res.json({ message: 'Perfil atualizado com sucesso!', user: { ...updated }, token });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

function senhaForte(s: string): boolean {
  return s.length >= 8 && /[A-Z]/.test(s) && /[0-9]/.test(s) && /[^A-Za-z0-9]/.test(s);
}

// ─── RECUPERAÇÃO DE SENHA ───────────────────────────

// POST /api/auth/esqueci-senha
router.post('/esqueci-senha', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: 'E-mail é obrigatório.' }); return; }

    const user = db.prepare('SELECT id, nome, email FROM usuarios WHERE email=?').get(email) as any;

    // Sempre retorna sucesso (segurança — não revela se o e-mail existe)
    if (!user) {
      res.json({ message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' });
      return;
    }

    // Gerar token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 30 * 60 * 1000; // 30 minutos
    resetTokens.set(token, { userId: user.id, expires });

    // Montar link de reset
    const resetLink = `http://localhost:3000/#redefinir-senha?token=${token}`;

    // Enviar e-mail
    try {
      await transporter.sendMail({
        from: `"TechMotors" <${process.env.EMAIL_USER || 'techmotors@email.com'}>`,
        to: user.email,
        subject: '🔐 Redefinir senha — TechMotors',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem">
            <h2 style="color:#1E40AF">TechMotors</h2>
            <p>Olá, <strong>${user.nome}</strong>!</p>
            <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>
            <div style="text-align:center;margin:2rem 0">
              <a href="${resetLink}" style="background:#1E40AF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
                Redefinir Senha
              </a>
            </div>
            <p style="color:#666;font-size:0.85rem">Este link expira em 30 minutos. Se você não solicitou isso, ignore este e-mail.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:2rem 0">
            <p style="color:#999;font-size:0.75rem">TechMotors — Plataforma de Agendamentos Automotivos</p>
          </div>`
      });
      console.log(`📧 E-mail de reset enviado para ${user.email}`);
    } catch (mailErr: any) {
      console.error('❌ Erro ao enviar e-mail:', mailErr.message);
      // Mesmo com erro no e-mail, mostra o token no console para testes
      console.log(`🔑 Token de reset (use manualmente): ${token}`);
      console.log(`🔗 Link: ${resetLink}`);
    }

    res.json({ message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/redefinir-senha
router.post('/redefinir-senha', async (req: Request, res: Response) => {
  try {
    const { token, senha, senha2 } = req.body;

    if (!token) { res.status(400).json({ error: 'Token inválido.' }); return; }
    if (!senha || !senha2) { res.status(400).json({ error: 'Preencha todos os campos.' }); return; }
    if (senha !== senha2) { res.status(400).json({ error: 'Senhas não conferem.' }); return; }
    if (!senhaForte(senha)) { res.status(400).json({ error: 'Senha deve ter mín. 8 caracteres, 1 maiúscula, 1 número e 1 caractere especial.' }); return; }

    const data = resetTokens.get(token);
    if (!data) { res.status(400).json({ error: 'Token inválido ou expirado.' }); return; }
    if (Date.now() > data.expires) {
      resetTokens.delete(token);
      res.status(400).json({ error: 'Token expirado. Solicite um novo.' });
      return;
    }

    // Atualizar senha
    const hash = await bcrypt.hash(senha, 10);
    db.prepare("UPDATE usuarios SET senha=?, atualizado_em=datetime('now','localtime') WHERE id=?").run(hash, data.userId);

    // Invalidar token
    resetTokens.delete(token);

    res.json({ message: 'Senha redefinida com sucesso! Faça login com sua nova senha.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/verificar-token-reset/:token
router.get('/verificar-token-reset/:token', (req: Request, res: Response) => {
  const token = req.params.token;
  const data = resetTokens.get(token);
  if (!data || Date.now() > data.expires) {
    res.json({ valido: false });
  } else {
    res.json({ valido: true });
  }
});

export default router;
