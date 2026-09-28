"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Games shuffle with Math.random, so render them only in the browser to avoid hydration mismatches. */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? children : <div className="panel h-64 animate-pulse" />;
}
