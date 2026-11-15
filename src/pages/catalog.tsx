import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Zap,
} from "lucide-react";
import axios from "axios";
import { api } from "../api";
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
import { DiscoverySections, RelatedNFTs } from "../components/collections";
function Favorite({ n, full = false }: { n: NFT; full?: boolean }) {
  const { data: session } = useSession();
  const { query, mutation } = useFavorites();
  const navigate = useNavigate();
  const liked = !!query.data?.includes(n.id);
  return (
    <>
      <button
        className={full ? "btn ghost full" : `heart ${liked ? "liked" : ""}`}
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
        {full && (liked ? "Favoritado" : "Adicionar aos favoritos")}
      </button>
      <ErrorText error={mutation.error} />
    </>
  );
}
function NFTCard({ n }: { n: NFT }) {
  return (
    <article className="nftcard">
      <Link to="/nft/$id" params={{ id: n.id }}>
        <img
          src={n.image}
          width="700"
          height="700"
          alt={`Arte de ${n.name}`}
          loading="lazy"
        />
        <div className="cardbody">
          <h3>{n.name}</h3>
          <p>
            {n.collection} <span aria-label="Coleção verificada">✦</span>
          </p>
          <div className="cardbottom">
            <strong>{eth(n.price)}</strong>
          </div>
        </div>
      </Link>
      <Favorite n={n} />
    </article>
  );
}
export function Home() {
  useTitle("Explore arte digital");
  const search = useSearch({ from: "/" });
  const navigate = useNavigate({ from: "/" });
  const update = (next: CatalogParams) =>
    navigate({ search: (previous) => ({ ...previous, ...next }) });
  const query = useQuery({
    queryKey: ["nfts", search],
    queryFn: ({ signal }) => api.nfts(search, signal),
  });
  const data = query.data;
  return (
    <div className="wrap">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <Zap size={15} /> O FUTURO DA ARTE DIGITAL
          </div>
          <h1>
            Seja dono do futuro
            <br />
            <em>da arte digital.</em>
          </h1>
          <p>
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara, apoie artistas e tenha uma parte da
            cultura da internet.
          </p>
          <div className="actions">
            <a href="#catalogo" className="btn">
              Explorar
            </a>
          </div>
        </div>
        <div className="hero-art">
          <img
            src="/assets/0.webp"
            width="700"
            height="700"
            fetchPriority="high"
            alt="Veleiro sob um céu estrelado refletido no mar"
          />
          <span className="float-card">✦ Arte sem limites</span>
        </div>
      </section>
      <section id="catalogo" className="catalog">
        <div className="catalog-layout">
          <aside className="catalog-sidebar">
            <h2>Coleções</h2>
            {["Arte digital", "Fotografia", "Música", "Arte 3D", "Colecionáveis", "Generativa", "Jogos", "Assinaturas", "Utilidade"].map((category) => (
              <button key={category} className={search.category === category ? "active" : ""} onClick={() => update({ category, page: 1 })}>
                {category}<span>({Math.max(12, (data?.total || 12) - category.length)})</span>
              </button>
            ))}
            <h2 className="sidebar-subtitle">Faixa de preço</h2>
            <input className="range" type="range" min="0" max="12.3" step="0.1" aria-label="Preço máximo" />
            <small>Preço: 0,02 - 12,30 ETH</small>
            <button className="btn small" onClick={() => update({ page: 1 })}>Aplicar</button>
            <h2 className="sidebar-subtitle">Rede</h2>
            {["Ethereum", "Polygon", "Solana"].map((network) => <label className="network-filter" key={network}><input type="checkbox" />{network}<span>({network === "Ethereum" ? 119 : network === "Polygon" ? 78 : 86})</span></label>)}
          </aside>
          <div className="catalog-results">
            <h2 className="catalog-title">Descubra NFTs</h2>
            <div className="catalog-filters" aria-label="Filtros do catálogo">
              <label className="search-filter">
                Buscar NFTs
                <input
                  aria-label="Buscar NFTs"
                  value={search.search || ""}
                  onChange={(e) => update({ search: e.target.value, page: 1 })}
                  placeholder="Buscar por nome ou criador"
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
                  {["Arte digital", "Colecionáveis", "Premium"].map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
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
                  {(data?.collections || []).map((collection) => (
                    <option key={collection} value={collection}>
                      {collection}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="catalog-tabs">
              <button className="active">Todos os NFTs</button>
              <button>Novos lançamentos</button>
              <button>Em alta</button>
              <label className="sort-control">Ordenar por:
                <select aria-label="Ordenação" value={search.sort || ""} onChange={(e) => update({ sort: e.target.value, page: 1 })}>
                  <option value="">Listados recentemente</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                </select>
              </label>
            </div>
            {query.isPending ? <Loading /> : query.error ? <Failure error={query.error} retry={query.refetch} /> : !data?.items.length ? (
              <div className="panel center" role="status">Nenhum NFT encontrado. Experimente outros filtros.</div>
            ) : <div className="cards">{data.items.map((n) => <NFTCard key={n.id} n={n} />)}</div>}
            <div className="pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={(search.page || 1) <= 1}
            onClick={() => update({ page: (search.page || 1) - 1 })}
          >
            Anterior
          </Button>
          <span>
            Página {search.page || 1} de {data?.pages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={(search.page || 1) >= (data?.pages || 1)}
            onClick={() => update({ page: (search.page || 1) + 1 })}
          >
            Próxima
          </Button>
            </div>
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
    <div className="wrap page">
      {query.isPending ? (
        <>
          <div className="crumb">Explorar / Detalhes</div>
          <Loading kind="detail" />
        </>
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
        <Link to="/">Início</Link> / <Link to="/">Mercado</Link> / {n.name}
      </div>
      <div className="detailgrid">
        <div>
          <div className="detailart">
            <img
              src={n.gallery[gallery]}
              alt={`${n.name} — vista ${gallery + 1}`}
              width="700"
              height="700"
              fetchPriority="high"
            />
          </div>
          <div className="thumbnails" aria-label="Galeria">
            {n.gallery.map((image, i) => (
              <button
                key={image}
                className={i === gallery ? "selected" : ""}
                onClick={() => setGallery(i)}
                aria-label={`Ver imagem ${i + 1}`}
                aria-pressed={gallery === i}
              >
                <img src={image} alt="" width="72" height="72" />
              </button>
            ))}
          </div>
        </div>
        <div className="detailinfo">
          <div className="eyebrow">{n.collection}</div>
          <h1>{n.name}</h1>
          <div className="detail-rating">★★★★★ <span>19 avaliações de colecionadores</span></div>
          <p className="muted">Criado por {n.creator}</p>
          <label className="field">
            Edição
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
          <div className="infoboxes">
            <div>
              <small>Disponível</small>
              <strong>{edition.available} unidades</strong>
            </div>
            <div>
              <small>Categoria</small>
              <strong>{n.category}</strong>
            </div>
          </div>
          <div className="pricebox">
            <small>Preço atual</small>
            <div className="bigprice">{eth(edition.price)}</div>
          </div>
          <span id="quantity-label" className="quantity-label">
            Quantidade
          </span>
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
              <Minus size={17} />
            </button>
            <span aria-live="polite">{quantity}</span>
            <button
              disabled={quantity >= remaining}
              onClick={() => setQty(quantity + 1)}
              aria-label="Aumentar"
            >
              <Plus size={17} />
            </button>
            <span className="muted">Máx. {edition.available} por edição</span>
          </div>
          <div className="stack">
            <Button
              className="full"
              disabled={!remaining || add.isPending}
              onClick={() => void buy(false).catch(() => {})}
            >
              <ShoppingCart size={18} />
              {!edition.available ? "Edição esgotada" : "Adicionar ao carrinho"}
            </Button>
            <Button
              variant="outline"
              className="full"
              disabled={!remaining || add.isPending}
              onClick={() => void buy(true).catch(() => {})}
            >
              Comprar agora
            </Button>
            <Favorite n={n} full />
          </div>
          <ErrorText error={add.error} />
          {added && (
            <p role="status" className="green">
              NFT adicionado ao carrinho. <Link to="/cart">Ver carrinho</Link>
            </p>
          )}
          <div className="description">
            <h2>Descrição</h2>
            <p>{n.description}</p>
          </div>
        </div>
      </div>
      <RelatedNFTs excludeId={n.id} />
    </>
  );
}
