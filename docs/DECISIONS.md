# Decisões e limites da entrega 0.1

- Stack: Next.js 16, React, TypeScript estrito, PostgreSQL Neon e Neon Managed Better Auth. Implementação local no diretório indicado pelo criador; destino de publicação solicitado: Vercel.
- Projeto Neon: `withered-flower-70367459`. Ramificação de desenvolvimento: `br-cool-cherry-bb42m6yo`; a ramificação principal permanece sem os dados do protótipo. Autenticação foi habilitada na ramificação de desenvolvimento.
- A vertical slice usa três espécies comuns autorais. A espécie inicial é escolhida no servidor com seed persistida. Sem geração por IA durante o jogo.
- Primeiro ovo: 60 segundos; kit de quatro objetos guardados; C$ 600. Não há criatura demonstrativa misturada aos dados do jogador.
- O agregado de uma propriedade fica em JSONB, bloqueado com `FOR UPDATE`. Colunas de saldo/versão, ações idempotentes e extrato financeiro ficam em tabelas SQL próprias. Modelo tipado Drizzle acompanha a migração SQL. A normalização das entidades do catálogo completo fica para a expansão do MVP.
- Cada requisição autenticada acessa somente `owner_id` da sessão. Identificadores de dono, saldo, tempo e recompensas vindos do cliente são ignorados. Origem é conferida nas mutações. As compras e o registro de ações ocorrem na mesma transação.
- Passos de simulação de 20 segundos preservam o resíduo entre sincronizações. Simulação retroativa limitada a 72 horas; saúde mínima 35, e cuidado gentil depois do limite. Renda retroativa limitada a 24 horas. A movimentação visual é interpolada no cliente; os efeitos de recursos são confirmados no servidor.
- Configuração de som e movimento é local. Dados de jogo não são gravados em localStorage.
- Exploração, reprodução, relações entre pares, outras seis espécies, comércio de ovos/venda, expansões, missões com recompensas, exclusão de conta e ciclo ambiental pertencem às fases posteriores. A interface de exploração informa explicitamente que não está disponível. A coleção atual permite consultar três espécies, reveladas após nascimento.
- O diário mostra eventos reais do motor; a lista recente é limitada a 200. O extrato tem tabela imutável própria e 100 entradas no snapshot.
- O protótipo deve continuar privado durante a validação. Cadastro público definitivo depende do polimento, revisão de quotas, recuperação de conta e revisão de privacidade descritos no GDD.
