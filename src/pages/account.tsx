import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ChartNoAxesCombined,
  Download,
  Eye,
  EyeOff,
  Heart,
  ImagePlus,
  LogOut,
  MapPin,
  ShoppingCart,
  TriangleAlert,
  UserRound,
  Wallet as WalletIcon,
} from "lucide-react";
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
import "./account.css";

function PasswordField({
  label,
  name,
  value,
  onChange,
  error,
  required = true,
  minLength,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: unknown;
  required?: boolean;
  minLength?: number;
  autoComplete: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="account-password">
      <Field label={label} name={name} error={error}>
        <input
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </Field>
      <button
        className="password-toggle"
        type="button"
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  );
}

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
  const [info, setInfo] = useState("");
  const action = useAction(signup ? api.signup : api.login, []);
  return (
    <div
      className={`auth account-auth ${signup ? "account-signup" : "account-login"}`}
    >
      <AuthBackdrop />
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) void navigate({ to: "/" });
        }}
      >
        <DialogContent
          className={`auth-dialog account-auth-dialog ${signup ? "signup-dialog" : "login-dialog"}`}
        >
          <form
            className="authbox"
            onSubmit={(event) => {
              event.preventDefault();
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
            <Link
              className="auth-mobile-brand"
              to="/"
              aria-label="KURIO — voltar ao início"
            >
              KURIO
            </Link>
            <div className="auth-tabs" aria-label="Acesso à conta">
              <Link
                to="/login"
                search={{ redirect: search.redirect }}
                className={!signup ? "active" : ""}
              >
                Entrar
              </Link>
              <span aria-hidden="true">|</span>
              <Link
                to="/signup"
                search={{ redirect: search.redirect }}
                className={signup ? "active" : ""}
              >
                Criar conta
              </Link>
            </div>
            <DialogTitle asChild>
              <h1 className="auth-mobile-title">
                {signup ? "Criar perfil de colecionador" : "Entrar"}
              </h1>
            </DialogTitle>
            <DialogDescription className="auth-description">
              {search.redirect
                ? "Entre para retomar sua navegação."
                : signup
                  ? "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
                  : "Entre para gerenciar sua carteira, coleção e perfil de criador."}
            </DialogDescription>
            <div className="auth-inputs">
              {signup && (
                <Field label="Nome completo" name="name" error={action.error}>
                  <input
                    required
                    minLength={2}
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nome de usuário"
                  />
                </Field>
              )}
              <Field label="E-mail" name="email" error={action.error}>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={
                    signup ? "Digite seu e-mail" : "contato@email.com"
                  }
                />
              </Field>
              <PasswordField
                label={
                  signup
                    ? "Senha (mínimo 8 caracteres, letras e números)"
                    : "Senha"
                }
                name="password"
                error={action.error}
                required
                minLength={signup ? 8 : undefined}
                autoComplete={signup ? "new-password" : "current-password"}
                value={password}
                onChange={setPassword}
                placeholder="Senha"
              />
              {signup && (
                <PasswordField
                  label="Confirmar senha"
                  name="confirmation"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={setConfirmation}
                  placeholder="Confirmar senha"
                />
              )}
            </div>
            {!signup && (
              <button
                className="forgot-password textbutton"
                type="button"
                onClick={() =>
                  setInfo(
                    "A recuperação por e-mail não está disponível nesta demonstração. Use a conta fictícia demo@nft.com e a senha Demo123!.",
                  )
                }
              >
                Esqueceu a senha?
              </button>
            )}
            <ErrorText id="confirmation-error" error={localError} />
            <ErrorText error={action.error} />
            <Button className="full auth-submit" disabled={action.isPending}>
              {action.isPending
                ? "Aguarde…"
                : signup
                  ? "Criar conta"
                  : "Entrar"}
            </Button>
            <div className="auth-divider">
              <span>Ou continue com</span>
            </div>
            <div className="social-logins">
              <button
                type="button"
                onClick={() =>
                  setInfo(
                    "Login com Google não está disponível nesta demonstração. Entre com seu e-mail e senha.",
                  )
                }
              >
                <span className="google-letter" aria-hidden="true">
                  G
                </span>
                Continuar com Google
              </button>
              <button
                type="button"
                onClick={() =>
                  setInfo(
                    "Login com Facebook não está disponível nesta demonstração. Entre com seu e-mail e senha.",
                  )
                }
              >
                <span className="facebook-letter" aria-hidden="true">
                  f
                </span>
                Continuar com Facebook
              </button>
            </div>
            {info && (
              <p className="auth-feedback" role="status">
                {info}
              </p>
            )}
            <p className="auth-switch">
              {signup ? "Já tem uma conta? " : "Novo na Kurio? "}
              <Link
                to={signup ? "/login" : "/signup"}
                search={{ redirect: search.redirect }}
              >
                {signup ? "Entre" : "Crie uma conta"}
              </Link>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountSidebar({ selected }: { selected: "profile" | "wallets" }) {
  const navigate = useNavigate();
  const logout = useAction(api.logout, []);
  const [notice, setNotice] = useState("");
  return (
    <aside className="panel sidepanel account-sidebar reference-account-sidebar">
      <h2>Meu perfil</h2>
      <nav className="account-nav" aria-label="Conta">
        <Link className={selected === "profile" ? "active" : ""} to="/profile">
          <UserRound size={18} />
          Dados do perfil
        </Link>
        <Link className={selected === "wallets" ? "active" : ""} to="/wallets">
          <MapPin size={18} />
          Carteiras
        </Link>
        <Link to="/profile" hash="atividade">
          <ShoppingCart size={18} />
          Atividade
        </Link>
        <Link to="/profile" hash="favoritos">
          <Heart size={18} />
          Lista de interesse
        </Link>
        <button
          type="button"
          onClick={() =>
            setNotice("Ofertas não estão disponíveis nesta demonstração.")
          }
        >
          <ChartNoAxesCombined size={18} />
          Ofertas
        </button>
        <button
          type="button"
          onClick={() =>
            setNotice(
              "Arquivos para download não estão disponíveis nesta demonstração.",
            )
          }
        >
          <Download size={18} />
          Arquivos baixados
        </button>
        <button
          type="button"
          onClick={() =>
            setNotice(
              "Suporte: consulte as instruções e as contas fictícias no README do projeto.",
            )
          }
        >
          <TriangleAlert size={18} />
          Suporte
        </button>
      </nav>
      <button
        className="textbutton account-exit"
        type="button"
        aria-label="Sair da conta"
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
        <LogOut size={19} />
        Sair
      </button>
      <ErrorText error={logout.error} />
      {notice && (
        <p className="account-nav-notice" role="status">
          {notice}
        </p>
      )}
    </aside>
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
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username || "");
  const [ensName, setEnsName] = useState(user.ensName || "");
  const [walletNickname, setWalletNickname] = useState(
    user.walletNickname || "",
  );
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const update = useAction(api.profile, ["session", "profile", "wallets"]);
  const pass = useAction(api.password, []);
  const orders = useOrders();
  const favorites = useFavorites();
  const [notice] = useState(() =>
    sessionStorage.getItem("novanft-login-notice"),
  );
  return (
    <div className="wrap page account-page profile-page">
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="profilegrid account-grid">
        <AccountSidebar selected="profile" />
        <div className="profile-form-panel reference-profile-panel" id="dados">
          <h1>Perfil do colecionador</h1>
          <form
            id="collector-profile"
            className="collector-fields"
            onSubmit={(event) => {
              event.preventDefault();
              update.mutate({
                name,
                username,
                ensName,
                walletNickname,
                email,
                avatar,
              });
            }}
          >
            <Field label="Nome de exibição" name="name" error={update.error}>
              <input
                aria-label="Nome completo"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                required
                autoComplete="name"
              />
            </Field>
            <Field label="Nome de usuário" name="username" error={update.error}>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                pattern="@?[A-Za-z0-9._]{3,30}"
              />
            </Field>
            <Field label="E-mail" name="email" error={update.error}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </Field>
            <div className="ens-control">
              <Field label="Nome ENS" name="ensName" error={update.error}>
                <input
                  value={ensName.replace(/\.eth$/, "")}
                  onChange={(event) =>
                    setEnsName(
                      event.target.value
                        ? `${event.target.value.replace(/\.eth$/, "")}.eth`
                        : "",
                    )
                  }
                  autoComplete="off"
                />
              </Field>
              <span className="ens-suffix" aria-hidden="true">
                .eth⌄
              </span>
            </div>
            <Field
              label="Apelido da carteira"
              name="walletNickname"
              error={update.error}
            >
              <input
                value={walletNickname}
                onChange={(event) => setWalletNickname(event.target.value)}
                maxLength={50}
              />
            </Field>
            <div className="profile-avatar-field">
              <span>Avatar</span>
              <div className="profile-avatar-controls">
                <div className="profile-avatar-image">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={
                        avatarChanged
                          ? "Prévia do avatar"
                          : `Avatar de ${user.name}`
                      }
                      width="50"
                      height="50"
                    />
                  ) : (
                    <ImagePlus size={22} />
                  )}
                </div>
                <label className="btn avatar-upload" htmlFor="avatar">
                  Alterar
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAvatar(undefined);
                    setAvatarChanged(true);
                    setFileError("");
                  }}
                >
                  Remover
                </button>
              </div>
              <label className="sr-only" htmlFor="avatar">
                Avatar (PNG, JPEG ou WebP, até 400 KB)
              </label>
              <input
                className="sr-only"
                id="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
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
                    setAvatarChanged(true);
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
            </div>
            <div className="profile-feedback">
              <ErrorText error={fileError || update.error} />
              {update.isSuccess && (
                <p className="green" role="status">
                  Dados salvos.
                </p>
              )}
            </div>
          </form>
          <h2 className="change-password-title">Alterar senha</h2>
          <form
            className="profile-password-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (confirmation && confirmation !== newPassword) {
                setPasswordError("As senhas não coincidem.");
                return;
              }
              setPasswordError("");
              pass.mutate(
                { oldPassword, newPassword },
                {
                  onSuccess: () => {
                    setOld("");
                    setNew("");
                    setConfirmation("");
                  },
                },
              );
            }}
          >
            <PasswordField
              label="Senha atual"
              name="oldPassword"
              error={pass.error}
              autoComplete="current-password"
              value={oldPassword}
              onChange={setOld}
            />
            <PasswordField
              label="Nova senha (8 caracteres, letras e números)"
              name="newPassword"
              error={pass.error}
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={setNew}
            />
            <PasswordField
              label="Confirmar nova senha"
              name="newPasswordConfirmation"
              autoComplete="new-password"
              minLength={8}
              required={false}
              value={confirmation}
              onChange={setConfirmation}
            />
            <ErrorText error={passwordError || pass.error} />
            {(oldPassword || newPassword || confirmation) && (
              <Button variant="outline" disabled={pass.isPending}>
                Atualizar senha
              </Button>
            )}
            {pass.isSuccess && (
              <p className="green" role="status">
                Senha alterada.
              </p>
            )}
          </form>
          <Button
            className="profile-save"
            form="collector-profile"
            aria-label="Salvar alterações"
            disabled={update.isPending || avatarLoading || !!fileError}
          >
            {update.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
      <section className="account-identity">
        <h2>{user.name}</h2>
        <p className="muted">{user.email}</p>
      </section>
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
          orders.data.map((order) => (
            <Link
              className="line"
              key={order.id}
              to="/order/$id"
              params={{ id: order.id }}
            >
              <strong>{order.id}</strong>
              <span>
                {order.status === "confirmed"
                  ? "Confirmado"
                  : order.status === "pending"
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
  const set = (partial: Partial<Wallet>) =>
    setForm((previous) => ({ ...previous, ...partial }));
  if (!session?.user) return null;
  const account = session.user;
  return (
    <div className="wrap page account-page wallets-page">
      <div className="profilegrid account-grid">
        <AccountSidebar selected="wallets" />
        <div className="wallet-main reference-wallet-main" id="carteiras">
          <div className="wallet-heading">
            <div>
              <h1>{form.id ? "Editar carteira" : "Carteira principal"}</h1>
              <p className="muted">
                Estas carteiras ficam disponíveis no pagamento e para receber
                NFTs comprados.
              </p>
            </div>
            <button
              className="textbutton"
              type="button"
              onClick={() => {
                setForm(emptyWallet);
                save.reset();
              }}
            >
              Adicionar
            </button>
          </div>
          <form
            className="wallet-form-panel reference-wallet-form"
            onSubmit={(event) => {
              event.preventDefault();
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
            <Field label="Nome de exibição" name="name" error={save.error}>
              <input
                required
                aria-label="Nome da carteira"
                value={form.name}
                onChange={(event) => set({ name: event.target.value })}
              />
            </Field>
            <Field
              label="Apelido da carteira"
              name="nickname"
              error={save.error}
            >
              <input
                value={form.nickname || ""}
                maxLength={50}
                onChange={(event) => set({ nickname: event.target.value })}
              />
            </Field>
            <Field label="Rede" name="network" error={save.error}>
              <select
                value={form.network}
                onChange={(event) =>
                  set({ network: event.target.value as Network })
                }
              >
                <option>Ethereum</option>
                <option>Polygon</option>
              </select>
            </Field>
            <Field label="Nome do perfil" name="profileName" error={save.error}>
              <input
                value={form.profileName || ""}
                onChange={(event) => set({ profileName: event.target.value })}
              />
            </Field>
            <Field
              label="Endereço da carteira"
              name="address"
              error={save.error}
            >
              <input
                required
                aria-label="Endereço (simulado)"
                value={form.address}
                onChange={(event) => set({ address: event.target.value })}
                placeholder="Endereço 0x da carteira"
                spellCheck={false}
              />
            </Field>
            <div className="wallet-optional-address">
              <Field
                label="ENS ou carteira secundária (opcional)"
                name="secondaryAddress"
                error={save.error}
              >
                <input
                  value={form.secondaryAddress || ""}
                  onChange={(event) =>
                    set({ secondaryAddress: event.target.value })
                  }
                  placeholder="ENS ou carteira secundária (opcional)"
                  spellCheck={false}
                />
              </Field>
            </div>
            <Field
              label="Tipo de carteira"
              name="walletType"
              error={save.error}
            >
              <select
                value={form.walletType || "Carteira pessoal"}
                onChange={(event) =>
                  set({
                    walletType: event.target.value as Wallet["walletType"],
                  })
                }
              >
                <option>Carteira pessoal</option>
                <option>Hardware wallet</option>
                <option>Carteira de contrato</option>
              </select>
            </Field>
            <Field
              label="Código de indicação"
              name="referralCode"
              error={save.error}
            >
              <input
                value={form.referralCode || ""}
                onChange={(event) => set({ referralCode: event.target.value })}
              />
            </Field>
            <Field label="E-mail" name="walletEmail" error={save.error}>
              <input
                type="email"
                value={form.email || ""}
                onChange={(event) => set({ email: event.target.value })}
                placeholder={account.email}
              />
            </Field>
            <div className="ens-control">
              <Field label="Nome ENS" name="ensName" error={save.error}>
                <input
                  value={(form.ensName || "").replace(/\.eth$/, "")}
                  onChange={(event) =>
                    set({
                      ensName: event.target.value
                        ? `${event.target.value.replace(/\.eth$/, "")}.eth`
                        : "",
                    })
                  }
                />
              </Field>
              <span className="ens-suffix" aria-hidden="true">
                .eth⌄
              </span>
            </div>
            <label className="checkbox wallet-primary-check">
              <input
                type="checkbox"
                checked={form.primary}
                onChange={(event) => set({ primary: event.target.checked })}
              />
              Definir como principal
            </label>
            <div className="wallet-form-actions">
              <ErrorText error={save.error} />
              <Button
                aria-label={form.id ? "Salvar carteira" : "Adicionar carteira"}
                disabled={save.isPending}
              >
                {save.isPending ? "Salvando…" : "Salvar carteira"}
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
            </div>
          </form>
          <div className="wallet-secondary">
            <div className="wallet-secondary-heading">
              <h2>Carteira secundária</h2>
              <button
                className="textbutton"
                type="button"
                onClick={() => {
                  setForm({ ...emptyWallet, name: "Carteira secundária" });
                  document
                    .getElementById("carteiras")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Adicionar
              </button>
            </div>
            {query.isPending ? (
              <Loading kind="summary" />
            ) : query.error ? (
              <Failure error={query.error} retry={query.refetch} />
            ) : !query.data?.some((wallet) => !wallet.primary) ? (
              <p className="muted">
                Você ainda não adicionou uma carteira secundária.
              </p>
            ) : (
              <p className="muted">
                Gerencie abaixo suas carteiras cadastradas.
              </p>
            )}
          </div>
          <div className="wallet-all">
            {query.data?.map((wallet) => (
              <div className="walletrow" key={wallet.id}>
                <WalletIcon size={20} />
                <div className="grow">
                  <strong>
                    {wallet.name}
                    {wallet.primary && (
                      <span className="wallet-primary-badge">Principal</span>
                    )}
                  </strong>
                  <p className="muted">
                    {wallet.nickname || wallet.address} · {wallet.network}
                  </p>
                  <p className="muted wallet-address">{wallet.address}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Editar ${wallet.name}`}
                  onClick={() => {
                    setForm(wallet);
                    save.reset();
                    document
                      .getElementById("carteiras")
                      ?.scrollIntoView({ behavior: "smooth" });
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
