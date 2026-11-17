# Balanceamento inicial — versão 0.2

Foram simuladas 100 colônias, 20 por perfil, durante 14 dias virtuais, sem banco, contas ou APIs. Arquivos locais: test-results/balance.json e balance.csv. Execução determinística em aproximadamente 182 segundos.

| Perfil       | Saldo médio C$ | Saúde média | Bixins | Espécies | Dias até expansão |
| ------------ | -------------: | ----------: | -----: | -------: | ----------------: |
| casual       |           7024 |         100 |    1.0 |      1.0 |               3.0 |
| cuidadoso    |           7147 |         100 |    1.0 |      1.0 |               2.3 |
| colecionador |           8451 |          35 |   10.0 |      8.0 |               6.5 |
| ausente      |           2688 |          35 |    1.0 |      1.0 |       não ampliou |
| explorador   |          12573 |          36 |   10.0 |      2.3 |               2.0 |

Não houve saldo negativo nem morte/perda irreversível. O piso de saúde observado foi 35. A proteção após ausência superior a 72 horas também é coberta pelo teste unitário de sete dias.

Os perfis são heurísticos, não previsões de comportamento de usuários. Casuais visitam diariamente; cuidadosos, a cada hora; colecionadores e exploradores, a cada 12 horas; ausentes, a cada quatro dias. Todos começam com um Bixin e o kit. Colecionadores/exploradores aumentam a população sem comprar mais equipamentos de cuidado: o resultado evidencia o custo de capacidade e abastecimento. Eles não usam a nova opção de comprar ração.

A versão inclui cota gratuita e reposição de ração por créditos; esse fluxo é testado separadamente nas regras, na interface e na concorrência transacional. A simulação é uma verificação inicial, não substitui playtests de diversão e progressão.
