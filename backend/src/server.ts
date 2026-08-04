import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';

import { initDatabase } from './config/database';
import authRoutes from './routes/auth';
import clienteRoutes from './routes/cliente';
import oficinaRoutes from './routes/oficina';
import adminRoutes from './routes/admin';
import chatRoutes from './routes/chat';

// Inicializar banco de dados (cria tabelas + seed se necessário)
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── SECURITY HEADERS ───────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  // Previne clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Previne MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Ativa filtro XSS do navegador
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Controle de referrer
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  // Content Security Policy
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; " +
    "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; " +
    "font-src 'self' https://cdn.jsdelivr.net; " +
    "img-src 'self' data: https://*.openstreetmap.org https://*.tile.openstreetmap.org; " +
    "frame-src 'self' https://*.openstreetmap.org; " +
    "connect-src 'self'"
  );
  next();
});

// ─── RATE LIMITING ──────────────────────────────────
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
      next();
    } else if (record.count < maxRequests) {
      record.count++;
      next();
    } else {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: `Muitas tentativas. Tente novamente em ${retryAfter} segundos.` });
    }
  };
}

// Limpa registros expirados a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitStore) {
    if (now > val.resetTime) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── INPUT SANITIZATION ─────────────────────────────
// Remove tags HTML perigosas de inputs string
function sanitizeValue(val: any): any {
  if (typeof val === 'string') {
    return val.replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
              .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
              .replace(/on\w+\s*=\s*'[^']*'/gi, '');
  }
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val && typeof val === 'object') {
    const clean: any = {};
    for (const k of Object.keys(val)) clean[k] = sanitizeValue(val[k]);
    return clean;
  }
  return val;
}

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeValue(req.body);
  next();
});

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// Rate limit nas rotas sensíveis
app.use('/api/auth/login', rateLimit(5, 15 * 60 * 1000)); // 5 tentativas por 15min
app.use('/api/auth/esqueci-senha', rateLimit(3, 60 * 60 * 1000)); // 3 por hora
app.use('/api/auth/cadastro', rateLimit(5, 60 * 60 * 1000)); // 5 por hora

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/oficina', oficinaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

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
