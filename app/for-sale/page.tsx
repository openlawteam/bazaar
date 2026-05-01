import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Store } from "lucide-react";

import { BazaarLogo } from "@/components/bazaar-logo";
import { ListingImage } from "@/components/listing-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { forSaleInventoryPayload, type SaleListing } from "@/lib/bazaar";
import { getSessionUser } from "@/lib/session";

export default async function ForSalePage() {
  const cookieStore = await cookies();
  const user = getSessionUser(cookieStore.get("bazaar_session")?.value);
  if (!user) {
    redirect("/");
  }

  const { listings } = await forSaleInventoryPayload(user.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8">
      <header className="mb-8 rounded-[2rem] border-2 border-black bg-white p-5 shadow-[9px_9px_0_#111] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <BazaarLogo />
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
        <div className="mt-6 rounded-[1.5rem] border-2 border-black bg-[#0b5bd3] p-6 text-white">
          <p className="text-sm font-black uppercase tracking-[0.25em]">For sale</p>
          <h1 className="mt-2 text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
            All product listings
          </h1>
          <p className="mt-3 max-w-2xl font-semibold text-white/85">
            Fresh local finds for a Brooklyn apartment, closet, commute, and creative setup.
          </p>
        </div>
      </header>

      {listings.length > 0 ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <SaleListingCard key={listing.id} listing={listing} />
          ))}
        </section>
      ) : (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight">
              <span className="grid size-12 place-items-center rounded-full border-2 border-black bg-[#ffd500] text-black">
                <Store className="size-5" />
              </span>
              No listings yet
            </CardTitle>
            <CardDescription className="font-semibold text-black/65">
              Add something on the selling tab and it will show up here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  );
}

function SaleListingCard({ listing }: { listing: SaleListing }) {
  return (
    <Card className="gap-0 overflow-hidden bg-white py-0">
      <Link href={`/listings/${listing.id}`} className="block">
        <ListingImage id={listing.id} imageUrl={listing.imageUrl} title={listing.title} className="h-56 border-b-2" />
      </Link>
      <div className="py-6">
        <CardHeader>
          <CardTitle className="text-2xl font-black tracking-tight">
            <Link href={`/listings/${listing.id}`} className="hover:underline">
              {listing.title}
            </Link>
          </CardTitle>
            <CardDescription className="font-semibold text-black/65">
            {formatStatus(listing.status)} {listing.locationLabel ? `in ${listing.locationLabel}` : ""}
          </CardDescription>
            <div className="mt-2 inline-flex w-fit rounded-full border-2 border-black bg-[#fff3a3] px-3 py-1 text-xs font-black uppercase tracking-wide text-black">
              {listing.source === "user" ? "Your listing" : "Marketplace"}
            </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm font-semibold text-black/70">
          <div className="flex items-start justify-between gap-4">
            <span>{listing.description ?? "No notes yet."}</span>
            <span className="shrink-0 rounded-full border-2 border-black bg-[#ffd500] px-3 py-1 font-mono text-black">
              {formatCurrency(listing.priceCents, listing.currency)}
            </span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/listings/${listing.id}`}>
              View details
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </div>
    </Card>
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
