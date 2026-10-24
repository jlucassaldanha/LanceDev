# 0006. Endpoint Consolidado para a Sala do Lote ao Vivo (`GET /lots/:id/live-room`)

* **Status:** Aceito
* **Contexto:** Evitar o anti-padrão de sobrecarregar o front-end com múltiplos cálculos, requisições paralelas e lógica complexa de comparação de estado na interface.
* **Decisão:** Criação de um endpoint dedicado que entrega todas as informações mastigadas para o front-end (dados do lote, status temporal, maior lance, nome mascarado dos licitantes por privacidade, flag booleana `isWinning`, histórico de lances e relógio sincronizado do servidor).
* **Consequências:**
* *Prós:* Reduz drasticamente a complexidade do front-end, economiza banda e garante performance e sincronização perfeitas na tela ao vivo.