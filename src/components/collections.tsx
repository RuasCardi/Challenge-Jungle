import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { api } from "../api";
import { eth } from "../money";
import { InformationLink } from "./market-footer";
function useFeatured() {
  return useQuery({
    queryKey: ["nfts", {}],
    queryFn: ({ signal }) => api.nfts({}, signal),
  });
}
export function DiscoverySections() {
  const articles = [
    {
      image: "/assets/ape-neon.webp",
      title: "Como funciona a propriedade de NFTs",
      date: "12",
      minutes: "6",
      description:
        "Aprenda a colecionar, negociar e verificar ativos digitais.",
    },
    {
      image: "/assets/ape-hero.webp",
      title: "10 artistas digitais para acompanhar",
      date: "13",
      minutes: "2",
      description: "Conheça criadores que moldam a cultura digital.",
    },
    {
      image: "/assets/ape-sage.webp",
      title: "Raridade, atributos e procedência",
      date: "15",
      minutes: "3",
      description:
        "Entenda raridade, procedência, direitos autorais e utilidade.",
    },
    {
      image: "/assets/ape-golden.webp",
      title: "Como proteger sua carteira",
      date: "15",
      minutes: "2",
      description: "Proteja sua carteira, seus ativos e sua identidade.",
    },
  ];
  return (
    <>
      <section className="collection-banners" aria-label="Coleções em destaque">
        <Link
          to="/"
          hash="catalogo"
          search={{ tab: "new", page: 1 }}
          className="collection-banner"
        >
          <img
            src="/assets/ape-hero.webp"
            alt=""
            width="288"
            height="250"
            loading="lazy"
          />
          <div>
            <h2>Lançamentos gênesis de edição limitada</h2>
            <p>
              Colecione edições escassas diretamente dos criadores antes da
              revelação pública.
            </p>
            <span className="banner-cta">
              Explorar <ArrowRight size={16} />
            </span>
          </div>
        </Link>
        <Link
          to="/"
          hash="catalogo"
          search={{ category: "Arte digital", page: 1 }}
          className="collection-banner"
        >
          <img
            src="/assets/ape-neon.webp"
            alt=""
            width="288"
            height="250"
            loading="lazy"
          />
          <div>
            <h2>Arte digital selecionada e muito mais</h2>
            <p>
              Explore novos artistas, coleções verificadas e obras digitais.
            </p>
            <span className="banner-cta">
              Explorar <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      </section>
      <section className="journal-section" aria-labelledby="journal-heading">
        <div className="sectionheading center">
          <h2 id="journal-heading">Diário da Cunhagem</h2>
          <p>
            Histórias, guias e insights para colecionadores sobre o universo da
            propriedade digital.
          </p>
        </div>
        <div className="journal-grid">
          {articles.map((article) => (
            <article className="journal-card" key={article.title}>
              <img
                src={article.image}
                alt=""
                width="268"
                height="196"
                loading="lazy"
              />
              <small>
                {article.date} de setembro | Leitura de {article.minutes} min
              </small>
              <h3>{article.title}</h3>
              <p>{article.description}</p>
              <InformationLink title={article.title}>
                Ler mais →
              </InformationLink>
            </article>
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
        <h2>Mais desta coleção</h2>
        <Link to="/" hash="catalogo">
          Ver todos <ArrowRight size={15} />
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
            <div className="related-art">
              <img
                src={n.image}
                width="240"
                height="240"
                loading="lazy"
                alt={`Arte de ${n.name}`}
              />
            </div>
            <h3>{n.name}</h3>
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
          <div className="eyebrow">Bem-vindo à Kurio</div>
          <h2>
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </h2>
          <p>
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara, apoie artistas e tenha uma parte da
            cultura da internet.
          </p>
          <span className="btn">EXPLORAR</span>
        </div>
        <div className="hero-art">
          <img src="/assets/ape-hero.webp" alt="" width="700" height="700" />
        </div>
      </div>
      <div className="catalog-layout">
        <aside className="filter-panel">
          <h2>Coleções</h2>
          {[
            "Arte digital",
            "Fotografia",
            "Música",
            "Arte 3D",
            "Colecionáveis",
            "Generativa",
            "Jogos",
            "Assinaturas",
            "Utilidade",
          ].map((category) => (
            <p key={category}>{category}</p>
          ))}
          <h2>Faixa de preço</h2>
          <p>0,02 – 12,30 ETH</p>
          <h2>Rede</h2>
          <p>Ethereum</p>
          <p>Polygon</p>
          <p>Solana</p>
        </aside>
        <div>
          <div className="catalog-tabs">
            <span>Todos os NFTs</span>
            <span>Novos lançamentos</span>
            <span>Em alta</span>
          </div>
          <div className="cards">
            {data?.items.map((n) => (
              <article className="nftcard" key={n.id}>
                <div className="nftcard-art">
                  <img src={n.image} alt="" width="300" height="300" />
                </div>
                <div className="cardbody">
                  <h3>{n.name}</h3>
                  <div className="cardbottom">
                    <strong>{eth(n.price)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
