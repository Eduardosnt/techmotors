import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database';
import { gerarToken, autenticar, AuthRequest } from '../middleware/auth';

const router = Router();

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

    res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo, status: user.status } });
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

function senhaForte(s: string): boolean {
  return s.length >= 8 && /[A-Z]/.test(s) && /[0-9]/.test(s) && /[^A-Za-z0-9]/.test(s);
}

export default router;
