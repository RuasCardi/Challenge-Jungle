import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queries";

import "./style.css";
async function start() {
  if (import.meta.env.VITE_MOCKS !== "off") {
    const [{ setupWorker }, { handlers, startOrderClock }, { initializeDB }] =
      await Promise.all([
        import("msw/browser"),
        import("./mocks"),
        import("./store"),
      ]);
    await initializeDB();
    const worker = setupWorker(...handlers);
    await worker.start({
      quiet: true,
      onUnhandledRequest: "bypass",
      serviceWorker: { url: "/mockServiceWorker.js" },
    });
    startOrderClock();
  }
  const { default: App } = await import("./ui");
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
start().catch(() => {
  document.getElementById("root")!.textContent =
    "Não foi possível iniciar a demonstração. Recarregue a página.";
});
