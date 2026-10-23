# Desafio Elite Dev 2026 - 2 (Back-end)

Este é o repositório do back-end para o desafio da Casa de Leilões online. A API foi construída em Node.js com Express e TypeScript, focando em robustez, resiliência e segurança arquitetural.

## Decisões Técnicas e Arquitetura

Para garantir uma base sólida e escalável, as seguintes decisões foram tomadas durante o desenvolvimento:

- **Entidade de Usuário Unificada com Roles:** Optamos por utilizar uma única tabela de `User` no banco de dados, diferenciando os perfis através de um enum de `Role` (`LEILOEIRO` e `LICITANTE`). Essa escolha simplifica o fluxo de autenticação e mantém o banco de dados limpo.

- **Segurança via Middlewares:** A separação de responsabilidades e a robustez das regras de negócio (como garantir que o leiloeiro não dê lances e o licitante não crie lotes) ficam centralizadas na camada de código. Middlewares interceptam as requisições baseados no token JWT para fazer a autorização de papéis.

- **Endpoint Consolidado (Live Room):** Para evitar o anti-padrão de sobrecarregar o front-end com múltiplos cálculos e requisições paralelas, criamos um endpoint dedicado (`GET /lots/:id/live-room`). Ele centraliza a lógica de estado, cruzamento de dados de liderança (`isWinning`), aplica o mascaramento de privacidade e entrega os dados prontos para renderização sincronizados pelo relógio do servidor.

- **Prisma 7:** O ORM escolhido foi o Prisma na versão 7, devido à sua estabilidade consolidada, previsibilidade nas migrações em relação a versões mais recentes, e pela familiaridade técnica.

- **Docker Compose:** Utilizado para orquestrar o banco de dados PostgreSQL. É a melhor abordagem para criar e padronizar o banco de dados no ambiente de desenvolvimento sem poluir a máquina local.

- **Swagger:** Adicionado para documentar os endpoints e facilitar os testes manuais da API diretamente pelo navegador, proporcionando uma interface visual amigável.

## O que foi feito até agora

- Configuração do projeto com **Node.js, Express e TypeScript** estruturado em camadas (Controllers, Services, Repositories e Middlewares).
- Modelagem do banco de dados (Prisma Schema) contemplando as tabelas de Usuários, Lotes e Lances com os devidos controles de saldo e campos para auditoria de histórico (`hashes`).
- Implementação do fluxo de **Registro e Login de usuários**, com criptografia de senhas usando `bcryptjs` e geração de tokens `JWT`.
- Criação da "catraca de segurança" (Middlewares) para proteger rotas específicas para `LEILOEIRO` ou `LICITANTE`.
- Implementação da **Carteira**, com funcionalidade de depósito exclusiva para `LICITANTE` e consulta de saldo (total, comprometido e disponível) acessível tanto para `LICITANTE` quanto para `LEILOEIRO`.
- Integração com API externa (The Metropolitan Museum of Art) para pesquisa de itens. Como medida de **resiliência**, todo lote publicado ao ser pesquisado na API tem seus dados (título, imagem) salvos no banco local, garantindo que a aplicação continue funcionando integralmente mesmo em caso de instabilidade ou queda da API externa.
- Adição da rota de busca de **"Meus Lotes"** (`GET /lots/my-lots`), facilitando a listagem e o gerenciamento no painel do front-end.
- Implementação do **Motor de Lances** (`POST /lots/:id/bids`), garantindo validação de horário, incremento mínimo, checagem e bloqueio de saldo em tempo real, bloqueio de auto-superação e regra de *anti-sniping* (prorrogação de 2 minutos).
- Criação do endpoint consolidado para a **Sala do Lote ao Vivo** (`GET /lots/:id/live-room`), entregando dados mastigados para o front-end (maior lance atual, histórico com nomes mascarados por privacidade, flag `isWinning` e tempo do servidor sincronizado).
- Implementação do **Mecanismo de Liquidação**, transferindo o saldo comprometido para o leiloeiro ao fim do lote.
- Implementação de **Cron Job** para automação do ciclo de vida dos leilões, responsável por verificar periodicamente e atualizar o status dos lotes (como transições de ativo para finalizado) e disparar as regras de encerramento.
- Criação da nova rota de **Winnings** para consulta de lotes arrematados/vencidos pelos usuários.
- **Estratégia de Auditoria (Blockchain Pattern):** Implementação de encadeamento criptográfico com SHA-256 (`crypto.createHash('sha256')`) combinando os dados do lance (`lotId + bidderId + amount`) com o `previousHash` do lance anterior (ou `'GENESIS'` para o primeiro lance). Qualquer alteração direta no banco de dados quebra a integridade da cadeia de hashes, sendo detectada de forma transparente pela **Rota de Auditoria Pública**.
Saiba mais em [Estratégia de Auditoria](audit.md).
- Script de **Seed** (`prisma/seed.ts`) configurado para popular o banco de dados com 1 leiloeiro, 2 licitantes e 1 lote ativo.
- Documentação da API com **Swagger UI**.

