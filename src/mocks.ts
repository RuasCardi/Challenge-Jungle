import { http as rest, HttpResponse, delay, ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import { amount, Decimal } from "./money";
import {
  defaultScenario,
  mutate,
  passwordHash,
  publicAccount,
  readDB,
  resetDB,
  scenarios,
  user,
  writeDB,
  type DB,
} from "./store";
import type {
  CartLine,
  MarketEvent,
  Network,
  NFT,
  Order,
  OrderIntent,
  Quote,
  Wallet,
} from "./data";

const fail = (
  message: string,
  status = 400,
  code = "VALIDATION_ERROR",
  fields?: Record<string, string>,
) => HttpResponse.json({ code, message, fields }, { status });
const tokenOf = (r: Request) =>
  r.headers.get("Authorization")?.replace(/^Bearer /, "") || null;
const accountOf = (r: Request) => user(readDB(), tokenOf(r));
const ownerOf = (r: Request) => accountOf(r)?.id || "guest";
const unauthorized = () =>
  fail(
    "Sua sessão expirou. Entre novamente para continuar.",
    401,
    "SESSION_EXPIRED",
  );
const invalidSession = (r: Request) => !!tokenOf(r) && !accountOf(r);
const emailValid = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const passwordValid = (s: string) =>
  s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s);
const networkValid = (s: string): s is Network =>
  ["Ethereum", "Polygon"].includes(s);
const clients = new Set<{
  emit: (event: string, data: unknown) => void;
  close: () => void;
  token: string | null;
  owner: string | null;
}>();
const walletConnections = new Map<
  string,
  { wallet: string; network: Network }
>();
const eventFor = <T extends { id: string; version: number }>(
  data: T,
  userId?: string,
): MarketEvent<T> => ({
  eventId: crypto.randomUUID(),
  resourceId: data.id,
  version: data.version,
  data: structuredClone(data),
  userId,
});
function broadcast(event: string, data: MarketEvent<NFT | Order>) {
  for (const c of clients)
    if (
      !data.userId ||
      (c.owner === data.userId && user(readDB(), c.token)?.id === data.userId)
    )
      c.emit(event, data);
}
const notifyNFT = (n: NFT) => broadcast("nft.updated", eventFor(n));
const notifyOrder = (o: Order) =>
  broadcast("order.updated", eventFor(o, o.userId));
