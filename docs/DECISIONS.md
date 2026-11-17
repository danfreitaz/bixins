# Decisões e limites — versão 0.2

- Next.js 16/React/TypeScript, Canvas 2D, SVG autoral, PostgreSQL Neon e Neon Managed Better Auth. Node.js fixado em 24.x.
- Projeto Neon: `withered-flower-70367459`; ramificação de desenvolvimento: `br-cool-cherry-bb42m6yo`. Dados do protótipo e testes permanecem nessa ramificação; não foi promovida sobre a principal.
- A propriedade continua como agregado JSONB, com saldo/versão em colunas SQL e ações/extrato em tabelas próprias. Atualizações adquirem `FOR UPDATE`; saldo e inventário são modificados junto do registro idempotente.
- O schemaVersion 2 acrescenta nível, missões, XP, expedição, contagens, melhorias, rotação e histórico de transferências. Propriedades antigas são evoluídas sem recriar saldo, kit ou criaturas.
- Catálogos e balanceamento ficam em `src/game/config.ts`. O kit inicial continua com quatro itens e um ovo comum entre Musguito, Capinzim e Espinim; a ampliação para 16 objetos não aumenta o kit.
- Mundo inicial 20×14/6 Bixins. Terreninho 24×16/10 por C$ 1.800. A expansão acrescenta área e preserva coordenadas.
- Necessidades usam passos de 20 segundos, limite offline de 72 horas e proteção gentil. A grade e as árvores de navegação são reutilizadas por layout; as raízes são cópias imutáveis, impedindo ciclos causados por referências a criaturas em movimento.
- Capacidade e acessos são respeitados por objeto. O Banco do encontro só entra na busca social quando há companhia próxima. Relações e afinidade entre pares ainda não são implementadas.
- Charme tem teto 100 e retorno decrescente para repetições. Nove objetivos têm conclusão persistente e resgate único. XP vem dessas conquistas; a expansão de terreno determina o nível que libera Cerrado.
- A reserva recebe cota diária gratuita. Também há pacotes de 12 porções por C$ 10, até 240 porções. Os créditos são fictícios; não existe compra com dinheiro real.
- Ovos da loja são ofertas diárias estáveis por região desbloqueada. Preço = valor-base da raridade × 1,4. O primeiro ovo leva 60 segundos; os demais levam 90 minutos.
- Expedições: uma por vez, relógio do servidor, entropia criptográfica de servidor, resultado calculado no início e oculto do navegador até o resgate. Dois ovos pendentes no máximo; a viagem reserva uma vaga.
- Probabilidades por região ativa: 61% comum, 25% incomum, 10% raro e 4% recursos. Os 6% das faixas futuras épica/lendária foram redistribuídos para comum. Os sete destinos aparecem; somente três cobram e operam.
- Venda NPC só permite adultos/veteranos saudáveis, preserva o último Bixin e exige confirmação de nome/preço. O histórico guarda a instância transferida e os dados de origem. Não há mercado entre jogadores.
- Configurações de som/movimento são locais; progresso é guardado no Neon. Segredos não estão no Git nem no bundle.
- A prévia Vercel permanece protegida. A autorização anterior para publicar e usar contas fictícias foi mantida; não foram criados links compartilháveis para contornar essa proteção.
- Fases 6 e 7 continuam pendentes: relações/reprodução, genealogia funcional, ciclo ambiental e acabamento final do MVP.
