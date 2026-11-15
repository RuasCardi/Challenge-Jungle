# Validação da revisão KURIO

Data de referência: 15/11/2026. Validação local do build de produção, com MSW e Socket.IO simulados habilitados. Os 15 PNGs em `Exemplos/` foram inspecionados: nove telas desktop e seis mobile. A revisão cobre início, detalhe, carrinho, pagamento, confirmação, login, cadastro, perfil e carteiras.

## Ambiente e reprodução

- Windows, Node.js 24.22.1; Vite 6.4.6; React 19.3.1; TypeScript 5.9.3.
- Playwright 1.65.0, Chromium através do Google Chrome instalado. A configuração também aceita o browser instalado pelo Playwright e o executável local de auditoria.
- Lighthouse 12.8.2; a versão do navegador e o ambiente detalhado ficam em `lighthouse/summary.json`.
- Aplicação auditada em `http://127.0.0.1:5180`, servida por `vite preview` após `npm run build`.
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
- ESLint: aprovado.
- Playwright, rodada consolidada final: **60 testes aprovados em 2,2 minutos**, sem retries. Inclui 27 cenários funcionais em desktop e mobile, três verificações de responsividade e três de regressão visual (quatro imagens por viewport).
- Conferência manual de compra completa em 1440 e 390 px: pedido confirmado, sem erros JavaScript nem overflow.
- Conferência manual de login, cadastro, perfil e carteiras em 390, 768 e 1440 px: sem erros JavaScript nem overflow.
- Responsividade automatizada: as nove telas, incluindo recibo após compra, passaram nos três tamanhos e com zoom de 200%.
- Doze baselines de início, detalhe, carrinho e pagamento foram atualizadas após inspeção visual. A rodada completa subsequente compara o build com essas baselines sem atualização.
- O relatório HTML de execução fica em `../playwright-report/index.html`; screenshots/traces de falhas em `../test-results/`.

A rodada anterior revelou uma corrida no helper de testes após refresh: o fetch podia ocorrer antes de `worker.start()`. O helper agora aguarda a montagem da aplicação, que só ocorre após a ativação do MSW. A correção foi confirmada na rodada consolidada acima. A análise detalhada dos gaps funcionais corrigidos fica em [requirements-audit.md](requirements-audit.md).

As medianas Lighthouse são registradas ao final das 12 medições em [performance.md](performance.md).

## Limites e itens da entrega

- As capturas de regressão testam consistência da implementação. Não representam equivalência pixel a pixel aos PNGs. A fonte exata, medidas e assets separados do arquivo Figma não foram confirmados; foram usadas as artes locais existentes e Roboto Mono com licença OFL.
- Busca, filtros, quantidades, estados de estoque, conexão de carteira e revisão acrescentam controles necessários aos frames estáticos. Perfil/carteiras/recibo têm adaptações mobile próprias. Os desvios estão em `ARCHITECTURE.md`.
- Toda compra, autenticação e transação é simulada. Páginas editoriais e ações auxiliares fora do escopo exibem essa limitação, sem fingir conclusão funcional.
- O README do desafio exige link de repositório e URL pública. Esta revisão não cria commit/push nem publica em conta externa; a publicação e sua validação pública permanecem pendentes.
