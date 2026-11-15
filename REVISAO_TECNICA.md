# Revisão técnica — NovaNFT

Data: 13/11/2026. Referência: enunciado “Desafio Frontend — Marketplace de NFTs” fornecido na conversa.

**Parecer: a versão atual ainda não está pronta para submissão.** Há falhas reproduzidas de isolamento de usuários e ausência de uso efetivo de partes da stack obrigatória, enquadradas nos critérios eliminatórios. O comando oficial de build também falha. A interface e os fluxos básicos fornecem uma base aproveitável, mas faltam comportamentos centrais exigidos pelo desafio.

O Figma não foi disponibilizado. Portanto, não atribuí nota de fidelidade visual nem presumi quais seriam os assets oficiais. O usuário informou que a aplicação está apenas local; o deploy obrigatório permanece pendente. Não atribuí uma nota total especulativa.

## O que foi verificado

- Leitura de todo o código da aplicação, handlers, fixtures, configuração, documentação e testes existentes.
- Execução de build e verificação de tipos.
- Execução da suíte Playwright existente em Chromium, desktop e mobile.
- Diagnósticos adicionais em contextos de navegador isolados, passando pelo cliente Axios da aplicação e pelos handlers MSW reais. Não foram usados setters para fabricar resultados de compras.
- Captura e medição de overflow em nove telas, nas larguras 390, 768 e 1440 px: 27 capturas. Inspeção visual de amostras, incluindo detalhe, carrinho, pagamento, perfil e recibo.
- Caso adicional com endereço de carteira completo, verificação de foco e varredura axe-core em sete rotas.
- Auditoria Lighthouse em bundle otimizado separado, sem mudar a aplicação para melhorar as notas. Os detalhes estão abaixo.

**Nenhum arquivo de implementação em `src/` foi alterado.** Foram acrescentados este relatório e os scripts/artefatos de auditoria em `.audit/`. O Playwright também gerou `playwright-report/` e `test-results/`. O navegador de testes está em `.audit/browsers/`, ignorado pelo `.gitignore` dessa pasta. Não inclua os binários do navegador no repositório.

Ambiente principal: Windows, Node 24.22.1, npm 11.20.0, TypeScript 5.9.3, Vite 6.4.6, Playwright 1.65.0, Chromium Headless Shell 158.0.8127.18, MSW 2.15.0. As versões efetivamente instaladas vêm do lockfile, não apenas dos intervalos de `package.json`.

| Verificação | Resultado |
| --- | --- |
| `npm run build` | Falha: 18 erros TypeScript; o Vite não é executado pelo script oficial |
| `npm run typecheck` | Falha pelos mesmos problemas de tipos |
| Suíte existente | 6/6 passaram: três testes, em dois projetos; execução de 47,8 s |
| Busca + categoria + ordenação + refresh/histórico | Funcionaram no diagnóstico complementar |
| Detalhe inexistente e rota inexistente | Tratamento visual de 404 funcionou |
| Login, alteração de nome/senha e favoritos | Persistência básica confirmada |
| Consulta de pedido de outro usuário | Falha grave: HTTP 200 e recibo exibido |
| Recibo após logout | Falha grave: API retorna 401, mas a UI ainda exibe o recibo em cache |
| Reenvio com mesma chave de idempotência | Falha: HTTP 409 em vez de recuperar o pedido |
| Estoque após duas compras | Falha: compradas 10 unidades com disponibilidade 5 |
| Mudança de cotação antes de confirmar | Falha: compra aceita com total alterado, sem etapa adicional de confirmação |
| Precisão em ETH | Falha: arredondamento na API e na UI |
| 27 telas com fixtures padrão | Sem overflow horizontal de documento nas três larguras |
| Carteira com endereço completo em 390 px | Falha: documento passou a 502 px |
| Figma e deploy público | Comparação visual não verificável; deploy ainda inexistente segundo o usuário |

## P0 — resolver antes de qualquer entrega

### 1. Build de produção quebrado

Evidência: [.audit/build.log](.audit/build.log), [.audit/typecheck.log](.audit/typecheck.log).

