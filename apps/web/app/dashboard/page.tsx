import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Plus, Search, Store } from "lucide-react";

import { createListing, createWant, logout } from "@/app/dashboard/actions";
import { BazaarLogo } from "@/components/bazaar-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bazaarJson } from "@/lib/api";

type Want = {
  id: string;
  title: string;
  rawText: string;
  status: string;
  maxBudgetCents: number | null;
  currency: string;
  locationLabel: string | null;
  createdAt: string;
};

type UserListing = {
  id: string;
  title: string;
  description: string | null;
  priceCents: number | null;
  currency: string;
  locationLabel: string | null;
  status: string;
  createdAt: string;
};

type FeedListing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  locationLabel: string;
  condition: string;
};

type WantsResponse = { wants: Want[] };
type ListingsResponse = { listings: UserListing[] };
type FeedResponse = { feed: FeedListing[] };

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("bazaar_session")?.value;
  if (!sessionToken) {
    redirect("/");
  }

  const intent = cookieStore.get("bazaar_intent")?.value === "sell" ? "sell" : "buy";
  const [{ wants }, { listings }, { feed }] = await Promise.all([
    bazaarJson<WantsResponse>("/me/wants", { sessionToken }),
    bazaarJson<ListingsResponse>("/me/listings", { sessionToken }),
    bazaarJson<FeedResponse>("/me/feed", { sessionToken }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8">
      <header className="mb-8 rounded-[2rem] border-2 border-black bg-white p-5 shadow-[9px_9px_0_#111] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <BazaarLogo />
          <form action={logout}>
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
        <div className="mt-6 rounded-[1.5rem] border-2 border-black bg-[#0b5bd3] p-6 text-white">
          <p className="text-sm font-black uppercase tracking-[0.25em]">Bazaar dashboard</p>
          <h1 className="mt-2 text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">
            Your buy and sell loops
          </h1>
        </div>
      </header>

      <Tabs defaultValue={intent} className="w-full">
        <TabsList>
          <TabsTrigger value="buy">Buying</TabsTrigger>
          <TabsTrigger value="sell">Selling</TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4">
            <Card className="bg-[#ffd500]">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight">
                  <span className="grid size-12 place-items-center rounded-full border-2 border-black bg-white text-[#0b5bd3]">
                    <Search className="size-5" />
                  </span>
                  What are you looking for?
                </CardTitle>
                <CardDescription className="font-semibold text-black/70">
                  One sentence is enough. Bazaar will parse it and start a rough match run.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createWant} className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    name="text"
                    placeholder="Find me a used Aeron under $500 near Brooklyn"
                    className="sm:flex-1"
                  />
                  <Button type="submit">
                    <Plus className="size-4" />
                    Add want
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-3">
              {wants.length > 0 ? (
                wants.map((want) => (
                  <Card key={want.id} className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-2xl font-black tracking-tight">{want.title}</CardTitle>
                      <CardDescription className="font-semibold text-black/65">
                        {formatStatus(want.status)} {want.locationLabel ? `near ${want.locationLabel}` : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-4 text-sm font-semibold text-black/70">
                      <span>{want.rawText}</span>
                      <span className="rounded-full border-2 border-black bg-[#ffd500] px-3 py-1 font-mono text-black">
                        {formatCurrency(want.maxBudgetCents, want.currency)}
                      </span>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyCard title="No wants yet" description="Add one above and it will show up here." />
              )}
            </div>
          </section>

          <aside className="space-y-3">
            <h2 className="rounded-full border-2 border-black bg-[#e30613] px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-[3px_3px_0_#111]">
              You might be interested in
            </h2>
            {feed.slice(0, 4).map((listing) => (
              <Card key={listing.id} className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black">{listing.title}</CardTitle>
                  <CardDescription className="font-semibold text-black/65">
                    {formatCurrency(listing.priceCents, listing.currency)} - {listing.locationLabel}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm font-semibold text-black/70">{listing.description}</CardContent>
              </Card>
            ))}
          </aside>
        </TabsContent>

        <TabsContent value="sell" className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="h-fit bg-[#0b5bd3] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase tracking-tight">
                <span className="grid size-12 place-items-center rounded-full border-2 border-black bg-[#ffd500] text-black">
                  <Store className="size-5" />
                </span>
                Add something for sale
              </CardTitle>
              <CardDescription className="font-semibold text-white/85">Quick text fields only for this backup UI.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createListing} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" placeholder="Herman Miller Aeron, size B" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceDollars">Price</Label>
                  <Input id="priceDollars" name="priceDollars" inputMode="decimal" placeholder="420" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locationLabel">Location</Label>
                  <Input id="locationLabel" name="locationLabel" placeholder="Williamsburg, Brooklyn" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Notes</Label>
                  <Input id="description" name="description" placeholder="Clean, pickup this week" />
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="size-4" />
                  Add listing
                </Button>
              </form>
            </CardContent>
          </Card>

          <section className="grid gap-3">
            {listings.length > 0 ? (
              listings.map((listing) => (
                <Card key={listing.id} className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-2xl font-black tracking-tight">{listing.title}</CardTitle>
                    <CardDescription className="font-semibold text-black/65">
                      {formatStatus(listing.status)} {listing.locationLabel ? `in ${listing.locationLabel}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-4 text-sm font-semibold text-black/70">
                    <span>{listing.description ?? "No notes yet."}</span>
                    <span className="rounded-full border-2 border-black bg-[#ffd500] px-3 py-1 font-mono text-black">
                      {formatCurrency(listing.priceCents, listing.currency)}
                    </span>
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyCard title="No listings yet" description="Add a listing and it will show up here." />
            )}
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-2xl font-black tracking-tight">{title}</CardTitle>
        <CardDescription className="font-semibold text-black/65">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function formatCurrency(cents: number | null, currency: string) {
  if (!cents) return "No budget";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}
