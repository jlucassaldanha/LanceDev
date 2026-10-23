# 0001. Utilização de Tabela Única de Usuários com Enum de Role

* **Status:** Aceito
* **Contexto:** O sistema exige dois perfis distintos (`LEILOEIRO` e `LICITANTE`) com permissões e regras de negócio próprias (ex: leiloeiros criam lotes e recebem créditos; licitantes depositam saldo e dão lances). Precisava decidir entre criar tabelas separadas no banco de dados (`Auctioneer` e `Bidder`) ou uma tabela unificada.
* **Decisão:** Optei por utilizar uma única tabela `User` contendo um campo `enum Role` (`LEILOEIRO` e `LICITANTE`). A separação de segurança e restrição de acesso às rotas é centralizada na camada de código através de Middlewares no Express baseados em token JWT.
* **Consequências:**
  * **Positivo:** Simplifica o fluxo de autenticação (um único endpoint de login para ambos os papéis), evita duplicação de código e mantém o banco limpo. Além disso, acomoda perfeitamente o fato de que a coluna de saldo (`balance`) pode ser utilizada tanto pelo licitante (para depósitos e lances) quanto pelo leiloeiro (para receber os créditos dos lotes arrematados).
  * **Negativo:** A restrição física de banco de dados deixa de existir, exigindo rigor absoluto na implementação dos Middlewares e nos testes de integração para garantir que um leiloeiro nunca execute ações de licitante e vice-versa.