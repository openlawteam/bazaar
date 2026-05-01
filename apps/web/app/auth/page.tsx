import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthForm } from "@/app/auth/auth-form";
import { BazaarLogo } from "@/components/bazaar-logo";

export default async function AuthPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("bazaar_session")?.value) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="relative w-full max-w-4xl rounded-[2.25rem] border-2 border-black bg-white p-4 shadow-[12px_12px_0_#111]">
        <BazaarLogo className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-black bg-white px-4 py-3 shadow-[5px_5px_0_#111]" />
        <div className="grid overflow-hidden rounded-[1.8rem] md:grid-cols-[0.85fr_1.15fr]">
          <div className="hidden bg-[#0b5bd3] px-8 py-12 text-white md:flex md:flex-col md:justify-center">
            <p className="text-sm font-black uppercase tracking-[0.28em]">Secure enough for demo day</p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none tracking-tight">Text in. Trade on.</h1>
            <p className="mt-5 font-semibold text-white/90">
              Phone verification keeps the SMS-first Bazaar loop connected to this backup web interface.
            </p>
          </div>
          <div className="bg-[#ffd500] px-4 py-12 sm:px-8">
            <AuthForm />
          </div>
        </div>
      </section>
    </main>
  );
}
