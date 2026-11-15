# Validação da revisão KURIO

Data de referência: 15/11/2026. Validação local do build de produção, com MSW e Socket.IO simulados habilitados. Os 15 PNGs em `Exemplos/` foram inspecionados: nove telas desktop e seis mobile. A revisão cobre início, detalhe, carrinho, pagamento, confirmação, login, cadastro, perfil e carteiras.

## Ambiente e reprodução

- Windows, Node.js 24.22.1; Vite 6.4.6; React 19.3.1; TypeScript 5.9.3.
- Playwright 1.65.0, Chromium através do Google Chrome instalado. A configuração também aceita o browser instalado pelo Playwright e o executável local de auditoria.
- Lighthouse 12.8.2; a versão do navegador e o ambiente detalhado ficam em `lighthouse/summary.json`.
- Aplicação auditada em `http://127.0.0.1:4175`, servida por `vite preview` após `npm run build`.
- Os comandos do Vite usam o carregador de configuração `runner`, evitando a necessidade de o esbuild percorrer diretórios superiores neste ambiente restrito do Windows.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run lint
npm.cmd run test:e2e
npm.cmd run audit
```

Para testar uma prévia já ativa, defina `BASE_URL`; para auditá-la, defina `AUDIT_URL`. Sem essas variáveis, os scripts iniciam suas próprias prévias. No Windows com política de execução de scripts restrita, use `npm.cmd`/`npx.cmd`.

## Evidências

- Build com verificação TypeScript: aprovado.
- Instalação limpa pelo lockfile (`npm.cmd ci`): aprovada.
- ESLint: aprovado.
- Playwright, rodada consolidada final: **63 testes aprovados em 2,1 minutos**, sem retries: 54 cenários funcionais, seis verificações de responsividade/alinhamento e três de regressão visual. O teste de alinhamento compara a posição de imagens e preços de todas as duplas de cards e verifica overflow das abas e paginação em 390 e 400 px.
- Conferência manual de compra completa em 1440 e 390 px: pedido confirmado, sem erros JavaScript nem overflow.
- Conferência manual de login, cadastro, perfil e carteiras em 390, 768 e 1440 px: sem erros JavaScript nem overflow.
- Responsividade automatizada: as nove telas, incluindo recibo após compra, passaram nos três tamanhos e com zoom de 200%.
- Doze baselines de início, detalhe, carrinho e pagamento foram atualizadas após inspeção visual. A rodada completa subsequente compara o build com essas baselines sem atualização.
- O relatório HTML versionado da rodada local fica em [e2e/local/index.html](e2e/local/index.html). Novas execuções geram `../playwright-report/index.html`; screenshots/traces de falhas ficam em `../test-results/`.

A rodada anterior revelou uma corrida no helper de testes após refresh: o fetch podia ocorrer antes de `worker.start()`. O helper agora aguarda a montagem da aplicação, que só ocorre após a ativação do MSW. A correção foi confirmada na rodada consolidada acima. A análise detalhada dos gaps funcionais corrigidos fica em [requirements-audit.md](requirements-audit.md).

Lighthouse: **12 medições concluídas diretamente na URL pública**, três por página/perfil. Performance mobile: **94 no início e 93 no detalhe**; desktop, acessibilidade, boas práticas e SEO: **100**. CLS mobile: zero. Todas as metas foram atingidas. Os relatórios HTML/JSON e as condições estão em [performance.md](performance.md).

A rodada inicial desta conclusão passou em 59 dos 60 testes e identificou uma baseline mobile do detalhe com miniaturas de 58 px, enquanto o CSS implementado define 45 px. Após comparar a captura esperada, a atual, o diff e o exemplo mobile, somente `tests/baselines/mobile/detail.png` foi atualizada. O teste visual mobile passou na repetição e a rodada completa seguinte passou em todos os 60 testes. O [diff da falha inicial](e2e/initial-visual-failure/detail-diff.png) foi versionado. O trace completo permanece somente no checkout local, em `reports/e2e/initial-visual-failure/trace.zip`, excluído do Git: a revisão automática bloqueou sua publicação pelo risco de traces conterem dados de sessão. Novas execuções com falha geram seus próprios traces em `test-results/`.

Os relatórios HTML aprovados foram inspecionados antes da publicação: seus arquivos de dados contêm resultados JSON, sem anexos, cookies, cabeçalhos de autorização ou campos de tokens de sessão. As auditorias Lighthouse usam visitante e armazenamento limpo.

O servidor de testes usa `build()` e `preview()` do Vite no mesmo processo. Isso elimina o subprocesso Vite que podia sobreviver ao encerramento do wrapper no Windows. A rodada final encerrou automaticamente o servidor e retornou código zero; execuções anteriores no sandbox restrito precisaram de encerramento explícito dos processos pertencentes ao teste.

## Publicação verificada

- Aplicação pública: [challengejungle.vercel.app](https://challengejungle.vercel.app).
- Código-fonte: [RuasCardi/Challenge-Jungle](https://github.com/RuasCardi/Challenge-Jungle).
- Runtime verificado: commit `e17db2930fb96cce320b494cb4c8d1e133d95ddc`, publicado em produção pela integração Git da Vercel. Deployment `dpl_6BpTaYbtHu2G68AhTpVQDu4jbHhV`, estado **READY**, com o mesmo SHA confirmado na plataforma.
- **16 testes funcionais públicos aprovados em 31,6 s**, sem retries: oito cenários em desktop/mobile, cobrindo cadastro/conflito, detalhe direto/404, compra e recibo imutável, duplo clique/pendência/reconexão/refresh, eventos de preço/estoque, teclado/foco de diálogos e alinhamento/overflow mobile. Evidência: [relatório HTML de produção](e2e/production/index.html).
- **Smoke público aprovado** em desktop/mobile: HTTPS e HTTP 200 no início, detalhe direto e refresh; Service Worker controlador ativo; REST respondido pelo MSW; cliente Socket.IO inscrito; fontes e imagens decodificadas; nenhum erro JavaScript nem falha de asset. Evidência: [production-smoke.json](production-smoke.json).
- O smoke aguarda fontes e imagens antes de navegar e registra cancelamentos de requests separadamente de falhas reais. O primeiro ensaio havia contado cancelamentos de imagens durante a própria navegação do script como erro; o carregamento e a decodificação foram confirmados na repetição.

Para reproduzir a infraestrutura pública, execute `npm.cmd run test:production`. Para repetir os testes funcionais contra a publicação, defina `$env:BASE_URL='https://challengejungle.vercel.app'` antes de `npm.cmd run test:e2e`. O relatório salvo acima corresponde ao subconjunto de 16 fluxos descrito; a suíte local completa contém 63 testes.

O deslocamento de 32 px dos cards pares foi removido. Os títulos reservam duas linhas para que os preços fiquem alinhados, inclusive quando um nome quebra de linha. As abas e a paginação cabem em 390/400 px. O recorte por arte foi aplicado globalmente, alcançando os três estados do destaque, miniaturas, galeria, relacionados, carrinho e checkout. Foram inspecionadas capturas em 400 e 1440 px, além das baselines nos três viewports. As molduras extras do detalhe e dos relacionados também foram removidas.

## Limites e itens da entrega

- As capturas de regressão testam consistência da implementação. Não representam equivalência pixel a pixel aos PNGs. A fonte exata, medidas e assets separados do arquivo Figma não foram confirmados; foram usadas as artes locais existentes e Roboto Mono com licença OFL.
- Busca, filtros, quantidades, estados de estoque, conexão de carteira e revisão acrescentam controles necessários aos frames estáticos. Perfil/carteiras/recibo têm adaptações mobile próprias. Os desvios estão em `ARCHITECTURE.md`.
- Toda compra, autenticação e transação é simulada. Páginas editoriais e ações auxiliares fora do escopo exibem essa limitação, sem fingir conclusão funcional.
- A tabela de nove critérios foi mapeada para suas evidências em [criteria.md](criteria.md). As notas finais de fidelidade e qualidade pertencem à banca; não se atribui uma nota total presumida.
