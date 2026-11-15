import { Link } from "@tanstack/react-router";
import { Gem, ShieldCheck, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
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
          <Wallet aria-hidden="true" />
          <h2>Conecte sua carteira</h2>
          <p>Cadastre suas carteiras e escolha a rede para sua coleção.</p>
        </div>
        <div>
          <Gem aria-hidden="true" />
          <h2>Descubra novas coleções</h2>
          <p>Encontre edições especiais e salve suas obras favoritas.</p>
        </div>
        <div>
          <ShieldCheck aria-hidden="true" />
          <h2>Colecione com confiança</h2>
          <p>Revise cada valor e acompanhe o resultado do seu pedido.</p>
        </div>
      </div>
      <div className="market-footer-links">
        <div>
          <Link className="brand" to="/">
            ◆ KURIO
          </Link>
          <p>Uma nova perspectiva sobre a arte digital.</p>
        </div>
        <div>
          <h2>Marketplace</h2>
          <Link to="/">Explorar NFTs</Link>
          <Link to="/cart">Meu carrinho</Link>
        </div>
        <div>
          <h2>Meu perfil</h2>
          <Link to="/profile">Perfil e pedidos</Link>
          <Link to="/wallets">Carteiras</Link>
        </div>
        <div>
          <h2>Saiba mais</h2>
          <LearnLink />
          <span>Ambiente demonstrativo</span>
        </div>
      </div>
    </section>
  );
}
