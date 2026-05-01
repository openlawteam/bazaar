import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BellRing, MapPin, Store, Tag } from "lucide-react";

import { alertSeller } from "@/app/listings/[id]/actions";
import { BazaarLogo } from "@/components/bazaar-logo";
import { ListingImage } from "@/components/listing-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listingDetailPayload } from "@/lib/bazaar";
import { getSessionUser } from "@/lib/session";

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sellerAlerted?: string }>;
}) {
  const cookieStore = await cookies();
  const user = getSessionUser(cookieStore.get("bazaar_session")?.value);
  if (!user) {
    redirect("/");
  }

  const { id } = await params;
  const listing = await listingDetailPayload(user.id, id);
  if (!listing) {
    notFound();
  }
  const { sellerAlerted } = await searchParams;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8">
      <header className="mb-8 rounded-[2rem] border-2 border-black bg-white p-5 shadow-[9px_9px_0_#111] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <BazaarLogo />
          <Button asChild variant="outline">
            <Link href={listing.source === "user" ? "/for-sale" : "/dashboard"}>
              <ArrowLeft className="size-4" />
              {listing.source === "user" ? "Back to for sale" : "Back to dashboard"}
            </Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="gap-0 overflow-hidden bg-white py-0">
          <ListingImage id={listing.id} imageUrl={listing.imageUrl} title={listing.title} className="aspect-[4/3] border-b-2" />
          <div className="py-6">
            <CardHeader>
              <div className="mb-2 inline-flex w-fit rounded-full border-2 border-black bg-[#ffd500] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-black">
                {listing.source === "user" ? "Your listing" : "Marketplace match"}
              </div>
              <CardTitle className="text-4xl font-black uppercase leading-none tracking-tight">{listing.title}</CardTitle>
              <CardDescription className="text-base font-semibold text-black/65">
                {formatStatus(listing.status)} {listing.locationLabel ? `in ${listing.locationLabel}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-base font-semibold text-black/75">
              <p>{listing.description ?? "No notes yet."}</p>
              {listing.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {listing.tags.slice(0, 10).map((tag) => (
                    <span key={tag} className="rounded-full border-2 border-black bg-[#fff3a3] px-3 py-1 text-xs font-black uppercase tracking-wide text-black">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card className="bg-[#ffd500]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight">
                <BellRing className="size-6 text-[#e30613]" />
                Want this?
              </CardTitle>
              <CardDescription className="font-semibold text-black/70">
                Bazaar will alert the seller and ask for availability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form action={alertSeller}>
                <input type="hidden" name="listingId" value={listing.id} />
                <Button type="submit" className="w-full">
                  I want to buy
                </Button>
              </form>
              {sellerAlerted === "1" ? (
                <p className="rounded-2xl border-2 border-black bg-white px-4 py-3 text-sm font-black text-black">
                  Seller alert queued. The agent will follow up with availability and handoff details.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-[#0b5bd3] text-white">
            <CardHeader>
              <CardTitle className="text-3xl font-black uppercase tracking-tight">{formatCurrency(listing.priceCents, listing.currency)}</CardTitle>
              <CardDescription className="font-semibold text-white/85">Asking price</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                <Store className="size-5 text-[#0b5bd3]" />
                Seller
              </CardTitle>
              <CardDescription className="font-semibold text-black/65">
                {listing.sellerLabel ?? "Seller details pending"}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                <MapPin className="size-5 text-[#e30613]" />
                Location
              </CardTitle>
              <CardDescription className="font-semibold text-black/65">
                {listing.locationLabel ?? "Location pending"}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                <Tag className="size-5 text-[#0b5bd3]" />
                Condition
              </CardTitle>
              <CardDescription className="font-semibold text-black/65">
                {formatStatus(listing.condition)}
              </CardDescription>
            </CardHeader>
          </Card>
        </aside>
      </section>
    </main>
  );
}

function formatCurrency(cents: number | null, currency: string) {
  if (!cents) return "No price";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}
