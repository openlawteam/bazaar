import { nanoid } from "nanoid";

import {
  type BuyerPreferenceRow,
  type ConversationStateRow,
  type InboundEventRow,
  type ListingCandidateRow,
  type OtpRow,
  type OutboundMessageRow,
  type SessionRow,
  type UserRow,
  type WantRow,
  getState,
  update,
} from "./store.js";

function nowIso(): string {
  return new Date().toISOString();
}

export const usersRepo = {
  findByPhone(phoneNumber: string): UserRow | undefined {
    return getState().users.find((user) => user.phoneNumber === phoneNumber);
  },
  findById(id: string): UserRow | undefined {
    return getState().users.find((user) => user.id === id);
  },
  upsertByPhone(phoneNumber: string): UserRow {
    const existing = this.findByPhone(phoneNumber);
    if (existing) return existing;
    const created: UserRow = {
      id: `usr_${nanoid(12)}`,
      phoneNumber,
      displayName: null,
      homeLocationLabel: null,
      pickupRadiusMiles: null,
      shippingPreference: "shipping_ok",
      budgetStyle: "best_value",
      approvalPolicy: "ask_before_contact",
      phoneVerifiedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    update((state) => {
      state.users.push(created);
    });
    return created;
  },
  markVerified(id: string): void {
    update((state) => {
      const user = state.users.find((entry) => entry.id === id);
      if (user) {
        user.phoneVerifiedAt = nowIso();
        user.updatedAt = nowIso();
      }
    });
  },
  patch(id: string, patch: Partial<Omit<UserRow, "id" | "createdAt">>): UserRow | undefined {
    let result: UserRow | undefined;
    update((state) => {
      const user = state.users.find((entry) => entry.id === id);
      if (!user) return;
      Object.assign(user, patch, { updatedAt: nowIso() });
      result = user;
    });
    return result;
  },
};

export const otpRepo = {
  create(input: { userId: string; codeHash: string; expiresAt: string }): OtpRow {
    const created: OtpRow = {
      id: `otp_${nanoid(10)}`,
      userId: input.userId,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      attempts: 0,
      consumedAt: null,
      createdAt: nowIso(),
    };
    update((state) => {
      state.otpCodes.push(created);
    });
    return created;
  },
  latestForUser(userId: string): OtpRow | undefined {
    return getState()
      .otpCodes.filter((otp) => otp.userId === userId && !otp.consumedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  },
  recordAttempt(id: string): void {
    update((state) => {
      const otp = state.otpCodes.find((entry) => entry.id === id);
      if (otp) otp.attempts += 1;
    });
  },
  consume(id: string): void {
    update((state) => {
      const otp = state.otpCodes.find((entry) => entry.id === id);
      if (otp) otp.consumedAt = nowIso();
    });
  },
};

export const sessionsRepo = {
  create(input: { userId: string; tokenHash: string; expiresAt: string }): SessionRow {
    const created: SessionRow = {
      id: `ses_${nanoid(14)}`,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: nowIso(),
      revokedAt: null,
    };
    update((state) => {
      state.sessions.push(created);
    });
    return created;
  },
  findByTokenHash(tokenHash: string): SessionRow | undefined {
    return getState().sessions.find(
      (session) => session.tokenHash === tokenHash && !session.revokedAt,
    );
  },
};

export const conversationRepo = {
  get(userId: string): ConversationStateRow | undefined {
    return getState().conversationStates.find((row) => row.userId === userId);
  },
  upsert(userId: string, patch: Partial<ConversationStateRow>): ConversationStateRow {
    let result!: ConversationStateRow;
    update((state) => {
      const existing = state.conversationStates.find((row) => row.userId === userId);
      if (existing) {
        Object.assign(existing, patch, { updatedAt: nowIso() });
        result = existing;
      } else {
        result = {
          userId,
          state: patch.state ?? "needs_verification",
          pendingWantId: patch.pendingWantId ?? null,
          metadata: patch.metadata ?? {},
          updatedAt: nowIso(),
        };
        state.conversationStates.push(result);
      }
    });
    return result;
  },
};

export const preferencesRepo = {
  listForUser(userId: string): BuyerPreferenceRow[] {
    return getState().buyerPreferences.filter((row) => row.userId === userId);
  },
  upsert(input: Omit<BuyerPreferenceRow, "id" | "updatedAt"> & { id?: string }): BuyerPreferenceRow {
    let result!: BuyerPreferenceRow;
    update((state) => {
      const existing = state.buyerPreferences.find(
        (row) => row.userId === input.userId && row.category === input.category && row.key === input.key,
      );
      if (existing) {
        existing.value = input.value;
        existing.confidence = input.confidence;
        existing.source = input.source;
        existing.updatedAt = nowIso();
        result = existing;
      } else {
        result = {
          id: input.id ?? `prf_${nanoid(10)}`,
          userId: input.userId,
          category: input.category,
          key: input.key,
          value: input.value,
          confidence: input.confidence,
          source: input.source,
          updatedAt: nowIso(),
        };
        state.buyerPreferences.push(result);
      }
    });
    return result;
  },
};

export const wantsRepo = {
  create(input: Omit<WantRow, "id" | "createdAt" | "updatedAt"> & { id?: string }): WantRow {
    const created: WantRow = {
      id: input.id ?? `wnt_${nanoid(12)}`,
      userId: input.userId,
      rawText: input.rawText,
      title: input.title,
      description: input.description,
      status: input.status,
      maxBudgetCents: input.maxBudgetCents,
      currency: input.currency,
      locationLabel: input.locationLabel,
      spacebaseIntentId: input.spacebaseIntentId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    update((state) => {
      state.wants.push(created);
    });
    return created;
  },
  findById(id: string): WantRow | undefined {
    return getState().wants.find((row) => row.id === id);
  },
  listForUser(userId: string): WantRow[] {
    return getState()
      .wants.filter((row) => row.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  patch(id: string, patch: Partial<WantRow>): WantRow | undefined {
    let result: WantRow | undefined;
    update((state) => {
      const want = state.wants.find((row) => row.id === id);
      if (!want) return;
      Object.assign(want, patch, { updatedAt: nowIso() });
      result = want;
    });
    return result;
  },
};

export const candidatesRepo = {
  listForWant(wantId: string): ListingCandidateRow[] {
    return getState().listingCandidates.filter((row) => row.wantId === wantId);
  },
  insert(input: Omit<ListingCandidateRow, "id" | "createdAt"> & { id?: string }): ListingCandidateRow {
    const created: ListingCandidateRow = {
      id: input.id ?? `lst_${nanoid(12)}`,
      wantId: input.wantId,
      source: input.source,
      title: input.title,
      url: input.url,
      priceCents: input.priceCents,
      currency: input.currency,
      locationLabel: input.locationLabel,
      sellerLabel: input.sellerLabel,
      fitScore: input.fitScore,
      riskScore: input.riskScore,
      notes: input.notes,
      createdAt: nowIso(),
    };
    update((state) => {
      state.listingCandidates.push(created);
    });
    return created;
  },
};

export const inboundEventsRepo = {
  hasSeen(eventId: string): boolean {
    return getState().inboundEvents.some((row) => row.eventId === eventId);
  },
  record(eventId: string, rawPayload: unknown): InboundEventRow {
    const created: InboundEventRow = {
      eventId,
      receivedAt: nowIso(),
      source: "linq",
      rawPayload,
    };
    update((state) => {
      state.inboundEvents.push(created);
    });
    return created;
  },
};

export const outboundRepo = {
  record(input: Omit<OutboundMessageRow, "id" | "createdAt">): OutboundMessageRow {
    const created: OutboundMessageRow = {
      id: `out_${nanoid(12)}`,
      ...input,
      createdAt: nowIso(),
    };
    update((state) => {
      state.outboundMessages.push(created);
    });
    return created;
  },
  markSent(id: string, providerMessageId: string | null): void {
    update((state) => {
      const message = state.outboundMessages.find((row) => row.id === id);
      if (message) {
        message.status = "sent";
        message.providerMessageId = providerMessageId;
        message.sentAt = new Date().toISOString();
      }
    });
  },
  markFailed(id: string, errorMessage: string): void {
    update((state) => {
      const message = state.outboundMessages.find((row) => row.id === id);
      if (message) {
        message.status = "failed";
        message.errorMessage = errorMessage;
      }
    });
  },
};
