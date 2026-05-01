import { cookies } from "next/headers";

import { bazaarFetch } from "@/lib/api";

export const runtime = "nodejs";

async function handler(request: Request) {
  const incomingUrl = new URL(request.url);
  const path = incomingUrl.pathname.replace(/^\/api\/bazaar/, "") || "/";
  const body = request.method === "GET" || request.method === "HEAD" ? null : request.body;
  const cookieStore = await cookies();

  return bazaarFetch(`${path}${incomingUrl.search}`, {
    method: request.method,
    headers: request.headers,
    body,
    sessionToken: cookieStore.get("bazaar_session")?.value ?? null,
  });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
