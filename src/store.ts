// Simulated backend storage. Do not import from components or the HTTP client.
import Decimal from "decimal.js";
import type { CartItem, NFT, Order, PublicAccount, Wallet } from "./data";
export type Account = PublicAccount & {
  passwordHash: string;
  salt: string;
  favorites: string[];
};
export type Scenario = {
  name: string;
  latency: number;
  variable: boolean;
  network: "online" | "offline" | "error";
  payment: "confirmed" | "rejected";
  orderDelay: number;
  timeoutOnce: boolean;
  favoriteFailure: boolean;
  priceAtSubmit: boolean;
  soldOutAtSubmit: boolean;
};
export type DB = {
  version: 3;
  nfts: NFT[];
  accounts: Account[];
  sessions: Record<string, { userId: string; expiresAt: number }>;
  carts: Record<string, CartItem[]>;
  coupons: Record<string, string | null>;
  orders: Record<
    string,
    Order & { resolveAt: number; outcome: "confirmed" | "rejected" }
  >;
  idempotency: Record<string, { fingerprint: string; orderId: string }>;
  scenario: Scenario;
};
const KEY = "novanft-db-v3";
export const defaultScenario: Scenario = {
  name: "success",
  latency: 90,
  variable: false,
  network: "online",
  payment: "confirmed",
  orderDelay: 1800,
  timeoutOnce: false,
  favoriteFailure: false,
  priceAtSubmit: false,
  soldOutAtSubmit: false,
};
export const scenarios: Record<string, Partial<Scenario>> = {
  success: {},
  slow: { latency: 1800 },
  variable: { variable: true },
  offline: { network: "offline" },
  "server-error": { network: "error" },
  "favorite-error": { favoriteFailure: true },
  declined: { payment: "rejected" },
  timeout: { timeoutOnce: true },
  pending: { orderDelay: 60000 },
  "price-changed": { priceAtSubmit: true },
  "sold-out": { soldOutAtSubmit: true },
};
const art = [
  [
    "cyber-ape",
    "Cyber Ape #4821",
    "Cyber Apes",
    "0.85",
    "Arte digital",
    "MetaStudio",
  ],
  [
    "neon-cat",
    "Neon Cat #1337",
    "Neon Pets",
    "0.42",
    "Colecionáveis",
    "NeonLabs",
  ],
  [
    "galaxy",
    "Galaxy Spheres",
    "Cosmic Art",
    "1.2",
    "Arte digital",
    "CosmicLab",
  ],
  ["void", "Void Walker", "Void Collection", "2.75", "Premium", "VoidStudio"],
  [
    "dream",
    "Dreamscape #08",
    "Dream Worlds",
    "0.64",
    "Arte digital",
    "Dreamer",
  ],
  ["ocean", "Ocean Genesis", "Elements", "0.38", "Colecionáveis", "Elements"],
  ["forest", "Emerald Forest", "Elements", "0.72", "Premium", "Elements"],
  ["aurora", "Aurora Pulse", "Cosmic Art", "0.91", "Arte digital", "CosmicLab"],
  [
    "starlight",
    "Starlight #12",
    "Cosmic Art",
    "0.123456789123456789",
    "Arte digital",
    "CosmicLab",
  ],
  ["tide", "Infinite Tide", "Elements", "0.56", "Colecionáveis", "Elements"],
  [
    "summit",
    "Silent Summit",
    "Dream Worlds",
    "1.05",
    "Arte digital",
    "Dreamer",
  ],
  [
    "eclipse",
    "Total Eclipse",
    "Void Collection",
    "3.4",
    "Premium",
    "VoidStudio",
  ],
];
export async function passwordHash(password: string, salt: string) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
    },
    material,
    256,
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
const wallets: Wallet[] = [
  {
    id: "main",
    name: "Carteira principal",
    nickname: "Principal",
    profileName: "João Silva",
    address: "0x4a2b000000000000000000000000000000009f3b",
    network: "Ethereum",
    walletType: "Carteira pessoal",
    referralCode: "",
    email: "demo@nft.com",
    ensName: "",
    primary: true,
  },
  {
    id: "secondary",
    name: "Carteira secundária",
    nickname: "Secundária",
    profileName: "João Silva",
    address: "0x9c1000000000000000000000000000000000007d2e",
    network: "Polygon",
    walletType: "Carteira pessoal",
    referralCode: "",
    email: "demo@nft.com",
    ensName: "",
    primary: false,
  },
];
export async function resetDB(name = "success") {
  const salt = "novanft-fictional-fixtures-v3";
  const hash = await passwordHash("Demo123!", salt);
  const nfts: NFT[] = art.map(
    ([id, title, collection, price, category, creator], i) => ({
      id,
      name: title,
      collection,
      price,
      available: 5 + i + (i === 0 ? 0 : 2),
      image: `/assets/${i % 8}.webp`,
      gallery: [`/assets/${i % 8}.webp`, `/assets/${(i + 2) % 8}.webp`],
      category,
      creator,
      description:
        "Uma edição de arte digital que explora luz, natureza e identidade. Colecione uma perspectiva única e faça parte desta coleção.",
      version: 1,
      editions: [
        { id: "standard", label: "Edição original", price, available: 5 + i },
        {
          id: "limited",
          label: "Edição especial",
          price: new Decimal(price).mul(2).toFixed(),
          available: i === 0 ? 0 : 2,
        },
      ],
    }),
  );
  const db: DB = {
    version: 3,
    nfts,
    accounts: [
      {
        id: "demo",
        name: "João Silva",
        email: "demo@nft.com",
        passwordHash: hash,
        salt,
        wallets,
        favorites: [],
      },
      {
        id: "second",
        name: "Maria Santos",
        email: "maria@nft.com",
        passwordHash: hash,
        salt,
        wallets: [wallets[0]],
        favorites: [],
      },
    ],
    sessions: {},
    carts: { guest: [], demo: [], second: [] },
    coupons: {},
    orders: {},
    idempotency: {},
    scenario: { ...defaultScenario, ...scenarios[name], name },
  };
  localStorage.removeItem("novanft-demo-v1");
  writeDB(db);
}
export async function initializeDB() {
  if (!localStorage.getItem(KEY)) await resetDB();
}
export function readDB(): DB {
  return JSON.parse(localStorage.getItem(KEY)!);
}
export function writeDB(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
}
export function mutate<T>(fn: (db: DB) => T): T {
  const db = readDB();
  const result = fn(db);
  writeDB(db);
  return result;
}
export function publicAccount(a: Account): PublicAccount {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    avatar: a.avatar,
    wallets: a.wallets,
  };
}
export function user(db: DB, token: string | null) {
  const s = token ? db.sessions[token] : undefined;
  return s && s.expiresAt > Date.now()
    ? db.accounts.find((a) => a.id === s.userId)
    : undefined;
}
