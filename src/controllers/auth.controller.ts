import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const user = await authService.register(req.body);
      return res.status(201).json(user);
    } catch (error: any) {
      if (error.message === 'FIELDS_MISSING') {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
      }
      if (error.message === 'INVALID_ROLE') {
        return res.status(400).json({ error: 'Papel inválido.' });
      }
      if (error.message === "EMAIL_ALREADY_EXISTS") {
        return res.status(400).json({ error: "Este e-mail já está em uso."})
      }
      console.error('Não foi possível registrar:', error)
      return res.status(500).json({ error: 'Erro interno do servidor. Não foi possível registrar.' })
    }
  }

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'FIELDS_MISSING') {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
      }
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: 'Usuário não encontrado.' })
      }
      if (error.message === 'INVALID_CREDENTIALS') {
        return res.status(401).json({ error: 'Credenciais inválidas.' })
      }
      console.error('Não foi possível realizar o login:', error)
      return res.status(500).json({ error: 'Erro interno no servidor. Não foi possível realizar o login.' });
    }
  }
}