"use client";

import { useState } from "react";

// Shared <img> wrapper for every photo on the site: shows a pulsing skeleton
// until the image has actually decoded, then crossfades it in, instead of a
// jarring pop-in (or a broken-image flash) once the network request resolves.
export function FadeImage({
  src,
  alt = "",
  className = "",
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-black/5 dark:bg-white/10 ${className}`}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-black/5 dark:bg-white/10" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
