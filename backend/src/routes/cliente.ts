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

// GET /api/cliente/oficina/:id/avaliacoes - todas as avaliações
router.get('/oficina/:id/avaliacoes', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const avaliacoes = db.prepare(
      `SELECT a.*, u.nome AS cliente_nome FROM avaliacoes a
       JOIN usuarios u ON u.id=a.cliente_id
       WHERE a.oficina_id=? AND a.ocultada=0 ORDER BY a.criado_em DESC`
    ).all(id);
    res.json({ avaliacoes });
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

    // Notificação para a oficina
    const clienteNome = (db.prepare('SELECT nome FROM usuarios WHERE id=?').get(cliente_id) as any)?.nome || 'Cliente';
    db.prepare('INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link) VALUES (?, ?, ?, ?, ?)')
      .run(oficina_id, 'novo_agendamento', '📅 Nova solicitação de agendamento', `${clienteNome} solicitou um agendamento para ${data} às ${hora}.`, '#oficina-solicitacoes');

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

    // Notificação para a oficina
    const ag = db.prepare('SELECT oficina_id FROM agendamentos WHERE id=?').get(id) as any;
    const clienteNome = (db.prepare('SELECT nome FROM usuarios WHERE id=?').get(req.user!.id) as any)?.nome || 'Cliente';
    if (ag) {
      db.prepare('INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link) VALUES (?, ?, ?, ?, ?)')
        .run(ag.oficina_id, 'cancelado', '❌ Agendamento cancelado pelo cliente', `${clienteNome} cancelou um agendamento.`, '#oficina-solicitacoes?status=cancelado');
    }

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

// ─── FAVORITOS ──────────────────────────────────────

// GET /api/cliente/favoritos
router.get('/favoritos', (req: AuthRequest, res: Response) => {
  try {
    const favoritos = db.prepare(
      `SELECT f.*, o.nome_fantasia, o.bairro, o.cidade, o.uf, o.nota_media, o.total_avaliacoes, o.latitude, o.longitude, u.telefone
       FROM favoritos f
       JOIN oficinas o ON o.usuario_id=f.oficina_id
       JOIN usuarios u ON u.id=f.oficina_id
       WHERE f.cliente_id=?
       ORDER BY f.criado_em DESC`
    ).all(req.user!.id);
    res.json({ favoritos });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/cliente/favoritos/:oficina_id
router.post('/favoritos/:oficina_id', (req: AuthRequest, res: Response) => {
  try {
    const oficinaId = parseInt(req.params.oficina_id);
    db.prepare('INSERT OR IGNORE INTO favoritos (cliente_id, oficina_id) VALUES (?, ?)').run(req.user!.id, oficinaId);
    res.json({ message: 'Oficina favoritada!' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/cliente/favoritos/:oficina_id
router.delete('/favoritos/:oficina_id', (req: AuthRequest, res: Response) => {
  try {
    const oficinaId = parseInt(req.params.oficina_id);
    db.prepare('DELETE FROM favoritos WHERE cliente_id=? AND oficina_id=?').run(req.user!.id, oficinaId);
    res.json({ message: 'Removido dos favoritos.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/cliente/favorito/:oficina_id — check if favorited
router.get('/favorito/:oficina_id', (req: AuthRequest, res: Response) => {
  try {
    const oficinaId = parseInt(req.params.oficina_id);
    const fav = db.prepare('SELECT id FROM favoritos WHERE cliente_id=? AND oficina_id=?').get(req.user!.id, oficinaId);
    res.json({ favoritado: !!fav });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── HISTÓRICO DE SERVIÇOS ──────────────────────────

// GET /api/cliente/historico
router.get('/historico', (req: AuthRequest, res: Response) => {
  try {
    const veiculoId = req.query.veiculo_id ? parseInt(req.query.veiculo_id as string) : null;
    let sql = `SELECT a.*, o.nome_fantasia, cs.nome AS servico, cs.categoria, v.placa, v.marca, v.modelo, v.ano,
       av.qtd_estrelas
       FROM agendamentos a
       JOIN oficinas o ON o.usuario_id=a.oficina_id
       JOIN catalogo_servicos cs ON cs.id=a.servico_id
       JOIN veiculos v ON v.id=a.veiculo_id
       LEFT JOIN avaliacoes av ON av.agendamento_id=a.id
       WHERE a.cliente_id=? AND a.status='concluido'`;
    const params: any[] = [req.user!.id];

    if (veiculoId) {
      sql += ' AND a.veiculo_id=?';
      params.push(veiculoId);
    }
    sql += ' ORDER BY a.data_hora DESC';

    const historico = db.prepare(sql).all(...params);
    res.json({ historico });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── NOTIFICAÇÕES ───────────────────────────────────

// GET /api/cliente/notificacoes
router.get('/notificacoes', (req: AuthRequest, res: Response) => {
  try {
    const notificacoes = db.prepare(
      'SELECT * FROM notificacoes WHERE usuario_id=? ORDER BY criado_em DESC LIMIT 50'
    ).all(req.user!.id);
    const nao_lidas = db.prepare(
      'SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id=? AND lida=0'
    ).get(req.user!.id) as any;
    res.json({ notificacoes, nao_lidas: nao_lidas.total });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/cliente/notificacoes/ler — marca todas como lidas
router.post('/notificacoes/ler', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('UPDATE notificacoes SET lida=1 WHERE usuario_id=?').run(req.user!.id);
    res.json({ message: 'Notificações marcadas como lidas.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/cliente/notificacoes/ler/:id — marca uma como lida
router.post('/notificacoes/ler/:id', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('UPDATE notificacoes SET lida=1 WHERE id=? AND usuario_id=?').run(parseInt(req.params.id), req.user!.id);
    res.json({ message: 'OK' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── COMPROVANTE / RECIBO ───────────────────────────

// GET /api/cliente/comprovante/:agendamento_id
router.get('/comprovante/:id', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const ag = db.prepare(
      `SELECT a.*, o.nome_fantasia, o.cnpj, o.logradouro, o.numero, o.bairro, o.cidade, o.uf,
       cs.nome AS servico, cs.categoria, v.placa, v.marca, v.modelo, v.ano,
       u_cli.nome AS cliente_nome, u_cli.email AS cliente_email, u_ofi.telefone AS oficina_telefone
       FROM agendamentos a
       JOIN oficinas o ON o.usuario_id=a.oficina_id
       JOIN catalogo_servicos cs ON cs.id=a.servico_id
       JOIN veiculos v ON v.id=a.veiculo_id
       JOIN usuarios u_cli ON u_cli.id=a.cliente_id
       JOIN usuarios u_ofi ON u_ofi.id=a.oficina_id
       WHERE a.id=? AND a.cliente_id=?`
    ).get(id, req.user!.id) as any;

    if (!ag) { res.status(404).json({ error: 'Agendamento não encontrado' }); return; }
    res.json({ comprovante: ag });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
