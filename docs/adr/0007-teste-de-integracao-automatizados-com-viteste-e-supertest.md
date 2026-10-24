# 0007. Testes de Integração Automatizados com Vitest e Supertest

* **Status:** Aceito
* **Contexto:** Validar endpoints e regras de negócio de forma exclusivamente manual (via Postman ou Swagger) é um processo lento, repetitivo e suscetível a regressões. Como a nossa modelagem unificada de usuários não possui restrições físicas no banco de dados para separar papéis, a segurança do sistema depende estritamente dos *middlewares* na camada de código. Era crucial garantir de forma contínua que as permissões operassem sem falhas.
* **Decisão:** Criação de uma suíte de testes de integração automatizados utilizando as bibliotecas Vitest e Supertest. Os testes realizam requisições HTTP reais simulando cenários ponta a ponta (limpando e repopulando o banco no `beforeAll` de cada suíte) para atestar a estabilidade dos endpoints principais.
* **Consequências:**
* *Prós:* Ajuda a validar os endpoints de maneira muito menos manual, proporcionando confiança imediata no código. Assegura ativamente que regras complexas — como o bloqueio de leiloeiros no motor de lances, o isolamento financeiro da carteira e a integridade da auditoria — estão intactas e protegidas.
* *Contras:* Requer a manutenção constante dos *mocks* (como chamadas à API externa) e aumenta a complexidade do ambiente de teste, exigindo a limpeza constante do banco de dados para garantir o isolamento entre as execuções.