import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(__dirname, '../../data/techmotors.db');

// Criar diretório data se não existir
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db: import('better-sqlite3').Database = Database(DB_PATH);

// Configurações de performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // Criar tabelas
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      telefone TEXT,
      tipo TEXT NOT NULL CHECK(tipo IN ('cliente','oficina','admin')),
      status TEXT DEFAULT 'ativo' CHECK(status IN ('ativo','inativo','bloqueado','pendente_aprovacao')),
      foto_url TEXT,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      atualizado_em TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS clientes (
      usuario_id INTEGER PRIMARY KEY,
      cpf TEXT NOT NULL UNIQUE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS oficinas (
      usuario_id INTEGER PRIMARY KEY,
      cnpj TEXT NOT NULL UNIQUE,
      nome_fantasia TEXT NOT NULL,
      razao_social TEXT,
      logradouro TEXT,
      numero TEXT,
      bairro TEXT,
      cidade TEXT,
      uf TEXT,
      cep TEXT,
      latitude REAL,
      longitude REAL,
      nota_media REAL DEFAULT 0,
      total_avaliacoes INTEGER DEFAULT 0,
      status_aprovacao TEXT DEFAULT 'pendente' CHECK(status_aprovacao IN ('pendente','aprovada','rejeitada')),
      motivo_rejeicao TEXT,
      aprovado_por INTEGER,
      aprovado_em TEXT,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (aprovado_por) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS veiculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      placa TEXT NOT NULL UNIQUE,
      marca TEXT,
      modelo TEXT,
      ano INTEGER,
      tipo TEXT DEFAULT 'carro' CHECK(tipo IN ('carro','moto')),
      FOREIGN KEY (cliente_id) REFERENCES clientes(usuario_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS catalogo_servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT,
      descricao TEXT,
      ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS oficina_servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oficina_id INTEGER NOT NULL,
      servico_id INTEGER NOT NULL,
      preco_modalidade TEXT DEFAULT 'a_partir_de' CHECK(preco_modalidade IN ('fixo','a_partir_de','orcamento')),
      preco REAL,
      duracao_minutos INTEGER DEFAULT 60,
      ativo INTEGER DEFAULT 1,
      FOREIGN KEY (oficina_id) REFERENCES oficinas(usuario_id) ON DELETE CASCADE,
      FOREIGN KEY (servico_id) REFERENCES catalogo_servicos(id),
      UNIQUE(oficina_id, servico_id)
    );

    CREATE TABLE IF NOT EXISTS disponibilidade (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oficina_id INTEGER NOT NULL,
      dia_semana INTEGER NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      ativo INTEGER DEFAULT 1,
      FOREIGN KEY (oficina_id) REFERENCES oficinas(usuario_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bloqueios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oficina_id INTEGER NOT NULL,
      data_inicio TEXT NOT NULL,
      data_fim TEXT NOT NULL,
      motivo TEXT,
      FOREIGN KEY (oficina_id) REFERENCES oficinas(usuario_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      oficina_id INTEGER NOT NULL,
      veiculo_id INTEGER NOT NULL,
      servico_id INTEGER NOT NULL,
      data_hora TEXT NOT NULL,
      duracao_minutos INTEGER DEFAULT 60,
      status TEXT DEFAULT 'solicitado' CHECK(status IN ('solicitado','confirmado','concluido','cancelado','recusado')),
      motivo_cancelamento TEXT,
      valor_estimado REAL,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      atualizado_em TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (cliente_id) REFERENCES clientes(usuario_id),
      FOREIGN KEY (oficina_id) REFERENCES oficinas(usuario_id),
      FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
      FOREIGN KEY (servico_id) REFERENCES catalogo_servicos(id),
      UNIQUE(oficina_id, data_hora)
    );

    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agendamento_id INTEGER NOT NULL UNIQUE,
      cliente_id INTEGER NOT NULL,
      oficina_id INTEGER NOT NULL,
      qtd_estrelas INTEGER NOT NULL CHECK(qtd_estrelas BETWEEN 1 AND 5),
      comentario TEXT,
      ocultada INTEGER DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id),
      FOREIGN KEY (cliente_id) REFERENCES clientes(usuario_id),
      FOREIGN KEY (oficina_id) REFERENCES oficinas(usuario_id)
    );
  `);

  // Seed data se o banco estiver vazio
  const count = db.prepare('SELECT COUNT(*) as c FROM usuarios').get() as any;
  if (count.c === 0) {
    seedDatabase();
  }
}

function seedDatabase() {
  const hash = bcrypt.hashSync('Senha@123', 10);

  const insertUser = db.prepare('INSERT INTO usuarios (nome, email, senha, telefone, tipo, status) VALUES (?, ?, ?, ?, ?, ?)');
  const insertCliente = db.prepare('INSERT INTO clientes (usuario_id, cpf) VALUES (?, ?)');
  const insertOficina = db.prepare('INSERT INTO oficinas (usuario_id, cnpj, nome_fantasia, razao_social, logradouro, numero, bairro, cidade, uf, cep, latitude, longitude, nota_media, total_avaliacoes, status_aprovacao, aprovado_por, aprovado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertVeiculo = db.prepare('INSERT INTO veiculos (cliente_id, placa, marca, modelo, ano, tipo) VALUES (?, ?, ?, ?, ?, ?)');
  const insertCatalogo = db.prepare('INSERT INTO catalogo_servicos (nome, categoria, descricao) VALUES (?, ?, ?)');
  const insertOfServico = db.prepare('INSERT INTO oficina_servicos (oficina_id, servico_id, preco_modalidade, preco, duracao_minutos) VALUES (?, ?, ?, ?, ?)');
  const insertDisp = db.prepare('INSERT INTO disponibilidade (oficina_id, dia_semana, hora_inicio, hora_fim) VALUES (?, ?, ?, ?)');
  const insertAgend = db.prepare('INSERT INTO agendamentos (cliente_id, oficina_id, veiculo_id, servico_id, data_hora, duracao_minutos, status, valor_estimado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertAval = db.prepare('INSERT INTO avaliacoes (agendamento_id, cliente_id, oficina_id, qtd_estrelas, comentario) VALUES (?, ?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    // Admin
    insertUser.run('Administrador TechMotors', 'admin@techmotors.com', hash, '(61) 99999-0000', 'admin', 'ativo');
    // Clientes
    insertUser.run('João Silva', 'joao@email.com', hash, '(61) 98888-1111', 'cliente', 'ativo');
    insertUser.run('Maria Souza', 'maria@email.com', hash, '(61) 98888-2222', 'cliente', 'ativo');
    insertUser.run('Pedro Lima', 'pedro@email.com', hash, '(61) 98888-3333', 'cliente', 'ativo');

    insertCliente.run(2, '111.111.111-11');
    insertCliente.run(3, '222.222.222-22');
    insertCliente.run(4, '333.333.333-33');

    insertVeiculo.run(2, 'ABC-1D34', 'Honda', 'Civic', 2019, 'carro');
    insertVeiculo.run(2, 'XYZ-9K88', 'Yamaha', 'Fazer 250', 2021, 'moto');
    insertVeiculo.run(3, 'DEF-2E56', 'Toyota', 'Corolla', 2020, 'carro');
    insertVeiculo.run(4, 'GHI-3F78', 'Volkswagen', 'Gol', 2018, 'carro');

    // Catálogo
    insertCatalogo.run('Troca de Óleo', 'Manutenção Preventiva', 'Troca de óleo do motor e filtro');
    insertCatalogo.run('Troca de Filtros', 'Manutenção Preventiva', 'Filtros de ar, combustível e cabine');
    insertCatalogo.run('Troca de Velas', 'Manutenção Preventiva', 'Substituição de velas de ignição');
    insertCatalogo.run('Troca de Correias', 'Manutenção Preventiva', 'Correia dentada e acessórios');
    insertCatalogo.run('Alinhamento', 'Suspensão', 'Alinhamento de direção');
    insertCatalogo.run('Balanceamento', 'Suspensão', 'Balanceamento de rodas');
    insertCatalogo.run('Revisão de Freios', 'Freios', 'Verificação e troca de pastilhas/discos');
    insertCatalogo.run('Troca de Pneus', 'Pneus', 'Substituição e montagem de pneus');
    insertCatalogo.run('Verificação Elétrica', 'Elétrica', 'Diagnóstico do sistema elétrico');
    insertCatalogo.run('Ar Condicionado', 'Climatização', 'Higienização e recarga');

    // Oficinas
    insertUser.run('JM Auto Centro', 'jm@oficina.com', hash, '(61) 3333-1000', 'oficina', 'ativo');
    insertUser.run('High Torque Asa Sul', 'high@oficina.com', hash, '(61) 3333-2000', 'oficina', 'ativo');
    insertUser.run('Mecânica do Zé', 'ze@oficina.com', hash, '(61) 3333-3000', 'oficina', 'ativo');
    insertUser.run('Auto Center Brasília', 'autocenter@oficina.com', hash, '(61) 3333-4000', 'oficina', 'pendente_aprovacao');
    insertUser.run('Oficina Taguá', 'tagua@oficina.com', hash, '(61) 3333-5000', 'oficina', 'pendente_aprovacao');

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    insertOficina.run(5, '11.111.111/0001-11', 'JM Auto Centro', 'JM Auto Centro LTDA', 'SIA Trecho 3', '45', 'SIA', 'Brasília', 'DF', '71200-030', -15.806, -47.945, 4.80, 213, 'aprovada', 1, now);
    insertOficina.run(6, '22.222.222/0001-22', 'High Torque Asa Sul', 'High Torque Mecânica LTDA', 'SCS Quadra 7', '120', 'Asa Sul', 'Brasília', 'DF', '70307-900', -15.798, -47.892, 4.60, 87, 'aprovada', 1, now);
    insertOficina.run(7, '33.333.333/0001-33', 'Mecânica do Zé', 'Zé Auto Serviços ME', 'QNM 28 Conj. A', '10', 'Ceilândia', 'Brasília', 'DF', '72215-281', -15.825, -48.107, 4.30, 45, 'aprovada', 1, now);
    insertOficina.run(8, '44.444.444/0001-44', 'Auto Center Brasília', 'Auto Center Brasília SA', 'SGAN 904', 'S/N', 'Asa Norte', 'Brasília', 'DF', '70790-040', -15.766, -47.880, 0, 0, 'pendente', null, null);
    insertOficina.run(9, '55.555.555/0001-55', 'Oficina Taguá', 'Oficina Taguá ME', 'CSA 9 Lote 17', '17', 'Taguatinga', 'Brasília', 'DF', '72015-100', -15.832, -48.041, 0, 0, 'pendente', null, null);

    // Serviços por oficina
    insertOfServico.run(5, 1, 'a_partir_de', 80.00, 40);
    insertOfServico.run(5, 2, 'fixo', 60.00, 30);
    insertOfServico.run(5, 5, 'fixo', 120.00, 60);
    insertOfServico.run(5, 6, 'fixo', 80.00, 45);
    insertOfServico.run(5, 7, 'a_partir_de', 180.00, 90);
    insertOfServico.run(6, 1, 'a_partir_de', 95.00, 40);
    insertOfServico.run(6, 3, 'fixo', 150.00, 60);
    insertOfServico.run(6, 5, 'fixo', 130.00, 60);
    insertOfServico.run(6, 7, 'a_partir_de', 200.00, 90);
    insertOfServico.run(6, 10, 'a_partir_de', 180.00, 60);
    insertOfServico.run(7, 1, 'fixo', 70.00, 40);
    insertOfServico.run(7, 2, 'fixo', 50.00, 30);
    insertOfServico.run(7, 4, 'orcamento', null, 120);
    insertOfServico.run(7, 8, 'a_partir_de', 150.00, 45);

    // Disponibilidade
    for (let d = 1; d <= 5; d++) insertDisp.run(5, d, '08:00', '18:00');
    insertDisp.run(5, 6, '08:00', '12:00');
    for (let d = 1; d <= 5; d++) insertDisp.run(6, d, '08:00', '18:00');
    for (let d = 1; d <= 5; d++) insertDisp.run(7, d, '08:00', '17:00');
    insertDisp.run(7, 6, '08:00', '12:00');

    // Agendamentos
    insertAgend.run(2, 5, 1, 1, '2026-08-13 09:00:00', 40, 'solicitado', 80.00);
    insertAgend.run(2, 5, 1, 5, '2026-08-15 10:00:00', 60, 'confirmado', 120.00);
    insertAgend.run(3, 6, 3, 7, '2026-08-10 14:00:00', 90, 'confirmado', 200.00);
    insertAgend.run(4, 7, 4, 2, '2026-07-28 11:00:00', 30, 'concluido', 50.00);
    insertAgend.run(2, 6, 2, 3, '2026-08-20 15:00:00', 60, 'solicitado', 150.00);

    // Avaliação
    insertAval.run(4, 4, 7, 5, 'Atendimento ótimo, recomendo!');
  });

  transaction();
  console.log('📦 Banco de dados criado com dados de teste!');
}

export default db;
