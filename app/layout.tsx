import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bazaar",
  description: "Demand-first buying and selling web app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {process.env.NODE_ENV === "development" ? (
          <Script id="strip-cursor-hydration-refs" strategy="beforeInteractive">
            {`
              (() => {
                const strip = (root = document) => {
                  root.querySelectorAll?.("[data-cursor-ref]").forEach((node) => {
                    node.removeAttribute("data-cursor-ref");
                  });
                };

                strip();

                const observer = new MutationObserver((mutations) => {
                  for (const mutation of mutations) {
                    if (mutation.type === "attributes" && mutation.attributeName === "data-cursor-ref") {
                      mutation.target.removeAttribute("data-cursor-ref");
                    }
                    for (const node of mutation.addedNodes) {
                      if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.hasAttribute?.("data-cursor-ref")) {
                          node.removeAttribute("data-cursor-ref");
                        }
                        strip(node);
                      }
                    }
                  }
                });

                observer.observe(document.documentElement, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                  attributeFilter: ["data-cursor-ref"],
                });

                window.addEventListener("load", () => {
                  strip();
                  window.setTimeout(() => observer.disconnect(), 1000);
                });
              })();
            `}
          </Script>
        ) : null}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