- Configuração de **Testes de Integração automatizados** utilizando o framework Vitest e Supertest. Os testes cobrem o fluxo ponta a ponta das principais rotas do sistema (autenticação, carteira, motor de lances, salas ao vivo e regras de negócio essenciais). *Nota: A rota de winnings adicionada recentemente ainda não possui cobertura de testes automatizados nesta versão.*

## Comportamentos Inesperados e Limitações Conhecidas

* **Dados Estáticos de Lotes (Cache de Resiliência):** Para garantir que a aplicação continue funcionando integralmente caso a API do *The Met* fique offline, os dados essenciais da obra (título e imagem) são salvos definitivamente no banco local durante a criação do lote. Consequentemente, caso o museu altere as informações originais da obra em sua API posteriormente, a base de dados da plataforma não refletirá essa mudança automaticamente.


* **Acoplamento na Inserção de Lances:** A estratégia para garantir um histórico à prova de adulterações utiliza encadeamento criptográfico com SHA-256. Isso exige que o algoritmo combine os dados do novo lance com o *hash* gerado no lance imediatamente anterior. Essa estrutura gera um acoplamento obrigatório na rotina de lances, exigindo uma consulta síncrona ao banco para resgatar o último *hash* gerado antes de persistir o novo registro.


* **Ausência de Restrições Físicas de Papéis no Banco:** A modelagem do sistema utiliza uma única tabela `User`, diferenciando usuários através do *enum* de `Role` (`LEILOEIRO` e `LICITANTE`) para simplificar a autenticação. Como consequência, as restrições físicas de relacionamento exclusivo no banco de dados deixam de existir. Toda a responsabilidade por bloquear ações indevidas (como impedir um leiloeiro de dar lances ou depositar fundos indevidamente) depende estritamente do rigor da camada de código através da interceptação por Middlewares.


* **Superfície de Endpoints Expandida:** Para otimizar a experiência do *front-end* e isolar regras financeiras, foram criadas rotas dedicadas (como `/lots/my-lots` exclusiva para leiloeiros e depósitos exclusivos para licitantes). O comportamento esperado dessa divisão é um leve aumento na quantidade de endpoints expostos, o que demandou maior controle de segurança nas rotas.


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

```bash
npx prisma generate
```

**6. Inicie o Seed para popular o banco de dados:**
Isso irá gerar um Leiloeiro, dois Licitantes e um Lote com lance

```bash
npx tsx prisma/seed.ts
```
Credenciais geradas pelo Seed para testes:

* **Leiloeiro:**
  * E-mail: `leiloeiro@leilodedev.com`
  * Senha: `123456`


* **Licitante 1 (Líder atual do lote):**
  * E-mail: `licitante1@leilodedev.com`
  * Senha: `123456`


* **Licitante 2:**
  * E-mail: `licitante2@leilodedev.com`
  * Senha: `123456`



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

## Decisões Arquiteturais (ADRs)

As decisões técnicas fundamentais deste projeto (escolhas de modelagem, resiliência de API, estratégia de auditoria e stack escolhida) estão formalmente documentadas através de Architecture Decision Records na pasta [docs/adr/](./docs/adr/).

## Uso de Inteligência Artificial

Conforme as instruções de envio do desafio, ferramentas de IA foram utilizadas ao longo do desenvolvimento deste projeto. O uso foi estritamente focado em consultoria arquitetural, esclarecimento de dúvidas e aceleração de *boilerplate*, com revisão humana integral.

Para ler os detalhes completos sobre quais decisões tiveram apoio de IA e como o código foi revisado, acesse a [Declaração de Uso de IA](IA_USE.md).