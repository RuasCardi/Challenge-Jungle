export type Network = "Ethereum" | "Polygon";
export type Edition = {
  id: string;
  label: string;
  price: string;
  available: number;
};
export type NFT = {
  id: string;
  name: string;
  collection: string;
  price: string;
  available: number;
  image: string;
  gallery: string[];
  category: string;
  creator: string;
  network: Network | "Solana";
  isNew: boolean;
  trending: boolean;
  description: string;
  editions: Edition[];
  version: number;
};
export type CartItem = { id: string; editionId: string; quantity: number };
export type CartLine = CartItem & { nft: NFT; edition: Edition };
export type Wallet = {
  id: string;
  name: string;
  nickname?: string;
  profileName?: string;
  address: string;
  network: Network;
  walletType?: "Carteira pessoal" | "Hardware wallet" | "Carteira de contrato";
  referralCode?: string;
  email?: string;
  ensName?: string;
  secondaryAddress?: string;
  primary: boolean;
};
export type PublicAccount = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  username?: string;
  ensName?: string;
  walletNickname?: string;
  wallets: Wallet[];
};
export type Session = { user: PublicAccount | null; expiresAt?: number };
export type AuthResult = Session & { token: string; notice?: string };
export type Totals = {
  subtotal: string;
  discount: string;
  fee: string;
  total: string;
  coupon: string | null;
};
export type Quote = Totals & {
  id: string;
  items: CartLine[];
  network: Network;
  valid: boolean;
  issues: string[];
};
export type OrderIntent = {
  quoteId: string;
  wallet: string;
  network: Network;
  collector: { name: string; email: string };
};
export type Order = Totals & {
  id: string;
  userId: string;
  status: "pending" | "confirmed" | "rejected";
  version: number;
  items: CartLine[];
  createdAt: string;
  transaction: string | null;
  wallet: Wallet;
  network: Network;
  collector: OrderIntent["collector"];
  reason?: string;
};
export type MarketEvent<T> = {
  eventId: string;
  resourceId: string;
  version: number;
  data: T;
  userId?: string;
};
export type CatalogParams = {
  search?: string;
  category?: string;
  collection?: string;
  sort?: string;
  page?: number;
  available?: boolean;
  network?: string;
  minPrice?: string;
  maxPrice?: string;
  tab?: "all" | "new" | "trending";
};
export type CatalogResult = {
  items: NFT[];
  total: number;
  page: number;
  pages: number;
  collections: string[];
  categories: string[];
  categoryCounts: Record<string, number>;
  networkCounts: Record<string, number>;
};
export type ApiError = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};
