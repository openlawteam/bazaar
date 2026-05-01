"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export function generatedListingImageUrl(id: string, title: string) {
  return `/api/listing-images/${encodeURIComponent(id)}?title=${encodeURIComponent(title)}`;
}

export function ListingImage({
  id,
  imageUrl,
  title,
  className,
}: {
  id: string;
  imageUrl?: string | null;
  title: string;
  className?: string;
}) {
  const fallback = generatedListingImageUrl(id, title);
  const [src, setSrc] = useState(imageUrl || fallback);

  return (
    <div className={cn("overflow-hidden border-black bg-[#eef3ff]", className)}>
      <img
        src={src}
        alt={title}
        className="h-full w-full object-cover"
        onError={() => {
          if (src !== fallback) {
            setSrc(fallback);
          }
        }}
      />
    </div>
  );
}
