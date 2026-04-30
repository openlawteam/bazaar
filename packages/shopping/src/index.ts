import type { BuyerPreference, ListingCandidate, Want } from "@bazaar/core";

export interface ShoppingSearchInput {
  want: Want;
  preferences: BuyerPreference[];
  limit?: number;
}

export interface ShoppingSourceAdapter {
  readonly sourceName: string;
  search(input: ShoppingSearchInput): Promise<ListingCandidate[]>;
}

export interface CandidateScorer {
  score(input: {
    want: Want;
    preferences: BuyerPreference[];
    candidate: ListingCandidate;
  }): Promise<ListingCandidate>;
}

export async function searchAllSources(
  adapters: ShoppingSourceAdapter[],
  input: ShoppingSearchInput,
): Promise<ListingCandidate[]> {
  const results = await Promise.all(adapters.map((adapter) => adapter.search(input)));
  return results.flat();
}
