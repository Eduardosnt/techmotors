import { Router, Response } from 'express';
import db from '../config/database';
import { autenticar, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(autenticar);

// ─── BOT RULES ──────────────────────────────────────
interface BotRule {
  keywords: string[];
  response: string;
}

const botRules: BotRule[] = [
  {
    keywords: ['oi', 'olá', 'ola', 'hey', 'bom dia', 'boa tarde', 'boa noite', 'hello'],
    response: '👋 Olá! Eu sou o assistente virtual da TechMotors. Como posso te ajudar?\n\nAqui estão algumas coisas que posso fazer:\n• Ajudar a agendar um serviço\n• Informar sobre preços e serviços\n• Explicar como funciona a plataforma\n• Conectar você com uma oficina\n\nDigite sua dúvida ou "atendente" para falar com uma oficina.'
  },
  {
    keywords: ['agendar', 'agendamento', 'marcar', 'horário', 'horario', 'reservar'],
    response: '📅 Para agendar um serviço:\n\n1. Vá em **Buscar** no menu\n2. Escolha uma oficina\n3. Clique em **Agendar**\n4. Selecione o serviço, data, horário e veículo\n\nA oficina confirmará seu horário em breve!\n\n💡 Dica: adicione seu veículo antes em **Meus Veículos** para agilizar.'
  },
  {
    keywords: ['preço', 'preco', 'valor', 'custo', 'quanto custa', 'tabela'],
    response: '💰 Os preços variam por oficina e serviço. Ao acessar uma oficina, você vê a lista de serviços com:\n\n• **Preço fixo** — valor exato\n• **A partir de** — valor mínimo\n• **Sob orçamento** — a oficina avalia\n\nO pagamento é feito diretamente na oficina, sem intermediação.'
  },
  {
    keywords: ['cancelar', 'cancelamento', 'desmarcar'],
    response: '❌ Para cancelar um agendamento:\n\n1. Vá em **Agendamentos** no menu\n2. Encontre o agendamento que deseja cancelar\n3. Clique em **Cancelar**\n\n⚠️ Você pode cancelar agendamentos com status "Solicitado" ou "Confirmado".'
  },
  {
    keywords: ['veículo', 'veiculo', 'carro', 'moto', 'placa'],
    response: '🚗 Para gerenciar seus veículos:\n\n1. Acesse **Veículos** no menu\n2. Clique em **Adicionar**\n3. Informe placa, marca, modelo e ano\n\nAceitamos placa antiga (ABC-1234) e Mercosul (ABC1D23). Você precisa ter um veículo cadastrado para agendar.'
  },
  {
    keywords: ['avaliação', 'avaliacao', 'avaliar', 'estrela', 'nota'],
    response: '⭐ Após um serviço ser concluído, você pode avaliar a oficina:\n\n1. Vá em **Agendamentos**\n2. No agendamento concluído, clique em **Avaliar**\n3. Dê uma nota de 1 a 5 estrelas e deixe um comentário\n\nSua avaliação ajuda outros clientes a escolherem!'
  },
  {
    keywords: ['oficina', 'buscar', 'encontrar', 'procurar', 'perto', 'próxima'],
    response: '🔍 Para encontrar oficinas:\n\n1. Vá em **Buscar** no menu\n2. Use os filtros: serviço, categoria ou cidade\n3. Se ativar a localização, mostramos as mais próximas\n\nCada oficina mostra avaliações, serviços e horários disponíveis.'
  },
  {
    keywords: ['pagamento', 'pagar', 'pix', 'cartão', 'cartao', 'dinheiro'],
    response: '💳 O pagamento é feito **diretamente na oficina**, presencialmente. A TechMotors não intermedia pagamentos.\n\nAs formas aceitas (PIX, cartão, dinheiro) dependem de cada oficina. Consulte ao chegar.'
  },
  {
    keywords: ['senha', 'login', 'entrar', 'acesso', 'conta'],
    response: '🔐 Sobre sua conta:\n\n• Para alterar dados ou senha, acesse **Meu Perfil** no menu do usuário (canto superior direito)\n• Sua senha precisa ter 8+ caracteres, 1 maiúscula, 1 número e 1 especial\n• Se esqueceu a senha, entre em contato com o suporte.'
  },
  {
    keywords: ['funciona', 'como usar', 'ajuda', 'help', 'dúvida', 'duvida'],
    response: '🛠️ A TechMotors funciona assim:\n\n1. **Cadastre-se** como cliente\n2. **Adicione seu veículo**\n3. **Busque uma oficina** por serviço ou localização\n4. **Agende** escolhendo serviço, data e horário\n5. **Acompanhe** o status do agendamento\n6. **Avalie** após o serviço\n\nSimples assim! Alguma dúvida específica?'
  },
  {
    keywords: ['obrigado', 'obrigada', 'valeu', 'thanks', 'vlw'],
    response: '😊 Por nada! Se precisar de mais alguma coisa, é só digitar. Estou aqui pra ajudar!'
  }
];

function getBotResponse(message: string): string {
  const msg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const rule of botRules) {
    for (const kw of rule.keywords) {
      const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (msg.includes(kwNorm)) {
        return rule.response;
      }
    }
  }

  return '🤔 Não entendi muito bem. Tente perguntar sobre:\n\n• Como **agendar** um serviço\n• **Preços** e pagamentos\n• Como **buscar oficinas**\n• **Cancelar** agendamentos\n• Gerenciar **veículos**\n\nOu digite **"atendente"** para falar com uma oficina real.';
}