Os 18 erros incluem `ImportMeta.env` sem os tipos do Vite, imports/variável não utilizados e navegações/links para `/` sem os parâmetros de busca que a tipagem atual do Router considera obrigatórios. Fontes: `src/main.tsx:3`, `src/ui.tsx:1`, `src/ui.tsx:4`, `src/ui.tsx:16`, `src/ui.tsx:17` e demais links/navegações do mesmo arquivo.

Correção: incluir os tipos do Vite, ajustar corretamente o contrato de entrada/saída de `validateSearch` e os links, e remover declarações não utilizadas. O `as never` no redirecionamento do checkout também deve ser substituído por parâmetros de busca tipados. O critério de conclusão é `typecheck` e `build` com saída zero a partir de uma instalação reproduzível.

O bundle criado exclusivamente para Lighthouse usa Vite diretamente. Isso não significa que `npm run build` tenha passado.

### 2. Vazamento de pedidos entre usuários e após logout

Fontes: `src/mocks.ts:23`, `src/data.ts:4`, `src/ui.tsx:20`, `src/ui.tsx:22`, `src/ui.tsx:23`, `src/ui.tsx:35` e `src/ui.tsx:38`.

Reprodução confirmada:

1. João (`demo@nft.com`) cria um pedido.
2. Efetua logout e entra como Maria (`maria@nft.com`).
3. Maria abre `/order/<id-do-pedido-de-João>`.
4. A API retorna **200** e a tela mostra o recibo de João.

O tipo `Order` não possui proprietário, e o GET verifica somente se existe algum usuário autenticado. Além disso, após carregar um recibo, sair da conta e voltar pelo histórico, o recibo continua visível mesmo com sessão nula e resposta 401. A UI prioriza `data` antigo sobre o erro da consulta. Invalidar consultas não remove seus dados.

Correção: gravar e validar o proprietário no handler; separar chaves privadas por usuário; cancelar/remover dados privados na troca de sessão; proteger a rota; impedir renderização de recibo privado sem sessão válida. Depois, comprovar com testes de dois usuários e histórico após logout. **Exposição entre usuários é eliminatória no enunciado.**

Evidências: [.audit/evidence/results.json](.audit/evidence/results.json), [pedido de outro usuário](.audit/evidence/order-owner-isolation.png), [recibo após logout](.audit/evidence/private-cache-after-logout.png).

### 3. Socket.IO não participa da implementação

`socket.io-client` e `@mswjs/socket.io-binding` aparecem nas dependências, mas não são importados pelo código da aplicação. Não existem `nft.updated`, `order.updated`, conexão, reconexão, versões de eventos ou subscriptions de sessão.

O mecanismo atual é `window.dispatchEvent(new Event('demo-data-changed'))` em `src/store.ts:8` e `src/store.ts:9`, ouvido em `src/ui.tsx:29` para invalidar o cache. O endpoint `/simulate/nft` altera o armazenamento e aciona esse mecanismo. **Isso não atende ao requisito de simulação por Socket.IO e cai no cenário de eventos ligados diretamente à UI/cache.**

Correção: criar a integração MSW compatível com o protocolo Socket.IO; exercitar `socket.io-client`; implementar os dois eventos com identidade e versão; descartar duplicatas/versões antigas; impedir regressão de pedidos terminais; reconciliar os recursos ativos por REST após reconectar; liberar listeners e dados da sessão anterior. Documentar transporte e limitações.

### 4. shadcn/ui ausente

A interface usa elementos HTML e CSS próprios. Não há componentes shadcn/ui implementados na árvore de arquivos. A presença de Tailwind, Lucide e botões estilizados não comprova esse requisito. O enunciado exige participação efetiva de toda a stack obrigatória.

Correção: incorporar componentes shadcn/ui apropriados aos fluxos, adaptados ao visual escolhido e com comportamento acessível. Não basta adicionar uma dependência sem usá-la.

## P1 — falhas de compra, conta e estado

### 5. Idempotência não recupera a mesma tentativa

Fonte: `src/mocks.ts:22`. A chave é associada a um fingerprint que inclui o carrinho atual. A criação do pedido esvazia esse carrinho. Um segundo POST com a **mesma chave e o mesmo body** passa a ter fingerprint diferente e retorna 409. Isso foi reproduzido imediatamente após uma compra, sem precisar provocar timeout.

