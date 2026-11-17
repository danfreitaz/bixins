# Entrega conjunta — Fases 4 e 5 (versão 0.2)

## Entregue

- 16 objetos ilustrados, com áreas de 1×1 a 3×3, pontos de acesso, capacidade, estoque, efeitos, rotação para áreas retangulares e três níveis de melhoria.
- Caminhos em grade que respeitam todas as células ocupadas. Mover/guardar interrompe rotas; o cache é invalidado quando o layout muda. As árvores de caminhos copiam o ponto inicial para não guardar referências mutáveis a Bixins.
- Expansão transacional de Quintal (20×14/6 Bixins) para Terreninho (24×16/10), por C$ 1.800, preservando coordenadas.
- Charme com retorno decrescente e teto 100, renda com a fórmula do GDD e nove objetivos com créditos/XP. Recompensas só podem ser recolhidas uma vez.
- Mapa de sete regiões. Mata Atlântica e Caatinga custam C$ 90/8 minutos. Cerrado custa C$ 160/15 minutos e exige Terreninho. Os quatro destinos futuros não aceitam cobranças.
- Uma viagem por vez; prazo e custo verificados no servidor. Sorteio usa entropia criptográfica do servidor, não a chave enviada pelo navegador. Resultado e seed são ocultados dos snapshots enquanto a viagem está em curso.
- Catálogo regional: nove espécies e três raridades, com silhuetas próprias, ovos, retratos e estados visuais. Bixinpédia filtrável por região, descoberta e contagem de nascimentos.
- Loja de ovos com duas ofertas diárias por região desbloqueada, estáveis na mesma data UTC. Preços derivados da raridade; compra gera um ovo, não um adulto.
- Limite global de dois ovos pendentes. Uma expedição reserva um lugar, impedindo que a loja ocupe a vaga antes do retorno.
- Transferência NPC de adultos/veteranos saudáveis, com confirmação do nome e do preço. O último Bixin não pode sair; histórico, identidade e descoberta permanecem guardados.

## Compatibilidade e escolhas

Snapshots 0.1 recebem campos novos dentro da transação, sem recriar propriedades, kit, saldo ou criaturas. O formato passa a schemaVersion 2; o agregado JSONB continua bloqueado por proprietário e o extrato continua em SQL. Não há nova migração DDL nesta entrega.

A tabela de exploração tem 61% comum, 25% incomum, 10% raro e 4% recursos. Os 6% das faixas épica/lendária do catálogo futuro foram explicitamente redistribuídos para comum. A soma é 100%; o sorteio só retorna espécies da região ativa.

Incubação: o primeiro ovo continua com 60 segundos; todos os demais levam 90 minutos reais. Testes de regras avançam um relógio fornecido à função pura; o servidor de produção não possui parâmetro de aceleração. A viagem real de oito minutos foi aguardada e resgatada no teste de interface.

O banco recebeu apenas dados fictícios isolados nos testes transacionais. Nenhum endpoint de concessão de saldo ou alteração do relógio foi adicionado ao jogo.

## Fora desta entrega

Reprodução, genealogia funcional, amizades e relações avançadas pertencem à Fase 6. Ciclo ambiental, acabamento adicional de animações e revisão final de lançamento pertencem à Fase 7. Mercado entre jogadores continua posterior ao MVP.
