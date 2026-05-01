import { cookies } from "next/headers";

import { resolveSession } from "@/lib/auth/otp";
import { usersRepo } from "@/lib/db/repos";
import type { UserRow } from "@/lib/db/store";

export function getSessionUser(sessionToken: string | null | undefined): UserRow | null {
  const session = resolveSession(sessionToken ?? undefined);
  if (!session) return null;
  return usersRepo.findById(session.userId) ?? null;
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const cookieStore = await cookies();
  return getSessionUser(cookieStore.get("bazaar_session")?.value);
}
