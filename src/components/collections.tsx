import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { api } from "../api";
import { eth } from "../money";

function useFeatured() {
  return useQuery({
    queryKey: ["nfts", {}],
    queryFn: ({ signal }) => api.nfts({}, signal),
  });
}

export function DiscoverySections() {
  const { data } = useFeatured();
  if (!data) return null;
  const creators = [
    ...new Map(data.items.map((n) => [n.creator, n])).values(),
  ].slice(0, 4);
  return (
    <>
      <section className="collection-banners" aria-label="Coleções em destaque">
        {data.items
          .filter((_, i) => i === 0 || i === 3)
          .map((n) => (
            <Link
              key={n.id}
              to="/"
              search={{ collection: n.collection, page: 1 }}
              hash="catalogo"
              className="collection-banner"
            >
              <img
                src={n.image}
                alt=""
                width="220"
                height="220"
                loading="lazy"
              />
              <div>
                <span className="eyebrow">SELEÇÃO ESPECIAL</span>
                <h2>{n.collection}</h2>
                <p>Descubra uma nova forma de colecionar.</p>
                <span className="banner-cta">
                  Explorar coleção <ArrowUpRight size={16} />
                </span>
              </div>
            </Link>
          ))}
      </section>
      <section className="creators-section" aria-labelledby="creators-heading">
        <div className="sectionheading">
          <div>
            <span className="eyebrow">CONHEÇA QUEM CRIA</span>
            <h2 id="creators-heading">Artistas em destaque</h2>
          </div>
        </div>
        <div className="creators-grid">
          {creators.map((n) => (
            <Link
              key={n.creator}
              to="/"
              search={{ search: n.creator, page: 1 }}
              hash="catalogo"
              className="creator-card"
            >
              <img
                src={n.image}
                alt={`Obra de ${n.creator}`}
                width="300"
                height="240"
                loading="lazy"
              />
              <div>
                <h3>
                  {n.creator} <span aria-label="Artista verificado">✦</span>
                </h3>
                <p>{n.collection}</p>
                <span>
                  Ver obras <ArrowUpRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function RelatedNFTs({ excludeId }: { excludeId?: string }) {
  const { data } = useFeatured();
  const items = data?.items.filter((n) => n.id !== excludeId).slice(0, 5);
  if (!items?.length) return null;
  return (
    <section className="related-section" aria-label="Mais obras para explorar">
      <div className="sectionheading">
        <h2>Você também pode gostar</h2>
        <Link to="/">
          Ver todos <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="related-grid">
        {items.map((n) => (
          <Link
            className="related-card"
            to="/nft/$id"
            params={{ id: n.id }}
            key={n.id}
          >
            <img
              src={n.image}
              width="240"
              height="240"
              loading="lazy"
              alt={`Arte de ${n.name}`}
            />
            <h3>{n.name}</h3>
            <p>{n.collection}</p>
            <strong>{eth(n.price)}</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AuthBackdrop() {
  const { data } = useFeatured();
  return (
    <div className="auth-backdrop wrap" aria-hidden="true" inert>
      <div className="hero">
        <div className="hero-copy">
          <h2>Seja dono do futuro da arte digital.</h2>
          <p>Arte digital, colecionáveis e experiências exclusivas.</p>
        </div>
        <div className="hero-art">
          <img src="/assets/0.webp" alt="" width="700" height="700" />
        </div>
      </div>
      <div className="auth-backdrop-grid">
        {data?.items.map((n) => (
          <img key={n.id} src={n.image} alt="" width="300" height="300" />
        ))}
      </div>
    </div>
  );
}