Em `src/ui.tsx:34`, a chave existe só no estado local do componente; refresh gera outra. Não há identificação persistida da tentativa pendente.

Correção: enviar uma intenção de compra imutável, com itens/quantidades/cotação aprovados, e associar a chave a esse conteúdo. Repetição idêntica deve recuperar o mesmo pedido; conteúdo diferente deve dar conflito. Persistir a tentativa para recuperar após refresh/timeout/reconexão.

### 6. Cotação alterada é aceita sem nova confirmação

Fontes: `src/mocks.ts:7`, `src/mocks.ts:21`, `src/mocks.ts:22` e `src/ui.tsx:34`.

No diagnóstico, a revisão mostrava uma cotação de **0,8700 ETH**. O preço foi alterado pelo endpoint MSW de simulação; a nova cotação foi **1,8700 ETH**. O botão continuou habilitado e o pedido foi criado por 1,8700 ETH. Não houve bloqueio nem etapa adicional para aceitar a mudança.

O POST recebe carteira/rede, recalcula valores atuais e compra, sem comparar uma cotação aprovada pelo usuário. Correção: cotação identificável/versionada, revalidação de todos os componentes e resposta explícita de cotação desatualizada que exija nova revisão/aceite.

### 7. Estoque e quantidade não se mantêm consistentes

Fonte: `src/mocks.ts:22`. Comprar não reduz `nft.available`. Com estoque 5, duas compras de 5 unidades foram confirmadas, totalizando 10, e a disponibilidade permaneceu 5.

Fonte adicional: `src/mocks.ts:13`. O merge do carrinho soma quantidades sem revalidar limite. Um carrinho autenticado com 4 unidades mais um visitante com 4 resultou em 8 unidades disponíveis para um NFT cujo estoque era 5.

Correção: atualizar estoque e pedido de maneira consistente; revalidar o merge; informar conflitos ao usuário. Na confirmação, remover somente os itens/quantidades efetivamente comprados. O código atual esvazia todo o carrinho do usuário e não possui snapshot da intenção que permita distinguir compras de adições posteriores.

### 8. Estados de pagamento e recuperação não existem

O tipo declara `pending`, `confirmed` e `rejected`, mas o handler sempre cria `confirmed`. Não há recusa de pagamento, pedido pendente, timeout após criação, interrupção/reconexão, nem recuperação da tentativa.

`OrderPage`, em `src/ui.tsx:35`, mostra “Pedido confirmado!” para qualquer objeto de pedido, sem testar `status`. Quando os demais estados forem implementados, essa lógica produzirá sucesso indevido.

Há cópia dos dados dos NFTs e valores no pedido, o que é uma boa base para o recibo imutável. Porém, a UI mostra apenas a contagem de itens, não a relação de itens/edições/quantidades e seus valores; a rede selecionada também não é registrada no modelo do pedido. Completar o snapshot e sua apresentação.

### 9. Precisão em ETH é perdida

Fontes: `src/mocks.ts:7`, `src/mocks.ts:10` e `src/ui.tsx:26`.

`Decimal` é usado, e os valores trafegam como strings, mas `toFixed(4)` arredonda a cotação e `toFixed(2)` arredonda toda a apresentação. A ordenação também converte preços para `Number`.

Reprodução: preço `0.123456789123456789` virou subtotal `0.1235`, total `0.1435` e foi mostrado como `0.12 ETH`/`0.14 ETH`. Mesmo os fixtures atuais podem gerar mais casas decimais com o cupom de 10%.

Correção: manter a precisão definida pelo contrato em todo o cálculo, comparação e exibição; não arredondar valores financeiros de maneira silenciosa. Testar preços próximos, quantidades e descontos com várias casas.

### 10. Sessão e retorno ao fluxo incompletos

Fontes: `src/store.ts:3`, `src/store.ts:6`, `src/mocks.ts:12`, `src/ui.tsx:34`, `src/ui.tsx:36`.

