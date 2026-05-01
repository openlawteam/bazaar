import type { ReactNode } from "react";
import { ArrowRight, ShoppingBag, Store } from "lucide-react";

import { chooseIntent } from "@/app/actions";
import { BazaarLogo } from "@/components/bazaar-logo";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="relative w-full max-w-5xl rounded-[2.25rem] border-2 border-black bg-white shadow-[12px_12px_0_#111]">
        <BazaarLogo className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-black bg-white px-4 py-3 shadow-[5px_5px_0_#111]" />

        <div className="grid overflow-hidden rounded-[2.1rem] md:grid-cols-2">
          <div className="flex min-h-[420px] flex-col justify-center bg-[#0b5bd3] px-8 py-14 text-white sm:px-12">
            <p className="mb-4 text-sm font-black uppercase tracking-[0.28em]">Bazaar backup web app</p>
            <h1 className="max-w-md text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
              Buy or sell through one playful loop.
            </h1>
            <p className="mt-6 max-w-sm text-base font-semibold text-white/90">
              Verify with your phone, then tell Bazaar what you want or list what you have. Rough, fast, and
              demo-ready.
            </p>
            <div className="mt-8 flex gap-3">
              <div className="grid size-14 place-items-center rounded-full border-2 border-black bg-white text-[#0b5bd3] shadow-[3px_3px_0_#111]">
                <ShoppingBag className="size-6" />
              </div>
              <div className="grid size-14 place-items-center rounded-full border-2 border-black bg-[#ffd500] text-black shadow-[3px_3px_0_#111]">
                <Store className="size-6" />
              </div>
            </div>
          </div>

          <div className="flex min-h-[420px] flex-col justify-center bg-[#ffd500] px-8 py-14 sm:px-12">
            <p className="mb-6 text-center text-sm font-black uppercase tracking-[0.25em] text-black">Pick your path</p>
            <div className="space-y-4">
              <IntentChoice
                action="buy"
                icon={<ShoppingBag className="size-6" />}
                title="I want to buy"
                description="Post a want, see active searches, and get a quick suggested marketplace feed."
                buttonLabel="Start buying"
              />
              <IntentChoice
                action="sell"
                icon={<Store className="size-6" />}
                title="I want to sell"
                description="Add a quick listing and keep track of what Bazaar knows you have available."
                buttonLabel="Start selling"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function IntentChoice({
  action,
  icon,
  title,
  description,
  buttonLabel,
}: {
  action: "buy" | "sell";
  icon: ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
}) {
  return (
    <div className="rounded-[1.75rem] border-2 border-black bg-white p-5 shadow-[5px_5px_0_#111]">
      <div className="mb-4 flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-black bg-[#e30613] text-white">
          {icon}
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-black/70">{description}</p>
        </div>
      </div>
      <form action={chooseIntent.bind(null, action)}>
        <Button className="w-full" size="lg" type="submit">
          {buttonLabel}
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </div>
  );
}
