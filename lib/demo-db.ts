import { demoMarketplaceData, type AgentTraceEvent, type DemoMarketplaceData } from "@/lib/shopping";

export async function seedDemoMarketplace(): Promise<{ seeded: boolean; counts: Record<string, number> }> {
  return {
    seeded: false,
    counts: {
      buyers: demoMarketplaceData.buyers.length,
      preferences: demoMarketplaceData.preferences.length,
      sellers: demoMarketplaceData.sellers.length,
      listings: demoMarketplaceData.listings.length,
    },
  };
}

export async function loadDemoMarketplaceData(): Promise<DemoMarketplaceData> {
  return demoMarketplaceData;
}

export async function saveDemoMatchRun(input: {
  id: string;
  buyerId: string;
  wantId: string;
  inputMode: "text" | "image" | "approval";
  selectedListingId?: string;
  summary: string;
  outreachDraft?: string;
  trace: AgentTraceEvent[];
}): Promise<void> {
  void input;
}
