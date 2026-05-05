import { Star, Plus } from "lucide-react";

export function FloatingCards() {
  return (
    <div className="relative h-[420px] w-full">
      {/* Yellow blob */}
      <div className="absolute right-10 bottom-6 h-32 w-32 rotate-12 bg-lemon"
           style={{ clipPath: "polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" }} />
      {/* Star sparkle */}
      <Star className="absolute left-2 top-4 h-7 w-7 fill-primary text-primary" />
      <Star className="absolute right-20 top-2 h-5 w-5 fill-ink text-ink" />

      {/* Card 1 - back */}
      <div className="absolute left-2 top-16 w-56 -rotate-6 card-soft p-4">
        <div className="aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-blush to-lemon" />
        <div className="mt-3 text-sm font-medium">Build my landing page</div>
        <button className="mt-3 w-full pill bg-ink text-ink-foreground py-2 text-xs font-medium">
          Make request
        </button>
      </div>

      {/* Card 2 - middle */}
      <div className="absolute left-28 top-6 w-56 rotate-3 card-soft p-4">
        <div className="aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-mint to-lilac" />
        <div className="mt-3 text-sm font-medium">Audit my smart contract</div>
        <button className="mt-3 w-full pill bg-ink text-ink-foreground py-2 text-xs font-medium">
          Make request
        </button>
      </div>

      {/* Card 3 - front (avatar) */}
      <div className="absolute right-4 top-24 w-60 -rotate-3 card-soft p-4">
        <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-gradient-to-br from-lilac via-blush to-lemon">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-2xl">🧑‍💻</div>
        </div>
        <div className="mt-3 text-sm font-medium leading-tight">
          Need an AlgoPy developer for my Algorand dApp this week?
        </div>
        <button className="mt-3 inline-flex items-center gap-1 pill bg-primary text-primary-foreground px-3 py-2 text-xs font-medium">
          <Plus className="h-3 w-3" /> Make request
        </button>
      </div>
    </div>
  );
}
