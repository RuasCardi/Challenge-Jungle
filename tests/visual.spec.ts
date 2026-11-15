import { test, expect, type Page } from "@playwright/test";
import { add, login, ready, review } from "./helpers";
async function stableAssets(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images, async (image) => {
        image.loading = "eager";
        await image.decode().catch(() => {});
      }),
    );
  });
}
test("regressão visual de início, detalhe, carrinho e pagamento", async ({
  page,
}) => {
  await ready(page);
  await stableAssets(page);
  await expect(page).toHaveScreenshot("home.png", { fullPage: true });
  await add(page);
  await expect(page.locator(".related-card")).toHaveCount(5);
  await stableAssets(page);
  await expect(page).toHaveScreenshot("detail.png", { fullPage: true });
  await page.goto("/cart");
  await expect(page.getByText("1,21 ETH", { exact: true })).toBeVisible();
  await stableAssets(page);
  await expect(page).toHaveScreenshot("cart.png", { fullPage: true });
  await login(page);
  await review(page);
  await stableAssets(page);
  await expect(page).toHaveScreenshot("checkout.png", { fullPage: true });
});
