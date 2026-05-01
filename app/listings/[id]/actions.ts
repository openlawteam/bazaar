"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { alertSellerForListing } from "@/lib/bazaar";
import { getSessionUser } from "@/lib/session";

export async function alertSeller(formData: FormData) {
  const listingId = String(formData.get("listingId") ?? "").trim();
  if (!listingId) return;

  const cookieStore = await cookies();
  const user = getSessionUser(cookieStore.get("bazaar_session")?.value);
  if (!user) {
    redirect("/");
  }

  await alertSellerForListing(user.id, listingId);
  revalidatePath(`/listings/${listingId}`);
  redirect(`/listings/${listingId}?sellerAlerted=1`);
}
