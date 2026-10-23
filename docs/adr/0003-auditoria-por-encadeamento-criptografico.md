# 0003. Estratégia de Auditoria com Encadeamento Criptográfico (Blockchain Pattern)

* **Status:** Aceito
* **Contexto:** O desafio exige que o histórico de lances seja à prova de adulterações, garantindo que nenhuma inserção, remoção ou alteração ocorra diretamente no banco de dados sem ser detectada.
* **Decisão:** Utilizei o algoritmo SHA-256 (`crypto.createHash('sha256')`) para criar uma estrutura de lista encadeada de lances. O conteúdo hasheado combina os dados do lance atual (`lotId + bidderId + amount`) junto com o hash do lance imediatamente anterior (`previousHash`). Para o primeiro lance de um lote, utiliza-se a constante `'GENESIS'`.
* **Consequências:**
  * **Positivo:** Efeito avalanche matemático. Se qualquer administrador mal-intencionado alterar um registro diretamente no PostgreSQL, o hash daquela linha deixará de ser compatível. O lance seguinte, que carrega o `previousHash`, também apontará a inconsistência, quebrando toda a cadeia de validação subsequente de forma auditável e transparente.
  * **Negativo:** Introduz acoplamento na rotina de inserção de lances, exigindo a consulta síncrona do último hash gerado antes de persistir o novo registro.