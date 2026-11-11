"use client";

import React, { useState, useEffect, useRef } from "react";
import Image, { ImageProps } from "next/image";

interface ProgressiveImageProps extends Omit<ImageProps, "onLoad"> {
  wrapperClassName?: string;
}

export default function ProgressiveImage({
  src,
  alt,
  fill,
  className = "",
  wrapperClassName = "",
  sizes,
  ...props
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Progressive Intersection Observer: trigger image fetch when approaching viewport
    if (!containerRef.current) return;

    // If IntersectionObserver is not supported, load immediately
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "250px", // Preload slightly before entering viewport for seamless scroll
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${fill ? "w-full h-full" : ""} ${wrapperClassName}`}
    >
      {/* Skeleton Shimmer Background preventing layout shifts */}
      <div
        className={`absolute inset-0 bg-[#141a42]/60 transition-opacity duration-700 pointer-events-none ${
          isLoaded ? "opacity-0" : "opacity-100 animate-pulse"
        }`}
      />

      {shouldLoad && (
        <Image
          src={src}
          alt={alt}
          fill={fill}
          sizes={sizes}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`transition-all duration-700 ease-out will-change-transform ${
            isLoaded
              ? "blur-0 scale-100 opacity-100"
              : "blur-md scale-105 opacity-0"
          } ${className}`}
          {...props}
        />
      )}
    </div>
  );
}
