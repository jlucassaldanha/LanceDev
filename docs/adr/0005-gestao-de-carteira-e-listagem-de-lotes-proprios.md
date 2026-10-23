# 0005. Gestão de Carteira e Rota Dedicada de Meus Lotes

* **Status:** Aceito
* **Contexto:** Os licitantes precisam gerenciar seus recursos financeiros para dar lances, enquanto os leiloeiros precisam acompanhar o rendimento dos leilões e gerenciar seus itens publicados com facilidade no painel de controle do front-end.
* **Decisão:** 
  1. Implementamos uma carteira financeira onde o **depósito simulado é exclusivo para licitantes**, enquanto a **consulta de saldo** (total, comprometido e disponível) é acessível tanto para licitantes quanto para leiloeiros.
  2. Adicionamos uma rota específica de busca de lotes próprios (`/lots/my-lots`) protegida por autenticação de leiloeiro.
* **Consequências:**
  * **Positivo:** Isola corretamente as responsabilidades financeiras (evitando que leiloeiros depositem fundos indevidamente) e otimiza a experiência de listagem no front-end, permitindo que o leiloeiro filtre rapidamente apenas os lotes de sua autoria sem percorrer toda a base geral.
  * **Negativo:** Aumenta ligeiramente a superfície de endpoints da API, exigindo maior rigor na organização e proteção das rotas por papéis.