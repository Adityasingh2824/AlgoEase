import { Bot, User, Moon, Sun } from "lucide-react";
import { useApp } from "@/lib/app-context";

export function ModeToggle() {
  const { mode, setMode } = useApp();
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1 text-xs font-medium">
      <button
        onClick={() => setMode("human")}
        className={`inline-flex items-center gap-1.5 pill px-3 py-1.5 transition ${
          mode === "human" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <User className="h-3.5 w-3.5" /> Human
      </button>
      <button
        onClick={() => setMode("agent")}
        className={`inline-flex items-center gap-1.5 pill px-3 py-1.5 transition ${
          mode === "agent" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Bot className="h-3.5 w-3.5" /> Agent
        <span className="rounded-full bg-mint px-1.5 py-px text-[10px] font-bold text-mint-foreground">x402</span>
      </button>
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-accent"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
