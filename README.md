# BIXINS · versão 1.0

Jogo web de criaturas fantásticas brasileiras com Next.js/TypeScript, Canvas 2D, SVG autoral, PostgreSQL Neon e autenticação gerenciada. As fases 6 e 7 do [GDD](BIXINS_GDD_Codex.md) completam o MVP 1.0.

## Jogar

O [BIXINS está aberto ao público](https://bixins.vercel.app/), sem exigir conta Vercel. Cada jogador cria uma conta BIXINS para guardar seu refúgio. A publicação atual e os resultados ficam em [verificações](docs/VERIFICATION.md).

- `/`: refúgio persistente por conta. Começa vazio com C$ 600, um ovo e quatro objetos na caixa.
- `/arte`: nove espécies, ovos, estados de descanso e 17 objetos ilustrados.
- `/demonstracao`: arte, movimento, expansão e seletor de ambiente sem salvar progresso.

## O que funciona

- Construir, mover, girar, guardar e melhorar objetos com dimensões, acesso, capacidade e efeitos reais. Expansão de 20×14/6 Bixins para 24×16/10 por C$ 1.800.
- Necessidades, cuidado gentil, recursos, renda, charme, extrato e 11 objetivos com créditos/XP únicos.
- Nove espécies, Bixinpédia, três destinos ativos, uma expedição por vez, loja de ovos e transferência NPC responsável com confirmação/histórico.
- Encontros autônomos, traços individuais, afinidade, amizades e disputas leves, sem dano físico.
- Ninho aconchegante por C$ 550. Convite a dois adultos compatíveis, da mesma espécie, sem parentesco próximo, saudáveis e com laço ≥ 30. Depois de dez minutos juntos, são usadas 12 porções e chega um ovo. Intervalo individual de 24 horas, capacidade e limite de ovos são revalidados no servidor.
- Genética 45/45/10, variante aurora de 0,5%, traços herdados, genealogia e relações na ficha. Transferências preservam família e descoberta.
- Incubação inicial de 60 segundos e regular de 90 minutos. Até dois ovos pendentes; viagens reservam uma vaga.
- Ciclo visual de quatro horas e chuva cosmética. Som opcional, redução de movimentos, economia de bateria, câmera e navegação por teclado/celular.

Quatro destinos futuros, demais espécies, híbridos, eventos econômicos e mercado entre jogadores permanecem fora do MVP.

## Rodar localmente

Requer Node.js 24.x e pnpm 11+.

```sh
pnpm install
```

Copie `.env.example` para `.env.local` e configure `DATABASE_URL`, `NEON_AUTH_BASE_URL` e `NEON_AUTH_COOKIE_SECRET` (segredo aleatório de pelo menos 32 caracteres). Nesta máquina o arquivo já está configurado e fora do Git.

```sh
pnpm db:migrate
pnpm dev
```

Abra `http://127.0.0.1:3000` e registre a origem exata no Neon Auth. Para produção local: `pnpm build` e `pnpm start`. Snapshots anteriores evoluem para schemaVersion 3 sem recriar saldo, kit ou criaturas; a versão 1.0 não acrescenta DDL.

## Testar e acompanhar

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm balance
pnpm test:integration
pnpm test:colony
pnpm check:quotas
```

`balance` simula 100 colônias por 14 dias virtuais, sem banco. Testes de integração gravam propriedades fictícias isoladas em development: execute apenas no ambiente autorizado. `check:quotas` faz somente leituras e emite avisos de orçamento, sem agendamento automático.

Os scripts de interface usam Playwright/Edge. Configure `BIXINS_PLAYWRIGHT_MODULE` caso o módulo não esteja disponível normalmente. `colony-e2e.cjs` reutiliza a segunda conta fictícia já criada, testa reprodução/linhagem/mobile/preferências e restaura seu estado anterior. Credenciais, backups e capturas ficam em `test-results/`, ignorado pelo Git.

Para testar prazos de reprodução/incubação com eficiência, a fixture isolada avança sua janela offline e o prazo de seu ovo no SQL. O jogo não contém endpoint para acelerar tempo ou conceder saldo. A espera integral de 10/90 minutos não foi repetida no E2E desta entrega; os limites e recusas antecipadas foram conferidos. A expedição de oito minutos foi aguardada em tempo real na versão anterior.

## Infraestrutura

Neon usa a branch development e Managed Better Auth. Toda mutação usa proprietário da sessão, horário do PostgreSQL, bloqueio transacional e idempotência. Seeds de ninho/expedição ficam ocultas enquanto futuras. A Vercel recebe código/arte e variáveis criptografadas. O fluxo completo foi conferido localmente com Neon real; após a abertura autorizada, a página pública respondeu HTTP 200 em uma requisição anônima, sem login Vercel.

Repositório: [danfreitaz/bixins](https://github.com/danfreitaz/bixins). Segredos, credenciais de testes e artefatos locais não são enviados ao GitHub. O envio ao GitHub, por si só, não configura publicação automática na Vercel. Veja [fases 6 e 7](docs/PHASES_6_7.md), [decisões](docs/DECISIONS.md), [arte](docs/ART_BIBLE.md), [operação/cotas](docs/MONITORING.md) e [verificações](docs/VERIFICATION.md).
