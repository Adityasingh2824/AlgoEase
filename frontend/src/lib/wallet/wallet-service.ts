export type { WalletType, WalletTxnKind } from "./wallet-types";

let cached: Promise<Awaited<ReturnType<typeof import("./wallet-service.impl").createWalletService>>> | null =
  null;

export async function ensureWalletService() {
  if (typeof window === "undefined") return null;
  if (!cached) {
    cached = (async () => {
      const { installBrowserPolyfills } = await import("@/lib/browser-polyfills");
      await installBrowserPolyfills();
      const { createWalletService } = await import("./wallet-service.impl");
      return createWalletService();
    })();
  }
  return cached;
}
