# 0002. Cache Local e Resiliência para a API Externa (The Met)

* **Status:** Aceito
* **Contexto:** A aplicação consome a API pública do *The Metropolitan Museum of Art (The Met)* para buscar itens de leilão. APIs externas são passíveis de instabilidades, latência ou quedas, o que poderia inutilizar a vitrine, as salas de lances e a auditoria da plataforma.
* **Decisão:** Implementei uma estratégia de persistência local no momento da criação do lote (`POST /lots`). Quando o leiloeiro define o lote informando o ID externo, os dados essenciais da obra (título e imagem) são salvos de forma definitiva na tabela local `Lot` do nosso banco de dados PostgreSQL.
* **Consequências:**
  * **Positivo:** Garante total resiliência operacional. A vitrine de lotes, as salas ao vivo, os históricos e os comprovantes continuam funcionando integralmente mesmo se a API externa do museu ficar offline.
  * **Negativo:** Os dados da obra no banco local tornam-se estáticos após a criação (caso o museu altere o título original da obra na API deles, nossa base não refletirá a mudança automaticamente, o que é um *trade-off* perfeitamente aceitável para o escopo de um leilão).