import * as React from "react";

import { cn } from "@/lib/utils";

function BazaarLogo({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      <div
        className="relative grid size-14 rotate-[-3deg] place-items-center rounded-[1.1rem] border-2 border-black bg-[#e30613] shadow-[5px_5px_0_#111]"
        aria-hidden="true"
      >
        <div className="absolute -top-2 left-2 size-4 rounded-full border-2 border-black bg-[#ffd500]" />
        <div className="absolute -top-2 right-2 size-4 rounded-full border-2 border-black bg-[#ffd500]" />
        <div className="grid size-9 place-items-center rounded-xl border-2 border-black bg-white text-2xl font-black leading-none text-[#e30613]">
          B
        </div>
      </div>
      <div className="leading-none">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.28em] text-[#0b5bd3]">Build a deal</p>
        <p className="text-3xl font-black uppercase tracking-tight text-black">Bazaar</p>
      </div>
    </div>
  );
}

export { BazaarLogo };