function lines(db: DB, owner: string): CartLine[] {
  return (db.carts[owner] || []).flatMap((item) => {
    const nft = db.nfts.find((n) => n.id === item.id);
    const edition = nft?.editions.find((e) => e.id === item.editionId);
    return nft && edition
      ? [
          {
            ...item,
            nft: structuredClone(nft),
            edition: structuredClone(edition),
          },
        ]
      : [];
  });
}
function quote(db: DB, owner: string, network: Network): Quote {
  const items = lines(db, owner);
  const coupon = db.coupons[owner] || null;
  const subtotal = items.reduce(
    (sum, i) => sum.plus(new Decimal(i.edition.price).mul(i.quantity)),
    new Decimal(0),
  );
  const discount = coupon === "NFT10" ? amount(subtotal.mul("0.1")) : "0";
  const fee = items.length ? (network === "Polygon" ? "0.002" : "0.02") : "0";
  const issues = items
    .filter((i) => i.quantity > i.edition.available)
    .map(
      (i) =>
        `${i.nft.name}: apenas ${i.edition.available} unidades disponíveis.`,
    );
  if (coupon && coupon !== "NFT10")
    issues.push("O cupom expirou. Remova-o e revise o pedido.");
  const totals = {
    subtotal: amount(subtotal),
    discount,
    fee,
    total: amount(subtotal.minus(discount).plus(fee)),
    coupon,
  };
  // Canonical content token: no rounding, random expiry, or hidden mutable reference.
  const id = JSON.stringify({
    owner,
    network,
    items: items.map((i) => [
      i.id,
      i.editionId,
      i.quantity,
      i.nft.version,
      i.edition.price,
      i.edition.available,
    ]),
    ...totals,
  });
  return {
    ...totals,
    id,
    items,
    network,
    issues,
    valid: items.length > 0 && !issues.length,
  };
}
function syncNFT(n: NFT) {
  n.price = n.editions[0].price;
  n.available = n.editions.reduce((sum, e) => sum + e.available, 0);
  n.version++;
}
function settleOrders(forceId?: string) {
  const changed: Order[] = [];
  const changedNfts: NFT[] = [];
  mutate((db) => {
    for (const o of Object.values(db.orders)) {
      if (
        o.status !== "pending" ||
        (o.id !== forceId && o.resolveAt > Date.now())
      )
        continue;
      o.status = o.outcome;
      o.version++;
      if (o.status === "confirmed") {
        o.transaction =
          "0x" +
          crypto.randomUUID().replaceAll("-", "") +
          crypto.randomUUID().replaceAll("-", "");
        db.carts[o.userId] = (db.carts[o.userId] || []).flatMap((i) => {
          const bought =
            o.items.find((x) => x.id === i.id && x.editionId === i.editionId)
              ?.quantity || 0;
          return i.quantity > bought
            ? [{ ...i, quantity: i.quantity - bought }]
            : [];
        });
        if (!db.carts[o.userId].length) db.coupons[o.userId] = null;
      } else {
        o.reason =
          "Pagamento recusado pela carteira simulada. Seus itens foram preservados.";
        for (const i of o.items) {
          const n = db.nfts.find((n) => n.id === i.id)!;
          n.editions.find((e) => e.id === i.editionId)!.available += i.quantity;
          syncNFT(n);
          changedNfts.push(structuredClone(n));
        }
      }
      changed.push(structuredClone(o));
    }
  });
  changedNfts.forEach(notifyNFT);
  changed.forEach(notifyOrder);
}
export function startOrderClock() {
  return setInterval(() => {
    if (
      Object.values(readDB().orders).some(
        (o) => o.status === "pending" && o.resolveAt <= Date.now(),
      )
    )
      settleOrders();
  }, 250);
}
const realtime = ws.link(
  (import.meta.env.VITE_SOCKET_URL || "https://realtime.novanft.test")
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:"),
);
const socketHandler = realtime.addEventListener("connection", (connection) => {
  // The installed binding uses an older interceptor type; its public wire contract is compatible.
  const bound = toSocketIo(
    connection as unknown as Parameters<typeof toSocketIo>[0],
  );
  const client = {
    emit: (event: string, data: unknown) => bound.client.emit(event, data),
    close: () => connection.client.close(1012, "Simulated interruption"),
    token: null as string | null,
    owner: null as string | null,
  };
  clients.add(client);
  bound.client.on("subscribe", (_event, payload: { token?: string }) => {
    client.token = payload.token || null;
    client.owner = user(readDB(), client.token)?.id || null;
    settleOrders();
    client.emit("subscribed", { userId: client.owner });
  });
  const heartbeat = setInterval(() => connection.client.send("2"), 20000);
  connection.client.addEventListener("close", () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
});
function loginSession(db: DB, id: string) {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + 30 * 60 * 1000;
  db.sessions[token] = { userId: id, expiresAt };
  let limited = false;
  const target = db.carts[id] || [];
  for (const i of db.carts.guest || []) {
    const edition = db.nfts
      .find((n) => n.id === i.id)
      ?.editions.find((e) => e.id === i.editionId);
    if (!edition) continue;
    const existing = target.find(
      (x) => x.id === i.id && x.editionId === i.editionId,
    );
    const quantity = Math.min(
      edition.available,
      (existing?.quantity || 0) + i.quantity,
    );
    if (quantity < (existing?.quantity || 0) + i.quantity) limited = true;
    if (existing) existing.quantity = quantity;
    else if (quantity) target.push({ ...i, quantity });
  }
  db.carts[id] = target.filter((i) => i.quantity > 0);
  db.carts.guest = [];
  if (db.coupons.guest) db.coupons[id] = db.coupons.guest;
  db.coupons.guest = null;
  return {
    token,
    expiresAt,
    user: publicAccount(db.accounts.find((a) => a.id === id)!),
    notice: limited
      ? "Algumas quantidades foram ajustadas à disponibilidade. Revise seu carrinho."
      : undefined,
  };
}
export const handlers = [
  socketHandler,
  rest.all("/api/*", async ({ request }) => {
    if (new URL(request.url).pathname.startsWith("/api/testing")) return;
    const s = readDB().scenario;
    const search = new URL(request.url).searchParams.get("search") || "";
    await delay(s.variable ? (search.length === 1 ? 1200 : 80) : s.latency);
    if (s.network === "offline") return HttpResponse.error();
    if (s.network === "error")
      return fail(
        "Serviço temporariamente indisponível. Tente novamente.",
        503,
        "TRANSIENT_ERROR",
      );
  }),
  rest.get("/api/nfts", ({ request }) => {
    const p = new URL(request.url).searchParams;
    const db = readDB();
    let items = [...db.nfts];
    const search = (p.get("search") || "").toLocaleLowerCase("pt-BR");
    if (search)
      items = items.filter((n) =>
        `${n.name} ${n.collection} ${n.creator}`
          .toLocaleLowerCase("pt-BR")
          .includes(search),
      );
    if (p.get("category"))
      items = items.filter((n) => n.category === p.get("category"));
    if (p.get("collection"))
      items = items.filter((n) => n.collection === p.get("collection"));
    if (p.get("available") === "true")
      items = items.filter((n) => n.available > 0);
    const networks = (p.get("network") || "").split(",").filter(Boolean);
    if (
      networks.some(
        (network) => !["Ethereum", "Polygon", "Solana"].includes(network),
      )
    )
      return fail("Rede de catálogo inválida.", 422);
    if (networks.length)
      items = items.filter((n) => networks.includes(n.network));
    for (const field of ["minPrice", "maxPrice"] as const) {
      const value = p.get(field);
      if (value && !/^\d+(\.\d{1,18})?$/.test(value))
        return fail(
          "Informe um preço decimal válido.",
          422,
          "VALIDATION_ERROR",
          {
            [field]: "Preço inválido.",
          },
        );
    }
    const minimum = p.get("minPrice");
    const maximum = p.get("maxPrice");
    if (minimum && maximum && new Decimal(minimum).gt(maximum))
      return fail("O preço mínimo não pode superar o máximo.", 422);
    if (minimum) items = items.filter((n) => new Decimal(n.price).gte(minimum));
    if (maximum) items = items.filter((n) => new Decimal(n.price).lte(maximum));
    const tab = p.get("tab") || "all";
    if (!["all", "new", "trending"].includes(tab))
      return fail("Seleção de catálogo inválida.", 422);
    if (tab === "new") items = items.filter((n) => n.isNew);
    if (tab === "trending") items = items.filter((n) => n.trending);
    if (p.get("sort") === "price-asc")
      items.sort((a, b) => new Decimal(a.price).comparedTo(b.price));
    if (p.get("sort") === "price-desc")
      items.sort((a, b) => new Decimal(b.price).comparedTo(a.price));
    const total = items.length;
    const page = Math.max(1, Math.floor(Number(p.get("page")) || 1));
    return HttpResponse.json({
      items: items.slice((page - 1) * 9, page * 9),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / 9)),
      collections: [...new Set(db.nfts.map((n) => n.collection))],
      categories: [...new Set(db.nfts.map((n) => n.category))],
      categoryCounts: db.nfts.reduce<Record<string, number>>((counts, n) => {
        counts[n.category] = (counts[n.category] || 0) + 1;
        return counts;
      }, {}),
      networkCounts: db.nfts.reduce<Record<string, number>>((counts, n) => {
        counts[n.network] = (counts[n.network] || 0) + 1;
        return counts;
      }, {}),
    });
  }),
  rest.get("/api/nfts/:id", ({ params }) => {
    const n = readDB().nfts.find((n) => n.id === params.id);
    return n
      ? HttpResponse.json(n)
      : fail("NFT não encontrado.", 404, "NOT_FOUND");
  }),
  rest.get("/api/session", ({ request }) => {
    if (invalidSession(request)) return unauthorized();
    const db = readDB();
    const token = tokenOf(request);
    const u = user(db, token);
    return HttpResponse.json({
      user: u ? publicAccount(u) : null,
      expiresAt: u && token ? db.sessions[token].expiresAt : undefined,
    });
  }),
  rest.post("/api/login", async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };
    const u = readDB().accounts.find(
      (a) => a.email.toLowerCase() === email?.trim().toLowerCase(),
    );
    if (!u || (await passwordHash(password || "", u.salt)) !== u.passwordHash)
      return fail("E-mail ou senha incorretos.", 401, "INVALID_CREDENTIALS");
    return HttpResponse.json(mutate((db) => loginSession(db, u.id)));
  }),
  rest.post("/api/signup", async ({ request }) => {
    const { name, email, password } = (await request.json()) as {
      name: string;
      email: string;
      password: string;
    };
    if (!name?.trim() || name.trim().length < 2)
      return fail("Informe seu nome completo.", 422, "VALIDATION_ERROR", {
        name: "Use pelo menos 2 caracteres.",
      });
    if (!emailValid(email || ""))
      return fail("Informe um e-mail válido.", 422, "VALIDATION_ERROR", {
        email: "E-mail inválido.",
      });
    if (!passwordValid(password || ""))
      return fail(
        "A senha deve ter 8 caracteres, letras e números.",
        422,
        "VALIDATION_ERROR",
        { password: "Use 8 caracteres, letras e números." },
      );
    const salt = crypto.randomUUID();
    const hash = await passwordHash(password, salt);
    const db = readDB();
    if (db.accounts.some((a) => a.email === email.trim().toLowerCase()))
      return fail("E-mail já cadastrado.", 409, "EMAIL_CONFLICT", {
        email: "Este e-mail já está em uso.",
      });
    const id = crypto.randomUUID();
    db.accounts.push({
      id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hash,
      salt,
      wallets: [],
      favorites: [],
    });
    const result = loginSession(db, id);
    writeDB(db);
    return HttpResponse.json(result, { status: 201 });
  }),
  rest.post("/api/logout", ({ request }) => {
    const token = tokenOf(request);
    if (token) {
      mutate((db) => {
        delete db.sessions[token];
      });
      walletConnections.delete(token);
    }
    return HttpResponse.json({ ok: true });
  }),
  rest.get("/api/cart", ({ request }) =>
    invalidSession(request)
      ? unauthorized()
      : HttpResponse.json(lines(readDB(), ownerOf(request))),
  ),
  rest.put("/api/cart", async ({ request }) => {
    if (invalidSession(request)) return unauthorized();
    const { id, editionId, quantity } = (await request.json()) as {
      id: string;
      editionId: string;
      quantity: number;
    };
    const db = readDB();
    const n = db.nfts.find((n) => n.id === id);
    const edition = n?.editions.find((e) => e.id === editionId);
    if (!n || !edition)
      return fail("NFT ou edição inexistente.", 404, "NOT_FOUND");
    if (!Number.isInteger(quantity) || quantity < 0)
      return fail("Quantidade deve ser um inteiro positivo.", 422);
    if (quantity > edition.available)
      return fail(
        "Quantidade indisponível. Atualize o carrinho.",
        409,
        "AVAILABILITY_CONFLICT",
      );
    const owner = ownerOf(request);
    db.carts[owner] = (db.carts[owner] || []).filter(
      (i) => i.id !== id || i.editionId !== editionId,
    );
    if (quantity) db.carts[owner].push({ id, editionId, quantity });
    writeDB(db);
    return HttpResponse.json(lines(db, owner));
  }),
  rest.get("/api/favorites", ({ request }) => {
    const u = accountOf(request);
    return u ? HttpResponse.json(u.favorites) : unauthorized();
  }),
  rest.put("/api/favorites/:id", async ({ request, params }) => {
    const u = accountOf(request);
    if (!u) return unauthorized();
    const { favorite } = (await request.json()) as { favorite: boolean };
    if (readDB().scenario.favoriteFailure) {
      mutate((db) => {
        db.scenario.favoriteFailure = false;
      });
      return fail(
        "Não foi possível salvar o favorito. Tente novamente.",
        503,
        "TRANSIENT_ERROR",
      );
    }
    if (!readDB().nfts.some((n) => n.id === params.id))
      return fail("NFT inexistente.", 404, "NOT_FOUND");
    const favorites = mutate((db) => {
      const a = db.accounts.find((a) => a.id === u.id)!;
      a.favorites = a.favorites.filter((id) => id !== params.id);
      if (favorite) a.favorites.push(String(params.id));
      return a.favorites;
    });
    return HttpResponse.json(favorites);
  }),
  rest.post("/api/coupon", async ({ request }) => {
    if (invalidSession(request)) return unauthorized();
    const { code } = (await request.json()) as { code: string };
    const normalized = code.trim().toUpperCase();
    if (normalized === "EXPIRED")
      return fail("Cupom expirado.", 422, "COUPON_EXPIRED");
    if (normalized && normalized !== "NFT10")
      return fail("Cupom inválido.", 422, "COUPON_INVALID");
    mutate((db) => {
      db.coupons[ownerOf(request)] = normalized || null;
    });
    return HttpResponse.json({ ok: true });
  }),
  rest.get("/api/quote", ({ request }) => {
    if (invalidSession(request)) return unauthorized();
    const network =
      new URL(request.url).searchParams.get("network") || "Ethereum";
    if (!networkValid(network)) return fail("Rede inválida.", 422);
    return HttpResponse.json(quote(readDB(), ownerOf(request), network));
  }),
  rest.post("/api/wallet-connection", async ({ request }) => {
    const u = accountOf(request);
    if (!u) return unauthorized();
    const body = (await request.json()) as {
      wallet: string;
      network: Network;
      action: string;
    };
    const token = tokenOf(request)!;
    if (body.action === "disconnect") {
      walletConnections.delete(token);
      return HttpResponse.json({ connected: false });
    }
    if (body.action === "refuse")
      return fail(
        "Conexão recusada na carteira simulada.",
        409,
        "CONNECTION_REFUSED",
      );
    if (
      !u.wallets.some((w) => w.id === body.wallet && w.network === body.network)
    )
      return fail("Selecione a rede cadastrada para esta carteira.", 422);
    walletConnections.set(token, {
      wallet: body.wallet,
      network: body.network,
    });
    return HttpResponse.json({ connected: true });
  }),
  rest.post("/api/orders", async ({ request }) => {
    const u = accountOf(request);
    if (!u) return unauthorized();
    const key = request.headers.get("Idempotency-Key");
    if (!key) return fail("Chave de idempotência obrigatória.");
    const body = (await request.json()) as OrderIntent;
    let db = readDB();
    const fingerprint = JSON.stringify({
      quoteId: body.quoteId,
      wallet: body.wallet,
      network: body.network,
      collector: body.collector,
    });
    const previous = db.idempotency[`${u.id}:${key}`];
    if (previous) {
      if (previous.fingerprint !== fingerprint)
        return fail(
          "Chave reutilizada com conteúdo diferente.",
          409,
          "IDEMPOTENCY_CONFLICT",
        );
      settleOrders();
      return HttpResponse.json(readDB().orders[previous.orderId]);
    }
    if (
      Object.values(db.orders).some(
        (o) => o.userId === u.id && o.status === "pending",
      )
    )
      return fail(
        "Já existe um pedido pendente. Retome esse pedido.",
        409,
        "ORDER_PENDING",
      );
    const wallet = u.wallets.find(
      (w) => w.id === body.wallet && w.network === body.network,
    );
    const connection = walletConnections.get(tokenOf(request)!);
    if (
      !wallet ||
      connection?.wallet !== body.wallet ||
      connection.network !== body.network
    )
      return fail(
        "Conecte a carteira e a rede selecionadas.",
        422,
        "WALLET_DISCONNECTED",
      );
    if (!body.collector?.name?.trim() || !emailValid(body.collector.email))
      return fail("Confira os dados do colecionador.", 422);
    if (db.scenario.priceAtSubmit || db.scenario.soldOutAtSubmit) {
      const i = (db.carts[u.id] || [])[0];
      const n = db.nfts.find((n) => n.id === i?.id);
      if (n) {
        const e = n.editions.find((e) => e.id === i.editionId)!;
        if (db.scenario.priceAtSubmit)
          e.price = amount(new Decimal(e.price).plus("0.1"));
        if (db.scenario.soldOutAtSubmit) e.available = 0;
        syncNFT(n);
      }
      db.scenario.priceAtSubmit = false;
      db.scenario.soldOutAtSubmit = false;
      writeDB(db);
      if (n) notifyNFT(n);
      db = readDB();
    }
    const q = quote(db, u.id, body.network);
    if (!q.valid)
      return fail(
        q.issues[0] || "Carrinho vazio.",
        409,
        "AVAILABILITY_CONFLICT",
      );
    if (body.quoteId !== q.id)
      return fail(
        "Preço, disponibilidade, cupom ou taxa mudou. Revise e aceite a nova cotação.",
        409,
        "QUOTE_CHANGED",
      );
    const id = "ORD-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    const timeout = db.scenario.timeoutOnce;
    db.scenario.timeoutOnce = false;
    const order: DB["orders"][string] = {
      id,
      userId: u.id,
      status: "pending",
      version: 1,
      items: q.items,
      subtotal: q.subtotal,
      discount: q.discount,
      fee: q.fee,
      total: q.total,
      coupon: q.coupon,
      createdAt: new Date().toISOString(),
      transaction: null,
      wallet: structuredClone(wallet),
      network: body.network,
      collector: body.collector,
      resolveAt: Date.now() + db.scenario.orderDelay,
      outcome: db.scenario.payment,
    };
    db.orders[id] = order;
    db.idempotency[`${u.id}:${key}`] = { fingerprint, orderId: id };
    const changed: NFT[] = [];
    for (const i of q.items) {
      const n = db.nfts.find((n) => n.id === i.id)!;
      n.editions.find((e) => e.id === i.editionId)!.available -= i.quantity;
      syncNFT(n);
      changed.push(structuredClone(n));
    }
    writeDB(db);
    changed.forEach(notifyNFT);
    notifyOrder(order);
    if (timeout) await delay(11000);
    return HttpResponse.json(order, { status: 201 });
  }),
  rest.get("/api/orders", ({ request }) => {
    const u = accountOf(request);
    if (!u) return unauthorized();
    settleOrders();
    return HttpResponse.json(
      Object.values(readDB().orders).filter((o) => o.userId === u.id),
    );
  }),
  rest.get("/api/orders/:id", ({ request, params }) => {
    const u = accountOf(request);
    if (!u) return unauthorized();
    settleOrders();
    const o = readDB().orders[String(params.id)];
    if (!o) return fail("Pedido não encontrado.", 404, "NOT_FOUND");
    if (o.userId !== u.id)
      return fail(
        "Você não tem permissão para acessar este pedido.",
        403,
        "FORBIDDEN",
      );
    return HttpResponse.json(o);
  }),
  rest.get("/api/profile", ({ request }) => {
    const u = accountOf(request);
    return u ? HttpResponse.json(publicAccount(u)) : unauthorized();
  }),
  rest.patch("/api/profile", async ({ request }) => {
    const u = accountOf(request);
    if (!u) return unauthorized();
    const { name, email, avatar, username, ensName, walletNickname } =
      (await request.json()) as {
        name: string;
        email: string;
        avatar?: string;
        username?: string;
        ensName?: string;
        walletNickname?: string;
      };
    if (!name?.trim() || name.trim().length < 2)
      return fail(
        "Nome deve ter ao menos 2 caracteres.",
        422,
        "VALIDATION_ERROR",
        { name: "Nome muito curto." },
      );
    if (!emailValid(email || ""))
      return fail("Informe um e-mail válido.", 422, "VALIDATION_ERROR", {
        email: "E-mail inválido.",
      });
    const normalizedUsername = username?.trim().replace(/^@/, "").toLowerCase();
    if (normalizedUsername && !/^[a-z0-9._]{3,30}$/.test(normalizedUsername))
      return fail("Confira seu nome de usuário.", 422, "VALIDATION_ERROR", {
        username: "Use de 3 a 30 letras, números, pontos ou sublinhados.",
      });
    if (
      normalizedUsername &&
      readDB().accounts.some(
        (a) => a.id !== u.id && a.username === normalizedUsername,
      )
    )
      return fail("Nome de usuário já cadastrado.", 409, "USERNAME_CONFLICT", {
        username: "Este nome de usuário já está em uso.",
      });
    if (ensName?.trim() && !/^[a-z0-9][a-z0-9.-]*\.eth$/i.test(ensName.trim()))
      return fail("Informe um nome ENS válido.", 422, "VALIDATION_ERROR", {
        ensName: "Use um nome terminado em .eth.",
      });
    if (walletNickname && walletNickname.trim().length > 50)
      return fail("Apelido de carteira muito longo.", 422, "VALIDATION_ERROR", {
        walletNickname: "Use até 50 caracteres.",
      });
    if (
      readDB().accounts.some(
        (a) => a.id !== u.id && a.email === email.toLowerCase(),
      )
    )
      return fail("E-mail já cadastrado.", 409, "EMAIL_CONFLICT", {
        email: "Este e-mail já está em uso.",
      });
    if (
      avatar &&
      (!/^data:image\/(png|jpeg|webp);base64,/.test(avatar) ||
        avatar.length > 550000)
    )
      return fail(
        "Use PNG, JPEG ou WebP de até 400 KB.",
        422,
        "VALIDATION_ERROR",
        { avatar: "Formato ou tamanho inválido." },
      );
    const a = mutate((db) => {
      const a = db.accounts.find((a) => a.id === u.id)!;
      a.name = name.trim();
      a.email = email.trim().toLowerCase();
      a.avatar = avatar;
      if (username !== undefined) a.username = normalizedUsername || undefined;
      if (ensName !== undefined) a.ensName = ensName.trim().toLowerCase();
      if (walletNickname !== undefined)
        a.walletNickname = walletNickname.trim();
      const main = a.wallets.find((w) => w.primary);
      if (main) {
        if (ensName !== undefined) main.ensName = a.ensName;
        if (walletNickname !== undefined) main.nickname = a.walletNickname;
      }
      return publicAccount(a);
    });
    return HttpResponse.json(a);
  }),
  rest.patch("/api/password", async ({ request }) => {
    const u = accountOf(request);
    if (!u) return unauthorized();
    const { oldPassword, newPassword } = (await request.json()) as {
      oldPassword: string;
      newPassword: string;
    };
    if ((await passwordHash(oldPassword || "", u.salt)) !== u.passwordHash)
      return fail("Senha atual incorreta.", 422, "VALIDATION_ERROR", {
        oldPassword: "Senha atual incorreta.",
      });
    if (!passwordValid(newPassword || ""))
      return fail(
        "Use 8 caracteres, letras e números.",
        422,
        "VALIDATION_ERROR",
        { newPassword: "Senha muito fraca." },
      );
    const salt = crypto.randomUUID();
    const hash = await passwordHash(newPassword, salt);
    mutate((db) => {
      const a = db.accounts.find((a) => a.id === u.id)!;
      a.passwordHash = hash;
      a.salt = salt;
      for (const [token, s] of Object.entries(db.sessions))
        if (s.userId === u.id && token !== tokenOf(request))
          delete db.sessions[token];
    });
    return HttpResponse.json({ ok: true });
  }),
  rest.get("/api/wallets", ({ request }) => {
    const u = accountOf(request);
    return u ? HttpResponse.json(u.wallets) : unauthorized();
  }),
  rest.put("/api/wallets", async ({ request }) => {
    const u = accountOf(request);
    if (!u) return unauthorized();
    const wallet = (await request.json()) as Wallet;
    if (!wallet.name?.trim())
      return fail("Informe um nome.", 422, "VALIDATION_ERROR", {
        name: "Nome obrigatório.",
      });
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet.address))
      return fail(
        "Endereço deve começar com 0x e ter 40 dígitos hexadecimais.",
        422,
        "VALIDATION_ERROR",
        { address: "Endereço inválido." },
      );
    if (!networkValid(wallet.network)) return fail("Rede inválida.", 422);
    if (wallet.email?.trim() && !emailValid(wallet.email.trim()))
      return fail("Informe um e-mail válido.", 422, "VALIDATION_ERROR", {
        email: "E-mail inválido.",
      });
    if (
      wallet.ensName?.trim() &&
      !/^[a-z0-9][a-z0-9.-]*\.eth$/i.test(wallet.ensName.trim())
    )
      return fail("Informe um nome ENS válido.", 422, "VALIDATION_ERROR", {
        ensName: "ENS inválido.",
      });
    if (
      wallet.secondaryAddress?.trim() &&
      !/^(0x[a-fA-F0-9]{40}|[a-z0-9][a-z0-9.-]*\.eth)$/i.test(
        wallet.secondaryAddress.trim(),
      )
    )
      return fail(
        "Informe um endereço secundário válido.",
        422,
        "VALIDATION_ERROR",
        { secondaryAddress: "Use um endereço 0x ou um nome .eth." },
      );
    if (
      u.wallets.some(
        (w) =>
          w.id !== wallet.id &&
          w.address.toLowerCase() === wallet.address.toLowerCase() &&
          w.network === wallet.network,
      )
    )
      return fail("Carteira já cadastrada.", 409, "WALLET_CONFLICT");
    const wallets = mutate((db) => {
      const a = db.accounts.find((a) => a.id === u.id)!;
      const entry = {
        ...wallet,
        id: wallet.id || crypto.randomUUID(),
        name: wallet.name.trim(),
        nickname: wallet.nickname?.trim() || wallet.name.trim(),
        profileName: wallet.profileName?.trim() || a.name,
        walletType: wallet.walletType || "Carteira pessoal",
        referralCode: wallet.referralCode?.trim() || "",
        email: wallet.email?.trim().toLowerCase() || a.email,
        ensName: wallet.ensName?.trim() || "",
        secondaryAddress: wallet.secondaryAddress?.trim() || "",
        primary: wallet.primary || !a.wallets.length,
      };
      if (entry.primary)
        a.wallets.forEach((w) => {
          w.primary = false;
        });
      const index = a.wallets.findIndex((w) => w.id === entry.id);
      if (index >= 0) a.wallets[index] = entry;
      else a.wallets.push(entry);
      if (!a.wallets.some((w) => w.primary)) a.wallets[0].primary = true;
      const main = a.wallets.find((w) => w.primary)!;
      a.ensName = main.ensName;
      a.walletNickname = main.nickname;
      return a.wallets;
    });
    walletConnections.delete(tokenOf(request)!);
    return HttpResponse.json(wallets);
  }),
  rest.get("/api/testing", () =>
    HttpResponse.json({
      scenario: readDB().scenario,
      scenarios: Object.keys(scenarios),
      socketClients: clients.size,
    }),
  ),
  rest.post("/api/testing/reset", async ({ request }) => {
    const body = (await request.json()) as { scenario?: string };
    await resetDB(body.scenario);
    walletConnections.clear();
    for (const c of clients) c.close();
    return HttpResponse.json({ ok: true });
  }),
  rest.post("/api/testing/scenario", async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      overrides?: Partial<DB["scenario"]>;
    };
    mutate((db) => {
      db.scenario = {
        ...defaultScenario,
        ...scenarios[body.name],
        ...body.overrides,
        name: body.name,
      };
    });
    return HttpResponse.json({ ok: true });
  }),
  rest.post("/api/testing/expire", () => {
    mutate((db) => {
      Object.values(db.sessions).forEach((s) => {
        s.expiresAt = 0;
      });
    });
    for (const c of clients) c.emit("session.expired", {});
    return HttpResponse.json({ ok: true });
  }),
  rest.post("/api/testing/nft", async ({ request }) => {
    const {
      id,
      editionId = "standard",
      price,
      available,
    } = (await request.json()) as {
      id: string;
      editionId?: string;
      price?: string;
      available?: number;
    };
    const db = readDB();
    const n = db.nfts.find((n) => n.id === id);
    const e = n?.editions.find((e) => e.id === editionId);
    if (!n || !e) return fail("NFT ou edição não encontrado.", 404);
    if (price !== undefined) {
      if (!/^\d+(\.\d{1,18})?$/.test(price))
        return fail("Preço inválido.", 422);
      e.price = price;
    }
    if (available !== undefined) {
      if (!Number.isInteger(available) || available < 0)
        return fail("Disponibilidade inválida.", 422);
      e.available = available;
    }
    syncNFT(n);
    writeDB(db);
    notifyNFT(n);
    return HttpResponse.json(n);
  }),
  rest.post("/api/testing/disconnect", () => {
    for (const c of clients) c.close();
    return HttpResponse.json({ ok: true });
  }),
  rest.post("/api/testing/settle/:id", ({ params }) => {
    settleOrders(String(params.id));
    return HttpResponse.json({ ok: true });
  }),
  rest.post("/api/testing/event", async ({ request }) => {
    const { type, event } = (await request.json()) as {
      type: string;
      event: MarketEvent<NFT | Order>;
    };
    if (!["nft.updated", "order.updated"].includes(type))
      return fail("Evento inválido.");
    broadcast(type, event);
    return HttpResponse.json({ ok: true });
  }),
  rest.post("/api/testing/coupon-expire", ({ request }) => {
    mutate((db) => {
      db.coupons[ownerOf(request)] = "EXPIRED";
    });
    return HttpResponse.json({ ok: true });
  }),
];
