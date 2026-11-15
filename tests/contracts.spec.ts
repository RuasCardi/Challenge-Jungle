import { test, expect, type Page } from "@playwright/test";
import { add, control, login, readApi, ready, review } from "./helpers";

async function sendApi(
  page: Page,
  path: string,
  method: string,
  body: unknown,
) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const token = localStorage.getItem("novanft-token");
      const response = await fetch(`/api/${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      return { status: response.status, data: await response.json() };
    },
    { path, method, body },
  );
}

test.beforeEach(async ({ page }) => ready(page));

test("catálogo tem quatro páginas, facetas reais e filtros combinados", async ({
  page,
}) => {
  const catalog = (await readApi(page, "nfts")).data;
  expect(catalog.total).toBe(36);
  expect(catalog.pages).toBe(4);
  expect(catalog.items).toHaveLength(9);
  expect(
    Object.values(catalog.categoryCounts).reduce(
      (sum: number, count) => sum + Number(count),
      0,
    ),
  ).toBe(36);
  expect(
    Object.values(catalog.networkCounts).reduce(
      (sum: number, count) => sum + Number(count),
      0,
    ),
  ).toBe(36);

  await page.goto(
    "/?network=Polygon&maxPrice=0.5&tab=new&sort=price-asc&page=1",
  );
  await expect(page.locator(".nftcard h3")).toHaveText([
    "Jungle Pass #01",
    "Ocean Song",
    "Galaxy Spheres",
    "Infinite River",
  ]);
  await page.reload();
  await expect(page.locator(".nftcard h3").first()).toHaveText(
    "Jungle Pass #01",
  );
  const invalid = await readApi(page, "nfts?minPrice=1&maxPrice=0.1");
  expect(invalid.status).toBe(422);
  expect((await readApi(page, "nfts?maxPrice=NaN")).status).toBe(422);
  await page.goto(
    "/?minPrice=0.123456789123456789&maxPrice=0.123456789123456789",
  );
  await expect(page.locator(".nftcard h3")).toHaveText(["Starlight #12"]);
  await page.reload();
  await expect(page.locator(".nftcard h3")).toHaveText(["Starlight #12"]);
});

test("perfil persiste usuário ENS e apelido e valida conflitos", async ({
  page,
}) => {
  await login(page);
  const result = await sendApi(page, "profile", "PATCH", {
    name: "João Silva",
    email: "demo@nft.com",
    username: "@joao.teste",
    ensName: "joao-teste.eth",
    walletNickname: "Minha principal",
  });
  expect(result.status).toBe(200);
  await page.reload();
  const profile = (await readApi(page, "profile")).data;
  expect(profile.username).toBe("joao.teste");
  expect(profile.ensName).toBe("joao-teste.eth");
  expect(profile.walletNickname).toBe("Minha principal");
  expect(
    profile.wallets.find((wallet: { primary: boolean }) => wallet.primary)
      .ensName,
  ).toBe("joao-teste.eth");
  const conflict = await sendApi(page, "profile", "PATCH", {
    name: "João Silva",
    email: "demo@nft.com",
    username: "mariasantos",
  });
  expect(conflict.status).toBe(409);
  expect(conflict.data.fields.username).toContain("já está em uso");
  const invalid = await sendApi(page, "profile", "PATCH", {
    name: "João Silva",
    email: "demo@nft.com",
    ensName: "inválido",
  });
  expect(invalid.status).toBe(422);
});

test("idempotência recupera pedido e rejeita conteúdo diferente", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await control(page, "scenario", { name: "pending" });
  await review(page);
  const requestPromise = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().endsWith("/api/orders"),
  );
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  const initial = await requestPromise;
  await expect(
    page.getByRole("heading", { name: "Pagamento pendente" }),
  ).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  const result = await page.evaluate(
    async ({ body, key }) => {
      const token = localStorage.getItem("novanft-token");
      const headers = {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        Authorization: `Bearer ${token}`,
      };
      const retry = await fetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const conflict = await fetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...body,
          collector: { ...body.collector, name: "Outro nome" },
        }),
      });
      return {
        retry: await retry.json(),
        conflictStatus: conflict.status,
        conflict: await conflict.json(),
      };
    },
    { body: initial.postDataJSON(), key: initial.headers()["idempotency-key"] },
  );
  expect(result.retry.id).toBe(id);
  expect(result.conflictStatus).toBe(409);
  expect(result.conflict.code).toBe("IDEMPOTENCY_CONFLICT");
  expect((await readApi(page, "orders")).data).toHaveLength(1);
});

test("Socket.IO rejeita identidade inconsistente sem bloquear eventos válidos", async ({
  page,
}) => {
  await page.goto("/nft/cyber-ape");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  const current = (await readApi(page, "nfts/cyber-ape")).data;
  await control(page, "event", {
    type: "nft.updated",
    event: {
      eventId: "mismatched-resource",
      resourceId: current.id,
      version: 100,
      data: {
        ...current,
        id: "neon-cat",
        name: "Identidade incorreta",
        version: 100,
      },
    },
  });
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await control(page, "nft", { id: "cyber-ape", price: "1.22" });
  await expect(page.getByText("1,22 ETH", { exact: true })).toBeVisible();
});
