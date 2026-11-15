import { useEffect, useState } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  Link,
  redirect,
  lazyRouteComponent,
  useRouterState,
  defaultParseSearch,
  defaultStringifySearch,
} from "@tanstack/react-router";
import {
  Heart,
  House,
  LogIn,
  Menu,
  ScanLine,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { api } from "./api";
import type { CatalogParams } from "./data";
import {
  clearSession,
  queryClient,
  sessionOptions,
  useCart,
  useSession,
} from "./queries";
import { RealtimeProvider, useRealtime } from "./realtime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { DemoControls } from "./components/demo-controls";
import { LearnLink, MarketFooter } from "./components/market-footer";
import { Failure, Loading } from "./components/common";
const root = createRootRoute({
  component: () => (
    <RealtimeProvider>
      <Shell />
    </RealtimeProvider>
  ),
});
const requireAuth = async ({ location }: { location: { href: string } }) => {
  const s = await queryClient.fetchQuery({ ...sessionOptions(), staleTime: 0 });
  if (!s.user) {
    await clearSession();
    throw redirect({ to: "/login", search: { redirect: location.href } });
  }
};
const catalogSearch = (s: CatalogParams): CatalogParams => ({
  search: typeof s.search === "string" ? s.search : "",
  category: typeof s.category === "string" ? s.category : "",
  collection: typeof s.collection === "string" ? s.collection : "",
  sort: ["price-asc", "price-desc"].includes(s.sort || "") ? s.sort : "",
  page: Math.max(1, Math.floor(Number(s.page) || 1)),
  available: s.available === true,
  network:
    typeof s.network === "string"
      ? s.network
          .split(",")
          .filter((n) => ["Ethereum", "Polygon", "Solana"].includes(n))
          .join(",")
      : "",
  minPrice:
    typeof s.minPrice === "string" && /^\d+(\.\d{1,18})?$/.test(s.minPrice)
      ? s.minPrice
      : "",
  maxPrice:
    typeof s.maxPrice === "string" && /^\d+(\.\d{1,18})?$/.test(s.maxPrice)
      ? s.maxPrice
      : "",
  tab: s.tab === "new" || s.tab === "trending" ? s.tab : "all",
});
const authSearch = (s: { redirect?: string }): { redirect?: string } => ({
  redirect:
    typeof s.redirect === "string" &&
    s.redirect.startsWith("/") &&
    !s.redirect.startsWith("//")
      ? s.redirect
      : undefined,
});
const home = createRoute({
  getParentRoute: () => root,
  path: "/",
  validateSearch: catalogSearch,
  component: lazyRouteComponent(() => import("./pages/catalog"), "Home"),
});
const detail = createRoute({
  getParentRoute: () => root,
  path: "/nft/$id",
  component: lazyRouteComponent(() => import("./pages/catalog"), "Detail"),
});
const cart = createRoute({
  getParentRoute: () => root,
  path: "/cart",
  component: lazyRouteComponent(() => import("./pages/purchase"), "Cart"),
});
const checkout = createRoute({
  getParentRoute: () => root,
  path: "/checkout",
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import("./pages/purchase"), "Checkout"),
});
const order = createRoute({
  getParentRoute: () => root,
  path: "/order/$id",
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import("./pages/purchase"), "OrderPage"),
});
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  validateSearch: authSearch,
  component: lazyRouteComponent(() => import("./pages/account"), "Login"),
});
const signup = createRoute({
  getParentRoute: () => root,
  path: "/signup",
  validateSearch: authSearch,
  component: lazyRouteComponent(() => import("./pages/account"), "Signup"),
});
const profile = createRoute({
  getParentRoute: () => root,
  path: "/profile",
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import("./pages/account"), "Profile"),
});
const wallets = createRoute({
  getParentRoute: () => root,
  path: "/wallets",
  beforeLoad: requireAuth,
  component: lazyRouteComponent(() => import("./pages/account"), "Wallets"),
});
export const router = createRouter({
  stringifySearch: (search) => {
    const { minPrice, maxPrice, ...rest } = search;
    const params = new URLSearchParams(defaultStringifySearch(rest));
    if (typeof minPrice === "string" && minPrice)
      params.set("minPrice", minPrice);
    if (typeof maxPrice === "string" && maxPrice)
      params.set("maxPrice", maxPrice);
    const query = params.toString();
    return query ? `?${query}` : "";
  },
  parseSearch: (search) => {
    const parsed: Record<string, unknown> = defaultParseSearch(search);
    const raw = new URLSearchParams(search);
    // Decimal prices must remain strings, including values with 18 places.
    for (const key of ["minPrice", "maxPrice"]) {
      if (raw.has(key)) parsed[key] = raw.get(key);
    }
    return parsed;
  },
  routeTree: root.addChildren([
    home,
    detail,
    cart,
    checkout,
    order,
    login,
    signup,
    profile,
    wallets,
  ]),
  defaultPendingComponent: () => (
    <div className="wrap page">
      <Loading kind="form" />
    </div>
  ),
  defaultErrorComponent: ({ error, reset }) => (
    <div className="wrap page">
      <Failure error={error} retry={reset} />
    </div>
  ),
  defaultNotFoundComponent: () => (
    <section className="wrap page">
      <h1>Página não encontrada</h1>
      <Link className="btn" to="/">
        Voltar ao catálogo
      </Link>
    </section>
  ),
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
export default function App() {
  return <RouterProvider router={router} />;
}
function Shell() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { data: session } = useSession();
  const { data: cart } = useCart();
  const rt = useRealtime();
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    let processing = false;
    const expire = async () => {
      if (processing) return;
      processing = true;
      const path = router.state.location.href;
      await clearSession();
      if (/^\/(checkout|profile|wallets|order)/.test(path))
        await router.navigate({ to: "/login", search: { redirect: path } });
      processing = false;
    };
    window.addEventListener("session-expired", expire);
    const storage = (e: StorageEvent) => {
      if (e.key === "novanft-token") void expire();
    };
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("session-expired", expire);
      window.removeEventListener("storage", storage);
    };
  }, []);
  useEffect(() => {
    if (!session?.expiresAt) return;
    const timer = setTimeout(
      () => window.dispatchEvent(new Event("session-expired")),
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [session?.expiresAt]);
  const nav = (
    <>
      <Link
        to="/"
        className={pathname === "/" ? "selected-nav" : ""}
        onClick={() => setMenu(false)}
      >
        Início
      </Link>
      <Link
        to="/"
        className={pathname.startsWith("/nft/") ? "selected-nav" : ""}
        search={{ category: "Arte digital" }}
        onClick={() => setMenu(false)}
      >
        Mercado
      </Link>
      <Link to="/" hash="criadores" onClick={() => setMenu(false)}>
        Criadores
      </Link>
      <LearnLink />
    </>
  );
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="topbar">
        <div className="wrap nav">
          <Link to="/" className="brand" aria-label="KURIO — Início">
            <span className="logo">◆</span>KURIO
          </Link>
          <nav className="navlinks" aria-label="Principal">
            {nav}
          </nav>
          <div className="navright">
            <Link
              to="/"
              hash="catalog-search"
              className="iconbtn"
              aria-label="Buscar no mercado"
            >
              <Search size={23} />
            </Link>
            <Link
              to="/cart"
              className="iconbtn carticon"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={21} />
              {!!cart?.length && (
                <span className="count">
                  {cart.reduce((n, i) => n + i.quantity, 0)}
                </span>
              )}
            </Link>
            {session?.user ? (
              <Link to="/profile" className="avatar" aria-label="Perfil">
                {session.user.avatar ? (
                  <img src={session.user.avatar} alt="" />
                ) : (
                  session.user.name[0]
                )}
              </Link>
            ) : (
              <Link className="btn small outline" to="/login">
                <LogIn size={18} /> Entrar
              </Link>
            )}
            <Dialog open={menu} onOpenChange={setMenu}>
              <DialogTrigger asChild>
                <button className="iconbtn mobile-menu" aria-label="Abrir menu">
                  <Menu />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle className="text-xl font-bold">
                  Navegação
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Explore o catálogo e sua conta.
                </DialogDescription>
                <nav className="stack" aria-label="Menu móvel">
                  {nav}
                </nav>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      <div className="sr-only" role="status" aria-live="polite">
        {rt.status === "connected"
          ? "● Atualizações em tempo real"
          : rt.status === "connecting"
            ? "Conectando atualizações…"
            : "Conexão interrompida. Reconectando…"}
      </div>
      {rt.message && (
        <div className="wrap notice" role="status">
          <span>{rt.message}</span>
          <button
            className="iconbtn"
            aria-label="Dispensar aviso"
            onClick={rt.dismiss}
          >
            <X size={18} />
          </button>
        </div>
      )}
      <main id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
      <MarketFooter />
      <footer className="footer wrap">
        <span className="copyright">
          © 2026 Kurio. Propriedade digital para todos.
        </span>
        <span>Compras e carteiras simuladas.</span>
        <DemoControls />
        {session?.user && (
          <button
            className="textbutton"
            onClick={async () => {
              await api.logout();
              await clearSession();
              await router.navigate({ to: "/" });
            }}
          >
            Sair
          </button>
        )}
      </footer>
      <nav className="mobile-bottom-nav" aria-label="Navegação móvel">
        <Link to="/" aria-label="Início">
          <House size={20} />
        </Link>
        <Link to="/profile" hash="favoritos" aria-label="Favoritos">
          <Heart size={20} />
        </Link>
        <Link
          to="/wallets"
          className="nav-wallet"
          aria-label="Minhas carteiras"
        >
          <ScanLine size={28} />
        </Link>
        <Link to="/cart" aria-label="Abrir carrinho">
          <ShoppingCart size={20} />
        </Link>
        <Link to="/profile" aria-label="Perfil">
          <UserRound size={20} />
        </Link>
      </nav>
    </>
  );
}
