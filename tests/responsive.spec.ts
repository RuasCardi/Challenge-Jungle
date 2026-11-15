import { test, expect } from "@playwright/test";
import { add, login, ready, review } from "./helpers";
test("telas em 390, 768 e 1440 sem overflow, incluindo endereço longo", async ({
  page,
}) => {
  await ready(page);
  await login(page);
  await add(page);
  for (const path of [
    "/",
    "/nft/cyber-ape",
    "/cart",
    "/checkout",
    "/profile",
    "/wallets",
    "/login",
    "/signup",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      path,
    ).toBe(true);
  }
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado!" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.locator("body").evaluate((el) => {
    el.style.zoom = "2";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
