import { test, expect } from "@playwright/test";
import { add, login, ready, review } from "./helpers";
test("regressão visual de início, detalhe, carrinho e pagamento", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("home.png", { fullPage: true });
  await add(page);
  await expect(page).toHaveScreenshot("detail.png", { fullPage: true });
  await page.goto("/cart");
  await expect(page.getByText("0,87 ETH", { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot("cart.png", { fullPage: true });
  await login(page);
  await review(page);
  await expect(page).toHaveScreenshot("checkout.png", { fullPage: true });
});
