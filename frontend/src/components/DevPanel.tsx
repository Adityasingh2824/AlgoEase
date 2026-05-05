import { useState } from "react";
import { Code2, CheckCircle2, Zap, Copy } from "lucide-react";
import { X402Badge } from "./X402Badge";

const endpoints = [
  { method: "POST", path: "/api/bounties/create", label: "Create Bounty", cost: 0.5 },
  { method: "POST", path: "/api/bounties/accept", label: "Accept Task", cost: 0.1 },
  { method: "POST", path: "/api/bounties/submit", label: "Submit Work", cost: 0.1 },
  { method: "POST", path: "/api/bounties/release", label: "Release Payment", cost: 0.2 },
];

type LogKind = "info" | "warn" | "ok";
type LogEntry = { t: string; msg: string; kind: LogKind };

const initialLogs: LogEntry[] = [
  { t: "12:04:11", msg: "Agent agent_0xA1.. requested POST /api/bounties/accept", kind: "info" },
  { t: "12:04:11", msg: "402 Payment Required → 0.1 ALGO", kind: "warn" },
  { t: "12:04:12", msg: "Payment verified via x402", kind: "ok" },
  { t: "12:04:12", msg: "Action executed automatically", kind: "ok" },
];

export function DevPanel() {
  const [logs, setLogs] = useState(initialLogs);

  const simulate = (label: string, cost: number) => {
    const t = new Date().toLocaleTimeString();
    setLogs((l) => ([
      { t, msg: `${label} → 402 Payment Required (${cost} ALGO)`, kind: "warn" as LogKind },
      { t, msg: "Payment verified via x402", kind: "ok" as LogKind },
      { t, msg: "Action executed automatically", kind: "ok" as LogKind },
      ...l,
    ] as LogEntry[]).slice(0, 20));
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card-soft p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-ink-foreground">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">Developer / Agent API</h2>
                <p className="text-sm text-muted-foreground">For AI agents — pay-per-call via x402.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 pill bg-mint px-3 py-1.5 text-xs font-semibold text-mint-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> x402 Enabled
            </span>
          </div>

          <div className="mt-6 divide-y divide-border rounded-2xl border border-border">
            {endpoints.map((e) => (
              <div key={e.path} className="flex flex-wrap items-center gap-3 p-4">
                <span className="pill bg-primary/10 px-2 py-1 font-mono text-[11px] font-bold text-primary">{e.method}</span>
                <code className="flex-1 truncate font-mono text-sm">{e.path}</code>
                <span className="text-xs text-muted-foreground">{e.label}</span>
                <span className="pill bg-lemon px-2.5 py-1 text-xs font-semibold text-lemon-foreground">
                  {e.cost} ALGO
                </span>
                <button
                  onClick={() => simulate(`${e.method} ${e.path}`, e.cost)}
                  className="pill bg-ink px-3 py-1.5 text-xs font-medium text-ink-foreground hover:opacity-90"
                >
                  Simulate call
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-ink p-5 text-ink-foreground">
            <div className="mb-2 flex items-center justify-between text-xs opacity-70">
              <span>example — agent request</span>
              <button className="inline-flex items-center gap-1 hover:opacity-80">
                <Copy className="h-3 w-3" /> copy
              </button>
            </div>
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed">
{`curl -X POST https://algoease.app/api/bounties/accept \\
  -H "X-Agent-Id: agent_0xA1B2" \\
  -H "X-Payment: x402 algo:0.1" \\
  -d '{"bountyId":"1"}'

# 402 Payment Required → auto-pay → 200 OK
`}
            </pre>
          </div>
        </div>

        <div className="card-soft p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Activity log</h3>
            <X402Badge />
          </div>
          <ul className="mt-4 space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {logs.map((l, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 rounded-xl border border-border bg-background/40 p-3 text-xs ${
                  l.kind === "ok" ? "border-mint/60" : l.kind === "warn" ? "border-lemon/60" : ""
                }`}
              >
                <span className="font-mono text-muted-foreground">{l.t}</span>
                <span className="flex-1">
                  {l.kind === "ok" && <Zap className="mr-1 inline h-3 w-3 text-primary" />}
                  {l.msg}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
