import {
  QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import { api, getToken, setToken } from "./api";
import type { AuthResult, Network } from "./data";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: (count, error) =>
        !axios.isAxiosError(error) || !error.response
          ? count < 1
          : count < 1 && error.response.status >= 500,
    },
    mutations: { retry: false },
  },
});
export const sessionOptions = () =>
  queryOptions({
    queryKey: ["session"],
    queryFn: ({ signal }) => api.session(signal),
    staleTime: 15000,
    retry: false,
  });
export const useSession = () =>
  useQuery({ ...sessionOptions(), refetchInterval: 30000 });
export function useScope() {
  const s = useSession();
  return {
    scope: s.data?.user ? getToken() : "guest",
    ready: !s.isPending,
    user: s.data?.user,
  };
}
export function useCart() {
  const { scope, ready } = useScope();
  return useQuery({
    queryKey: ["private", scope, "cart"],
    queryFn: ({ signal }) => api.cart(signal),
    enabled: ready,
  });
}
export function useQuote(network: Network = "Ethereum") {
  const { scope, ready } = useScope();
  return useQuery({
    queryKey: ["private", scope, "quote", network],
    queryFn: ({ signal }) => api.quote(network, signal),
    enabled: ready,
  });
}
export const useNft = (id: string) =>
  useQuery({
    queryKey: ["nft", id],
    queryFn: ({ signal }) => api.nft(id, signal),
  });
export function useOrders() {
  const { scope, user } = useScope();
  return useQuery({
    queryKey: ["private", scope, "orders"],
    queryFn: ({ signal }) => api.orders(signal),
    enabled: !!user,
  });
}
export function useWallets() {
  const { scope, user } = useScope();
  return useQuery({
    queryKey: ["private", scope, "wallets"],
    queryFn: ({ signal }) => api.wallets(signal),
    enabled: !!user,
  });
}
export function useAction<T, A>(
  fn: (a: A) => Promise<T>,
  resources: string[] = ["cart", "quote"],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      qc.invalidateQueries({
        predicate: (q) => resources.some((x) => q.queryKey.includes(x)),
      }),
  });
}
export async function clearSession() {
  setToken(null);
  await queryClient.cancelQueries();
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === "private" });
  queryClient.setQueryData(["session"], { user: null });
}
export async function acceptSession(result: AuthResult) {
  await queryClient.cancelQueries();
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === "private" });
  setToken(result.token);
  queryClient.setQueryData(["session"], {
    user: result.user,
    expiresAt: result.expiresAt,
  });
}
export function useFavorites() {
  const { scope, user } = useScope();
  const qc = useQueryClient();
  const key = ["private", scope, "favorites"];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.favorites(signal),
    enabled: !!user,
  });
  const mutation = useMutation({
    mutationFn: api.favorite,
    onMutate: async ({ id, favorite }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<string[]>(key) || [];
      qc.setQueryData(
        key,
        favorite
          ? [...new Set([...previous, id])]
          : previous.filter((x) => x !== id),
      );
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (scope === getToken()) qc.setQueryData(key, context?.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  return { query, mutation };
}
