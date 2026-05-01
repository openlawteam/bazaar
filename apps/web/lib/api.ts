import app from "@bazaar/api/app";
import { cookies } from "next/headers";

type BazaarFetchInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  sessionToken?: string | null;
};

type NodeRequestInit = RequestInit & {
  duplex?: "half";
};

export async function bazaarFetch(path: string, init: BazaarFetchInit = {}) {
  const headers = new Headers(init.headers);
  if (init.sessionToken) {
    headers.set("authorization", `Bearer ${init.sessionToken}`);
  }

  const requestInit: NodeRequestInit = {
    ...init,
    headers,
  };
  if (init.body && init.method !== "GET" && init.method !== "HEAD") {
    requestInit.body = init.body;
    requestInit.duplex = "half";
  }

  return app.fetch(new Request(new URL(path, "http://bazaar.local"), requestInit));
}

export async function bazaarFetchWithSession(path: string, init: BazaarFetchInit = {}) {
  const cookieStore = await cookies();
  return bazaarFetch(path, {
    ...init,
    sessionToken: cookieStore.get("bazaar_session")?.value ?? null,
  });
}

export async function bazaarJson<T>(path: string, init: BazaarFetchInit = {}): Promise<T> {
  const response = init.sessionToken !== undefined ? await bazaarFetch(path, init) : await bazaarFetchWithSession(path, init);
  if (!response.ok) {
    throw new Error(`Bazaar API request failed for ${path}: ${response.status}`);
  }
  return (await response.json()) as T;
}
