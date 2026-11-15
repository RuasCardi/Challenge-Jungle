import axios from "axios";
import type {
  AuthResult,
  CartItem,
  CartLine,
  CatalogParams,
  CatalogResult,
  Network,
  NFT,
  Order,
  OrderIntent,
  PublicAccount,
  Quote,
  Session,
  Wallet,
} from "./data";
export const getToken = () => localStorage.getItem("novanft-token");
export function setToken(token: string | null) {
  if (token) localStorage.setItem("novanft-token", token);
  else localStorage.removeItem("novanft-token");
}
export const http = axios.create({ baseURL: "/api", timeout: 8000 });
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
http.interceptors.response.use(
  (r) => r,
  (error) => {
    if (
      error.response?.status === 401 &&
      !["/login", "/signup"].includes(error.config?.url) &&
      error.config?.headers.Authorization === `Bearer ${getToken()}`
    )
      window.dispatchEvent(new Event("session-expired"));
    return Promise.reject(error);
  },
);
export const api = {
  nfts: (params: CatalogParams, signal?: AbortSignal) =>
    http.get<CatalogResult>("/nfts", { params, signal }).then((r) => r.data),
  nft: (id: string, signal?: AbortSignal) =>
    http.get<NFT>(`/nfts/${id}`, { signal }).then((r) => r.data),
  session: (signal?: AbortSignal) =>
    http.get<Session>("/session", { signal }).then((r) => r.data),
  login: (body: { email: string; password: string }) =>
    http.post<AuthResult>("/login", body).then((r) => r.data),
  signup: (body: { name: string; email: string; password: string }) =>
    http.post<AuthResult>("/signup", body).then((r) => r.data),
  logout: () => http.post("/logout").then((r) => r.data),
  cart: (signal?: AbortSignal) =>
    http.get<CartLine[]>("/cart", { signal }).then((r) => r.data),
  cartSet: (item: CartItem) =>
    http.put<CartLine[]>("/cart", item).then((r) => r.data),
  favorites: (signal?: AbortSignal) =>
    http.get<string[]>("/favorites", { signal }).then((r) => r.data),
  favorite: ({ id, favorite }: { id: string; favorite: boolean }) =>
    http.put<string[]>(`/favorites/${id}`, { favorite }).then((r) => r.data),
  coupon: (code: string) => http.post("/coupon", { code }).then((r) => r.data),
  quote: (network: Network = "Ethereum", signal?: AbortSignal) =>
    http
      .get<Quote>("/quote", { params: { network }, signal })
      .then((r) => r.data),
  connect: (body: {
    wallet: string;
    network: Network;
    action: "connect" | "refuse" | "disconnect";
  }) =>
    http
      .post<{ connected: boolean }>("/wallet-connection", body)
      .then((r) => r.data),
  order: ({ body, key }: { body: OrderIntent; key: string }) =>
    http
      .post<Order>("/orders", body, { headers: { "Idempotency-Key": key } })
      .then((r) => r.data),
  orders: (signal?: AbortSignal) =>
    http.get<Order[]>("/orders", { signal }).then((r) => r.data),
  getOrder: (id: string, signal?: AbortSignal) =>
    http.get<Order>(`/orders/${id}`, { signal }).then((r) => r.data),
  profile: (body: { name: string; email: string; avatar?: string }) =>
    http.patch<PublicAccount>("/profile", body).then((r) => r.data),
  password: (body: { oldPassword: string; newPassword: string }) =>
    http.patch("/password", body).then((r) => r.data),
  wallets: (signal?: AbortSignal) =>
    http.get<Wallet[]>("/wallets", { signal }).then((r) => r.data),
  wallet: (wallet: Wallet) =>
    http.put<Wallet[]>("/wallets", wallet).then((r) => r.data),
  testing: (action: string, body: unknown = {}) =>
    http.post(`/testing/${action}`, body).then((r) => r.data),
};
