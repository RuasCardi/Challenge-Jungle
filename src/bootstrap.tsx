import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queries";
import App from "./ui";

// Load React and the router alongside MSW; mount only after the mock is ready.
export function mount() {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
