# BIXINS

Jogo web de criaturas fantásticas brasileiras. Primeira entrega incremental do [documento de projeto](BIXINS_GDD_Codex.md), com Next.js/TypeScript, Canvas 2D, arte SVG autoral e PostgreSQL Neon.

## Rodar localmente

Requer Node.js 24+ e pnpm 11+.

```sh
pnpm install
```

Copie `.env.example` para `.env.local` e configure `DATABASE_URL`, `NEON_AUTH_BASE_URL` e `NEON_AUTH_COOKIE_SECRET` (segredo aleatório com pelo menos 32 caracteres). Na máquina em que este projeto foi criado, o arquivo local já foi configurado e está ignorado pelo Git.

```sh
pnpm db:migrate
pnpm dev
```

Abra `http://127.0.0.1:3000`. Para executar uma compilação de produção, use `pnpm build` e `pnpm start`.

- `/`: cadastro/login e propriedade da conta. O terreno começa vazio, com C$ 600, um ovo e quatro estruturas na caixa.
- `/demonstracao`: demonstração de arte e movimento com três Bixins; não salva progresso e não usa o banco.
- `/arte`: prancha das três espécies, ovos e quatro estruturas.

## Primeira entrega

- Terreno cercado 20×14 em Canvas, árvores, flores, caminhos, sombras, câmera com arraste e zoom.
- Musguito, Capinzim e Espinim, com desenhos e ovos distintos; fontes abertas incluídas localmente.
- Kit para posicionar, mover e guardar; validação de ocupação e caminhos; compra dos quatro objetos básicos.
- Primeiro ovo com 60 segundos de incubação, nascimento, nome, ficha e cuidados.
- Motor determinístico de necessidades, busca por recursos, ração e água, descanso e brincadeira, progresso offline com cuidado gentil.
- Sessão gerenciada pelo Neon Auth, estado salvo por conta, lock transacional, ações idempotentes e extrato de C$.
- Diário de eventos, coleção introdutória, sons opcionais, movimento reduzido e exportação em JSON.

Exploração, reprodução, nove espécies, relações sociais, venda de adultos, expansões e demais itens permanecem no roteiro das próximas fases. Consulte [plano](docs/PLAN.md) e [decisões](docs/DECISIONS.md).

## Verificação

```sh
pnpm typecheck
pnpm test
pnpm build
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/db-check.ts
```

O script `scripts/browser-check.cjs` usa Playwright e Edge para verificações visuais sem criar contas. Instale Playwright no ambiente de testes ou defina `BIXINS_PLAYWRIGHT_MODULE` para o módulo instalado. `BASE_URL` define o endereço; o padrão do script é `http://127.0.0.1:3001`.

`scripts/e2e.cjs` foi preparado para testar duas contas fictícias, compras concorrentes, isolamento de usuários, nascimento real e restauração da sessão. Ele cria registros no Neon e só deve ser executado num ambiente de testes autorizado. O fluxo foi executado e passou após autorização explícita para usar contas fictícias no ambiente de desenvolvimento. Os arquivos de sessão e credenciais de teste permanecem fora do Git.

## Infraestrutura

O projeto Neon `bixins` e sua ramificação `development` foram criados. A migração e a autenticação gerenciada foram preparadas nessa ramificação. Segredos não estão no repositório nem no bundle do navegador.

O projeto Vercel `bixins` também foi criado, com proteção de acesso. As variáveis criptografadas foram configuradas após autorização explícita do criador. A prévia privada foi publicada: https://bixins-f3hh0zzpe-danilo-freitas-souza.vercel.app/ . A Vercel confirmou o estado READY; o acesso requer sua conta Vercel. A conexão a um repositório GitHub também não foi concluída; o código está versionado localmente.

Consulte [verificações](docs/VERIFICATION.md) para o estado real da entrega. Esta é a versão 0.1, não o MVP 1.0 completo.