- Checkout envia o visitante para `/login?redirect=%2Fcheckout`, mas login sempre navega para `/profile`. Reproduzido no navegador. O teste de compra atual disfarça o problema ao fazer `page.goto('/checkout')` manualmente.
- A sessão é somente um ID persistido; não tem expiração, política de validade ou cenário reproduzível de expiração durante navegação/checkout.
- Não existe tratamento central que encerre sessão inválida e preserve a intenção para retomada.
- Senhas são salvas em texto claro no armazenamento local. O enunciado proíbe isso, mesmo com credenciais fictícias. A advertência no README não satisfaz o requisito.
- A proteção está dispersa em efeitos de componentes; faltam proteção coerente pelo Router e limpeza do cache privado.

Correção: política explícita de sessão e expiração simulada, retorno validado à rota anterior, contexto de compra recuperável, armazenamento de verificação de senha sem texto claro e limpeza de dados por sessão.

### 11. Perfil, carteiras e detalhe estão parciais

Fontes: `src/ui.tsx:32`, `src/ui.tsx:34`, `src/ui.tsx:38`, `src/ui.tsx:39`, `src/mocks.ts:26`, `src/data.ts:1`.

- **Avatar:** existe um campo opcional no tipo, mas não há interface nem mutation para alterá-lo. O avatar exibido é a inicial do nome.
- **Carteiras:** cadastrar e editar existe, mas o handler aceita endereço `abc` e rede `Rede inexistente` com status 200. Não existe indicação de principal/secundária no modelo, apenas nomes nos fixtures.
- **Conexão de carteira:** falta simulação de conectar, recusar e desconectar. A seleção de radio é a única interação.
- **Dados no checkout:** são campos somente leitura; não há uma etapa de edição/validação dos dados do colecionador.
- **Galeria e edições:** há uma imagem e uma string de edição. Não há modelo de variantes/edições com estoque independente ou seleção de edição indisponível.
- **Favoritos:** persistem por usuário, mas não há atualização otimista com rollback. Falhas de mutation dos favoritos não têm feedback na UI.

### 12. A UI depende diretamente do banco dos mocks

Fontes: `src/ui.tsx:5`, `src/ui.tsx:31`, `src/ui.tsx:33`, `src/ui.tsx:34`.

Carrinho e revisão do checkout consultam `readDB()` para obter dados dos NFTs. O destaque importa diretamente `initialNFTs`. Isso quebra a separação exigida: componentes/hooks/cliente HTTP não devem depender de respostas fictícias nem de caminhos alternativos de negócio. Desligar MSW não remove essa dependência da UI.

Correção: fazer a API devolver os dados necessários, manter contratos de domínio/transporte independentes dos mocks e consumir esses contratos via Query/Axios. Usar controles de simulação separados da camada de negócio.

### 13. Cache, erros e cenários precisam de implementação

- Falta a interação otimista obrigatória (`onMutate`, snapshot e rollback).
- Invalidação atual atinge todo o cache em cada mutation e em cada evento local; não há política seletiva por recurso/usuário.
- A chave do catálogo inclui parâmetros, o que ajuda a isolar respostas de buscas diferentes. Entretanto, o `signal` do Query não é passado ao Axios; não há cenário/teste determinístico de latência variável e respostas fora de ordem.
- Em carrinho, erro de consulta pode ser apresentado como carrinho vazio; cotação ausente/erro vira valores zero e o checkout pode continuar. No detalhe, qualquer falha é apresentada como “NFT não encontrado”, inclusive falha transitória.
- Existem erros naturais 401/404/409/422 em alguns handlers, dois usuários e oito NFTs. Faltam cenários configuráveis para conexão indisponível, timeout, 5xx, permissão 403, sessão expirada, cupom expirado separado, eventos antigos/duplicados e pagamentos recusados/pendentes.
- A única latência configurada no código é fixa, de 180 ms, na listagem. IDs/datas de pedido usam relógio e aleatoriedade reais; os testes não controlam esses fatores.

## P2 — acessibilidade, apresentação, testes e entrega

### 14. Problemas de acessibilidade reproduzidos

Evidência: [.audit/evidence/quality.json](.audit/evidence/quality.json).

