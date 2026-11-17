# Fases 6 e 7 — MVP 1.0 para testes fechados

## Colônia autônoma

Cada Bixin preserva seus traços, genoma, identificação e compatibilidade A/B. Novos indivíduos recebem um temperamento dominante da espécie e dois traços distintos, com entropia originada no servidor. O papel reprodutivo não determina identidade ou valor. Genomas antigos recebem valores estáveis na migração do snapshot para schemaVersion 3; saldo, posições e indivíduos existentes não são recriados.

As decisões ponderam necessidades, traços, distância, capacidade e rotas. Necessidades urgentes vencem convites sociais. Encontros usam caminhos e uma companhia disponível; só interações efetivas podem alterar afinidade. O intervalo mínimo entre interações do mesmo par é de cinco minutos simulados. Afinidade varia entre −100 e +100; laços de 30 geram um marco de amizade. Disputas pela bolinha exigem brinquedo instalado perto dos dois, afetam apenas social/lazer e não causam dano à saúde. Filhotes dão preferência à companhia dos progenitores presentes.

## Ninho e família

- Ninho aconchegante ilustrado: 2×2, C$ 550. É o 17º objeto, acrescentado ao catálogo anterior para atender à reprodução prevista no GDD.
- O jogador instala o ninho e prepara um convite na aba Colônia, escolhendo o casal. O preparo não gera ovo instantaneamente e pode ser cancelado sem consumo.
- São exigidos dois adultos da mesma espécie, A + B, sem vínculo de pais/filhos ou irmãos. Saúde mínima 70, todas as necessidades ≥ 50, afinidade ≥ 30 e 12 porções disponíveis.
- Os Bixins precisam chegar por caminhos válidos e passar dez minutos juntos no acesso do ninho. Se condições falham, o aconchego pausa e recomeça quando puder. Mover reinicia o aconchego; guardar o ninho ou transferir um progenitor cancela o convite.
- Limite de dois ovos pendentes, com uma vaga reservada para expedições. População + ovos + reserva da viagem deve permitir acolher o novo indivíduo. A conclusão revalida essas condições dentro da transação.
- Cada progenitor descansa 24 horas reais entre ovos, inclusive ao trocar de parceiro. Gerar o ovo consome as 12 porções uma única vez. Ele segue a incubação regular de 90 minutos, sem vantagem de venda imediata.
- Cada locus herda A em 45%, B em 45%, ou um valor válido em 10%. Traços também são herdados, sem duplicatas; vieses são limitados. Variante aurora tem chance-base de 0,5%. As probabilidades ficam centralizadas em configuração.
- Genoma, traços, variante e progenitores passam do ovo ao filhote. A ficha mostra padrões/porte, relações, pais e descendentes. Progenitores transferidos continuam identificados pelo histórico guardado.
- Onze objetivos: os nove anteriores, primeira amizade e primeiro ovo de família, com recompensa e XP únicos. Diário recente tem 200 entradas e marcos têm retenção separada, também limitada a 200; genealogia permanece nos indivíduos e transferências.

## Acabamento

O terreno acompanha um ciclo de quatro horas, com manhã/tarde/noite, lua, iluminação suave e chuva leve cosmética. O rótulo, o ciclo e a idade no cliente usam o horário sincronizado do servidor. A demonstração tem seletor visual de ambiente, sem alterar o jogo persistente.

Há nove espécies, animações essenciais, retratos individuais com paleta/padrão/tufo, porte por idade/genética e brilhos aurora. Som é opcional, movimento reduzido respeita a preferência do sistema e economia de bateria limita o desenho a 12 fps, reduz resolução/partículas e sincroniza a cada dois minutos. Desenho e sincronização param em aba oculta. Preferências são locais e persistem após reload.

Seletores têm nomes acessíveis, formulários funcionam pelo teclado e diálogos incluem os seletores na contenção de foco, fecham com Escape e restauram o foco. Telas de erro/404 têm retorno claro; falha de gravação não aparece como ação confirmada. Desktop e smartphone foram verificados em navegador real.

## Segurança e publicação

Proprietário vem da sessão, hora vem do PostgreSQL, mutações usam bloqueio por propriedade e chave idempotente. O cliente não define saldo, saúde, afinidade, recompensas nem genomas. Sementes de viagem e ninho são ocultas enquanto futuras. Corpo JSON é limitado a 4 kB, origem é validada e API não usa cache. Limites por conta: 45 ações e 12 sincronizações por minuto. Erros de infraestrutura não expõem conexão ou SQL. Cabeçalhos restringem objetos embutidos, enquadramento externo e permissões desnecessárias.

As sincronizações inserem somente lançamentos novos no extrato SQL. Simulação permanece limitada a 72 horas e nunca mata por ausência. A checagem de orçamento e o procedimento operacional estão em MONITORING.md. Não foram adicionados serviços pagos ou rotinas automáticas externas.

O resultado é a versão 1.0 para testes fechados, na mesma prévia Vercel protegida e no Neon development. A publicação não remove a proteção nem promove os dados sobre a branch principal. O conector GitHub disponível ainda não cria o repositório remoto; os commits ficam locais. Resultados e limites de validação estão em VERIFICATION.md.

## O que os testes de tempo significam

Regras puras usam um relógio controlado. No E2E, a segunda conta fictícia autorizada recebe uma fixture isolada de adultos; após o preparo pela interface, somente sua janela offline é avançada no SQL. A incubação é conferida como 90 minutos e rejeita nascimento antecipado, então somente a fixture recebe um prazo passado para conferir o nascimento e a linhagem. Esses prazos não foram aguardados integralmente em tempo real nesta entrega. Não existe endpoint de aceleração/saldo no produto. O estado anterior da conta é restaurado em finally, mesmo se o teste falhar.

Pós-MVP: demais espécies/regiões, híbridos, parentesco além de pais/filhos/irmãos, eventos econômicos, mercado entre jogadores, fotos e visitas. Nenhum desses recursos é apresentado como disponível.
