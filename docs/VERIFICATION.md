# Verificação da versão 0.1

Registro histórico das entregas; a versão atual está na seção **Versão 1.0 — Fases 6 e 7**, ao final.

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
- Build de produção local concluído com TypeScript e geração das rotas. Verificação final no Edge passou: imagens, desktop/mobile e API sem sessão (401), sem erros JavaScript. Prévia privada atualizada: **READY**, confirmado pela API da Vercel, ambiente staging, commit de código 6ff485c028dbba9621c18c25506499096b65c3b0. URL: https://bixins-7eifnqtd7-danilo-freitas-souza.vercel.app/ . Alias estável: https://bixins-danilo-freitas-souza.vercel.app/ . Nova origem registrada no Neon Auth. A proteção e o limite de verificação HTTP remota descritos acima permanecem.

## Versão 1.0 — Fases 6 e 7

- 68 testes de regras passaram: migração, encontros por rotas, urgência de cuidados, conflitos com brinquedo real, amizade, reprodução não instantânea, saúde/idade/afinidade/parentesco, vagas/recursos, cooldown individual, herança, chance aurora, linhagem, cancelamento/pausa, objetivos e marcos. Coberturas anteriores de economia, geometria e origem permanecem.
- Integração no Neon: três preparos concorrentes geraram uma intenção; sincronizações concorrentes geraram um ovo e um único débito de 12 porções; nascimentos concorrentes geraram um filhote; parentesco/genoma persistiram após transferência de progenitor. Isolamento entre proprietários e teto de 12 sincronizações/minuto passaram. Somente novos lançamentos do extrato foram gravados.
- Regressão econômica no Neon passou novamente: compra idempotente, carteira sem saldo negativo, ração única, objetivo/expansão únicos, coordenadas preservadas, melhorias, transferência, resgate e auditoria do extrato.
- E2E autenticado no build de produção passou: comprar/instalar ninho pelos controles normais, preparar casal sem ovo instantâneo, recarregar intenção, geração offline, único consumo, bloqueio por 24h, incubação regular com prazo de 5.400.000 ms e rejeição antecipada, nascimento, genoma e nomes dos pais na ficha. A segunda conta fictícia foi restaurada em finally.
- Limite desse E2E: idade dos adultos, intervalo offline e conclusão da incubação usam somente a fixture SQL isolada; 10 minutos de aconchego e 90 de incubação não foram aguardados integralmente em tempo real. Não há endpoint de aceleração/saldo na aplicação.
- Build final de produção e TypeScript passaram, incluindo a correção de iluminação. A checagem final no Edge passou novamente com os sete grupos de verificações visuais/HTTP.
- Verificação visual no build de produção: 44 imagens carregadas, dia/noite/chuva, larguras 360/390/768, 404 acolhedor e nenhum erro JavaScript. Retratos/linhagem e mobile revisados por capturas. Foi identificado e corrigido um retângulo de iluminação noturna em telas largas.
- Economia de bateria e redução de movimentos persistiram após recarregar; Escape fechou o diálogo. API sem sessão devolveu 401 com no-store; pedidos inválidos/grandes deram 400/413, IDs estrangeiros foram recusados e cabeçalhos de segurança foram conferidos.
- Simulação atualizada: 100 colônias × 14 dias, cerca de 205 segundos, saldo mínimo C$ 2.688 e saúde mínima 35, sem perda irreversível. Perfis e limites estão em BALANCE.md; reprodução é coberta pelos cenários dedicados.
- Checagem inicial de cotas sem avisos e plano Neon confirmado por API; contadores e limite da consulta Vercel estão em MONITORING.md. Sem agendamento, plano pago ou alteração de cobrança.
- Revisão automática interrompeu uma tentativa de build por limite de uso (não por julgar a ação insegura). Após o usuário pedir continuidade, a mesma ação foi retomada pela revisão normal, sem contornar a aprovação.
- Publicação privada 1.0: **READY**, confirmada pela API da Vercel. Ambiente staging, commit de código 6f907733c005acc78630b0dc9d2586ed6e751cdc. URL: https://bixins-bx030yvx3-danilo-freitas-souza.vercel.app/ . Alias estável: https://bixins-danilo-freitas-souza.vercel.app/ . Origem nova registrada no Neon Auth. Servidor local temporário encerrado após os testes. A proteção e o limite de verificação HTTP remota descritos nas entregas anteriores permanecem.
