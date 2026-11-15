# Arquitetura

## Responsabilidades

- `src/data.ts`: contratos TypeScript compartilhados; sem fixtures.
- `src/api.ts`: Axios, Bearer token, timeout e normalização de expiração. Consultas recebem AbortSignal.
- `src/queries.ts`: TanStack Query, escopo por sessão, mutations, invalidação e favoritos otimistas.
- `src/ui.tsx`: TanStack Router, parâmetros validados, proteção de rotas, navegação e shell.
- `src/main.tsx` e `src/bootstrap.tsx`: carregamento paralelo do runtime React, da rota inicial e dos mocks; montagem somente após a ativação do worker e a preparação do banco.
- `src/pages/`: telas de catálogo, compra e conta, carregadas sob demanda.
- `src/components/ui/`: componentes shadcn/ui adaptados com Radix, CVA, Tailwind e foco acessível.
- `src/realtime.tsx`: socket.io-client, versões, deduplicação, isolamento e reconciliação.
- `src/mocks.ts`: handlers REST MSW e bridge WebSocket/Socket.IO; regras de negócio simuladas.
- `src/store.ts`: fixtures e persistência exclusiva do backend simulado.
- `src/money.ts`: Decimal.js, precisão 60, truncamento explícito em 18 casas para ETH.

O ponto de entrada carrega `bootstrap.tsx`, o módulo da rota inicial e o MSW em paralelo. Isso evita aguardar o download e a execução do runtime React para só então começar a preparar a rede simulada. A montagem do React aguarda a conclusão de todos esses passos. `socket.io-client` é importado dentro do efeito de conexão, somente depois da montagem, para capturar o WebSocket já interceptado pelo MSW. O cleanup também cobre a resolução tardia desse import após logout ou desmontagem. `VITE_MOCKS=off` exclui a ativação do mock; o frontend continua usando os mesmos contratos.

## Contratos REST

Base `/api`. Corpo e resposta JSON. Valores monetários são strings decimais; quantidades e versões são inteiros. Nas rotas privadas, `Authorization: Bearer <token>` identifica a sessão. O token é fictício e pertence somente à demonstração local.