- O campo de busca focado tem `outline-style: none`, `outline-width: 0px`, `border-width: 0px` e `box-shadow: none`. As regras de `.filters input`/`.filters select` anulam o foco global. Corrigir o estado de foco do campo ou seu contêiner.
- O label do cupom não é associado ao input. O placeholder não substitui a associação exigida.
- O menu mobile não expõe `aria-expanded`; permanece aberto após Escape. Definir semântica e comportamento de teclado coerentes.
- O axe-core encontrou `aria-label` em um `div` de skeleton sem papel compatível (`aria-prohibited-attr`). Usar um status de carregamento semanticamente adequado.
- Mensagens de erro usam `role="alert"`, ponto positivo. Contudo, os erros não estão associados aos campos, e sucessos/mudanças em tempo real não contam com anúncios acessíveis apropriados.
- Há shimmer e respeito a `prefers-reduced-motion`, também positivos. O mesmo grid genérico de skeleton é usado em telas de composição distinta e falta skeleton específico para resumo/cotação; isso precisa acompanhar o espaço real do conteúdo.

Notas: ausência de violações automatizadas nas demais rotas examinadas não comprova acessibilidade completa. O Lighthouse avalia o estado carregado e pode não capturar problemas do skeleton ou de interação por teclado.

### 15. Responsividade funciona com fixtures curtos, mas quebra com carteira completa

Os nove tipos de tela não tiveram overflow horizontal de documento com os dados padrão em 390, 768 e 1440 px. Os fixtures de carteiras usam endereços abreviados.

Ao cadastrar `0x1234567890123456789012345678901234567890`, a página de carteiras em 390 px passou a ter **502 px** de largura. Evidência: [captura](.audit/evidence/wallets-full-address-390.png). Ajustar min-width de filhos de grid/flex, quebra/abreviação acessível do endereço e tamanhos do formulário. Testar novamente com nomes/e-mails/endereço longos e zoom.

Não foi feita certificação completa de zoom ou comparação pixel a pixel com Figma. A falta de referência visual impede avaliar os 20 pontos de fidelidade com confiança.

### 16. Assets dependem de internet

`src/data.ts:5` usa imagens remotas do Unsplash. `src/style.css:1` importa a fonte do Google Fonts. O enunciado pede que imagens/fontes necessárias estejam acessíveis à execução local. Atualmente elas não estão no projeto.

Obter os assets oficiais quando disponíveis; armazenar localmente os necessários e documentar substituições e ajustes de acessibilidade. Os nomes/descrições dos NFTs e imagens genéricas também precisam ser revisados quando houver referência oficial.

### 17. Cobertura de testes muito inferior à solicitada

Fontes: `tests/flows.spec.ts:3`, `tests/flows.spec.ts:4`, `tests/flows.spec.ts:5`, `playwright.config.ts:2`.

Os seis testes que passaram representam **três casos duplicados entre desktop e mobile**: busca/detalhe, login/perfil e compra feliz. Não são seis fluxos distintos. A configuração usa Desktop Chrome e Pixel 5; não é a matriz explícita 390/768/1440 do enunciado.

Faltam testes entregues para cadastro/conflitos, expiração, logout/troca de usuário, falha/rollback de favoritos, operações completas de carrinho/cupom/merge, idempotência/timeout/duplo clique, recusa/pedido pendente, edição/avatar/senha/carteiras, alterações por Socket.IO, ordenação de eventos/reconexão, foco/teclado, skeleton/falha/retry e regressão visual.

Não há `toHaveScreenshot` nem baselines de início/detalhe/carrinho/pagamento. As capturas feitas nesta revisão são evidências de diagnóstico, **não substituem baselines de regressão**. `trace: 'retain-on-failure'` já está configurado; o relatório HTML desta execução está em [playwright-report/index.html](playwright-report/index.html). Nenhum teste da suíte original falhou nesta execução, portanto não se esperam traces de falha dela.

Os scripts adicionados em `.audit/` demonstram os defeitos encontrados. Eles não substituem a suíte E2E funcional exigida para a entrega.

### 18. Lighthouse

