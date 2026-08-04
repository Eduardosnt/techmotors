import { Router, Response } from 'express';
import db from '../config/database';
import { autenticar, exigirTipo, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(autenticar, exigirTipo('cliente'));

// GET /api/cliente/home
router.get('/home', (req: AuthRequest, res: Response) => {
  try {
    const categorias = db.prepare('SELECT DISTINCT categoria FROM catalogo_servicos WHERE ativo=1').all();
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    let oficinas;
    if (!isNaN(lat) && !isNaN(lng)) {
      // Ordenar por distância usando fórmula de Haversine simplificada
      oficinas = db.prepare(
        `SELECT o.*, u.nome,
          ((o.latitude - ?) * (o.latitude - ?) + (o.longitude - ?) * (o.longitude - ?)) AS dist
         FROM oficinas o JOIN usuarios u ON u.id=o.usuario_id
         WHERE o.status_aprovacao='aprovada' AND o.latitude IS NOT NULL
         ORDER BY dist ASC LIMIT 6`
      ).all(lat, lat, lng, lng);
    } else {
      oficinas = db.prepare(
        `SELECT o.*, u.nome FROM oficinas o JOIN usuarios u ON u.id=o.usuario_id
         WHERE o.status_aprovacao='aprovada' ORDER BY o.nota_media DESC LIMIT 6`
      ).all();
    }
    res.json({ categorias, oficinas, usuario: req.user });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/cliente/busca
router.get('/busca', (req: AuthRequest, res: Response) => {
  try {
    const { q, categoria, cidade } = req.query;
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    let sql = `SELECT DISTINCT o.*, u.nome, u.telefone FROM oficinas o
               JOIN usuarios u ON u.id=o.usuario_id
               LEFT JOIN oficina_servicos os ON os.oficina_id=o.usuario_id
               LEFT JOIN catalogo_servicos cs ON cs.id=os.servico_id
               WHERE o.status_aprovacao='aprovada'`;
    const params: any[] = [];
    if (q) { sql += ' AND (o.nome_fantasia LIKE ? OR cs.nome LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (categoria) { sql += ' AND cs.categoria=?'; params.push(categoria); }
    if (cidade) { sql += ' AND o.cidade LIKE ?'; params.push(`%${cidade}%`); }

    if (!isNaN(lat) && !isNaN(lng)) {
      sql = sql.replace('SELECT DISTINCT o.*, u.nome, u.telefone',
        `SELECT DISTINCT o.*, u.nome, u.telefone, ((o.latitude - ${lat}) * (o.latitude - ${lat}) + (o.longitude - ${lng}) * (o.longitude - ${lng})) AS dist`);
      sql += ' ORDER BY dist ASC';
    } else {
      sql += ' ORDER BY o.nota_media DESC';
    }

    const oficinas = db.prepare(sql).all(...params) as any[];

    // Adicionar serviços de cada oficina
    const stmtServicos = db.prepare(
      `SELECT cs.nome FROM oficina_servicos os JOIN catalogo_servicos cs ON cs.id=os.servico_id WHERE os.oficina_id=? AND os.ativo=1 LIMIT 3`
    );
    oficinas.forEach((o: any) => {
      o.servicos_preview = (stmtServicos.all(o.usuario_id) as any[]).map((s: any) => s.nome);
    });

    const categorias = db.prepare('SELECT DISTINCT categoria FROM catalogo_servicos WHERE ativo=1').all();
    res.json({ oficinas, categorias });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/cliente/oficina/:id
router.get('/oficina/:id', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const oficina = db.prepare(
      `SELECT o.*, u.nome, u.telefone FROM oficinas o JOIN usuarios u ON u.id=o.usuario_id
       WHERE o.usuario_id=? AND o.status_aprovacao='aprovada'`
    ).get(id) as any;
    if (!oficina) { res.status(404).json({ error: 'Oficina não encontrada' }); return; }

    const servicos = db.prepare(
      `SELECT os.*, cs.nome AS servico_nome, cs.categoria
       FROM oficina_servicos os JOIN catalogo_servicos cs ON cs.id=os.servico_id
       WHERE os.oficina_id=? AND os.ativo=1`
    ).all(id);
    const disponibilidade = db.prepare(
      'SELECT dia_semana, hora_inicio, hora_fim FROM disponibilidade WHERE oficina_id=? AND ativo=1 ORDER BY dia_semana'
    ).all(id);
    const avaliacoes = db.prepare(
      `SELECT a.*, u.nome AS cliente_nome FROM avaliacoes a
       JOIN usuarios u ON u.id=a.cliente_id
       WHERE a.oficina_id=? AND a.ocultada=0 ORDER BY a.criado_em DESC LIMIT 5`
    ).all(id);

    res.json({ oficina, servicos, disponibilidade, avaliacoes });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/cliente/horarios
router.get('/horarios', (req: AuthRequest, res: Response) => {
  try {
    const oficina_id = parseInt(req.query.oficina_id as string);
    const data = req.query.data as string;
    const duracao = parseInt(req.query.duracao as string) || 60;
    const slots = gerarHorariosDisponiveis(oficina_id, data, duracao);
    res.json({ slots });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/cliente/agendar
router.post('/agendar', (req: AuthRequest, res: Response) => {
  try {
    const { oficina_id, servico_ids, data, hora, veiculo_id } = req.body;
    const cliente_id = req.user!.id;
    if (!oficina_id || !servico_ids?.length || !data || !hora || !veiculo_id) {
      res.status(400).json({ error: 'Dados incompletos' }); return;
    }

    const placeholders = servico_ids.map(() => '?').join(',');
    const totals = db.prepare(
      `SELECT SUM(os.duracao_minutos) as total_dur, SUM(IFNULL(os.preco,0)) as total_preco
       FROM oficina_servicos os WHERE os.oficina_id=? AND os.servico_id IN (${placeholders})`
    ).get(oficina_id, ...servico_ids) as any;

    const dur = totals?.total_dur || 60;
    const preco = totals?.total_preco || null;
    const datahora = `${data} ${hora}:00`;

    const result = db.prepare(
      `INSERT INTO agendamentos (cliente_id, oficina_id, veiculo_id, servico_id, data_hora, duracao_minutos, status, valor_estimado)
       VALUES (?, ?, ?, ?, ?, ?, 'solicitado', ?)`
    ).run(cliente_id, oficina_id, veiculo_id, servico_ids[0], datahora, dur, preco);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Agendamento solicitado!' });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Esse horário acabou de ser ocupado. Escolha outro.' });
    } else { res.status(500).json({ error: err.message }); }
  }
});

// GET /api/cliente/agendamentos
router.get('/agendamentos', (req: AuthRequest, res: Response) => {
  try {
    const rows = db.prepare(
      `SELECT a.*, o.nome_fantasia, cs.nome AS servico, v.placa, v.marca, v.modelo
       FROM agendamentos a
       JOIN oficinas o ON o.usuario_id=a.oficina_id
       JOIN catalogo_servicos cs ON cs.id=a.servico_id
       JOIN veiculos v ON v.id=a.veiculo_id
       WHERE a.cliente_id=? ORDER BY a.data_hora DESC`
    ).all(req.user!.id);
    res.json({ agendamentos: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/cliente/cancelar/:id
router.post('/cancelar/:id', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const motivo = req.body.motivo || 'Cancelado pelo cliente';
    const result = db.prepare(
      `UPDATE agendamentos SET status='cancelado', motivo_cancelamento=?
       WHERE id=? AND cliente_id=? AND status IN('solicitado','confirmado')`
    ).run(motivo, id, req.user!.id);
    if (result.changes === 0) { res.status(400).json({ error: 'Não pode ser cancelado' }); return; }
    res.json({ message: 'Agendamento cancelado.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/cliente/veiculos
router.get('/veiculos', (req: AuthRequest, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM veiculos WHERE cliente_id=?').all(req.user!.id);
    res.json({ veiculos: rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/cliente/veiculos
router.post('/veiculos', (req: AuthRequest, res: Response) => {
  try {
    const { placa, marca, modelo, ano, tipo } = req.body;
    if (!placa || !marca || !modelo) { res.status(400).json({ error: 'Placa, marca e modelo são obrigatórios' }); return; }
    
    // Normalizar placa: remover espaços e converter para uppercase
    const placaNorm = placa.replace(/[\s]/g, '').toUpperCase();
    
    db.prepare('INSERT INTO veiculos (cliente_id, placa, marca, modelo, ano, tipo) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user!.id, placaNorm, marca.trim(), modelo.trim(), ano ? parseInt(ano) : null, tipo || 'carro');
    res.status(201).json({ message: 'Veículo cadastrado!' });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') res.status(400).json({ error: 'Placa já cadastrada no sistema.' });
    else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') res.status(400).json({ error: 'Erro de conta. Faça logout e entre novamente.' });
    else res.status(500).json({ error: 'Erro ao cadastrar veículo: ' + err.message });
  }
});

// DELETE /api/cliente/veiculos/:id
router.delete('/veiculos/:id', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('DELETE FROM veiculos WHERE id=? AND cliente_id=?').run(parseInt(req.params.id), req.user!.id);
    res.json({ message: 'Veículo removido.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/cliente/avaliar
router.post('/avaliar', (req: AuthRequest, res: Response) => {
  try {
    const { agendamento_id, estrelas, comentario } = req.body;
    if (!agendamento_id || !estrelas || estrelas < 1 || estrelas > 5) {
      res.status(400).json({ error: 'Avaliação inválida.' }); return;
    }
    const ag = db.prepare(`SELECT * FROM agendamentos WHERE id=? AND cliente_id=? AND status='concluido'`)
      .get(agendamento_id, req.user!.id) as any;
    if (!ag) { res.status(400).json({ error: 'Agendamento não disponível para avaliação.' }); return; }

    const transaction = db.transaction(() => {
      db.prepare('INSERT INTO avaliacoes (agendamento_id, cliente_id, oficina_id, qtd_estrelas, comentario) VALUES (?, ?, ?, ?, ?)')
        .run(agendamento_id, req.user!.id, ag.oficina_id, estrelas, comentario || '');
      db.prepare(`UPDATE oficinas SET
        nota_media=(SELECT AVG(qtd_estrelas) FROM avaliacoes WHERE oficina_id=? AND ocultada=0),
        total_avaliacoes=(SELECT COUNT(*) FROM avaliacoes WHERE oficina_id=? AND ocultada=0)
        WHERE usuario_id=?`).run(ag.oficina_id, ag.oficina_id, ag.oficina_id);
    });
    transaction();
    res.json({ message: 'Avaliação enviada!' });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') res.status(400).json({ error: 'Você já avaliou este agendamento.' });
    else res.status(500).json({ error: err.message });
  }
});

// Gerar horários disponíveis
function gerarHorariosDisponiveis(oficina_id: number, data: string, duracao: number = 60): string[] {
  const dayOfWeek = new Date(data + 'T12:00:00').getDay();
  const regra = db.prepare('SELECT hora_inicio, hora_fim FROM disponibilidade WHERE oficina_id=? AND dia_semana=? AND ativo=1')
    .get(oficina_id, dayOfWeek) as any;
  if (!regra) return [];

  const bloqueios = db.prepare('SELECT data_inicio, data_fim FROM bloqueios WHERE oficina_id=? AND DATE(data_inicio)<=? AND DATE(data_fim)>=?')
    .all(oficina_id, data, data) as any[];
  const ocupados = db.prepare(`SELECT data_hora, duracao_minutos FROM agendamentos WHERE oficina_id=? AND DATE(data_hora)=? AND status IN('solicitado','confirmado')`)
    .all(oficina_id, data) as any[];

  const slots: string[] = [];
  const inicio = new Date(`${data}T${regra.hora_inicio}`).getTime();
  const fim = new Date(`${data}T${regra.hora_fim}`).getTime();
  const now = Date.now();

  for (let t = inicio; t + duracao * 60000 <= fim; t += 3600000) {
    if (t <= now) continue;
    let livre = true;

    for (const b of bloqueios) {
      const bi = new Date(b.data_inicio).getTime();
      const bf = new Date(b.data_fim).getTime();
      if (t >= bi && t < bf) { livre = false; break; }
    }
    if (livre) {
      for (const o of ocupados) {
        const oi = new Date(o.data_hora).getTime();
        const of2 = oi + o.duracao_minutos * 60000;
        if (t < of2 && t + duracao * 60000 > oi) { livre = false; break; }
      }
    }
    if (livre) {
      const d = new Date(t);
      slots.push(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }
  }
  return slots;
}

export default router;