| Método / recurso          | Entrada principal                                                     | Resposta                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /nfts`               | `search`, `category`, `collection`, `available`, `sort`, `page`, `network`, `minPrice`, `maxPrice`, `tab` | `{items,total,pages,collections,categories,categoryCounts,networkCounts}`, 9 itens por página |
| `GET /nfts/:id`           | id                                                                    | NFT com galeria, edições, preços, disponibilidade e versão                                                                                      |
| `POST /signup`            | `{name,email,password}`                                               | `{token,user,expiresAt}`; conflito de e-mail 409                                                                                                |
| `POST /login`             | `{email,password}`                                                    | sessão; possível `notice` de ajuste no merge do carrinho                                                                                        |
| `GET /session`            | token opcional                                                        | `{user,expiresAt}` ou `{user:null}` para visitante                                                                                              |
| `POST /logout`            | token                                                                 | revogação da sessão                                                                                                                             |
| `GET /favorites`          | privado                                                               | ids dos favoritos                                                                                                                               |
| `PUT /favorites/:id`      | `{favorite:boolean}`                                                  | lista atualizada                                                                                                                                |
| `GET /cart`               | visitante ou conta                                                    | linhas com NFT e edição resolvidos                                                                                                              |
| `PUT /cart`               | `{id,editionId,quantity}`                                             | carrinho; quantidade zero remove a linha                                                                                                        |
| `POST /coupon`            | `{code}`                                                              | cotação; código vazio remove                                                                                                                    |
| `GET /quote`              | `network`                                                             | cotação canônica, itens, subtotal, desconto, taxa, total, `valid`, `issues`                                                                     |
| `POST /wallet-connection` | `{wallet,network,action}`                                             | `{connected}`; ações connect/refuse/disconnect                                                                                                  |
| `POST /orders`            | `Idempotency-Key` + `{quoteId,wallet,network,collector:{name,email}}` | pedido pendente ou recuperação da mesma tentativa                                                                                               |
| `GET /orders`             | privado                                                               | pedidos da conta atual                                                                                                                          |
| `GET /orders/:id`         | privado                                                               | estado e snapshot imutável; proprietário incorreto recebe 403                                                                                   |
| `GET /profile`            | privado                                                               | dados públicos da conta                                                                                                                         |
| `PATCH /profile`          | `{name,email,avatar?,username?,ensName?,walletNickname?}`             | perfil atualizado; usuário único; ENS e apelido sincronizados com a carteira principal; avatar PNG/JPEG/WebP data URL, até 400 KB no formulário |
| `PATCH /password`         | `{oldPassword,newPassword}`                                           | confirmação; revoga outras sessões da conta                                                                                                     |
| `GET /wallets`            | privado                                                               | carteiras cadastradas                                                                                                                           |
| `PUT /wallets`            | `{id?,name,address,network,primary}`                                  | carteiras; valida endereço e unicidade                                                                                                          |

Erro uniforme: `{code,message,fields?}`. Há respostas 400/422 (validação), 401 (sessão), 403 (permissão), 404 (recurso), 409 (conflito) e 503 (transitória). Erros associados a campos usam `aria-invalid` e `aria-describedby`; erros gerais são anunciados com `role=alert`.

## Carrinho e dinheiro

O backend simulado separa carrinhos por conta e mantém um carrinho de visitante. No login, soma as quantidades por NFT/edição, limita pelo estoque e informa ajustes. O carrinho da conta anterior não é exibido para outra conta. Cupom válido `NFT10` desconta 10%; taxas simuladas são `0.02` ETH para Ethereum e `0.002` ETH para Polygon. Não há conversão monetária real.

Decimal.js evita cálculos com IEEE-754. Subtotal, desconto, taxa e total trafegam como strings; a apresentação preserva até 18 casas significativas após a vírgula, com pelo menos duas casas. A cotação REST é a autoridade para o checkout.

## Pedido, concorrência e retomada

A cotação tem um identificador canônico derivado de proprietário, rede, versões, edições, disponibilidade, quantidades e valores. Antes do envio a interface pede revisão; qualquer mudança invalida essa aprovação. O POST revalida tudo novamente, inclusive carteira conectada, cupom e rede, antes de reservar estoque.

A interface persiste `{key,body,orderId?}` por usuário antes de enviar e usa uma trava síncrona contra duplo clique. A mesma chave e corpo recuperam o mesmo pedido mesmo após timeout, reload, expiração ou mudança do carrinho. Chave reutilizada com corpo diferente retorna 409. Mutations não têm retry automático.

O pedido guarda cópias profundas de itens e valores. Criação reserva estoque; confirmação remove apenas as quantidades compradas do carrinho atual; recusa devolve a reserva e mantém os itens. Estados confirmados/recusados são terminais. O recibo consulta exclusivamente o snapshot, sem recalcular pelo catálogo. A identificação da transação é simulada e a ação de exploração abre uma explicação, não uma transação blockchain inexistente.

## Sessão e privacidade

Sessões têm duração de 30 minutos; token e mock DB persistem no navegador para recuperação. Senhas usam PBKDF2/SHA-256 (100 mil iterações) e salt. O mock nunca envia hashes/salt nas respostas de perfil. Rotas privadas consultam sessão no beforeLoad; handlers privados validam novamente o proprietário.

Checkout salva rascunho em sessionStorage por usuário e tentativas em localStorage por usuário. Expiração conserva o contexto e redireciona para login com retorno local validado. Logout/troca cancelam consultas, removem cache privado e encerram a subscription antiga. Conexão de carteira é volátil e deve ser refeita após reload.

Este é um backend local simulado: quem controla DevTools controla seu próprio armazenamento. Não há isolamento de servidor, sincronização multiusuário real, proteção de segredos, dinheiro real ou garantia transacional entre abas. Para produção seriam necessários servidor, autenticação, autorização e persistência adequados.

## Cache e rede

Consultas têm staleTime de 15 s, garbage collection de 5 min e revalidação ao focar a janela. Falhas de conexão/5xx têm no máximo uma repetição; 4xx e mutations não são repetidos automaticamente. Sessão é consultada a cada 30 s e também tem timer de expiração.

Listagens incluem parâmetros da URL na queryKey; detalhes incluem id. Dados privados usam `['private',token,recurso,...]`. Axios recebe AbortSignal para consultas substituídas. Mutations invalidam recursos afetados. Favoritos cancelam consulta, salvam snapshot e atualizam otimisticamente; falha faz rollback somente se ainda for a mesma sessão.

## Socket.IO

Transporte WebSocket exclusivo em `https://realtime.novanft.test` (path padrão `/socket.io/`), interceptado pelo MSW. `@mswjs/socket.io-binding` faz o handshake e serialização Engine.IO/Socket.IO; socket.io-client recebe os eventos efetivos. Heartbeat a cada 20 s; reconexão entre 600 e 2.000 ms. O binding 0.1.x usa um tipo antigo do interceptor; a adaptação de tipo fica isolada no handler.

