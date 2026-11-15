import { test, expect } from "@playwright/test";
import { add, login, ready, review } from "./helpers";
test("cards mobile alinham imagens e preços em 390 e 400 pixels", async ({
  page,
}) => {
  await ready(page);
  for (const width of [390, 400]) {
    await page.setViewportSize({ width, height: 866 });
    await page.evaluate(() => document.fonts.ready);
    const cards = page.locator(".catalog .nftcard");
    for (const first of [0, 2, 4, 6]) {
      const left = await cards.nth(first).locator(".nftcard-art").boundingBox();
      const right = await cards
        .nth(first + 1)
        .locator(".nftcard-art")
        .boundingBox();
      expect(
        Math.abs(left!.y - right!.y),
        `imagens ${first}/${first + 1} em ${width}px`,
      ).toBeLessThan(1);
      const leftPrice = await cards
        .nth(first)
        .locator(".cardbottom")
        .boundingBox();
      const rightPrice = await cards
        .nth(first + 1)
        .locator(".cardbottom")
        .boundingBox();
      expect(
        Math.abs(leftPrice!.y - rightPrice!.y),
        `preços ${first}/${first + 1} em ${width}px`,
      ).toBeLessThan(1);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
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
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(
      page.locator(
        ".loading-form,.loading-detail,.loading-summary,.loading-catalog",
      ),
    ).toHaveCount(0);
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
