# Auditoria Lighthouse

Auditoria da aplicação publicada em https://challengejungle.vercel.app, runtime `06c1533f478bf5c27fe90ad4295e7762d595e2d1`. Foram executadas três medições por página e perfil, com os mesmos mocks, dados, imagens e funcionalidades disponíveis ao usuário.

Início: 2026-11-15T14:54:11.365Z. Fim: 2026-11-15T14:55:47.184Z. Horários do JSON em UTC.

## Medianas

| Página  | Perfil  | Performance | Acessibilidade | Boas práticas | SEO | LCP (ms) | CLS | TBT (ms) |
| ------- | ------- | ----------: | -------------: | ------------: | --: | -------: | --: | -------: |
| Início  | mobile  |          94 |            100 |           100 | 100 | 2.863,09 |   0 |     39,5 |
| Início  | desktop |         100 |            100 |           100 | 100 |   578,86 |   0 |        0 |
| Detalhe | mobile  |          93 |            100 |           100 | 100 | 3.096,54 |   0 |       40 |
| Detalhe | desktop |         100 |            100 |           100 | 100 |   582,44 |   0 |        0 |

Metas: performance ≥ 90, acessibilidade ≥ 95, boas práticas ≥ 95 e SEO ≥ 90. Resultado consolidado: **todas as metas atingidas**. [JSON consolidado](lighthouse/summary.json). As medianas são calculadas independentemente para cada categoria e métrica.

## Relatórios HTML e JSON

- home-mobile-1: [HTML](lighthouse/home-mobile-1.html) · [JSON](lighthouse/home-mobile-1.json).
- home-mobile-2: [HTML](lighthouse/home-mobile-2.html) · [JSON](lighthouse/home-mobile-2.json).
- home-mobile-3: [HTML](lighthouse/home-mobile-3.html) · [JSON](lighthouse/home-mobile-3.json).
- home-desktop-1: [HTML](lighthouse/home-desktop-1.html) · [JSON](lighthouse/home-desktop-1.json).
- home-desktop-2: [HTML](lighthouse/home-desktop-2.html) · [JSON](lighthouse/home-desktop-2.json).
- home-desktop-3: [HTML](lighthouse/home-desktop-3.html) · [JSON](lighthouse/home-desktop-3.json).
- detail-mobile-1: [HTML](lighthouse/detail-mobile-1.html) · [JSON](lighthouse/detail-mobile-1.json).
- detail-mobile-2: [HTML](lighthouse/detail-mobile-2.html) · [JSON](lighthouse/detail-mobile-2.json).
- detail-mobile-3: [HTML](lighthouse/detail-mobile-3.html) · [JSON](lighthouse/detail-mobile-3.json).
- detail-desktop-1: [HTML](lighthouse/detail-desktop-1.html) · [JSON](lighthouse/detail-desktop-1.json).
- detail-desktop-2: [HTML](lighthouse/detail-desktop-2.html) · [JSON](lighthouse/detail-desktop-2.json).
- detail-desktop-3: [HTML](lighthouse/detail-desktop-3.html) · [JSON](lighthouse/detail-desktop-3.json).

## Ambiente e condições

- Node v24.22.1; Lighthouse 12.8.2; navegador Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36.
- Sistema win32 10.0.19045; CPU AMD Ryzen 5 5500; memória 8 GiB.
- Origem: https://challengejungle.vercel.app.
- Build otimizado; cenário padrão MSW success (latency 0 ms, orderDelay 1800 ms), idêntico em desenvolvimento, testes e demonstração; imagens e fonte locais da entrega; cache limpo em cada navegação; throttling simulado padrão mobile/desktop. Execuções sequenciais sem testes concorrentes.

## Correções e comparação

A rodada anterior registrava 87 em performance mobile na prévia local com gzip. A rodada atual mede a publicação Vercel com Brotli e CDN; a comparação entre origens não isola o efeito de uma única mudança. A revisão removeu a moldura dos cards e recortou a borda embutida nos PNGs através do enquadramento CSS, preservando as artes originais. Os diálogos Radix passam a carregar ao abrir, mantendo o controle de foco, Escape e retorno ao acionador. O build usa Terser para reduzir JavaScript.

A Vercel serve os arquivos estáticos com Brotli, confirmado por resposta HTTP Content-Encoding: br. A prévia local agora negocia a mesma codificação para os arquivos JS/CSS completos, com fallback para clientes sem suporte; o build produz os arquivos comprimidos. A auditoria acima foi executada diretamente na URL pública, sem depender da configuração de compressão da prévia.

O cenário de sucesso continua com latency: 0 e pagamento em 1800 ms. Cenários de lentidão, falha, timeout, recusa, reconexão e respostas fora de ordem permanecem disponíveis. Não há detecção do Lighthouse nem supressão de funcionalidades para elevar a nota.

## Reproduzir

Execute npm run build e npm run audit para auditar a prévia local. Para repetir esta rodada publicada em PowerShell:

```powershell
$env:AUDIT_URL='https://challengejungle.vercel.app'
npm.cmd run audit
```

A pontuação varia com rede, CPU e carga do sistema. Os números acima correspondem às 12 medições anexadas.
