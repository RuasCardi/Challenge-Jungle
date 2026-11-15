import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { LogOut, Wallet as WalletIcon } from "lucide-react";
import { api } from "../api";
import {
  acceptSession,
  clearSession,
  useAction,
  useFavorites,
  useNft,
  useOrders,
  useSession,
  useWallets,
} from "../queries";
import type { Network, PublicAccount, Wallet } from "../data";
import {
  ErrorText,
  Failure,
  Field,
  Loading,
  useTitle,
} from "../components/common";
import { Button } from "../components/ui/button";
import { AuthBackdrop } from "../components/collections";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
export function Login() {
  useTitle("Entrar");
  return <AuthForm signup={false} />;
}
export function Signup() {
  useTitle("Criar conta");
  return <AuthForm signup />;
}
function AuthForm({ signup }: { signup: boolean }) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const [name, setName] = useState("");
  const [email, setEmail] = useState(signup ? "" : "demo@nft.com");
  const [password, setPassword] = useState(signup ? "" : "Demo123!");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState("");
  const action = useAction(signup ? api.signup : api.login, []);
  return (
    <div className="auth">
      <AuthBackdrop />
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) void navigate({ to: "/" });
        }}
      >
        <DialogContent className="auth-dialog">
          <form
            className="authbox"
            onSubmit={(e) => {
              e.preventDefault();
              if (signup && password !== confirmation) {
                setLocalError("As senhas não coincidem.");
                return;
              }
              setLocalError("");
              action.mutate(
                { name, email, password },
                {
                  onSuccess: async (result) => {
                    await acceptSession(result);
                    if (result.notice)
                      sessionStorage.setItem(
                        "novanft-login-notice",
                        result.notice,
                      );
                    await navigate({ href: search.redirect || "/profile" });
                  },
                },
              );
            }}
          >
            <div className="logo biglogo">◆</div>
            <DialogTitle asChild>
              <h1>{signup ? "Crie sua conta" : "Bem-vindo de volta"}</h1>
            </DialogTitle>
            <DialogDescription className="muted">
              {search.redirect
                ? "Entre para retomar sua navegação."
                : "Sua próxima coleção começa aqui."}
            </DialogDescription>
            {signup && (
              <Field label="Nome completo" name="name" error={action.error}>
                <input
                  required
                  minLength={2}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            )}
            <Field label="E-mail" name="email" error={action.error}>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field
              label={
                signup
                  ? "Senha (mínimo 8 caracteres, letras e números)"
                  : "Senha"
              }
              name="password"
              error={action.error}
            >
              <input
                type="password"
                required
                minLength={signup ? 8 : undefined}
                autoComplete={signup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {signup && (
              <Field label="Confirmar senha" name="confirmation">
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  aria-describedby={
                    localError ? "confirmation-error" : undefined
                  }
                />
              </Field>
            )}
            <ErrorText id="confirmation-error" error={localError} />
            <ErrorText error={action.error} />
            <Button className="full" disabled={action.isPending}>
              {action.isPending
                ? "Aguarde…"
                : signup
                  ? "Criar conta"
                  : "Entrar"}
            </Button>
            <p className="center muted">
              {signup ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
              <Link
                to={signup ? "/login" : "/signup"}
                search={{ redirect: search.redirect }}
              >
                {signup ? "Entrar" : "Criar conta"}
              </Link>
            </p>
            <p className="demo-hint">Conta demo: demo@nft.com / Demo123!</p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function Profile() {
  useTitle("Meu perfil");
  const { data: session } = useSession();
  return session?.user ? (
    <ProfileForm key={session.user.id} user={session.user} />
  ) : (
    <div className="wrap page">
      <Loading kind="form" />
    </div>
  );
}
function FavoriteItem({ id }: { id: string }) {
  const nft = useNft(id);
  return nft.data ? (
    <Link className="favorite-row" to="/nft/$id" params={{ id }}>
      <img src={nft.data.image} width="48" height="48" alt="" />
      {nft.data.name}
    </Link>
  ) : null;
}
function ProfileForm({ user }: { user: PublicAccount }) {
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const update = useAction(api.profile, ["session", "profile"]);
  const pass = useAction(api.password, []);
  const logout = useAction(api.logout, []);
  const orders = useOrders();
  const favorites = useFavorites();
  const [notice] = useState(() =>
    sessionStorage.getItem("novanft-login-notice"),
  );
  return (
    <div className="wrap page">
      <h1>Meu perfil</h1>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="profilegrid">
        <aside className="panel sidepanel account-sidebar">
          <div className="profileavatar">
            {user.avatar ? (
              <img src={user.avatar} alt={`Avatar de ${user.name}`} />
            ) : (
              user.name[0]
            )}
          </div>
          <h2>{user.name}</h2>
          <p className="muted">{user.email}</p>
          <nav className="account-nav" aria-label="Conta">
            <strong>Meu perfil</strong>
            <a className="active" href="#dados">♙ &nbsp; Dados do perfil</a>
            <Link to="/wallets">⌾ &nbsp; Carteiras</Link>
            <a href="#atividade">🛒 &nbsp; Atividade</a>
            <a href="#favoritos">♡ &nbsp; Lista de interesse</a>
            <a href="#ofertas">◉ &nbsp; Ofertas</a>
            <a href="#downloads">♧ &nbsp; Arquivos baixados</a>
            <a href="#suporte">⚠ &nbsp; Suporte</a>
          </nav>
          <Link className="btn outline full" to="/wallets">
            <WalletIcon size={17} /> Minhas carteiras
          </Link>
          <Button
            variant="ghost"
            className="full"
            disabled={logout.isPending}
            onClick={() =>
              logout.mutate(undefined, {
                onSuccess: async () => {
                  await clearSession();
                  await navigate({ to: "/" });
                },
              })
            }
          >
            <LogOut size={17} /> Sair da conta
          </Button>
          <ErrorText error={logout.error} />
        </aside>
        <div className="panel profile-form-panel" id="dados">
          <h2>Informações pessoais</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate({ name, email, avatar });
            }}
          >
            <Field label="Nome completo" name="name" error={update.error}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                required
                autoComplete="name"
              />
            </Field>
            <Field label="E-mail" name="email" error={update.error}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>
            <Field
              label="Avatar (PNG, JPEG ou WebP, até 400 KB)"
              name="avatar"
              error={update.error}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    file.size > 400 * 1024 ||
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      file.type,
                    )
                  ) {
                    setFileError("Use PNG, JPEG ou WebP de até 400 KB.");
                    return;
                  }
                  setFileError("");
                  setAvatarLoading(true);
                  const reader = new FileReader();
                  reader.onload = () => {
                    setAvatar(String(reader.result));
                    setAvatarLoading(false);
                  };
                  reader.onerror = () => {
                    setFileError(
                      "Não foi possível ler a imagem. Tente novamente.",
                    );
                    setAvatarLoading(false);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </Field>
            {avatar && (
              <div className="actions">
                <img
                  className="avatar-preview"
                  src={avatar}
                  alt="Prévia do avatar"
                  width="72"
                  height="72"
                />
                <button
                  type="button"
                  className="textbutton"
                  onClick={() => setAvatar(undefined)}
                >
                  Remover avatar
                </button>
              </div>
            )}
            <ErrorText error={fileError || update.error} />
            <Button disabled={update.isPending || avatarLoading || !!fileError}>
              Salvar alterações
            </Button>
            {update.isSuccess && (
              <p className="green" role="status">
                Dados salvos.
              </p>
            )}
          </form>
          <hr />
          <h2>Alterar senha</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              pass.mutate(
                { oldPassword, newPassword },
                {
                  onSuccess: () => {
                    setOld("");
                    setNew("");
                  },
                },
              );
            }}
          >
            <Field label="Senha atual" name="oldPassword" error={pass.error}>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOld(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Field>
            <Field
              label="Nova senha (8 caracteres, letras e números)"
              name="newPassword"
              error={pass.error}
            >
              <input
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
                required
                autoComplete="new-password"
              />
            </Field>
            <ErrorText error={pass.error} />
            <Button variant="outline" disabled={pass.isPending}>
              Atualizar senha
            </Button>
            {pass.isSuccess && (
              <p className="green" role="status">
                Senha alterada.
              </p>
            )}
          </form>
        </div>
      </div>
      <section className="panel account-section" id="favoritos">
        <h2>Meus favoritos</h2>
        {favorites.query.isPending ? (
          <Loading kind="summary" />
        ) : favorites.query.error ? (
          <Failure
            error={favorites.query.error}
            retry={favorites.query.refetch}
          />
        ) : favorites.query.data?.length ? (
          <div className="favorite-list">
            {favorites.query.data.map((id) => (
              <FavoriteItem key={id} id={id} />
            ))}
          </div>
        ) : (
          <p className="muted">Você ainda não salvou favoritos.</p>
        )}
      </section>
      <section className="panel account-section" id="atividade">
        <h2>Meus pedidos</h2>
        {orders.isPending ? (
          <Loading kind="summary" />
        ) : orders.error ? (
          <Failure error={orders.error} retry={orders.refetch} />
        ) : orders.data?.length ? (
          orders.data.map((o) => (
            <Link
              className="line"
              key={o.id}
              to="/order/$id"
              params={{ id: o.id }}
            >
              <strong>{o.id}</strong>
              <span>
                {o.status === "confirmed"
                  ? "Confirmado"
                  : o.status === "pending"
                    ? "Pendente"
                    : "Recusado"}
              </span>
            </Link>
          ))
        ) : (
          <p className="muted">Nenhum pedido realizado.</p>
        )}
      </section>
    </div>
  );
}
const emptyWallet: Wallet = {
  id: "",
  name: "",
  nickname: "",
  profileName: "",
  address: "",
  network: "Ethereum",
  walletType: "Carteira pessoal",
  referralCode: "",
  email: "",
  ensName: "",
  primary: false,
};
export function Wallets() {
  useTitle("Minhas carteiras");
  const { data: session } = useSession();
  const query = useWallets();
  const [form, setForm] = useState<Wallet>(emptyWallet);
  const save = useAction(api.wallet, ["wallets", "session"]);
  const logout = useAction(api.logout, []);
  const navigate = useNavigate();
  const set = (partial: Partial<Wallet>) =>
    setForm((previous) => ({ ...previous, ...partial }));
  if (!session?.user) return null;
  const account = session.user;
  return (
    <div className="wrap page">
      <div className="crumb">
        <Link to="/profile">Meu perfil</Link> / Carteiras
      </div>
      <div className="profilegrid">
        <aside className="panel sidepanel account-sidebar">
          <h2>Meu perfil</h2>
          <nav className="account-nav" aria-label="Conta">
            <Link to="/profile">♙ &nbsp; Dados do perfil</Link>
            <a className="active" href="#carteiras">⌾ &nbsp; Carteiras</a>
            <a href="#atividade">🛒 &nbsp; Atividade</a>
            <a href="#favoritos">♡ &nbsp; Lista de interesse</a>
            <a href="#ofertas">◉ &nbsp; Ofertas</a>
            <a href="#downloads">♧ &nbsp; Arquivos baixados</a>
            <a href="#suporte">⚠ &nbsp; Suporte</a>
          </nav>
          <button className="textbutton account-exit" type="button" disabled={logout.isPending} onClick={() => logout.mutate(undefined, { onSuccess: async () => { await clearSession(); await navigate({ to: "/" }); } })}>⇥ &nbsp; Sair</button>
        </aside>
        <div className="wallet-main" id="carteiras">
          <div className="wallet-heading">
            <div>
              <h1>Carteira principal</h1>
              <p className="muted">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
            </div>
            <button className="textbutton" type="button" onClick={() => setForm(emptyWallet)}>Adicionar</button>
          </div>
          <form
            className="panel wallet-form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(
              {
                ...form,
                nickname: form.nickname || form.name,
                profileName: form.profileName || account.name,
                email: form.email || account.email,
              },
              { onSuccess: () => setForm(emptyWallet) },
            );
          }}
        >
          <h2>{form.id ? "Editar carteira" : "Adicionar carteira"}</h2>
          <Field label="Nome da carteira" name="name" error={save.error}>
            <input
              required
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </Field>
          <Field label="Apelido da carteira" name="nickname" error={save.error}>
            <input
              value={form.nickname || ""}
              onChange={(e) => set({ nickname: e.target.value })}
              placeholder="Ex.: Minha carteira"
            />
          </Field>
          <Field label="Nome do perfil" name="profileName" error={save.error}>
            <input
              value={form.profileName || ""}
              onChange={(e) => set({ profileName: e.target.value })}
            />
          </Field>
          <Field label="Endereço (simulado)" name="address" error={save.error}>
            <input
              required
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
              placeholder="0x seguido de 40 dígitos hexadecimais"
              spellCheck={false}
            />
          </Field>
          <Field label="Rede" name="network" error={save.error}>
            <select
              value={form.network}
              onChange={(e) => set({ network: e.target.value as Network })}
            >
              <option>Ethereum</option>
              <option>Polygon</option>
            </select>
          </Field>
          <Field label="Tipo de carteira" name="walletType" error={save.error}>
            <select
              value={form.walletType || "Carteira pessoal"}
              onChange={(e) =>
                set({
                  walletType: e.target.value as Wallet["walletType"],
                })
              }
            >
              <option>Carteira pessoal</option>
              <option>Hardware wallet</option>
              <option>Carteira de contrato</option>
            </select>
          </Field>
          <Field label="E-mail" name="walletEmail" error={save.error}>
            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => set({ email: e.target.value })}
              placeholder={account.email}
            />
          </Field>
          <Field label="Nome ENS" name="ensName" error={save.error}>
            <input
              value={form.ensName || ""}
              onChange={(e) => set({ ensName: e.target.value })}
              placeholder="nome.eth (opcional)"
            />
          </Field>
          <Field label="Código de indicação" name="referralCode" error={save.error}>
            <input
              value={form.referralCode || ""}
              onChange={(e) => set({ referralCode: e.target.value })}
              placeholder="Opcional"
            />
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.primary}
              onChange={(e) => set({ primary: e.target.checked })}
            />{" "}
            Definir como principal
          </label>
          <ErrorText error={save.error} />
          <Button className="full" disabled={save.isPending}>
            {form.id ? "Salvar carteira" : "Adicionar carteira"}
          </Button>
          {form.id && (
            <button
              className="textbutton"
              type="button"
              onClick={() => setForm(emptyWallet)}
            >
              Cancelar edição
            </button>
          )}
          {save.isSuccess && (
            <p className="green" role="status">
              Carteira salva.
            </p>
          )}
          </form>
          <div className="wallet-secondary">
            <h2>Carteira secundária <button className="textbutton" type="button" onClick={() => setForm({ ...emptyWallet, name: "Carteira secundária" })}>Adicionar</button></h2>
            {query.isPending ? <Loading kind="summary" /> : query.error ? <Failure error={query.error} retry={query.refetch} /> : query.data?.filter((wallet) => !wallet.primary).length ? query.data.filter((wallet) => !wallet.primary).map((wallet) => (
              <div className="walletrow" key={wallet.id}>
                <WalletIcon size={20} />
                <div className="grow"><strong>{wallet.name}</strong><p className="muted">{wallet.address}</p></div>
                <Button size="sm" variant="outline" onClick={() => setForm(wallet)}>Editar</Button>
              </div>
            )) : <p className="muted">Você ainda não adicionou uma carteira secundária.</p>}
          </div>
          <div className="wallet-all">
            {query.data?.map((wallet) => (
              <div className="walletrow" key={`all-${wallet.id}`}>
                <WalletIcon size={20} />
                <div className="grow">
                  <strong>{wallet.name}</strong>
                  <p className="muted">
                    {wallet.nickname || wallet.address} · {wallet.network}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Editar ${wallet.name}`}
                  onClick={() => {
                    setForm(wallet);
                    save.reset();
                  }}
                >
                  Editar
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
