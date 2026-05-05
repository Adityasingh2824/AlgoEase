import { Sparkles, Globe, ArrowRight } from "lucide-react";

const items = [
  { label: "Bounties", icon: ArrowRight },
  { label: "Tutorials", icon: Sparkles },
  { label: "1-on-1 Help", icon: Globe },
  { label: "Smart Contract Tasks", icon: ArrowRight },
  { label: "Design Gigs", icon: Sparkles },
  { label: "Audits", icon: Globe },
  { label: "Shoutouts", icon: ArrowRight },
];

export function Marquee() {
  const list = [...items, ...items];
  return (
    <div className="overflow-hidden bg-ink text-ink-foreground">
      <div className="flex animate-[marquee_30s_linear_infinite] gap-10 whitespace-nowrap py-4">
        {list.map((it, i) => (
          <div key={i} className="flex items-center gap-3 font-display text-lg">
            <it.icon className="h-4 w-4 opacity-70" />
            <span>{it.label}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
