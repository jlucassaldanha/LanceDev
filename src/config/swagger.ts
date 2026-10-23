export const swaggerDocs = {
  openapi: '3.0.0',
  info: {
    title: 'API Casa de Leilões - Desafio Verzel',
    version: '1.0.0',
    description: 'Documentação da API para o Desafio Elite Dev 2026',
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Cadastra um novo usuário',
        tags: ['Autenticação'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'João Silva' },
                  email: { type: 'string', example: 'joao@email.com' },
                  password: { type: 'string', example: 'senha123' },
                  role: { type: 'string', enum: ['LEILOEIRO', 'LICITANTE'], example: 'LICITANTE' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Usuário criado com sucesso' },
          400: { description: 'Erro de validação (campos faltando, email duplicado ou papel inválido)' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Realiza o login e retorna o Token JWT',
        tags: ['Autenticação'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'joao@email.com' },
                  password: { type: 'string', example: 'senha123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login realizado com sucesso' },
          401: { description: 'Credenciais inválidas' },
          404: { description: 'Usuário não encontrado' },
        },
      },
    },
  },
};