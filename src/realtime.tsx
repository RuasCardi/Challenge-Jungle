import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getToken } from "./api";
import { useSession } from "./queries";
import type { MarketEvent, NFT, Order } from "./data";
const Context = createContext({
  status: "connecting",
  message: "",
  dismiss: () => {},
});
export const useRealtime = () => useContext(Context);
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [status, setStatus] = useState("connecting");
  const [message, setMessage] = useState("");
  const userId = session?.user?.id;
  const token = userId ? getToken() : null;
  useEffect(() => {
    let active = true;
    let disconnect = () => {};
    // Resolve the transport after mount, when MSW has patched WebSocket.
    void import("socket.io-client")
      .then(({ io }) => {
        if (!active) return;
        const versions = new Map<string, number>();
        const ids = new Set<string>();
        const socket = io(
          import.meta.env.VITE_SOCKET_URL || "https://realtime.novanft.test",
          {
            transports: ["websocket"],
            reconnectionDelay: 600,
            reconnectionDelayMax: 2000,
            randomizationFactor: 0,
            autoConnect: false,
          },
        );
        const reconcile = () =>
          qc.invalidateQueries({
            predicate: (q) =>
              q.queryKey[0] !== "session" &&
              (q.queryKey[0] !== "private" ||
                q.queryKey[1] === (token || "guest")),
          });
        const fresh = (
          kind: string,
          event: MarketEvent<NFT | Order>,
          cachedVersion = 0,
        ) => {
          const key = `${kind}:${event.resourceId}`;
          if (
            !active ||
            !event.eventId ||
            event.data.id !== event.resourceId ||
            !Number.isSafeInteger(event.version) ||
            event.version < 1 ||
            ids.has(event.eventId) ||
            event.version <= Math.max(versions.get(key) || 0, cachedVersion) ||
            event.data.version !== event.version
          )
            return false;
          ids.add(event.eventId);
          versions.set(key, event.version);
          if (ids.size > 500) ids.delete(ids.values().next().value!);
          return true;
        };
        socket.on("connect", () => socket.emit("subscribe", { token }));
        socket.on("subscribed", () => {
          if (!active) return;
          setStatus("connected");
          void reconcile();
        });
        socket.on("disconnect", () => {
          if (active) setStatus("disconnected");
        });
        socket.on("connect_error", () => {
          if (active) setStatus("disconnected");
        });
        socket.on("session.expired", () => {
          if (active && token === getToken())
            window.dispatchEvent(new Event("session-expired"));
        });
        socket.on("nft.updated", (event: MarketEvent<NFT>) => {
          const cached = qc.getQueryData<NFT>(["nft", event.resourceId]);
          if (!fresh("nft", event, cached?.version)) return;
          qc.setQueryData(["nft", event.resourceId], event.data);
          void qc.invalidateQueries({
            predicate: (q) =>
              q.queryKey[0] === "nfts" ||
              (q.queryKey[0] === "private" &&
                q.queryKey[1] === (token || "guest") &&
                ["cart", "quote"].includes(String(q.queryKey[2]))),
          });
          setMessage(
            "Preço ou disponibilidade atualizado. Confira os valores antes de comprar.",
          );
        });
        socket.on("order.updated", (event: MarketEvent<Order>) => {
          if (
            !userId ||
            event.userId !== userId ||
            event.data.userId !== userId ||
            token !== getToken()
          )
            return;
          const key = ["private", token, "order", event.resourceId];
          const cached = qc.getQueryData<Order>(key);
          if (cached && cached.status !== "pending") return;
          if (!fresh("order", event, cached?.version)) return;
          qc.setQueryData(key, event.data);
          void reconcile();
          setMessage(
            event.data.status === "confirmed"
              ? "Pedido confirmado. Seu recibo está disponível."
              : event.data.status === "rejected"
                ? "Pagamento recusado. Os itens continuam no carrinho."
                : "Pedido recebido. Aguardando confirmação.",
          );
        });
        socket.connect();
        disconnect = () => {
          socket.removeAllListeners();
          socket.disconnect();
        };
      })
      .catch(() => {
        if (active) setStatus("disconnected");
      });
    return () => {
      active = false;
      disconnect();
    };
  }, [qc, token, userId]);
  return (
    <Context.Provider
      value={{ status, message, dismiss: () => setMessage("") }}
    >
      {children}
    </Context.Provider>
  );
}