// ─── ROUTES ─────────────────────────────────────────

// GET /api/chat/conversas — lista conversas do usuário
router.get('/conversas', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const tipo = req.user!.tipo;

    let conversas: any[] = [];
    if (tipo === 'cliente') {
      conversas = db.prepare(
        `SELECT c.*, o.nome_fantasia, 
         (SELECT conteudo FROM mensagens WHERE conversa_id=c.id ORDER BY criado_em DESC LIMIT 1) as ultima_msg,
         (SELECT criado_em FROM mensagens WHERE conversa_id=c.id ORDER BY criado_em DESC LIMIT 1) as ultima_msg_em
         FROM conversas c
         LEFT JOIN oficinas o ON o.usuario_id=c.oficina_id
         WHERE c.cliente_id=?
         ORDER BY c.atualizado_em DESC`
      ).all(userId);
    } else if (tipo === 'oficina') {
      conversas = db.prepare(
        `SELECT c.*, u.nome as cliente_nome,
         (SELECT conteudo FROM mensagens WHERE conversa_id=c.id ORDER BY criado_em DESC LIMIT 1) as ultima_msg,
         (SELECT criado_em FROM mensagens WHERE conversa_id=c.id ORDER BY criado_em DESC LIMIT 1) as ultima_msg_em
         FROM conversas c
         JOIN usuarios u ON u.id=c.cliente_id
         WHERE c.oficina_id=? AND c.status='atendente'
         ORDER BY c.atualizado_em DESC`
      ).all(userId);
    } else {
      conversas = [];
    }

    res.json({ conversas });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat/iniciar — inicia ou retoma conversa com bot
router.post('/iniciar', (req: AuthRequest, res: Response) => {
  try {
    const clienteId = req.user!.id;

    // Verificar se já tem conversa ativa com bot
    let conversa = db.prepare(
      "SELECT * FROM conversas WHERE cliente_id=? AND status IN ('bot','atendente') ORDER BY criado_em DESC LIMIT 1"
    ).get(clienteId) as any;

    if (!conversa) {
      const result = db.prepare(
        "INSERT INTO conversas (cliente_id, status) VALUES (?, 'bot')"
      ).run(clienteId);
      conversa = { id: result.lastInsertRowid, cliente_id: clienteId, status: 'bot' };

      // Mensagem de boas-vindas do bot
      db.prepare(
        "INSERT INTO mensagens (conversa_id, remetente, conteudo) VALUES (?, 'bot', ?)"
      ).run(conversa.id, '👋 Olá! Eu sou o assistente virtual da TechMotors.\n\nComo posso te ajudar? Pergunte sobre agendamentos, preços, oficinas, ou digite **"atendente"** para falar com uma oficina.');
    }

    // Buscar mensagens
    const mensagens = db.prepare(
      'SELECT * FROM mensagens WHERE conversa_id=? ORDER BY criado_em ASC'
    ).all(conversa.id);

    res.json({ conversa, mensagens });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat/mensagem — envia mensagem
router.post('/mensagem', (req: AuthRequest, res: Response) => {
  try {
    const { conversa_id, conteudo } = req.body;
    const userId = req.user!.id;
    const tipo = req.user!.tipo;

    if (!conteudo || !conteudo.trim()) {
      res.status(400).json({ error: 'Mensagem vazia' }); return;
    }

    const conversa = db.prepare('SELECT * FROM conversas WHERE id=?').get(conversa_id) as any;
    if (!conversa) { res.status(404).json({ error: 'Conversa não encontrada' }); return; }

    // Determinar remetente
    let remetente = 'cliente';
    if (tipo === 'oficina') remetente = 'oficina';

    // Salvar mensagem do usuário
    db.prepare('INSERT INTO mensagens (conversa_id, remetente, conteudo) VALUES (?, ?, ?)')
      .run(conversa_id, remetente, conteudo.trim());

    db.prepare("UPDATE conversas SET atualizado_em=datetime('now','localtime') WHERE id=?")
      .run(conversa_id);

    const respostas: any[] = [];

    // Se conversa está em modo bot e é cliente, gerar resposta automática
    if (conversa.status === 'bot' && tipo === 'cliente') {
      const msgLower = conteudo.toLowerCase().trim();

      // Verifica se quer falar com atendente
      if (msgLower.includes('atendente') || msgLower.includes('humano') || msgLower.includes('pessoa') || msgLower.includes('falar com')) {
        // Listar oficinas disponíveis
        const oficinas = db.prepare(
          "SELECT o.usuario_id, o.nome_fantasia FROM oficinas o WHERE o.status_aprovacao='aprovada' LIMIT 10"
        ).all() as any[];

        let resposta = '👤 Certo! Com qual oficina você gostaria de falar?\n\n';
        oficinas.forEach((o, i) => {
          resposta += `${i + 1}. **${o.nome_fantasia}**\n`;
        });
        resposta += '\nDigite o número da oficina ou o nome.';

        db.prepare('INSERT INTO mensagens (conversa_id, remetente, conteudo) VALUES (?, ?, ?)')
          .run(conversa_id, 'bot', resposta);
        respostas.push({ remetente: 'bot', conteudo: resposta });

      } else {
        // Verifica se está escolhendo uma oficina (número ou nome)
        const lastBotMsg = db.prepare(
          "SELECT conteudo FROM mensagens WHERE conversa_id=? AND remetente='bot' ORDER BY criado_em DESC LIMIT 1"
        ).get(conversa_id) as any;

        if (lastBotMsg && lastBotMsg.conteudo.includes('Com qual oficina')) {
          const oficinas = db.prepare(
            "SELECT o.usuario_id, o.nome_fantasia FROM oficinas o WHERE o.status_aprovacao='aprovada' LIMIT 10"
          ).all() as any[];

          let escolhida: any = null;
          const num = parseInt(msgLower);
          if (!isNaN(num) && num >= 1 && num <= oficinas.length) {
            escolhida = oficinas[num - 1];
          } else {
            escolhida = oficinas.find(o => o.nome_fantasia.toLowerCase().includes(msgLower));
          }

          if (escolhida) {
            // Transferir para atendente
            db.prepare("UPDATE conversas SET status='atendente', oficina_id=?, atualizado_em=datetime('now','localtime') WHERE id=?")
              .run(escolhida.usuario_id, conversa_id);

            const resposta = `✅ Conectando você com **${escolhida.nome_fantasia}**...\n\nUm atendente responderá em breve. Enquanto isso, pode enviar sua dúvida que ela ficará registrada.`;
            db.prepare('INSERT INTO mensagens (conversa_id, remetente, conteudo) VALUES (?, ?, ?)')
              .run(conversa_id, 'bot', resposta);
            respostas.push({ remetente: 'bot', conteudo: resposta });
          } else {
            const resposta = '🤔 Não encontrei essa oficina. Tente digitar o número da lista ou o nome da oficina.';
            db.prepare('INSERT INTO mensagens (conversa_id, remetente, conteudo) VALUES (?, ?, ?)')
              .run(conversa_id, 'bot', resposta);
            respostas.push({ remetente: 'bot', conteudo: resposta });
          }
        } else {
          // Resposta normal do bot
          const botResp = getBotResponse(conteudo);
          db.prepare('INSERT INTO mensagens (conversa_id, remetente, conteudo) VALUES (?, ?, ?)')
            .run(conversa_id, 'bot', botResp);
          respostas.push({ remetente: 'bot', conteudo: botResp });
        }
      }
    }

    res.json({ respostas });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/chat/mensagens/:conversa_id — buscar mensagens
router.get('/mensagens/:conversa_id', (req: AuthRequest, res: Response) => {
  try {
    const conversaId = parseInt(req.params.conversa_id);
    const conversa = db.prepare('SELECT * FROM conversas WHERE id=?').get(conversaId) as any;
    if (!conversa) { res.status(404).json({ error: 'Conversa não encontrada' }); return; }

    const mensagens = db.prepare(
      'SELECT * FROM mensagens WHERE conversa_id=? ORDER BY criado_em ASC'
    ).all(conversaId);

    res.json({ conversa, mensagens });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat/encerrar/:conversa_id — encerra conversa
router.post('/encerrar/:conversa_id', (req: AuthRequest, res: Response) => {
  try {
    const conversaId = parseInt(req.params.conversa_id);
    db.prepare("UPDATE conversas SET status='encerrada', atualizado_em=datetime('now','localtime') WHERE id=?")
      .run(conversaId);
    res.json({ message: 'Conversa encerrada.' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
