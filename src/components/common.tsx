import axios from "axios";
import {
  cloneElement,
  isValidElement,
  useEffect,
  type ReactNode,
  type ReactElement,
  type InputHTMLAttributes,
} from "react";
import type { ApiError, Quote, Totals } from "../data";
import { eth } from "../money";
import { Button } from "./ui/button";
export function ErrorText({ error, id }: { error: unknown; id?: string }) {
  if (!error) return null;
  const message = axios.isAxiosError<ApiError>(error)
    ? error.response?.data?.message ||
      (error.code === "ECONNABORTED"
        ? "A resposta demorou. Tente recuperar a mesma operação."
        : "Sem conexão. Verifique a rede e tente novamente.")
    : error instanceof Error
      ? error.message
      : String(error);
  return (
    <p id={id} role="alert" className="error">
      {message}
    </p>
  );
}
export function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: unknown;
  children: ReactNode;
}) {
  const field = axios.isAxiosError<ApiError>(error)
    ? error.response?.data?.fields?.[name]
    : undefined;
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <span className="field-control">
        {isValidElement(children)
          ? cloneElement(
              children as ReactElement<InputHTMLAttributes<HTMLInputElement>>,
              {
                id: name,
                "aria-invalid": !!field,
                ...(field ? { "aria-describedby": `${name}-error` } : {}),
              },
            )
          : children}
      </span>
      {field && (
        <span id={`${name}-error`} className="error" role="alert">
          {field}
        </span>
      )}
    </div>
  );
}
export function Loading({
  kind = "catalog",
}: {
  kind?: "catalog" | "detail" | "summary" | "form";
}) {
  return (
    <div role="status" aria-label="Carregando" className={`loading-${kind}`}>
      <span className="sr-only">Carregando conteúdo…</span>
      {kind === "detail" ? (
        <>
          <div className="skeleton detail-placeholder" />
          <div className="skeleton info-placeholder" />
        </>
      ) : kind === "catalog" ? (
        <div className="skeleton-grid">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      ) : (
        <div className="skeleton" />
      )}
    </div>
  );
}
export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => unknown;
}) {
  return (
    <div className="panel center">
      <ErrorText error={error} />
      {retry && <Button onClick={() => retry()}>Tentar novamente</Button>}
    </div>
  );
}
export function TotalsView({ q }: { q: Totals }) {
  return (
    <>
      <div className="line">
        <span>Subtotal</span>
        <strong>{eth(q.subtotal)}</strong>
      </div>
      <div className="line">
        <span>Desconto</span>
        <strong>− {eth(q.discount)}</strong>
      </div>
      <div className="line">
        <span>Taxa de rede</span>
        <strong>{eth(q.fee)}</strong>
      </div>
      <div className="line total">
        <span>Total</span>
        <strong>{eth(q.total)}</strong>
      </div>
    </>
  );
}
export function QuoteView({
  q,
  loading,
  error,
}: {
  q?: Quote;
  loading: boolean;
  error?: unknown;
}) {
  return (
    <aside className="panel summary">
      <h2>Resumo do pedido</h2>
      {loading ? (
        <Loading kind="summary" />
      ) : error ? (
        <ErrorText error={error} />
      ) : q ? (
        <>
          <TotalsView q={q} />
          {q.issues.map((issue) => (
            <p key={issue} role="alert" className="error">
              {issue}
            </p>
          ))}
        </>
      ) : null}
      <p className="muted">Compra simulada. Valores em ETH.</p>
    </aside>
  );
}
export function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · KURIO`;
  }, [title]);
}
