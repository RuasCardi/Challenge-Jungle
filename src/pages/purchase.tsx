import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  Wallet as WalletIcon,
  XCircle,
} from "lucide-react";
import axios from "axios";
import { api, getToken } from "../api";
import {
  useAction,
  useCart,
  useQuote,
  useSession,
  useWallets,
} from "../queries";
import type { ApiError, Network, OrderIntent, PublicAccount } from "../data";
import { Decimal, eth } from "../money";
import {
  ErrorText,
  Failure,
  Field,
  Loading,
  QuoteView,
  TotalsView,
  useTitle,
} from "../components/common";
import { Button } from "../components/ui/button";
import { RelatedNFTs } from "../components/collections";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
export function Cart() {
  useTitle("Seu carrinho");
  const cart = useCart();
  const quote = useQuote();
  const update = useAction(api.cartSet);
  const coupon = useAction(api.coupon);
  const [code, setCode] = useState("");
  return (
    <div className="wrap page cart-page">
      <div className="crumb"><Link to="/">Início</Link> / <Link to="/">Mercado</Link> / Carrinho</div>
      <h1 className="page-title">NFTs <span className="muted">({cart.data?.length || 0})</span></h1>
      {cart.isPending ? (
        <Loading kind="form" />
      ) : cart.error ? (
        <Failure error={cart.error} retry={cart.refetch} />
      ) : !cart.data?.length ? (
        <div className="panel center">
          <ShoppingCart size={48} />
          <h2>Seu carrinho está vazio</h2>
          <p className="muted">
            Explore o catálogo e encontre sua próxima obra.
          </p>
          <Link className="btn" to="/">
            Explorar NFTs
          </Link>
        </div>
      ) : (
        <div className="checkoutgrid">
          <div className="panel cart-items-panel">
            {cart.data.map((i) => (
              <div className="cartrow" key={`${i.id}:${i.editionId}`}>
                <img
                  src={i.nft.image}
                  alt={i.nft.name}
                  width="95"
                  height="95"
                />
                <div className="grow">
                  <Link to="/nft/$id" params={{ id: i.id }}>
                    <strong>{i.nft.name}</strong>
                  </Link>
                  <p className="muted">{i.edition.label}</p>
                  <div className="quantity">
                    <button
                      aria-label={`Diminuir ${i.nft.name}`}
                      disabled={update.isPending || i.quantity <= 1}
                      onClick={() =>
                        update.mutate({
                          id: i.id,
                          editionId: i.editionId,
                          quantity: i.quantity - 1,
                        })
                      }
                    >
                      <Minus size={15} />
                    </button>
                    <span aria-live="polite">{i.quantity}</span>
                    <button
                      aria-label={`Aumentar ${i.nft.name}`}
                      disabled={
                        update.isPending || i.quantity >= i.edition.available
                      }
                      onClick={() =>
                        update.mutate({
                          id: i.id,
                          editionId: i.editionId,
                          quantity: i.quantity + 1,
                        })
                      }
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                  {i.quantity > i.edition.available && (
                    <p className="error" role="alert">
                      Apenas {i.edition.available} disponíveis. Ajuste ou remova
                      este item.
                    </p>
                  )}
                </div>
                <div className="right">
                  <strong>
                    {eth(
                      new Decimal(i.edition.price).mul(i.quantity).toFixed(),
                    )}
                  </strong>
                  <button
                    className="iconbtn"
                    aria-label={`Remover ${i.nft.name}`}
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({
                        id: i.id,
                        editionId: i.editionId,
                        quantity: 0,
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
            <ErrorText error={update.error} />
            {update.isSuccess && (
              <p className="green" role="status">
                Carrinho atualizado.
              </p>
            )}
          </div>
          <aside className="panel summary cart-summary">
            <h2>Resumo da carteira</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                coupon.mutate(code);
              }}
            >
              <label htmlFor="coupon">Cupom de desconto</label>
              <div className="coupon">
                <input
                  id="coupon"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Experimente NFT10"
                />
                <Button size="sm" disabled={coupon.isPending}>
                  Aplicar
                </Button>
              </div>
            </form>
            <ErrorText error={coupon.error} />
            {quote.data?.coupon && (
              <button
                className="textbutton"
                disabled={coupon.isPending}
                onClick={() => coupon.mutate("")}
              >
                Cupom {quote.data.coupon} aplicado · remover
              </button>
            )}
            {quote.isPending ? (
              <Loading kind="summary" />
            ) : quote.error ? (
              <Failure error={quote.error} retry={quote.refetch} />
            ) : quote.data ? (
              <>
                <TotalsView q={quote.data} />
                {quote.data.issues.map((i) => (
                  <p key={i} className="error" role="alert">
                    {i}
                  </p>
                ))}
                {quote.data.valid ? (
                  <Link className="btn full" to="/checkout">
                    Conectar e finalizar
                  </Link>
                ) : (
                  <p className="muted">Ajuste seu carrinho para continuar.</p>
                )}
              </>
            ) : null}
          </aside>
        </div>
      )}
      <RelatedNFTs />
    </div>
  );
}

type Attempt = { key: string; body: OrderIntent; orderId?: string };
type Draft = {
  name: string;
  email: string;
  wallet: string;
  network: Network;
  step: number;
};
function readSaved<T>(storage: Storage, key: string): T | null {
  try {
    return JSON.parse(storage.getItem(key) || "null");
  } catch {
    return null;
  }
}
export function Checkout() {
  const { data: session } = useSession();
  useTitle("Pagamento");
  return session?.user ? (
    <CheckoutForm key={session.user.id} user={session.user} />
  ) : (
    <div className="wrap page">
      <Loading kind="form" />
    </div>
  );
}
function CheckoutForm({ user }: { user: PublicAccount }) {
  const key = `novanft-attempt:${user.id}`;
  const draftKey = `novanft-checkout:${user.id}`;
  const [initial] = useState(() => readSaved<Draft>(sessionStorage, draftKey));
  const [name, setName] = useState(initial?.name || user.name);
  const [email, setEmail] = useState(initial?.email || user.email);
  const [wallet, setWallet] = useState(
    initial?.wallet || user.wallets.find((w) => w.primary)?.id || "",
  );
  const [network, setNetwork] = useState<Network>(
    initial?.network ||
      user.wallets.find((w) => w.primary)?.network ||
      "Ethereum",
  );
  const [step, setStep] = useState(initial?.step || 1);
  const [connected, setConnected] = useState(false);
  const [reviewed, setReviewed] = useState("");
  const [attempt, setAttempt] = useState<Attempt | null>(() =>
    readSaved(localStorage, key),
  );
  const cart = useCart();
  const quote = useQuote(network);
  const wallets = useWallets();
  const navigate = useNavigate();
  const order = useAction(api.order, ["orders", "cart", "quote"]);
  const connect = useAction(api.connect, []);
  const busy = useRef(false);
  useEffect(() => {
    sessionStorage.setItem(
      draftKey,
      JSON.stringify({ name, email, wallet, network, step }),
    );
  }, [draftKey, name, email, wallet, network, step]);
  const persist = (a: Attempt | null) => {
    setAttempt(a);
    if (a) localStorage.setItem(key, JSON.stringify(a));
    else localStorage.removeItem(key);
  };
  const connectWallet = async (action: "connect" | "refuse" | "disconnect") => {
    try {
      const r = await connect.mutateAsync({ wallet, network, action });
      setConnected(r.connected);
    } catch {
      setConnected(false);
    }
  };
  const submit = async (recover = false) => {
    if (busy.current) return;
    busy.current = true;
    const a = recover
      ? attempt
      : {
          key: crypto.randomUUID(),
          body: {
            quoteId: reviewed,
            wallet,
            network,
            collector: { name, email },
          },
        };
    if (!a) {
      busy.current = false;
      return;
    }
    persist(a);
    try {
      const result = await order.mutateAsync(a);
      persist({ ...a, orderId: result.id });
      await navigate({ to: "/order/$id", params: { id: result.id } });
    } catch (error) {
      if (
        axios.isAxiosError<ApiError>(error) &&
        error.response &&
        error.response.status !== 401 &&
        error.response.status < 500
      ) {
        persist(null);
        setReviewed("");
        await quote.refetch();
      }
    } finally {
      busy.current = false;
    }
  };
  const changed = !!reviewed && quote.data?.id !== reviewed;
  if (cart.isPending || wallets.isPending)
    return (
      <div className="wrap page">
        <Loading kind="form" />
      </div>
    );
  if (cart.error || wallets.error)
    return (
      <div className="wrap page">
        <Failure
          error={cart.error || wallets.error}
          retry={() => {
            void cart.refetch();
            void wallets.refetch();
          }}
        />
      </div>
    );
  if (attempt)
    return (
      <div className="wrap page">
        <h1>Retomar pagamento</h1>
        <div className="panel center">
          <Clock size={48} />
          <h2>
            {order.isPending
              ? "Enviando seu pedido…"
              : "Sua tentativa de compra foi preservada"}
          </h2>
          <p>
            A recuperação consulta a mesma tentativa, sem criar outra compra.
          </p>
          {attempt.orderId ? (
            <Link
              className="btn"
              to="/order/$id"
              params={{ id: attempt.orderId }}
            >
              Acompanhar pedido
            </Link>
          ) : (
            <Button
              disabled={order.isPending}
              onClick={() => void submit(true)}
            >
              {order.isPending ? "Processando…" : "Recuperar pedido"}
            </Button>
          )}
          <ErrorText error={order.error} />
        </div>
      </div>
    );
  if (!cart.data?.length)
    return (
      <div className="wrap page panel center">
        <h1>Seu carrinho está vazio</h1>
        <Link to="/">Explorar NFTs</Link>
      </div>
    );
  return (
    <div className="wrap page">
      <div className="crumb"><Link to="/">Início</Link> / <Link to="/">Mercado</Link> / Pagamento</div>
      <h1>Pagamento</h1>
      <div className="steps" aria-label="Etapas do pagamento">
        <span className={step === 1 ? "active" : ""}>1 Dados</span>
        <span className={step === 2 ? "active" : ""}>2 Carteira</span>
        <span className={step === 3 ? "active" : ""}>3 Revisão</span>
      </div>
      <div className="checkoutgrid">
        <div className="panel checkout-form-panel">
          <h2>
            {step === 1
              ? "Dados do colecionador"
              : step === 2
                ? "Selecione uma carteira"
                : "Revise seu pedido"}
          </h2>
          {step === 1 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
            >
              <Field label="Nome completo" name="name">
                <input
                  required
                  minLength={2}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="E-mail" name="email">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Button className="full">Continuar</Button>
            </form>
          ) : step === 2 ? (
            <>
              <fieldset className="walletlist">
                <legend className="sr-only">Carteira de pagamento</legend>
                {wallets.data?.map((w) => (
                  <label
                    className={`walletchoice ${w.id === wallet ? "selected" : ""}`}
                    key={w.id}
                  >
                    <input
                      type="radio"
                      name="wallet"
                      checked={wallet === w.id}
                      onChange={() => {
                        setWallet(w.id);
                        setNetwork(w.network);
                        setConnected(false);
                        setReviewed("");
                      }}
                    />
                    <WalletIcon size={20} />
                    <span>
                      <strong>
                        {w.name}
                        {w.primary ? " · Principal" : ""}
                      </strong>
                      <small>{w.address}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
              {!wallets.data?.length && (
                <p className="muted">Cadastre uma carteira para continuar.</p>
              )}
              <Link to="/wallets" className="textbutton">
                Gerenciar carteiras
              </Link>
              <Field label="Rede de pagamento" name="network">
                <select
                  value={network}
                  onChange={(e) => {
                    setNetwork(e.target.value as Network);
                    setConnected(false);
                    setReviewed("");
                  }}
                >
                  <option>Ethereum</option>
                  <option>Polygon</option>
                </select>
              </Field>
              <div className="actions">
                {connected ? (
                  <Button
                    variant="outline"
                    disabled={connect.isPending}
                    onClick={() => void connectWallet("disconnect")}
                  >
                    Desconectar carteira
                  </Button>
                ) : (
                  <>
                    <Button
                      disabled={!wallet || connect.isPending}
                      onClick={() => void connectWallet("connect")}
                    >
                      Conectar carteira
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={!wallet || connect.isPending}
                      onClick={() => void connectWallet("refuse")}
                    >
                      Simular recusa
                    </Button>
                  </>
                )}
              </div>
              <p role="status" className={connected ? "green" : "muted"}>
                {connected
                  ? "Carteira conectada à rede selecionada."
                  : "Carteira desconectada."}
              </p>
              <ErrorText error={connect.error} />
              <div className="actions">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button
                  disabled={
                    !connected || !quote.data?.valid || quote.isFetching
                  }
                  onClick={() => {
                    setReviewed(quote.data!.id);
                    setStep(3);
                  }}
                >
                  Revisar pedido
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="muted">
                Revise os itens e valores. Nenhuma transação real será feita.
              </p>
              <div className="line">
                <span>Colecionador</span>
                <strong>
                  {name}
                  <small className="block">{email}</small>
                </strong>
              </div>
              {cart.data.map((i) => (
                <div className="line" key={`${i.id}:${i.editionId}`}>
                  <span>
                    {i.nft.name} · {i.edition.label} × {i.quantity}
                  </span>
                  <strong>
                    {eth(
                      new Decimal(i.edition.price).mul(i.quantity).toFixed(),
                    )}
                  </strong>
                </div>
              ))}
              <div className="line">
                <span>Carteira / rede</span>
                <strong>
                  {wallets.data?.find((w) => w.id === wallet)?.name} / {network}
                </strong>
              </div>
              {(changed || !reviewed) && (
                <div className="notice" role="alert">
                  <span>
                    A cotação foi atualizada. Revise os valores e confirme
                    novamente.
                  </span>
                  <Button
                    disabled={!quote.data?.valid || quote.isFetching}
                    onClick={() => setReviewed(quote.data!.id)}
                  >
                    Aceitar nova cotação
                  </Button>
                </div>
              )}
              {!connected && (
                <p className="error" role="alert">
                  Reconecte sua carteira antes de confirmar.
                </p>
              )}
              <div className="actions">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <Button
                  disabled={
                    order.isPending ||
                    !connected ||
                    !quote.data?.valid ||
                    !reviewed ||
                    changed ||
                    quote.isFetching
                  }
                  onClick={() => void submit()}
                >
                  Confirmar compra
                </Button>
              </div>
              <ErrorText error={order.error} />
            </>
          )}
        </div>
        <QuoteView
          q={quote.data}
          loading={quote.isPending}
          error={quote.error}
        />
      </div>
    </div>
  );
}
export function OrderPage() {
  const { id } = useParams({ from: "/order/$id" });
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const query = useQuery({
    queryKey: ["private", getToken(), "order", id],
    queryFn: ({ signal }) => api.getOrder(id, signal),
    enabled: !!userId,
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 2000 : false),
  });
  const o = query.data;
  useTitle(
    o?.status === "confirmed"
      ? "Pedido confirmado"
      : o?.status === "rejected"
        ? "Pagamento recusado"
        : "Acompanhar pedido",
  );
  useEffect(() => {
    if (o && o.status !== "pending" && userId) {
      const key = `novanft-attempt:${userId}`;
      const a = readSaved<Attempt>(localStorage, key);
      if (a?.orderId === o.id || a?.body.quoteId === undefined)
        localStorage.removeItem(key);
      sessionStorage.removeItem(`novanft-checkout:${userId}`);
    }
  }, [o, userId]);
  if (!userId) return null;
  return (
    <div className="wrap page">
      {query.error ? (
        <Failure error={query.error} retry={query.refetch} />
      ) : !o ? (
        <Loading kind="form" />
      ) : (
        <div className="panel receipt center order-page">
          {o.status === "confirmed" ? (
            <CheckCircle2 size={64} className="green" />
          ) : o.status === "pending" ? (
            <Clock size={64} />
          ) : (
            <XCircle size={64} className="error" />
          )}
          <h1>
            {o.status === "confirmed"
              ? "Pedido confirmado!"
              : o.status === "pending"
                ? "Pagamento pendente"
                : "Pagamento recusado"}
          </h1>
          <p role="status">
            {o.status === "confirmed"
              ? "Sua compra simulada foi concluída."
              : o.status === "pending"
                ? "Aguardando a carteira. Você pode recarregar esta página com segurança."
                : o.reason}
          </p>
          <div className="receiptlines">
            <div className="line">
              <span>Pedido</span>
              <strong>{o.id}</strong>
            </div>
            <div className="line">
              <span>Rede</span>
              <strong>{o.network}</strong>
            </div>
            {o.transaction && (
              <>
                <div className="line">
                  <span>Transação simulada</span>
                  <code>{o.transaction}</code>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="textbutton">
                      Ver transação simulada
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogTitle className="text-xl font-bold">
                      Explorador de demonstração
                    </DialogTitle>
                    <DialogDescription className="muted mt-2">
                      Esta referência foi criada pelo simulador. Não corresponde
                      a uma transação na blockchain.
                    </DialogDescription>
                    <code className="break-all block mt-4">
                      {o.transaction}
                    </code>
                    <p className="mt-4">
                      Rede: {o.network} · Status: confirmado
                    </p>
                  </DialogContent>
                </Dialog>
              </>
            )}
            {o.items.map((i) => (
              <div className="line" key={`${i.id}:${i.editionId}`}>
                <span>
                  {i.nft.name}
                  <small className="block">
                    {i.edition.label} × {i.quantity}
                  </small>
                </span>
                <strong>
                  {eth(new Decimal(i.edition.price).mul(i.quantity).toFixed())}
                </strong>
              </div>
            ))}
            <TotalsView q={o} />
          </div>
          {o.status === "pending" ? (
            <Button variant="outline" onClick={() => void query.refetch()}>
              Consultar estado
            </Button>
          ) : o.status === "rejected" ? (
            <Link className="btn full" to="/cart">
              Voltar ao carrinho
            </Link>
          ) : (
            <Link className="btn full" to="/">
              Explorar mais NFTs
            </Link>
          )}
          <Link className="textbutton" to="/profile">
            Meus pedidos
          </Link>
        </div>
      )}
    </div>
  );
}
