import type { AgentRole, BuyerPreference, ListingCandidate, Want } from "@bazaar/core";

export interface AgentContext {
  requestId: string;
  userId: string;
  role: AgentRole;
}

export interface WantParsingResult {
  title: string;
  description?: string;
  maxBudgetCents?: number;
  locationLabel?: string;
  missingProfileQuestions: string[];
}

export interface BuyingAgent {
  readonly role: AgentRole;
  run(context: AgentContext, input: unknown): Promise<unknown>;
}

export interface ProfilerAgent extends BuyingAgent {
  extractPreferences(context: AgentContext, transcript: string): Promise<BuyerPreference[]>;
}

export interface IntentParserAgent extends BuyingAgent {
  parseWant(context: AgentContext, rawText: string): Promise<WantParsingResult>;
}

export interface FitCheckerAgent extends BuyingAgent {
  rankCandidates(input: {
    context: AgentContext;
    want: Want;
    preferences: BuyerPreference[];
    candidates: ListingCandidate[];
  }): Promise<ListingCandidate[]>;
}

export const defaultAgentRoles: AgentRole[] = [
  "profiler",
  "intent_parser",
  "local_scout",
  "shipped_scout",
  "fit_checker",
  "risk_checker",
  "negotiator",
  "logistics",
];
