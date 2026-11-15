import { test, expect } from "@playwright/test";
import { add, control, login, readApi, ready, review } from "./helpers";
test.beforeEach(async ({ page }) => ready(page));
test("cadastro, conflito e validação", async ({ page }) => {
  await page.goto("/signup");
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Ana Colecionadora");
  await page.getByLabel("E-mail", { exact: true }).fill("demo@nft.com");
  await page.getByLabel("Senha (mínimo").fill("Senha123!");
  await page.getByLabel("Confirmar senha").fill("Senha123!");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByText("E-mail já cadastrado.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("ana@example.com");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page).toHaveURL(/profile/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ana Colecionadora" }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    localStorage.getItem("novanft-db-v3"),
  );
  expect(stored).not.toContain("Senha123!");
  expect(stored).not.toContain("Demo123!");
});
test("sessão expira no checkout, preserva formulário e retorna", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await page.goto("/checkout");
  await page.getByLabel("Nome completo").fill("Nome para recibo");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await control(page, "expire");
  await expect(page).toHaveURL(/login.*redirect/);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByLabel("Nome completo")).toHaveValue(
    "Nome para recibo",
  );
  expect((await readApi(page, "cart")).data).toHaveLength(1);
});
test("logout, troca de usuário, pedidos e favoritos isolados", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await page
    .getByRole("button", { name: "Adicionar favorito", exact: true })
    .click();
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado!" }),
  ).toBeVisible();
  const url = page.url();
  const id = url.split("/").at(-1)!;
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Entrar", exact: true }),
  ).toBeVisible();
  await page.goto(url);
  await expect(page).toHaveURL(/login/);
  await login(page, "maria@nft.com");
  expect((await readApi(page, `orders/${id}`)).status).toBe(403);
  expect((await readApi(page, "favorites")).data).toEqual([]);
  await page.goto(url);
  await expect(page.getByRole("alert")).toContainText("não tem permissão");
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado!" }),
  ).toHaveCount(0);
});
test("perfil, avatar, conflito, senha e persistência", async ({ page }) => {
  await login(page);
  await page.getByLabel("Nome completo").fill("Colecionador Teste");
  await page.getByLabel("E-mail", { exact: true }).fill("maria@nft.com");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page.getByText("E-mail já cadastrado.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("demo@nft.com");
  await page.getByLabel("Avatar (PNG").setInputFiles("public/assets/0.webp");
  await expect(
    page.getByRole("img", { name: "Prévia do avatar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Dados salvos.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Colecionador Teste" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Avatar de Colecionador Teste" }),
  ).toBeVisible();
  await page.getByLabel("Senha atual", { exact: true }).fill("errada");
  await page.getByLabel("Nova senha").fill("NovaSenha123!");
  await page.getByRole("button", { name: "Atualizar senha" }).click();
  await expect(
    page.getByText("Senha atual incorreta.", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Senha atual", { exact: true }).fill("Demo123!");
  await page.getByRole("button", { name: "Atualizar senha" }).click();
  await expect(
    page.getByText("Senha alterada.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await login(page, "demo@nft.com", "NovaSenha123!");
  await expect(
    page.getByRole("heading", { name: "Colecionador Teste" }),
  ).toBeVisible();
});
test("carteiras validação, cadastro, principal e edição", async ({ page }) => {
  await login(page);
  await page.goto("/wallets");
  await page.getByLabel("Nome da carteira").fill("Carteira teste");
  await page.getByLabel("Endereço (simulado)").fill("0xerrado");
  await page
    .getByRole("button", { name: "Adicionar carteira", exact: true })
    .click();
  await expect(
    page.getByText("Endereço inválido.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Endereço (simulado)")
    .fill("0x1234567890123456789012345678901234567890");
  await page.getByLabel("Definir como principal").check();
  await page
    .getByRole("button", { name: "Adicionar carteira", exact: true })
    .click();
  await expect(
    page.getByText("Carteira salva.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Editar Carteira teste", exact: true })
    .click();
  await page.getByLabel("Nome da carteira").fill("Carteira renomeada");
  await page
    .getByRole("button", { name: "Salvar carteira", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Editar Carteira renomeada" }),
  ).toBeVisible();
  const wallets = (await readApi(page, "wallets")).data;
  expect(wallets.filter((w: { primary: boolean }) => w.primary)).toHaveLength(
    1,
  );
  expect(wallets.find((w: { primary: boolean }) => w.primary).name).toBe(
    "Carteira renomeada",
  );
});
test("teclado, foco de diálogo, escape e validação nativa", async ({
  page,
}) => {
  const trigger = page.getByRole("button", {
    name: "Controles da demonstração",
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Fechar diálogo" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.goto("/signup");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByLabel("Nome completo")).toBeFocused();
});
