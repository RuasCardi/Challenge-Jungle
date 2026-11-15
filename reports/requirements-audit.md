# Conferência dos requisitos do desafio

Documento de referência: `C:/Users/gui_r/Downloads/README.md` fornecido pelo usuário. A conferência abaixo distingue a inspeção de código dos resultados de testes executados.

## Lacunas encontradas e corrigidas

- **Catálogo sem variedade suficiente:** havia somente nove NFTs da mesma coleção/categoria, impedindo exercitar paginação e filtros combinados. A simulação agora contém 36 NFTs em quatro páginas, nove categorias e diferentes coleções/redes, preservando os nove itens iniciais e sua ordem.
- **Filtros apenas visuais:** a API passou a aceitar `network` (redes separadas por vírgula), `minPrice`, `maxPrice` e `tab` (`all`, `new`, `trending`). Preços recebem validação decimal; a comparação usa Decimal. `categoryCounts` e `networkCounts` retornam contagens das fixtures, substituindo números inventados. O estado da interface é integrado à URL.
- **Campos de conta sem persistência:** contratos e mocks agora persistem usuário, ENS e apelido de carteira no perfil, com mensagens de validação e conflito de usuário. ENS/apelido ficam sincronizados com a carteira principal. Carteiras também aceitam endereço secundário opcional, validado como endereço hexadecimal ou ENS.
- **Recuperação de sessão expirada:** a consulta de sessão com um token inválido agora responde 401, acionando o mesmo tratamento de expiração das demais rotas privadas.
- **Identidade dos eventos:** o cliente Socket.IO rejeita eventos cuja identidade do recurso difere do payload, versões inválidas e pedidos pertencentes a outro usuário, antes de alterar cache ou versão conhecida.
- **Endpoint configurável de Socket.IO:** o handler MSW usa `VITE_SOCKET_URL` e converte seu protocolo para WebSocket, acompanhando a configuração usada pelo cliente.
- **Expectativas antigas dos testes:** os fluxos funcionais passaram a usar os nomes, imagens e valores atuais das fixtures (Emerald Ape, 1,19 ETH; total padrão 1,21 ETH). O teste de senha consulta o banco realmente utilizado e verifica que esse banco existe.

## Requisitos já presentes na implementação inspecionada

- React/TypeScript, TanStack Router/Query, Axios, Tailwind, componentes derivados de shadcn/Radix, MSW e `socket.io-client` têm uso efetivo.
- Mocks REST e Socket.IO usam a mesma persistência; eventos passam pelo protocolo Socket.IO via `@mswjs/socket.io-binding`.
- Sessões e dados privados usam escopo de token; logout e troca de usuário cancelam consultas e removem cache privado.
- Favoritos têm atualização otimista, rollback e cenário de falha reproduzível.
- Valores monetários são strings e cálculos usam Decimal; existe fixture com 18 casas decimais.
- Checkout revalida uma cotação canônica. Mudança de preço, estoque, cupom ou taxa impede confirmar uma cotação antiga.
- Pedidos têm chave de idempotência, snapshot de recibo, estados pendente/confirmado/recusado e recuperação após refresh/timeout.
- A confirmação remove somente itens e quantidades comprados; pagamento recusado preserva o carrinho e devolve a reserva.
- Versões e IDs descartam eventos antigos/duplicados; reconexão invalida recursos ativos para reconciliar com REST.
- Cenários de rede lenta, falha de conexão/HTTP, erro de favorito, recusa, timeout, pendência e alterações durante envio estão disponíveis nos mocks.

## Verificação e evidências

- `npm.cmd run typecheck`: aprovado após alterações nos contratos/mocks/testes.
- ESLint dos arquivos de contratos, mocks, realtime e testes alterados: aprovado.
- `tests/contracts.spec.ts` acrescenta cobertura pela rede MSW para facetas/paginação/filtros, persistência e validação de perfil, replay/conflito de idempotência e identidade inconsistente de evento Socket.IO. Resultados de execução devem ser consultados no relatório Playwright da rodada final.
- Os demais arquivos de testes cobrem compra, conta, carrinho, sessão, favoritos, falhas e eventos; a cobertura só representa validação executada quando acompanhada de relatório da rodada final.
- Na integração desta revisão, a primeira rodada efetiva executou 54 testes funcionais em desktop/mobile: 42 passaram. As falhas revelaram seletores antigos e um erro real no parser da URL, que descartava filtros decimais. Após correções, 11 dos 12 cenários repetidos passaram; o último teste mobile de logout passou na execução seguinte, após aguardar a navegação e consultar a sessão em vez de depender de um link oculto no mobile. Todos os 54 cenários tiveram aprovação nesse conjunto de execuções. O relatório consolidado da rodada final, incluindo responsividade e regressão visual, é produzido separadamente.
- O parser/stringifier da URL agora mantém preços decimais como strings; o teste confere `minPrice=maxPrice=0.123456789123456789` e a mesma seleção após refresh.

## Pendências de evidência da entrega

- A aderência visual deve ser verificada contra os 15 PNGs de `Exemplos/`, inclusive nos viewports 390/768/1440. Screenshots de regressão são baselines da implementação; não comprovam sozinhos fidelidade aos exemplos.
- As metas Lighthouse exigem três medições de início e detalhe em desktop/mobile e relatórios HTML/JSON. Ter o script de auditoria não equivale a comprovar as metas.
- O documento de referência exige repositório e URL pública. A inspeção e as correções locais não comprovam uma publicação acessível nem autorizam, por si sós, publicar em uma conta externa.
- Imagens substitutas precisam continuar identificadas na documentação caso os assets originais dos exemplos não estejam disponíveis separadamente.
