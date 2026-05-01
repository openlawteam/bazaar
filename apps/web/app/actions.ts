"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function chooseIntent(intent: "buy" | "sell") {
  const cookieStore = await cookies();
  cookieStore.set("bazaar_intent", intent, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  if (cookieStore.get("bazaar_session")?.value) {
    redirect("/dashboard");
  }

  redirect("/auth");
}
