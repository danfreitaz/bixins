# Verificação da versão 0.1

- TypeScript estrito: passou.
- Testes unitários: 15 passaram. Incluem colisão, entrada livre, BFS, prioridade de água, incubação, nascimento único, consumo/cooldown de cuidados, limites de necessidades, cuidado gentil, determinismo, renda sem repetição e validação de origem pública/externa.
- Build de produção Next.js: passou.
- Migração Neon: aplicada na ramificação de desenvolvimento.
- Banco (somente leitura): conexão, relógio, três tabelas e 28 constraints confirmados.
- Tela inicial: aberta no Edge headless, título e conteúdo corretos, sem erros de JavaScript; captura em `test-results/welcome.png` (artefato local ignorado pelo Git).
- Rotas visuais de demonstração e prancha: abertas no Edge; ilustrações carregadas, Canvas visível no desktop e em 390×844, sem erros JavaScript ou rolagem horizontal. Capturas em `test-results/demo-desktop.png`, `demo-mobile.png` e `art-sheet.png`.
- Leitura da API sem sessão: devolveu HTTP 401, como esperado. Alternância entre login/cadastro foi conferida sem enviar o formulário.
- Fluxo autenticado com Neon: passou após autorização explícita. Cadastro, terreno inicialmente vazio, instalação do kit, incubação de 60 segundos, bloqueio de nascimento antecipado, nascimento, nome, cuidados, mobile, recarregar e sair/entrar foram verificados no Edge.
- Concorrência: duas requisições com a mesma chave compraram um único objeto. Oito compras simultâneas de C$ 80, com saldo C$ 600, produziram sete compras e uma recusa, com saldo final C$ 40. Uma conta não conseguiu posicionar um objeto pertencente à outra.
- Correções encontradas no teste real: cadastrar as origens locais no Neon Auth; validar o host público em vez do hostname interno do Next; fazer as leituras autenticadas do teste pelo contexto do navegador, que mantém os cookies seguros.
- Contas fictícias e credenciais do teste ficam somente no ambiente de desenvolvimento; arquivos locais em `test-results/` estão ignorados pelo Git. Os testes são retomáveis para reutilizar as contas já criadas.
- Deploy privado: **READY**, confirmado pela API e pelos logs da Vercel. URL: https://bixins-f3hh0zzpe-danilo-freitas-souza.vercel.app/ . Ambiente `staging`, commit de código `bf7ffad35490d998ea481453724504dc7e820b27`; build remoto concluído em 28 segundos. Variáveis criptografadas configuradas e domínios reconhecidos pelo Neon Auth.
- Limite da verificação remota: a revisão automática bloqueou `web_fetch_vercel_url`, pois o conector criaria/reutilizaria um link compartilhável temporário. Nenhum link desse tipo foi criado por esta tentativa. A proteção da prévia foi preservada; o build publicado foi confirmado, mas o fluxo HTTP autenticado na URL remota não foi repetido.
- GitHub: sem repositório remoto conectado; há commits locais.

A entrega é uma primeira fatia jogável, não o MVP 1.0 completo. Os sistemas futuros permanecem documentados no roteiro.

## Versão 0.2 — Fases 4 e 5

- 38 testes unitários passaram, incluindo os casos novos de construções maiores, rotação, capacidade, cache de caminhos, melhorias, objetivos únicos, expansão, probabilidades, ovos, expedições e vendas.
- Testes transacionais no Neon passaram com propriedades fictícias isoladas: compra idempotente, carteira concorrente sem saldo negativo, ração com débito/entrega única, missão única, expansão única, coordenadas preservadas, melhoria, venda com histórico e resgate único de expedição.
- Interface desktop/mobile: objetivos, categorias da loja, compra de objeto, ração, colocação, rotação, melhoria, nove espécies da coleção, navegação móvel, 43 imagens na prancha e prévia de terreno expandido. Sem erros JavaScript.
- Expedição real de Caatinga: oito minutos aguardados, ovo recebido, segundo resgate bloqueado e incubação regular com prazo exato de 90 minutos e rejeição de nascimento antecipado. O prazo completo de 90 minutos não foi aguardado; seu limite é coberto pelas funções puras.
- 100 colônias por 14 dias virtuais: sem saldo negativo ou perda irreversível; ver docs/BALANCE.md.
- Build de produção local concluído com TypeScript e geração das rotas. Verificação final no Edge passou: imagens, desktop/mobile e API sem sessão (401), sem erros JavaScript. Atualização da prévia privada: em andamento.
