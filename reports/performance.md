# Auditoria Lighthouse

Rodada final executada em **15/11/2026, 11:24–11:26 (America/Sao_Paulo)**, após instalação limpa, build otimizado e os 60 testes locais. Runtime auditado: `5cc95b21e19fa5edffc846f93e51c67eca775ca6`. As 12 medições terminaram sem erro de execução: três por página e perfil. As medianas de acessibilidade, boas práticas e SEO atingem 100; performance atinge 100 no desktop e **87 no mobile, abaixo da meta 90**.

## Medianas

| Página                   | Perfil  | Performance ≥ 90 | Accessibility ≥ 95 | Best Practices ≥ 95 | SEO ≥ 90 | LCP (ms) |        CLS | TBT (ms) |
| ------------------------ | ------- | ---------------: | -----------------: | ------------------: | -------: | -------: | ---------: | -------: |
| Início `/`               | Mobile  |           **87** |                100 |                 100 |      100 |  3772,18 |          0 |    112,5 |
| Início `/`               | Desktop |              100 |                100 |                 100 |      100 |   792,78 | 0,00000457 |        0 |
| Detalhe `/nft/cyber-ape` | Mobile  |           **87** |                100 |                 100 |      100 |  3776,49 |          0 |       43 |
| Detalhe `/nft/cyber-ape` | Desktop |              100 |                100 |                 100 |      100 |   771,56 |          0 |        0 |

Cada célula é a mediana independente de três medições. O JSON consolidado contém os valores sem arredondamento, cada execução, ambiente, timestamps, metas e `targetsPassed: false`: [summary.json](lighthouse/summary.json).

## Relatórios das 12 medições

| Página / perfil   | Medição 1                                                                           | Medição 2                                                                           | Medição 3                                                                           |
| ----------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Início / mobile   | [HTML](lighthouse/home-mobile-1.html) · [JSON](lighthouse/home-mobile-1.json)       | [HTML](lighthouse/home-mobile-2.html) · [JSON](lighthouse/home-mobile-2.json)       | [HTML](lighthouse/home-mobile-3.html) · [JSON](lighthouse/home-mobile-3.json)       |
| Início / desktop  | [HTML](lighthouse/home-desktop-1.html) · [JSON](lighthouse/home-desktop-1.json)     | [HTML](lighthouse/home-desktop-2.html) · [JSON](lighthouse/home-desktop-2.json)     | [HTML](lighthouse/home-desktop-3.html) · [JSON](lighthouse/home-desktop-3.json)     |
| Detalhe / mobile  | [HTML](lighthouse/detail-mobile-1.html) · [JSON](lighthouse/detail-mobile-1.json)   | [HTML](lighthouse/detail-mobile-2.html) · [JSON](lighthouse/detail-mobile-2.json)   | [HTML](lighthouse/detail-mobile-3.html) · [JSON](lighthouse/detail-mobile-3.json)   |
| Detalhe / desktop | [HTML](lighthouse/detail-desktop-1.html) · [JSON](lighthouse/detail-desktop-1.json) | [HTML](lighthouse/detail-desktop-2.html) · [JSON](lighthouse/detail-desktop-2.json) | [HTML](lighthouse/detail-desktop-3.html) · [JSON](lighthouse/detail-desktop-3.json) |

## Ambiente e condições

