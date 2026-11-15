# Arquitetura

## Responsabilidades

- `src/data.ts`: contratos TypeScript compartilhados; sem fixtures.
- `src/api.ts`: Axios, Bearer token, timeout e normalização de expiração. Consultas recebem AbortSignal.
- `src/queries.ts`: TanStack Query, escopo por sessão, mutations, invalidação e favoritos otimistas.
- `src/ui.tsx`: TanStack Router, parâmetros validados, proteção de rotas, navegação e shell.
- `src/pages/`: telas de catálogo, compra e conta, carregadas sob demanda.
- `src/components/ui/`: componentes shadcn/ui adaptados com Radix, CVA, Tailwind e foco acessível.
- `src/realtime.tsx`: socket.io-client, versões, deduplicação, isolamento e reconciliação.
- `src/mocks.ts`: handlers REST MSW e bridge WebSocket/Socket.IO; regras de negócio simuladas.
- `src/store.ts`: fixtures e persistência exclusiva do backend simulado.
- `src/money.ts`: Decimal.js, precisão 60, truncamento explícito em 18 casas para ETH.

A inicialização começa pelo MSW e só depois importa a interface e socket.io-client. Isso garante que o cliente capture o WebSocket interceptado. `VITE_MOCKS=off` exclui a ativação do mock; o frontend continua usando os mesmos contratos.

## Contratos REST

Base `/api`. Corpo e resposta JSON. Valores monetários são strings decimais; quantidades e versões são inteiros. Nas rotas privadas, `Authorization: Bearer <token>` identifica a sessão. O token é fictício e pertence somente à demonstração local.

| Método / recurso          | Entrada principal                                                     | Resposta                                                                    |
| ------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `GET /nfts`               | `search`, `category`, `collection`, `available`, `sort`, `page`       | `{items,total,pages,collections}`, 9 itens por página                       |
| `GET /nfts/:id`           | id                                                                    | NFT com galeria, edições, preços, disponibilidade e versão                  |
| `POST /signup`            | `{name,email,password}`                                               | `{token,user,expiresAt}`; conflito de e-mail 409                            |
| `POST /login`             | `{email,password}`                                                    | sessão; possível `notice` de ajuste no merge do carrinho                    |
| `GET /session`            | token opcional                                                        | `{user,expiresAt}` ou `{user:null}` para visitante                          |
| `POST /logout`            | token                                                                 | revogação da sessão                                                         |
| `GET /favorites`          | privado                                                               | ids dos favoritos                                                           |
| `PUT /favorites/:id`      | `{favorite:boolean}`                                                  | lista atualizada                                                            |
| `GET /cart`               | visitante ou conta                                                    | linhas com NFT e edição resolvidos                                          |
| `PUT /cart`               | `{id,editionId,quantity}`                                             | carrinho; quantidade zero remove a linha                                    |
| `POST /coupon`            | `{code}`                                                              | cotação; código vazio remove                                                |
| `GET /quote`              | `network`                                                             | cotação canônica, itens, subtotal, desconto, taxa, total, `valid`, `issues` |
| `POST /wallet-connection` | `{wallet,network,action}`                                             | `{connected}`; ações connect/refuse/disconnect                              |
| `POST /orders`            | `Idempotency-Key` + `{quoteId,wallet,network,collector:{name,email}}` | pedido pendente ou recuperação da mesma tentativa                           |
| `GET /orders`             | privado                                                               | pedidos da conta atual                                                      |
| `GET /orders/:id`         | privado                                                               | estado e snapshot imutável; proprietário incorreto recebe 403               |
| `GET /profile`            | privado                                                               | dados públicos da conta                                                     |
| `PATCH /profile`          | `{name,email,avatar?}`                                                | perfil atualizado; avatar PNG/JPEG/WebP data URL, até 400 KB no formulário  |
| `PATCH /password`         | `{oldPassword,newPassword}`                                           | confirmação; revoga outras sessões da conta                                 |
| `GET /wallets`            | privado                                                               | carteiras cadastradas                                                       |
| `PUT /wallets`            | `{id?,name,address,network,primary}`                                  | carteiras; valida endereço e unicidade                                      |

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

A referência é o arquivo Figma `Ff0SksUi7UFtPWUO8kyNtw`, incluindo frame `2:2`. Nesta sessão somente a miniatura pública de 800 × 745 px com todas as telas estava acessível; acesso nativo à tela compartilhada e exportação dos frames não estavam disponíveis. A prévia mostra KRYPTO, fundo marrom quase preto, acentos laranja, hero dividido, filtros laterais, catálogo de três colunas, galeria lateral, rodapé e variantes mobile.

As imagens originais de macacos não foram obtidas: `public/assets/0.webp` a `7.webp` são substituições locais provenientes do protótipo (fotografias Unsplash). `scripts/download-assets.mjs` registra URLs e permite reproduzir o download. Inter está hospedada localmente. Não se declara equivalência pixel a pixel; validar medidas, tipografia e substituir pelos assets exportados é uma pendência visual explícita. Nenhum recurso visual depende de CDN durante o uso.

Acessibilidade: contraste de textos auxiliares ampliado, foco visível, controles com labels, diálogos Radix com focus trap/Escape, imagens com alternativas, skeletons dimensionados e shimmer desativado em prefers-reduced-motion. Pagamento usa três etapas para validação e revisão; ações editoriais fora do escopo abrem explicação ou navegam para recursos implementados, sem fingir sucesso.
