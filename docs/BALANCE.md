# Balanceamento inicial — versão 1.0

Foram simuladas 100 colônias, 20 por perfil, durante 14 dias virtuais, sem banco, contas ou APIs. Resultado: nenhum saldo negativo e nenhuma perda irreversível. Saúde mínima 35. Execução em 205 segundos. Artefatos locais ignorados: test-results/balance.json e balance.csv.

| Perfil | Saldo médio C$ | Saúde média | Bixins | Espécies |
| --- | ---: | ---: | ---: | ---: |
| casual | 6889 | 87 | 1.0 | 1.0 |
| cuidadoso | 7149 | 100 | 1.0 | 1.0 |
| colecionador | 8906 | 35 | 10.0 | 8.0 |
| ausente | 2688 | 35 | 1.0 | 1.0 |
| explorador | 12900 | 36 | 10.0 | 2.3 |

Os perfis são heurísticos, não previsões de comportamento. Casuais visitam diariamente; cuidadosos, a cada hora; colecionadores/exploradores, a cada 12 horas; ausentes, a cada quatro dias. As colônias começam com um Bixin e o kit. Os perfis que chegam a dez Bixins não ampliam equipamentos de cuidados nem usam a compra de ração: a queda do bem-estar mostra o custo de capacidade e abastecimento. Nenhum perfil compra ninho; reprodução e consumo único de ração são verificados em cenários específicos nas regras, no Neon e no E2E.

A simulação verifica limites, estabilidade e economia; não substitui playtests de diversão/progressão. A proteção gentil de ausência superior a 72 horas tem teste separado.
