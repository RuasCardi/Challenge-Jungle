import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function InformationLink({
  children,
  title,
  className = "textbutton",
}: {
  children: React.ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={className}>{children}</button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        <DialogDescription className="muted mt-3">
          Esta área não faz parte da demonstração. Explore o catálogo, salve
          favoritos ou acesse sua conta para experimentar as funcionalidades
          disponíveis.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
export function LearnLink() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="textbutton nav-learn">Aprenda</button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="text-xl font-bold">
          Como funciona a demonstração
        </DialogTitle>
        <DialogDescription className="muted mt-3">
          Explore as obras, escolha uma edição e adicione ao carrinho. Entre com
          uma conta fictícia, conecte uma carteira simulada e revise os valores
          antes de confirmar.
        </DialogDescription>
        <p className="mt-4">
          Pagamentos, carteiras e transações são simulados. Nenhuma moeda ou NFT
          real é transferido. Em caso de falha, retome a mesma tentativa em
          Pagamento ou acompanhe o pedido em Meu perfil.
        </p>
      </DialogContent>
    </Dialog>
  );
}
export function MarketFooter() {
  return (
    <section className="market-footer wrap" aria-label="Sobre o marketplace">
      <div className="market-benefits">
        <div>
          <span className="benefit-icon" aria-hidden="true">
            W
          </span>
          <h2>Segurança da carteira</h2>
          <p>
            Proteja sua carteira e colecione arte digital verificada com
            confiança.
          </p>
        </div>
        <div id="criadores">
          <span className="benefit-icon" aria-hidden="true">
            C
          </span>
          <h2>Criadores em destaque</h2>
          <p>
            Conheça artistas, estúdios e comunidades que moldam a cultura
            digital na rede.
          </p>
        </div>
        <div>
          <span className="benefit-icon" aria-hidden="true">
            D
          </span>
          <h2>Alertas de lançamentos</h2>
          <p>
            Receba calendários de cunhagem, novidades e listas de acesso e
            análises do mercado.
          </p>
        </div>
        <div className="newsletter">
          <h2>Antecipe-se ao próximo lançamento</h2>
          <div className="newsletter-form">
            <input
              type="email"
              aria-label="E-mail para novidades"
              placeholder="digite seu e-mail..."
            />
            <InformationLink title="Novidades da Kurio" className="btn">
              Enviar
            </InformationLink>
          </div>
          <p>
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>
        </div>
      </div>
      <div className="market-contact">
        <Link className="brand" to="/">
          KURIO
        </Link>
        <span>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </span>
        <a href="mailto:contato@email.com">contato@email.com</a>
        <span>+55 11 4002 8922</span>
      </div>
      <div className="market-footer-links">
        <div>
          <h2>Meu perfil</h2>
          <Link to="/profile">Meu perfil</Link>
          <Link to="/profile" hash="atividade">
            Minha coleção
          </Link>
          <InformationLink title="Atividade">Atividade</InformationLink>
          <InformationLink title="Estúdio do criador">
            Estúdio do criador
          </InformationLink>
          <Link to="/profile" hash="favoritos">
            Lista de interesse
          </Link>
        </div>
        <div>
          <h2>Central de ajuda</h2>
          <InformationLink title="Central de ajuda">
            Central de ajuda
          </InformationLink>
          <LearnLink />
          <Link to="/wallets">Carteira e segurança</Link>
          <InformationLink title="Política do mercado">
            Política do mercado
          </InformationLink>
          <InformationLink title="Denunciar item">
            Denunciar item
          </InformationLink>
        </div>
        <div>
          <h2>Coleções</h2>
          {["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"].map(
            (category) => (
              <Link
                key={category}
                to="/"
                hash="catalogo"
                search={{ category, page: 1 }}
              >
                {category}
              </Link>
            ),
          )}
        </div>
        <div>
          <h2>Redes sociais</h2>
          <div className="social-links">
            {[
              [Facebook, "Facebook"],
              [Instagram, "Instagram"],
              [Twitter, "Twitter"],
              [Linkedin, "LinkedIn"],
              [Youtube, "YouTube"],
            ].map(([Icon, name]) => {
              const SocialIcon = Icon as typeof Facebook;
              return (
                <InformationLink key={String(name)} title={`Kurio no ${name}`}>
                  <SocialIcon size={18} aria-label={String(name)} />
                </InformationLink>
              );
            })}
          </div>
          <h2>Carteiras compatíveis</h2>
          <span className="compatible-wallets">
            METAMASK · WALLETCONNECT · COINBASE
          </span>
        </div>
      </div>
    </section>
  );
}
