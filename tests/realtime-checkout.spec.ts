import { test, expect } from "@playwright/test";
import { add, control, login, readApi, ready, review } from "./helpers";
test.beforeEach(async ({ page }) => {
  await ready(page);
  await login(page);
  await add(page);
});
test("pagamento recusado preserva itens e devolve reserva", async ({
  page,
}) => {
  await control(page, "scenario", { name: "declined" });
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado" }),
  ).toBeVisible();
  expect((await readApi(page, "cart")).data).toHaveLength(1);
  expect(
    (await readApi(page, "nfts/cyber-ape")).data.editions[0].available,
  ).toBe(5);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado" }),
  ).toBeVisible();
});
test("duplo clique, pendência, reconexão e refresh não duplicam compra", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-14T12:00:00Z"));
  await control(page, "scenario", { name: "pending" });
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .evaluate((el) => {
      (el as HTMLButtonElement).click();
      (el as HTMLButtonElement).click();
    });
  await expect(
    page.getByRole("heading", { name: "Pagamento pendente" }),
  ).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  await control(page, "disconnect");
  await expect(
    page.getByRole("status").filter({ hasText: "Reconectando" }),
  ).toContainText("Reconectando");
  await expect(
    page.getByRole("status").filter({ hasText: "Atualizações em tempo real" }),
  ).toContainText("Atualizações em tempo real");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pagamento pendente" }),
  ).toBeVisible();
  await control(page, `settle/${id}`);
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado!" }),
  ).toBeVisible();
  expect((await readApi(page, "orders")).data).toHaveLength(1);
});
test("timeout após criação recupera a mesma tentativa após refresh", async ({
  page,
}) => {
  await control(page, "scenario", { name: "timeout" });
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("A resposta demorou", {
    timeout: 15000,
  });
  await page.reload();
  await page.getByRole("button", { name: "Recuperar pedido" }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado!" }),
  ).toBeVisible();
  expect((await readApi(page, "orders")).data).toHaveLength(1);
});
test("Socket.IO altera preço, ignora duplicatas e versões antigas", async ({
  page,
}) => {
  await review(page);
  const before = (await readApi(page, "nfts/cyber-ape")).data;
  await control(page, "nft", { id: "cyber-ape", price: "0.95" });
  await expect(page.getByText("0,97 ETH", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeDisabled();
  const current = (await readApi(page, "nfts/cyber-ape")).data;
  const event = {
    eventId: "duplicate-nft",
    resourceId: current.id,
    version: current.version,
    data: current,
  };
  await control(page, "event", { type: "nft.updated", event });
  await control(page, "event", { type: "nft.updated", event });
  await control(page, "event", {
    type: "nft.updated",
    event: {
      eventId: "old-nft",
      resourceId: before.id,
      version: before.version,
      data: before,
    },
  });
  await expect(page.getByText("0,97 ETH", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Aceitar nova cotação" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeEnabled();
});
test("Socket.IO esgota edição e bloqueia confirmação", async ({ page }) => {
  await review(page);
  await control(page, "nft", { id: "cyber-ape", available: 0 });
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "apenas 0 unidades disponíveis" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeDisabled();
  expect((await readApi(page, "orders")).data).toHaveLength(0);
});
test("pedido terminal ignora evento antigo e só remove itens comprados", async ({
  page,
}) => {
  await control(page, "scenario", { name: "pending" });
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pagamento pendente" }),
  ).toBeVisible();
  const url = page.url();
  const id = url.split("/").at(-1)!;
  const pending = (await readApi(page, `orders/${id}`)).data;
  await add(page, "neon-cat");
  await control(page, `settle/${id}`);
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado!" }),
  ).toBeVisible();
  await control(page, "event", {
    type: "order.updated",
    event: {
      eventId: "old-order",
      resourceId: id,
      version: pending.version,
      data: pending,
      userId: "demo",
    },
  });
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado!" }),
  ).toBeVisible();
  const cart = (await readApi(page, "cart")).data;
  expect(cart).toHaveLength(1);
  expect(cart[0].id).toBe("neon-cat");
});
test("conexão de carteira recusada, desconexão e rede incompatível", async ({
  page,
}) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Simular recusa" }).click();
  await expect(page.getByRole("alert")).toContainText("Conexão recusada");
  await expect(
    page.getByRole("button", { name: "Revisar pedido" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Desconectar carteira", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Revisar pedido" }),
  ).toBeDisabled();
  await page.getByLabel("Rede de pagamento").selectOption("Polygon");
  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("rede cadastrada");
});