- Windows 10.0.19045; AMD Ryzen 5 5500; 8 GiB RAM.
- Node.js 24.22.1; Lighthouse 12.8.2; Google Chrome Headless 157.0.0.0.
- Build de produção servido por `vite preview` em `http://127.0.0.1:4175`; prévia iniciada e encerrada pelo script.
- Perfis padrão do Lighthouse: mobile 412 × 823, DPR 1,75, RTT de 150 ms, 1638,4 Kbps e CPU 4×; desktop 1350 × 940, DPR 1, RTT de 40 ms, 10240 Kbps e CPU 1×.
- Throttling **simulado**, cache limpo entre navegações, `disableStorageReset: false`, sem testes ou outros navegadores de validação concorrentes. Os detalhes completos ficam em `configSettings` de cada JSON.
- MSW e Socket.IO habilitados no cenário padrão `success`: `latency: 0 ms` e `orderDelay: 1800 ms`. Esse cenário é o mesmo em desenvolvimento, testes e deploy. Dados, imagens WebP responsivas e fontes locais da entrega estão habilitados. Nenhuma rota ou funcionalidade recebe tratamento especial para auditoria.
- O Chrome precisou de execução fora das restrições de subprocessos do sandbox. Essa permissão altera o ambiente do executor, não o código, o perfil de auditoria ou o conteúdo auditado.

## Otimizações e resultado mobile

A rodada de diagnóstico anterior registrou performance mobile **86 no início e 85 no detalhe**, com CLS 0,0486 no início. O carregamento de React, Router e Query foi movido para um módulo de bootstrap, permitindo carregar a interface em paralelo ao MSW. A montagem continua aguardando a preparação do banco e a ativação do worker. O módulo de entrada passou de aproximadamente 333 KB para 3,61 KB antes de compressão; isso reorganiza o carregamento e não significa que todas as dependências deixaram de ser transferidas.

O contexto de formatação `display: flow-root` no elemento `#root` contém a margem do conteúdo mobile. Na rodada final o CLS mobile passou a zero; as capturas visuais permaneceram aprovadas. As medianas de performance subiram para 87 em ambas as páginas, e para 100 no desktop.

O cenário de sucesso também deixou de acrescentar 90 ms artificiais a cada REST. Essa mudança vale para todos os ambientes e reduz a espera artificial da demonstração; não comprova otimização de um backend real e **não foi suficiente para atingir a meta mobile**. O cenário de rede lenta mantém 1800 ms, respostas fora de ordem mantêm suas latências, o timeout continua em 11 s e a resolução padrão de pedidos continua em 1800 ms. Dados, validações e transporte da simulação foram preservados. As dependências de interceptação também foram deduplicadas por um override compatível, sem substituir o protocolo Socket.IO.

A meta mobile **ainda não foi atingida**. O principal limite é o LCP simulado de aproximadamente 3,77–3,78 s: o conteúdo depende da inicialização de React, Router, Query, MSW, bridge Socket.IO e da resposta REST simulada. Na medição [início/mobile 2](lighthouse/home-mobile-2.json), a imagem LCP termina de carregar em cerca de 75 ms observados, mas há cerca de 290 ms observados até sua pintura. O perfil mobile simula uma rede e CPU mais lentas; o valor observado sem throttling não deve ser confundido com o LCP simulado usado na pontuação.

Essa medição transfere aproximadamente 406,7 KB em 32 requisições, incluindo 18 scripts. Os diagnósticos apontam cerca de 63 KiB de JavaScript e 10 KiB de CSS não usados no primeiro viewport, além de bloqueio inicial por CSS estimado em 150 ms. A próxima investigação seria reduzir as dependências obrigatórias antes do primeiro conteúdo, por exemplo carregando os diálogos sob demanda e separando o CSS crítico. Essas mudanças não foram aplicadas nesta rodada. Um diagnóstico isolado com importação tardia da bridge não trouxe ganho mensurável e essa alteração foi revertida. As imagens, as fontes, a persistência e a simulação completa foram mantidas durante as medições.

## Reproduzir

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run audit
```

Execute a auditoria sem testes concorrentes. `AUDIT_URL` seleciona uma prévia existente; quando ausente, o script inicia a sua própria. `CHROME_PATH` permite selecionar outro executável do Chrome. [scripts/lighthouse.mjs](../scripts/lighthouse.mjs) versiona as rotas, os perfis, a coleta de métricas, o cálculo das medianas e as metas. A pontuação varia com o ambiente; esta tabela representa a rodada identificada pelos relatórios anexos.
