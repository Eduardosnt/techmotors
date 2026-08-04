import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'techmotors_secret_key_2026';

export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  tipo: 'cliente' | 'oficina' | 'admin';
  status: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function gerarToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

export function autenticar(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function exigirTipo(...tipos: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }
    if (!tipos.includes(req.user.tipo)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }
    next();
  };
}