Após conectar, o cliente emite `subscribe` com token e aguarda `subscribed`. O mock confere a sessão ao distribuir pedidos privados. Eventos têm `{eventId,resourceId,version,data,userId?}`:

- `nft.updated`: versão/preço/estoque atualiza detalhe e invalida catálogo, carrinho e cotação.
- `order.updated`: atualiza somente a conta/proprietário atual e reconcilia pedidos e carrinho.
- `session.expired`: evento auxiliar que aciona o fluxo de expiração.

O cliente ignora ids repetidos, versões antigas e regressão de pedido terminal. A identidade e a versão do payload precisam coincidir. Reconexão invalida recursos ativos para obter o estado REST atual. Cleanup remove listeners e desconecta. O clock do mock liquida pedidos pendentes; leitura REST e subscription também reconciliam vencimentos após reload. O mock roda na aba: não oferece rooms distribuídas, polling HTTP, servidor persistente nem comunicação real entre navegadores.

## Cenários controlados e testes

`POST /testing/scenario` seleciona cenário e overrides determinísticos. `/testing/nft`, `/testing/disconnect`, `/testing/expire`, `/testing/settle/:id`, `/testing/event` e `/testing/coupon-expire` controlam condições através dos handlers. `/testing/reset` restaura fixtures. A suíte observa UI e respostas de rede; controles de tempo real passam pelo socket, nunca chamam setters React.

Testes sensíveis a tempo controlam o relógio do navegador ou finalizam pedidos via endpoint determinístico. Relatórios e baselines são descritos no README. Resultados medidos e limitações ficam em `reports/VALIDATION.md`.

## Identidade visual e assets

A revisão visual usa os 15 frames PNG fornecidos em `Exemplos/`: nove telas desktop e seis mobile. A composição segue a marca KURIO, fundo `#160e0a`, painéis `#261813`, acento `#d18a49`, hero dividido, sidebar de filtros, catálogo de três colunas e rodapé completo. Mobile tem hero compacto, catálogo de duas colunas escalonadas, navegação inferior e telas próprias para autenticação e compra. Perfil, carteiras e recibo também se adaptam a mobile sem um frame específico.

As artes `public/assets/ape-hero.png`, `ape-sage.png`, `ape-neon.png` e `ape-golden.png` já existentes no checkout foram preservadas. A interface usa derivados WebP locais, com alternativas de 200/300 pixels quando cabíveis e `srcSet` no catálogo, destaque e detalhe. `scripts/optimize-art.mjs` reproduz a conversão a partir dos PNGs com o Chromium. As quatro primeiras imagens do catálogo carregam imediatamente; o restante usa lazy loading. Os antigos `0.webp` a `7.webp` permanecem como arquivos históricos do protótipo, sem participação nas telas atuais. Roboto Mono substitui a fonte de sistema anterior, em WOFF2 variável com subconjuntos latino e latino estendido; arquivos e licença OFL do [projeto oficial](https://github.com/googlefonts/RobotoMono) estão em `public/assets/`. A família exata e as medidas do arquivo editável não foram verificadas; a aproximação foi conferida pelos PNGs. Nenhum recurso visual depende de CDN durante o uso.

Acessibilidade: contraste de textos auxiliares ampliado, foco visível, controles com labels, diálogos Radix com focus trap/Escape, imagens com alternativas, skeletons dimensionados e shimmer desativado em prefers-reduced-motion. Pagamento usa três etapas para validação e revisão; ações editoriais fora do escopo abrem explicação ou navegam para recursos implementados, sem fingir sucesso.

Desvios deliberados dos frames: filtros extras de busca/coleção/disponibilidade permanecem acessíveis; contagens usam dados reais do mock; galeria apresenta as imagens disponíveis; edição esgotada é identificada; avaliação e cadastro de novidades não simulam sucesso. O checkout conserva conexão, escolha de rede e revisão exigidas pelo enunciado, acrescentando conteúdo aos frames estáticos. Ações sociais, recuperação de senha e páginas editoriais apresentam feedback de indisponibilidade. A referência monetária é o snapshot REST, sem conversão fictícia para BRL.

O catálogo tem 36 fixtures, nove categorias e quatro páginas de nove itens. Parâmetros `network` (CSV), `minPrice`, `maxPrice` e `tab=all|new|trending` complementam os filtros documentados. As respostas incluem `categories`, `categoryCounts` e `networkCounts`. Preços de filtros são strings decimais validadas. O banco simulado versão 6 inicia um cenário conhecido independente dos dados antigos da versão 5.
