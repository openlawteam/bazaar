"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { bazaarFetchWithSession } from "@/lib/api";

export async function createWant(formData: FormData) {
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  await bazaarFetchWithSession("/wants", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });

  revalidatePath("/dashboard");
}

export async function createListing(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const priceDollars = Number(String(formData.get("priceDollars") ?? "").trim());
  const description = String(formData.get("description") ?? "").trim();
  const locationLabel = String(formData.get("locationLabel") ?? "").trim();

  await bazaarFetchWithSession("/me/listings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title,
      description: description || undefined,
      locationLabel: locationLabel || undefined,
      priceCents: Number.isFinite(priceDollars) && priceDollars > 0 ? Math.round(priceDollars * 100) : undefined,
    }),
  });

  revalidatePath("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("bazaar_session");
  redirect("/");
}
