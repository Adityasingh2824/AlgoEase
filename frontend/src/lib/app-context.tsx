import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Transaction } from "algosdk";
import { ensureWalletService, type WalletTxnKind, type WalletType } from "@/lib/wallet/wallet-service";

type Mode = "human" | "agent";
type Theme = "light" | "dark";
type WalletStatus = "idle" | "connecting" | "connected" | "error";

type AppCtx = {
  mode: Mode;
  setMode: (m: Mode) => void;
  theme: Theme;
  toggleTheme: () => void;
  walletStatus: WalletStatus;
  walletType: WalletType | null;
  walletAddress: string | null;
  walletBalanceAlgo: number | null;
  walletError: string | null;
  connectWallet: (walletType: WalletType) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  signWalletTransaction: (txn: Transaction | Transaction[]) => Promise<Uint8Array[]>;
  signWalletTransactionByKind: (kind: WalletTxnKind, txn: Transaction | Transaction[]) => Promise<Uint8Array[]>;
  signFlowTransaction: (kind: WalletTxnKind, amountAlgo: number) => Promise<Uint8Array[]>;
};

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("human");
  const [theme, setTheme] = useState<Theme>("light");
  const [walletStatus, setWalletStatus] = useState<WalletStatus>("idle");
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalanceAlgo, setWalletBalanceAlgo] = useState<number | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const refreshWalletState = useCallback(async () => {
    const service = await ensureWalletService();
    if (!service) return;

    const address = service.activeAddress;
    if (!address) {
      setWalletStatus("idle");
      setWalletType(null);
      setWalletAddress(null);
      setWalletBalanceAlgo(null);
      return;
    }

    setWalletAddress(address);
    setWalletType(service.activeWalletType);
    try {
      const balance = await service.getAlgoBalance(address);
      setWalletBalanceAlgo(balance);
      setWalletStatus("connected");
    } catch {
      setWalletBalanceAlgo(null);
      setWalletStatus("connected");
    }
  }, []);

  useEffect(() => {
    const t = (typeof localStorage !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    const m = (typeof localStorage !== "undefined" && localStorage.getItem("mode")) as Mode | null;
    if (t) setTheme(t);
    if (m) setMode(m);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const service = await ensureWalletService();
      if (!service || cancelled) return;
      try {
        await service.init();
        if (cancelled) return;
        await refreshWalletState();
      } catch {
        if (!cancelled) {
          setWalletStatus("error");
          setWalletError("Wallet initialization failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshWalletState]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") localStorage.setItem("mode", mode);
  }, [mode]);

  const connectWallet = useCallback(async (selectedWallet: WalletType) => {
    const service = await ensureWalletService();
    if (!service) return;
    try {
      setWalletStatus("connecting");
      setWalletError(null);
      await service.connect(selectedWallet);
      await refreshWalletState();
    } catch {
      setWalletStatus("error");
      setWalletError("Wallet connection failed");
      throw new Error("Wallet connection failed");
    }
  }, [refreshWalletState]);

  const disconnectWallet = useCallback(async () => {
    const service = await ensureWalletService();
    if (!service) return;
    await service.disconnect();
    setWalletStatus("idle");
    setWalletType(null);
    setWalletAddress(null);
    setWalletBalanceAlgo(null);
    setWalletError(null);
  }, []);

  const signWalletTransaction = useCallback(async (txn: Transaction | Transaction[]) => {
    const service = await ensureWalletService();
    if (!service) throw new Error("Wallet service unavailable");
    return service.signTransaction(txn);
  }, []);

  const signWalletTransactionByKind = useCallback(
    async (kind: WalletTxnKind, txn: Transaction | Transaction[]) => {
      const service = await ensureWalletService();
      if (!service) throw new Error("Wallet service unavailable");
      return service.signByKind(kind, txn);
    },
    [],
  );

  const signFlowTransaction = useCallback(async (kind: WalletTxnKind, amountAlgo: number) => {
    const service = await ensureWalletService();
    if (!service) throw new Error("Wallet service unavailable");
    return service.signFlowTransaction(kind, amountAlgo);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      theme,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      walletStatus,
      walletType,
      walletAddress,
      walletBalanceAlgo,
      walletError,
      connectWallet,
      disconnectWallet,
      signWalletTransaction,
      signWalletTransactionByKind,
      signFlowTransaction,
    }),
    [
      mode,
      theme,
      walletStatus,
      walletType,
      walletAddress,
      walletBalanceAlgo,
      walletError,
      connectWallet,
      disconnectWallet,
      signWalletTransaction,
      signWalletTransactionByKind,
      signFlowTransaction,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}
