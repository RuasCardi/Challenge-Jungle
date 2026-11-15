import { test, expect } from "@playwright/test";
import { add, control, readApi, ready, review } from "./helpers";
test.beforeEach(async ({ page }) => ready(page));
test("compra completa e recibo imutável", async ({ page }) => {
  await add(page);
  await page.getByLabel("Abrir carrinho").click();
  await page.getByRole("link", { name: "Finalizar compra" }).click();
  await expect(page).toHaveURL(/login.*redirect/);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado!" }),
  ).toBeVisible();
  await expect(page.getByText("0,87 ETH", { exact: true })).toBeVisible();
  const url = page.url();
  await control(page, "nft", { id: "cyber-ape", price: "7.25" });
  await page.reload();
  await expect(page.getByText("0,87 ETH", { exact: true })).toBeVisible();
  expect((await readApi(page, "cart")).data).toHaveLength(0);
  expect(
    (await readApi(page, "nfts/cyber-ape")).data.editions[0].available,
  ).toBe(4);
  await page.goto(url);
  await expect(
    page.getByText("Cyber Ape #4821", { exact: false }),
  ).toBeVisible();
});
