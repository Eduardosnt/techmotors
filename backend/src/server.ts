import express from 'express';
import cors from 'cors';
import path from 'path';

import { initDatabase } from './config/database';
import authRoutes from './routes/auth';
import clienteRoutes from './routes/cliente';
import oficinaRoutes from './routes/oficina';
import adminRoutes from './routes/admin';

// Inicializar banco de dados (cria tabelas + seed se necessário)
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/oficina', oficinaRoutes);
app.use('/api/admin', adminRoutes);

// Fallback: servir o frontend para qualquer rota não-API
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`✅ TechMotors API rodando em http://localhost:${PORT}`);
  console.log(`📁 Frontend servido de: ${path.join(__dirname, '../../frontend')}`);
  console.log(`💾 Banco SQLite: backend/data/techmotors.db`);
});

export default app;
