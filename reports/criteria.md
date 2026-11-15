# Conferência da tabela de avaliação

Os pesos abaixo são os fornecidos no desafio. A avaliação final pertence à banca; as evidências não representam uma nota atribuída por esta implementação.

| Critério | Pontos | Evidência |
| --- | ---: | --- |
| Fidelidade visual e responsividade | 20 | 15 referências locais em `Exemplos/`; testes em 390/768/1440; baselines de início, detalhe, carrinho e pagamento. A revisão dos cards remove moldura externa e recorta a borda embutida nas imagens, sem substituir as artes. Não se afirma equivalência pixel a pixel ao Figma. |
| Fluxos e experiência de uso | 20 | [Compra](../tests/flows.spec.ts), [conta](../tests/account.spec.ts), [carrinho e falhas](../tests/catalog-cart.spec.ts). |
| Integração e estado | 15 | [Router](../src/ui.tsx), [Query/cache](../src/queries.ts), [Axios](../src/api.ts), [contratos](../src/data.ts). |
| Tempo real | 10 | [Socket.IO](../src/realtime.tsx), [testes de eventos, versões e reconexão](../tests/realtime-checkout.spec.ts). |
| Mocking | 10 | [MSW REST e Socket.IO](../src/mocks.ts), [fixtures, persistência e cenários](../src/store.ts), controles no rodapé. |
| Testes | 10 | [Relatório local](e2e/local/index.html), [baselines](../tests/baselines), [configuração](../playwright.config.ts). |
| Acessibilidade | 5 | Testes de teclado, foco e formulários; diálogos Radix preservados, carregados ao abrir; auditorias de acessibilidade. |
| Performance | 5 | [12 medições Lighthouse e análise](performance.md). A prévia negocia Brotli para os mesmos arquivos JS/CSS completos, como a Vercel; nenhuma funcionalidade é removida na medição. |
| Arquitetura e documentação | 5 | [Arquitetura](../ARCHITECTURE.md), [execução e credenciais fictícias](../README.md), [validação](VALIDATION.md). |
| Total | 100 | Evidências distribuídas entre código, testes, capturas e relatórios. |
