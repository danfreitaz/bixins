# Bíblia visual — coleção 1.0

Arte SVG autoral em src/game/art.ts e src/game/art-expansion.ts, reutilizada no Canvas e nos painéis pelo manifesto. As fontes Fredoka e Nunito são locais e têm suas licenças em public/fonts.

| Espécie   | Silhueta e paleta                                             |
| --------- | ------------------------------------------------------------- |
| Musguito  | Corpo baixo com tufos arredondados e broto verde-oliva.       |
| Capinzim  | Oval dourado, orelhas laterais e franja de capim pontuda.     |
| Espinim   | Pompom sálvia com espinhos de feltro e flor lilás.            |
| Pingoçu   | Gota azul com topo curvo, patinhas curtas e braços laterais.  |
| Bromeluz  | Corpo rosa, braços curvos e coroa de pétalas com miolo claro. |
| Girassu   | Rosto dourado e orelhas grandes em pétalas.                   |
| Cerrilume | Terracota, cauda longa curvada e manchas luminosas.           |
| Xiquinho  | Cacto de braços altos, linhas claras e flor roxa.             |
| Pedruxo   | Pedras arredondadas rosa-areia, topo e orelhas de seixo.      |

Formato-base 128×128, contorno de 2–3 unidades, sombra elíptica e pivô no chão. Estados: parado, dormir, comer, beber e brincar; caminhada usa interpolação, espelhamento seguro e balanço. Filhote/juvenil/adulto têm escala visual crescente. A opção de movimento reduzido remove balanços decorativos.

Os 17 objetos têm desenhos próprios e materiais consistentes: barro, madeira, tecido, água e vegetação. O renderer respeita dimensões, rotação, sombra, profundidade e sinal de melhoria. A área realmente cresce ao expandir, preservando posições lógicas.

Há paisagens ilustradas para as regiões e um mapa do Brasil propositalmente estilizado, acompanhado dos botões textuais dos sete destinos. Os quatro caminhos futuros têm identificação explícita de indisponibilidade.

A prancha pública /arte mostra as nove espécies, seus ovos, estados de descanso e os 17 objetos. A rota /demonstracao oferece Quintal e Terreninho sem persistência.

O 17º objeto é o Ninho aconchegante: palha, almofada de folhas e arco em coração. Retratos individuais variam em matiz, padrão, tufo e porte herdados; a variante aurora acrescenta brilhos. No terreno, encontros e aconchego usam corações; disputas reais mostram interrogação, sem violência. Nomes têm fundo claro para leitura também à noite. Lua, luz noturna, chuva e poças são cosméticos. A demonstração permite revisar dia, noite e chuva sem alterar dados persistentes. Bateria reduz fps/resolução/partículas, e movimento reduzido mantém os estados legíveis sem balanços.
