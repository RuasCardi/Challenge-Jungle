import { useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  ZoomIn,
} from "lucide-react";
import axios from "axios";
import { api } from "../api";
import { artworkSources } from "../artwork";
import type { CatalogParams, NFT } from "../data";
import {
  useAction,
  useCart,
  useFavorites,
  useNft,
  useSession,
} from "../queries";
import { eth } from "../money";
import { ErrorText, Failure, Loading, useTitle } from "../components/common";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { DiscoverySections, RelatedNFTs } from "../components/collections";

function Favorite({ n, full = false }: { n: NFT; full?: boolean }) {
  const { data: session } = useSession();
  const { query, mutation } = useFavorites();
  const navigate = useNavigate();
  const liked = !!query.data?.includes(n.id);
  return (
    <>
      <button
        className={
          full ? "btn outline favorite-full" : `heart ${liked ? "liked" : ""}`
        }
        aria-label={liked ? "Remover favorito" : "Adicionar favorito"}
        aria-pressed={liked}
        disabled={mutation.isPending}
        onClick={() =>
          session?.user
            ? mutation.mutate({ id: n.id, favorite: !liked })
            : navigate({
                to: "/login",
                search: { redirect: location.pathname + location.search },
              })
        }
      >
        <Heart size={19} fill={liked ? "currentColor" : "none"} />
        {full && <span>{liked ? "Favoritado" : "Favoritar"}</span>}
      </button>
      <ErrorText error={mutation.error} />
    </>
  );
}
function NFTCard({ n, index }: { n: NFT; index: number }) {
  return (
    <article className="nftcard">
      <Link to="/nft/$id" params={{ id: n.id }}>
        <div className="nftcard-art">
          <img
            src={n.image}
            srcSet={artworkSources(n.image)}
            sizes="(max-width: 650px) calc((100vw - 80px) / 2), (max-width: 1200px) calc((100vw - 326px) / 2), 250px"
            width="447"
            height="447"
            alt={`Arte de ${n.name}`}
            loading={index < 4 ? "eager" : "lazy"}
            fetchPriority={index < 2 ? "high" : "auto"}
          />
          {index === 2 && <span className="rarity-tag">RARO</span>}
        </div>
        <div className="cardbody">
          <h3>{n.name}</h3>
          <div className="cardbottom">
            <strong>{eth(n.price)}</strong>
          </div>
        </div>
      </Link>
      <Favorite n={n} />
    </article>
  );
}
const categories = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativa",
  "Jogos",
  "Assinaturas",
  "Utilidade",
  "Premium",
];
const highlights = [
  "/assets/ape-hero.webp",
  "/assets/ape-sage.webp",
  "/assets/ape-neon.webp",
];
export function Home() {
  useTitle("Explore arte digital");
  const search = useSearch({ from: "/" });
  const navigate = useNavigate({ from: "/" });
  const filters = useRef<HTMLElement>(null);
  const [highlight, setHighlight] = useState(0);
  const [priceDraft, setPriceDraft] = useState({
    url: search.maxPrice,
    value: search.maxPrice || "12.3",
  });
  const maxPrice =
    priceDraft.url === search.maxPrice
      ? priceDraft.value
      : search.maxPrice || "12.3";
  const setMaxPrice = (value: string) =>
    setPriceDraft({ url: search.maxPrice, value });
  const update = (next: CatalogParams) =>
    navigate({ search: (previous) => ({ ...previous, ...next }) });
  const query = useQuery({
    queryKey: ["nfts", search],
    queryFn: ({ signal }) => api.nfts(search, signal),
  });
  const data = query.data;
  const networks = (search.network || "").split(",").filter(Boolean);
  return (
    <div className="wrap home-page">
      <div className="home-mobile-search" role="search">
        <label>
          <Search size={19} />
          <input
            aria-label="Explorar coleções"
            placeholder="Explorar coleções"
            value={search.search || ""}
            onChange={(e) => update({ search: e.target.value, page: 1 })}
          />
        </label>
        <button
          className="btn"
          aria-label="Filtros"
          onClick={() => {
            filters.current?.scrollIntoView({ behavior: "smooth" });
            filters.current?.focus({ preventScroll: true });
          }}
        >
          <SlidersHorizontal size={21} />
        </button>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Bem-vindo à Kurio</div>
          <h1>
            <span className="desktop-hero-title">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </span>
            <span className="mobile-hero-title">
              SEJA DONO DA
              <br />
              CULTURA DIGITAL
            </span>
          </h1>
          <p>
            <span className="desktop-hero-description">
              Descubra NFTs selecionados de criadores emergentes e consagrados.
              Colecione arte digital rara, apoie artistas e tenha uma parte da
              cultura da internet.
            </span>
            <span className="mobile-hero-description">
              Descubra NFTs selecionados de criadores do mundo todo.
            </span>
          </p>
          <a href="#catalogo" className="btn hero-explore">
            EXPLORAR <ArrowRight size={16} />
          </a>
        </div>
        <div className="hero-art">
          <img
            src={highlights[highlight]}
            srcSet={artworkSources(highlights[highlight])}
            sizes="(max-width: 650px) 140px, (max-width: 1200px) 40vw, 450px"
            width="447"
            height="447"
            fetchPriority="high"
            alt="Arte da coleção Kurio Apes"
          />
          <img
            className="hero-mini"
            src={highlights[(highlight + 1) % highlights.length]}
            alt=""
            width="80"
            height="80"
          />
        </div>
        <div className="hero-dots" aria-label="Destaques">
          {highlights.map((_, i) => (
            <button
              key={i}
              aria-label={`Destaque ${i + 1}`}
              aria-pressed={highlight === i}
              onClick={() => setHighlight(i)}
            />
          ))}
        </div>
      </section>
      <section id="catalogo" className="catalog" aria-label="Catálogo de NFTs">
        <h2 className="catalog-title sr-only">Descubra NFTs</h2>
        <div className="catalog-layout">
          <aside
            className="catalog-sidebar"
            id="filtros"
            ref={filters}
            tabIndex={-1}
            aria-label="Filtros do catálogo"
          >
            <div className="filter-panel">
              <h2>Coleções</h2>
              <div className="category-list">
                {categories.map((category) => (
                  <button
                    key={category}
                    aria-pressed={search.category === category}
                    className={search.category === category ? "active" : ""}
                    onClick={() =>
                      update({
                        category: search.category === category ? "" : category,
                        page: 1,
                      })
                    }
                  >
                    {category}
                    <span>({data?.categoryCounts?.[category] || 0})</span>
                  </button>
                ))}
              </div>
              <h2 className="sidebar-subtitle">Faixa de preço</h2>
              <input
                className="range"
                type="range"
                min="0"
                max="12.3"
                step="0.01"
                aria-label="Preço máximo"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
              <small>Preço: 0,00 – {maxPrice.replace(".", ",")} ETH</small>
              <Button size="sm" onClick={() => update({ maxPrice, page: 1 })}>
                Aplicar
              </Button>
              <h2 className="sidebar-subtitle">Rede</h2>
              {["Ethereum", "Polygon", "Solana"].map((network) => (
                <label className="network-filter" key={network}>
                  <input
                    type="checkbox"
                    checked={networks.includes(network)}
                    onChange={(e) =>
                      update({
                        network: (e.target.checked
                          ? [...networks, network]
                          : networks.filter((n) => n !== network)
                        ).join(","),
                        page: 1,
                      })
                    }
                  />
                  {network}
                  <span>({data?.networkCounts?.[network] || 0})</span>
                </label>
              ))}
              <div className="catalog-filters">
                <label className="search-filter">
                  Buscar NFTs
                  <input
                    id="catalog-search"
                    aria-label="Buscar NFTs"
                    value={search.search || ""}
                    onChange={(e) =>
                      update({ search: e.target.value, page: 1 })
                    }
                    placeholder="Nome ou criador"
                  />
                </label>
                <label>
                  Categoria
                  <select
                    aria-label="Categoria"
                    value={search.category || ""}
                    onChange={(e) =>
                      update({ category: e.target.value, page: 1 })
                    }
                  >
                    <option value="">Todas as categorias</option>
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Coleção
                  <select
                    aria-label="Coleção"
                    value={search.collection || ""}
                    onChange={(e) =>
                      update({ collection: e.target.value, page: 1 })
                    }
                  >
                    <option value="">Todas as coleções</option>
                    {data?.collections.map((collection) => (
                      <option key={collection}>{collection}</option>
                    ))}
                  </select>
                </label>
                <label className="availability-filter">
                  <input
                    type="checkbox"
                    checked={!!search.available}
                    onChange={(e) =>
                      update({ available: e.target.checked, page: 1 })
                    }
                  />{" "}
                  Apenas disponíveis
                </label>
                <label className="mobile-sort-control">
                  Ordenar por
                  <select
                    aria-label="Ordenação"
                    value={search.sort || ""}
                    onChange={(e) => update({ sort: e.target.value, page: 1 })}
                  >
                    <option value="">Listados recentemente</option>
                    <option value="price-asc">Menor preço</option>
                    <option value="price-desc">Maior preço</option>
                  </select>
                </label>
                <button
                  className="textbutton"
                  onClick={() => {
                    setMaxPrice("12.3");
                    void navigate({ search: { page: 1 } });
                  }}
                >
                  Limpar filtros
                </button>
              </div>
            </div>
            <Link
              className="featured-nft"
              to="/nft/$id"
              params={{ id: "sage-nomad" }}
            >
              <strong>NFT EM DESTAQUE</strong>
              <h3>OFERTA LIMITADA</h3>
              <img
                src="/assets/ape-sage.webp"
                alt="Sage Nomad em destaque"
                width="310"
                height="366"
                loading="lazy"
              />
            </Link>
          </aside>
          <div className="catalog-results" aria-busy={query.isFetching}>
            <div className="catalog-tabs">
              <div role="group" aria-label="Seleção do catálogo">
                {(
                  [
                    ["all", "Todos os NFTs"],
                    ["new", "Novos lançamentos"],
                    ["trending", "Em alta"],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    className={(search.tab || "all") === tab ? "active" : ""}
                    aria-pressed={(search.tab || "all") === tab}
                    onClick={() => update({ tab, page: 1 })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="sort-control">
                Ordenar por:
                <select
                  aria-label="Organizar NFTs"
                  value={search.sort || ""}
                  onChange={(e) => update({ sort: e.target.value, page: 1 })}
                >
                  <option value="">Listados recentemente</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                </select>
              </label>
            </div>
            {query.isPending ? (
              <Loading />
            ) : query.error ? (
              <Failure error={query.error} retry={query.refetch} />
            ) : !data?.items.length ? (
              <div className="panel center" role="status">
                Nenhum NFT encontrado. Experimente outros filtros.
              </div>
            ) : (
              <div className="cards">
                {data.items.map((n, i) => (
                  <NFTCard key={n.id} n={n} index={i} />
                ))}
              </div>
            )}
            <nav className="pagination" aria-label="Paginação do catálogo">
              <Button
                variant="outline"
                size="sm"
                aria-label="Anterior"
                disabled={(search.page || 1) <= 1}
                onClick={() => update({ page: (search.page || 1) - 1 })}
              >
                <ChevronLeft size={16} />
              </Button>
              {Array.from({ length: Math.min(4, data?.pages || 1) }, (_, i) => (
                <button
                  key={i}
                  className={(search.page || 1) === i + 1 ? "active" : ""}
                  aria-label={`Página ${i + 1}`}
                  aria-current={
                    (search.page || 1) === i + 1 ? "page" : undefined
                  }
                  onClick={() => update({ page: i + 1 })}
                >
                  {i + 1}
                </button>
              ))}
              <span className="sr-only">
                Página {search.page || 1} de {data?.pages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                aria-label="Próxima"
                disabled={(search.page || 1) >= (data?.pages || 1)}
                onClick={() => update({ page: (search.page || 1) + 1 })}
              >
                <ChevronRight size={16} />
              </Button>
            </nav>
          </div>
        </div>
      </section>
      <DiscoverySections />
    </div>
  );
}
export function Detail() {
  const { id } = useParams({ from: "/nft/$id" });
  const query = useNft(id);
  useTitle(query.data?.name || "Detalhes do NFT");
  return (
    <div className="wrap page detail-page">
      {query.isPending ? (
        <Loading kind="detail" />
      ) : query.error ? (
        axios.isAxiosError(query.error) &&
        query.error.response?.status === 404 ? (
          <div className="panel center">
            <h1>NFT não encontrado</h1>
            <Link to="/">Voltar ao catálogo</Link>
          </div>
        ) : (
          <Failure error={query.error} retry={query.refetch} />
        )
      ) : query.data ? (
        <DetailContent key={id} n={query.data} />
      ) : null}
    </div>
  );
}
function DetailContent({ n }: { n: NFT }) {
  const { data: cart } = useCart();
  const [editionId, setEdition] = useState(n.editions[0].id);
  const [qty, setQty] = useState(1);
  const [gallery, setGallery] = useState(0);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const edition = n.editions.find((e) => e.id === editionId)!;
  const add = useAction(api.cartSet);
  const navigate = useNavigate();
  const existing =
    cart?.find((i) => i.id === n.id && i.editionId === editionId)?.quantity ||
    0;
  const remaining = Math.max(0, edition.available - existing);
  const quantity = Math.min(qty, Math.max(1, remaining));
  const buy = async (checkout: boolean) => {
    await add.mutateAsync({
      id: n.id,
      editionId,
      quantity: existing + quantity,
    });
    setAdded(true);
    if (checkout) await navigate({ to: "/checkout" });
  };
  return (
    <>
      <div className="crumb">
        <Link to="/">Início</Link> /{" "}
        <Link to="/" hash="catalogo">
          Mercado
        </Link>
      </div>
      <div className="detail-mobile-top">
        <Link className="round-control" to="/" aria-label="Voltar ao catálogo">
          <ArrowLeft size={19} />
        </Link>
        <Favorite n={n} />
      </div>
      <div className="detailgrid">
        <div className="detail-gallery">
          <div className="detailart">
            <img
              src={n.gallery[gallery]}
              srcSet={artworkSources(n.gallery[gallery])}
              sizes="(max-width: 650px) calc(100vw - 56px), (max-width: 1200px) 42vw, 404px"
              alt={`${n.name} — vista ${gallery + 1}`}
              width="447"
              height="447"
              fetchPriority="high"
            />
            <Dialog>
              <DialogTrigger asChild>
                <button className="zoom-art" aria-label="Ampliar imagem">
                  <ZoomIn size={25} />
                </button>
              </DialogTrigger>
              <DialogContent className="gallery-dialog">
                <DialogTitle>{n.name}</DialogTitle>
                <DialogDescription className="sr-only">
                  Visualização ampliada da arte selecionada.
                </DialogDescription>
                <img
                  src={n.gallery[gallery]}
                  alt={`Arte ampliada de ${n.name}`}
                  width="700"
                  height="700"
                />
              </DialogContent>
            </Dialog>
          </div>
          <div className="thumbnails" aria-label="Galeria">
            {n.gallery.map((image, i) => (
              <button
                key={`${image}-${i}`}
                className={i === gallery ? "selected" : ""}
                onClick={() => setGallery(i)}
                aria-label={`Ver imagem ${i + 1}`}
                aria-pressed={gallery === i}
              >
                <img src={image} alt="" width="100" height="100" />
              </button>
            ))}
          </div>
        </div>
        <div className="detailinfo">
          <h1>{n.name}</h1>
          <div className="detail-price-rating">
            <span className="detail-rating">
              <span aria-hidden="true">★★★★☆</span>{" "}
              <small>Avaliações em breve</small>
            </span>
          </div>
          <div className="detail-about">
            <h2>Sobre este NFT:</h2>
            <p>
              Um colecionável digital da coleção {n.collection}, criado por{" "}
              {n.creator}, com arte exclusiva para colecionadores.
            </p>
          </div>
          <div className="edition-picker">
            <span>Edição:</span>
            <div className="edition-chips" aria-label="Escolher edição">
              {n.editions.map((e) => (
                <button
                  key={e.id}
                  aria-pressed={e.id === editionId}
                  className={e.id === editionId ? "selected" : ""}
                  onClick={() => {
                    setEdition(e.id);
                    setQty(1);
                    setAdded(false);
                  }}
                >
                  {e.id === "standard" ? "1/50" : "1/10"}
                  {e.available === 0 && " · esgotada"}
                </button>
              ))}
            </div>
            <label className="edition-select">
              <span className="sr-only">Edição</span>
              <select
                aria-label="Edição"
                value={editionId}
                onChange={(e) => {
                  setEdition(e.target.value);
                  setQty(1);
                  setAdded(false);
                }}
              >
                {n.editions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                    {!e.available ? " — esgotada" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="detail-purchase-bar">
            <div className="detail-quantity">
              <span id="quantity-label">Qtd.</span>
              <div
                className="quantity"
                role="group"
                aria-labelledby="quantity-label"
              >
                <button
                  disabled={quantity <= 1}
                  onClick={() => setQty(quantity - 1)}
                  aria-label="Diminuir"
                >
                  <Minus size={18} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button
                  disabled={quantity >= remaining}
                  onClick={() => setQty(quantity + 1)}
                  aria-label="Aumentar"
                >
                  <Plus size={18} />
                </button>
              </div>
              <strong className="detail-current-price bigprice">
                {eth(edition.price)}
              </strong>
            </div>
            <div className="detail-buy-actions">
              <Button
                disabled={!remaining || add.isPending}
                onClick={() => void buy(true).catch(() => {})}
              >
                Comprar agora
              </Button>
              <Favorite n={n} full />
              <Button
                variant="outline"
                className="add-to-cart"
                aria-label={
                  !edition.available
                    ? "Edição esgotada"
                    : "Adicionar ao carrinho"
                }
                disabled={!remaining || add.isPending}
                onClick={() => void buy(false).catch(() => {})}
              >
                <ShoppingCart size={20} />
                <span>
                  {!edition.available
                    ? "Edição esgotada"
                    : "Adicionar ao carrinho"}
                </span>
              </Button>
            </div>
            <ErrorText error={add.error} />
            {added && (
              <p role="status" className="green">
                NFT adicionado ao carrinho. <Link to="/cart">Ver carrinho</Link>
              </p>
            )}
          </div>
          <div className="token-info">
            <p>ID do token: #{n.name.split("#")[1] || n.id}</p>
            <p>Coleção: {n.collection}</p>
            <p>Atributos: Arte digital, {edition.label}</p>
            <p className="stock-info">
              {edition.available} disponíveis · {n.network} · {n.category}
            </p>
          </div>
          <div className="share-nft">
            <span>Compartilhar este NFT:</span>
            <button
              className="textbutton"
              onClick={() =>
                void navigator.clipboard
                  .writeText(location.href)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false))
              }
              aria-label="Copiar link do NFT"
            >
              {copied ? "Link copiado" : "Copiar link"}
            </button>
            <span className="sr-only" role="status">
              {copied ? "Link copiado para a área de transferência." : ""}
            </span>
          </div>
        </div>
      </div>
      <section className="detail-description">
        <h2>Detalhes do NFT</h2>
        <p>
          {n.description} Cada atributo faz parte dos metadados desta coleção.
        </p>
        <p>
          A propriedade inclui a arte em alta resolução e um registro de
          procedência. Esta aplicação demonstra a experiência de colecionar sem
          realizar transações reais.
        </p>
        <h3>Rede:</h3>
        <p>{n.network}. Carteira e compra simuladas.</p>
        <h3>Criador:</h3>
        <p>{n.creator}</p>
        <h3>Disponibilidade:</h3>
        <p>
          {edition.available} unidades da {edition.label.toLowerCase()}. A
          disponibilidade é revalidada antes da compra.
        </p>
      </section>
      <RelatedNFTs excludeId={n.id} />
    </>
  );
}