Foram concluídas **12 medições: três por página e perfil**, com mediana calculada separadamente para cada categoria e métrica. Configuração: [.audit/lighthouse.config.mjs](.audit/lighthouse.config.mjs); executor: [.audit/lighthouse.mjs](.audit/lighthouse.mjs); dados completos: [.audit/lighthouse/summary.json](.audit/lighthouse/summary.json). Cada execução possui relatório HTML e JSON na mesma pasta.

| Página / perfil | Performance ≥90 | Acessibilidade ≥95 | Boas práticas ≥95 | SEO ≥90 | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início / mobile | **75 — abaixo** | 100 | 96 | 92 | 3,893 s | 0,02636 | 418 ms |
| Início / desktop | 98 | 100 | 96 | 92 | 0,951 s | 0,00205 | 4 ms |
| Detalhe / mobile | **86 — abaixo** | 98 | 96 | 92 | 3,551 s | 0,00691 | 20 ms |
| Detalhe / desktop | **77 — abaixo** | 98 | 96 | 92 | 1,272 s | **0,43168** | 0 ms |

Condições: Lighthouse 12.8.2, Chrome Headless 157, Windows 10.0.26200, Intel i5-1334U e 8 GiB de RAM; preview local em 4173; perfis mobile padrão e desktop oficial do Lighthouse, com seus padrões de simulação de rede/CPU; execuções sequenciais e limpeza de armazenamento padrão. Horários registrados nos JSONs. MSW padrão, imagens/fontes originais e funcionalidades preservados. Não houve simplificação específica para a auditoria.

**Limite da evidência:** como o script oficial falha na etapa TypeScript, o bundle otimizado foi gerado diretamente com `npx vite build --outDir .audit/production`. As notas diagnosticam o código atual otimizado, mas não validam o build oficial nem um deploy público. É necessário repetir depois das correções e versionar a configuração/relatórios da entrega final.

Causas identificadas nos relatórios:

1. **Detalhe desktop:** quase todo o CLS está no contêiner `main > div.wrap.page` (cerca de 0,43118); a fonte acrescenta uma pequena parcela. O skeleton genérico e o conteúdo final têm estruturas/dimensões diferentes, hipótese consistente com o deslocamento apontado e com o código. Reservar as dimensões da composição final durante loading e estabilizar o espaço da imagem. Evidência: [relatório do detalhe desktop](.audit/lighthouse/detail-desktop-2.html).
2. **Início mobile:** LCP é a imagem de destaque. O relatório acusa descoberta tardia da imagem, recursos que bloqueiam renderização, custo de JavaScript e imagens maiores que a área de exibição. O CSS remoto do Google Fonts faz parte da cadeia bloqueante. O bundle principal tem **781,26 kB minificado / 255,67 kB gzip**, sem divisão por tela; o Lighthouse apontou cerca de 104 KiB de JavaScript não usado nessa navegação e 257 KiB de economia possível em imagens. Separar carregamento por rota, servir assets locais dimensionados e priorizar a imagem de LCP. Evidência: [relatório do início mobile](.audit/lighthouse/home-mobile-2.html).
3. **Detalhe mobile:** LCP de aproximadamente 3,55 s, com imagem e recursos bloqueantes também apontados. Preservar a imagem real e melhorar sua entrega/prioridade; não retirar funcionalidades ou assets para elevar a nota.
4. **Ajustes adicionais:** falta `favicon.ico` (404 no console); `/robots.txt` retorna o HTML da aplicação; o título “Descrição” salta de h1 para h3 no detalhe. As notas dessas categorias atingem as metas, mas os itens continuam sendo melhorias concretas.

Para reproduzir a medição diagnóstica em Windows, com o Chrome no caminho configurado no executor:

```powershell
npx vite build --outDir .audit/production
# Deixar este processo executando em outro terminal:
npx vite preview --outDir .audit/production --host 127.0.0.1 --port 4173 --strictPort
# Terminal separado, sem testes concorrentes:
node .audit/lighthouse.mjs
```

### 19. Documentação, organização e publicação

