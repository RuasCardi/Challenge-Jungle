import "./style.css";
import "./reference.css";
async function initializeMocks() {
  if (import.meta.env.VITE_MOCKS !== "off") {
    const [{ setupWorker }, { handlers, startOrderClock }, { initializeDB }] =
      await Promise.all([
        import("msw/browser"),
        import("./mocks"),
        import("./store"),
      ]);
    const worker = setupWorker(...handlers);
    await Promise.all([
      initializeDB(),
      worker.start({
        quiet: true,
        onUnhandledRequest: "bypass",
        serviceWorker: { url: "/mockServiceWorker.js" },
      }),
    ]);
    startOrderClock();
  }
}
async function start() {
  const path = location.pathname;
  const [{ mount }] = await Promise.all([
    import("./bootstrap"),
    /^\/(cart|checkout|order)(\/|$)/.test(path)
      ? import("./pages/purchase")
      : /^\/(login|signup|profile|wallets)(\/|$)/.test(path)
        ? import("./pages/account")
        : import("./pages/catalog"),
    initializeMocks(),
  ]);
  mount();
}
start().catch(() => {
  document.getElementById("root")!.textContent =
    "Não foi possível iniciar a demonstração. Recarregue a página.";
});
