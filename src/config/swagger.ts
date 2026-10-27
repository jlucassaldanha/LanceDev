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

    '/wallet': {
      get: {
        summary: 'Consulta os saldos da carteira do usuário logado',
        tags: ['Carteira'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { 
            description: 'Saldos retornados com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalBalance: { type: 'number', example: 500.50 },
                    committedBalance: { type: 'number', example: 100.00 },
                    availableBalance: { type: 'number', example: 400.50 },
                  }
                }
              }
            }
          },
          401: { description: 'Token não fornecido ou inválido' },
          403: { description: 'Acesso negado (apenas LICITANTE)' },
        },
      },
    },
    '/wallet/deposit': {
      post: {
        summary: 'Realiza um depósito simulado na carteira',
        tags: ['Carteira'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'number', example: 500.50 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Depósito realizado com sucesso' },
          400: { description: 'Valor inválido' },
          401: { description: 'Token não fornecido ou inválido' },
          403: { description: 'Acesso negado (apenas LICITANTE)' },
        },
      },
    },
    
    '/lots': {
      get: {
        summary: 'Lista os lotes da vitrine (com filtro opcional por status)',
        tags: ['Lotes - Public'],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['SCHEDULED', 'LIVE', 'FINISHED'] },
            description: 'Filtrar lotes por status',
          },
        ],
        responses: {
          200: { description: 'Lista de lotes retornada com sucesso' },
        },
      },

      post: {
        summary: 'Cria um novo lote buscando dados na The Met API',
        tags: ['Lotes - Leiloeiro'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  externalItemId: { type: 'string', example: '436532' },
                  startingBid: { type: 'number', example: 100000 },
                  minimumIncrement: { type: 'number', example: 5000 },
                  startTime: { type: 'string', format: 'date-time', example: '2026-10-24T10:00:00Z' },
                  endTime: { type: 'string', format: 'date-time', example: '2026-10-26T20:00:00Z' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Lote criado com sucesso' },
          400: { description: 'Campos obrigatórios faltando' },
          403: { description: 'Acesso negado (apenas LEILOEIRO)' },
          404: { description: 'Obra não encontrada na API' },
          502: { description: 'Erro na API externa' },
        },
      },
    },

    '/lots/{id}': {
      get: {
        summary: 'Exibe os detalhes de um lote específico e seus últimos lances',
        tags: ['Lotes - Public'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID do lote',
          },
        ],
        responses: {
          200: { description: 'Detalhes do lote retornados com sucesso' },
          404: { description: 'Lote não encontrado' },
        },
      },
      patch: {
        summary: 'Cancela um lote que ainda não recebeu lances',
        tags: ['Lotes - Leiloeiro'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID do lote',
          },
        ],
        responses: {
          200: { description: 'Lote cancelado com sucesso' },
          400: { description: 'Não é possível cancelar (já possui lances)' },
          403: { description: 'Acesso negado' },
          404: { description: 'Lote não encontrado' },
        },
      },
    },
    '/lots/search': {
      get: {
        summary: 'Pesquisa itens na The Met API para auxiliar na obtenção do externalItemId (Apenas LEILOEIRO)',
        tags: ['Lotes - Leiloeiro'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Termo de busca (ex: sunflowers, rembrandt)',
          },
        ],
        responses: {
          200: { description: 'Lista de itens encontrados na API externa' },
          400: { description: 'Parâmetro de busca ausente' },
          401: { description: 'Token não fornecido ou inválido' }, 
          403: { description: 'Acesso negado (apenas LEILOEIRO)' }, 
          502: { description: 'Erro na API externa' },
        },
      },
    },
    '/lots/my-lots': {
      get: {
        summary: 'Lista todos os lotes criados pelo leiloeiro autenticado',
        tags: ['Lotes - Leiloeiro'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista dos meus lotes retornada com sucesso' },
          401: { description: 'Token ausente ou inválido' },
          403: { description: 'Acesso negado (apenas LEILOEIRO)' },
        },
      },
    },
    '/lots/{id}/bids': {
      post: {
        summary: 'Regista um novo lance num lote (Apenas LICITANTE)',
        tags: ['Lances - Licitante'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID do lote',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'number', example: 1500 },
                },
                required: ['amount'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Lance registado com sucesso' },
          400: { description: 'Erro de validação (lance muito baixo, saldo insuficiente, etc.)' },
          401: { description: 'Utilizador não autenticado ou token ausente' },
          403: { description: 'Acesso negado (apenas LICITANTE)' },
          404: { description: 'Lote não encontrado' },
        },
      },
    },
    '/lots/{id}/liquidate': {
      post: {
        summary: 'Liquida/encerra um lote expirado, transferindo valores e gerando o comprovante',
        tags: ['Lotes'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID do lote',
          },
        ],
        responses: {
          200: { description: 'Lote liquidado com sucesso' },
          400: { description: 'Lote ainda não expirado ou já encerrado' },
          401: { description: 'Não autenticado' },
          403: { description: 'Acesso negado' },
          404: { description: 'Lote não encontrado' },
        },
      },
    },
    '/lots/{id}/audit': {
      get: {
        summary: 'Audita o histórico de lances de um lote publicamente (Verifica integridade SHA-256)',
        tags: ['Auditoria'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID do lote',
          },
        ],
        responses: {
          200: { description: 'Relatório de auditoria e validação de integridade gerado com sucesso' },
          404: { description: 'Lote não encontrado' },
        },
      },
    },
    '/lots/{id}/live-room': {
      get: {
        summary: 'Retorna todas as informações consolidadas para a Sala do Lote ao Vivo',
        tags: ['Lotes - Licitante'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID do lote',
          },
        ],
        responses: {
          200: { description: 'Dados da sala ao vivo retornados com sucesso' },
          401: { description: 'Não autenticado' },
          404: { description: 'Lote não encontrado' },
        },
      },
    },
    '/lots/my-winnings': {
      get: {
        summary: 'Lista os lotes arrematados (comprovantes) do licitante autenticado',
        tags: ['Lotes - Licitante'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de arremates retornada com sucesso' },
          401: { description: 'Token ausente ou inválido' },
          403: { description: 'Acesso negado (apenas LICITANTE)' },
        },
      },
    },
    '/lots/my-live-lots': {
      get: {
        summary: 'Lista os lotes ao vivo do licitante autenticado',
        tags: ['Lotes - Licitante'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de lotes retornada com sucesso' },
          401: { description: 'Token ausente ou inválido' },
          403: { description: 'Acesso negado (apenas LICITANTE)' },
        },
      },
    },
    "/lots/{id}/receipt": {
      "get": {
        "summary": "Retorna o comprovante de arremate de um lote",
        "description": "Rota pública para visualização e compartilhamento de comprovantes de lotes encerrados. O nome do arrematante é mascarado para preservar a privacidade, atendendo aos requisitos de auditoria. Não exige token JWT.",
        "tags": [
          "Lotes - Public"
        ],
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "description": "ID do lote"
          }
        ],
        "responses": {
          "200": {
            "description": "Comprovante gerado com sucesso.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "lotId": {
                      "type": "string"
                    },
                    "title": {
                      "type": "string"
                    },
                    "imageUrl": {
                      "type": "string"
                    },
                    "amount": {
                      "type": "number"
                    },
                    "closedAt": {
                      "type": "string",
                      "format": "date-time"
                    },
                    "winnerName": {
                      "type": "string",
                      "example": "Carlos C."
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Este lote ainda não foi encerrado."
          },
          "404": {
            "description": "Lote não encontrado."
          }
        }
      }
    }
  },
};