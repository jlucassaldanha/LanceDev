# Desafio Elite Dev 2026 - 2 (Back-end)

Este é o repositório do back-end para o desafio da Casa de Leilões online. A API foi construída em Node.js com Express e TypeScript, focando em robustez, resiliência e segurança arquitetural.

## Decisões Técnicas e Arquitetura

Para garantir uma base sólida e escalável, as seguintes decisões foram tomadas durante o desenvolvimento:

* **Entidade de Usuário Unificada com Roles:** Optamos por utilizar uma única tabela de `User` no banco de dados, diferenciando os perfis através de um enum de `Role` (LEILOEIRO e LICITANTE). Essa escolha simplifica o fluxo de autenticação e mantém o banco de dados limpo.


* **Segurança via Middlewares:** A separação de responsabilidades e a robustez das regras de negócio (como garantir que o leiloeiro não dê lances e o licitante não crie lotes) ficam centralizadas na camada de código. Middlewares interceptam as requisições baseados no token JWT para fazer a autorização de papéis.


* **Prisma 7:** O ORM escolhido foi o Prisma na versão 7, devido à sua estabilidade consolidada, previsibilidade nas migrações em relação a versões mais recentes, e pela familiaridade técnica.


* **Docker Compose:** Utilizado para orquestrar o banco de dados PostgreSQL. É a melhor abordagem para criar e padronizar o banco de dados no ambiente de desenvolvimento sem poluir a máquina local.


* **Swagger:** Adicionado para documentar os endpoints e facilitar os testes manuais da API diretamente pelo navegador, proporcionando uma interface visual amigável.



## O que foi feito até agora

* Configuração do projeto com **Node.js, Express e TypeScript** estruturado em camadas (Controllers, Services, Repositories e Middlewares).


* Modelagem do banco de dados (Prisma Schema) contemplando as tabelas de Usuários, Lotes e Lances com os devidos controles de saldo e campos para auditoria de histórico (hashes).


* Implementação do fluxo de **Registro e Login de usuários**, com criptografia de senhas usando `bcryptjs` e geração de tokens `JWT`.


* Criação da "catraca de segurança" (Middlewares) para proteger rotas específicas para `LEILOEIRO` ou `LICITANTE`.

* Implementação da **Carteira**, com possibilidade de deposito para `LICITANTE` e geração de consulta de saldo.


* Documentação inicial da API com **Swagger UI**.


* Configuração de **Testes de Integração automatizados** utilizando o framework Vitest e Supertest para validar as regras de autenticação e rotas.



## Como rodar a aplicação localmente

Siga os passos abaixo para configurar o ambiente de desenvolvimento.

### Pré-requisitos

* Node.js instalado.
* Docker e Docker Compose instalados.

### Passo a passo

**1. Clone o repositório e instale as dependências:**

```bash
npm install

```

**2. Configure as variáveis de ambiente:**
Crie um arquivo `.env` na raiz do projeto contendo as seguintes chaves:

```env
DATABASE_URL="postgresql://admin:adminpassword@localhost:5432/leiloes_db?schema=public"
JWT_SECRET="sua_chave_secreta_aqui"
PORT=3000

```

**3. Suba o banco de dados com Docker Compose:**

```bash
docker-compose up -d

```

Isso iniciará um container com o PostgreSQL rodando na porta 5432.

**4. Execute as migrações do Prisma:**
Isso criará as tabelas no seu banco de dados:

```bash
npx prisma migrate dev

```

**5. Gere o Prisma Client:**
Isso criará as tipagens locais do TypeScript necessárias para que a aplicação reconheça os modelos de dados:
Bash
```bash
npx prisma generate
```

**6. Inicie o servidor de desenvolvimento:**

```bash
npm run dev

```

O servidor estará rodando em `http://localhost:3000`. Você pode acessar a documentação interativa para testar as rotas em `http://localhost:3000/api-docs`.

### Como rodar os testes

Para executar os testes de integração configurados com Vitest:

```bash
npm run test

```

## Uso de Inteligência Artificial

Conforme permitido e encorajado nas regras do desafio, ferramentas de IA foram utilizadas ao longo do desenvolvimento deste projeto[cite: 1]. O uso foi estritamente focado em consultoria arquitetural, esclarecimento de dúvidas e aceleração de *boilerplate*, com revisão humana integral. 

Para ler os detalhes completos sobre quais decisões tiveram apoio de IA e como o código foi revisado, acesse a [Declaração de Uso de IA](./IA_USE.md).