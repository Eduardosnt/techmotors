import { Router, Response } from 'express';

import db from '../config/database';
import { autenticar, exigirTipo, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(autenticar, exigirTipo('oficina'));

// GET /api/oficina/status
router.get('/status', (req: AuthRequest, res: Response) => {
  try {
    const oficina = db.prepare('SELECT * FROM oficinas WHERE usuario_id=?').get(req.user!.id);
    res.json({ oficina: oficina || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/oficina/perfil
router.get('/perfil', (req: AuthRequest, res: Response) => {
  try {
    const perfil = db
      .prepare(
        `SELECT o.*, u.nome, u.email, u.telefone FROM oficinas o
       JOIN usuarios u ON u.id=o.usuario_id WHERE o.usuario_id=?`
      )
      .get(req.user!.id);
    res.json({ perfil });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/oficina/perfil
router.put('/perfil', (req: AuthRequest, res: Response) => {
  try {
    const { nome, telefone, nome_fantasia, razao_social, logradouro, numero, bairro, cidade, uf, cep } = req.body;
    db.prepare('UPDATE usuarios SET nome=?, telefone=? WHERE id=?').run(nome, telefone, req.user!.id);
    db.prepare(
      'UPDATE oficinas SET nome_fantasia=?, razao_social=?, logradouro=?, numero=?, bairro=?, cidade=?, uf=?, cep=? WHERE usuario_id=?'
    ).run(nome_fantasia, razao_social, logradouro, numero, bairro, cidade, uf, cep, req.user!.id);
    res.json({ message: 'Perfil atualizado.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/oficina/agenda
router.get('/agenda', (req: AuthRequest, res: Response) => {
  try {
    const inicio = (req.query.inicio as string) || getMonday();
    const fim = addDays(inicio, 6);
    const agendamentos = db
      .prepare(
        `SELECT a.*, u.nome AS cliente_nome, cs.nome AS servico, v.placa
       FROM agendamentos a JOIN usuarios u ON u.id=a.cliente_id
       JOIN catalogo_servicos cs ON cs.id=a.servico_id JOIN veiculos v ON v.id=a.veiculo_id
       WHERE a.oficina_id=? AND DATE(a.data_hora) BETWEEN ? AND ?
       AND a.status NOT IN('cancelado','recusado') ORDER BY a.data_hora`
      )
      .all(req.user!.id, inicio, fim);
    const pendentes = (
      db
        .prepare(`SELECT COUNT(*) as c FROM agendamentos WHERE oficina_id=? AND status='solicitado'`)
        .get(req.user!.id) as any
    ).c;
    res.json({ agendamentos, pendentes, inicio, fim });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/oficina/solicitacoes
router.get('/solicitacoes', (req: AuthRequest, res: Response) => {
  try {
    const status_filtro = (req.query.status as string) || 'solicitado';
    const rows = db
      .prepare(
        `SELECT a.*, u.nome AS cliente_nome, u.telefone AS cliente_tel,
        cs.nome AS servico, v.placa, v.marca, v.modelo, v.ano
       FROM agendamentos a JOIN usuarios u ON u.id=a.cliente_id
       JOIN catalogo_servicos cs ON cs.id=a.servico_id JOIN veiculos v ON v.id=a.veiculo_id
       WHERE a.oficina_id=? AND a.status=? ORDER BY a.data_hora`
      )
      .all(req.user!.id, status_filtro);
    res.json({ agendamentos: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/oficina/solicitacoes/:id/acao
router.post('/solicitacoes/:id/acao', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { acao, motivo } = req.body;
    const check = db.prepare('SELECT * FROM agendamentos WHERE id=? AND oficina_id=?').get(id, req.user!.id);
    if (!check) {
      res.status(404).json({ error: 'Agendamento não encontrado' });
      return;
    }

    if (acao === 'confirmar') db.prepare("UPDATE agendamentos SET status='confirmado' WHERE id=?").run(id);
    else if (acao === 'recusar')
      db.prepare("UPDATE agendamentos SET status='recusado', motivo_cancelamento=? WHERE id=?").run(motivo || '', id);
    else if (acao === 'concluir') db.prepare("UPDATE agendamentos SET status='concluido' WHERE id=?").run(id);
    else if (acao === 'cancelar')
      db.prepare("UPDATE agendamentos SET status='cancelado', motivo_cancelamento=? WHERE id=?").run(
        motivo || 'Cancelado pela oficina',
        id
      );
    else {
      res.status(400).json({ error: 'Ação inválida' });
      return;
    }

    // Criar notificação para o cliente
    const ag = db
      .prepare(
        'SELECT a.cliente_id, o.nome_fantasia FROM agendamentos a JOIN oficinas o ON o.usuario_id=a.oficina_id WHERE a.id=?'
      )
      .get(id) as any;
    if (ag) {
      const notifMap: any = {
        confirmar: {
          tipo: 'confirmado',
          titulo: 'Agendamento confirmado! ✅',
          mensagem: `${ag.nome_fantasia} confirmou seu agendamento.`,
        },
        recusar: {
          tipo: 'recusado',
          titulo: 'Agendamento recusado',
          mensagem: `${ag.nome_fantasia} recusou seu agendamento.${motivo ? ' Motivo: ' + motivo : ''}`,
        },
        concluir: {
          tipo: 'concluido',
          titulo: 'Serviço concluído! 🎉',
          mensagem: `Seu serviço em ${ag.nome_fantasia} foi concluído. Avalie sua experiência!`,
        },
        cancelar: {
          tipo: 'cancelado',
          titulo: 'Agendamento cancelado',
          mensagem: `${ag.nome_fantasia} cancelou seu agendamento.${motivo ? ' Motivo: ' + motivo : ''}`,
        },
      };
      const notif = notifMap[acao];
      if (notif) {
        db.prepare('INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link) VALUES (?, ?, ?, ?, ?)').run(
          ag.cliente_id,
          notif.tipo,
          notif.titulo,
          notif.mensagem,
          '#cliente-agendamentos'
        );
      }
    }

    res.json({ message: 'Status atualizado.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/oficina/disponibilidade
router.get('/disponibilidade', (req: AuthRequest, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM disponibilidade WHERE oficina_id=?').all(req.user!.id);
    res.json({ disponibilidade: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/oficina/disponibilidade
router.put('/disponibilidade', (req: AuthRequest, res: Response) => {
  try {
    const { dias } = req.body;
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM disponibilidade WHERE oficina_id=?').run(req.user!.id);
      for (const d of dias) {
        if (d.ativo && d.hora_inicio && d.hora_fim) {
          db.prepare(
            'INSERT INTO disponibilidade (oficina_id, dia_semana, hora_inicio, hora_fim, ativo) VALUES (?, ?, ?, ?, 1)'
          ).run(req.user!.id, d.dia_semana, d.hora_inicio, d.hora_fim);
        }
      }
    });
    transaction();
    res.json({ message: 'Disponibilidade atualizada.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/oficina/bloqueios
router.get('/bloqueios', (req: AuthRequest, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM bloqueios WHERE oficina_id=? ORDER BY data_inicio DESC').all(req.user!.id);
    res.json({ bloqueios: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/oficina/bloqueios
router.post('/bloqueios', (req: AuthRequest, res: Response) => {
  try {
    const { data_inicio, data_fim, motivo } = req.body;
    db.prepare('INSERT INTO bloqueios (oficina_id, data_inicio, data_fim, motivo) VALUES (?, ?, ?, ?)').run(
      req.user!.id,
      data_inicio,
      data_fim,
      motivo || ''
    );
    res.json({ message: 'Datas bloqueadas.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/oficina/bloqueios/:id
router.delete('/bloqueios/:id', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('DELETE FROM bloqueios WHERE id=? AND oficina_id=?').run(parseInt(req.params.id), req.user!.id);
    res.json({ message: 'Bloqueio removido.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/oficina/servicos
router.get('/servicos', (req: AuthRequest, res: Response) => {
  try {
    const meus = db
      .prepare(
        `SELECT os.*, cs.nome AS servico_nome, cs.categoria FROM oficina_servicos os
       JOIN catalogo_servicos cs ON cs.id=os.servico_id WHERE os.oficina_id=?`
      )
      .all(req.user!.id);
    const catalogo = db.prepare('SELECT * FROM catalogo_servicos WHERE ativo=1 ORDER BY categoria, nome').all();
    res.json({ meus_servicos: meus, catalogo });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/oficina/servicos
router.post('/servicos', (req: AuthRequest, res: Response) => {
  try {
    const { servico_id, preco_modalidade, preco, duracao } = req.body;
    db.prepare(
      'INSERT INTO oficina_servicos (oficina_id, servico_id, preco_modalidade, preco, duracao_minutos) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user!.id, servico_id, preco_modalidade, preco || null, duracao || 60);
    res.json({ message: 'Serviço adicionado.' });
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') res.status(400).json({ error: 'Serviço já adicionado.' });
    else res.status(500).json({ error: err.message });
  }
});

// DELETE /api/oficina/servicos/:id
router.delete('/servicos/:id', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('DELETE FROM oficina_servicos WHERE id=? AND oficina_id=?').run(parseInt(req.params.id), req.user!.id);
    res.json({ message: 'Serviço removido.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/oficina/metricas
router.get('/metricas', (req: AuthRequest, res: Response) => {
  try {
    const porStatus = db
      .prepare('SELECT status, COUNT(*) as c FROM agendamentos WHERE oficina_id=? GROUP BY status')
      .all(req.user!.id) as any[];
    const receita = (
      db
        .prepare(
          `SELECT COALESCE(SUM(valor_estimado),0) as total FROM agendamentos WHERE oficina_id=? AND status='concluido'`
        )
        .get(req.user!.id) as any
    ).total;
    const oficina = db
      .prepare('SELECT nota_media, total_avaliacoes FROM oficinas WHERE usuario_id=?')
      .get(req.user!.id) as any;
    const mesAtual = new Date().toISOString().substring(0, 7); // YYYY-MM
    const mes = (
      db
        .prepare(`SELECT COUNT(*) as c FROM agendamentos WHERE oficina_id=? AND substr(data_hora,1,7)=?`)
        .get(req.user!.id, mesAtual) as any
    ).c;
    const receitaMes = (
      db
        .prepare(
          `SELECT COALESCE(SUM(valor_estimado),0) as total FROM agendamentos WHERE oficina_id=? AND status='concluido' AND substr(data_hora,1,7)=?`
        )
        .get(req.user!.id, mesAtual) as any
    ).total;

    // Agendamentos de hoje
    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosHoje = db
      .prepare(
        `SELECT a.*, u.nome AS cliente_nome, cs.nome AS servico, v.placa
       FROM agendamentos a JOIN usuarios u ON u.id=a.cliente_id JOIN catalogo_servicos cs ON cs.id=a.servico_id JOIN veiculos v ON v.id=a.veiculo_id
       WHERE a.oficina_id=? AND DATE(a.data_hora)=? AND a.status IN ('confirmado','solicitado')
       ORDER BY a.data_hora ASC`
      )
      .all(req.user!.id, hoje);

    // Pendentes
    const pendentes = (
      db
        .prepare(`SELECT COUNT(*) as c FROM agendamentos WHERE oficina_id=? AND status='solicitado'`)
        .get(req.user!.id) as any
    ).c;

    const statusMap: any = {};
    for (const r of porStatus) statusMap[r.status] = r.c;

    res.json({
      por_status: statusMap,
      receita,
      receita_mes: receitaMes,
      nota_media: oficina?.nota_media || 0,
      total_avaliacoes: oficina?.total_avaliacoes || 0,
      mes_total: mes,
      agendamentos_hoje: agendamentosHoje,
      pendentes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/oficina/historico — atendimentos concluídos
router.get('/historico', (req: AuthRequest, res: Response) => {
  try {
    const historico = db
      .prepare(
        `SELECT a.*, u.nome AS cliente_nome, u.telefone AS cliente_telefone,
       cs.nome AS servico, cs.categoria, v.placa, v.marca, v.modelo,
       av.qtd_estrelas, av.comentario AS aval_comentario
       FROM agendamentos a
       JOIN usuarios u ON u.id=a.cliente_id
       JOIN catalogo_servicos cs ON cs.id=a.servico_id
       JOIN veiculos v ON v.id=a.veiculo_id
       LEFT JOIN avaliacoes av ON av.agendamento_id=a.id
       WHERE a.oficina_id=? AND a.status='concluido'
       ORDER BY a.data_hora DESC`
      )
      .all(req.user!.id);
    res.json({ historico });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/oficina/notificacoes
router.get('/notificacoes', (req: AuthRequest, res: Response) => {
  try {
    const notificacoes = db
      .prepare('SELECT * FROM notificacoes WHERE usuario_id=? ORDER BY criado_em DESC LIMIT 50')
      .all(req.user!.id);
    const nao_lidas = (
      db.prepare('SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id=? AND lida=0').get(req.user!.id) as any
    ).total;
    res.json({ notificacoes, nao_lidas });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/oficina/notificacoes/ler
router.post('/notificacoes/ler', (req: AuthRequest, res: Response) => {
  try {
    db.prepare('UPDATE notificacoes SET lida=1 WHERE usuario_id=?').run(req.user!.id);
    res.json({ message: 'OK' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// GET /api/oficina/agendamento/:id — detalhes de um agendamento
router.get('/agendamento/:id', (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const ag = db
      .prepare(
        `SELECT a.*, u.nome AS cliente_nome, u.telefone AS cliente_telefone, u.email AS cliente_email,
       cs.nome AS servico, cs.categoria, v.placa, v.marca, v.modelo, v.ano
       FROM agendamentos a
       JOIN usuarios u ON u.id=a.cliente_id
       JOIN catalogo_servicos cs ON cs.id=a.servico_id
       JOIN veiculos v ON v.id=a.veiculo_id
       WHERE a.id=? AND a.oficina_id=?`
      )
      .get(id, req.user!.id) as any;
    if (!ag) {
      res.status(404).json({ error: 'Agendamento não encontrado' });
      return;
    }
    res.json({ agendamento: ag });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
