import { Router, Response } from 'express';
import db from '../config/database';
import { autenticar, exigirTipo, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(autenticar, exigirTipo('admin'));

// GET /api/admin/dashboard
router.get('/dashboard', (req: AuthRequest, res: Response) => {
  try {
    const total_clientes = (db.prepare("SELECT COUNT(*) as c FROM usuarios WHERE tipo='cliente'").get() as any).c;
    const total_oficinas = (db.prepare("SELECT COUNT(*) as c FROM oficinas WHERE status_aprovacao='aprovada'").get() as any).c;
    const pendentes = (db.prepare("SELECT COUNT(*) as c FROM oficinas WHERE status_aprovacao='pendente'").get() as any).c;
    const total_agendamentos = (db.prepare("SELECT COUNT(*) as c FROM agendamentos").get() as any).c;
    const concluidos = (db.prepare("SELECT COUNT(*) as c FROM agendamentos WHERE status='concluido'").get() as any).c;
    const total_avaliacoes = (db.prepare("SELECT COUNT(*) as c FROM avaliacoes WHERE ocultada=0").get() as any).c;
    const receita_total = (db.prepare("SELECT COALESCE(SUM(valor_estimado),0) as t FROM agendamentos WHERE status='concluido'").get() as any).t;

    // Taxa de conclusão
    const taxa_conclusao = total_agendamentos > 0 ? Math.round((concluidos / total_agendamentos) * 100) : 0;

    // Agendamentos por mês (últimos 6 meses)
    const por_mes = db.prepare(
      `SELECT substr(data_hora,1,7) as mes, COUNT(*) as total,
       SUM(CASE WHEN status='concluido' THEN 1 ELSE 0 END) as concluidos
       FROM agendamentos
       GROUP BY substr(data_hora,1,7)
       ORDER BY mes DESC LIMIT 6`
    ).all();

    // Top oficinas por nota
    const top_oficinas = db.prepare(
      `SELECT o.nome_fantasia, o.nota_media, o.total_avaliacoes
       FROM oficinas o WHERE o.status_aprovacao='aprovada' AND o.total_avaliacoes > 0
       ORDER BY o.nota_media DESC LIMIT 5`
    ).all();

    const recentes = db.prepare(
      `SELECT a.*, u.nome AS cliente, o.nome_fantasia, cs.nome AS servico
       FROM agendamentos a JOIN usuarios u ON u.id=a.cliente_id
       JOIN oficinas o ON o.usuario_id=a.oficina_id
       JOIN catalogo_servicos cs ON cs.id=a.servico_id
       ORDER BY a.criado_em DESC LIMIT 10`
    ).all();

    res.json({ total_clientes, total_oficinas, pendentes, total_agendamentos, concluidos, total_avaliacoes, receita_total, taxa_conclusao, por_mes, top_oficinas, recentes });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/pendentes
router.get('/pendentes', (req: AuthRequest, res: Response) => {
  try {
    const rows = db.prepare(
      `SELECT o.*, u.nome, u.email, u.telefone, u.criado_em
       FROM oficinas o JOIN usuarios u ON u.id=o.usuario_id
       WHERE o.status_aprovacao='pendente' ORDER BY u.criado_em`
    ).all();
    res.json({ pendentes: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/oficina/:id
router.get('/oficina/:id', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const oficina = db.prepare(
      `SELECT o.*, u.nome, u.email, u.telefone, u.criado_em, u.status
       FROM oficinas o JOIN usuarios u ON u.id=o.usuario_id WHERE o.usuario_id=?`
    ).get(id);
    if (!oficina) { res.status(404).json({ error: 'Oficina não encontrada' }); return; }
    const servicos = db.prepare(
      `SELECT os.*, cs.nome FROM oficina_servicos os JOIN catalogo_servicos cs ON cs.id=os.servico_id WHERE os.oficina_id=?`
    ).all(id);
    res.json({ oficina, servicos });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/aprovar/:id
router.post('/aprovar/:id', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare("UPDATE oficinas SET status_aprovacao='aprovada', aprovado_por=?, aprovado_em=? WHERE usuario_id=?").run(req.user!.id, now, id);
    db.prepare("UPDATE usuarios SET status='ativo' WHERE id=?").run(id);
    res.json({ message: 'Oficina aprovada!' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/rejeitar/:id
router.post('/rejeitar/:id', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { motivo } = req.body;
    db.prepare("UPDATE oficinas SET status_aprovacao='rejeitada', motivo_rejeicao=? WHERE usuario_id=?").run(motivo || '', id);
    res.json({ message: 'Oficina rejeitada.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/usuarios
router.get('/usuarios', (req: AuthRequest, res: Response) => {
  try {
    const tipo = req.query.tipo as string;
    const busca = req.query.busca as string;
    const status = req.query.status as string;
    let sql = "SELECT * FROM usuarios WHERE tipo<>'admin'";
    const params: any[] = [];
    if (tipo) { sql += ' AND tipo=?'; params.push(tipo); }
    if (status) { sql += ' AND status=?'; params.push(status); }
    if (busca) { sql += ' AND (nome LIKE ? OR email LIKE ?)'; params.push(`%${busca}%`, `%${busca}%`); }
    sql += ' ORDER BY criado_em DESC';
    const rows = db.prepare(sql).all(...params);
    res.json({ usuarios: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/usuario/:id — detalhes completos de um usuário
router.get('/usuario/:id', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = db.prepare('SELECT * FROM usuarios WHERE id=?').get(id) as any;
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }

    let extra: any = {};
    if (user.tipo === 'cliente') {
      extra.cpf = (db.prepare('SELECT cpf FROM clientes WHERE usuario_id=?').get(id) as any)?.cpf;
      extra.veiculos = db.prepare('SELECT * FROM veiculos WHERE cliente_id=?').all(id);
      extra.agendamentos = db.prepare(
        `SELECT a.*, o.nome_fantasia, cs.nome AS servico FROM agendamentos a
         JOIN oficinas o ON o.usuario_id=a.oficina_id JOIN catalogo_servicos cs ON cs.id=a.servico_id
         WHERE a.cliente_id=? ORDER BY a.data_hora DESC LIMIT 20`
      ).all(id);
      extra.avaliacoes = db.prepare(
        `SELECT av.*, o.nome_fantasia FROM avaliacoes av JOIN oficinas o ON o.usuario_id=av.oficina_id WHERE av.cliente_id=?`
      ).all(id);
    } else if (user.tipo === 'oficina') {
      extra.oficina = db.prepare('SELECT * FROM oficinas WHERE usuario_id=?').get(id);
      extra.servicos = db.prepare(
        `SELECT os.*, cs.nome, cs.categoria FROM oficina_servicos os JOIN catalogo_servicos cs ON cs.id=os.servico_id WHERE os.oficina_id=?`
      ).all(id);
      extra.agendamentos = db.prepare(
        `SELECT a.*, u.nome AS cliente_nome, cs.nome AS servico FROM agendamentos a
         JOIN usuarios u ON u.id=a.cliente_id JOIN catalogo_servicos cs ON cs.id=a.servico_id
         WHERE a.oficina_id=? ORDER BY a.data_hora DESC LIMIT 20`
      ).all(id);
      extra.avaliacoes = db.prepare(
        `SELECT av.*, u.nome AS cliente_nome FROM avaliacoes av JOIN usuarios u ON u.id=av.cliente_id WHERE av.oficina_id=?`
      ).all(id);
    }

    res.json({ user, extra });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── CATÁLOGO DE SERVIÇOS ───────────────────────────

// GET /api/admin/catalogo
router.get('/catalogo', (req: AuthRequest, res: Response) => {
  try {
    const servicos = db.prepare('SELECT * FROM catalogo_servicos ORDER BY categoria, nome').all();
    res.json({ servicos });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/catalogo
router.post('/catalogo', (req: AuthRequest, res: Response) => {
  try {
    const { nome, categoria, descricao } = req.body;
    if (!nome || !categoria) { res.status(400).json({ error: 'Nome e categoria são obrigatórios' }); return; }
    db.prepare('INSERT INTO catalogo_servicos (nome, categoria, descricao) VALUES (?, ?, ?)').run(nome, categoria, descricao || '');
    res.status(201).json({ message: 'Serviço adicionado ao catálogo!' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/catalogo/:id
router.put('/catalogo/:id', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { nome, categoria, descricao, ativo } = req.body;
    db.prepare('UPDATE catalogo_servicos SET nome=?, categoria=?, descricao=?, ativo=? WHERE id=?')
      .run(nome, categoria, descricao || '', ativo !== undefined ? ativo : 1, id);
    res.json({ message: 'Catálogo atualizado.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/catalogo/:id
router.delete('/catalogo/:id', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    db.prepare('DELETE FROM catalogo_servicos WHERE id=?').run(id);
    res.json({ message: 'Serviço removido do catálogo.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── RANKING DE OFICINAS ────────────────────────────

// GET /api/admin/ranking
router.get('/ranking', (req: AuthRequest, res: Response) => {
  try {
    const por_nota = db.prepare(
      `SELECT o.usuario_id, o.nome_fantasia, o.nota_media, o.total_avaliacoes, o.cidade, o.uf
       FROM oficinas o WHERE o.status_aprovacao='aprovada'
       ORDER BY o.nota_media DESC, o.total_avaliacoes DESC`
    ).all();

    const por_volume = db.prepare(
      `SELECT o.usuario_id, o.nome_fantasia, COUNT(a.id) as total_agendamentos,
       SUM(CASE WHEN a.status='concluido' THEN 1 ELSE 0 END) as concluidos,
       COALESCE(SUM(CASE WHEN a.status='concluido' THEN a.valor_estimado ELSE 0 END), 0) as receita
       FROM oficinas o LEFT JOIN agendamentos a ON a.oficina_id=o.usuario_id
       WHERE o.status_aprovacao='aprovada'
       GROUP BY o.usuario_id
       ORDER BY total_agendamentos DESC`
    ).all();

    res.json({ por_nota, por_volume });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── MODERAÇÃO DE AVALIAÇÕES ────────────────────────

// GET /api/admin/avaliacoes
router.get('/avaliacoes', (req: AuthRequest, res: Response) => {
  try {
    const avaliacoes = db.prepare(
      `SELECT av.*, u_cli.nome AS cliente_nome, o.nome_fantasia
       FROM avaliacoes av
       JOIN usuarios u_cli ON u_cli.id=av.cliente_id
       JOIN oficinas o ON o.usuario_id=av.oficina_id
       ORDER BY av.criado_em DESC`
    ).all();
    res.json({ avaliacoes });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/avaliacoes/:id/ocultar
router.post('/avaliacoes/:id/ocultar', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    db.prepare('UPDATE avaliacoes SET ocultada=1 WHERE id=?').run(id);
    // Recalcular nota da oficina
    const av = db.prepare('SELECT oficina_id FROM avaliacoes WHERE id=?').get(id) as any;
    if (av) {
      db.prepare(`UPDATE oficinas SET
        nota_media=(SELECT AVG(qtd_estrelas) FROM avaliacoes WHERE oficina_id=? AND ocultada=0),
        total_avaliacoes=(SELECT COUNT(*) FROM avaliacoes WHERE oficina_id=? AND ocultada=0)
        WHERE usuario_id=?`).run(av.oficina_id, av.oficina_id, av.oficina_id);
    }
    res.json({ message: 'Avaliação ocultada.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/avaliacoes/:id/restaurar
router.post('/avaliacoes/:id/restaurar', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    db.prepare('UPDATE avaliacoes SET ocultada=0 WHERE id=?').run(id);
    const av = db.prepare('SELECT oficina_id FROM avaliacoes WHERE id=?').get(id) as any;
    if (av) {
      db.prepare(`UPDATE oficinas SET
        nota_media=(SELECT AVG(qtd_estrelas) FROM avaliacoes WHERE oficina_id=? AND ocultada=0),
        total_avaliacoes=(SELECT COUNT(*) FROM avaliacoes WHERE oficina_id=? AND ocultada=0)
        WHERE usuario_id=?`).run(av.oficina_id, av.oficina_id, av.oficina_id);
    }
    res.json({ message: 'Avaliação restaurada.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/usuarios/:id/status
router.put('/usuarios/:id/status', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!['ativo', 'inativo', 'bloqueado'].includes(status)) { res.status(400).json({ error: 'Status inválido' }); return; }
    db.prepare('UPDATE usuarios SET status=? WHERE id=?').run(status, id);
    res.json({ message: 'Status atualizado.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── NOTIFICAÇÕES DO ADMIN ──────────────────────────

// GET /api/admin/notificacoes
router.get('/notificacoes', (req: AuthRequest, res: Response) => {
  try {
    const notificacoes = db.prepare(
      'SELECT * FROM notificacoes WHERE usuario_id=? ORDER BY criado_em DESC LIMIT 50'
    ).all(req.user!.id);
    const nao_lidas = (db.prepare(
      'SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id=? AND lida=0'
    ).get(req.user!.id) as any).total;
    res.json({ notificacoes, nao_lidas });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/notificacoes/ler
router.post('/notificacoes/ler', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('UPDATE notificacoes SET lida=1 WHERE usuario_id=?').run(req.user!.id);
    res.json({ message: 'OK' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
