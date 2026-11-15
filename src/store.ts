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
  version: 6;
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
const KEY = "novanft-db-v6";
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
    "Emerald Ape #042",
    "Kurio Apes",
    "1.19",
    "Arte digital",
    "Kurio Studio",
  ],
  [
    "sage-nomad",
    "Sage Nomad #009",
    "Kurio Apes",
    "1.69",
    "Arte digital",
    "Kurio Studio",
  ],
  [
    "neon-vessel",
    "Neon Vessel #552",
    "Kurio Apes",
    "1.99",
    "Arte digital",
    "Kurio Studio",
  ],
  [
    "cosmic-bloom",
    "Cosmic Bloom #118",
    "Kurio Apes",
    "1.29",
    "Arte digital",
    "Kurio Studio",
  ],
  [
    "violet-nomad",
    "Violet Nomad #314",
    "Kurio Apes",
    "1.39",
    "Arte digital",
    "Kurio Studio",
  ],
  [
    "ivory-baron",
    "Ivory Baron #088",
    "Kurio Apes",
    "1.79",
    "Arte digital",
    "Kurio Studio",
  ],
  [
    "golden-beat",
    "Golden Beat #207",
    "Kurio Apes",
    "0.99",
    "Arte digital",
    "Kurio Studio",
  ],
  [
    "golden-signal",
    "Golden Signal #160",
    "Kurio Apes",
    "0.39",
    "Arte digital",
    "Kurio Studio",
  ],
  [
    "rare-ape",
    "Rare Ape #101",
    "Kurio Apes",
    "2.29",
    "Arte digital",
    "Kurio Studio",
  ],
  [
    "starlight",
    "Starlight #12",
    "Cosmic Art",
    "0.123456789123456789",
    "Arte digital",
    "Luna Studio",
  ],
  [
    "galaxy",
    "Galaxy Spheres",
    "Cosmic Art",
    "0.45",
    "Arte digital",
    "Luna Studio",
  ],
  ["void", "Void Walker", "Cosmic Art", "0.72", "Arte digital", "Luna Studio"],
  [
    "neon-cat",
    "Neon Cat #1337",
    "Pixel Friends",
    "0.32",
    "Colecionáveis",
    "Pixel Studio",
  ],
  [
    "pixel-bird",
    "Pixel Bird #24",
    "Pixel Friends",
    "0.18",
    "Colecionáveis",
    "Pixel Studio",
  ],
  ["sunset", "Sunset Stories", "Quiet Frames", "0.28", "Fotografia", "Ana Luz"],
  [
    "city-lights",
    "City Lights #08",
    "Quiet Frames",
    "0.67",
    "Fotografia",
    "Ana Luz",
  ],
  ["ocean-song", "Ocean Song", "Sound Waves", "0.25", "Música", "Maré"],
  ["night-beat", "Night Beat #05", "Sound Waves", "0.41", "Música", "Maré"],
  [
    "chrome-sculpture",
    "Chrome Sculpture",
    "Future Forms",
    "0.76",
    "Arte 3D",
    "Forma Studio",
  ],
  [
    "crystal-dream",
    "Crystal Dream #03",
    "Future Forms",
    "1.12",
    "Arte 3D",
    "Forma Studio",
  ],
  [
    "fractal-garden",
    "Fractal Garden",
    "Infinite Patterns",
    "0.36",
    "Generativa",
    "Loop Lab",
  ],
  [
    "orbital-loop",
    "Orbital Loop #41",
    "Infinite Patterns",
    "0.54",
    "Generativa",
    "Loop Lab",
  ],
  [
    "jungle-pass",
    "Jungle Pass #01",
    "Player One",
    "0.22",
    "Jogos",
    "Jungle Studio",
  ],
  [
    "quest-key",
    "Quest Key #77",
    "Player One",
    "0.31",
    "Jogos",
    "Jungle Studio",
  ],
  [
    "creator-club",
    "Creator Club Pass",
    "Open Circle",
    "0.88",
    "Assinaturas",
    "Open Studio",
  ],
  [
    "studio-pass",
    "Studio Pass #15",
    "Open Circle",
    "1.08",
    "Assinaturas",
    "Open Studio",
  ],
  [
    "community-key",
    "Community Key",
    "Connected",
    "0.14",
    "Utilidade",
    "Together Lab",
  ],
  [
    "access-token",
    "Access Token #09",
    "Connected",
    "0.19",
    "Utilidade",
    "Together Lab",
  ],
  [
    "amber-ape",
    "Amber Ape #620",
    "Kurio Apes",
    "1.46",
    "Arte digital",
    "Kurio Studio",
  ],
  [
    "jade-ape",
    "Jade Ape #333",
    "Kurio Apes",
    "1.57",
    "Arte digital",
    "Kurio Studio",
  ],
  [
    "pixel-fox",
    "Pixel Fox #52",
    "Pixel Friends",
    "0.29",
    "Colecionáveis",
    "Pixel Studio",
  ],
  [
    "morning-mist",
    "Morning Mist",
    "Quiet Frames",
    "0.37",
    "Fotografia",
    "Ana Luz",
  ],
  ["solar-sound", "Solar Sound", "Sound Waves", "0.63", "Música", "Maré"],
  [
    "glass-flower",
    "Glass Flower",
    "Future Forms",
    "0.92",
    "Arte 3D",
    "Forma Studio",
  ],
  [
    "infinite-river",
    "Infinite River",
    "Infinite Patterns",
    "0.46",
    "Generativa",
    "Loop Lab",
  ],
  ["rare-key", "Rare Key #88", "Player One", "0.59", "Jogos", "Jungle Studio"],
];
const artwork = [
  "/assets/ape-hero.webp",
  "/assets/ape-sage.webp",
  "/assets/ape-neon.webp",
  "/assets/ape-sage.webp",
  "/assets/ape-sage.webp",
  "/assets/ape-neon.webp",
  "/assets/ape-golden.webp",
  "/assets/ape-golden.webp",
  "/assets/ape-neon.webp",
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
    ensName: "joaosilva.eth",
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
      image: artwork[i % artwork.length],
      gallery: [artwork[i % artwork.length], artwork[(i + 1) % artwork.length]],
      category,
      creator,
      network:
        i < 9
          ? "Ethereum"
          : (["Ethereum", "Polygon", "Solana"] as const)[i % 3],
      isNew: i % 2 === 0,
      trending: i % 4 === 0,
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
    version: 6,
    nfts,
    accounts: [
      {
        id: "demo",
        name: "João Silva",
        email: "demo@nft.com",
        username: "joaosilva",
        ensName: "joaosilva.eth",
        walletNickname: "Principal",
        passwordHash: hash,
        salt,
        wallets,
        favorites: [],
      },
      {
        id: "second",
        name: "Maria Santos",
        email: "maria@nft.com",
        username: "mariasantos",
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
    username: a.username,
    ensName: a.ensName,
    walletNickname: a.walletNickname,
    wallets: a.wallets,
  };
}
export function user(db: DB, token: string | null) {
  const s = token ? db.sessions[token] : undefined;
  return s && s.expiresAt > Date.now()
    ? db.accounts.find((a) => a.id === s.userId)
    : undefined;
}
