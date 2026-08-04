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

    const recentes = db.prepare(
      `SELECT a.*, u.nome AS cliente, o.nome_fantasia, cs.nome AS servico
       FROM agendamentos a JOIN usuarios u ON u.id=a.cliente_id
       JOIN oficinas o ON o.usuario_id=a.oficina_id
       JOIN catalogo_servicos cs ON cs.id=a.servico_id
       ORDER BY a.criado_em DESC LIMIT 10`
    ).all();

    res.json({ total_clientes, total_oficinas, pendentes, total_agendamentos, concluidos, total_avaliacoes, recentes });
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
    let sql = "SELECT * FROM usuarios WHERE tipo<>'admin'";
    const params: any[] = [];
    if (tipo) { sql += ' AND tipo=?'; params.push(tipo); }
    sql += ' ORDER BY criado_em DESC';
    const rows = db.prepare(sql).all(...params);
    res.json({ usuarios: rows });
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

export default router;
