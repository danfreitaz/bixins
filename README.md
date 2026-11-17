# BIXINS · versão 0.2

Jogo web de criaturas fantásticas brasileiras, implementado com Next.js/TypeScript, Canvas 2D, arte SVG autoral e PostgreSQL Neon. Esta entrega reúne as Fases 4 e 5 do [GDD](BIXINS_GDD_Codex.md), sobre a primeira versão jogável já existente.

## Jogar e revisar

A prévia continua privada na Vercel. O endereço publicado mais recente fica em [verificações](docs/VERIFICATION.md). O acesso exige sua conta Vercel e, dentro do jogo, uma conta BIXINS.

- `/`: refúgio persistente da conta; começa vazio, com C$ 600, um ovo e os quatro objetos básicos na caixa.
- `/arte`: prancha das nove espécies, ovos e 16 objetos.
- `/demonstracao`: arte e movimento sem salvar progresso; permite alternar Quintal/Terreninho.

## O que funciona

- Construir, mover, girar objetos retangulares, guardar e melhorar estruturas. Cada objeto tem dimensões, acesso, capacidade e efeitos reais.
- Expandir de 20×14/6 Bixins para 24×16/10 por C$ 1.800, preservando coordenadas.
- Renda por visitação, charme limitado, extrato e nove objetivos com recompensas únicas em C$/XP.
- Mapa com sete destinos, três operacionais: Mata Atlântica, Caatinga e Cerrado. Uma expedição por vez, custo e prazo no servidor, resultado determinístico por viagem e resgate único.
- Nove espécies originais, três raridades e Bixinpédia por região.
- Loja de ovos com ofertas diárias e preço por raridade; incubação inicial de 60 segundos e regular de 90 minutos.
- Transferência responsável de adultos saudáveis para NPC, com confirmação, cotação e histórico. O último Bixin permanece no refúgio.
- Necessidades, recursos, cuidados, simulação offline gentil, diário, câmera, sons opcionais e redução de movimentos.

Há um limite de dois ovos pendentes. Expedições reservam uma vaga. Os quatro destinos futuros não aceitam expedições nem pagamentos. Reprodução, amizades avançadas e demais sistemas da Fase 6 permanecem no roteiro.

## Rodar localmente

Requer Node.js 24.x e pnpm 11+.

```sh
pnpm install
```

Copie `.env.example` para `.env.local` e configure `DATABASE_URL`, `NEON_AUTH_BASE_URL` e `NEON_AUTH_COOKIE_SECRET` (segredo aleatório de pelo menos 32 caracteres). Na máquina de desenvolvimento, o arquivo já foi configurado e está fora do Git.

```sh
pnpm db:migrate
pnpm dev
```

Abra `http://127.0.0.1:3000`. Registre a origem exata no Neon Auth, incluindo IP/hostname e porta. Para produção local: `pnpm build` e `pnpm start`.

Snapshots da versão 0.1 são evoluídos dentro da transação, sem recriar saldo, kit ou criaturas. A versão 0.2 não exige nova migração DDL.

## Testar

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm balance
pnpm test:integration
```

- Testes unitários cobrem regras, geometria, cache de caminhos, tempo, comércio, probabilidades e limites.
- `balance` simula 100 colônias por 14 dias virtuais e exporta JSON/CSV em `test-results/`. Não acessa contas, banco ou APIs.
- `test:integration` grava propriedades fictícias isoladas no Neon para verificar concorrência, extrato, recompensas, expansão, vendas e resgates. Execute apenas no ambiente de testes autorizado.
- Os scripts `phase-ui-check.cjs`, `start-journey-check.cjs` e `finish-journey-check.cjs` usam Playwright/Edge e as contas fictícias de testes. As credenciais ficam em `test-results/accounts.json`, ignorado pelo Git.
- `BIXINS_PLAYWRIGHT_MODULE` aponta para um módulo Playwright instalado; os scripts locais usam a porta 3001. A criação das contas e as gravações no ambiente de desenvolvimento foram autorizadas pelo criador.

A viagem real de oito minutos foi aguardada e resgatada. A incubação regular teve o prazo de 90 minutos e o bloqueio antecipado conferidos; o nascimento após esse prazo também é coberto pelas funções puras com relógio controlado de teste. Não há endpoint de aceleração ou de concessão de saldo no jogo.

## Infraestrutura e limites

O projeto Neon usa a ramificação `development`, com Neon Managed Better Auth. Toda ação persistente usa o proprietário da sessão, relógio confiável, transação e chave idempotente. O resultado da expedição fica oculto até o resgate.

A Vercel recebe apenas arquivos de código/arte e variáveis criptografadas. A proteção de acesso é preservada; a revisão automática não autorizou criar links compartilháveis temporários para checagens HTTP.

O código está em commits locais. A conexão a um repositório remoto GitHub ainda não foi concluída, pois o conector disponível não cria novos repositórios.

Veja [Fases 4 e 5](docs/PHASES_4_5.md), [decisões](docs/DECISIONS.md), [arte](docs/ART_BIBLE.md) e [verificações](docs/VERIFICATION.md). A versão 0.2 ainda não inclui as Fases 6 e 7 do MVP.
