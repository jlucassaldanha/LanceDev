# 0004. Adoção do Prisma 7, Docker Compose e Swagger

* **Status:** Aceito
* **Contexto:** Precisei definir um ORM moderno e estável para mapeamento relacional, uma ferramenta padronizada para isolar o ambiente de banco de dados de desenvolvimento e uma forma ágil de documentação e testes manuais.
* **Decisão:** 
  1. Adotei o **Prisma na versão 7** pela sua estabilidade consolidada e previsibilidade nas migrações.
  2. Utilizei o **Docker Compose** para orquestrar o container do PostgreSQL, isolando o ambiente de desenvolvimento e evitando dependências na máquina local.
  3. Integrei o **Swagger UI** para documentar os endpoints e prover uma interface visual interativa.
* **Consequências:**
  * **Positivo:** Padroniza o ambiente de desenvolvimento de forma idêntica para qualquer avaliador, fornece forte tipagem com TypeScript, garante agilidade na execução de migrações e facilita drasticamente os testes manuais e a validação rápida dos endpoints.
  * **Negativo:** Cria dependência do Docker ativo para rodar o banco localmente e exige manutenção da especificação OpenAPI junto ao código das rotas.