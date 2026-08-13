import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server';
import { gerarToken } from '../src/middleware/auth';

// Tokens para diferentes tipos de usuário (baseados no seed)
const clienteToken = gerarToken({ id: 2, nome: 'João Silva', email: 'joao@email.com', tipo: 'cliente', status: 'ativo' });
const outroClienteToken = gerarToken({ id: 3, nome: 'Maria Souza', email: 'maria@email.com', tipo: 'cliente', status: 'ativo' });
const oficinaToken = gerarToken({ id: 5, nome: 'JM Auto Centro', email: 'jm@oficina.com', tipo: 'oficina', status: 'ativo' });
const adminToken = gerarToken({ id: 1, nome: 'Admin', email: 'admin@techmotors.com', tipo: 'admin', status: 'ativo' });

describe('Chat — Autorização', () => {
  let conversaId: number;

  beforeAll(async () => {
    // Cliente inicia uma conversa
    const res = await request(app)
      .post('/api/chat/iniciar')
      .set('Authorization', `Bearer ${clienteToken}`);
    conversaId = res.body.conversa.id;
  });

  describe('POST /api/chat/iniciar', () => {
    it('deve permitir que cliente inicie conversa', async () => {
      const res = await request(app)
        .post('/api/chat/iniciar')
        .set('Authorization', `Bearer ${clienteToken}`);
      expect(res.status).toBe(200);
      expect(res.body.conversa).toBeDefined();
    });

    it('deve bloquear oficina de iniciar conversa', async () => {
      const res = await request(app)
        .post('/api/chat/iniciar')
        .set('Authorization', `Bearer ${oficinaToken}`);
      expect(res.status).toBe(403);
    });

    it('deve bloquear admin de iniciar conversa', async () => {
      const res = await request(app)
        .post('/api/chat/iniciar')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/chat/mensagem', () => {
    it('deve permitir que o dono da conversa envie mensagem', async () => {
      const res = await request(app)
        .post('/api/chat/mensagem')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ conversa_id: conversaId, conteudo: 'Olá, preciso de ajuda' });
      expect(res.status).toBe(200);
    });

    it('deve bloquear outro cliente de enviar mensagem na conversa alheia', async () => {
      const res = await request(app)
        .post('/api/chat/mensagem')
        .set('Authorization', `Bearer ${outroClienteToken}`)
        .send({ conversa_id: conversaId, conteudo: 'Tentativa de invasão' });
      expect(res.status).toBe(403);
    });

    it('deve bloquear admin de enviar mensagem', async () => {
      const res = await request(app)
        .post('/api/chat/mensagem')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ conversa_id: conversaId, conteudo: 'Admin intruso' });
      expect(res.status).toBe(403);
    });

    it('deve rejeitar conversa_id inválido', async () => {
      const res = await request(app)
        .post('/api/chat/mensagem')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ conversa_id: 'abc', conteudo: 'teste' });
      expect(res.status).toBe(400);
    });

    it('deve rejeitar mensagem vazia', async () => {
      const res = await request(app)
        .post('/api/chat/mensagem')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ conversa_id: conversaId, conteudo: '   ' });
      expect(res.status).toBe(400);
    });

    it('deve retornar 404 para conversa inexistente', async () => {
      const res = await request(app)
        .post('/api/chat/mensagem')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ conversa_id: 99999, conteudo: 'teste' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/chat/mensagens/:conversa_id', () => {
    it('deve permitir que o dono leia mensagens', async () => {
      const res = await request(app)
        .get(`/api/chat/mensagens/${conversaId}`)
        .set('Authorization', `Bearer ${clienteToken}`);
      expect(res.status).toBe(200);
      expect(res.body.mensagens).toBeDefined();
    });

    it('deve bloquear outro cliente de ler mensagens alheias', async () => {
      const res = await request(app)
        .get(`/api/chat/mensagens/${conversaId}`)
        .set('Authorization', `Bearer ${outroClienteToken}`);
      expect(res.status).toBe(403);
    });

    it('deve rejeitar conversa_id não numérico', async () => {
      const res = await request(app)
        .get('/api/chat/mensagens/abc')
        .set('Authorization', `Bearer ${clienteToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/chat/encerrar/:conversa_id', () => {
    it('deve permitir que o dono encerre a conversa', async () => {
      // Primeiro cria uma nova para não afetar outros testes
      const inicio = await request(app)
        .post('/api/chat/iniciar')
        .set('Authorization', `Bearer ${outroClienteToken}`);
      const id = inicio.body.conversa.id;

      const res = await request(app)
        .post(`/api/chat/encerrar/${id}`)
        .set('Authorization', `Bearer ${outroClienteToken}`);
      expect(res.status).toBe(200);
    });

    it('deve bloquear outro cliente de encerrar conversa alheia', async () => {
      const res = await request(app)
        .post(`/api/chat/encerrar/${conversaId}`)
        .set('Authorization', `Bearer ${outroClienteToken}`);
      expect(res.status).toBe(403);
    });
  });
});
