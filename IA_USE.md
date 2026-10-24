**DECLARACAO_IA.md**

# Declaração de Uso de Inteligência Artificial

Em conformidade com as diretrizes de envio do desafio, este documento detalha como ferramentas de Inteligência Artificial foram utilizadas durante o desenvolvimento desta aplicação.

* **Consultoria e Tomada de Decisão:** A IA foi utilizada como uma parceira de *brainstorming* para validar escolhas arquiteturais. Por exemplo, a decisão de manter uma única tabela de `User` com um *enum* de `Role` (em vez de tabelas separadas para Leiloeiro e Licitante) e a escolha de fazer o *downgrade* para o Prisma 7 visando maior estabilidade no ambiente de desenvolvimento foram tomadas pelo desenvolvedor e validadas com a ajuda da IA.
* **Aceleração de Escrita de Código:** Ferramentas de IA ajudaram a gerar *boilerplates* iniciais, como a estrutura base do `index.ts`, e códigos completos também, como as configurações do Docker Compose, a base do esquema do Prisma. Também foi utilizada para aceleração de escrita de testes, além de outros trechos de código.
* **Revisão e Consciência Humana:** Nenhuma linha de código foi aceita cegamente. Todo o código gerado foi lido, compreendido e ativamente modificado para se adequar às regras de negócio estritas do desafio. Lógicas críticas, como as travas de middlewares (garantindo que leiloeiros não deem lances e licitantes não criem lotes) e os testes de integração com Vitest, foram rigorosamente revisadas e adaptadas manualmente para garantir a robustez exigida na avaliação.
* **Onde a IA não se meteu:** Toda a decisão final, arquitetura, revisão de códigos, o que entra e o que sai, revisão de documentação, bem como a revisão dos testes, foram feitas por mim João Lucas. A partir disso modifiquei as partes necessárias e adicionei as que faltavam. Também foquei em manter a padronização do código.

## Ferramentas utilizadas
Foram utilizadas ferramentas basicamente de consultoria como Gemini plus e Gemini Notebook para parceira de *brainstorming* e geração de *boilerplates* e códigos utilizados durante o desenvolvimento do projeto.