- Não existe script/configuração de lint, embora o comando seja obrigatório.
- `README.md` diz que o lockfile ainda precisa ser gerado, mas `package-lock.json` já existe. Atualizar o estado real da entrega.
- Documentar variáveis, seleção/reset de cenários, credenciais fictícias, versões mínimas de Node compatíveis com o lockfile e comandos de reprodução de falhas.
- `ARCHITECTURE.md` lista endpoints, mas faltam exemplos de request/response, erros, parâmetros, contrato de idempotência, eventos, sessão, cache, carrinho, reconciliação e limitações do transporte.
- O README corretamente reconhece que a implementação é um protótipo. Resolver as lacunas antes de reescrever essa declaração.
- As telas e rotas estão concentradas em `src/ui.tsx`, praticamente uma linha por componente muito longo. Formatar e separar rotas, componentes, queries/mutations, domínio e mocks facilitará revisão e defesa técnica.
- Esta pasta não possui metadados Git (`git status` retorna “not a git repository”). Não foi apresentado link de repositório. Preparar repositório/ignore e versionar código, lockfile, assets, fixtures, baselines e relatórios exigidos.
- Publicar a versão correspondente ao código entregue; testar acesso direto e refresh das rotas, MSW, fluxo de compra e Socket.IO no domínio público. O usuário confirmou que ainda não há URL pública.

## Ordem recomendada de conclusão

1. Fazer `typecheck`/`build` passarem e incluir lint.
2. Corrigir isolamento de pedidos, sessão/cache e retorno ao checkout; remover senhas em claro.
3. Definir contratos de cotação/pedido/estoque e corrigir idempotência, precisão e snapshot.
4. Implementar MSW + Socket.IO real, cenários de rede, versões de eventos e recuperação do pedido.
5. Completar conta/avatar/carteiras/edições e usar shadcn/ui efetivamente.
6. Cobrir os fluxos e falhas com E2E, incluindo as reproduções deste relatório.
7. Revisar Figma/asset local/acessibilidade/mobile; gerar baselines estáveis.
8. Corrigir performance das páginas abaixo da meta, repetir as medições após mudanças, atualizar documentação e validar deploy público.

## Evidências e reprodução desta revisão

Arquivos principais:

- [.audit/build.log](.audit/build.log) e [.audit/typecheck.log](.audit/typecheck.log).
- [.audit/e2e.log](.audit/e2e.log) e [relatório Playwright](playwright-report/index.html).
- [.audit/evidence/results.json](.audit/evidence/results.json): dados dos diagnósticos e das 27 telas.
- [.audit/evidence/quality.json](.audit/evidence/quality.json): catálogo, histórico, teclado, axe-core e 404s.
- `.audit/evidence/*.png`: capturas; `.audit/evidence/*.zip`: traces dos diagnósticos.
- `.audit/lighthouse/`: resultados por página/perfil/execução e resumo.

O primeiro diagnóstico de `page=abc` continha uma expectativa incorreta de resultado vazio e atingiu timeout. O diagnóstico complementar verificou que a aplicação normaliza a URL para página 1; isso **não foi contado como defeito da aplicação**. A expectativa do script foi corrigida. O JSON original conserva o registro dessa tentativa para transparência.

Reprodução em PowerShell, com as dependências e o navegador instalados:

```powershell
# Terminal 1
npm run dev -- --host 127.0.0.1

# Terminal 2 — ajuste de diretório apenas para os binários usados nesta auditoria
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.audit\browsers'
$env:PLAYWRIGHT_HTML_OPEN = 'never'
npm run test:e2e -- --reporter=list,html
node .audit/review.mjs
node .audit/quality.mjs
```

Os diagnósticos usam contextos novos e contas fictícias; não alteram a sessão do navegador pessoal. A primeira tentativa de iniciar Vite no sandbox foi bloqueada por acesso a diretório, e o Chromium ainda não estava instalado. Após executar o servidor com acesso adequado e instalar o navegador na pasta de auditoria, os testes rodaram normalmente. Esses obstáculos de ambiente não foram tratados como bugs do projeto.

Não foi feita instalação a partir de clone Git limpo, pois esta pasta não é um checkout Git. A revisão usou as dependências locais compatíveis com o lockfile. A reprodução de uma instalação limpa e a validação no domínio público continuam sendo etapas da entrega.
