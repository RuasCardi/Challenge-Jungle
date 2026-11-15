import { test, expect } from "@playwright/test";
import { add, control, login, readApi, ready, review } from "./helpers";
test.beforeEach(async ({ page }) => ready(page));
test("busca, filtros combinados, ordenação, paginação e histórico", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page
    .getByLabel("Categoria", { exact: true })
    .selectOption("Arte digital");
  await expect(page).toHaveURL(/page=1/);
  await page.getByLabel("Coleção", { exact: true }).selectOption("Cosmic Art");
  await page.getByLabel("Ordenação").selectOption("price-asc");
  await expect(page.locator(".nftcard h3").first()).toHaveText("Starlight #12");
  await expect(page.locator(".nftcard")).toHaveCount(3);
  const filtered = page.url();
  await page.getByLabel("Buscar NFTs").fill("inexistente");
  await expect(
    page.getByText("Nenhum NFT encontrado.", { exact: false }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(filtered);
  await page.reload();
  await expect(page.getByLabel("Coleção", { exact: true })).toHaveValue(
    "Cosmic Art",
  );
  await expect(page.locator(".nftcard")).toHaveCount(3);
});
test("respostas obsoletas não substituem busca atual", async ({ page }) => {
  await control(page, "scenario", { name: "variable" });
  await page.getByLabel("Buscar NFTs").fill("g");
  await page.getByLabel("Buscar NFTs").fill("Neon Cat");
  await expect(page.locator(".nftcard h3")).toHaveText("Neon Cat #1337");
  await page.waitForTimeout(1300);
  await expect(page.locator(".nftcard h3")).toHaveText("Neon Cat #1337");
});
test("detalhe direto, galeria, edição esgotada, limite e 404", async ({
  page,
}) => {
  await page.goto("/nft/cyber-ape");
  await page.getByRole("button", { name: "Ver imagem 2" }).click();
  await expect(page.locator(".detailart img")).toHaveAttribute(
    "src",
    "/assets/ape-sage.webp",
  );
  await page.getByLabel("Edição", { exact: true }).selectOption("limited");
  await expect(
    page.getByRole("button", { name: "Edição esgotada" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Comprar agora" }),
  ).toBeDisabled();
  await page.getByLabel("Edição", { exact: true }).selectOption("standard");
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Aumentar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Aumentar", exact: true }),
  ).toBeDisabled();
  await page.goto("/nft/ausente");
  await expect(
    page.getByRole("heading", { name: "NFT não encontrado" }),
  ).toBeVisible();
  await page.goto("/rota-inexistente");
  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
});
test("favorito otimista reverte falha e persiste ao recuperar", async ({
  page,
}) => {
  await login(page);
  await page.goto("/nft/cyber-ape");
  await control(page, "scenario", {
    name: "favorite-error",
    overrides: { latency: 700 },
  });
  const heart = page.getByRole("button", {
    name: "Adicionar favorito",
    exact: true,
  });
  await heart.click();
  await expect(
    page.getByRole("button", { name: "Remover favorito", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível salvar",
  );
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await heart.click();
  await expect(
    page.getByRole("button", { name: "Remover favorito", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remover favorito", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("carrinho, cupom, quantidades, remoção, refresh e login", async ({
  page,
}) => {
  await add(page);
  await page.goto("/cart");
  await page.getByRole("button", { name: "Aumentar Emerald Ape #042" }).click();
  await expect(page.locator(".quantity>span")).toHaveText("2");
  await page.getByLabel("Cupom de desconto").fill("INVALIDO");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Cupom inválido.");
  await page.getByLabel("Cupom de desconto").fill("EXPIRED");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Cupom expirado.");
  await page.getByLabel("Cupom de desconto").fill("NFT10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByText("2,162 ETH", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".quantity>span")).toHaveText("2");
  await login(page);
  await page.goto("/cart");
  await expect(page.locator(".quantity>span")).toHaveText("2");
  await page
    .getByRole("button", { name: "Cupom NFT10 aplicado · remover" })
    .click();
  await expect(page.getByText("2,40 ETH", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Diminuir Emerald Ape #042" }).click();
  await expect(page.getByText("1,21 ETH", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remover Emerald Ape #042" }).click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("ETH conserva precisão de 18 casas", async ({ page }) => {
  await add(page, "starlight");
  await page.goto("/cart");
  await expect(
    page.getByText("0,143456789123456789 ETH", { exact: true }),
  ).toBeVisible();
  const q = (await readApi(page, "quote")).data;
  expect(q.subtotal).toBe("0.123456789123456789");
  expect(q.total).toBe("0.143456789123456789");
});
test("skeletons, erro HTTP e recuperação", async ({ page }) => {
  await control(page, "scenario", { name: "slow" });
  await page.getByLabel("Buscar NFTs").fill("Galaxy");
  await expect(page.locator(".loading-catalog")).toBeVisible();
  await expect(page.locator(".nftcard h3")).toHaveText("Galaxy Spheres");
  await page.goto("/nft/galaxy");
  await expect(page.locator(".loading-detail")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Galaxy Spheres" }),
  ).toBeVisible();
  await control(page, "scenario", { name: "server-error" });
  await page.goto("/nft/void");
  await expect(page.getByRole("alert")).toContainText(
    "temporariamente indisponível",
  );
  await control(page, "scenario", { name: "success" });
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Void Walker" }),
  ).toBeVisible();
});
test("falha de conexão e retomada", async ({ page }) => {
  await control(page, "scenario", { name: "offline" });
  await page.getByLabel("Buscar NFTs").fill("Galaxy");
  await expect(page.getByRole("alert")).toContainText("Sem conexão");
  await control(page, "scenario", { name: "success" });
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.locator(".nftcard h3")).toHaveText("Galaxy Spheres");
});
test("preço ao confirmar exige aceitar nova cotação", async ({ page }) => {
  await login(page);
  await add(page);
  await review(page);
  await control(page, "scenario", { name: "price-changed" });
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Aceitar nova cotação" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeDisabled();
  expect((await readApi(page, "orders")).data).toHaveLength(0);
  await page.getByRole("button", { name: "Aceitar nova cotação" }).click();
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado!" }),
  ).toBeVisible();
  await expect(page.getByText("1,31 ETH", { exact: true })).toBeVisible();
});
