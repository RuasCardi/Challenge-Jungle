# KRYPTO — NFT Marketplace

Marketplace de demonstração em React e TypeScript para o [desafio Jungle Gaming](https://github.com/junglegaming/frontend-challenge). Inclui catálogo, detalhe, carrinho, checkout, recibo, login, cadastro, perfil e carteiras, com APIs REST e eventos Socket.IO simulados na camada de rede.

## Executar

Requisitos: Node.js **22.13+** e npm. Não precisa de backend, extensão de carteira ou credenciais de serviços privados.

```sh
npm ci
npm run dev
```

Abra `http://localhost:5173`. O worker MSW já está em `public/mockServiceWorker.js`. Para avaliar o build otimizado:

```sh
npm run build
npm run preview
```

O MSW também funciona no build de demonstração. Service Workers exigem HTTPS ou localhost.

## Contas fictícias

| Conta           | Senha      |
| --------------- | ---------- |
| `demo@nft.com`  | `Demo123!` |
| `maria@nft.com` | `Demo123!` |

Também é possível cadastrar uma conta. A demonstração persiste dados no navegador; as senhas são derivadas com PBKDF2/SHA-256 e salt, nunca gravadas em claro. Essa persistência serve à simulação, não constitui um servidor de autenticação seguro.

## Fluxo principal

1. Escolha um NFT, sua edição e quantidade. A edição especial de Cyber Ape começa esgotada.
2. Adicione ao carrinho e experimente o cupom `NFT10` (10%). `EXPIRED` reproduz um cupom expirado.
3. Finalize a compra e autentique-se. O carrinho do visitante é incorporado ao da conta, respeitando o estoque.
4. Preencha os dados, escolha uma carteira compatível com a rede e clique em **Conectar carteira**.
5. Revise a cotação e confirme. O pedido passa por pendência antes de confirmação ou recusa.
6. Consulte o recibo e os pedidos em **Minha conta**. Transações e exploração são explicitamente simuladas.

## Cenários e reset

O botão **Controles da demonstração**, no rodapé, configura os mesmos handlers usados nos testes. Aplicar um cenário preserva os dados existentes; **Restaurar todos os dados** volta às fixtures iniciais, limpa sessões, carrinhos, contas cadastradas, favoritos, pedidos, carteiras e rascunhos.

| Cenário                                 | Como reproduzir                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Sucesso                                 | Compra padrão; confirma após cerca de 1,8 s.                                                                                   |
| Rede lenta                              | Busque ou abra outro detalhe; skeletons aparecem durante a resposta de 1,8 s.                                                  |
| Respostas fora de ordem                 | Digite uma letra e depois outro termo; somente a busca atual permanece.                                                        |
| Sem conexão / Erro HTTP 503             | Navegue ou busque; restaure Sucesso e use Tentar novamente.                                                                    |
| Falha no próximo favorito               | Favorite autenticado; observe atualização otimista, erro e rollback. Repita para recuperar.                                    |
| Pagamento recusado                      | Configure antes de confirmar; itens permanecem e o estoque reservado é devolvido.                                              |
| Timeout após criar pedido               | Confirme; a resposta demora 11 s e o cliente expira em 8 s. Recarregue e clique em Recuperar pedido para obter a mesma compra. |
| Pedido pendente                         | O resultado leva 60 s; interrompa Socket.IO ou recarregue e acompanhe o mesmo pedido.                                          |
| Preço muda / Edição esgota ao confirmar | Configure antes do envio; a API rejeita a cotação antiga e exige revisão.                                                      |
| Alterar preço de Cyber Ape              | Com esse NFT no carrinho/checkout, use o botão e observe a atualização via Socket.IO.                                          |
| Expirar sessão                          | Autentique-se, preencha parte do checkout e expire; o login retoma o formulário.                                               |
| Interromper Socket.IO                   | O cliente reconecta e reconcilia recursos ativos por REST.                                                                     |

Os endpoints de controle `/api/testing/*` são exclusivos da demonstração MSW. Os componentes de negócio não acessam fixtures ou banco local diretamente.

## Configuração

Copie `.env.example` para `.env.local` somente se precisar alterar os padrões:

| Variável          | Padrão                          | Uso                                                                                   |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| `VITE_MOCKS`      | `on`                            | `off` desativa o backend simulado; exige implementar os contratos no servidor.        |
| `VITE_SOCKET_URL` | `https://realtime.novanft.test` | Endpoint interceptado de Socket.IO. Esse domínio não é um serviço externo necessário. |
| `BASE_URL`        | `http://127.0.0.1:5174`         | Alvo opcional da suíte E2E.                                                           |
| `AUDIT_URL`       | `http://127.0.0.1:4175`         | Alvo Lighthouse; quando ausente, o script inicia uma prévia local do build.           |
| `CHROME_PATH`     | Chrome instalado no Windows     | Caminho opcional do Chrome para Lighthouse.                                           |

## Verificação

```sh
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:visual
npm run test:report
npm run audit
```

A suíte usa Chromium em desktop (1440 × 1000), mobile (390 × 844) e, para responsividade/regressão visual, tablet (768 × 1024). Cada teste tem um contexto isolado. `test-results/` contém screenshots e traces das falhas; `playwright-report/` contém o relatório HTML. As baselines estão em `tests/baselines/`. Atualize-as com `npm run test:visual:update` somente após conferir visualmente a mudança.

A auditoria executa três medições por rota (`/` e `/nft/cyber-ape`) e perfil (mobile/desktop), em sequência. HTML, JSON, ambiente, versões, LCP, CLS, TBT e medianas ficam em `reports/lighthouse/`. Execute após `npm run build`, sem outros testes concorrentes. Consulte `reports/VALIDATION.md` para o resultado da entrega.

## Entrega e referências

`vercel.json` configura fallback de rotas SPA e o worker da demonstração. `_redirects` oferece o equivalente para hospedagem estática compatível. A versão publicada precisa incluir todo o conteúdo de `dist/`.

Referência visual: [Figma — Frontend Challenge](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=2-2). Foi possível consultar a prévia pública geral do arquivo; medidas, fontes e assets originais não estavam disponíveis para exportação nesta sessão. O tema KRYPTO, a paleta escura/laranja e a composição foram ajustados a essa prévia. **A fidelidade pixel a pixel e as imagens originais dos macacos ainda dependem de acesso aos frames/assets.** As substituições locais estão documentadas em `ARCHITECTURE.md`.

Consulte `ARCHITECTURE.md` para contratos, cache, segurança da simulação e decisões de UX. `REVISAO_TECNICA.md` registra a avaliação histórica do protótipo inicial e não representa o estado atual.

