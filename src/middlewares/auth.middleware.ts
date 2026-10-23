import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_desafio_verzel';

interface TokenPayload {
  id: string;
  role: Role;
}

// 1. Verifica se o usuário está logado (Token válido)
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  // O padrão é "Bearer <token>", então pegamos a segunda parte
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as TokenPayload;
    
    // Anexa os dados do usuário na requisição para os próximos controllers usarem
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

// 2. Proteção de Rota: Apenas Licitantes (Clientes)
export const isLicitante = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== Role.LICITANTE) {
    return res.status(403).json({ error: 'Acesso negado. Apenas licitantes podem realizar esta ação.' });
  }
  return next();
};

// 3. Proteção de Rota: Apenas Leiloeiros (Vendedores)
export const isLeiloeiro = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== Role.LEILOEIRO) {
    return res.status(403).json({ error: 'Acesso negado. Apenas leiloeiros podem criar e gerenciar lotes.' });
  }
  return next();
};