"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createListingForUser, createWantForUser } from "@/lib/bazaar";
import { getSessionUser } from "@/lib/session";

export async function createWant(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const cookieStore = await cookies();
  const user = getSessionUser(cookieStore.get("bazaar_session")?.value);
  if (!user) redirect("/");

  await createWantForUser(user.id, text);

  revalidatePath("/dashboard");
}

export async function createListing(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const cookieStore = await cookies();
  const user = getSessionUser(cookieStore.get("bazaar_session")?.value);
  if (!user) redirect("/");

  const priceDollars = Number(String(formData.get("priceDollars") ?? "").trim());
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const locationLabel = String(formData.get("locationLabel") ?? "").trim();

  createListingForUser(user.id, {
    title,
    description: description || undefined,
    imageUrl: imageUrl || undefined,
    locationLabel: locationLabel || undefined,
    priceCents: Number.isFinite(priceDollars) && priceDollars > 0 ? Math.round(priceDollars * 100) : undefined,
  });

  revalidatePath("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("bazaar_session");
  redirect("/");
}
