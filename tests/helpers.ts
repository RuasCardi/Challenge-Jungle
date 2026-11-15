import { expect, type Page } from "@playwright/test";
export async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Descubra NFTs" }),
  ).toBeVisible();
  await expect(page.locator(".nftcard")).toHaveCount(9);
  await expect(
    page.getByRole("status").filter({ hasText: "Atualizações em tempo real" }),
  ).toBeVisible();
}
export async function control(page: Page, action: string, body: unknown = {}) {
  // The app mounts only after worker.start(); navigation load alone isn't enough.
  await expect(page.locator("main")).toBeVisible();
  return page.evaluate(
    async ({ action, body }) => {
      const token = localStorage.getItem("novanft-token");
      const r = await fetch(`/api/testing/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw Error(await r.text());
      return r.json();
    },
    { action, body },
  );
}
export async function readApi(page: Page, path: string) {
  return page.evaluate(async (path) => {
    const token = localStorage.getItem("novanft-token");
    const r = await fetch(`/api/${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return { status: r.status, data: await r.json() };
  }, path);
}
export async function login(
  page: Page,
  email = "demo@nft.com",
  password = "Demo123!",
) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/profile/);
}
export async function add(page: Page, id = "cyber-ape") {
  await page.goto(`/nft/${id}`);
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "NFT adicionado" }),
  ).toBeVisible();
}
export async function review(page: Page) {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await expect(
    page.getByText("Carteira conectada à rede selecionada."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revisar pedido", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeEnabled();
}
