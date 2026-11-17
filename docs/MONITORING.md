# Operação e orçamento dos testes fechados

Execute `pnpm check:quotas` no ambiente de desenvolvimento. A rotina somente lê o banco e informa tamanho físico, quantidade de propriedades/ações/lançamentos, ações nas últimas 24 horas e tamanho dos snapshots. Não imprime usuários, credenciais ou dados dos personagens.

O orçamento local padrão é 500 MiB e pode ser configurado por `BIXINS_DB_BUDGET_MIB`. Não é uma afirmação da franquia atual do provedor. O script avisa e retorna código 2 quando o banco passa de 80% desse orçamento, um snapshot passa de 150 kB ou há mais de 20 mil ações em 24 horas. O aviso não bloqueia nem apaga progresso. Não há agendamento automático nesta entrega.

Leitura inicial de 17/11/2026 00:23 UTC (16/11 à noite na Bahia): banco com 8.667.136 bytes, 98 ações nas últimas 24 horas e maior snapshot de 6.371 bytes. A API Neon confirmou plano free_v3, 0,25 CU, compute_time_seconds 1.374 e transferência de 2.031.498 bytes no período informado pelo projeto. São contadores observados, não uma estimativa de cobrança. Os testes seguintes acrescentam registros fictícios; obtenha números atuais rodando novamente a checagem.

O painel Neon do projeto `withered-flower-70367459` é a autoridade sobre horas de compute, armazenamento, transferência e franquias. O painel Usage da equipe Vercel `danilo-freitas-souza` é a autoridade sobre funções, transferência, builds e limites. A consulta agregada de observabilidade pelo conector retornou HTTP 400; nenhum total Vercel foi inferido dessa tentativa. Não foram alterados plano, orçamento da conta ou configurações de cobrança.

Durante o piloto, conferir esses painéis e a checagem antes de ampliar o número de testadores. Caso surja aviso, reduzir sessões simultâneas, conferir polling/erros nos logs e usar economia de bateria; pausar a ampliação do piloto antes de esgotar a franquia. A aba oculta não sincroniza, falhas aplicam backoff, e o extrato grava apenas entradas novas. Não executar scripts de carga contra o ambiente publicado.

Os eventos cotidianos e marcos ficam limitados a 200 cada e o extrato recente do snapshot a 100; o extrato SQL e chaves de idempotência não são apagados automaticamente. Crescimento de histórico precisa ser acompanhado antes de expandir o piloto. Qualquer limpeza futura deve ter política explícita de retenção e backup, preservando deduplicação, economia e genealogia.

Se houver falha de publicação, manter a última prévia READY. O histórico de versões permite republicar o commit anterior. Os testes do Neon usam somente development; não restauram nem substituem a branch principal. Segredos permanecem em `.env.local` ignorado e nas variáveis criptografadas Vercel, nunca em logs, exportações da UI ou artefatos enviados.
