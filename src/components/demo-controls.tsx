import { useState } from "react";
import { api, setToken } from "../api";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { ErrorText } from "./common";
export function DemoControls() {
  const [scenario, setScenario] = useState("success");
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const run = async (action: string, body: unknown = {}) => {
    try {
      await api.testing(action, body);
      setMessage("Cenário atualizado.");
      setError(undefined);
    } catch (e) {
      setError(e);
    }
  };
  if (import.meta.env.VITE_MOCKS === "off") return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="textbutton">Controles da demonstração</button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="text-xl font-bold">
          Cenários de avaliação
        </DialogTitle>
        <DialogDescription className="muted mt-2">
          Controle a simulação de rede e pagamento. Os dados são fictícios.
        </DialogDescription>
        <label className="field">
          Cenário
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            {[
              ["success", "Sucesso"],
              ["slow", "Rede lenta"],
              ["variable", "Respostas fora de ordem"],
              ["offline", "Sem conexão"],
              ["server-error", "Erro HTTP 503"],
              ["favorite-error", "Falha no próximo favorito"],
              ["declined", "Pagamento recusado"],
              ["timeout", "Timeout após criar pedido"],
              ["pending", "Pedido pendente por 60 segundos"],
              ["price-changed", "Preço muda ao confirmar"],
              ["sold-out", "Edição esgota ao confirmar"],
            ].map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="stack">
          <Button onClick={() => run("scenario", { name: scenario })}>
            Aplicar cenário
          </Button>
          <Button variant="outline" onClick={() => run("expire")}>
            Expirar sessão
          </Button>
          <Button
            variant="outline"
            onClick={() => run("nft", { id: "cyber-ape", price: "0.95" })}
          >
            Alterar preço de Emerald Ape
          </Button>
          <Button variant="outline" onClick={() => run("disconnect")}>
            Interromper Socket.IO
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await run("reset", { scenario: "success" });
              setToken(null);
              Object.keys(localStorage)
                .filter((key) => key.startsWith("novanft-attempt:"))
                .forEach((key) => localStorage.removeItem(key));
              Object.keys(sessionStorage)
                .filter((key) => key.startsWith("novanft-"))
                .forEach((key) => sessionStorage.removeItem(key));
              location.href = "/";
            }}
          >
            Restaurar todos os dados
          </Button>
        </div>
        <ErrorText error={error} />
        <p role="status">{message}</p>
      </DialogContent>
    </Dialog>
  );
}
